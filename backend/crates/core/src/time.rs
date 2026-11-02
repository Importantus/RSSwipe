//! Timestamps are serialized like JavaScript's `Date#toJSON`: `2024-03-31T14:43:54.123Z`.
use chrono::{DateTime, SecondsFormat, Utc};
use serde::Serializer;

pub fn now() -> DateTime<Utc> {
    // DATETIME(3) stores milliseconds
    let n = Utc::now();
    DateTime::from_timestamp_millis(n.timestamp_millis()).unwrap_or(n)
}

pub fn ts<S: Serializer>(d: &DateTime<Utc>, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&d.to_rfc3339_opts(SecondsFormat::Millis, true))
}

pub fn ts_opt<S: Serializer>(d: &Option<DateTime<Utc>>, s: S) -> Result<S::Ok, S::Error> {
    match d {
        Some(d) => ts(d, s),
        None => s.serialize_none(),
    }
}
