# Phase 2 – Architektur und Plan

Grundlage: `INVENTORY.md` (inkl. Nachtrag Abschnitt 12 mit den Erkenntnissen aus `rsswipe-deployment`).
Status: **Entwurf zur Freigabe.** Am Ende stehen die Punkte, die ich von dir bestätigt haben möchte.

## 0. Ziele und Leitplanken

1. Request/Response-Formate bleiben kompatibel; **bewusste Abweichungen** (Fehlerformat, Bugfixes, entfernte Klassifikation, entfallene Express-Header) sammle ich zentral in `docs/rust-migration/API-CHANGES.md`, sortiert nach Auswirkung auf Clients. Interne Bugfixes ohne Außenwirkung stehen in `BUGFIXES.md`.
2. Daten bleiben erhalten; Schemaänderungen nur als automatische, datenerhaltende, idempotente Migrationen.
3. MariaDB bleibt. Es gibt keinen Grund zum Wechsel.
4. Das Deployment funktioniert nach dem Merge ohne manuelles Eingreifen. Die Außenschnittstelle des Images bleibt (Inventar §12): Default-`CMD` mit `SERVICE_TYPE`, Port 8080, `GET /` als Probe, Image-Name/Tag, Build-Context `./backend`. **Einzige Änderung im `rsswipe-deployment`** (von dir freigegeben): Migrations-Command `npm run migrate:deploy` → `rsswipe migrate`, `NODE_OPTIONS` entfällt. Lokal committet, **nicht gepusht**, bis die App-Änderungen gemergt sind.
5. Kein Parallelbetrieb. Nach dem Merge ersetzt Rust das TS-Backend komplett.

## 1. Technologie-Entscheidungen

Alle Crates habe ich auf crates.io als vorhanden geprüft. Konkrete Versionen pinne ich beim Anlegen des Workspace.

| Bereich | Wahl | Begründung / Abweichung von deinem Vorschlag |
|---|---|---|
| Runtime / Web | `tokio`, `axum` 0.8, `tower`, `tower-http` (CORS, Tracing, Body-Limit, `NormalizePath`) | wie vorgeschlagen |
| DB | `sqlx` (MySQL-Treiber, läuft gegen MariaDB), Macros `query!`/`query_as!` mit committetem `.sqlx/`-Cache (`SQLX_OFFLINE=true` im Docker-Build). Dynamische Abfragen (`GET /articles` mit optionalen Filtern) per `QueryBuilder` | wie vorgeschlagen. Compile-Time-Prüfung gilt nur für statische Queries; die dynamische ist durch Contract-Tests abgedeckt |
| Migrationen | `sqlx::migrate!` im Binary, Tabelle `_sqlx_migrations`; Prisma-Tabelle bleibt unangetastet (§3) | |
| JSON | `serde`/`serde_json`; Datumsformat `YYYY-MM-DDTHH:MM:SS.mmmZ` über ein eigenes Serde-Modul; `null` bleibt `null` (kein `skip_serializing_if` bei Nullable-Feldern) | |
| Validierung | **`garde`** + eigene Typen, mit Fehlern pro Feld | liefert strukturierte Fehler statt superstruct-Strings, passt zum neuen Fehlerformat (§4) |
| Fehler | `thiserror`; zentraler `ApiError` mit `IntoResponse` | |
| Konfiguration | Env, **gleiche Namen, gleiche Defaults**, gleiche „leerer String = nicht gesetzt"-Regel; Fehlen von `JWT_SECRET`/`DATABASE_URL` bricht mit klarer Meldung ab. `NODE_OPTIONS` und andere unbekannte Variablen werden ignoriert | |
| Logging | `tracing` + eigener Formatter, der das bisherige Format `[<ISO-Zeit> \| <SCOPE>] <Nachricht>` erzeugt (Scopes `API`, `FEEDPARSER`, `GARBAGE_COLLECTOR`, `REQUESTS`); zusätzlich Request-Logs (neu) | gleiches Format, falls es jemand per Grep auswertet |
| Auth | `jsonwebtoken` (HS256; akzeptiert HS256/384/512 wie bisher, `exp` Pflicht-Prüfung), `bcrypt` (liest `$2a$/$2b$/$2y$`, schreibt `$2b$`, Cost 10; Passwort vorher auf 72 Bytes kürzen wie `node-bcrypt`). `JWT_EXPIRATION` wird im `ms`-Format geparst (`365d`, `12h`, Zahl = ms) | bestehende Tokens und Hashes bleiben gültig. Mit Fixtures aus der TS-Version abgesichert |
| HTTP-Client | `reqwest` (rustls), Timeout 20 s, Größenlimit `MAX_CONTENT_LENGTH`, dieselben festen User-Agent- und Cookie-Header, Zeichensatz via `encoding_rs` | ersetzt axios + iconv |
| Feed-Parsing | `feed-rs` | ersetzt `feedparser`; kleine Feld-Abweichungen akzeptiert |
| HTML / Readability | `scraper` (CSS-Selektoren), `ammonia` (Sanitizing), `dom_smoothie` (Readability.js-Port) | ersetzt jsdom/DOMPurify/@mozilla/readability. Risiko R1, früh per Spike abgesichert (§6, Schritt 3) |
| OpenAPI | **`utoipa` + `utoipa-axum` + `utoipa-swagger-ui`**: Spezifikation entsteht aus den Handlern und Typen, Swagger UI unter `/v1/api-docs`, JSON unter `/v1/api-docs/openapi.json` | dein Wunsch. `openapi.json` wird gelöscht. Ein Contract-Test prüft, dass jede registrierte Route in der Spec steht |
| OPML | `quick-xml` (Parser) und eigener Writer | ersetzt fast-xml-parser |
| Tests | `cargo test` (Unit + Integrationstests mit Test-DB), plus die sprachunabhängige Contract-Suite (§5) | |

