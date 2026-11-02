use crate::html::{extract_readable, Extracted};
use crate::state::Core;
use crate::time::now;
use crate::{Error, Result};
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::{Map, Value};
use sqlx::{FromRow, MySql, QueryBuilder};
use std::sync::Arc;

/// The shape clients get inside the `content` wrapper.
#[derive(Serialize, FromRow, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct ContentView {
    pub title: Option<String>,
    pub content: Option<String>,
    #[serde(rename = "textContent")]
    #[sqlx(rename = "textContent")]
    pub text_content: Option<String>,
    pub excerpt: Option<String>,
    pub byline: Option<String>,
    pub dir: Option<String>,
    #[serde(rename = "siteName")]
    #[sqlx(rename = "siteName")]
    pub site_name: Option<String>,
    pub lang: Option<String>,
    pub length: Option<i32>,
}

#[derive(FromRow, Debug, Clone)]
pub struct ContentRow {
    #[sqlx(flatten)]
    pub view: ContentView,
    pub status: String,
    pub attempts: i32,
    #[sqlx(rename = "lastError")]
    pub last_error: Option<String>,
    #[sqlx(rename = "lastAttempt")]
    pub last_attempt: Option<DateTime<Utc>>,
}

const COLS: &str = "title, content, textContent, excerpt, byline, dir, siteName, lang, length, status, attempts, lastError, lastAttempt";

async fn stored(core: &Core, article_id: &str) -> Result<Option<ContentRow>> {
    Ok(sqlx::query_as(&format!("SELECT {COLS} FROM ArticleContent WHERE articleId = ?")).bind(article_id).fetch_optional(&core.pool).await?)
}

fn truncate(s: &str, chars: usize) -> String {
    s.chars().take(chars).collect()
}

/// Content of one article. Extracts it from the publisher's page when it is not stored yet,
/// unless extraction failed permanently or the retry delay has not passed.
pub async fn for_article(core: &Core, article_id: &str) -> Result<ContentView> {
    let link: String = sqlx::query_scalar("SELECT link FROM Article WHERE id = ?").bind(article_id).fetch_optional(&core.pool).await?.ok_or(Error::NotFound)?;
    let row = stored(core, article_id).await?;
    if let Some(r) = &row {
        if r.status == "OK" {
            return Ok(r.view.clone());
        }
        if r.status == "FAILED" {
            let exhausted = r.attempts as i64 >= core.config.max_extraction_attempts;
            let backoff = r.last_attempt.is_some_and(|t| (now() - t).num_milliseconds() < core.config.extraction_retry_delay_ms);
            if exhausted || backoff {
                crate::warn!(crate::logger::API, "Not extracting content of article {link} (attempts: {})", r.attempts);
                return Err(Error::ExtractionFailed(r.last_error.clone().unwrap_or_else(|| "Article extraction failed".into())));
            }
        }
    }
    let result = extract_and_store(core, article_id, &link, None).await?;
    if result.status != "OK" {
        return Err(Error::ExtractionFailed(result.last_error.unwrap_or_else(|| "Article extraction failed".into())));
    }
    Ok(result.view)
}

/// Stored content of many articles, no live extraction. Ids without content map to `null`.
pub async fn batch(core: &Core, ids: &[String]) -> Result<Map<String, Value>> {
    let mut b: QueryBuilder<MySql> = QueryBuilder::new(format!("SELECT articleId, {COLS} FROM ArticleContent WHERE status = 'OK' AND articleId IN ("));
    let mut sep = b.separated(", ");
    for id in ids {
        sep.push_bind(id);
    }
    b.push(")");
    let mut by_id = std::collections::HashMap::new();
    for r in b.build().fetch_all(&core.pool).await? {
        use sqlx::Row;
        let id: String = r.try_get("articleId")?;
        let view = ContentView::from_row(&r)?;
        by_id.insert(id, serde_json::to_value(view).map_err(Error::internal)?);
    }
    let mut out = Map::new();
    for id in ids {
        out.insert(id.clone(), by_id.get(id).cloned().unwrap_or(Value::Null));
    }
    Ok(out)
}

/// Extracts and persists the content. Publisher side problems (network, parsing) are stored as `FAILED`
/// and never returned as errors; database errors are.
/// `html` is an already downloaded page; concurrent calls for one article share the result.
pub async fn extract_and_store(core: &Core, article_id: &str, link: &str, html: Option<String>) -> Result<ContentRow> {
    let lock = {
        let mut map = core.extraction_locks.lock().map_err(|_| Error::internal("lock poisoned"))?;
        map.entry(article_id.to_string()).or_insert_with(|| Arc::new(tokio::sync::Mutex::new(()))).clone()
    };
    let _guard = lock.lock().await;
    let result = perform(core, article_id, link, html).await;
    if let Ok(mut map) = core.extraction_locks.lock() {
        if Arc::strong_count(&lock) <= 2 {
            map.remove(article_id);
        }
    }
    result
}

async fn perform(core: &Core, article_id: &str, link: &str, html: Option<String>) -> Result<ContentRow> {
    // somebody else may have finished while we waited for the lock
    if let Some(r) = stored(core, article_id).await? {
        if r.status == "OK" {
            return Ok(r);
        }
    }
    let n = now();
    let extracted = async {
        let html = match html {
            Some(h) => h,
            None => core.fetcher.get(link).await?.text(),
        };
        let link = link.to_string();
        tokio::task::spawn_blocking(move || extract_readable(&html, &link)).await.map_err(Error::internal)?
    }
    .await;

    match extracted {
        Ok(data) => save_ok(core, article_id, data, n).await?,
        Err(e) => {
            let msg = truncate(&e.to_string(), 500);
            crate::warn!(crate::logger::API, "Error extracting content of article {link}: {msg}");
            sqlx::query(
                "INSERT INTO ArticleContent (articleId, status, attempts, lastError, lastAttempt) VALUES (?, 'FAILED', 1, ?, ?) \
                 ON DUPLICATE KEY UPDATE status = 'FAILED', attempts = attempts + 1, lastError = VALUES(lastError), lastAttempt = VALUES(lastAttempt)",
            )
            .bind(article_id).bind(msg).bind(n)
            .execute(&core.pool).await?;
        }
    }
    stored(core, article_id).await?.ok_or(Error::NotFound)
}

async fn save_ok(core: &Core, article_id: &str, d: Extracted, n: DateTime<Utc>) -> Result<()> {
    sqlx::query(
        "INSERT INTO ArticleContent (articleId, title, content, textContent, excerpt, byline, dir, siteName, lang, length, status, fetchedAt) \
         VALUES (?,?,?,?,?,?,?,?,?,?,'OK',?) \
         ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), textContent=VALUES(textContent), excerpt=VALUES(excerpt), \
         byline=VALUES(byline), dir=VALUES(dir), siteName=VALUES(siteName), lang=VALUES(lang), length=VALUES(length), \
         status='OK', lastError=NULL, fetchedAt=VALUES(fetchedAt)",
    )
    .bind(article_id)
    .bind(truncate(&d.title, 1000))
    .bind(&d.content)
    .bind(&d.text_content)
    .bind(d.excerpt.as_deref().map(|s| truncate(s, 1000)))
    .bind(d.byline.as_deref().map(|s| truncate(s, 500)))
    .bind(d.dir.as_deref().map(|s| truncate(s, 10)))
    .bind(d.site_name.as_deref().map(|s| truncate(s, 255)))
    .bind(d.lang.as_deref().map(|s| truncate(s, 20)))
    .bind(d.length)
    .bind(n)
    .execute(&core.pool)
    .await?;
    Ok(())
}
