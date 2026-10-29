# Phase 1 – Inventar des TypeScript-Backends

Stand: Branch `rust-rewrite` (abgezweigt von `main`, Commit `213af20`).
Alles hier stammt aus dem Lesen des Codes in `backend/`, `docker*/`, `.github/`, `README.md`.
Aussagen, die ich nur aus dem Code ableite und noch nicht gegen einen laufenden Server geprüft habe, sind mit **[verifizieren]** markiert. Sie werden in Phase 3 über die Contract-Tests gegen die TS-Version geklärt.

> **Wichtigste Abweichung von der Aufgabenstellung:** Es gibt **keine npm scripts, die einzelne Teile starten**. Die Aufteilung in Services läuft ausschließlich über die Umgebungsvariable `SERVICE_TYPE` (siehe Abschnitt 5). Das Dockerfile startet immer `node dist/index.js`. Die eigentliche Service-Verdrahtung (K8s-Deployments, Migrations-CronJob) liegt **nicht in diesem Repo** (siehe offene Fragen).

---

## 1. Überblick

| Aspekt | Ist-Zustand |
|---|---|
| Laufzeit | Node 24 (Docker `node:24-slim`), Express 4.21, TypeScript → `dist/` (CommonJS) |
| DB | MariaDB 10 (`mariadb:10`), Prisma 5.4+, `provider = "mysql"` |
| Einstieg | `backend/src/index.ts` (eine Datei startet API und alle Jobs je nach `SERVICE_TYPE`) |
| Port | `BACKEND_PORT`, Default `8080`; `EXPOSE 8080` |
| Code | ca. 3.600 Zeilen, 11 Router, 8 Models, 3 Jobs |
| Tests | **keine** (kein Test-Framework, keine Testdateien, kein CI-Testschritt) |
| API-Doku | `backend/openapi.json` (OpenAPI 3.0.3), ausgeliefert unter `/v1/api-docs` (Swagger UI) |
| Versionierung | Version `1.0.0` aus `package.json`, wird in `/v1/system` ausgegeben |

Frontend (Vue, nginx) ist nicht Teil der Migration. Es nutzt u. a. `/starred/articles` (POST/DELETE mit `{id}` im Body), `/feeds/export` (Blob), `/feeds/import` (XML-Body), `/articles/content` (POST), `/system`.

---

## 2. Endpunkte

Allgemein, gilt für alle Routen (siehe Abschnitt 3 für Details):
- Basis-Middleware-Kette: `cors()` → `bodyParser.json()` → `bodyParser.urlencoded({extended:true})` → Route.
- „auth" = Middleware `auth` (JWT) wird **vor** dem Router am Mount-Pfad eingehängt, gilt also für **alle** Methoden und Unterpfade des Mounts, auch für nicht existierende (→ 401 statt 404, wenn Token fehlt).
- Fehlerformat: `{"message": "..."}` (APIError) oder bei unerwarteten Fehlern `{"message": <error.message>, "stack": ""}` (`stack` nur bei `STATUS=development` gefüllt).
- Validierungsfehler: `400 {"message":"Bad request: <superstruct-Fehlertext>"}`. Die Fehlertexte stammen von superstruct und gehören damit zum sichtbaren Verhalten (Abschnitt 3.7).
- `uuid` heißt hier: String mit genau 36 Zeichen (kein UUID-Format-Check). Fehler: `400 "Bad request: Invalid id"`.
- Datumsfelder werden als ISO-8601 UTC mit Millisekunden serialisiert (`2024-03-31T14:43:54.000Z`).

### 2.1 Öffentliche Routen (ohne Auth)

| Methode | Pfad | Antwort |
|---|---|---|
| GET | `/` | `200 [{"version":"v1","path":"/v1"}]` |
| GET | `/v1` | `200 [{"path":"/v1/user","name":"user"}, … ]` (Reihenfolge: user, settings, login, register, feeds, articles, readinglist, starred, categories, statistics, system; `api-docs` ist nicht enthalten) |
| GET | `/v1/api-docs`, `/v1/api-docs/*` | Swagger UI (HTML + statische Assets von `swagger-ui-dist`), Spezifikation aus `openapi.json` |
| GET | `/v1/system` | `200 {version:"1.0.0", uptime:<float Sekunden>, status:<STATUS>, feedUpdateInterval:"<string>", garbageCollectionInterval:"<string>", maxArticleAge:"<string>"}`; die drei Intervalle sind **Strings**, weil `process.env` Strings liefert |
| POST | `/v1/login` | Body `{email: string mit "@", password: string 8–100}` → `200 {token}`; **jeder** Fehlschlag (unbekannte Mail, falsches Passwort, bcrypt-Fehler) → `401 {"message":"Not authorized"}`; Validierung → 400 |
| POST | `/v1/register` | Body `{name: 1–30, email, password: 8–100}` → `201 {token, user:{id,name,email,createdAt}}`; Mail existiert → `400 "Bad request: User with this email already exists"`; legt `Settings` mit `expTimeRead = 259200000` (3 Tage) und `expTimeUnread = -1` an |

### 2.2 Geschützte Routen (Header `Authorization: <irgendwas> <jwt>`)