**Entfällt komplett:** Klassifikation (`natural`, Trainingsdaten, Categorizer-Job, `SERVICE_TYPE=categorizer`, `ENABLE_FEED_CLASSIFICATION`). Details in §4.

## 2. Struktur: Workspace, ein Binary, ein Image

Entscheidung: **Cargo-Workspace mit mehreren Library-Crates und genau einem Binary `rsswipe`; ein Docker-Image.** Das Binary wählt seinen Modus wie heute über `SERVICE_TYPE`.

Begründung: Deine drei Workloads (`api`, `feedParser`, `garbageCollector`) nutzen dasselbe Image und unterscheiden sich nur durch die Env-Variable. Mehrere Binaries bräuchten mehrere Images oder neue `command`s im Deployment, und das widerspräche der Vorgabe „Infrastruktur unverändert". Die Crate-Trennung bringt trotzdem klare Grenzen und schnellere Builds.

```
backend/
├── Cargo.toml                 # [workspace]
├── Dockerfile                 # gleicher Pfad, gleicher Build-Context
├── .sqlx/                     # sqlx offline cache
├── migrations/                # 0001_baseline.sql, 0002_…
├── crates/
│   ├── core/    (rsswipe-core)   # Config, DB-Pool, Migrationen, Domain/Repositories, ApiError-Typen, Auth-Helfer, Logger
│   ├── fetch/   (rsswipe-fetch)  # HTTP-Client, Feed-Parsing, HTML/Readability, OPML (ohne DB)
│   ├── api/     (rsswipe-api)    # axum-Router, Handler, Extractor, OpenAPI
│   ├── jobs/    (rsswipe-jobs)   # Feed-Parser, Garbage-Collector
│   └── bin/     (rsswipe)        # main(): Modus-Auswahl, Signale, Graceful Shutdown
└── tests/                     # Rust-Integrationstests
tests/contract/                # Contract-Suite (§5), im Repo-Root
```

Aufrufschnittstelle des Binaries:

| Aufruf | Verhalten |
|---|---|
| `rsswipe` (kein Argument) | liest `SERVICE_TYPE` (Default `all`) wie bisher |
| `SERVICE_TYPE=api` | nur HTTP-API auf `BACKEND_PORT` (Default 8080) |
| `SERVICE_TYPE=feedParser` | Feed-Parser; mit `EXTERNAL_CRONJOB=true` genau ein Durchlauf, dann **Exit 0** (bei Fehler Exit ≠ 0); ohne: Schleife im Intervall `FEED_UPDATE_INTERVAL` |
| `SERVICE_TYPE=garbageCollector` | analog, Intervall `GARBAGE_COLLECTOR_INTERVAL` |
| `SERVICE_TYPE=all` | API + beide Job-Schleifen. Mit `EXTERNAL_CRONJOB=true` laufen die Jobs einmal und die **API bleibt oben** (behebt B2) |
| `SERVICE_TYPE=categorizer` | Exit mit klarer Meldung „entfernt" (Exit 1). Nicht deployt, daher unkritisch |
| unbekannter Wert | Exit 1 mit Fehlermeldung (heute: stilles Beenden) |
| `rsswipe migrate` | wendet ausstehende Migrationen an (§3) und beendet sich |

