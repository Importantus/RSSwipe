//! Handlers. Each carries its own OpenAPI description; the spec served at `/v1/api-docs` is generated from them.
use crate::error::{json_response, ApiError, ApiResult, ErrorBody};
use crate::extract::{Body, OpmlText, RawArticlesQuery, UserId};
use crate::inputs::*;
use crate::AppState;
use axum::extract::{Path, State};
use axum::http::{header, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use chrono::NaiveDate;
use rsswipe_core::models::{
    articles::{self, ArticleDetail, ArticleListItem, ArticleQuery, ArticleUpdate, ListedArticle},
    content::{self, ContentView},
    feeds::{self, FeedView},
    lists,
    settings::{self, SettingsView},
    stats::{self, Statistics},
    users::{self, UserUpdate, UserView},
};
use rsswipe_core::{ingest, Error, FieldError};
use serde::Serialize;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

fn ok<T: Serialize>(v: &T) -> Response {
    json_response(StatusCode::OK, v)
}

fn message(m: &str) -> Response {
    ok(&serde_json::json!({ "message": m }))
}

fn check_id(id: &str) -> ApiResult<()> {
    let mut e = vec![];
    crate::inputs::uuid("id", id, &mut e);
    if e.is_empty() {
        Ok(())
    } else {
        Err(ApiError::validation(e))
    }
}

#[derive(Serialize, ToSchema)]
pub struct Message {
    pub message: String,
}

#[derive(Serialize, ToSchema)]
pub struct TokenResponse {
    pub token: String,
}

#[derive(Serialize, ToSchema)]
pub struct RegisterResponse {
    pub token: String,
    pub user: UserView,
}

#[derive(Serialize, ToSchema)]
pub struct ContentResponse {
    pub content: ContentView,
}

#[derive(Serialize, ToSchema)]
pub struct VersionEntry {
    pub version: String,
    pub path: String,
}

#[derive(Serialize, ToSchema)]
pub struct ResourceEntry {
    pub path: String,
    pub name: String,
}

#[derive(Serialize, ToSchema)]
pub struct SystemInfo {
    pub version: String,
    pub uptime: f64,
    pub status: String,
    #[serde(rename = "feedUpdateInterval")]
    pub feed_update_interval: String,
    #[serde(rename = "garbageCollectionInterval")]
    pub garbage_collection_interval: String,
    #[serde(rename = "maxArticleAge")]
    pub max_article_age: String,
}

// ---- public ---------------------------------------------------------------------------------

/// Lists the API versions. Also used as health probe.
#[utoipa::path(get, path = "/", tag = "system", responses((status = 200, body = Vec<VersionEntry>)))]
pub async fn versions() -> Response {
    ok(&serde_json::json!([{ "version": "v1", "path": "/v1" }]))
}

/// Lists the resources of API version 1.
#[utoipa::path(get, path = "/v1", tag = "system", responses((status = 200, body = Vec<ResourceEntry>)))]
pub async fn resources() -> Response {
    let names = [
        "user",
        "settings",
        "login",
        "register",
        "feeds",
        "articles",
        "readinglist",
        "starred",
        "categories",
        "statistics",
        "system",
    ];
    ok(&names
        .iter()
        .map(|n| serde_json::json!({ "path": format!("/v1/{n}"), "name": n }))
        .collect::<Vec<_>>())
}

/// Version, uptime and the intervals of the background jobs.
#[utoipa::path(get, path = "/v1/system", tag = "system", responses((status = 200, body = SystemInfo)))]
pub async fn system(State(s): State<AppState>) -> Response {
    let c = &s.core.config;
    ok(&SystemInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: s.started.elapsed().as_secs_f64(),
        status: c.status.clone(),
        feed_update_interval: c.feed_update_interval.clone(),
        garbage_collection_interval: c.garbage_collector_interval.clone(),
        max_article_age: c.max_article_age.clone(),
    })
}

