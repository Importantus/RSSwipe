//! HTTP API of RSSwipe (axum). Routes keep the paths of the TypeScript backend under `/v1`.
mod error;
mod extract;
mod inputs;
mod routes;

use axum::extract::{Request, State};
use axum::http::{StatusCode, Uri};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use error::ApiError;
use extract::UserId;
use rsswipe_core::{auth, Core, Error};
use std::net::SocketAddr;
use std::time::Instant;
use tower::ServiceExt as _;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};
use utoipa_swagger_ui::SwaggerUi;

#[derive(Clone)]
pub struct AppState {
    pub core: Core,
    pub started: Instant,
}

/// Mounts that require a valid token for every path and method beneath them (as in the old app).
const PROTECTED: [&str; 8] = [
    "/v1/user",
    "/v1/settings",
    "/v1/feeds",
    "/v1/articles",
    "/v1/readinglist",
    "/v1/starred",
    "/v1/categories",
    "/v1/statistics",
];

fn is_protected(path: &str) -> bool {
    PROTECTED.iter().any(|p| {
        path == *p
            || path
                .strip_prefix(p)
                .is_some_and(|rest| rest.starts_with('/'))
    })
}

async fn auth_middleware(State(s): State<AppState>, mut req: Request, next: Next) -> Response {
    if is_protected(req.uri().path()) {
        let token = req
            .headers()
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(auth::token_from_header);
        match token.map(|t| auth::verify_token(t, &s.core.config.jwt_secret)) {
            Some(Ok(id)) => {
                req.extensions_mut().insert(UserId(id));
            }
            _ => return ApiError::from(Error::NotAuthorized).into_response(),
        }
    }
    next.run(req).await
}

/// A known path with an unsupported method is a 404 like in the old app (not 405).
async fn method_not_allowed_is_404(req: Request, next: Next) -> Response {
    let res = next.run(req).await;
    if res.status() == StatusCode::METHOD_NOT_ALLOWED {
        ApiError::route_not_found().into_response()
    } else {
        res
    }
}

/// express' cors answers a preflight with 204 and no body (tower-http uses 200).
async fn preflight_is_204(req: Request, next: Next) -> Response {
    let preflight = req.method() == axum::http::Method::OPTIONS
        && req.headers().contains_key(axum::http::header::ORIGIN);
    let res = next.run(req).await;
    if preflight && res.status() == StatusCode::OK {
        let (mut parts, _) = res.into_parts();
        parts.status = StatusCode::NO_CONTENT;
        parts.headers.remove(axum::http::header::CONTENT_LENGTH);
        return Response::from_parts(parts, axum::body::Body::empty());
    }
    res
}

async fn fallback() -> Response {
    ApiError::route_not_found().into_response()
}

struct Security;

impl Modify for Security {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let c = openapi.components.get_or_insert_with(Default::default);
        c.add_security_scheme(
            "bearer",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .bearer_format("JWT")
                    .build(),
            ),
        );
    }
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "RSSwipe",
        description = "RSSwipe is a simple RSS reader that lets you read your newsfeeds in a swipeable interface. \
                       Errors always look like `{\"message\", \"code\", \"errors\"?}`. The authorization header is read as `<scheme> <jwt>`.",
        version = "1.0.0"
    ),
    components(schemas(error::ErrorBody, error::FieldErrorBody)),
    modifiers(&Security)
)]
struct ApiDoc;

pub fn router(core: Core) -> Router {
    let state = AppState {
        core,
        started: Instant::now(),
    };
    let (router, api) = routes::router().split_for_parts();
    let api = {
        let mut doc = ApiDoc::openapi();
        doc.merge(api);
        doc
    };
    router
        .route(
            "/v1/articles/content",
            get(routes::content_as_id).put(routes::content_as_id),
        )
        .merge(SwaggerUi::new("/v1/api-docs").url("/v1/api-docs/openapi.json", api))
        .fallback(fallback)
        .with_state(state.clone())
        .layer(middleware::from_fn(method_not_allowed_is_404))
        .layer(middleware::from_fn_with_state(state, auth_middleware))
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::any())
                .allow_methods(AllowMethods::list([
                    axum::http::Method::GET,
                    axum::http::Method::HEAD,
                    axum::http::Method::PUT,
                    axum::http::Method::PATCH,
                    axum::http::Method::POST,
                    axum::http::Method::DELETE,
                ]))
                .allow_headers(AllowHeaders::mirror_request()),
        )
        .layer(middleware::from_fn(preflight_is_204))
        .layer(CatchPanicLayer::custom(|_| {
            ApiError::from(Error::internal("handler panicked")).into_response()
        }))
}

/// `/v1/user/` is the same as `/v1/user` (express is not strict about trailing slashes). Swagger UI keeps its slash.
fn trim_trailing_slash(mut req: Request) -> Request {
    let path = req.uri().path();
    if path.len() > 1 && path.ends_with('/') && !path.starts_with("/v1/api-docs") {
        let trimmed = path.trim_end_matches('/');
        let trimmed = if trimmed.is_empty() { "/" } else { trimmed };
        let pq = match req.uri().query() {
            Some(q) => format!("{trimmed}?{q}"),
            None => trimmed.to_string(),
        };
        if let Ok(uri) = pq.parse::<Uri>() {
            *req.uri_mut() = uri;
        }
    }
    req
}

/// Serves the API until `shutdown` resolves; in-flight requests are finished first.
pub async fn serve(
    core: Core,
    port: u16,
    shutdown: impl std::future::Future<Output = ()> + Send + 'static,
) -> std::io::Result<()> {
    let app = router(core).map_request(trim_trailing_slash);
    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).await?;
    rsswipe_core::info!(
        rsswipe_core::logger::API,
        "Server started at http://localhost:{port}"
    );
    axum::serve(
        listener,
        axum::ServiceExt::<Request>::into_make_service(app),
    )
    .with_graceful_shutdown(shutdown)
    .await
}
