//! Environment based configuration. Names and defaults are identical to the TypeScript backend.
//! An empty variable counts as unset, numbers are parsed like `Number()` would (lenient, see `num`).
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub service_type: String,
    pub external_cronjobs: bool,
    pub jwt_secret: String,
    pub jwt_expiration: String,
    pub database_url: String,
    pub status: String,
    pub backend_port: u16,
    pub feed_update_interval: String,
    pub max_article_age: String,
    pub garbage_collector_interval: String,
    pub max_url_length: usize,
    pub max_image_url_length: usize,
    pub max_feed_error_count: i64,
    pub max_content_length: usize,
    pub show_article_readers: bool,
    pub max_extraction_attempts: i64,
    pub extraction_retry_delay_ms: i64,
    pub content_prefetch_max_ids: usize,
    /// Optional: size of the connection pool of this process.
    pub db_max_connections: Option<u32>,
    /// Optional: number of feeds the feed parser job processes in parallel.
    pub feed_parser_concurrency: usize,
}

fn var(name: &str) -> Option<String> {
    env::var(name).ok().filter(|v| !v.is_empty())
}

fn string(name: &str, default: &str) -> String {
    var(name).unwrap_or_else(|| default.to_string())
}

fn num<T: std::str::FromStr>(name: &str, default: T) -> T {
    var(name)
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(default)
}

impl Config {
    /// Variables without default (`JWT_SECRET`, `DATABASE_URL`) are only required when `require_secrets` is set.
    pub fn from_env(require_secrets: bool) -> Result<Self, String> {
        let required = |name: &str| match var(name) {
            Some(v) => Ok(v),
            None if require_secrets => Err(format!("Environment variable {name} not found")),
            None => Ok(String::new()),
        };
        Ok(Self {
            service_type: string("SERVICE_TYPE", "all"),
            external_cronjobs: string("EXTERNAL_CRONJOB", "false") == "true",
            jwt_secret: required("JWT_SECRET")?,
            jwt_expiration: string("JWT_EXPIRATION", "30d"),
            database_url: required("DATABASE_URL")?,
            status: string("STATUS", "production"),
            backend_port: num("BACKEND_PORT", 8080),
            feed_update_interval: string("FEED_UPDATE_INTERVAL", "600000"),
            max_article_age: string("TIME_TO_DELETE_OLD_ARTICLES", "604800000"),
            garbage_collector_interval: string("GARBAGE_COLLECTOR_INTERVAL", "3600000"),
            max_url_length: num("MAX_URL_LENGTH", 1000),
            max_image_url_length: num("MAX_IMAGE_URL_LENGTH", 10000).min(1000),
            max_feed_error_count: num("MAX_FEED_ERROR_COUNT", 20),
            max_content_length: num("MAX_CONTENT_LENGTH", 2_000_000),
            show_article_readers: string("SHOW_ARTICLE_READERS", "true") == "true",
            max_extraction_attempts: num("MAX_EXTRACTION_ATTEMPTS", 3),
            extraction_retry_delay_ms: num("EXTRACTION_RETRY_DELAY", 21_600_000),
            content_prefetch_max_ids: num("CONTENT_PREFETCH_MAX_IDS", 50),
            db_max_connections: var("DB_MAX_CONNECTIONS").and_then(|v| v.parse().ok()),
            feed_parser_concurrency: num::<usize>("FEED_PARSER_CONCURRENCY", 4).max(1),
        })
    }

    /// Maximum age of articles in milliseconds (`NaN` in the old backend turned into "nothing matches"; we use the default).
    pub fn max_article_age_ms(&self) -> i64 {
        self.max_article_age.trim().parse().unwrap_or(604_800_000)
    }

    pub fn feed_interval_ms(&self) -> u64 {
        self.feed_update_interval.trim().parse().unwrap_or(600_000)
    }

    pub fn gc_interval_ms(&self) -> u64 {
        self.garbage_collector_interval
            .trim()
            .parse()
            .unwrap_or(3_600_000)
    }
}
