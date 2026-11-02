//! `rsswipe` - API, feed parser and garbage collector in one binary.
//!
//! The mode comes from `SERVICE_TYPE` (`all` by default, `api`, `feedParser`, `garbageCollector`) exactly like the
//! TypeScript backend, so the same image serves every Kubernetes workload. `rsswipe migrate` applies database migrations.
use rsswipe_core::config::Config;
use rsswipe_core::jobs::{feed_parser_once, garbage_collect_once, run_loop};
use rsswipe_core::logger::{self, API, FEEDPARSER, GARBAGE_COLLECTOR};
use rsswipe_core::{db, Core};
use std::process::ExitCode;
use std::time::Duration;
use tokio::sync::watch;

const API_POOL: u32 = 10;
const JOB_POOL: u32 = 5;

#[derive(Clone, Copy, PartialEq)]
enum Mode {
    All,
    Api,
    FeedParser,
    GarbageCollector,
    Migrate,
}

fn mode(arg: Option<String>, service_type: &str) -> Result<Mode, String> {
    match arg.as_deref() {
        Some("migrate") => return Ok(Mode::Migrate),
        Some("serve") => return Ok(Mode::Api),
        Some("feed-parser") => return Ok(Mode::FeedParser),
        Some("garbage-collector") => return Ok(Mode::GarbageCollector),
        Some(other) => return Err(format!("Unknown command `{other}`. Use: migrate | serve | feed-parser | garbage-collector (or set SERVICE_TYPE)")),
        None => {}
    }
    match service_type {
        "all" => Ok(Mode::All),
        "api" => Ok(Mode::Api),
        "feedParser" => Ok(Mode::FeedParser),
        "garbageCollector" => Ok(Mode::GarbageCollector),
        "categorizer" => Err("SERVICE_TYPE=categorizer was removed: articles are no longer classified".into()),
        other => Err(format!("Unknown SERVICE_TYPE `{other}`. Use: all | api | feedParser | garbageCollector")),
    }
}

async fn shutdown_signal(tx: watch::Sender<bool>) {
    let ctrl_c = tokio::signal::ctrl_c();
    #[cfg(unix)]
    {
        let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).expect("install SIGTERM handler");
        tokio::select! { _ = ctrl_c => {}, _ = term.recv() => {} }
    }
    #[cfg(not(unix))]
    {
        let _ = ctrl_c.await;
    }
    let _ = tx.send(true);
}

async fn wait(mut rx: watch::Receiver<bool>) {
    let _ = rx.changed().await;
}

#[tokio::main]
async fn main() -> ExitCode {
    logger::init();
    let service_type = std::env::var("SERVICE_TYPE").ok().filter(|v| !v.is_empty()).unwrap_or_else(|| "all".into());
    let mode = match mode(std::env::args().nth(1), &service_type) {
        Ok(m) => m,
        Err(e) => {
            rsswipe_core::error!(API, "{e}");
            return ExitCode::FAILURE;
        }
    };
    match run(mode).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            rsswipe_core::error!(API, "{e}");
            ExitCode::FAILURE
        }
    }
}

async fn run(mode: Mode) -> Result<(), String> {
    let needs_secret = matches!(mode, Mode::All | Mode::Api);
    let config = Config::from_env(false)?;
    if config.database_url.is_empty() {
        return Err("Environment variable DATABASE_URL not found".into());
    }
    if needs_secret && config.jwt_secret.is_empty() {
        return Err("Environment variable JWT_SECRET not found".into());
    }

    let pool_size = if matches!(mode, Mode::Api | Mode::All) { API_POOL } else { JOB_POOL };
    let pool = db::connect(&config, if mode == Mode::Migrate { 2 } else { pool_size }).await.map_err(|e| format!("Could not connect to the database: {e}"))?;

    if mode == Mode::Migrate {
        db::migrate(&pool).await.map_err(|e| e.to_string())?;
        rsswipe_core::info!(API, "Database migrations are up to date");
        return Ok(());
    }
    db::warn_if_outdated(&pool).await;

    let external = config.external_cronjobs;
    let (feed_interval, gc_interval) = (Duration::from_millis(config.feed_interval_ms()), Duration::from_millis(config.gc_interval_ms()));
    let port = config.backend_port;
    let core = Core::new(pool, config).map_err(|e| e.to_string())?;

    let (tx, rx) = watch::channel(false);
    tokio::spawn(shutdown_signal(tx));

    let feed_job = {
        let (core, rx) = (core.clone(), rx.clone());
        async move {
            rsswipe_core::info!(FEEDPARSER, "Initializing Feed Parser with an intervall of {}ms", feed_interval.as_millis());
            run_loop(FEEDPARSER, external, feed_interval, rx, || feed_parser_once(&core)).await
        }
    };
    let gc_job = {
        let (core, rx) = (core.clone(), rx.clone());
        async move {
            rsswipe_core::info!(GARBAGE_COLLECTOR, "Initialising garbage collector with interval of {}ms", gc_interval.as_millis());
            run_loop(GARBAGE_COLLECTOR, external, gc_interval, rx, || async { garbage_collect_once(&core).await.map(|_| ()) }).await
        }
    };
    let api = {
        let (core, rx) = (core.clone(), rx.clone());
        async move { rsswipe_api::serve(core, port, wait(rx)).await.map_err(|e| format!("Server error: {e}")) }
    };

    match mode {
        Mode::FeedParser => feed_job.await.map_err(|e| e.to_string()),
        Mode::GarbageCollector => gc_job.await.map_err(|e| e.to_string()),
        Mode::Api => api.await,
        Mode::All => {
            // with EXTERNAL_CRONJOB the jobs run once; the API keeps serving
            let jobs = async {
                let (a, b) = tokio::join!(feed_job, gc_job);
                a.and(b).map_err(|e| e.to_string())
            };
            let (jobs, api) = tokio::join!(jobs, api);
            jobs.and(api)
        }
        Mode::Migrate => unreachable!("handled above"),
    }
}
