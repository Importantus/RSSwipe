use crate::auth;
use crate::error::is_duplicate;
use crate::state::{new_id, Core};
use crate::time::ts;
use crate::{Error, Result};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{FromRow, MySql, QueryBuilder};

#[derive(FromRow)]
struct UserRow {
    id: String,
    name: String,
    email: String,
    password: String,
    #[sqlx(rename = "createdAt")]
    created_at: DateTime<Utc>,
}

#[derive(Serialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct UserView {
    pub id: String,
    pub name: String,
    pub email: String,
    #[serde(rename = "createdAt", serialize_with = "ts")]
    pub created_at: DateTime<Utc>,
}

impl From<UserRow> for UserView {
    fn from(u: UserRow) -> Self {
        Self {
            id: u.id,
            name: u.name,
            email: u.email,
            created_at: u.created_at,
        }
    }
}

const COLS: &str = "id, name, email, password, createdAt";

async fn by_email(core: &Core, email: &str) -> Result<Option<UserRow>> {
    Ok(
        sqlx::query_as(&format!("SELECT {COLS} FROM User WHERE email = ?"))
            .bind(email)
            .fetch_optional(&core.pool)
            .await?,
    )
}

async fn by_id(core: &Core, id: &str) -> Result<Option<UserRow>> {
    Ok(
        sqlx::query_as(&format!("SELECT {COLS} FROM User WHERE id = ?"))
            .bind(id)
            .fetch_optional(&core.pool)
            .await?,
    )
}

const EMAIL_TAKEN: &str = "User with this email already exists";

pub async fn register(core: &Core, name: &str, email: &str, password: &str) -> Result<UserView> {
    if by_email(core, email).await?.is_some() {
        return Err(Error::bad_request(EMAIL_TAKEN));
    }
    let hash = auth::hash_password(password).await?;
    let id = new_id();
    let mut tx = core.pool.begin().await?;
    let inserted = sqlx::query("INSERT INTO User (id, name, email, password) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(name)
        .bind(email)
        .bind(&hash)
        .execute(&mut *tx)
        .await;
    if let Err(e) = inserted {
        return Err(if is_duplicate(&e) {
            Error::bad_request(EMAIL_TAKEN)
        } else {
            e.into()
        });
    }
    // default retention: read articles stay 3 days in the reading list, unread ones forever (-1)
    sqlx::query(
        "INSERT INTO Settings (id, userId, expTimeRead, expTimeUnread) VALUES (?, ?, ?, ?)",
    )
    .bind(new_id())
    .bind(&id)
    .bind(3 * 24 * 60 * 60 * 1000_i32)
    .bind(-1_i32)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(by_id(core, &id).await?.ok_or(Error::NotFound)?.into())
}

/// Every failure is reported as "Not authorized", whatever the reason.
pub async fn login(core: &Core, email: &str, password: &str) -> Result<String> {
    let user = by_email(core, email)
        .await
        .map_err(|_| Error::NotAuthorized)?
        .ok_or(Error::NotAuthorized)?;
    if !auth::verify_password(password, &user.password).await {
        return Err(Error::NotAuthorized);
    }
    auth::issue_token(
        &user.id,
        &core.config.jwt_secret,
        &core.config.jwt_expiration,
    )
}

pub async fn get(core: &Core, id: &str) -> Result<UserView> {
    Ok(by_id(core, id).await?.ok_or(Error::NotFound)?.into())
}

#[derive(Default)]
pub struct UserUpdate {
    pub name: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
    pub old_password: Option<String>,
}

pub async fn update(core: &Core, id: &str, data: UserUpdate) -> Result<()> {
    let user = by_id(core, id).await?.ok_or(Error::NotFound)?;
    if data.password.is_some()
        && !auth::verify_password(data.old_password.as_deref().unwrap_or(""), &user.password).await
    {
        return Err(Error::Forbidden);
    }
    if let Some(email) = &data.email {
        if let Some(other) = by_email(core, email).await? {
            if other.id != id {
                return Err(Error::bad_request(EMAIL_TAKEN));
            }
        }
    }
    let hash = match &data.password {
        Some(p) => Some(auth::hash_password(p).await?),
        None => None,
    };
    let mut q: QueryBuilder<MySql> = QueryBuilder::new("UPDATE User SET ");
    let mut set = q.separated(", ");
    let mut any = false;
    if let Some(v) = &data.name {
        set.push("name = ").push_bind_unseparated(v);
        any = true;
    }
    if let Some(v) = &data.email {
        set.push("email = ").push_bind_unseparated(v);
        any = true;
    }
    if let Some(v) = &hash {
        set.push("password = ").push_bind_unseparated(v);
        any = true;
    }
    if !any {
        return Ok(());
    }
    q.push(" WHERE id = ").push_bind(id);
    match q.build().execute(&core.pool).await {
        Err(e) if is_duplicate(&e) => Err(Error::bad_request(EMAIL_TAKEN)),
        r => r.map(|_| ()).map_err(Into::into),
    }
}

pub async fn delete(core: &Core, id: &str, password: &str) -> Result<()> {
    let user = by_id(core, id).await?.ok_or(Error::NotFound)?;
    if !auth::verify_password(password, &user.password).await {
        return Err(Error::Forbidden);
    }
    sqlx::query("DELETE FROM User WHERE id = ?")
        .bind(id)
        .execute(&core.pool)
        .await?;
    Ok(())
}
