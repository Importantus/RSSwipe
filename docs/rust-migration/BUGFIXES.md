# Behobene Fehler

Fehler des TypeScript-Backends, die bei der Migration korrigiert wurden. Was davon Clients betrifft, steht zusätzlich mit ID in `API-CHANGES.md`; dort sind auch die Contract-Tests (`tests/contract/deviations/`) benannt, die Alt- und Neuverhalten festhalten.

| # | Was war falsch | Wie ist es jetzt | Stelle (TS) | Außenwirkung |
|---|---|---|---|---|
| B1 | Categorizer: bei einem Fehler `continue` ohne Fortschritt, derselbe Artikel wird endlos neu versucht | Der Categorizer ist entfernt (Klassifikation wird nicht mehr benötigt) | `jobs/categorizer.ts` | nein |
| B2 | `SERVICE_TYPE=all` + `EXTERNAL_CRONJOB=true`: `process.exit(0)` nach dem ersten Feed-Lauf beendete auch die API | Jobs laufen einmal, die API läuft weiter | `jobs/feedparser.ts` | nein (Fehlkonfiguration) |
| B3 | `updateStarredArticle` wartete nicht auf `updateArticle`; Antwort zeigte den alten Zustand, Fehler wurden zu unhandled rejections | Update wird abgewartet, Antwort zeigt den neuen Zustand | `models/starred.ts` | **S1** |
| B4 | `POST /feeds` validierte `openInApp`, speicherte es aber nicht | Wird gespeichert | `models/feeds.ts` | **F1** |
| B5 | Längenprüfung für Favicon-URLs war wirkungslos (`!favicon && …`); zu lange URLs ließen das Feed-Update scheitern | URLs über 1000 Zeichen (Spaltenbreite) werden verworfen, das Feed-Update läuft weiter | `jobs/feedparser.ts` | nein |
| B6 | Fehler der Body-Parser (kaputtes JSON, zu groß) wurden zu HTTP 500 | 400 `invalid_json` bzw. 413 `payload_too_large` | `middleware.ts` | **E6, E7** |
| B8 | `GET /articles` ohne/mit ungültigem `limit` → 500 mit Prisma-Text | Default 50, ungültig → 400 | `models/articles.ts` | **A2** |
| B9 | Statistik ordnete Ereignisse über den Tag *im Monat* in der Zeitzone des Prozesses zu | UTC-Kalendertag | `models/statistics.ts` | **ST1** |
| B10 | Gefundene Feed-URL aus `<link rel=alternate>` wurde unaufgelöst (relativ) verwendet | wird gegen die Seiten-URL aufgelöst | `models/feeds.ts` | **F2** |
| B12 | Garbage-Collector konnte einen gerade angelegten Feed löschen, bevor der Follower verknüpft war | Feeds jünger als 1 Minute werden nicht gelöscht; `unfollow` ist eine Transaktion | `jobs/garbageCollector.ts`, `models/feeds.ts` | nein |
| B14 | `openapi.json` stimmte nicht mit den Routen überein (`/feeds/{id}`, `/starred/articles`, fehlende Export/Import-Routen) | Spezifikation wird aus den Handlern generiert | `openapi.json` | **D1** |
| B15 | Verwies eine Seite auf einen bereits bekannten Feed, scheiterte `POST /feeds` mit „Invalid feed url“ (Unique-Verletzung) | der bestehende Feed wird wiederverwendet | `models/feeds.ts` | **F4** |
| B16 | Feed-Beschreibung endete auf `" - "`, wenn der Feed selbst keine hatte | kein Trennzeichen ohne zweiten Teil | `jobs/feedparser.ts` | **F3** |
| B17 | Nicht existierende Kalendertage (`2023-02-31`) wurden als Datumsfilter akzeptiert; Kommazahlen in den Einstellungen wurden still gekürzt | 400 | `models/articles.ts`, `validators/settings.ts` | **V1, SE1** |
| B18 | Titel über 191 Zeichen (Prisma-Default `VARCHAR(191)`) ließen das Anlegen des Artikels/Feeds still scheitern | Spalten auf `VARCHAR(1000)` (Migration `0003`), Titel werden auf 1000 Zeichen gekürzt | `schema.prisma` | nein |
| B19 | `MAX_IMAGE_URL_LENGTH` hatte den Default 10000, die Spalte fasst 1000; längere Bild-URLs verhinderten den Artikel | wirksame Obergrenze ist 1000 | `helper/environment.ts` | nein |
| B20 | `newArticles`/Duplikatprüfung lief als Einzelabfrage pro Artikel, GC mit N+1-Abfragen, Statistik O(Tage × Artikel) | mengenbasierte Abfragen, Indizes (Migration `0002`) | `jobs/*`, `models/statistics.ts` | nein |
| B21 | `readinglist.ts` und `starred.ts` legten je einen eigenen `PrismaClient` (eigene Pools) an | ein gemeinsamer Pool je Prozess | `models/readinglist.ts`, `models/starred.ts` | nein |

## Bewusst nicht geändert (kein Fehler im Sinne der Anforderung)
- **B11 (Feeds mit zu vielen Fehlern):** Der Feed-Parser-Job überspringt sie weiterhin. Wer einen solchen Feed erneut folgt, löst aber ein sofortiges Update aus, das bei Erfolg den Fehlerzähler zurücksetzt; das war schon im TS-Backend so. Ich hatte das zunächst als Fehler eingestuft und es dann nach dem Test gegen das Referenzsystem verworfen.
- **B7/B13:** `GET /articles?feeds=…` und `GET /articles/:id/content` sind für jeden angemeldeten User auf alle Feeds/Artikel möglich. Das ist gewollt, damit geteilte Artikel geöffnet werden können.
- Tokens gelöschter User bleiben gültig; die Endpunkte antworten dann mit 404 (keine Existenzprüfung in der Auth-Middleware).
- Die NULL-Semantik der Reading-List-Abfrage (Einträge mit gesetztem Flag, aber ohne Datum, fallen heraus) bleibt bestehen; ein Test hält sie fest (`test_readinglist_sql_null_semantics`).
- Die Antwort des Starred-Endpunkts ignoriert weiterhin den Pfadparameter und liest die ID aus dem Body (Frontend nutzt `/starred/articles`).
