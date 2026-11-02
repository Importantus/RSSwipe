use crate::models::articles::CategoryView;
use crate::state::Core;
use crate::Result;

pub async fn all(core: &Core) -> Result<Vec<CategoryView>> {
    let rows: Vec<(String, String, chrono::DateTime<chrono::Utc>)> = sqlx::query_as("SELECT id, name, createdAt FROM Category ORDER BY id").fetch_all(&core.pool).await?;
    Ok(rows.into_iter().map(|(id, name, created_at)| CategoryView { id, name, created_at }).collect())
}
