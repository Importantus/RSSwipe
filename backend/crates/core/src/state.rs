use crate::config::Config;
use crate::fetch::Fetcher;
use sqlx::MySqlPool;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Everything the domain functions need. Cheap to clone.
#[derive(Clone)]
pub struct Core {
    pub pool: MySqlPool,
    pub config: Arc<Config>,
    pub fetcher: Fetcher,
    /// One lock per article: concurrent content extractions of the same article share a single run.
    pub extraction_locks: Arc<Mutex<HashMap<String, Arc<tokio::sync::Mutex<()>>>>>,
}

impl Core {
    pub fn new(pool: MySqlPool, config: Config) -> crate::Result<Self> {
        let fetcher = Fetcher::new(config.max_content_length)?;
        Ok(Self { pool, config: Arc::new(config), fetcher, extraction_locks: Default::default() })
    }
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}
