//! Getting feeds and their articles into the database: following feeds, OPML import and the per-feed update.
use crate::html::{merge_description, PageMeta};
use crate::fetch::{parse_feed, FeedItem, ParsedFeed};
use crate::logger::{API, FEEDPARSER};
use crate::models::{content, feeds::{self, FeedRow, FEED_COLS}};
use crate::state::{new_id, Core};
use crate::time::now;
use crate::{error::is_duplicate, opml, Error, Result};
use futures_util::StreamExt;
use serde::Serialize;
use sqlx::{MySql, QueryBuilder};
use std::collections::{HashMap, HashSet};
use url::Url;

fn truncate(s: &str, chars: usize) -> String {
    s.chars().take(chars).collect()
}

/// Creates the Feed row for a url: either the url is a feed itself or the page links to one.
async fn create_feed(core: &Core, url: &str) -> Result<FeedRow> {
    let fetched = core.fetcher.get(url).await?;
    let text = fetched.text();
    let meta = PageMeta::from_html(&text, url, 1000);

    let parsed: ParsedFeed = match parse_feed(&text, &fetched.final_url) {
        Ok(p) => p,
        Err(first) => {
            let discovered = meta.feed_link.clone().ok_or(first)?;
            if let Some(existing) = feeds::by_link(core, &discovered).await? {
                return Ok(existing);
            }
            let f = core.fetcher.get(&discovered).await?;
            let parsed = parse_feed(&f.text(), &f.final_url)?;
            return insert_feed(core, &discovered, &meta, parsed).await;
        }
    };
    insert_feed(core, url, &meta, parsed).await
}

async fn insert_feed(core: &Core, link: &str, meta: &PageMeta, parsed: ParsedFeed) -> Result<FeedRow> {
    let description = merge_description(meta.description.as_deref(), parsed.description.as_deref()).map(|d| truncate(&d, 1000));
    let title = truncate(parsed.title.as_deref().unwrap_or(link), 1000);
    let id = new_id();
    let ins = sqlx::query("INSERT INTO Feed (id, title, link, faviconUrl, description) VALUES (?, ?, ?, ?, ?)")
        .bind(&id).bind(title).bind(link).bind(&meta.favicon).bind(description)
        .execute(&core.pool).await;
    match ins {
        Ok(_) => {}
        // created concurrently by somebody else
        Err(e) if is_duplicate(&e) => {}
        Err(e) => return Err(e.into()),
    }
    feeds::by_link(core, link).await?.ok_or(Error::NotFound)
}

/// Follows a feed for a user, creating it if needed. The first article import runs in the background.
pub async fn follow(core: &Core, user_id: &str, url: &str, open_in_app: bool) -> Result<FeedRow> {
    let feed = match feeds::by_link(core, url).await? {
        Some(f) => {
            if !f.active {
                sqlx::query("UPDATE Feed SET active = 1 WHERE id = ?").bind(&f.id).execute(&core.pool).await?;
            }
            f
        }
        None => match create_feed(core, url).await {
            Ok(f) => f,
            Err(e) => {
                crate::error!(API, "Could not create feed {url}: {e}");
                return Err(Error::bad_request("Invalid feed url"));
            }
        },
    };
    let ins = sqlx::query("INSERT INTO FeedList (userId, feedId, openInApp) VALUES (?, ?, ?)")
        .bind(user_id).bind(&feed.id).bind(open_in_app)
        .execute(&core.pool).await;
    match ins {
        Ok(_) => {}
        Err(e) if is_duplicate(&e) => return Err(Error::bad_request("User already follows this feed")),
        Err(e) => return Err(e.into()),
    }
    let (c, f) = (core.clone(), feed.clone());
    tokio::spawn(async move { update_feed(&c, &f).await });
    Ok(feed)
}

/// Fetches a feed, refreshes its metadata and stores new articles. Never fails: errors are recorded on the feed.
pub async fn update_feed(core: &Core, feed: &FeedRow) {
    crate::info!(FEEDPARSER, "Updating Feed {}", feed.title);
    if let Err(e) = try_update_feed(core, feed).await {
        crate::error!(FEEDPARSER, "Error while parsing feed {}: {e}", feed.title);
        let msg = e.to_string();
        let msg = if msg.is_empty() { "Unknown error while parsing feed".to_string() } else { truncate(&msg, 255) };
        let r = sqlx::query("UPDATE Feed SET errormessage = ?, error_count = error_count + 1 WHERE id = ?").bind(msg).bind(&feed.id).execute(&core.pool).await;
        if let Err(e) = r {
            crate::error!(FEEDPARSER, "Could not record the error of feed {}: {e}", feed.title);
        }
    }
}