Die Subcommand-Form (`rsswipe serve|feed-parser|garbage-collector|migrate`) kommt zusätzlich, ist aber für das Deployment nicht nötig.

## 3. Datenbankstrategie

### 3.1 Baseline ohne Re-Execution
- `migrations/0001_baseline.sql` enthält das **Endschema** (nicht den Replay der 19 Prisma-Migrationen), geschrieben als `CREATE TABLE IF NOT EXISTS` mit **inline** definierten Constraints/Indizes, Namen exakt wie bei Prisma (`Feed_link_key`, `FeedList_userId_fkey`, …), Charset `utf8mb4`/`utf8mb4_unicode_ci`.
  - Frische DB: legt alles an.
  - Bestehende Produktions-DB (Prisma-Historie vorhanden): `IF NOT EXISTS` macht jeden Statement zum No-op, nichts wird verändert oder gelöscht. Danach steht `0001` in `_sqlx_migrations`.
- Vor dem Migrator läuft ein **Preflight** in Rust:
  1. Existiert `_prisma_migrations`, müssen alle 19 bekannten Migrationen mit `finished_at IS NOT NULL` und `rolled_back_at IS NULL` drinstehen. Sonst Abbruch mit klarer Meldung (alte Version zuerst ausrollen). Unbekannte Prisma-Migrationen (neuere als 19) → Abbruch.
  2. Schema-Prüfung gegen `information_schema` (Tabellen, Spalten, Typen, Nullbarkeit): weicht die Produktion vom erwarteten Endschema ab, Abbruch statt stilles Weiterlaufen.
- `_prisma_migrations` bleibt **unangetastet** (nur gelesen). Sie wird nicht gelöscht; ein späterer Aufräumschritt wäre eine eigene, bewusste Migration. Rollback auf das alte TS-Image bleibt damit möglich, solange nur additive Migrationen (0002+) gelaufen sind.
- Locking: `sqlx` nutzt `GET_LOCK` (MySQL-Advisory-Lock), parallele Starter warten aufeinander. Die Migrationen sind klein, additive DDL.

### 3.2 Wann Migrationen laufen (entschieden)
- Migrationen laufen **nur** im bisherigen CI-Schritt (Job aus `rsswipe-migration-template`), nicht bei jedem Pod-Start. Der Job führt künftig `rsswipe migrate` aus (Änderung in `rsswipe-deployment/backend/migrate-job.yml`). Das Binary liegt unter `/usr/local/bin/rsswipe` im PATH. Es gibt **keinen** `npm`-Shim.
- `api`/`all`/Jobs migrieren nicht. Sie prüfen beim Start nur, ob das Schema zum Binary passt (letzte Migration in `_sqlx_migrations`), und loggen eine **Warnung**, wenn nicht. Sie brechen nicht ab.
- Docker-Compose-Nutzer (F3): in `docker/docker-compose.yml` kommt ein One-Shot-Service `migrate` (`command: rsswipe migrate`), von dem `backend` abhängt. Das ist eine Repo-interne Änderung und ändert nichts am K8s-Deployment.

### 3.3 Schemaverbesserungen (jeweils eigene, additive Migration; alle datenerhaltend)
| Migration | Inhalt | Effekt nach außen |
|---|---|---|
| `0002_indexes` | Indizes `ArticleList(userId, saved)`, `ArticleList(userId, starred)`, `ArticleList(userId)`-Ersatz, `Article(publishedAt)`, `Article(createdAt)`, `Article(feedId, link(191))`, `Settings(userId)`, `ArticleContent(status)` | keine, nur schneller |
| `0003_wider_titles` | `Article.title` und `Feed.title` von `VARCHAR(191)` auf `VARCHAR(1000)` | lange Titel werden nicht mehr verworfen/lösen keinen Fehler mehr aus |
| `0004_article_image_length` | keine Spaltenänderung; `MAX_IMAGE_URL_LENGTH`-Default-Konflikt wird im Code gelöst (Obergrenze = Spaltenbreite 1000) | Bild-URLs > 1000 werden verworfen statt den Artikel zu verhindern |

