//! Connection pool, the Prisma preflight check and the migrations.
use crate::config::Config;
use crate::{Error, Result};
use sqlx::mysql::{MySqlConnectOptions, MySqlPoolOptions, MySqlSslMode};
use sqlx::{ConnectOptions, MySqlPool, Row};
use std::str::FromStr;
use std::time::Duration;

pub static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("../../migrations");

/// The Prisma migrations that make up the schema `0001_baseline.sql` describes.
const PRISMA_MIGRATIONS: [&str; 19] = [
    "20231111105800_init",
    "20231111122133_add_starred",
    "20231126113546_change_settings_table_change_data_type_in_settings_table",
    "20231128150550_delete_cascade_if_user_is_deleted",
    "20231128153642_make_feed_link_unique",
    "20231128154040_add_default_value_for_feed_last_update",
    "20231128160951_make_feed_favicon_optional",
    "20231128174844_make_article_link_unique",
    "20231128174953_add_published_at_to_article",
    "20231128175319_make_article_image_optional",
    "20231130110847_add_feed_field_active",
    "20231204101140_increase_url_size",
    "20231204172257_make_article_pub_date_optional",
    "20231220094208_add_article_categories",
    "20240109115748_make_article_link_not_unique",
    "20240124150210_add_error_to_feed",
    "20240220181901_make_errormessage_longer",
    "20240331144354_add_feed_description",
    "20260821114955_article_content",
];

/// Columns the code relies on; checked before the baseline is applied to an existing database.
const EXPECTED_COLUMNS: &[(&str, &[&str])] = &[
    ("User", &["id", "name", "email", "password", "createdAt"]),
    (
        "Feed",
        &[
            "id",
            "title",
            "link",
            "createdAt",
            "faviconUrl",
            "lastUpdate",
            "active",
            "error_count",
            "errormessage",
            "description",
        ],
    ),
    ("FeedList", &["userId", "feedId", "openInApp", "followedAt"]),
    (
        "Article",
        &[
            "id",
            "title",
            "link",
            "imageUrl",
            "createdAt",
            "feedId",
            "publishedAt",
        ],
    ),
    (
        "ArticleContent",
        &[
            "articleId",
            "title",
            "content",
            "textContent",
            "excerpt",
            "byline",
            "dir",
            "siteName",
            "lang",
            "length",
            "status",
            "attempts",
            "lastError",
            "lastAttempt",
            "fetchedAt",
        ],
    ),
    (
        "Settings",
        &["id", "userId", "expTimeRead", "expTimeUnread"],
    ),
    (
        "ArticleList",
        &[
            "articleId",
            "userId",
            "saved",
            "read",
            "dateSaved",
            "dateRead",
            "dateSeen",
            "dateStar",
            "seen",
            "starred",
        ],
    ),
];

/// Prisma specific query parameters in `DATABASE_URL` that sqlx does not know.
struct PrismaParams {
    connection_limit: Option<u32>,
    accept_invalid_certs: bool,
}

fn split_prisma_params(url: &str) -> (String, PrismaParams) {
    let mut params = PrismaParams {
        connection_limit: None,
        accept_invalid_certs: false,
    };
    let Some((base, query)) = url.split_once('?') else {
        return (url.to_string(), params);
    };
    let mut keep = Vec::new();
    for pair in query.split('&').filter(|p| !p.is_empty()) {
        let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
        match k {
            "connection_limit" => params.connection_limit = v.parse().ok(),
            "sslaccept" => params.accept_invalid_certs = v == "accept_invalid_certs",
            "pool_timeout"
            | "connect_timeout"
            | "socket_timeout"
            | "schema"
            | "pgbouncer"
            | "statement_cache_size" => {}
            _ => keep.push(pair),
        }
    }
    let url = if keep.is_empty() {
        base.to_string()
    } else {
        format!("{base}?{}", keep.join("&"))
    };
    (url, params)
}

/// `default_pool` is the pool size when neither `DB_MAX_CONNECTIONS` nor `connection_limit` is set.
pub async fn connect(config: &Config, default_pool: u32) -> Result<MySqlPool> {
    let (url, prisma) = split_prisma_params(&config.database_url);
    let mut opts = MySqlConnectOptions::from_str(&url)
        .map_err(|e| Error::internal(format!("Invalid DATABASE_URL: {e}")))?
        .charset("utf8mb4")
        .collation("utf8mb4_unicode_ci")
        .timezone(Some("+00:00".to_string()));
    if prisma.accept_invalid_certs {
        opts = opts.ssl_mode(MySqlSslMode::Required);
    }
    let opts = opts.log_statements(tracing::log::LevelFilter::Debug);
    let max = config
        .db_max_connections
        .or(prisma.connection_limit)
        .unwrap_or(default_pool);
    Ok(MySqlPoolOptions::new()
        .max_connections(max)
        .acquire_timeout(Duration::from_secs(30))
        .connect_with(opts)
        .await?)
}

/// Makes sure an existing database really is in the state the baseline assumes.
pub async fn preflight(pool: &MySqlPool) -> Result<()> {
    let has_table = |name: &'static str| async move {
        let n: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?")
            .bind(name)
            .fetch_one(pool)
            .await?;
        Ok::<bool, Error>(n > 0)
    };

    if has_table("_prisma_migrations").await? {
        let applied: Vec<String> = sqlx::query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")
            .fetch_all(pool)
            .await?
            .iter()
            .map(|r| r.get::<String, _>(0))
            .collect();
        let missing: Vec<&&str> = PRISMA_MIGRATIONS
            .iter()
            .filter(|m| !applied.iter().any(|a| a == **m))
            .collect();
        if !missing.is_empty() {
            return Err(Error::internal(format!(
                "The database is missing Prisma migrations: {missing:?}. Roll out the previous release (which applies them) first."
            )));
        }
        let unknown: Vec<&String> = applied
            .iter()
            .filter(|a| !PRISMA_MIGRATIONS.contains(&a.as_str()))
            .collect();
        if !unknown.is_empty() {
            return Err(Error::internal(format!("The database contains unknown Prisma migrations: {unknown:?}. Refusing to continue.")));
        }
    }

    if has_table("User").await? {
        for (table, columns) in EXPECTED_COLUMNS {
            let found: Vec<String> = sqlx::query_scalar("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?")
                .bind(*table)
                .fetch_all(pool)
                .await?;
            let missing: Vec<&&str> = columns
                .iter()
                .filter(|c| !found.iter().any(|f| f.eq_ignore_ascii_case(c)))
                .collect();
            if !missing.is_empty() {
                return Err(Error::internal(format!("Table {table} lacks the expected columns {missing:?}; the schema does not match.")));
            }
        }
    }
    Ok(())
}

/// Applies pending migrations (preflight first). Safe to run repeatedly; `sqlx` holds a `GET_LOCK` meanwhile.
pub async fn migrate(pool: &MySqlPool) -> Result<()> {
    preflight(pool).await?;
    MIGRATOR
        .run(pool)
        .await
        .map_err(|e| Error::internal(format!("Migration failed: {e}")))?;
    Ok(())
}

/// For services that must not migrate: warn if the schema is behind this binary.
pub async fn warn_if_outdated(pool: &MySqlPool) {
    let latest = MIGRATOR.iter().map(|m| m.version).max().unwrap_or(0);
    let applied: std::result::Result<Option<i64>, _> =
        sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations WHERE success = 1")
            .fetch_one(pool)
            .await;
    match applied {
        Ok(Some(v)) if v >= latest => {}
        _ => crate::warn!(crate::logger::API, "Database schema is not up to date (expected migration {latest}). Run `rsswipe migrate`."),
    }
}
