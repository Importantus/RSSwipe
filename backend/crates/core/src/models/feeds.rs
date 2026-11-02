use crate::state::Core;
use crate::time::ts;
use crate::{opml, Error, Result};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(FromRow, Debug, Clone)]
pub struct FeedRow {
    pub id: String,
    pub title: String,
    pub link: String,
    pub description: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "faviconUrl")]
    pub favicon_url: Option<String>,
    #[sqlx(rename = "lastUpdate")]
    pub last_update: DateTime<Utc>,
    pub active: bool,
    pub errormessage: Option<String>,
    pub error_count: i32,
}

pub const FEED_COLS: &str = "f.id, f.title, f.link, f.description, f.createdAt, f.faviconUrl, f.lastUpdate, f.active, f.errormessage, f.error_count";

/// A feed as the clients see it: the Feed row plus the per-user `openInApp` flag.
#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct FeedView {
    pub id: String,
    pub title: String,
    pub link: String,
    pub description: Option<String>,
    #[serde(rename = "createdAt", serialize_with = "ts")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "faviconUrl")]
    pub favicon_url: Option<String>,
    #[serde(rename = "lastUpdate", serialize_with = "ts")]
    pub last_update: DateTime<Utc>,
    pub active: bool,
    pub errormessage: Option<String>,
    pub error_count: i32,
    #[serde(rename = "openInApp")]
    pub open_in_app: bool,
}

impl FeedView {
    pub fn new(f: FeedRow, open_in_app: bool) -> Self {
        Self {
            id: f.id,
            title: f.title,
            link: f.link,
            description: f.description,
            created_at: f.created_at,
            favicon_url: f.favicon_url,
            last_update: f.last_update,
            active: f.active,
            errormessage: f.errormessage,
            error_count: f.error_count,
            open_in_app,
        }
    }
}

#[derive(FromRow)]
struct WithFlag {
    #[sqlx(flatten)]
    feed: FeedRow,
    #[sqlx(rename = "openInApp")]
    open_in_app: bool,
}

pub async fn by_link(core: &Core, link: &str) -> Result<Option<FeedRow>> {
    Ok(
        sqlx::query_as(&format!("SELECT {FEED_COLS} FROM Feed f WHERE f.link = ?"))
            .bind(link)
            .fetch_optional(&core.pool)
            .await?,
    )
}

pub async fn followed(core: &Core, user_id: &str) -> Result<Vec<FeedView>> {
    let rows: Vec<WithFlag> = sqlx::query_as(&format!(
        "SELECT {FEED_COLS}, fl.openInApp FROM FeedList fl JOIN Feed f ON f.id = fl.feedId WHERE fl.userId = ? ORDER BY fl.feedId"
    ))
    .bind(user_id)
    .fetch_all(&core.pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| FeedView::new(r.feed, r.open_in_app))
        .collect())
}

/// 404 both if the feed does not exist and if the user does not follow it.
pub async fn info(core: &Core, user_id: &str, feed_id: &str) -> Result<FeedView> {
    let row: Option<WithFlag> = sqlx::query_as(&format!(
        "SELECT {FEED_COLS}, fl.openInApp FROM FeedList fl JOIN Feed f ON f.id = fl.feedId WHERE fl.userId = ? AND fl.feedId = ?"
    ))
    .bind(user_id)
    .bind(feed_id)
    .fetch_optional(&core.pool)
    .await?;
    row.map(|r| FeedView::new(r.feed, r.open_in_app))
        .ok_or(Error::NotFound)
}

pub async fn update(
    core: &Core,
    user_id: &str,
    feed_id: &str,
    open_in_app: Option<bool>,
) -> Result<()> {
    let r = sqlx::query("SELECT 1 FROM FeedList WHERE userId = ? AND feedId = ?")
        .bind(user_id)
        .bind(feed_id)
        .fetch_optional(&core.pool)
        .await?;
    if r.is_none() {
        return Err(Error::NotFound);
    }
    if let Some(v) = open_in_app {
        sqlx::query("UPDATE FeedList SET openInApp = ? WHERE userId = ? AND feedId = ?")
            .bind(v)
            .bind(user_id)
            .bind(feed_id)
            .execute(&core.pool)
            .await?;
    }
    Ok(())
}

pub async fn unfollow(core: &Core, user_id: &str, feed_id: &str) -> Result<()> {
    let mut tx = core.pool.begin().await?;
    let n = sqlx::query("DELETE FROM FeedList WHERE userId = ? AND feedId = ?")
        .bind(user_id)
        .bind(feed_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if n == 0 {
        return Err(Error::bad_request("User does not follow this feed"));
    }
    // nobody follows it any more -> stop fetching it
    sqlx::query("UPDATE Feed SET active = 0 WHERE id = ? AND NOT EXISTS (SELECT 1 FROM FeedList WHERE feedId = ?)")
        .bind(feed_id).bind(feed_id)
        .execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn export_opml(core: &Core, user_id: &str) -> Result<String> {
    let rows: Vec<(String, String)> = sqlx::query_as("SELECT f.title, f.link FROM FeedList fl JOIN Feed f ON f.id = fl.feedId WHERE fl.userId = ? ORDER BY fl.feedId")
        .bind(user_id)
        .fetch_all(&core.pool)
        .await?;
    Ok(opml::build(&rows))
}
