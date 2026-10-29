# API-Änderungen gegenüber dem TypeScript-Backend

Zentrale Liste **aller** von außen sichtbaren Abweichungen. Gedacht für die Anpassung der Clients. Jede Zeile hat eine stabile ID; die Contract-Suite (`tests/contract/deviations/`) prüft Alt- und Neuverhalten pro ID.

Status: **Entwurf aus Phase 2.** Wird während Phase 3/4 mit gemessenen Ist-Werten ergänzt. Interne Fixes ohne Außenwirkung stehen in `BUGFIXES.md`.

Auswirkung: 🔴 Client muss/sollte angepasst werden · 🟡 Verhalten ändert sich, Clients laufen meist weiter · 🟢 kaum bemerkbar

## Fehlerformat

| ID | Ist (TS) | Neu (Rust) | Auswirkung |
|---|---|---|---|
| E1 | `{"message":"Bad request: <superstruct-Text>"}` | `{"message":"<Satz>","code":"validation_error","errors":[{"field","message"}]}` | 🟡 `message` bleibt, Text ändert sich; neue Felder `code`, `errors` |
| E2 | Alle APIErrors nur `{"message"}` | zusätzlich stabiles `code` (`not_authorized`, `forbidden`, `not_found`, `bad_request`, `invalid_json`, `payload_too_large`, `internal_error`, …) | 🟢 |
| E3 | Präfixe `Bad request: `, `Internal server error: ` | entfallen | 🟡 Clients, die auf Präfixe matchen |
| E4 | unerwartete Fehler: `{"message":<interner Text>,"stack":""}` | `{"message":"Internal server error","code":"internal_error"}` | 🟡 |
| E5 | 404 für unbekannte Pfade: `{"message":"Not Found - <url>","stack":""}` | `{"message":"Not found","code":"route_not_found"}` | 🟡 |
| E6 | kaputtes JSON → 500 | 400 `invalid_json` | 🔴 Statuscode |
| E7 | Body > 100 kB → 500 | 413 `payload_too_large` | 🔴 Statuscode |

## Endpunkte

| ID | Endpunkt | Ist | Neu | Auswirkung |
|---|---|---|---|---|
| S1 | `POST/DELETE /v1/starred/:article` | Antwort kann alten Zustand zeigen (Race, B3) | Antwort zeigt neuen Zustand | 🟢 |
| F1 | `POST /v1/feeds` | `openInApp` ignoriert (B4) | wird gespeichert | 🟢 |
| F2 | `POST /v1/feeds` | relative Feed-URL aus `<link rel=alternate>` unverändert gespeichert (B10) | gegen Seiten-URL aufgelöst | 🟢 |
| A2 | `GET /v1/articles` | `limit` fehlt oder ist keine Zahl → **500** mit Prisma-Text; `-1` → 200 `[]` | fehlt → Default 50; keine Ganzzahl ≥ 0 → 400; max. 1000 | 🟡 |
| SE1 | `PUT /v1/settings` | Kommazahlen werden still zu Ganzzahlen gekürzt (`1.5` → `1`) | Nicht-Ganzzahlen → 400 | 🟢 |
| V1 | `GET /v1/articles` (`startDate`/`endDate`) | Nicht existierende Tage wie `2023-02-31` werden akzeptiert (V8-Überlauf) | → 400 | 🟢 |
| F3 | Feed-`description` | Ohne Feed-Beschreibung endet sie auf `" - "` (`Seitenbeschreibung - `) | ohne Trennzeichen | 🟢 |
| F4 | `POST /v1/feeds` | Seite verweist auf bereits bekannten Feed einer anderen Person → 400 `Invalid feed url` (Unique-Verletzung, B15) | bestehender Feed wird wiederverwendet, 200 | 🟡 |
| ST1 | `GET /v1/statistics/recent` | Tageszuordnung über Tag-im-Monat (B9) | UTC-Kalendertag | 🟡 Zahlen bei ≥ 28 Tagen |
| D1 | `GET /v1/api-docs` | statische `openapi.json`, teils veraltet (B14) | aus den Handlern generiert, + `/v1/api-docs/openapi.json` | 🟢 |

## HTTP-Ebene

| ID | Ist | Neu | Auswirkung |
|---|---|---|---|
| H1 | `X-Powered-By: Express` | entfällt | 🟢 |
| H2 | schwaches `ETag` + 304 | entfällt | 🟢 |
| H3 | Pfade case-insensitive | case-sensitive (Trailing Slash bleibt tolerant) | 🟢 |
| H4 | Header `Keep-Alive`/`Connection` Express-Standard | Standard von hyper | 🟢 |

## Unverändert (bewusst)
`GET /articles?feeds=…` und `GET /articles/:id/content` bleiben für jeden angemeldeten User auf alle Feeds/Artikel möglich (geteilte Artikel). Kategorien-Endpunkt, `category`-Feld und `categories`-Filter bleiben (Schalter `ENABLE_FEED_CLASSIFICATION`); nur das automatische Kategorisieren entfällt. Auth-Header bleibt tolerant. Kein SSRF-Schutz.
Routen und Methoden, Auth (JWT HS256, bestehende Tokens und bcrypt-Hashes gültig), Token-Format, CORS (`*`), Datumsformat (ISO-8601 UTC mit Millisekunden), JSON-Feldnamen der Erfolgsantworten, `null`-Verhalten, Env-Variablen (Namen/Defaults), Port 8080, `GET /` als Health-Probe, `/v1/system`-Felder und -Typen.
