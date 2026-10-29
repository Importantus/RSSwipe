from conftest import Api, BASE_URL


def test_root_lists_versions(anon):
    r = anon.get("/")
    assert r.status_code == 200
    assert r.json() == [{"version": "v1", "path": "/v1"}]


def test_head_root(anon):
    assert anon.request("HEAD", "/").status_code == 200


def test_v1_lists_resources_in_order(anon):
    r = anon.get("/v1")
    assert r.status_code == 200
    assert [x["name"] for x in r.json()] == [
        "user", "settings", "login", "register", "feeds", "articles",
        "readinglist", "starred", "categories", "statistics", "system"]
    assert r.json()[0] == {"path": "/v1/user", "name": "user"}


def test_system(anon):
    r = anon.get("/v1/system")
    assert r.status_code == 200
    b = r.json()
    assert set(b) == {"version", "uptime", "status", "feedUpdateInterval", "garbageCollectionInterval", "maxArticleAge"}
    assert b["version"] == "1.0.0"
    assert isinstance(b["uptime"], (int, float)) and b["uptime"] >= 0
    assert b["status"] == "production"
    # intervals are strings (they come from the environment)
    assert (b["feedUpdateInterval"], b["garbageCollectionInterval"], b["maxArticleAge"]) == ("600000", "3600000", "604800000")


def test_content_type_is_json(anon):
    assert anon.get("/v1/system").headers["content-type"].startswith("application/json")


def test_cors_simple_request(anon):
    r = anon.get("/", headers={"Origin": "https://example.org"})
    assert r.headers["access-control-allow-origin"] == "*"


def test_cors_preflight(anon):
    r = anon.request("OPTIONS", "/v1/user", headers={
        "Origin": "https://example.org", "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "authorization,content-type"})
    assert r.status_code == 204
    assert r.headers["access-control-allow-origin"] == "*"
    methods = {m.strip() for m in r.headers["access-control-allow-methods"].split(",")}
    assert {"GET", "PUT", "POST", "DELETE"} <= methods
    headers = r.headers["access-control-allow-headers"].lower()
    assert "authorization" in headers and "content-type" in headers


def test_unknown_path_is_404(anon):
    r = anon.get("/does/not/exist")
    assert r.status_code == 404
    assert isinstance(r.json()["message"], str)


def test_authenticated_mount_checks_token_before_404(anon, user):
    assert anon.get("/v1/user/unknown").status_code == 401
    assert user.get("/v1/user/unknown").status_code == 404
    assert anon.request("PATCH", "/v1/user").status_code == 401
    assert user.request("PATCH", "/v1/user").status_code == 404


def test_public_mounts_do_not_require_token(anon):
    assert anon.get("/v1/login").status_code == 404
    assert anon.get("/v1/register").status_code == 404


def test_trailing_slash_is_tolerated(user):
    assert user.get("/v1/user/").status_code == 200
    assert user.get("/v1/settings/").status_code == 200
    assert Api().get("/v1/").status_code == 200


def test_swagger_ui_is_served(anon):
    r = anon.get("/v1/api-docs/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
