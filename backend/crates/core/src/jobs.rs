//! The two background jobs. Each can run once (`EXTERNAL_CRONJOB=true`, Kubernetes CronJob) or in a loop.
use crate::ingest::update_feed;
use crate::logger::{FEEDPARSER, GARBAGE_COLLECTOR};
use crate::models::feeds::{FeedRow, FEED_COLS};
use crate::state::Core;
use crate::time::now;
use crate::Result;
use futures_util::StreamExt;
use std::time::{Duration, Instant};
use tokio::sync::watch;

/// One pass over all active feeds.
pub async fn feed_parser_once(core: &Core) -> Result<()> {
    let feeds: Vec<FeedRow> = sqlx::query_as(&format!("SELECT {FEED_COLS} FROM Feed f WHERE f.active = 1")).fetch_all(&core.pool).await?;
    crate::info!(FEEDPARSER, "Updating {} Feeds", feeds.len());
    let max_errors = core.config.max_feed_error_count;
    futures_util::stream::iter(feeds)
        .for_each_concurrent(core.config.feed_parser_concurrency, |feed| async move {
            if feed.error_count as i64 > max_errors {
                crate::warn!(FEEDPARSER, "Skipping feed {} because it has too many errors ({})", feed.title, feed.error_count);
                return;
            }
            update_feed(core, &feed).await;
            crate::info!(FEEDPARSER, "Updated Feed {}", feed.title);
        })
        .await;
    crate::info!(FEEDPARSER, "Updated all feeds");
    Ok(())
}

#[derive(Debug, Default)]
pub struct GcReport {
    pub expired_list_entries: u64,
    pub deleted_articles: u64,
    pub deleted_feeds: u64,
}

/// Reading list expiry, old articles nobody saved or starred, feeds nobody uses. Set based, no per-row round trips.
pub async fn garbage_collect_once(core: &Core) -> Result<GcReport> {
    let n = now();
    let mut report = GcReport::default();

    // entries leave the reading list when they are older than the user's retention (-1 = never)
    report.expired_list_entries = sqlx::query(
        "UPDATE ArticleList al JOIN Settings s ON s.userId = al.userId SET al.saved = 0 \
         WHERE (s.expTimeRead >= 0 AND al.`read` = 1 AND al.dateRead < DATE_SUB(?, INTERVAL s.expTimeRead * 1000 MICROSECOND)) \
            OR (s.expTimeUnread >= 0 AND al.`read` = 0 AND al.dateSaved < DATE_SUB(?, INTERVAL s.expTimeUnread * 1000 MICROSECOND))",
    )
    .bind(n)
    .bind(n)
    .execute(&core.pool)
    .await?
    .rows_affected();
    crate::info!(GARBAGE_COLLECTOR, "Expired articles from the reading list have been cleaned up.");

    let limit = n - chrono::Duration::milliseconds(core.config.max_article_age_ms());
    report.deleted_articles = sqlx::query(
        "DELETE a FROM Article a WHERE (a.publishedAt < ? OR a.createdAt < ?) \
         AND NOT EXISTS (SELECT 1 FROM ArticleList al WHERE al.articleId = a.id AND (al.saved = 1 OR al.starred = 1))",
    )
    .bind(limit)
    .bind(limit)
    .execute(&core.pool)
    .await?
    .rows_affected();
    crate::info!(GARBAGE_COLLECTOR, "Deleted {} old Articles", report.deleted_articles);

    // the grace period keeps feeds that are just being created (row exists, follower not yet linked)
    report.deleted_feeds = sqlx::query(
        "DELETE f FROM Feed f WHERE f.createdAt < ? \
         AND NOT EXISTS (SELECT 1 FROM Article a WHERE a.feedId = f.id) AND NOT EXISTS (SELECT 1 FROM FeedList fl WHERE fl.feedId = f.id)",
    )
    .bind(n - chrono::Duration::minutes(1))
    .execute(&core.pool)
    .await?
    .rows_affected();
    crate::info!(GARBAGE_COLLECTOR, "Deleted {} unused Feeds", report.deleted_feeds);
    Ok(report)
}

/// Runs `job` once, or repeatedly every `interval` (measured from the start of a run) until `shutdown` fires.
pub async fn run_loop<F, Fut>(name: &'static str, external: bool, interval: Duration, mut shutdown: watch::Receiver<bool>, mut job: F) -> Result<()>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<()>>,
{
    loop {
        let started = Instant::now();
        let res = tokio::select! {
            r = job() => r,
            _ = shutdown.changed() => return Ok(()),
        };
        if external {
            return res;
        }
        if let Err(e) = res {
            crate::error!(name, "Job failed: {e}");
        }
        let wait = interval.saturating_sub(started.elapsed());
        tokio::select! {
            _ = tokio::time::sleep(wait) => {}
            _ = shutdown.changed() => return Ok(()),
        }
    }
}