Bewusst **nicht** geplant: Unique-Constraint auf `(feedId, link)` (bräuchte Dedupe der Bestandsdaten und ein Hash-Konstrukt wegen des 3072-Byte-Indexlimits). Stattdessen verhindert der Code Duplikate per `INSERT … SELECT … WHERE NOT EXISTS` plus den neuen Index. Ein harter Constraint wäre ein späterer, eigener Schritt.
`Category`/`Article.categoryId` bleiben vorerst bestehen (leere Tabelle in der Produktion zu erwarten); Entfernen wäre eine eigene Migration nach Prüfung, dass die Tabelle leer ist (Frage Q4).

### 3.4 Prüfung (Phase 5)
- `scripts/db-verify.sh`: vor/nach Migration je Tabelle `COUNT(*)` und eine Prüfsumme über alle Zeilen (`MD5(GROUP_CONCAT(… ORDER BY pk))` bzw. `CHECKSUM TABLE`) für alle Alt-Spalten; Ausgabe als Diff.
- Testlauf auf einer DB, die mit den 19 echten Prisma-Migrationen aufgebaut und mit Seed-Daten gefüllt wurde (inkl. Randfällen: lange Titel, NULL-Daten, Sonderzeichen, mehrere Settings je User).
- Zweiter Start: `_sqlx_migrations` unverändert, keine Statements ausgeführt (Idempotenz-Test über Statement-Log oder `information_schema`-Vergleich).
- Test gegen `mariadb:10.5` (Produktionsversion) und `mariadb:10` (Compose).

## 4. Zielverhalten der API (Abweichungen)

Das Antwort-Format der Erfolgsfälle bleibt **gleich**. Folgende Änderungen sind geplant und landen alle in `API-CHANGES.md`:

**Fehlerformat (neu, einheitlich):**
```json
{ "message": "<lesbarer Satz>", "code": "<stabiler_code>", "errors": [ {"field": "email", "message": "…"} ] }
```
`errors` nur bei Validierungsfehlern; `stack` entfällt (nur in `STATUS=development` als `stack` mit Backtrace-Hinweis). `message` bleibt immer vorhanden, damit Clients, die nur `message` anzeigen, weiter funktionieren. Die bisherigen Präfixe (`Bad request: …`, `Internal server error: …`) entfallen; Texte werden auf Englisch und sinnvoll formuliert. Statuscodes bleiben, außer wo unten genannt.

Weitere geplante Abweichungen:
- Kaputtes JSON → **400** `invalid_json` (statt 500), zu großer Body → **413** (statt 500). *(B6)*
- Unerwartete Fehler → 500 `{"message":"Internal server error","code":"internal_error"}` ohne Interna.
- `POST /starred/:article` / `DELETE`: Antwort enthält den **aktualisierten** Zustand (B3). Der Pfadparameter wird weiter ignoriert, `id` kommt aus dem Body (Frontend-Verhalten bleibt). Als Zusatz ist zulässig, dass `:article` statt Body-`id` verwendet wird, falls der Body fehlt (neu, nicht Pflicht).
- `POST /feeds` übernimmt `openInApp` (B4).
- `GET /articles`: `feeds` bleibt **unbeschränkt** (jede Feed-ID abfragbar, bewusst: Artikel, die jemand anderes teilt, sollen öffnbar sein); fehlendes/ungültiges `limit` → klare 400-Meldung bzw. definierter Default (wird in Phase 3 gegen das Ist-Verhalten gemessen und dokumentiert, B8). `limit` wird als Zahl 1–100 validiert.
- `GET /statistics/recent`: Tageszuordnung nach UTC-Kalendertag statt „Tag im Monat" (B9). Struktur gleich, Zahlen bei Zeiträumen ≥ 28 Tage jetzt korrekt.
- `POST /feeds`: gefundene Feed-URL wird gegen die Seiten-URL aufgelöst (B10).
- `GET /articles/:id/content`: Zugriff bleibt für alle angemeldeten User auf jeden Artikel (bewusst, wegen geteilter Artikel).
- **Klassifikation entfernt (nur der Job):** `GET /categories` liefert weiter `[]`, außer `ENABLE_FEED_CLASSIFICATION=true`; dann werden die vorhandenen `Category`-Zeilen ausgegeben. `category` in Artikeln und der Query-Parameter `categories` funktionieren unverändert auf den vorhandenen Daten. Es werden nur keine neuen Kategorien mehr vergeben.
- Express-Header entfallen (`X-Powered-By`, `ETag`/304-Verhalten). Es gibt weiter `Content-Type: application/json`, `Content-Length`, CORS-Header. Pfade sind **case-sensitive**; Trailing Slash bleibt tolerant.
- `OPTIONS`/CORS: `Access-Control-Allow-Origin: *`, Methoden und Header wie bisher.
- `/v1/system`: gleiche Felder und Typen (Intervalle bleiben Strings), `version` aus `Cargo.toml` (`1.0.0`).
- `/v1/api-docs`: Swagger UI mit generierter Spec; zusätzlich `/v1/api-docs/openapi.json`.
- Auth: `Authorization`-Header bleibt tolerant (beliebiges Schema, zweites Token wird als JWT gelesen).

