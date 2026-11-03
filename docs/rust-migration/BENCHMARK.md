# Performance-Vergleich TypeScript ↔ Rust

Gemessen am 2026-11-03, lokal, nach dem Produktions-Rollout. Die Rohdaten und Skripte wurden nach der Messung gelöscht; dieses Dokument enthält die Zahlen und die Methode, damit die Messung wiederholbar ist.

## Aufbau

- **Backends:** Je ein Container mit den Produktionslimits aus `rsswipe-deployment` (0,9 CPU, 2500 MB RAM), `SERVICE_TYPE=api`, übrige Env wie in der ConfigMap. Images `rsswipe-ts:contract` (letzter TS-Stand) und `rsswipe-rust:contract`.
- **Datenbank:** MariaDB 10.5 (wie Produktion), auf eigenen Kernen, `innodb-buffer-pool-size=1G`. Zwei Instanzen mit identischem Datensatz: eine im Prisma-Schema, eine nach `rsswipe migrate` (neue Indizes aus `0002`, breitere Titel aus `0003`).
- **Lastgenerator:** `wrk` (4 Threads, `--latency`) auf eigenen Kernen, Backends und DB auf anderen Kernen.
- **Daten:** 200 Feeds, 200 000 Artikel (veröffentlicht gleichverteilt über 7 Tage), eine Testperson folgt 50 Feeds (50 000 sichtbare Artikel) und hat rund 2 000 Einträge in `ArticleList`.
- **Varianten:** `ts-a` = TS auf dem Prisma-Schema (Stand vor dem Update), `ts-b` = TS auf dem migrierten Schema (isoliert den Effekt der Indizes), `rust-b` = Rust auf dem migrierten Schema.
- **Ablauf:** Pro Endpunkt 5 s Warm-up je Variante, danach 5 Läufe à 15 s. Die Reihenfolge der Varianten rotierte pro Lauf, um Drift auszugleichen. Ausgewertet wird der Median. Alle Varianten lieferten bei allen Endpunkten gleich große Antworten, es gab keine Nicht-2xx-Antworten.

## Ergebnisse (Median aus 5 Läufen)

| Endpunkt (Verbindungen) | Variante | Req/s | p50 | p99 | Speicher (Spitze) |
|---|---|---:|---:|---:|---:|
| `GET /` (64) | ts-a | 12 071 | 4,9 ms | 14,2 ms | 219 MB |
| | ts-b | 11 845 | 5,1 ms | 14,8 ms | 197 MB |
| | rust-b | 39 581 | 1,6 ms | 2,8 ms | 11 MB |
| `GET /v1/feeds` (32) | ts-a | 422 | 85,8 ms | 125,8 ms | 381 MB |
| | ts-b | 427 | 85,4 ms | 119,8 ms | 346 MB |
| | rust-b | 4 277 | 7,3 ms | 10,2 ms | 13 MB |
| `GET /v1/statistics/recent` (16) | ts-a | 14 | 1 110 ms | 1 360 ms | 451 MB |
| | ts-b | 14 | 1 110 ms | 1 520 ms | 449 MB |
| | rust-b | 298 | 53,4 ms | 66,8 ms | 20 MB |
| `PUT /v1/articles/:id` (32) | ts-a | 343 | 95,5 ms | 194 ms | 399 MB |
| | ts-b | 357 | 92,5 ms | 177 ms | 422 MB |
| | rust-b | 1 476 | 21,5 ms | 28,9 ms | 18 MB |
| `GET /v1/articles?limit=50` (2) | ts-a | 1,7 | 1 080 ms | 1 130 ms | 400 MB |
| | ts-b | 1,9 | 1 050 ms | 1 110 ms | 242 MB |
| | rust-b | 1,7 | 1 070 ms | 1 140 ms | 18 MB |
| `POST /v1/login` (4) | ts-a | 11,5 | 314 ms | 400 ms | 399 MB |
| | ts-b | 11,5 | 314 ms | 401 ms | 246 MB |
| | rust-b | 10,4 | 396 ms | 486 ms | 18 MB |

Weitere Messwerte:

| | TS | Rust |
|---|---:|---:|
| Kaltstart bis erste Antwort auf `GET /` (inkl. `docker start`, 3 Läufe) | 1,9–2,1 s | 0,24 s |
| Speicher im Leerlauf | 166 MB | 2,9 MB |
| Image-Größe | 731 MB | 162 MB |

## Einordnung

- **Latenz und Speicher** sind der große Gewinn: `feeds` rund 12-mal, `statistics` rund 21-mal, Schreibzugriffe rund 4-mal schnellere Antworten; der Speicherbedarf sinkt um den Faktor 15 bis 50.
- **`GET /`:** Der Wert für Rust ist eine Untergrenze, der Lastgenerator hat das Backend nicht ausgelastet (rund 60 % der CPU-Quote).
- **`GET /v1/articles`** ist bei allen Varianten gleich: rund 1 s pro Anfrage bei rund 190 % DB-CPU. Der Engpass ist die SQL-Abfrage (Join und Sortierung über rund 50 000 Artikel), nicht das Backend. Offener Optimierungspunkt, unabhängig von der Sprache.
- **Neue Indizes (`ts-a` ↔ `ts-b`)** bringen auf diesem Datensatz keinen messbaren Unterschied.
- **Login** ist bei Rust rund 10 % langsamer. Beide Seiten sind durch bcrypt (Kosten 10) CPU-gebunden; die Rust-Implementierung ist hier etwas langsamer als die native in Node. Im Alltag unerheblich.

## Grenzen

- Eine Maschine, andere Container liefen nebenher; die Streuung der Läufe lag meist bei 1–5 %, bei `PUT` (Rust) bei rund 30 %, bei `statistics` (Rust) bei rund 12 %.
- Synthetische Daten und Einzelendpunkt-Tests mit einer Testperson, kein Mischverkehr.
- Die erste Runde für `articles` (8 Verbindungen) und `login` (16) war überlastet (Timeouts) und wurde mit 2 bzw. 4 Verbindungen wiederholt; nur die Wiederholung steht oben.

## Wiederholen

Der Aufbau ist mit `docker compose` (zwei MariaDB-Instanzen, drei Backend-Container mit `cpus: 0.9`, `mem_limit: 2500m`), einem SQL-Seed mit `seq_1_to_N` (MariaDB-Sequence-Engine) und `wrk` schnell nachgebaut. TS-Image und Rust-Image werden wie in `tests/contract/README.md` beschrieben gebaut.