/// Logs in and returns a JWT.
#[utoipa::path(post, path = "/v1/login", tag = "auth", request_body = LoginInput,
    responses((status = 200, body = TokenResponse), (status = 400, body = ErrorBody), (status = 401, body = ErrorBody)))]
pub async fn login(State(s): State<AppState>, Body(b): Body<LoginInput>) -> ApiResult<Response> {
    let token = users::login(&s.core, &b.email, &b.password).await?;
    Ok(ok(&TokenResponse { token }))
}

/// Registers a user and logs them in.
#[utoipa::path(post, path = "/v1/register", tag = "auth", request_body = RegisterInput,
    responses((status = 201, body = RegisterResponse), (status = 400, body = ErrorBody)))]
pub async fn register(
    State(s): State<AppState>,
    Body(b): Body<RegisterInput>,
) -> ApiResult<Response> {
    let user = users::register(&s.core, &b.name, &b.email, &b.password).await?;
    let token = users::login(&s.core, &b.email, &b.password).await?;
    Ok(json_response(
        StatusCode::CREATED,
        &RegisterResponse { token, user },
    ))
}

// ---- user & settings ------------------------------------------------------------------------

/// The logged in user.
#[utoipa::path(get, path = "/v1/user", tag = "user", security(("bearer" = [])),
    responses((status = 200, body = UserView), (status = 401, body = ErrorBody), (status = 404, body = ErrorBody)))]
pub async fn get_user(State(s): State<AppState>, UserId(id): UserId) -> ApiResult<Response> {
    Ok(ok(&users::get(&s.core, &id).await?))
}

/// Changes name, email or password. A new password needs `oldPassword`.
#[utoipa::path(put, path = "/v1/user", tag = "user", security(("bearer" = [])), request_body = UserUpdateInput,
    responses((status = 200, body = UserView), (status = 400, body = ErrorBody), (status = 403, body = ErrorBody)))]
pub async fn update_user(
    State(s): State<AppState>,
    UserId(id): UserId,
    Body(b): Body<UserUpdateInput>,
) -> ApiResult<Response> {
    users::update(
        &s.core,
        &id,
        UserUpdate {
            name: b.name,
            email: b.email,
            password: b.password,
            old_password: b.old_password,
        },
    )
    .await?;
    Ok(ok(&users::get(&s.core, &id).await?))
}

/// Deletes the user and all their data.
#[utoipa::path(delete, path = "/v1/user", tag = "user", security(("bearer" = [])), request_body = UserDeleteInput,
    responses((status = 200, body = Message), (status = 403, body = ErrorBody)))]
pub async fn delete_user(
    State(s): State<AppState>,
    UserId(id): UserId,
    Body(b): Body<UserDeleteInput>,
) -> ApiResult<Response> {
    users::delete(&s.core, &id, &b.password).await?;
    Ok(message("User deleted"))
}

/// Reading list retention settings.
#[utoipa::path(get, path = "/v1/settings", tag = "settings", security(("bearer" = [])),
    responses((status = 200, body = SettingsView), (status = 404, body = ErrorBody)))]
pub async fn get_settings(State(s): State<AppState>, UserId(id): UserId) -> ApiResult<Response> {
    Ok(ok(&settings::get(&s.core, &id).await?))
}

#[utoipa::path(put, path = "/v1/settings", tag = "settings", security(("bearer" = [])), request_body = SettingsUpdateInput,
    responses((status = 200, body = SettingsView), (status = 400, body = ErrorBody), (status = 404, body = ErrorBody)))]
pub async fn update_settings(
    State(s): State<AppState>,
    UserId(id): UserId,
    Body(b): Body<SettingsUpdateInput>,
) -> ApiResult<Response> {
    settings::update(&s.core, &id, b.exp_time_read, b.exp_time_unread).await?;
    Ok(ok(&settings::get(&s.core, &id).await?))
}

// ---- feeds ----------------------------------------------------------------------------------