async fn try_update_feed(core: &Core, feed: &FeedRow) -> Result<()> {
    let fetched = core.fetcher.get(&feed.link).await?;
    let parsed = parse_feed(&fetched.text(), &fetched.final_url)?;

    let site_link = match &parsed.link {
        Some(l) => l.clone(),
        None => Url::parse(&feed.link).map_err(|e| Error::internal(e.to_string()))?.origin().ascii_serialization(),
    };
    let page = core.fetcher.get(&site_link).await?;
    let meta = PageMeta::from_html(&page.text(), &site_link, 1000);

    if let Some(t) = &parsed.title {
        let t = truncate(t, 1000);
        if t != feed.title {
            sqlx::query("UPDATE Feed SET title = ? WHERE id = ?").bind(t).bind(&feed.id).execute(&core.pool).await?;
        }
    }
    let description = merge_description(meta.description.as_deref(), parsed.description.as_deref()).map(|d| truncate(&d, 1000));
    if feed.description != description {
        sqlx::query("UPDATE Feed SET description = ? WHERE id = ?").bind(&description).bind(&feed.id).execute(&core.pool).await?;
    }
    let favicon = meta.favicon.clone().or_else(|| feed.favicon_url.clone());
    if favicon != feed.favicon_url {
        sqlx::query("UPDATE Feed SET faviconUrl = ? WHERE id = ?").bind(&favicon).bind(&feed.id).execute(&core.pool).await?;
    }
    sqlx::query("UPDATE Feed SET lastUpdate = ? WHERE id = ?").bind(now()).bind(&feed.id).execute(&core.pool).await?;

    if let Err(e) = add_articles(core, &feed.id, &parsed.items).await {
        crate::error!(FEEDPARSER, "Error while adding articles of feed {} to database: {e}", feed.title);
        return Err(e);
    }
    sqlx::query("UPDATE Feed SET error_count = 0, errormessage = NULL WHERE id = ?").bind(&feed.id).execute(&core.pool).await?;
    Ok(())
}

async fn add_articles(core: &Core, feed_id: &str, items: &[FeedItem]) -> Result<()> {
    let mut known: HashSet<String> = sqlx::query_scalar("SELECT link FROM Article WHERE feedId = ?").bind(feed_id).fetch_all(&core.pool).await?.into_iter().collect();
    let max_age = chrono::Duration::milliseconds(core.config.max_article_age_ms());
    let mut added = 0;

    for item in items {
        if known.contains(&item.link) || item.link.chars().count() > 1000 {
            continue;
        }
        match add_article(core, feed_id, item, max_age).await {
            Ok(true) => {
                added += 1;
                known.insert(item.link.clone());
            }
            Ok(false) => {}
            Err(e) => crate::error!(FEEDPARSER, "Error adding article {}: {e}", item.link),
        }
    }
    crate::info!(FEEDPARSER, "Added {added} from {} Articles", items.len());
    Ok(())
}

async fn add_article(core: &Core, feed_id: &str, item: &FeedItem, max_age: chrono::Duration) -> Result<bool> {
    let page = core.fetcher.get(&item.link).await?;
    let html = page.text();
    let meta = PageMeta::from_html(&html, &item.link, core.config.max_image_url_length);

    let published = item.published.or(meta.published_at);
    if published.is_some_and(|p| p < now() - max_age) {
        return Ok(false);
    }
    let image = meta.image.clone().or_else(|| item.image.clone().filter(|i| i.chars().count() <= 1000));
    let id = new_id();
    let title = truncate(item.title.as_deref().unwrap_or("No title set"), 1000);
    let r = sqlx::query(
        "INSERT INTO Article (id, title, link, imageUrl, feedId, publishedAt) \
         SELECT ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Article WHERE feedId = ? AND link = ?)",
    )
    .bind(&id).bind(title).bind(&item.link).bind(image).bind(feed_id).bind(published).bind(feed_id).bind(&item.link)
    .execute(&core.pool).await?;
    if r.rows_affected() == 0 {
        return Ok(false);
    }
    // the page is already downloaded, so Readability needs no further request; failures must not affect the article
    if let Err(e) = content::extract_and_store(core, &id, &item.link, Some(html)).await {
        crate::error!(FEEDPARSER, "Error storing content of article {}: {e}", item.link);
    }
    Ok(true)
}

