use super::articles::{self, ArticleCore, ArticleUpdate, ListedArticle, UserState, ARTICLE_FROM, ARTICLE_SELECT, LIST_STATE_SELECT};
use crate::state::Core;
use crate::time::now;
use crate::{Error, Result};
use sqlx::{MySql, QueryBuilder};

async fn listed(core: &Core, mut b: QueryBuilder<'_, MySql>) -> Result<Vec<ListedArticle>> {
    b.push(" ORDER BY al.articleId");
    let rows = b.build().fetch_all(&core.pool).await?;
    rows.iter().map(|r| Ok(ArticleCore::from_row(r)?.into_listed(UserState::from_row(r)?))).collect()
}

fn base(user_id: &str) -> QueryBuilder<'_, MySql> {
    let mut b = QueryBuilder::new(format!("SELECT {ARTICLE_SELECT}, {LIST_STATE_SELECT} FROM ArticleList al JOIN Article a ON a.id = al.articleId "));
    b.push(ARTICLE_FROM.trim_start_matches("FROM Article a "));
    b.push(" WHERE al.userId = ").push_bind(user_id);
    b
}

/// The reading list hides entries that expired according to the user's settings.
/// `NOT (read AND dateRead < x)` is NULL for rows without a date, so those rows drop out too. This mirrors the old query.
pub async fn reading_list(core: &Core, user_id: &str) -> Result<Vec<ListedArticle>> {
    let settings: Option<(i32, i32)> = sqlx::query_as("SELECT expTimeRead, expTimeUnread FROM Settings WHERE userId = ? ORDER BY id LIMIT 1")
        .bind(user_id)
        .fetch_optional(&core.pool)
        .await?;
    let mut b = base(user_id);
    b.push(" AND al.saved = 1");
    if let Some((read_ms, unread_ms)) = settings {
        let n = now();
        if read_ms >= 0 {
            b.push(" AND NOT (al.`read` = 1 AND al.dateRead < ").push_bind(n - chrono::Duration::milliseconds(read_ms as i64)).push(")");
        }
        if unread_ms >= 0 {
            b.push(" AND NOT (al.`read` = 0 AND al.dateSaved < ").push_bind(n - chrono::Duration::milliseconds(unread_ms as i64)).push(")");
        }
    }
    listed(core, b).await
}

pub async fn starred(core: &Core, user_id: &str) -> Result<Vec<ListedArticle>> {
    let mut b = base(user_id);
    b.push(" AND al.starred = 1");
    listed(core, b).await
}

pub async fn add_to_reading_list(core: &Core, user_id: &str, article_id: &str) -> Result<()> {
    articles::update(core, user_id, article_id, ArticleUpdate { saved: Some(true), ..Default::default() }).await
}

pub async fn remove_from_reading_list(core: &Core, user_id: &str, article_id: &str) -> Result<()> {
    articles::update(core, user_id, article_id, ArticleUpdate { saved: Some(false), ..Default::default() }).await
}

pub async fn clear_reading_list(core: &Core, user_id: &str, only_read: bool) -> Result<()> {
    let sql = if only_read {
        "UPDATE ArticleList SET saved = 0, dateSaved = NULL WHERE userId = ? AND `read` = 1 AND saved = 1"
    } else {
        "UPDATE ArticleList SET saved = 0, dateSaved = NULL WHERE userId = ? AND saved = 1"
    };
    sqlx::query(sql).bind(user_id).execute(&core.pool).await?;
    Ok(())
}

/// Stars or unstars an article and returns its new state. The user must already have a list entry for it.
pub async fn set_starred(core: &Core, user_id: &str, article_id: &str, star: bool) -> Result<articles::ArticleDetail> {
    let row: Option<bool> = sqlx::query_scalar("SELECT starred FROM ArticleList WHERE articleId = ? AND userId = ?")
        .bind(article_id)
        .bind(user_id)
        .fetch_optional(&core.pool)
        .await?;
    match row {
        None => return Err(Error::bad_request("The user has no entry for this article")),
        Some(current) if current == star => return Err(Error::bad_request(format!("This article is already in this state: starred = {star}"))),
        Some(_) => {}
    }
    articles::update(core, user_id, article_id, ArticleUpdate { starred: Some(star), ..Default::default() }).await?;
    articles::detail(core, user_id, article_id).await
}