| Methode | Pfad | Body / Query | Erfolg | Fehler |
|---|---|---|---|---|
| GET | `/v1/user` | – | `200 {id,name,email,createdAt}` | 404 wenn User nicht (mehr) existiert |
| PUT | `/v1/user` | `{name?, email?, password?, oldPassword?}` (strikt, unbekannte Keys → 400) | `200` wie GET | `password` ohne korrektes `oldPassword` → `403 "Forbidden"`; Mail vergeben → `400 "…already exists"`; User weg → 404 |
| DELETE | `/v1/user` | `{password}` | `200 {"message":"User deleted"}` | falsches Passwort → 403; Kaskade löscht FeedList, Settings, ArticleList |
| GET | `/v1/settings` | – | `200 {expTimeRead, expTimeUnread}` | 404 wenn keine Settings-Zeile |
| PUT | `/v1/settings` | `{expTimeRead?: number, expTimeUnread?: number}` | `200` wie GET | 404; Float-Werte lassen die DB-Spalte (INT) scheitern → 500 **[verifizieren]** |
| GET | `/v1/feeds` | – | `200 [Feed+openInApp]` (Felder: id,title,link,description,createdAt,faviconUrl,lastUpdate,active,errormessage,error_count,openInApp), **keine Sortierung** | – |
| POST | `/v1/feeds` | `{url: 1–MAX_URL_LENGTH, openInApp?: boolean}` | `200` Feed+openInApp; legt Feed an (HTTP-Fetch der Seite + Feed-Parsing), startet danach `parseFeedAndAddToDb` **fire-and-forget** | `400 "Bad request: Invalid feed url"` bei jedem Anlagefehler; `400 "…User already follows this feed"` |
| GET | `/v1/feeds/export` | – | `200`, `Content-Type: text/x-opml; charset=utf-8`, `Content-Disposition: attachment; filename="feeds.opml"`, OPML-2.0-Text (Tabs, `dateCreated` = `toUTCString()`) | – |
| POST | `/v1/feeds/import` | Body: OPML als `text/xml`, `application/xml` oder `text/x-opml`, max 5 MB | `200 {imported, skipped, failed:[{url,reason}]}` | leerer/kein String-Body → `400 "Request body must be an OPML document"`; Body-Parser-Fehler → `400 "Bad request: Invalid request body: …"`; ungültiges OPML → `400 "Bad request: Could not parse OPML: …"` / `"…Missing <opml> root element"` |
| GET | `/v1/feeds/:feedId` | – | `200` Feed+openInApp | 400 Invalid id; 404 (Feed unbekannt **oder** User folgt nicht) |
| PUT | `/v1/feeds/:feedId` | `{openInApp?: boolean}` | `200` Feed+openInApp | 400/404 |
| DELETE | `/v1/feeds/:feedId` | – | `200 {"message":"Feed unfollowed"}`; setzt `Feed.active=false`, wenn niemand mehr folgt | `400 "…User does not follow this feed"` |
| GET | `/v1/articles` | Query `limit` (String, **Länge** 1–50), `feeds` (string oder array), `categories` (string oder array), `startDate`/`endDate` (`YYYY-MM-DD`) | `200 [Article]` mit `id,title,imageUrl,link,publishedAt,createdAt,category(Objekt|null),feed{id,title,link,faviconUrl}` und, wenn `SHOW_ARTICLE_READERS=true`, `ArticleHasUser:[{user:{id,name}}]` (andere User, die gelesen haben) | 400 bei Validierung/Datum; unbekannte Query-Keys → 400 |
| GET | `/v1/articles/:id` | – | `200` Article inkl. `feed.description` + User-Zustand `read,saved,starred,seen,dateRead,dateSaved,dateStarred,dateSeen` (Defaults `false`/`null`) | 400 / 404 |
| PUT | `/v1/articles/:id` | `{read?,seen?,starred?,saved?}` (booleans, strikt) | `200` wie GET | 400 / 404 |
| GET | `/v1/articles/:id/content` | – | `200 {content:{title,content,textContent,excerpt,byline,dir,siteName,lang,length}}`; extrahiert bei Bedarf live (HTTP-Fetch zur Publisher-Seite) | 400 / 404; Extraktion gescheitert/erschöpft → `500 "Internal server error: <lastError>"` |
| POST | `/v1/articles/content` | `{ids: uuid[] (1–CONTENT_PREFETCH_MAX_IDS)}` | `200 {<id>: contentObject|null, …}`, nur gespeicherter Inhalt mit `status=OK`, keine Live-Extraktion | 400 |
| GET | `/v1/readinglist` | – | `200 [Article + Listenzustand]` (siehe unten), **ohne ORDER BY** | – |
| POST | `/v1/readinglist/articles` | `{id}` | `200 {"message":"Article added to reading list"}` | 400 / 404 |
| DELETE | `/v1/readinglist/articles` | `{id}` (Body bei DELETE!) | `200 {"message":"Article deleted from reading list"}` | 400 / 404 |
| DELETE | `/v1/readinglist` | `{onlyRead: boolean}` (Body bei DELETE!) | `200 {"message":"Reading list cleared"}` | 400 |
| GET | `/v1/starred` | – | `200 [Article + Listenzustand]`, ohne ORDER BY | – |
| POST | `/v1/starred/:article` | `{id}`; **der Pfadparameter wird ignoriert**, Frontend nutzt `/starred/articles` | `200` Article (siehe Bug B3) | 400 Invalid id; `400 "…The User doesn't have an article with this id"`; `400 "…already in this state: Starred: true"` |
| DELETE | `/v1/starred/:article` | wie POST | `200` Article | wie POST mit `false` |
| GET | `/v1/categories` | – | `200 []` solange `ENABLE_FEED_CLASSIFICATION != "true"`, sonst alle `{id,name,createdAt}` ungeordnet | – |
| GET | `/v1/statistics/recent` | – | `200 {dateSince, totalSeen, totalRead, totalStarred, totalSaved, days:[{date,seen,read,starred,saved}], feeds:[{feedId,faviconUrl,title,read}]}` | – |

Listenzustand (Readinglist/Starred) = Article-Felder (`id,title,imageUrl,link,publishedAt,createdAt,category,feed{id,title,link,faviconUrl}`) plus `read,saved,starred,seen,dateRead,dateSaved,dateStarred,dateSeen`. Hinweis: in der Liste fehlt `feed.description`, im Einzel-GET ist es enthalten.

### 2.3 Nicht-Routen-Verhalten

- Alles andere: `404 {"message":"Not Found - <req.originalUrl inkl. Query>","stack":""}`.
  - Unter einem geschützten Mount (z. B. `PATCH /v1/user`, `GET /v1/user/foo`) wird **zuerst** das Token geprüft: ohne Token 401, mit Token 404.
  - `/v1/login` und `/v1/register` sind nicht geschützt: `GET /v1/login` → 404.
- `HEAD` auf GET-Routen wird von Express automatisch bedient; `OPTIONS` beantwortet `cors()`.
- Routing ist **case-insensitive** und **tolerant gegenüber Trailing Slash** (Express-Default, `strict routing` aus): `/V1/Feeds/` funktioniert. **[verifizieren]**
- Reihenfolge-Eigenheiten: `GET /v1/articles/content` trifft `/:id` (→ `400 Invalid id`); `/feeds/export` und `/feeds/import` sind vor `/:feedId` registriert.

---

## 3. Middleware und Querschnittsthemen

