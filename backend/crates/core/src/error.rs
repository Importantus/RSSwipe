use thiserror::Error;

#[derive(Debug, Clone, PartialEq)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

impl FieldError {
    pub fn new(field: impl Into<String>, message: impl Into<String>) -> Self {
        Self { field: field.into(), message: message.into() }
    }
}

/// Domain errors. The API layer turns each variant into the documented response.
#[derive(Debug, Error)]
pub enum Error {
    #[error("Not authorized")]
    NotAuthorized,
    #[error("Forbidden")]
    Forbidden,
    #[error("Not found")]
    NotFound,
    #[error("{0}")]
    BadRequest(String),
    #[error("{}", .0.first().map(|e| format!("{}: {}", e.field, e.message)).unwrap_or_default())]
    Validation(Vec<FieldError>),
    /// The publisher's page could not be turned into readable content (expected failure, not a bug).
    #[error("Could not extract the article content: {0}")]
    ExtractionFailed(String),
    #[error("{0}")]
    Internal(String),
    #[error("database error: {0}")]
    Db(#[from] sqlx::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

impl Error {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Error::BadRequest(msg.into())
    }
    pub fn internal(msg: impl ToString) -> Self {
        Error::Internal(msg.to_string())
    }
}

/// True for a MySQL duplicate key violation (error 1062).
pub fn is_duplicate(e: &sqlx::Error) -> bool {
    matches!(e, sqlx::Error::Database(d) if d.code().as_deref() == Some("23000") && d.message().starts_with("Duplicate entry"))
        || matches!(e, sqlx::Error::Database(d) if d.is_unique_violation())
}
