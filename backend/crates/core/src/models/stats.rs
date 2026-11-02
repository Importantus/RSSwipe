use crate::state::Core;
use crate::time::{now, ts};
use crate::Result;
use chrono::{DateTime, Duration, NaiveDate, Utc};
use serde::Serialize;
use sqlx::Row;
use std::collections::HashMap;

#[derive(Serialize, Debug)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct DayStats {
    #[serde(serialize_with = "ts")]
    pub date: DateTime<Utc>,
    pub seen: i64,
    pub read: i64,
    pub starred: i64,
    pub saved: i64,
}

#[derive(Serialize, Debug)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct FeedStats {
    #[serde(rename = "feedId")]
    pub feed_id: String,
    #[serde(rename = "faviconUrl")]
    pub favicon_url: Option<String>,
    pub title: String,
    pub read: i64,
}

#[derive(Serialize, Debug)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct Statistics {
    #[serde(rename = "dateSince", serialize_with = "ts")]
    pub date_since: DateTime<Utc>,
    #[serde(rename = "totalSeen")]
    pub total_seen: i64,
    #[serde(rename = "totalRead")]
    pub total_read: i64,
    #[serde(rename = "totalStarred")]
    pub total_starred: i64,
    #[serde(rename = "totalSaved")]
    pub total_saved: i64,
    pub days: Vec<DayStats>,
    pub feeds: Vec<FeedStats>,
}

/// Activity of the last `TIME_TO_DELETE_OLD_ARTICLES` ms, bucketed by UTC calendar day (newest day first).
pub async fn recent(core: &Core, user_id: &str) -> Result<Statistics> {
    let max_age = core.config.max_article_age_ms();
    let n = now();
    let since = n - Duration::milliseconds(max_age);

    let rows = sqlx::query(
        "SELECT a.feedId, al.`read`, al.starred, al.seen, al.saved, al.dateRead, al.dateStar, al.dateSeen, al.dateSaved \
         FROM ArticleList al JOIN Article a ON a.id = al.articleId WHERE al.userId = ? AND a.publishedAt >= ?",
    )
    .bind(user_id)
    .bind(since)
    .fetch_all(&core.pool)
    .await?;

    const DAY_MS: i64 = 24 * 60 * 60 * 1000;
    let mut days: Vec<DayStats> = Vec::new();
    let mut i = 0;
    while i * DAY_MS < max_age {
        days.push(DayStats { date: n - Duration::milliseconds(i * DAY_MS), seen: 0, read: 0, starred: 0, saved: 0 });
        i += 1;
    }
    let index: HashMap<NaiveDate, usize> = days.iter().enumerate().map(|(i, d)| (d.date.date_naive(), i)).collect();

    let feed_rows = sqlx::query("SELECT fl.feedId, f.faviconUrl, f.title FROM FeedList fl JOIN Feed f ON f.id = fl.feedId WHERE fl.userId = ? ORDER BY fl.feedId")
        .bind(user_id)
        .fetch_all(&core.pool)
        .await?;
    let mut feeds: Vec<FeedStats> = feed_rows
        .iter()
        .map(|r| Ok(FeedStats { feed_id: r.try_get("feedId")?, favicon_url: r.try_get("faviconUrl")?, title: r.try_get("title")?, read: 0 }))
        .collect::<Result<_>>()?;

    for r in &rows {
        for (flag, date, apply) in [
            ("seen", "dateSeen", (|d: &mut DayStats| d.seen += 1) as fn(&mut DayStats)),
            ("read", "dateRead", |d| d.read += 1),
            ("starred", "dateStar", |d| d.starred += 1),
            ("saved", "dateSaved", |d| d.saved += 1),
        ] {
            let on: bool = r.try_get(flag)?;
            let when: Option<DateTime<Utc>> = r.try_get(date)?;
            if let (true, Some(when)) = (on, when) {
                if let Some(i) = index.get(&when.date_naive()) {
                    apply(&mut days[*i]);
                }
            }
        }
        let read: bool = r.try_get("read")?;
        if read {
            let feed_id: String = r.try_get("feedId")?;
            if let Some(f) = feeds.iter_mut().find(|f| f.feed_id == feed_id) {
                f.read += 1;
            }
        }
    }
    Ok(Statistics {
        date_since: since,
        total_seen: days.iter().map(|d| d.seen).sum(),
        total_read: days.iter().map(|d| d.read).sum(),
        total_starred: days.iter().map(|d| d.starred).sum(),
        total_saved: days.iter().map(|d| d.saved).sum(),
        days,
        feeds,
    })
}