### 3.1 Auth
- `auth` liest `req.headers.authorization.split(" ")[1]`, **das Schema-Präfix wird nicht geprüft** (`Bearer`, `foo`, … gehen). Jeder Fehler (fehlender Header, kaputtes Token, abgelaufen) → `401 {"message":"Not authorized"}`.
- `jwt.verify(token, JWT_SECRET)` mit den Defaults von `jsonwebtoken` 9 (HS256/384/512, `exp` wird geprüft). Payload `{id, iat, exp}`. **Existierende Tokens müssen mit demselben Secret weiter gültig sein.**
- Ausstellung: `jwt.sign({id}, JWT_SECRET, {expiresIn: JWT_EXPIRATION})`, Default `"30d"`. `expiresIn` als String wird von `ms` geparst (`"30d"`, `"12h"`); ein reiner Zahlenstring wie `"3600"` bedeutet **Millisekunden**. Das muss für gesetzte Werte identisch bleiben.
- Es wird nicht geprüft, ob der User noch existiert. Token gelöschter User sind weiter gültig; Folge sind 404er in den Endpunkten (z. B. `GET /user`) bzw. leere Antworten.
- Passwort-Hashes: **bcrypt, `$2b$`, 10 Runden** (`bcrypt` 5.1). Bestehende Hashes (evtl. auch `$2a$`/`$2y$`) müssen verifizierbar bleiben. Node-bcrypt kürzt Passwörter still auf 72 Bytes; erlaubt sind aber bis zu 100 Zeichen. Verhalten der Rust-Crate bei > 72 Bytes muss identisch sein **[verifizieren]**.
- Die E-Mail-Eindeutigkeit ist **case-insensitiv**, weil die Spalte `utf8mb4_unicode_ci` nutzt (und Trailing-Spaces-Gleichheit des PAD-SPACE-Collations). `getUserByEmail` verlässt sich darauf. Der Rust-Code muss dieselbe Collation/Connection-Charset nutzen.

### 3.2 CORS
`cors()` ohne Optionen: `Access-Control-Allow-Origin: *`, Preflight `204` mit `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`, `Access-Control-Allow-Headers` spiegelt `Access-Control-Request-Headers`, kein `Allow-Credentials`, keine `Max-Age`.

### 3.3 Body-Parser
- `bodyParser.json()`: Limit **100 kb**, `strict` (nur Objekt/Array), nur `Content-Type: application/json`. Ohne/anderen Content-Type ist `req.body === {}`.
- `bodyParser.urlencoded({extended:true})` (qs): Formular-Bodies werden akzeptiert und gegen dieselben Schemata geprüft (z. B. `a[b]=1` → verschachtelt).
- `/feeds/import`: zusätzlich `express.text({type:[text/xml, application/xml, text/x-opml], limit:"5mb"})`; Fehler mit Property `type` werden zu `400 "Bad request: Invalid request body: <msg>"`.
- **Fehler der globalen Parser** (kaputtes JSON, > 100 kb) laufen in den Error-Handler. Dessen Logik `res.statusCode === 200 ? 500 : …` liefert dort **`500`** mit `{"message":"Unexpected token … in JSON at position …","stack":""}` und nicht 400/413 **[verifizieren]**. Das ist vermutlich ein Bug, ändert aber sichtbares Verhalten → Frage F5.
- DELETE-Requests werden mit Body gelesen (`/readinglist`, `/readinglist/articles`, `/starred/*`, `/user`).

### 3.4 Query-Parsing (Express `qs`)
`req.query` wird mit `qs` geparst: `feeds=a`, `feeds=a&feeds=b`, `feeds[]=a`, `feeds[0]=a` werden zu String/Array; die Routen wandeln einen einzelnen String für `feeds` und `categories` in ein Array. Grenzen von `qs`: höchstens 20 Array-Indizes (darüber Objekt), Tiefe 5, 1000 Parameter. Verschachtelte Objekte (`feeds[x]=1`) landen als Objekt in der Query und scheitern an superstruct. `limit` ist ein **String** (Prüfung auf Länge 1–50, nicht auf Zahl) und wird per `Number(limit)` an Prisma übergeben; `limit` fehlt oder ist nicht numerisch → `take: NaN`. Was Prisma daraus macht, ist **[verifizieren]** (vermutlich 500).

### 3.5 Response-Header von Express (Black-Box-relevant)
`X-Powered-By: Express`, `Content-Type: application/json; charset=utf-8`, **schwaches `ETag`** auf allen `res.json`/`res.send`-Antworten (`W/"<len hex>-<sha1 base64 [0..27]>"`) und `304` bei passendem `If-None-Match`, `Content-Length`, `Date`, `Connection: keep-alive`, `Keep-Alive: timeout=5`. Ein Browser-Client kann sich über ETag/304 auf Caching verlassen. Siehe Frage F6.

### 3.6 Rate Limiting, Logging, Uploads, Kompression
- Kein Rate Limiting, keine Kompression, kein Request-Logging, kein `helmet`. Keine Datei-Uploads (nur OPML als Text-Body).
- Logger: `console.log/warn/error` im Format `[<ISO-Zeit> | <SCOPE>] <Nachricht>`; Scopes `FEEDPARSER`, `CATEGORIZER`, `GARBAGE_COLLECTOR`, `API`, `REQUESTS`. Mehrere Meldungen enthalten führende/folgende Zeilenumbrüche. Ob Logs ausgewertet werden, ist unbekannt (Frage F9).
- Kein Graceful-Shutdown-Handler (kein `SIGTERM`-Handling), kein Healthcheck-Endpunkt. Der einzige Healthcheck im Repo gehört der DB (`mysqladmin ping`).

### 3.7 Fehlertexte aus superstruct (Auszug)
Die Texte werden 1:1 hinter `Bad request: ` ausgegeben. Beispiele aus dem Code-Verhalten von superstruct 1.0:
- fehlendes Feld: `At path: email -- Expected a string, but received: undefined`
- falscher Typ: `At path: read -- Expected a boolean, but received: "yes"`
- Länge: `At path: password -- Expected a string with a length between `8` and `100` but received one with a length of `3``
- unbekannter Key: `At path: foo -- Expected a value of type `never`, but received: `"x"``
- E-Mail ohne `@`: `At path: email -- Expected a string matching `email` but received "abc"`
- Datum: `At path: startDate -- Expected a string matching `/^(\d{4})-(\d{2})-(\d{2})$/` but received "…"`
- Body ist kein Objekt: `Expected an object, but received: …`

Diese Texte (inkl. Pfad-Format, Kürzung langer Werte, Reihenfolge, in der Fehler gemeldet werden: **nur der erste Fehler**) sind Teil der Spezifikation und werden in Phase 3 systematisch erfasst.

### 3.8 Datumsprüfung in `GET /articles`
Nach dem Regex wird `Date.parse(startDate)` geprüft; ungültig → `400 "Bad request: startDate is not a valid date"`. V8 akzeptiert bei ISO-Strings offenbar Tage bis 31 mit Überlauf (`2023-02-31` → 3. März) und lehnt `2023-13-01` sowie `2023-00-10` ab **[verifizieren]**. `endDate` filtert `publishedAt <= <Mitternacht UTC>` (schließt also Artikel des Endtags aus). `publishedAt IS NULL` fällt bei jedem Datumsfilter heraus.