## 5. Contract-Test-Suite (Phase 3)

- **Ort / Sprache:** `tests/contract/`, Python 3 + `pytest` + `httpx`. Sie kennt nur eine `BASE_URL` und optional `IMPL=ts|rust`.
- **Umgebung:** `tests/contract/docker-compose.yml` mit `mariadb:10.5`, dem zu testenden Backend (TS aus `main` bzw. Rust), einem **Fake-Publisher** (kleiner HTTP-Server mit Fixture-Feeds RSS/Atom/RDF, Seiten mit `og:image`/Favicons, ISO-8859-1-Feed, PDF, Timeout, Redirect, zu großer Body) und einem Seed-Skript.
- **Zwei Schichten:**
  1. `shared/`: Verhalten, das identisch bleiben muss (Erfolgsformate, Statuscodes, Auth, Datumsformat, Feldmengen, CORS, Trailing Slash, Pfad-Überlappungen wie `/feeds/export`).
  2. `deviations/`: für jede dokumentierte Abweichung zwei Erwartungen (`IMPL=ts` = Ist, `IMPL=rust` = Soll), je mit ID, die in `API-CHANGES.md` steht. So bleibt sichtbar, was sich ändert, und die Suite ist gegen TS vollständig grün.
- **Abdeckung:** jeder Endpunkt: Erfolg, Validierung, 401 (kein/ungültiges/abgelaufenes Token, Token gelöschter User), 403, 404, 500-Pfade (nicht erreichbarer Feed), Randfälle (leere Listen, `limit`-Varianten, Datumsgrenzen, qs-Arrays, 36-Zeichen-IDs, Doppel-Follow, OPML mit Ordnern/Duplikaten/kaputtem XML, 5-MB-Grenze, Content-Retry-Logik).
- **Job-Tests:** Feed-Parser und GC werden als eigener Prozess mit `SERVICE_TYPE=… EXTERNAL_CRONJOB=true` gestartet; geprüft werden Exit-Code 0, Artikel in der DB, Fehlerzähler, Löschregeln.
- **Token-/Hash-Fixtures:** vom TS-Server ausgestellte JWTs und bcrypt-Hashes werden in die Rust-Läufe übernommen (Beweis der Kompatibilität bestehender Sessions/Passwörter).
- Die Suite wird zuerst grün gegen TS gebracht; dabei messe ich alle **[verifizieren]**-Punkte aus dem Inventar und trage das Ergebnis dort ein.

## 6. Reihenfolge der Umsetzung