#[derive(Serialize, Debug, Default)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct ImportFailure {
    pub url: String,
    pub reason: String,
}

#[derive(Serialize, Debug, Default)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct ImportResult {
    pub imported: u32,
    pub skipped: u32,
    pub failed: Vec<ImportFailure>,
}

const IMPORT_PARSE_CONCURRENCY: usize = 5;

/// Imports feeds from OPML without any network access; metadata is refreshed in the background afterwards.
pub async fn import_opml(core: &Core, user_id: &str, xml: &str) -> Result<ImportResult> {
    let entries = opml::parse(xml)?;
    let mut result = ImportResult::default();
    if entries.is_empty() {
        return Ok(result);
    }
    let mut valid = Vec::new();
    for e in entries {
        if e.xml_url.chars().count() > core.config.max_url_length {
            result.failed.push(ImportFailure { url: e.xml_url, reason: "URL too long".into() });
        } else {
            valid.push(e);
        }
    }
    if valid.is_empty() {
        return Ok(result);
    }

    let mut q: QueryBuilder<MySql> = QueryBuilder::new(format!("SELECT {FEED_COLS} FROM Feed f WHERE f.link IN ("));
    let mut sep = q.separated(", ");
    for e in &valid {
        sep.push_bind(&e.xml_url);
    }
    q.push(")");
    let existing: Vec<FeedRow> = q.build_query_as().fetch_all(&core.pool).await?;
    let by_link: HashMap<String, FeedRow> = existing.into_iter().map(|f| (f.link.clone(), f)).collect();
    let followed: HashSet<String> = sqlx::query_scalar("SELECT feedId FROM FeedList WHERE userId = ?").bind(user_id).fetch_all(&core.pool).await?.into_iter().collect();

    let mut created = Vec::new();
    for e in valid {
        let outcome: Result<bool> = async {
            let feed = match by_link.get(&e.xml_url) {
                Some(f) => f.clone(),
                None => {
                    let title = truncate(e.title.as_deref().unwrap_or(&e.xml_url), 1000);
                    let ins = sqlx::query("INSERT INTO Feed (id, title, link) VALUES (?, ?, ?)").bind(new_id()).bind(title).bind(&e.xml_url).execute(&core.pool).await;
                    match ins {
                        Err(err) if !is_duplicate(&err) => return Err(err.into()),
                        Err(_) => {} // created concurrently
                        Ok(_) => {}
                    }
                    let f = feeds::by_link(core, &e.xml_url).await?.ok_or(Error::NotFound)?;
                    created.push(f.clone());
                    f
                }
            };
            if followed.contains(&feed.id) {
                return Ok(false);
            }
            if !feed.active {
                sqlx::query("UPDATE Feed SET active = 1 WHERE id = ?").bind(&feed.id).execute(&core.pool).await?;
            }
            match sqlx::query("INSERT INTO FeedList (userId, feedId) VALUES (?, ?)").bind(user_id).bind(&feed.id).execute(&core.pool).await {
                Err(err) if is_duplicate(&err) => Ok(false),
                Err(err) => Err(err.into()),
                Ok(_) => Ok(true),
            }
        }
        .await;
        match outcome {
            Ok(true) => result.imported += 1,
            Ok(false) => result.skipped += 1,
            Err(err) => {
                crate::error!(API, "Error while importing feed {}: {err}", e.xml_url);
                result.failed.push(ImportFailure { url: e.xml_url, reason: err.to_string() });
            }
        }
    }

    let c = core.clone();
    tokio::spawn(async move {
        futures_util::stream::iter(created).for_each_concurrent(IMPORT_PARSE_CONCURRENCY, |f| {
            let c = c.clone();
            async move { update_feed(&c, &f).await }
        }).await;
    });
    Ok(result)
}