---

## 4. Hintergrundprozesse

Alle laufen im selben Node-Prozess wie die API, wenn `SERVICE_TYPE=all` (Default).

### 4.1 Feed-Parser (`jobs/feedparser.ts`, `SERVICE_TYPE` = `all` | `feedParser`)
- Schleife: alle aktiven Feeds (`active=true`) **sequenziell**, dann Warten bis `FEED_UPDATE_INTERVAL` ms (Default 600000) seit Start des Durchlaufs vergangen sind.
- Pro Feed: Feed per HTTP-Stream laden (Timeout 20 s, `MAX_CONTENT_LENGTH` 2 MB, feste Browser-User-Agent- und Cookie-Header), Zeichensatz per `iconv` nach UTF-8 wandeln (Header-Charset, sonst XML-Prolog-`encoding`, sonst utf-8; dafür **zweiter** Request), mit `feedparser` parsen, Hauptseite laden (jsdom + DOMPurify), Titel/Beschreibung/Favicon aktualisieren (je ein eigenes UPDATE), `lastUpdate` setzen, Artikel anlegen, Fehlerzähler zurücksetzen.
- Pro Artikel: Duplikat-Check `findFirst({link, feedId})` (N+1), Artikelseite laden (immer, für `og:image`; bei fehlendem Datum auch für `publishedAt`), Artikel älter als `TIME_TO_DELETE_OLD_ARTICLES` überspringen, `Article` anlegen, danach Readability-Extraktion auf dem schon geladenen DOM → `ArticleContent` (upsert, Status `OK`/`FAILED`).
- Fehler: `errormessage` (auf 255 Zeichen gekürzt) setzen und `error_count += 1`; Feeds mit `error_count > MAX_FEED_ERROR_COUNT` (Default 20) werden übersprungen und **nie wieder** aktiviert (Zähler wird nie zurückgesetzt, solange übersprungen).
- Wird auch aus dem API-Prozess aufgerufen: `POST /feeds` (nach dem Anlegen, nicht awaited) und OPML-Import (Hintergrund, Parallelität 5).
- `EXTERNAL_CRONJOB=true`: genau ein Durchlauf, dann `process.exit(0)`. Achtung: bei `SERVICE_TYPE=all` beendet das **den gesamten Prozess inkl. API** nach dem ersten Durchlauf (vermutlich nicht beabsichtigt, Frage F4).

### 4.2 Garbage Collector (`jobs/garbageCollector.ts`, `all` | `garbageCollector`)
Intervall `GARBAGE_COLLECTOR_INTERVAL` (Default 1 h). Drei Schritte nacheinander:
1. `deleteExpiredArticlesFromReadingList`: je Settings-Zeile (N+1, je abgelaufenem Eintrag ein UPDATE) `saved=false` setzen für gelesene Einträge mit `dateRead < now-expTimeRead` (nur wenn `expTimeRead >= 0`) und ungelesene mit `dateSaved < now-expTimeUnread` (nur wenn `expTimeUnread >= 0`). `dateSaved` bleibt stehen.
2. `deleteOldArticles`: alle Artikel mit `publishedAt` **oder** `createdAt` älter als `TIME_TO_DELETE_OLD_ARTICLES` (Default 7 Tage) laden, einzeln löschen, wenn kein User sie `saved` oder `starred` hat (pro Artikel eine Abfrage).
3. `deleteUnusedFeeds`: alle Feeds laden, Feed löschen, wenn weder Artikel noch Follower (2 Abfragen pro Feed, lädt alle Artikelzeilen).

### 4.3 Categorizer (`jobs/categorizer.ts`, `categorizer` oder `all` + `ENABLE_FEED_CLASSIFICATION=true`)
- Intervall `CATEGORIZER_INTERVAL` (Default 10 min). Solange `Article` mit `categoryId IS NULL` existiert: ersten Artikel holen, **Seite erneut laden**, Readability, nach `lang` (`de`/`en`) mit einem **Naive-Bayes-Klassifikator der Bibliothek `natural`** klassifizieren (Modelle: `static/classifierTrainedDe.json` 14 MB, `…En.json` 10 MB; Klassen `politics, business, sports, technology, science, culture`), sonst `"Uncategorized"`; `Category` per `connectOrCreate` anlegen/verknüpfen.
- Deutsche Variante nutzt `natural.PorterStemmerDe`, englische `natural.PorterStemmer`. Modellformat: `classFeatures[label][wort]=count`, `classTotals`, `totalExamples`, `smoothing=1`, Stemmer-Name. Um dieselbe Klassifikation zu erhalten, müssen Tokenisierung, Stemming und Scoring von `natural` bit-genau nachgebaut werden (Risiko R1).
- Bug: wirft `categorizeArticle` einen Fehler, wird nur `continue` ausgeführt. `findFirst` liefert denselben Artikel wieder → **Endlosschleife** auf einem dauerhaft fehlerhaften Artikel (ohne Pause).
- `categorizeArticles` wird in `feedparser.ts` importiert, aber nie aufgerufen.

### 4.4 Sonstige externe Aufrufe / Zustände
- Ausgehende HTTP-Requests: Feeds, Hauptseiten, Artikelseiten (API: `POST /feeds`, `GET /articles/:id/content`, OPML-Import-Hintergrund). Keine Blocklist für interne Adressen (SSRF möglich).
- Kein E-Mail-Versand, keine Queue, keine WebSockets, keine Timer außer den drei Schleifen.
- Prozessweiter Zustand: `inFlightExtractions` (Map: gleichzeitige Content-Extraktionen desselben Artikels teilen sich einen Lauf), `runningCategorization` (Reentrancy-Flag).
- Content-Extraktion bei `GET /articles/:id/content`: Status `OK` → direkt liefern; `FAILED` mit `attempts >= MAX_EXTRACTION_ATTEMPTS` (3) oder letzter Versuch jünger als `EXTRACTION_RETRY_DELAY` (6 h) → 500 ohne neuen Versuch; sonst live extrahieren und speichern.

---

## 5. npm scripts, Deployment, Service-Aufteilung

### 5.1 `backend/package.json` scripts