1. **Phase 3a:** Test-Infrastruktur (Compose, Fake-Publisher, Seed), TS-Server als Referenz. Messen der **[verifizieren]**-Punkte.
2. **Phase 3b:** Contract-Tests schreiben, bis sie gegen TS grün sind. Commit pro Endpunktgruppe.
3. **Spike** (vor Rust-Endpunkten, klein und isoliert): `feed-rs`, `dom_smoothie`, `ammonia`, `encoding_rs` gegen die Fixtures. Entscheidet über Risiko R1; bei unbrauchbarem Ergebnis frage ich nach, bevor ich weitermache.
4. **Phase 4a:** Workspace, Config, Logger, DB-Pool, Preflight + Baseline-Migration, Binary-Modi, Health (`GET /`), `/v1`, `/v1/system`, CORS, NormalizePath, Fehlertyp, OpenAPI-Gerüst.
5. **Phase 4b:** Auth (login/register, JWT-Middleware, user/settings).
6. **Phase 4c:** Feeds (CRUD, Export, Import) inkl. `fetch`-Crate.
7. **Phase 4d:** Articles, Reading List, Starred, Statistics, Content-Extraktion.
8. **Phase 4e:** Jobs (Feed-Parser, GC) mit Mengenabfragen statt N+1, begrenzte Parallelität (neue optionale Env `FEED_PARSER_CONCURRENCY`, Default 4), Exit-Codes.
9. **Phase 4f:** Graceful Shutdown (SIGTERM/SIGINT: Server leert Requests, Jobs brechen sauber ab), Pool-Limits (neue optionale Env `DB_MAX_CONNECTIONS`, Default 10), `clippy -D warnings`, `fmt`.
10. **Phase 5:** Datenmigration verifizieren (§3.4).
11. **Phase 6:** Dockerfile (Multi-Stage), CI-Parität, Healthcheck-/Start-/Stopp-Prüfung, Aufräumen (TS, Prisma, `node_modules`, `openapi.json`, Klassifikator-Daten), `README`-Anpassung, `docs/rust-migration/README.md`.

Nach jedem Schritt: kleiner Commit; Contract-Tests der jeweiligen Gruppe grün.

## 7. Deployment-Parität (konkrete Dateiliste)

| Datei | Änderung | Warum von außen identisch |
|---|---|---|
| `backend/Dockerfile` | Stage 1 `rust:1-bookworm` (mit `cargo-chef`-Cache, `SQLX_OFFLINE=true`, `--release`, `strip`, LTO), Stage 2 `debian:bookworm-slim` + `ca-certificates`, Non-root-User; Binary `/usr/local/bin/rsswipe`; `ENV TZ=UTC`; `EXPOSE 8080`; `CMD ["/app/rsswipe"]` | gleicher Pfad, gleicher Build-Context, `SERVICE_TYPE` steuert wie bisher, Port 8080, kein `command` im Deployment nötig außer dem Migrations-Job |
| `.github/workflows/build-deploy.yml` | **keine Änderung** | Build-Context `./backend`, Tag `ghcr.io/importantus/rsswipe-backend:main` bleiben |
| `docker/docker-compose.yml` | keine Änderung nötig (Image + Env gleich; Migration jetzt zusätzlich beim API-Start) | |
| `docker-compose.yml` (Root, Dev) | Backend-Service wechselt von `node:20 … npm run dev` auf einen Rust-Dev-Container (`cargo watch`/`cargo run`) | nur Entwickler-Setup, nicht Deployment |
| `backend/package.json`, `package-lock.json`, `tsconfig.json`, `src/`, `prisma/`, `static/`, `openapi.json` | werden in Phase 6 **gelöscht**, sobald alles grün ist. Es bleibt kein `package.json` im Backend | Das Frontend hat sein eigenes `package.json` und bleibt unberührt |
| `README.md` | Local-Setup/Migrationen auf `cargo`/`rsswipe migrate` umgestellt | |
| `rsswipe-deployment/backend/migrate-job.yml` | `command: ["rsswipe","migrate"]`; in `deployment.yml` entfällt `NODE_OPTIONS` | lokal committet, nicht gepusht; wirksam erst zusammen mit dem neuen Image |

Health: `GET /` bleibt (öffentlich, JSON-Liste der Versionen) und genügt für alle drei Probes. Kein `HEALTHCHECK` im Dockerfile (wie heute).

## 8. Risiken

