"""Intentional differences between the TypeScript backend (IMPL=ts, current behaviour) and the Rust
backend (IMPL=rust, target behaviour). Every test is named after its ID in docs/rust-migration/API-CHANGES.md."""
import uuid
import pytest
from conftest import IMPL, PASSWORD, PUBLISHER, Api, db, fresh, follow_and_wait, new_email

ts = IMPL == "ts"


# --- error format --------------------------------------------------------------------------
def test_E1_validation_errors(anon):
    r = anon.post("/v1/login", json={"email": "a@b.de"})
    assert r.status_code == 400
    b = r.json()
    if ts:
        assert b["message"].startswith("Bad request: At path: password -- ")
        assert set(b) == {"message"}
    else:
        assert b["code"] == "validation_error"
        assert any(e["field"] == "password" for e in b["errors"])
        assert isinstance(b["message"], str) and not b["message"].startswith("Bad request")


def test_E2_E3_business_errors_have_code_and_no_prefix(anon, user):
    r = anon.post("/v1/register", json={"name": "D", "email": user.email, "password": PASSWORD})
    assert r.status_code == 400
    if ts:
        assert r.json() == {"message": "Bad request: User with this email already exists"}
    else:
        assert r.json()["message"] == "User with this email already exists"
        assert r.json()["code"] == "bad_request"


def test_E2_codes_of_unchanged_statuses(anon, user):
    r = anon.get("/v1/user")
    assert r.status_code == 401 and r.json()["message"] == "Not authorized"
    assert ("code" in r.json()) is (not ts)
    if not ts:
        assert r.json()["code"] == "not_authorized"
        assert user.put("/v1/user", json={"password": "new-password-1"}).json()["code"] == "forbidden"
        assert user.get(f"/v1/articles/{uuid.uuid4()}").json()["code"] == "not_found"


def test_E5_unknown_route(anon):
    r = anon.get("/nope?x=1")
    assert r.status_code == 404
    if ts:
        assert r.json() == {"message": "Not Found - /nope?x=1", "stack": ""}
    else:
        assert r.json()["code"] == "route_not_found" and "stack" not in r.json()


def test_E6_malformed_json(anon):
    r = anon.post("/v1/login", content='{"a":', headers={"Content-Type": "application/json"})
    if ts:
        assert r.status_code == 500 and r.json()["stack"] == ""
    else:
        assert r.status_code == 400 and r.json()["code"] == "invalid_json"


def test_E7_json_body_over_100kb(anon):
    r = anon.post("/v1/login", content='{"a":"' + "x" * 200_000 + '"}', headers={"Content-Type": "application/json"})
    if ts:
        assert r.status_code == 500
    else:
        assert r.status_code == 413 and r.json()["code"] == "payload_too_large"


def test_E7_opml_import_over_5mb(user):
    r = user.post("/v1/feeds/import", content="x" * 5_500_000, headers={"Content-Type": "application/xml"})
    assert r.status_code == (400 if ts else 413)