| Script | Befehl | Wer ruft es auf |
|---|---|---|
| `build` | `npx prisma generate && tsc` | Dockerfile (Builder-Stage), `serve` |
| `start` | `node ./dist/index.js` | nichts im Repo (Dockerfile ruft `node dist/index.js` direkt) |
| `migrate:deploy` | `npx prisma migrate deploy` | **nichts im Repo.** Vermutlich vom externen K8s-CronJob `rsswipe-migration-template` (nicht einsehbar) |
| `setupPrisma` | `prisma migrate deploy && prisma generate` | `serve` |
| `serve` | `setupPrisma && build && node ./dist` | nichts im Repo |
| `dev` | `nodemon ./src/index.ts` | `docker-compose.yml` (Dev-Compose im Repo-Root: `npm install && npm run dev`) |

Es gibt **kein** Script, das einen Teilservice startet. Die Teilung geschieht ausschließlich so:

| `SERVICE_TYPE` | startet | HTTP-Listener |
|---|---|---|
| `all` (Default) | API + Feed-Parser + Garbage-Collector + (Categorizer, wenn `ENABLE_FEED_CLASSIFICATION=true`) | ja |
| `api` | nur HTTP-API | ja |
| `feedParser` | nur Feed-Parser | **nein** |
| `garbageCollector` | nur GC | **nein** |
| `categorizer` | nur Categorizer (ignoriert `ENABLE_FEED_CLASSIFICATION`) | **nein** |

Alle Varianten laden beim Start `environment.ts`; fehlen `JWT_SECRET` oder `DATABASE_URL`, bricht **jeder** Typ ab (auch ein Job-Service). Die Router und die `openapi.json` werden ebenfalls in jedem Typ geladen. Ein unbekannter `SERVICE_TYPE`-Wert startet weder API noch Jobs: der Prozess beendet sich sofort (Event-Loop leer) **[verifizieren]**.

### 5.2 Stellen im Repo, die das Backend bauen/starten

| Datei | Inhalt |
|---|---|
| `backend/Dockerfile` | Builder (`node:24-slim`, `npm ci`, `prisma generate`, `npm run build`, `npm prune --production`), Runner (`node:24-slim`, kopiert `node_modules`, `dist`, `static`, `prisma`, `openapi.json`, `package*.json`), `EXPOSE 8080`, `CMD ["node","dist/index.js"]`. Kein `HEALTHCHECK`. |
| `.github/workflows/build-deploy.yml` | Push auf `main`: baut und pusht `ghcr.io/importantus/rsswipe-backend:main` und `…-frontend:main` (Build-Context `./backend` bzw. `./frontend`, Tag nur `:main`). Danach Job `restart-deployments`: per `kubectl` (a) Deployments mit Label `restart=please` im Namespace `rsswipe` ermitteln, (b) **Migration**: Job `rsswipe-migration-run` aus `cronjob/rsswipe-migration-template` erzeugen und bis zu 120 s auf `complete` warten, (c) alle ermittelten Deployments neu starten. |
| `docker/docker-compose.yml` | Produktiv-Beispiel für Endnutzer: `mariadb:10` (+ `mysqladmin ping`-Healthcheck), `backend` (`ghcr.io/importantus/rsswipe-backend:main`, Port `${FORWARD_BACKEND_PORT:-8080}:8080`, `env_file: .env`), `frontend`. **Keine Migration und kein `SERVICE_TYPE`**: in diesem Setup laufen Migrationen nirgends automatisch (siehe F3). |
| `docker-compose.yml` (Root) | Dev-Setup: mariadb, phpmyadmin, Backend (`node:20`, Quellcode gemountet, `npm run dev`), Frontend. |
| `README.md` | Beschreibt Migration manuell (`npx prisma migrate deploy`, `prisma generate`). |

**Nicht im Repo sichtbar** (muss ich von dir erfahren): die K8s-Manifeste, insbesondere (a) welche Deployments/CronJobs es je `SERVICE_TYPE` gibt und mit welchen Env-Variablen/`command`/`args`, (b) was `rsswipe-migration-template` genau ausführt und mit welchem Image, (c) Liveness/Readiness-Probes.

Beobachtung zum Migrationsjob: Der Runner-Stage enthält nach `npm prune --production` die Prisma-**CLI nicht mehr** (`prisma` ist devDependency). Ein `npx prisma migrate deploy` im Runner-Image würde also die CLI zur Laufzeit aus dem Netz laden. Ob der CronJob genau das tut oder ein anderes Image verwendet, ist offen.

---

## 6. Konfiguration (Umgebungsvariablen)

Gelesen ausschließlich in `backend/src/helper/environment.ts` (`constructEnv`: **leerer String zählt als nicht gesetzt**; Variablen ohne Default lassen den Prozess beim Import mit `Environment variable X not found` abbrechen). Alle Werte sind Strings, Zahlen werden an der Verwendungsstelle per `Number()` gewandelt (ungültig → `NaN`).

| Variable | Default | Verwendung |
|---|---|---|
| `SERVICE_TYPE` | `all` | `index.ts`: welche Teile starten |
| `EXTERNAL_CRONJOB` | `false` | Jobs laufen nur einmal (`=== "true"`) |
| `JWT_SECRET` | **Pflicht** | Token signieren/prüfen |
| `JWT_EXPIRATION` | `30d` | `expiresIn` beim Login |
| `DATABASE_URL` | **Pflicht** | Prisma (auch direkt aus Prisma-Schema `env("DATABASE_URL")`) |
| `STATUS` | `production` | `development` → `stack` in Fehlern; Ausgabe in `/system` |
| `BACKEND_PORT` | `8080` | Listener |
| `FEED_UPDATE_INTERVAL` | `600000` | ms, Feed-Parser; Ausgabe in `/system` |
| `CATEGORIZER_INTERVAL` | `600000` | ms |
| `TIME_TO_DELETE_OLD_ARTICLES` | `604800000` | ms; Altersgrenze Import, GC, Statistik; Ausgabe in `/system` als `maxArticleAge` |
| `GARBAGE_COLLECTOR_INTERVAL` | `3600000` | ms; Ausgabe in `/system` als `garbageCollectionInterval` |
| `MAX_URL_LENGTH` | `1000` | Validierung `POST /feeds`, OPML-Import |
| `MAX_IMAGE_URL_LENGTH` | `10000` | Bild-URL-Filter im Feed-Parser (DB-Spalte hat aber nur 1000) |
| `MAX_FEED_ERROR_COUNT` | `20` | Feed überspringen ab `>` Wert |
| `ENABLE_FEED_CLASSIFICATION` | `false` | `/categories`, Categorizer in `all` |
| `MAX_CONTENT_LENGTH` | `2000000` | axios `maxContentLength` (Bytes) |
| `SHOW_ARTICLE_READERS` | `true` | `ArticleHasUser` in `GET /articles` |
| `MAX_EXTRACTION_ATTEMPTS` | `3` | Content-Extraktion |
| `EXTRACTION_RETRY_DELAY` | `21600000` | ms |
| `CONTENT_PREFETCH_MAX_IDS` | `50` | max. `ids` bei `POST /articles/content` |
| `NODE_ENV` | (Dockerfile: `production`) | wird vom Code nicht gelesen |