/// Feeds the user follows.
#[utoipa::path(get, path = "/v1/feeds", tag = "feeds", security(("bearer" = [])), responses((status = 200, body = Vec<FeedView>)))]
pub async fn list_feeds(State(s): State<AppState>, UserId(id): UserId) -> ApiResult<Response> {
    Ok(ok(&feeds::followed(&s.core, &id).await?))
}

/// Follows a feed (or a website that links to one).
#[utoipa::path(post, path = "/v1/feeds", tag = "feeds", security(("bearer" = [])), request_body = FeedCreateInput,
    responses((status = 200, body = FeedView), (status = 400, body = ErrorBody)))]
pub async fn follow_feed(
    State(s): State<AppState>,
    UserId(id): UserId,
    Body(b): Body<FeedCreateInput>,
) -> ApiResult<Response> {
    let feed = ingest::follow(&s.core, &id, &b.url, b.open_in_app.unwrap_or(true)).await?;
    Ok(ok(&feeds::info(&s.core, &id, &feed.id).await?))
}

/// All followed feeds as OPML 2.0.
#[utoipa::path(get, path = "/v1/feeds/export", tag = "feeds", security(("bearer" = [])),
    responses((status = 200, content_type = "text/x-opml", body = String)))]
pub async fn export_feeds(State(s): State<AppState>, UserId(id): UserId) -> ApiResult<Response> {
    let xml = feeds::export_opml(&s.core, &id).await?;
    let mut r = (StatusCode::OK, xml).into_response();
    r.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/x-opml; charset=utf-8"),
    );
    r.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=\"feeds.opml\""),
    );
    Ok(r)
}

/// Imports an OPML document (`text/xml`, `application/xml` or `text/x-opml`, max 5 MB). Feed metadata is refreshed in the background.
#[utoipa::path(post, path = "/v1/feeds/import", tag = "feeds", security(("bearer" = [])), request_body(content = String, content_type = "text/x-opml"),
    responses((status = 200, body = ingest::ImportResult), (status = 400, body = ErrorBody), (status = 413, body = ErrorBody)))]
pub async fn import_feeds(
    State(s): State<AppState>,
    UserId(id): UserId,
    OpmlText(xml): OpmlText,
) -> ApiResult<Response> {
    if xml.trim().is_empty() {
        return Err(Error::bad_request("Request body must be an OPML document").into());
    }
    Ok(ok(&ingest::import_opml(&s.core, &id, &xml).await?))
}

#[utoipa::path(get, path = "/v1/feeds/{feedId}", tag = "feeds", security(("bearer" = [])), params(("feedId" = String, Path, description = "Feed id")),
    responses((status = 200, body = FeedView), (status = 404, body = ErrorBody)))]
pub async fn get_feed(
    State(s): State<AppState>,
    UserId(id): UserId,
    Path(feed_id): Path<String>,
) -> ApiResult<Response> {
    check_id(&feed_id)?;
    Ok(ok(&feeds::info(&s.core, &id, &feed_id).await?))
}

#[utoipa::path(put, path = "/v1/feeds/{feedId}", tag = "feeds", security(("bearer" = [])), params(("feedId" = String, Path, description = "Feed id")),
    request_body = FeedUpdateInput, responses((status = 200, body = FeedView), (status = 404, body = ErrorBody)))]
pub async fn update_feed(
    State(s): State<AppState>,
    UserId(id): UserId,
    Path(feed_id): Path<String>,
    Body(b): Body<FeedUpdateInput>,
) -> ApiResult<Response> {
    check_id(&feed_id)?;
    feeds::update(&s.core, &id, &feed_id, b.open_in_app).await?;
    Ok(ok(&feeds::info(&s.core, &id, &feed_id).await?))
}

#[utoipa::path(delete, path = "/v1/feeds/{feedId}", tag = "feeds", security(("bearer" = [])), params(("feedId" = String, Path, description = "Feed id")),
    responses((status = 200, body = Message), (status = 400, body = ErrorBody)))]
