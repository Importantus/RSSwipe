# Contract tests

Black-box HTTP tests that define the behaviour of the RSSwipe backend. They run against the TypeScript
reference (`IMPL=ts`) and the Rust implementation (`IMPL=rust`) via a configurable `BASE_URL`.

* `shared/` - behaviour that must be **identical** in both implementations.
* `deviations/` - intentional differences, one test per ID of `docs/rust-migration/API-CHANGES.md`, with the old (ts) and new (rust) expectation.

## Run

```sh
cd tests/contract
pip install -r requirements.txt

# TypeScript reference, built once from the commit before the migration
git worktree add /tmp/rsswipe-ts 213af20 && docker build -t rsswipe-ts:contract /tmp/rsswipe-ts/backend
# Rust
docker build -t rsswipe-rust:contract ../../backend

./run-all.sh        # TS first (Prisma migrations), then Rust migrates the same database; both suites must pass
```

Single runs: `docker compose --profile ts up -d db publisher ts-migrate ts-api` (or `--profile rust`), then
`IMPL=ts BASE_URL=http://localhost:18080 pytest` / `IMPL=rust BASE_URL=http://localhost:18081 pytest`.
The TS and the Rust run must not share one database before `ts-migrate` ran (Prisma refuses a database it did not create).

Tests reuse one database and create their own users and feeds (urls get a unique `?t=` suffix), so they can run repeatedly.
`shared/test_jobs.py` starts the feedParser / garbageCollector containers (`<impl>-feedparser`, `<impl>-gc`) with
`EXTERNAL_CRONJOB=true` like the CronJobs in `rsswipe-deployment`; they deactivate other feeds in the test DB while running.

The environment mirrors production (`mariadb:10.5`, `JWT_EXPIRATION=365d`, `MAX_CONTENT_LENGTH=8000000`, `MAX_FEED_ERROR_COUNT=99`, `EXTERNAL_CRONJOB=true`, UTC).
The fake publisher (`publisher/server.py`) serves RSS/Atom/RDF/ISO-8859-1 feeds, article pages, a PDF, redirects and 404s.

Known parser differences that are deliberately **not** part of the contract: how tolerant the feed parser is with broken XML
(the TS parser accepts a truncated feed), and exact Readability output.