Weitere Variablen aus `.env.prod`/`.env.local`, die nicht vom Backend-Code gelesen werden, aber im selben `.env` stehen: `DB_PASSWORD`, `DB_HOST/PORT/DATABASE/USER`, `BACKEND_URL`, `VITE_BACKEND_URL`, `FORWARD_*`. (Ich habe die `.env*`-Dateien nur auf Variablennamen untersucht, keine Werte.)

---

## 7. Datenbank

### 7.1 Schema (aus Migrationen, MariaDB, `utf8mb4_unicode_ci`)

| Tabelle | Spalten (Typ) | Schlüssel / FKs |
|---|---|---|
| `User` | id VARCHAR(191) PK, name VARCHAR(191), email VARCHAR(191) **UNIQUE**, password VARCHAR(191), createdAt DATETIME(3) DEFAULT now | – |
| `Feed` | id PK, title VARCHAR(191), link VARCHAR(1000) **UNIQUE**, description VARCHAR(1000) NULL, createdAt, faviconUrl VARCHAR(1000) NULL, lastUpdate DATETIME(3) DEFAULT now, active BOOL DEFAULT true, errormessage VARCHAR(300) NULL, error_count INT DEFAULT 0 | – |
| `FeedList` | userId, feedId, openInApp BOOL DEFAULT true, followedAt DATETIME(3) DEFAULT now | PK (userId, feedId); FK user → `User` ON DELETE CASCADE; FK feed → `Feed` RESTRICT |
| `Article` | id PK, title VARCHAR(191), link VARCHAR(1000), imageUrl VARCHAR(1000) NULL, createdAt, publishedAt DATETIME(3) NULL, feedId, categoryId NULL | FK feed RESTRICT; FK category ON DELETE SET NULL; Index (feedId, publishedAt) |
| `ArticleContent` | articleId PK, title VARCHAR(1000), content LONGTEXT, textContent LONGTEXT, excerpt VARCHAR(1000), byline VARCHAR(500), dir VARCHAR(10), siteName VARCHAR(255), lang VARCHAR(20), length INT (alle NULL), status ENUM('PENDING','OK','FAILED') DEFAULT 'PENDING', attempts INT DEFAULT 0, lastError VARCHAR(500) NULL, lastAttempt, fetchedAt | FK article ON DELETE CASCADE |
| `Settings` | id PK, expTimeRead INT, expTimeUnread INT, userId | FK user CASCADE (kein UNIQUE auf userId) |
| `ArticleList` | articleId, userId, seen/saved/read/starred BOOL DEFAULT false, dateSeen/dateSaved/dateRead/dateStar DATETIME(3) NULL | PK (articleId, userId); FK article CASCADE; FK user CASCADE |
| `Category` | id PK, name VARCHAR(191) **UNIQUE**, createdAt | – |
| `_prisma_migrations` | von Prisma geführt (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) | – |

- IDs werden **clientseitig** von Prisma (`uuid()` = UUIDv4 als String) erzeugt, nicht von der DB.
- Prisma schreibt `DATETIME(3)` als UTC, `createdAt`-Defaults kommen aus `CURRENT_TIMESTAMP(3)` der DB (Serverzeitzone der DB, im MariaDB-Container UTC).
- Das Prisma-Schema ist `backend/prisma/schema.prisma`; es entspricht den Migrationen. **[verifizieren]** per `prisma migrate diff` in Phase 5.

### 7.2 Migrationen (19, `migration_lock.toml`: mysql)

`20231111105800_init`, `…122133_add_starred`, `20231126113546_change_settings…`, `20231128150550_delete_cascade_if_user_is_deleted`, `…153642_make_feed_link_unique`, `…154040_add_default_value_for_feed_last_update`, `…160951_make_feed_favicon_optional`, `…174844_make_article_link_unique`, `…174953_add_published_at_to_article`, `…175319_make_article_image_optional`, `20231130110847_add_feed_field_active`, `20231204101140_increase_url_size`, `…172257_make_article_pub_date_optional`, `20231220094208_add_article_categories`, `20240109115748_make_article_link_not_unique`, `20240124150210_add_error_to_feed`, `20240220181901_make_errormessage_longer`, `20240331144354_add_feed_description`, `20260821114955_article_content`.

Auffällig: `20231126…` **droppt und recreated** `Settings.expTimeRead/expTimeUnread` (Datenverlust-Migration, historisch). Für die Baseline irrelevant, aber ein Hinweis, dass die Historie nicht aus „sauberen" Schritten besteht, weshalb ich die Baseline aus dem **tatsächlichen Endschema** ableite und nicht aus dem Replay. Offen: Ob `Feed_link_key` (UNIQUE auf VARCHAR(1000) utf8mb4 = 4000 Bytes) auf `mariadb:10` überhaupt läuft (Limit 3072 Bytes), prüfe ich in Phase 3, wenn die Test-DB gebaut wird.

### 7.3 Queries (alle über Prisma Client, keine Raw-Queries, **keine expliziten Transaktionen**)
Jede Schreiboperation mit mehreren Schritten ist nicht atomar (z. B. `registerUser` prüft + erzeugt getrennt; `updateArticle` = find, find, find, create/update). Relevante Muster:
- `articles.getArticles`: `Article` mit `feed.id IN (…)`, optional Kategorie/Datum, plus `(EXISTS ArticleList(user, seen=false)) OR NOT EXISTS ArticleList(user)`, `ORDER BY publishedAt DESC`, `LIMIT <limit>`; dazu Relationen `category`, `feed`, optional `ArticleHasUser(read=true, user≠me)` als Folgeabfragen (Prisma lädt Relationen nachgelagert).
- `readinglist`: `ArticleList WHERE userId AND saved=true AND NOT(read=true AND dateRead < X) AND NOT(read=false AND dateSaved < Y)`. **SQL-NULL-Semantik**: `read=true AND dateRead IS NULL` ergibt `NOT(NULL)` → Zeile wird *ausgeschlossen*; analog `read=false AND dateSaved IS NULL`. Muss in Rust exakt so bleiben **[verifizieren]**.
- `statistics`: lädt alle `ArticleList`-Zeilen des Users mit `Article.publishedAt >= now-maxAge` und zählt in Node; Zuordnung zu Tagen über `getDate()` (Tag **im Monat**, in der Zeitzone des Prozesses, Zeitzone `TZ`). Bei `maxAge` ≥ 28 Tagen werden Monatsgrenzen vermischt (es zählt der erste Treffer). Die Anzahl Tage ist `ceil(maxAge / 1 Tag)`.
- `feeds`, `user`, `settings`, `starred`: einfache PK-/Unique-Lookups.
- Race-Handling nur im OPML-Import über Prisma-Fehlercode `P2002` (Unique-Verletzung).