pub async fn unfollow_feed(
    State(s): State<AppState>,
    UserId(id): UserId,
    Path(feed_id): Path<String>,
) -> ApiResult<Response> {
    check_id(&feed_id)?;
    feeds::unfollow(&s.core, &id, &feed_id).await?;
    Ok(message("Feed unfollowed"))
}

// ---- articles -------------------------------------------------------------------------------

const DEFAULT_LIMIT: i64 = 50;
const MAX_LIMIT: i64 = 1000;

fn parse_date(field: &str, v: &str, errors: &mut Vec<FieldError>) -> Option<NaiveDate> {
    let shaped = v.len() == 10
        && v.bytes().enumerate().all(|(i, b)| {
            if i == 4 || i == 7 {
                b == b'-'
            } else {
                b.is_ascii_digit()
            }
        });
    match shaped
        .then(|| NaiveDate::parse_from_str(v, "%Y-%m-%d").ok())
        .flatten()
    {
        Some(d) => Some(d),
        None => {
            errors.push(FieldError::new(
                field,
                "must be a date in the format YYYY-MM-DD",
            ));
            None
        }
    }
}

/// Articles the user has not swiped away yet, newest first.
#[utoipa::path(get, path = "/v1/articles", tag = "articles", security(("bearer" = [])),
    params(("limit" = Option<i64>, Query, description = "Maximum number of articles, default 50, max 1000"),
           ("feeds" = Option<Vec<String>>, Query, description = "Feed ids, default: all followed feeds"),
           ("categories" = Option<Vec<String>>, Query, description = "Category ids"),
           ("startDate" = Option<String>, Query, description = "YYYY-MM-DD"),
           ("endDate" = Option<String>, Query, description = "YYYY-MM-DD")),
    responses((status = 200, body = Vec<ArticleListItem>), (status = 400, body = ErrorBody)))]
pub async fn list_articles(
    State(s): State<AppState>,
    UserId(id): UserId,
    q: RawArticlesQuery,
) -> ApiResult<Response> {
    let mut errors = q.errors;
    let limit = match q.limit.as_deref() {
        None => DEFAULT_LIMIT,
        Some(v) => match v.parse::<i64>() {
            Ok(n) if (0..=MAX_LIMIT).contains(&n) => n,
            _ => {
                errors.push(FieldError::new(
                    "limit",
                    format!("must be a whole number between 0 and {MAX_LIMIT}"),
                ));
                0
            }
        },
    };
    let start_date = q
        .start_date
        .as_deref()
        .and_then(|v| parse_date("startDate", v, &mut errors));
    let end_date = q
        .end_date
        .as_deref()
        .and_then(|v| parse_date("endDate", v, &mut errors));
    if !errors.is_empty() {
        return Err(ApiError::validation(errors));
    }
    let query = ArticleQuery {
        limit,
        feeds: q.feeds,
        categories: q.categories.unwrap_or_default(),
        start_date,
        end_date,
    };
    Ok(ok(&articles::list(&s.core, &id, query).await?))
}

/// Stored content of several articles, without fetching anything.
#[utoipa::path(post, path = "/v1/articles/content", tag = "articles", security(("bearer" = [])), request_body = ContentBatchInput,
    responses((status = 200, description = "Object mapping each id to its content or null", body = serde_json::Value), (status = 400, body = ErrorBody)))]
pub async fn content_batch(
    State(s): State<AppState>,
    Body(b): Body<ContentBatchInput>,
) -> ApiResult<Response> {
    Ok(ok(&content::batch(&s.core, &b.ids).await?))
}

/// `GET/PUT /articles/content` have no meaning, but the old API read "content" as an article id and answered 400.
pub async fn content_as_id() -> ApiResult<Response> {
    check_id("content")?;
    unreachable_response()
}

