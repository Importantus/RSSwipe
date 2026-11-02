//! The one error response format of the API: `{"message", "code", "errors"?}` (see docs/rust-migration/API-CHANGES.md, E1-E7).
use axum::http::{header, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use rsswipe_core::{Error, FieldError};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema, Debug)]
pub struct FieldErrorBody {
    pub field: String,
    pub message: String,
}

#[derive(Serialize, ToSchema, Debug)]
pub struct ErrorBody {
    /// Human readable description
    pub message: String,
    /// Stable machine readable code
    pub code: String,
    /// Per field problems of a `validation_error`
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<FieldErrorBody>>,
    /// Only with `STATUS=development`: details of internal errors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Debug)]
pub struct ApiError {
    pub status: StatusCode,
    pub body: ErrorBody,
}

impl ApiError {
    pub fn new(status: StatusCode, code: &str, message: impl Into<String>) -> Self {
        Self { status, body: ErrorBody { message: message.into(), code: code.into(), errors: None, detail: None } }
    }
    pub fn route_not_found() -> Self {
        Self::new(StatusCode::NOT_FOUND, "route_not_found", "Not found")
    }
    pub fn invalid_json(detail: impl std::fmt::Display) -> Self {
        Self::new(StatusCode::BAD_REQUEST, "invalid_json", format!("Request body is not valid JSON: {detail}"))
    }
    pub fn payload_too_large(limit: &str) -> Self {
        Self::new(StatusCode::PAYLOAD_TOO_LARGE, "payload_too_large", format!("Request body is larger than {limit}"))
    }
    pub fn validation(errors: Vec<FieldError>) -> Self {
        Error::Validation(errors).into()
    }
}

impl From<Error> for ApiError {
    fn from(e: Error) -> Self {
        match e {
            Error::NotAuthorized => Self::new(StatusCode::UNAUTHORIZED, "not_authorized", "Not authorized"),
            Error::Forbidden => Self::new(StatusCode::FORBIDDEN, "forbidden", "Forbidden"),
            Error::NotFound => Self::new(StatusCode::NOT_FOUND, "not_found", "Not found"),
            Error::BadRequest(m) => Self::new(StatusCode::BAD_REQUEST, "bad_request", m),
            Error::ExtractionFailed(_) => Self::new(StatusCode::INTERNAL_SERVER_ERROR, "extraction_failed", e.to_string()),
            Error::Validation(v) => {
                let first = v.first().map(|f| format!("{}: {}", f.field, f.message)).unwrap_or_else(|| "invalid request".into());
                let mut a = Self::new(StatusCode::BAD_REQUEST, "validation_error", format!("Invalid request: {first}"));
                a.body.errors = Some(v.into_iter().map(|f| FieldErrorBody { field: f.field, message: f.message }).collect());
                a
            }
            Error::Internal(_) | Error::Db(_) => {
                tracing::error!(scope = rsswipe_core::logger::API, "Internal error: {e}");
                let mut a = Self::new(StatusCode::INTERNAL_SERVER_ERROR, "internal_error", "Internal server error");
                if std::env::var("STATUS").as_deref() == Ok("development") {
                    a.body.detail = Some(e.to_string());
                }
                a
            }
        }
    }
}

pub fn json_response<T: Serialize>(status: StatusCode, value: &T) -> Response {
    match serde_json::to_vec(value) {
        Ok(bytes) => {
            let mut r = (status, bytes).into_response();
            r.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static("application/json; charset=utf-8"));
            r
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "serialization failed").into_response(),
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        json_response(self.status, &self.body)
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