### 7.4 Ineffizienzen
1. **Fehlende Indizes:** `ArticleList(userId, …)` – PK ist `(articleId, userId)`, Abfragen nach `userId` (Readinglist, Starred, Statistik, Stats-Joins) scannen; `Article(publishedAt)` / `Article(createdAt)` (GC, Sortierung); `Settings(userId)`; `Article(feedId, link)` (Duplikat-Check).
2. **N+1:** Feed-Parser (Duplikat-Check pro Artikel; mehrere Einzel-UPDATEs je Feed), GC (je Feed 2 Abfragen, je Artikel 1 Abfrage, je abgelaufenem Eintrag 1 UPDATE), Categorizer (COUNT + SELECT je Artikel, Seite pro Artikel neu geladen), `getArticle`/`updateArticle` (mehrere sequenzielle Abfragen).
3. **Mehrfach-Clients:** `readinglist.ts` und `starred.ts` erzeugen je einen eigenen `new PrismaClient()` (eigene Pools).
4. Statistik: O(Tage × Artikel) in Node statt `GROUP BY`.
5. GC `deleteOldArticles`/`deleteUnusedFeeds` laden komplette Tabellen in den Speicher.

### 7.5 Schemaschwächen
- `Article.title` und `Feed.title` sind `VARCHAR(191)` (Prisma-Default). Längere Titel führen zu einem DB-Fehler: Artikel werden **still verworfen** (`Error adding article`), Feed-Anlage scheitert als „Invalid feed url". OPML-Import kürzt auf 191 (`MAX_TITLE_LENGTH`) und verdeckt das Problem dort.
- `MAX_IMAGE_URL_LENGTH` (10000) ≠ Spaltengröße (1000): längere Bild-URLs lassen das Anlegen des Artikels scheitern. Bei `faviconUrl` ist die Längenprüfung wirkungslos (`!favicon && …` ist immer falsch), zu lange Favicons lösen Feed-Fehler aus.
- `Article.link` ist nicht eindeutig; Duplikate sind bei parallelem API-/Job-Lauf möglich (kein Unique auf `(feedId, link)`; ein Unique auf 1000×4 Byte scheitert am 3072-Byte-Limit → Prefix- oder Hash-Spalte nötig).
- `Settings` ist technisch 1:N zu `User` (kein Unique), Code nimmt `findFirst`.
- `Article.categoryId`/`ArticleList` ohne Indizes für die tatsächlichen Zugriffsmuster, `FeedList.feedId` nur über FK-Index.
- `ArticleList.saved/read/starred/seen` mit gleichzeitigem Datumsfeld: Datum wird beim Zurücksetzen nicht gelöscht (nur beim Leeren der Readinglist `dateSaved=null`); `Settings` kennt `-1` als „nie ablaufen" (Magic Value).
- Passwort-Spalte `VARCHAR(191)` reicht für bcrypt (60 Zeichen).

---

## 8. Auffällige Bugs (Kandidaten für `BUGFIXES.md`)

Keiner ist bisher behoben. Wo eine Korrektur API-Verhalten ändert, steht das dabei (→ Frage an dich).

