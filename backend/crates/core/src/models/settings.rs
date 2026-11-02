use crate::state::Core;
use crate::{Error, Result};
use serde::Serialize;

#[derive(Serialize, Debug, Clone, sqlx::FromRow)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct SettingsView {
    #[serde(rename = "expTimeRead")]
    #[sqlx(rename = "expTimeRead")]
    pub exp_time_read: i32,
    #[serde(rename = "expTimeUnread")]
    #[sqlx(rename = "expTimeUnread")]
    pub exp_time_unread: i32,
}

pub async fn get(core: &Core, user_id: &str) -> Result<SettingsView> {
    sqlx::query_as("SELECT expTimeRead, expTimeUnread FROM Settings WHERE userId = ? ORDER BY id LIMIT 1")
        .bind(user_id)
        .fetch_optional(&core.pool)
        .await?
        .ok_or(Error::NotFound)
}

pub async fn update(core: &Core, user_id: &str, read: Option<i32>, unread: Option<i32>) -> Result<()> {
    let id: String = sqlx::query_scalar("SELECT id FROM Settings WHERE userId = ? ORDER BY id LIMIT 1")
        .bind(user_id)
        .fetch_optional(&core.pool)
        .await?
        .ok_or(Error::NotFound)?;
    sqlx::query("UPDATE Settings SET expTimeRead = COALESCE(?, expTimeRead), expTimeUnread = COALESCE(?, expTimeUnread) WHERE id = ?")
        .bind(read).bind(unread).bind(id)
        .execute(&core.pool).await?;
    Ok(())
}
