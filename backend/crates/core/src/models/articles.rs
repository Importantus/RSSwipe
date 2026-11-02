use crate::state::Core;
use crate::time::{now, ts, ts_opt};
use crate::{Error, Result};
use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::mysql::MySqlRow;
use sqlx::{MySql, QueryBuilder, Row};
use std::collections::HashMap;

#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct CategoryView {
    pub id: String,
    pub name: String,
    #[serde(rename = "createdAt", serialize_with = "ts")]
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct FeedRef {
    pub id: String,
    pub title: String,
    pub link: String,
    #[serde(rename = "faviconUrl")]
    pub favicon_url: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct FeedRefWithDescription {
    pub id: String,
    pub title: String,
    pub link: String,
    #[serde(rename = "faviconUrl")]
    pub favicon_url: Option<String>,
    pub description: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct ReaderUser {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct Reader {
    pub user: ReaderUser,
}

/// Per-user state of an article. All flags `false` / dates `null` when the user never touched the article.
#[derive(Serialize, Debug, Clone, Default)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct UserState {
    pub read: bool,
    pub saved: bool,
    pub starred: bool,
    pub seen: bool,
    #[serde(rename = "dateRead", serialize_with = "ts_opt")]
    pub date_read: Option<DateTime<Utc>>,
    #[serde(rename = "dateSaved", serialize_with = "ts_opt")]
    pub date_saved: Option<DateTime<Utc>>,
    #[serde(rename = "dateStarred", serialize_with = "ts_opt")]
    pub date_starred: Option<DateTime<Utc>>,
    #[serde(rename = "dateSeen", serialize_with = "ts_opt")]
    pub date_seen: Option<DateTime<Utc>>,
}

impl UserState {
    pub fn from_row(r: &MySqlRow) -> Result<Self> {
        Ok(Self {
            read: r.try_get("al_read")?,
            saved: r.try_get("al_saved")?,
            starred: r.try_get("al_starred")?,
            seen: r.try_get("al_seen")?,
            date_read: r.try_get("al_date_read")?,
            date_saved: r.try_get("al_date_saved")?,
            date_starred: r.try_get("al_date_star")?,
            date_seen: r.try_get("al_date_seen")?,
        })
    }
}

/// Columns every article query selects (aliased, see `ArticleCore::from_row`).
pub const ARTICLE_SELECT: &str = "a.id AS a_id, a.title AS a_title, a.imageUrl AS a_image, a.link AS a_link, a.publishedAt AS a_pub, a.createdAt AS a_created, \
     c.id AS c_id, c.name AS c_name, c.createdAt AS c_created, \
     f.id AS f_id, f.title AS f_title, f.link AS f_link, f.faviconUrl AS f_favicon, f.description AS f_desc";
pub const ARTICLE_FROM: &str = "FROM Article a JOIN Feed f ON f.id = a.feedId LEFT JOIN Category c ON c.id = a.categoryId";
pub const LIST_STATE_SELECT: &str = "al.`read` AS al_read, al.saved AS al_saved, al.starred AS al_starred, al.seen AS al_seen, \
     al.dateRead AS al_date_read, al.dateSaved AS al_date_saved, al.dateStar AS al_date_star, al.dateSeen AS al_date_seen";

pub struct ArticleCore {
    pub id: String,
    pub title: String,
    pub image_url: Option<String>,
    pub link: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub category: Option<CategoryView>,
    pub feed: FeedRefWithDescription,
}

impl ArticleCore {
    pub fn from_row(r: &MySqlRow) -> Result<Self> {
        let category = match r.try_get::<Option<String>, _>("c_id")? {
            Some(id) => Some(CategoryView { id, name: r.try_get("c_name")?, created_at: r.try_get("c_created")? }),
            None => None,
        };
        Ok(Self {
            id: r.try_get("a_id")?,
            title: r.try_get("a_title")?,
            image_url: r.try_get("a_image")?,
            link: r.try_get("a_link")?,
            published_at: r.try_get("a_pub")?,
            created_at: r.try_get("a_created")?,
            category,
            feed: FeedRefWithDescription {
                id: r.try_get("f_id")?,
                title: r.try_get("f_title")?,
                link: r.try_get("f_link")?,
                favicon_url: r.try_get("f_favicon")?,
                description: r.try_get("f_desc")?,
            },
        })
    }

    fn feed_ref(&self) -> FeedRef {
        FeedRef { id: self.feed.id.clone(), title: self.feed.title.clone(), link: self.feed.link.clone(), favicon_url: self.feed.favicon_url.clone() }
    }

    pub fn into_list_item(self, readers: Option<Vec<Reader>>) -> ArticleListItem {
        let feed = self.feed_ref();
        ArticleListItem {
            id: self.id, title: self.title, image_url: self.image_url, link: self.link, published_at: self.published_at,
            created_at: self.created_at, category: self.category, feed, article_has_user: readers,
        }
    }

    pub fn into_detail(self, state: UserState) -> ArticleDetail {
        ArticleDetail {
            id: self.id, title: self.title, image_url: self.image_url, link: self.link, published_at: self.published_at,
            created_at: self.created_at, category: self.category, feed: self.feed, state,
        }
    }

    pub fn into_listed(self, state: UserState) -> ListedArticle {
        let feed = self.feed_ref();
        ListedArticle {
            id: self.id, title: self.title, image_url: self.image_url, link: self.link, published_at: self.published_at,
            created_at: self.created_at, category: self.category, feed, state,
        }
    }
}

/// `GET /articles` item.
#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct ArticleListItem {
    pub id: String,
    pub title: String,
    #[serde(rename = "imageUrl")]
    pub image_url: Option<String>,
    pub link: String,
    #[serde(rename = "publishedAt", serialize_with = "ts_opt")]
    pub published_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt", serialize_with = "ts")]
    pub created_at: DateTime<Utc>,
    pub category: Option<CategoryView>,
    pub feed: FeedRef,
    #[serde(rename = "ArticleHasUser", skip_serializing_if = "Option::is_none")]
    pub article_has_user: Option<Vec<Reader>>,
}

/// `GET /articles/:id`, the answer of `PUT /articles/:id` and of the starred endpoints.
#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct ArticleDetail {
    pub id: String,
    pub title: String,
    #[serde(rename = "imageUrl")]
    pub image_url: Option<String>,
    pub link: String,
    #[serde(rename = "publishedAt", serialize_with = "ts_opt")]
    pub published_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt", serialize_with = "ts")]
    pub created_at: DateTime<Utc>,
    pub category: Option<CategoryView>,
    pub feed: FeedRefWithDescription,
    #[serde(flatten)]
    pub state: UserState,
}