| # | Stelle | Problem | Sichtbar von außen? |
|---|---|---|---|
| B1 | `jobs/categorizer.ts` | `continue` im Fehlerfall → Endlosschleife auf demselben Artikel | nein (Job) |
| B2 | `index.ts`/`jobs/feedparser.ts` | `SERVICE_TYPE=all` + `EXTERNAL_CRONJOB=true` → `process.exit(0)` nach dem ersten Feed-Lauf beendet die API | ja (Prozess endet), Konfig-Fehlkombination |
| B3 | `models/starred.ts` `updateStarredArticle` | `updateArticle(...)` wird **nicht awaited**: Antwort (`getArticle`) kann den **alten** Zustand liefern; ein Fehler darin ist eine unhandled rejection (kann den Node-Prozess beenden) | **ja** (Antwort ändert sich: danach „richtiger" Zustand) |
| B4 | `routes/v1/feeds.ts` `POST /feeds` | `openInApp` im Body wird validiert, aber beim Anlegen ignoriert (immer `true`) | **ja** |
| B5 | `jobs/feedparser.ts` `getFaviconUrl` | Längenprüfung wirkungslos (`!favicon && …`) | nein |
| B6 | `middleware.ts` | Body-Parser-Fehler (kaputtes JSON, zu groß) → 500 statt 400/413 | **ja** |
| B7 | `GET /articles` | `feeds` wird nicht auf die vom User abonnierten Feeds begrenzt (jede Feed-ID abfragbar) | **ja** (nur Abgrenzung, Daten sind öffentliche Feedinhalte) |
| B8 | `GET /articles` | `limit` fehlt/ungültig → `take: NaN` | **[verifizieren]** |
| B9 | `models/statistics.ts` | Tageszuordnung über Tag-im-Monat und lokale Zeitzone | ja, bei ≥ 28 Tagen oder TZ ≠ UTC |
| B10 | `models/feeds.ts` `createFeed` | gefundene Feed-URL aus `<link rel=alternate>` kann relativ sein und wird unverändert gespeichert | ja (seltene Fälle) |
| B11 | `jobs/feedparser.ts` | Feeds nach zu vielen Fehlern werden nie reaktiviert (Kommentar: „not possible"); `error_count` wird beim erneuten Folgen nicht zurückgesetzt | ja (indirekt) |
| B12 | `models/feeds.ts` | `unfollowFeed`: Prüfung „andere Follower?" und `active=false` nicht atomar; GC kann frisch angelegte Feeds (vor `FeedList`-Insert) löschen | selten |
| B13 | `GET /articles/:id/content` | prüft nicht, ob der User den Artikel/Feed sehen darf; löst für beliebige Artikel einen ausgehenden Request aus | nein |
| B14 | `openapi.json` | Pfade stimmen nicht mit dem Code überein (`/feeds/{id}`, `/starred/articles`; `export`/`import` fehlen) | ja (Doku) |

---

## 9. Tests

Es gibt **keine** automatisierten Tests, keinen Test-Runner in `package.json`, keinen Testschritt in der CI. Phase 3 (Contract-Tests) muss die Spezifikation daher komplett neu erfassen. Die `openapi.json` ist wegen B14 nur eingeschränkt verwertbar.

---

## 10. Risiken, die schon jetzt sichtbar sind

- **R1 – Bibliotheken ohne gleichwertigen Rust-Ersatz** (betrifft Hintergrundjobs und `ArticleContent`, nicht die Request/Response-Formate): `@mozilla/readability` + `jsdom` + `isomorphic-dompurify`, `feedparser`, `iconv`, `natural` (Naive Bayes + `PorterStemmerDe`). Rust-Alternativen (z. B. Readability-Ports, `feed-rs`, `encoding_rs`, `ammonia`, `scraper`) liefern **nicht dieselben Ergebnisse**. Folge: neu extrahierte Artikelinhalte, Feed-Felder (`pubdate`, `image`, Titel-Handling) und Sanitizing können minimal abweichen; bestehende gespeicherte Inhalte bleiben unverändert. Für den Categorizer lässt sich Gleichheit durch einen Differenztest gegen die Node-Implementierung auf einem Korpus erzwingen.
- **R2 – Prisma-Eigenheiten im Output:** Schlüsselreihenfolge, Fehlertexte bei 500, `NULL`-Semantik in `NOT`, Verhalten bei `take: NaN`. Wird empirisch in Phase 3 gemessen.
- **R3 – Express-Eigenheiten:** ETag/304, `X-Powered-By`, Case-/Trailing-Slash-Routing, qs-Query, Body-Parser-Fehler als 500.
- **R4 – Swagger UI** (`/v1/api-docs`): HTML/Assets von `swagger-ui-dist` byte-identisch nachbilden oder die Assets einbetten.
- **R5 – Deployment-Schnittstelle liegt außerhalb des Repos** (K8s-Manifeste, Migrations-CronJob).

---

## 11. Offene Fragen an dich

**F1 – Teil-Services.** In `package.json` gibt es keine Teil-Service-Scripts; die Aufteilung ist `SERVICE_TYPE`. Ich gehe davon aus, dass deine K8s-Deployments dasselbe Image mit unterschiedlichem `SERVICE_TYPE` starten (Default-`CMD`). Stimmt das? Falls dein Cluster einen eigenen `command`/`args` setzt (z. B. `npm run …`, `node dist/index.js`), brauche ich ihn exakt.

**F2 – Migrations-CronJob.** Was führt `rsswipe-migration-template` aus (Befehl, Image, Env)? Bleibt der Aufruf `npx prisma migrate deploy` bzw. `npm run migrate:deploy` im Backend-Image? Davon hängt ab, ob das neue Image weiterhin ein `npm`/`npx prisma`-kompatibles Kommando bereitstellen muss (z. B. dünner Wrapper) oder ob ich die Migration beim Start der Rust-Binary ausführe (mit DB-Lock, damit parallele Services nicht kollidieren).

**F3 – Docker-Compose-Nutzer.** `docker/docker-compose.yml` führt nirgends Migrationen aus. Ist das so gewollt (andere Anleitung) oder ein Lücke? In der Rust-Variante würde Auto-Migration beim Start das beheben; das ändert aber das Deployment-Verhalten für diese Nutzer.

**F4 – `all` + `EXTERNAL_CRONJOB=true`.** Dieser Fall beendet heute die API nach dem ersten Feed-Lauf (B2). Nutzt du ihn? Ich würde ihn als Fehlkonfiguration behandeln und dokumentieren (kein Prozessende der API).

**F5 – Fehler-Responses bei unerwarteten Fehlern.** Heute enthält `message` bei 500ern Text aus Prisma/Node (kaputtes JSON → 500 mit `Unexpected token…`). Soll ich (a) exakt nachbauen, wo möglich (kaputtes JSON → 500 mit demselben Text, B6 bleibt), (b) bewusst auf `400` korrigieren oder (c) generische 500er? Prisma-Interna lassen sich nicht byte-genau reproduzieren; ich schlage vor: Statuscodes und APIError-Texte identisch, bei echten Interna `{"message":"Internal server error"}`.

**F6 – HTTP-Header.** Soll auch `X-Powered-By: Express`, das schwache `ETag` (inkl. 304) und die Express-Header-Reihenfolge nachgebaut werden? ETag/304 halte ich für sinnvoll, `X-Powered-By` würde ich weglassen, es sei denn, etwas wertet das aus.

**F7 – Bugfixes mit sichtbarer Wirkung:** B3 (Starred-Antwort mit dem neuen Zustand), B4 (`openInApp` beim Anlegen übernehmen), B6, B7, B9. Ich schlage vor: B3 und B4 beheben (sie entsprechen offensichtlich der Absicht und das Frontend profitiert), B6/B7/B9 unverändert lassen und nur dokumentieren, bis du entscheidest. Einverstanden?

**F8 – Schemaverbesserungen.** Ich plane Indizes (siehe 7.4), `Article.title`/`Feed.title` → `VARCHAR(1000)`/`TEXT`, `Settings.userId` UNIQUE (nach Prüfung auf Duplikate). Alle datenerhaltend. Das ändert sichtbar nur, dass längere Titel nicht mehr verworfen werden. Okay?

**F9 – Logs & Probes.** Wertet etwas das Logformat aus (`[ISO | SCOPE] …`)? Welche Liveness/Readiness-Probes setzt dein Cluster (TCP, `GET /`, `GET /v1/system`)? Es gibt keinen dedizierten Healthcheck-Endpunkt im Backend.

**F10 – Ersatz der Node-Bibliotheken (R1).** Akzeptierst du, dass Feed-Parsing, Readability, HTML-Sanitizing und der Kategorisierer in Rust mit anderen Bibliotheken nachgebaut werden und deshalb für *neu* eingelesene Artikel minimale Abweichungen zum TS-Ergebnis möglich sind? Die API-Formate bleiben davon unberührt. Für die Klassifikation würde ich Gleichheit per Differenztest gegen `natural` absichern.

**F11 – Zeitzone.** Läuft der Backend-Prozess in UTC (Statistik nutzt die Prozess-Zeitzone)? Ich nehme UTC an.

**F12 – Swagger UI / OpenAPI.** Soll `/v1/api-docs` in Rust weiter die bestehende, teils veraltete `openapi.json` ausliefern (identisch), oder darf ich sie korrigieren?
