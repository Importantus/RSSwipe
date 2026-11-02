//! Shared building blocks of the RSSwipe backend: configuration, database, auth,
//! domain queries, feed fetching/parsing and the background jobs.
pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod fetch;
pub mod html;
pub mod ingest;
pub mod jobs;
pub mod logger;
pub mod models;
pub mod opml;
pub mod state;
pub mod time;

pub use error::{Error, FieldError, Result};
pub use state::{new_id, Core};