fn unreachable_response() -> ApiResult<Response> {
    Err(ApiError::route_not_found())
}

#[utoipa::path(get, path = "/v1/articles/{id}", tag = "articles", security(("bearer" = [])), params(("id" = String, Path, description = "Article id")),
    responses((status = 200, body = ArticleDetail), (status = 404, body = ErrorBody)))]
pub async fn get_article(
    State(s): State<AppState>,
    UserId(user): UserId,
    Path(id): Path<String>,
) -> ApiResult<Response> {
    check_id(&id)?;
    Ok(ok(&articles::detail(&s.core, &user, &id).await?))
}

/// Sets read/seen/starred/saved flags of the article for the user.
#[utoipa::path(put, path = "/v1/articles/{id}", tag = "articles", security(("bearer" = [])), params(("id" = String, Path, description = "Article id")),
    request_body = ArticleUpdateInput, responses((status = 200, body = ArticleDetail), (status = 404, body = ErrorBody)))]
pub async fn update_article(
    State(s): State<AppState>,
    UserId(user): UserId,
    Path(id): Path<String>,
    Body(b): Body<ArticleUpdateInput>,
) -> ApiResult<Response> {
    check_id(&id)?;
    articles::update(
        &s.core,
        &user,
        &id,
        ArticleUpdate {
            read: b.read,
            seen: b.seen,
            starred: b.starred,
            saved: b.saved,
        },
    )
    .await?;
    Ok(ok(&articles::detail(&s.core, &user, &id).await?))
}

/// Readable content of the article; extracted from the publisher's page on first access.
#[utoipa::path(get, path = "/v1/articles/{id}/content", tag = "articles", security(("bearer" = [])), params(("id" = String, Path, description = "Article id")),
    responses((status = 200, body = ContentResponse), (status = 404, body = ErrorBody), (status = 500, description = "Extraction failed", body = ErrorBody)))]
pub async fn article_content(
    State(s): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<Response> {
    check_id(&id)?;
    Ok(ok(&ContentResponse {
        content: content::for_article(&s.core, &id).await?,
    }))
}

// ---- lists ----------------------------------------------------------------------------------

#[utoipa::path(get, path = "/v1/readinglist", tag = "readinglist", security(("bearer" = [])), responses((status = 200, body = Vec<ListedArticle>)))]
pub async fn reading_list(State(s): State<AppState>, UserId(id): UserId) -> ApiResult<Response> {
    Ok(ok(&lists::reading_list(&s.core, &id).await?))
}

/// Removes all (or only the read) articles from the reading list.
#[utoipa::path(delete, path = "/v1/readinglist", tag = "readinglist", security(("bearer" = [])), request_body = ReadingListClearInput,
    responses((status = 200, body = Message), (status = 400, body = ErrorBody)))]
pub async fn clear_reading_list(
    State(s): State<AppState>,
    UserId(id): UserId,
    Body(b): Body<ReadingListClearInput>,
) -> ApiResult<Response> {
    lists::clear_reading_list(&s.core, &id, b.only_read).await?;
    Ok(message("Reading list cleared"))
}

#[utoipa::path(post, path = "/v1/readinglist/articles", tag = "readinglist", security(("bearer" = [])), request_body = ArticleIdInput,
    responses((status = 200, body = Message), (status = 404, body = ErrorBody)))]
pub async fn add_to_reading_list(
    State(s): State<AppState>,
    UserId(id): UserId,
    Body(b): Body<ArticleIdInput>,
) -> ApiResult<Response> {
    lists::add_to_reading_list(&s.core, &id, &b.id).await?;
    Ok(message("Article added to reading list"))
}

#[utoipa::path(delete, path = "/v1/readinglist/articles", tag = "readinglist", security(("bearer" = [])), request_body = ArticleIdInput,
    responses((status = 200, body = Message), (status = 404, body = ErrorBody)))]
