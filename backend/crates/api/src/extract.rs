//! Request extraction: JSON/form bodies (like express' body-parser), the articles query string and authentication.
use crate::error::ApiError;
use crate::AppState;
use axum::body::Body as AxumBody;
use axum::extract::{FromRequest, FromRequestParts, Request};
use axum::http::{header, request::Parts};
use rsswipe_core::{Error, FieldError};
use serde::de::DeserializeOwned;
use serde_json::{Map, Value};

pub const JSON_LIMIT: usize = 100 * 1024;
pub const OPML_LIMIT: usize = 5 * 1024 * 1024;

/// A request body that knows how to check itself.
pub trait Validate {
    fn validate(&self, _state: &AppState) -> Vec<FieldError> {
        vec![]
    }
}

/// Deserializes a field as present-and-not-null: `null` is an error where the old API required the type.
pub fn present<'de, D, T>(d: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de>,
{
    T::deserialize(d).map(Some)
}

fn content_type(req: &Request) -> String {
    req.headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase()
}

async fn read_limited(body: AxumBody, limit: usize, label: &str) -> Result<Vec<u8>, ApiError> {
    axum::body::to_bytes(body, limit)
        .await
        .map(|b| b.to_vec())
        .map_err(|_| ApiError::payload_too_large(label))
}

/// Body as a JSON value: `application/json` (objects and arrays only), urlencoded forms, otherwise `{}`.
async fn body_value(req: Request) -> Result<Value, ApiError> {
    let ct = content_type(&req);
    if ct.starts_with("application/json") {
        let bytes = read_limited(req.into_body(), JSON_LIMIT, "100kb").await?;
        if bytes.iter().all(|b| b.is_ascii_whitespace()) {
            return Ok(Value::Object(Map::new()));
        }
        let first = bytes
            .iter()
            .find(|b| !b.is_ascii_whitespace())
            .copied()
            .unwrap_or(b' ');
        if first != b'{' && first != b'[' {
            return Err(ApiError::invalid_json(
                "only objects and arrays are accepted",
            ));
        }
        serde_json::from_slice(&bytes).map_err(ApiError::invalid_json)
    } else if ct.starts_with("application/x-www-form-urlencoded") {
        let bytes = read_limited(req.into_body(), JSON_LIMIT, "100kb").await?;
        let mut m = Map::new();
        for (k, v) in url::form_urlencoded::parse(&bytes) {
            m.insert(k.into_owned(), Value::String(v.into_owned()));
        }
        Ok(Value::Object(m))
    } else {
        Ok(Value::Object(Map::new()))
    }
}

fn field_errors<E: std::fmt::Display>(e: &serde_path_to_error::Error<E>) -> Vec<FieldError> {
    let path = e.path().to_string();
    let msg = e.inner().to_string();
    // "missing field `x`" / "unknown field `x`" are reported on the root, name the field instead
    let named = |marker: &str| {
        msg.find(marker).map(|i| {
            msg[i + marker.len()..]
                .split('`')
                .next()
                .unwrap_or("")
                .to_string()
        })
    };
    let (field, message) = if let Some(f) = named("missing field `") {
        (f, "is required".to_string())
    } else if let Some(f) = named("unknown field `") {
        (f, "is not allowed".to_string())
    } else {
        (
            if path == "." {
                "body".to_string()
            } else {
                path
            },
            msg.split(" at line ").next().unwrap_or(&msg).to_string(),
        )
    };
    vec![FieldError::new(field, message)]
}

/// Validated JSON/form body.
pub struct Body<T>(pub T);

impl<T> FromRequest<AppState> for Body<T>
where
    T: DeserializeOwned + Validate,
{
    type Rejection = ApiError;
    async fn from_request(req: Request, state: &AppState) -> Result<Self, ApiError> {
        let value = body_value(req).await?;
        let parsed: T = serde_path_to_error::deserialize(value)
            .map_err(|e| ApiError::validation(field_errors(&e)))?;
        let errors = parsed.validate(state);
        if errors.is_empty() {
            Ok(Body(parsed))
        } else {
            Err(ApiError::validation(errors))
        }
    }
}

/// OPML document: only the XML content types are read, anything else yields an empty string.
pub struct OpmlText(pub String);

impl<S: Send + Sync> FromRequest<S> for OpmlText {
    type Rejection = ApiError;
    async fn from_request(req: Request, _: &S) -> Result<Self, ApiError> {
        let ct = content_type(&req);
        let mime = ct.split(';').next().unwrap_or("").trim();
        if matches!(mime, "text/xml" | "application/xml" | "text/x-opml") {
            let bytes = read_limited(req.into_body(), OPML_LIMIT, "5mb").await?;
            Ok(OpmlText(String::from_utf8_lossy(&bytes).into_owned()))
        } else {
            Ok(OpmlText(String::new()))
        }
    }
}

/// The authenticated user, set by the auth middleware.
#[derive(Clone, Debug)]
pub struct UserId(pub String);

impl<S: Send + Sync> FromRequestParts<S> for UserId {
    type Rejection = ApiError;
    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, ApiError> {
        parts
            .extensions
            .get::<UserId>()
            .cloned()
            .ok_or_else(|| Error::NotAuthorized.into())
    }
}

/// Query string of `GET /articles`, parsed the way express' `qs` did for the supported shapes.
#[derive(Debug, Default)]
pub struct RawArticlesQuery {
    pub limit: Option<String>,
    pub feeds: Option<Vec<String>>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub errors: Vec<FieldError>,
}

impl<S: Send + Sync> FromRequestParts<S> for RawArticlesQuery {
    type Rejection = ApiError;
    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, ApiError> {
        let mut q = RawArticlesQuery::default();
        for (key, value) in url::form_urlencoded::parse(parts.uri.query().unwrap_or("").as_bytes())
        {
            let (name, bracket) = match key.split_once('[') {
                Some((n, rest)) => (n.to_string(), Some(rest.trim_end_matches(']').to_string())),
                None => (key.to_string(), None),
            };
            match name.as_str() {
                "feeds" => {
                    if bracket
                        .as_deref()
                        .is_some_and(|b| !b.is_empty() && !b.chars().all(|c| c.is_ascii_digit()))
                    {
                        q.errors
                            .push(FieldError::new(&name, "must be a list of ids"));
                        continue;
                    }
                    q.feeds
                        .get_or_insert_with(Vec::new)
                        .push(value.into_owned());
                }
                "limit" | "startDate" | "endDate" => {
                    let slot = match name.as_str() {
                        "limit" => &mut q.limit,
                        "startDate" => &mut q.start_date,
                        _ => &mut q.end_date,
                    };
                    if bracket.is_some() || slot.is_some() {
                        q.errors
                            .push(FieldError::new(&name, "must be a single value"));
                    } else {
                        *slot = Some(value.into_owned());
                    }
                }
                _ => q
                    .errors
                    .push(FieldError::new(key.as_ref(), "is not a known parameter")),
            }
        }
        Ok(q)
    }
}