| # | Risiko | Gegenmaßnahme |
|---|---|---|
| R1 | Rust-Ersatz für Readability/Feedparser/Sanitizer liefert andere Ergebnisse | Spike vor Beginn; Fixture-basierte Tests; kleine Abweichungen vereinbart; bestehende `ArticleContent`-Zeilen bleiben unverändert |
| R2 | Prisma-Output-Eigenheiten (Feldreihenfolge, NOT/NULL-Semantik, `take: NaN`) | in Phase 3 gemessen; Reihenfolge der JSON-Keys wird wie bisher beibehalten, wo die Contract-Tests sie erkennen |
| R3 | Migration der Produktions-DB | Preflight, `IF NOT EXISTS`-Baseline, nur additive Migrationen, Prüfskript, Test gegen `mariadb:10.5`; Backup vor dem ersten Rollout empfohlen |
| R4 | Rollback | Alte Image-Version bleibt lauffähig, da `_prisma_migrations` und Altschema unverändert; neue Indizes/breitere Spalten stören Prisma nicht |
| R5 | `Feed_link_key` (UNIQUE auf VARCHAR(1000) utf8mb4) auf MariaDB-Version | wird in Phase 3a mit `mariadb:10.5` per Prisma-Replay geprüft; Baseline wird exakt an das tatsächliche Ergebnis angepasst |
| R6 | Collation-Verhalten (E-Mail case-insensitive, PAD SPACE) | Verbindung mit `utf8mb4`/`utf8mb4_unicode_ci`, Contract-Test für `A@b.de` vs. `a@b.de` |
| R7 | Zeitzonen/DATETIME(3) | Pool-Session `time_zone='+00:00'`; Tests für Daten um Mitternacht |
| R8 | Swagger-UI-Assets werden beim Build heruntergeladen | im Docker-Build Netzzugriff vorhanden (wie bei `npm ci`); alternativ lokales Zip per `SWAGGER_UI_DOWNLOAD_URL` |

## 9. Entscheidungen (von dir bestätigt)

| # | Entscheidung |
|---|---|
| Q1 | Migrations-Command im Deployment auf `rsswipe migrate` ändern, kein npm-Shim |
| Q2 | Keine Migration bei Pod-Start; nur im CI-Migrationsjob. Schema-Mismatch nur als Warnung |
| Q3 | Fehlerformat `{message, code, errors?}` |
| Q4 | Categories bleiben (Endpunkt, Feld, Tabelle); Schalter `ENABLE_FEED_CLASSIFICATION` bleibt wirksam |
| Q5 | Auth-Header tolerant |
| Q6 | Kein Beschränken auf abonnierte Feeds/Artikel (B7/B13 sind gewollt, keine Bugs) |
| Q7 | Kein SSRF-Schutz |
| Q8 | Optionale Env: `DB_MAX_CONNECTIONS` (Override, Default pro Modus: API 10, Jobs 5), `FEED_PARSER_CONCURRENCY` (Default 4) |
| Q9 | Deployment-Änderungen direkt anwenden, aber nichts pushen, bevor die App gemergt ist |

## 10. Abweichungen der Umsetzung vom Plan

| Plan | Umsetzung | Grund |
|---|---|---|
| Crates `core`, `fetch`, `api`, `jobs`, `bin` | `core` (enthält Fetch, HTML, OPML, Ingest, Jobs), `api`, `bin` | weniger Zwischenschichten; die Grenzen sind als Module erhalten |
| `sqlx` mit `query!`-Makros und `.sqlx/`-Cache | `sqlx` mit zur Laufzeit geprüften Abfragen (`query`, `query_as`, `QueryBuilder`) | kein Offline-Cache im Docker-Build nötig, viele Abfragen sind ohnehin dynamisch; abgesichert durch die Contract-Tests und die Migrationsprüfung |
| `garde` für Validierung | serde mit `deny_unknown_fields` + eigene `validate()`-Methoden | exakte Kontrolle über „null ist ein Fehler“, unbekannte Felder und Feldnamen in den Fehlern |
| `tower-http` `NormalizePath` | eigene `map_request`-Funktion | Swagger UI braucht seinen Slash (`/v1/api-docs/`) |
| `GET /articles/:id/content` und `feeds` auf Abos begrenzen | **nicht** begrenzt | Entscheidung Q6: geteilte Artikel müssen öffnbar sein |
| Auto-Migration bei API-Start | nur `rsswipe migrate` | Entscheidung Q2 |
| `npm`-Shim im Image | kein Shim, Migrations-Command im Deployment geändert | Entscheidung Q1 |
| SSRF-Schutz | keiner | Entscheidung Q7 |
| Baseline mit explizitem Index `ArticleList_userId_fkey` | Index entfällt in der Baseline | InnoDB entfernt ihn im Prisma-Pfad, sobald `0002` einen abdeckenden Index anlegt; so ergeben beide Wege dasselbe Schema (vom Migrationstest geprüft) |
