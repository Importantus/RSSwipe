# RSSwipe Backend in Rust

Das Backend (früher TypeScript/Express/Prisma) ist ein Cargo-Workspace in `backend/`. Ein Binary (`rsswipe`), ein Docker-Image.

| Dokument | Inhalt |
|---|---|
| `INVENTORY.md` | Analyse des alten Backends (Endpunkte, Jobs, Schema, Deployment) |
| `PLAN.md` | Architektur und Entscheidungen (inkl. Abschnitt „Abweichungen der Umsetzung“) |
| `API-CHANGES.md` | **Alle** von außen sichtbaren Änderungen, für die Anpassung der Clients |
| `BUGFIXES.md` | Behobene Fehler |
| `BENCHMARK.md` | Performance-Vergleich TypeScript ↔ Rust (Methode und Messwerte) |
| `schema-reference.txt` | `SHOW CREATE TABLE` der Prisma-Datenbank (Grundlage der Baseline-Migration) |

## Aufbau

```
backend/
  Cargo.toml, Cargo.lock
  Dockerfile                 Multi-Stage: rust:1-bookworm -> debian:bookworm-slim (~160 MB), Binary /usr/local/bin/rsswipe
  migrations/                0001_baseline.sql, 0002_indexes.sql, 0003_wider_titles.sql
  crates/core                Config, Logger, DB + Migrationen, Auth, Modelle/Abfragen, Fetch/Feed/HTML/OPML, Ingest, Jobs
  crates/api                 axum-Router, Handler (mit OpenAPI-Annotationen), Extractor, Fehlerformat
  crates/bin                 `rsswipe`: Modus-Auswahl, Signale, Graceful Shutdown
tests/contract/              Black-Box-Tests per HTTP (pytest), laufen gegen TS und Rust
tests/migration/             Datenmigrations-Prüfung (Prisma-DB + Seed -> `rsswipe migrate`)
```

## Build und Tests

```sh
cd backend
cargo build --release
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt --all --check
docker build -t ghcr.io/importantus/rsswipe-backend:main .   # genau wie die CI (Context ./backend)
```

## Services und Start

Wie bisher entscheidet `SERVICE_TYPE` (Default `all`), dasselbe Image bedient alle Kubernetes-Workloads:

| `SERVICE_TYPE` | Verhalten |
|---|---|
| `api` | HTTP-API auf `BACKEND_PORT` (8080) |
| `feedParser` | ein Durchlauf und Exit 0 bei `EXTERNAL_CRONJOB=true`, sonst Schleife im Intervall `FEED_UPDATE_INTERVAL` |
| `garbageCollector` | analog mit `GARBAGE_COLLECTOR_INTERVAL` |
| `all` | API + beide Jobs (bei `EXTERNAL_CRONJOB=true` laufen die Jobs einmal, die API bleibt) |
| `categorizer` | entfernt, Start bricht mit Meldung ab |

Alle Umgebungsvariablen, Namen und Defaults sind unverändert (siehe `INVENTORY.md` §6). Neu und optional: `DB_MAX_CONNECTIONS` (Pool je Prozess, Default API 10 / Jobs 5; ein `connection_limit` in `DATABASE_URL` wird ebenfalls beachtet) und `FEED_PARSER_CONCURRENCY` (Default 4).
SIGTERM/SIGINT beenden den Server nach Abschluss laufender Requests, Jobs brechen sauber ab.

## Migrationen

- Nur der Befehl `rsswipe migrate` wendet Migrationen an (in Kubernetes der Job aus `rsswipe-migration-template`, im Compose der Service `migrate`). Pod-Starts migrieren nicht; ist das Schema veraltet, warnt der Start nur.
- `0001_baseline.sql` ist das Endschema der 19 Prisma-Migrationen, komplett als `IF NOT EXISTS`: auf einer Prisma-Datenbank ändert es nichts, auf einer leeren legt es alles an. Davor prüft ein Preflight, dass alle 19 Prisma-Migrationen angewendet sind und die erwarteten Spalten existieren, sonst Abbruch mit klarer Meldung.
- `_prisma_migrations` wird nicht angefasst; sqlx führt `_sqlx_migrations`. Ein Rollback auf das alte Image bleibt möglich, solange nur additive Migrationen (0002, 0003) liefen.
- Neue Migration: Datei `backend/migrations/NNNN_name.sql`, additiv und wiederholbar halten.
- Prüfung: `tests/migration/run.sh` (Zeilenanzahlen und Prüfsummen je Tabelle vor/nach, Idempotenz, Schemagleichheit mit Neuinstallation, Preflight).

## Contract-Tests

```sh
# einmalig: TypeScript-Referenz bauen (aus dem Stand vor der Migration)
git worktree add /tmp/rsswipe-ts 213af20 && docker build -t rsswipe-ts:contract /tmp/rsswipe-ts/backend
docker build -t rsswipe-rust:contract backend
pip install -r tests/contract/requirements.txt
tests/contract/run-all.sh      # TS-Referenz, danach Rust auf derselben Datenbank; beide müssen grün sein
```
Ergebnis beim Abschluss: je 188 Tests grün (TS und Rust). Details in `tests/contract/README.md`.

## Deployment

Die CI (`.github/workflows/build-deploy.yml`) und die Image-Namen sind unverändert. Im Repo `rsswipe-deployment` ändert sich genau eine Datei-Zeile pro Thema: der Migrations-Command (`rsswipe migrate` statt `npm run migrate:deploy`) und das Entfernen von `NODE_OPTIONS`. **Beides muss zusammen mit dem neuen Image ausgerollt werden** (das neue Image enthält kein `npm` mehr; das alte kein `rsswipe`).