/// Item of the reading list and the starred list.
#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct ListedArticle {
    pub id: String,
    pub title: String,
    #[serde(rename = "imageUrl")]
    pub image_url: Option<String>,
    pub link: String,
    #[serde(rename = "publishedAt", serialize_with = "ts_opt")]
    pub published_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt", serialize_with = "ts")]
    pub created_at: DateTime<Utc>,
    pub category: Option<CategoryView>,
    pub feed: FeedRef,
    #[serde(flatten)]
    pub state: UserState,
}

#[derive(Debug, Default)]
pub struct ArticleQuery {
    pub limit: i64,
    pub feeds: Option<Vec<String>>,
    pub categories: Vec<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

/// Bound as DATETIME (a `DateTime<Utc>` would be sent as TIMESTAMP, which ends in 2038).
fn midnight(d: NaiveDate) -> chrono::NaiveDateTime {
    d.and_hms_opt(0, 0, 0).unwrap_or_default()
}

pub async fn list(core: &Core, user_id: &str, q: ArticleQuery) -> Result<Vec<ArticleListItem>> {
    let feeds = match q.feeds {
        Some(f) => f,
        None => sqlx::query_scalar("SELECT feedId FROM FeedList WHERE userId = ?").bind(user_id).fetch_all(&core.pool).await?,
    };
    if feeds.is_empty() || q.limit == 0 {
        return Ok(vec![]);
    }
    let mut b: QueryBuilder<MySql> = QueryBuilder::new(format!("SELECT {ARTICLE_SELECT} {ARTICLE_FROM} WHERE a.feedId IN ("));
    let mut sep = b.separated(", ");
    for f in &feeds {
        sep.push_bind(f);
    }
    b.push(")");
    if !q.categories.is_empty() {
        b.push(" AND a.categoryId IN (");
        let mut sep = b.separated(", ");
        for c in &q.categories {
            sep.push_bind(c);
        }
        b.push(")");
    }
    if let Some(d) = q.start_date {
        b.push(" AND a.publishedAt >= ").push_bind(midnight(d));
    }
    if let Some(d) = q.end_date {
        b.push(" AND a.publishedAt <= ").push_bind(midnight(d));
    }
    // not yet swiped away by this user: no list entry at all, or an entry that is not seen
    b.push(" AND (EXISTS (SELECT 1 FROM ArticleList x WHERE x.articleId = a.id AND x.userId = ")
        .push_bind(user_id)
        .push(" AND x.seen = 0) OR NOT EXISTS (SELECT 1 FROM ArticleList y WHERE y.articleId = a.id AND y.userId = ")
        .push_bind(user_id)
        .push("))");
    b.push(" ORDER BY a.publishedAt DESC, a.createdAt DESC, a.id LIMIT ").push_bind(q.limit);

    let rows = b.build().fetch_all(&core.pool).await?;
    let cores = rows.iter().map(ArticleCore::from_row).collect::<Result<Vec<_>>>()?;

    let mut readers: Option<HashMap<String, Vec<Reader>>> = None;
    if core.config.show_article_readers {
        let mut map: HashMap<String, Vec<Reader>> = HashMap::new();
        if !cores.is_empty() {
            let mut b: QueryBuilder<MySql> = QueryBuilder::new(
                "SELECT al.articleId, u.id, u.name FROM ArticleList al JOIN User u ON u.id = al.userId WHERE al.`read` = 1 AND al.userId <> ",
            );
            b.push_bind(user_id).push(" AND al.articleId IN (");
            let mut sep = b.separated(", ");
            for a in &cores {
                sep.push_bind(&a.id);
            }
            b.push(") ORDER BY al.articleId, al.userId");
            for r in b.build().fetch_all(&core.pool).await? {
                map.entry(r.try_get("articleId")?).or_default().push(Reader { user: ReaderUser { id: r.try_get("id")?, name: r.try_get("name")? } });
            }
        }
        readers = Some(map);
    }
    Ok(cores
        .into_iter()
        .map(|a| {
            let r = readers.as_mut().map(|m| m.remove(&a.id).unwrap_or_default());
            a.into_list_item(r)
        })
        .collect())
}

pub async fn find_core(core: &Core, article_id: &str) -> Result<ArticleCore> {
    let row = sqlx::query(&format!("SELECT {ARTICLE_SELECT} {ARTICLE_FROM} WHERE a.id = ?"))
        .bind(article_id)
        .fetch_optional(&core.pool)
        .await?
        .ok_or(Error::NotFound)?;
    ArticleCore::from_row(&row)
}

pub async fn user_state(core: &Core, user_id: &str, article_id: &str) -> Result<UserState> {
    let row = sqlx::query(&format!("SELECT {LIST_STATE_SELECT} FROM ArticleList al WHERE al.userId = ? AND al.articleId = ?"))
        .bind(user_id)
        .bind(article_id)
        .fetch_optional(&core.pool)
        .await?;
    match row {
        Some(r) => UserState::from_row(&r),
        None => Ok(UserState::default()),
    }
}

pub async fn detail(core: &Core, user_id: &str, article_id: &str) -> Result<ArticleDetail> {
    let a = find_core(core, article_id).await?;
    Ok(a.into_detail(user_state(core, user_id, article_id).await?))
}

#[derive(Debug, Default, Clone)]
pub struct ArticleUpdate {
    pub read: Option<bool>,
    pub seen: Option<bool>,
    pub starred: Option<bool>,
    pub saved: Option<bool>,
}

/// Creates or updates the per-user state. A flag set to `true` stamps its date; turning it off keeps the date.
pub async fn update(core: &Core, user_id: &str, article_id: &str, mut input: ArticleUpdate) -> Result<()> {
    let exists: Option<i32> = sqlx::query_scalar("SELECT 1 FROM Article WHERE id = ?").bind(article_id).fetch_optional(&core.pool).await?;
    if exists.is_none() {
        return Err(Error::NotFound);
    }
    let current = user_state(core, user_id, article_id).await?;

    if input.read == Some(true) {
        let exp: Option<i32> = sqlx::query_scalar("SELECT expTimeRead FROM Settings WHERE userId = ? ORDER BY id LIMIT 1").bind(user_id).fetch_optional(&core.pool).await?;
        if exp == Some(0) {
            input.saved = Some(false);
        }
    }
    let n = now();
    let stamp = |flag: Option<bool>, old: Option<DateTime<Utc>>| if flag == Some(true) { Some(n) } else { old };
    sqlx::query(
        "INSERT INTO ArticleList (articleId, userId, `read`, seen, starred, saved, dateRead, dateSeen, dateStar, dateSaved) VALUES (?,?,?,?,?,?,?,?,?,?) \
         ON DUPLICATE KEY UPDATE `read`=VALUES(`read`), seen=VALUES(seen), starred=VALUES(starred), saved=VALUES(saved), \
         dateRead=VALUES(dateRead), dateSeen=VALUES(dateSeen), dateStar=VALUES(dateStar), dateSaved=VALUES(dateSaved)",
    )
    .bind(article_id)
    .bind(user_id)
    .bind(input.read.unwrap_or(current.read))
    .bind(input.seen.unwrap_or(current.seen))
    .bind(input.starred.unwrap_or(current.starred))
    .bind(input.saved.unwrap_or(current.saved))
    .bind(stamp(input.read, current.date_read))
    .bind(stamp(input.seen, current.date_seen))
    .bind(stamp(input.starred, current.date_starred))
    .bind(stamp(input.saved, current.date_saved))
    .execute(&core.pool)
    .await?;
    Ok(())
}
