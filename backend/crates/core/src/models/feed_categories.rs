//! User defined categories that group followed feeds. A feed can be in several categories.
use crate::state::{new_id, Core};
use crate::time::ts;
use crate::{error::is_duplicate, Error, Result};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{FromRow, MySql, Transaction};
use std::collections::HashMap;

pub const MAX_PER_USER: i64 = 50;

#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct FeedCategoryView {
    pub id: String,
    pub name: String,
    /// Palette key chosen by the client, e.g. `amber`
    pub color: String,
    pub position: i32,
    #[serde(rename = "createdAt", serialize_with = "ts")]
    pub created_at: DateTime<Utc>,
    /// Followed feeds in this category
    #[serde(rename = "feedIds")]
    pub feed_ids: Vec<String>,
}

#[derive(FromRow)]
struct Row {
    id: String,
    name: String,
    color: String,
    position: i32,
    #[sqlx(rename = "createdAt")]
    created_at: DateTime<Utc>,
}

pub async fn list(core: &Core, user_id: &str) -> Result<Vec<FeedCategoryView>> {
    let rows: Vec<Row> = sqlx::query_as(
        "SELECT id, name, color, position, createdAt FROM FeedCategory WHERE userId = ? ORDER BY position, createdAt, id",
    )
    .bind(user_id)
    .fetch_all(&core.pool)
    .await?;
    let members: Vec<(String, String)> = sqlx::query_as(
        "SELECT m.categoryId, m.feedId FROM FeedCategoryFeed m JOIN FeedCategory c ON c.id = m.categoryId WHERE c.userId = ? ORDER BY m.feedId",
    )
    .bind(user_id)
    .fetch_all(&core.pool)
    .await?;
    let mut by_cat: HashMap<String, Vec<String>> = HashMap::new();
    for (c, f) in members {
        by_cat.entry(c).or_default().push(f);
    }
    Ok(rows
        .into_iter()
        .map(|r| FeedCategoryView {
            feed_ids: by_cat.remove(&r.id).unwrap_or_default(),
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            created_at: r.created_at,
        })
        .collect())
}

pub async fn get(core: &Core, user_id: &str, id: &str) -> Result<FeedCategoryView> {
    list(core, user_id)
        .await?
        .into_iter()
        .find(|c| c.id == id)
        .ok_or(Error::NotFound)
}

fn duplicate_name() -> Error {
    Error::bad_request("A category with this name already exists")
}

async fn owned(tx: &mut Transaction<'_, MySql>, user_id: &str, id: &str) -> Result<()> {
    let r = sqlx::query("SELECT 1 FROM FeedCategory WHERE id = ? AND userId = ? FOR UPDATE")
        .bind(id)
        .bind(user_id)
        .fetch_optional(&mut **tx)
        .await?;
    r.map(|_| ()).ok_or(Error::NotFound)
}

/// Only feeds the user follows can be put into a category.
async fn check_followed(
    tx: &mut Transaction<'_, MySql>,
    user_id: &str,
    feed_ids: &[String],
) -> Result<()> {
    for f in feed_ids {
        let r = sqlx::query("SELECT 1 FROM FeedList WHERE userId = ? AND feedId = ?")
            .bind(user_id)
            .bind(f)
            .fetch_optional(&mut **tx)
            .await?;
        if r.is_none() {
            return Err(Error::bad_request(format!("User does not follow feed {f}")));
        }
    }
    Ok(())
}

async fn set_feeds(
    tx: &mut Transaction<'_, MySql>,
    user_id: &str,
    id: &str,
    feed_ids: &[String],
) -> Result<()> {
    check_followed(tx, user_id, feed_ids).await?;
    sqlx::query("DELETE FROM FeedCategoryFeed WHERE categoryId = ?")
        .bind(id)
        .execute(&mut **tx)
        .await?;
    for f in feed_ids {
        sqlx::query("INSERT IGNORE INTO FeedCategoryFeed (categoryId, feedId) VALUES (?, ?)")
            .bind(id)
            .bind(f)
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

pub async fn create(
    core: &Core,
    user_id: &str,
    name: &str,
    color: &str,
    feed_ids: &[String],
) -> Result<FeedCategoryView> {
    let mut tx = core.pool.begin().await?;
    let (count, next): (i64, i32) = sqlx::query_as(
        "SELECT COUNT(*), CAST(COALESCE(MAX(position) + 1, 0) AS SIGNED) FROM FeedCategory WHERE userId = ?",
    )
    .bind(user_id)
    .fetch_one(&mut *tx)
    .await?;
    if count >= MAX_PER_USER {
        return Err(Error::bad_request(format!(
            "At most {MAX_PER_USER} categories are allowed"
        )));
    }
    let id = new_id();
    sqlx::query("INSERT INTO FeedCategory (id, userId, name, color, position) VALUES (?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(user_id)
        .bind(name)
        .bind(color)
        .bind(next)
        .execute(&mut *tx)
        .await
        .map_err(|e| if is_duplicate(&e) { duplicate_name() } else { e.into() })?;
    set_feeds(&mut tx, user_id, &id, feed_ids).await?;
    tx.commit().await?;
    get(core, user_id, &id).await
}

pub async fn update(
    core: &Core,
    user_id: &str,
    id: &str,
    name: Option<&str>,
    color: Option<&str>,
    feed_ids: Option<&[String]>,
) -> Result<FeedCategoryView> {
    let mut tx = core.pool.begin().await?;
    owned(&mut tx, user_id, id).await?;
    if let Some(n) = name {
        sqlx::query("UPDATE FeedCategory SET name = ? WHERE id = ?")
            .bind(n)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| if is_duplicate(&e) { duplicate_name() } else { e.into() })?;
    }
    if let Some(c) = color {
        sqlx::query("UPDATE FeedCategory SET color = ? WHERE id = ?")
            .bind(c)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }
    if let Some(f) = feed_ids {
        set_feeds(&mut tx, user_id, id, f).await?;
    }
    tx.commit().await?;
    get(core, user_id, id).await
}

pub async fn delete(core: &Core, user_id: &str, id: &str) -> Result<()> {
    let n = sqlx::query("DELETE FROM FeedCategory WHERE id = ? AND userId = ?")
        .bind(id)
        .bind(user_id)
        .execute(&core.pool)
        .await?
        .rows_affected();
    if n == 0 {
        return Err(Error::NotFound);
    }
    Ok(())
}

pub async fn add_feed(core: &Core, user_id: &str, id: &str, feed_id: &str) -> Result<FeedCategoryView> {
    let mut tx = core.pool.begin().await?;
    owned(&mut tx, user_id, id).await?;
    check_followed(&mut tx, user_id, &[feed_id.to_string()]).await?;
    sqlx::query("INSERT IGNORE INTO FeedCategoryFeed (categoryId, feedId) VALUES (?, ?)")
        .bind(id)
        .bind(feed_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    get(core, user_id, id).await
}

pub async fn remove_feed(core: &Core, user_id: &str, id: &str, feed_id: &str) -> Result<FeedCategoryView> {
    let mut tx = core.pool.begin().await?;
    owned(&mut tx, user_id, id).await?;
    sqlx::query("DELETE FROM FeedCategoryFeed WHERE categoryId = ? AND feedId = ?")
        .bind(id)
        .bind(feed_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    get(core, user_id, id).await
}