pub async fn remove_from_reading_list(
    State(s): State<AppState>,
    UserId(id): UserId,
    Body(b): Body<ArticleIdInput>,
) -> ApiResult<Response> {
    lists::remove_from_reading_list(&s.core, &id, &b.id).await?;
    Ok(message("Article deleted from reading list"))
}

#[utoipa::path(get, path = "/v1/starred", tag = "starred", security(("bearer" = [])), responses((status = 200, body = Vec<ListedArticle>)))]
pub async fn starred(State(s): State<AppState>, UserId(id): UserId) -> ApiResult<Response> {
    Ok(ok(&lists::starred(&s.core, &id).await?))
}

/// Stars the article given in the body (the path segment is ignored; clients use `/starred/articles`). Answers with the new state.
#[utoipa::path(post, path = "/v1/starred/{article}", tag = "starred", security(("bearer" = [])), params(("article" = String, Path, description = "Ignored")),
    request_body = ArticleIdInput, responses((status = 200, body = ArticleDetail), (status = 400, body = ErrorBody)))]
pub async fn star(
    State(s): State<AppState>,
    UserId(id): UserId,
    Path(_article): Path<String>,
    Body(b): Body<ArticleIdInput>,
) -> ApiResult<Response> {
    Ok(ok(&lists::set_starred(&s.core, &id, &b.id, true).await?))
}

#[utoipa::path(delete, path = "/v1/starred/{article}", tag = "starred", security(("bearer" = [])), params(("article" = String, Path, description = "Ignored")),
    request_body = ArticleIdInput, responses((status = 200, body = ArticleDetail), (status = 400, body = ErrorBody)))]
pub async fn unstar(
    State(s): State<AppState>,
    UserId(id): UserId,
    Path(_article): Path<String>,
    Body(b): Body<ArticleIdInput>,
) -> ApiResult<Response> {
    Ok(ok(&lists::set_starred(&s.core, &id, &b.id, false).await?))
}

// ---- misc -----------------------------------------------------------------------------------

#[derive(Serialize, ToSchema)]
pub struct CategoryItem {
    pub id: String,
    pub name: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// Categories, only when `ENABLE_FEED_CLASSIFICATION=true`; otherwise an empty list.
#[utoipa::path(get, path = "/v1/categories", tag = "categories", security(("bearer" = [])), responses((status = 200, body = Vec<CategoryItem>)))]
pub async fn categories(State(s): State<AppState>) -> ApiResult<Response> {
    if !s.core.config.enable_feed_classification {
        return Ok(ok(&Vec::<serde_json::Value>::new()));
    }
    Ok(ok(&rsswipe_core::models::categories::all(&s.core).await?))
}

/// Seen/read/starred/saved per day and read counts per feed for the retention window.
#[utoipa::path(get, path = "/v1/statistics/recent", tag = "statistics", security(("bearer" = [])), responses((status = 200, body = Statistics)))]
pub async fn statistics(State(s): State<AppState>, UserId(id): UserId) -> ApiResult<Response> {
    Ok(ok(&stats::recent(&s.core, &id).await?))
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(versions))
        .routes(routes!(resources))
        .routes(routes!(system))
        .routes(routes!(login))
        .routes(routes!(register))
        .routes(routes!(get_user, update_user, delete_user))
        .routes(routes!(get_settings, update_settings))
        .routes(routes!(list_feeds, follow_feed))
        .routes(routes!(export_feeds))
        .routes(routes!(import_feeds))
        .routes(routes!(get_feed, update_feed, unfollow_feed))
        .routes(routes!(list_articles))
        .routes(routes!(content_batch))
        .routes(routes!(get_article, update_article))
        .routes(routes!(article_content))
        .routes(routes!(reading_list, clear_reading_list))
        .routes(routes!(add_to_reading_list, remove_from_reading_list))
        .routes(routes!(starred))
        .routes(routes!(star, unstar))
        .routes(routes!(categories))
        .routes(routes!(statistics))
}
