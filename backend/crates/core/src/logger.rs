//! Logging in the format of the TypeScript backend: `[<ISO time> | <SCOPE>] <message>`.
use std::fmt;
use tracing::field::{Field, Visit};
use tracing::{Event, Subscriber};
use tracing_subscriber::fmt::format::Writer;
use tracing_subscriber::fmt::{FmtContext, FormatEvent, FormatFields};
use tracing_subscriber::registry::LookupSpan;

pub const API: &str = "API";
pub const FEEDPARSER: &str = "FEEDPARSER";
pub const GARBAGE_COLLECTOR: &str = "GARBAGE_COLLECTOR";
pub const REQUESTS: &str = "REQUESTS";

#[derive(Default)]
struct Fields {
    message: String,
    scope: Option<String>,
}

impl Visit for Fields {
    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        match field.name() {
            "message" => self.message = format!("{value:?}"),
            "scope" => self.scope = Some(format!("{value:?}").trim_matches('"').to_string()),
            _ => {}
        }
    }
    fn record_str(&mut self, field: &Field, value: &str) {
        match field.name() {
            "message" => self.message = value.to_string(),
            "scope" => self.scope = Some(value.to_string()),
            _ => {}
        }
    }
}

struct Format;

impl<S, N> FormatEvent<S, N> for Format
where
    S: Subscriber + for<'a> LookupSpan<'a>,
    N: for<'a> FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        _ctx: &FmtContext<'_, S, N>,
        mut w: Writer<'_>,
        event: &Event<'_>,
    ) -> fmt::Result {
        let mut f = Fields::default();
        event.record(&mut f);
        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        match f.scope {
            Some(s) => writeln!(w, "[{now} | {s}] {}", f.message),
            None => writeln!(w, "[{now}] {}", f.message),
        }
    }
}

pub fn init() {
    let level = if std::env::var("STATUS").as_deref() == Ok("development") {
        tracing::Level::DEBUG
    } else {
        tracing::Level::INFO
    };
    let _ = tracing_subscriber::fmt()
        .event_format(Format)
        .with_max_level(level)
        .with_writer(std::io::stdout)
        .try_init();
}

#[macro_export]
macro_rules! info { ($scope:expr, $($arg:tt)*) => { tracing::info!(scope = $scope, $($arg)*) }; }
#[macro_export]
macro_rules! warn { ($scope:expr, $($arg:tt)*) => { tracing::warn!(scope = $scope, $($arg)*) }; }
#[macro_export]
macro_rules! error { ($scope:expr, $($arg:tt)*) => { tracing::error!(scope = $scope, $($arg)*) }; }