# --- endpoints -------------------------------------------------------------------------------
def test_S1_star_response_reflects_new_state(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    user.put(f"/v1/articles/{a}", json={"seen": True})
    if not ts:  # the TS answer races with the write and may still show the old state
        assert user.post("/v1/starred/articles", json={"id": a}).json()["starred"] is True
        assert user.request("DELETE", "/v1/starred/articles", json={"id": a}).json()["starred"] is False
    else:
        assert user.post("/v1/starred/articles", json={"id": a}).status_code == 200


def test_F1_open_in_app_is_stored_on_create(user):
    r = user.post("/v1/feeds", json={"url": PUBLISHER + fresh("/feed/rss.xml"), "openInApp": False})
    assert r.status_code == 200
    assert r.json()["openInApp"] is (True if ts else False)


def test_F2_relative_feed_link_in_page_is_resolved(user):
    r = user.post("/v1/feeds", json={"url": PUBLISHER + "/site-rel/"})
    if ts:
        assert r.status_code == 400
    else:
        assert r.status_code == 200 and r.json()["link"] == PUBLISHER + "/site-rel/rss.xml"


def test_F3_no_dangling_separator_in_description(user):
    r = user.post("/v1/feeds", json={"url": PUBLISHER + fresh("/feed/atom.xml")})
    from conftest import wait_for
    d = wait_for(lambda: (lambda f: f["description"] if f["faviconUrl"] else None)(user.get(f"/v1/feeds/{r.json()['id']}").json()))
    assert d.endswith(" - ") if ts else d == "Fixture site description"


def test_F4_discovered_feed_that_already_exists_is_reused(user):
    first = user.post("/v1/feeds", json={"url": PUBLISHER + "/feed/rss.xml"})
    assert first.status_code in (200, 400)           # 400 only if this user already follows it (never in a fresh user)
    other = Api()
    other.token = other.post("/v1/register", json={"name": "B", "email": new_email(), "password": PASSWORD}).json()["token"]
    r = other.post("/v1/feeds", json={"url": PUBLISHER + "/site"})      # page advertises /feed/rss.xml
    if ts:
        assert r.status_code == 400
    else:
        assert r.status_code == 200 and r.json()["link"] == PUBLISHER + "/feed/rss.xml"


def test_A2_limit_handling(user):
    missing = user.get("/v1/articles")
    word = user.get("/v1/articles?limit=abc")
    neg = user.get("/v1/articles?limit=-1")
    zero = user.get("/v1/articles?limit=0")
    assert zero.status_code == 200 and zero.json() == []
    if ts:
        assert missing.status_code == 500 and "prisma" in missing.json()["message"]
        assert word.status_code == 500
        assert neg.status_code == 200
    else:
        assert missing.status_code == 200 and missing.json() == []        # documented default limit
        assert word.status_code == 400 and neg.status_code == 400


def test_SE1_settings_must_be_integers(user):
    r = user.put("/v1/settings", json={"expTimeRead": 1.5})
    if ts:
        assert r.status_code == 200 and r.json()["expTimeRead"] == 1
    else:
        assert r.status_code == 400


def test_V1_dates_must_exist_in_calendar(user):
    r = user.get("/v1/articles?limit=5&startDate=2023-02-31")
    assert r.status_code == (200 if ts else 400)
    assert user.get("/v1/articles?limit=5&startDate=2024-02-29").status_code == 200


def test_D1_openapi_is_generated_from_routes(anon):
    r = anon.get("/v1/api-docs/openapi.json")
    if ts:
        assert "text/html" in r.headers["content-type"]       # swagger-ui-express answers every sub path with its HTML page
        return
    assert r.status_code == 200 and "json" in r.headers["content-type"]
    spec = r.json()
    assert spec["openapi"].startswith("3.")
    paths = set(spec["paths"])
    for p in ["/v1/login", "/v1/register", "/v1/user", "/v1/settings", "/v1/feeds", "/v1/feeds/export", "/v1/feeds/import",
              "/v1/feeds/{feedId}", "/v1/articles", "/v1/articles/{id}", "/v1/articles/{id}/content", "/v1/articles/content",
              "/v1/readinglist", "/v1/readinglist/articles", "/v1/starred", "/v1/starred/{article}", "/v1/categories",
              "/v1/statistics/recent", "/v1/system"]:
        assert p in paths, p


# --- HTTP level --------------------------------------------------------------------------------
def test_H1_H2_express_headers(anon):
    r = anon.get("/v1/system")
    assert ("x-powered-by" in r.headers) is ts
    assert ("etag" in r.headers) is ts


def test_H3_paths_are_case_sensitive(user):
    assert user.get("/V1/User").status_code == (200 if ts else 404)


def test_B12_fresh_unused_feed_survives_garbage_collection(user):
    """A feed row that was just created (follower not linked yet) is no longer deleted by a concurrent GC run."""
    from conftest import run_job
    import pytest as _p
    _p.importorskip("subprocess")
    fid = str(uuid.uuid4())
    db(f"INSERT INTO Feed (id,title,link) VALUES ('{fid}','fresh','{PUBLISHER}{fresh('/fresh-orphan')}')")
    assert run_job("gc").returncode == 0
    assert db(f"SELECT COUNT(*) FROM Feed WHERE id='{fid}'") == ("0" if ts else "1")
