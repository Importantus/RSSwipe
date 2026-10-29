import uuid
import pytest
from conftest import PUBLISHER, Api, PASSWORD, db, fresh, is_iso_date, new_email, wait_for

FEED_KEYS = ["id", "title", "link", "description", "createdAt", "faviconUrl", "lastUpdate", "active", "errormessage", "error_count", "openInApp"]


def follow(user, path, **body):
    return user.post("/v1/feeds", json={"url": PUBLISHER + fresh(path), **body})


@pytest.mark.parametrize("path,title", [
    ("/feed/rss.xml", "Fixture RSS"), ("/feed/atom.xml", "Fixture Atom"), ("/feed/rdf.xml", "Fixture RDF"),
    ("/feed/latin1.xml", "Grüße aus Lübeck"), ("/feed/redirect", "Fixture RSS")])
def test_follow_feed_formats(user, path, title):
    r = follow(user, path)
    assert r.status_code == 200, r.text
    b = r.json()
    assert list(b) == FEED_KEYS
    assert b["title"] == title
    assert b["active"] is True and b["error_count"] == 0 and b["errormessage"] is None and b["openInApp"] is True
    assert is_iso_date(b["createdAt"]) and is_iso_date(b["lastUpdate"])


def test_follow_feed_stores_metadata_in_background(user):
    b = follow(user, "/feed/rss.xml").json()
    feed = wait_for(lambda: (lambda f: f if f["faviconUrl"] else None)(user.get(f"/v1/feeds/{b['id']}").json()))
    assert feed["faviconUrl"] == PUBLISHER + "/favicon.ico"
    assert "Fixture site description" in feed["description"]


@pytest.mark.parametrize("path", ["/notfeed", "/missing", "/pdf"])
def test_follow_invalid_feed_is_400(user, path):
    r = follow(user, path)
    assert r.status_code == 400 and isinstance(r.json()["message"], str)


def test_follow_unreachable_host_is_400(user):
    assert user.post("/v1/feeds", json={"url": "http://does-not-exist.invalid/feed.xml"}).status_code == 400


def test_follow_twice_is_400(user):
    url = PUBLISHER + fresh("/feed/rss.xml")
    assert user.post("/v1/feeds", json={"url": url}).status_code == 200
    assert user.post("/v1/feeds", json={"url": url}).status_code == 400


def test_two_users_share_one_feed_row(user):
    url = PUBLISHER + fresh("/feed/rss.xml")
    other = Api()
    other.token = other.post("/v1/register", json={"name": "B", "email": new_email(), "password": PASSWORD}).json()["token"]
    a = user.post("/v1/feeds", json={"url": url}).json()
    b = other.post("/v1/feeds", json={"url": url}).json()
    assert a["id"] == b["id"]


@pytest.mark.parametrize("body", [{}, {"url": ""}, {"url": 5}, {"url": "x" * 1001}, {"url": "http://a.b", "openInApp": "yes"}, {"url": "http://a.b", "x": 1}])
def test_follow_validation(user, body):
    assert user.post("/v1/feeds", json=body).status_code == 400


def test_list_get_update_unfollow(user):
    f1 = follow(user, "/feed/rss.xml").json()
    f2 = follow(user, "/feed/atom.xml").json()
    lst = user.get("/v1/feeds").json()
    assert {f["id"] for f in lst} == {f1["id"], f2["id"]}
    assert all(list(f) == FEED_KEYS for f in lst)

    g = user.get(f"/v1/feeds/{f1['id']}")
    assert g.status_code == 200 and g.json()["id"] == f1["id"]

    u = user.put(f"/v1/feeds/{f1['id']}", json={"openInApp": False})
    assert u.status_code == 200 and u.json()["openInApp"] is False
    assert user.get("/v1/feeds").json()[0]["openInApp"] in (True, False)
    assert user.put(f"/v1/feeds/{f1['id']}", json={}).json()["openInApp"] is False

    d = user.delete(f"/v1/feeds/{f1['id']}")
    assert d.status_code == 200 and d.json() == {"message": "Feed unfollowed"}
    assert user.delete(f"/v1/feeds/{f1['id']}").status_code == 400
    assert user.get(f"/v1/feeds/{f1['id']}").status_code == 404
    assert [f["id"] for f in user.get("/v1/feeds").json()] == [f2["id"]]


def test_last_unfollow_deactivates_feed(user):
    f = follow(user, "/feed/rss.xml").json()
    user.delete(f"/v1/feeds/{f['id']}")
    assert db(f"SELECT active FROM Feed WHERE id='{f['id']}'") == "0"


def test_refollow_reactivates_feed(user):
    url = PUBLISHER + fresh("/feed/rss.xml")
    f = user.post("/v1/feeds", json={"url": url}).json()
    user.delete(f"/v1/feeds/{f['id']}")
    again = user.post("/v1/feeds", json={"url": url})
    assert again.status_code == 200 and again.json()["id"] == f["id"] and again.json()["active"] is True


def test_feed_of_other_user_is_404(user):
    f = follow(user, "/feed/rss.xml").json()
    other = Api()
    other.token = other.post("/v1/register", json={"name": "B", "email": new_email(), "password": PASSWORD}).json()["token"]
    assert other.get(f"/v1/feeds/{f['id']}").status_code == 404
    assert other.put(f"/v1/feeds/{f['id']}", json={"openInApp": False}).status_code == 404
    assert other.delete(f"/v1/feeds/{f['id']}").status_code == 400


@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_feed_id_validation(user, method):
    kw = {"json": {}} if method == "put" else {}
    assert getattr(user, method)("/v1/feeds/not-a-uuid", **kw).status_code == 400
    assert getattr(user, method)(f"/v1/feeds/{uuid.uuid4()}", **kw).status_code in (400, 404)


def test_feeds_require_auth(anon):
    for m, p in (("get", "/v1/feeds"), ("post", "/v1/feeds"), ("get", "/v1/feeds/export"), ("post", "/v1/feeds/import")):
        assert getattr(anon, m)(p).status_code == 401


# --- OPML -----------------------------------------------------------------------------------
def test_export_opml(user):
    f = follow(user, "/feed/rss.xml").json()
    r = user.get("/v1/feeds/export")
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/x-opml; charset=utf-8"
    assert r.headers["content-disposition"] == 'attachment; filename="feeds.opml"'
    t = r.text
    assert t.startswith('<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n\t<head>\n\t\t<title>Subscriptions</title>\n\t\t<dateCreated>')
    assert f'\t\t<outline text="Fixture RSS" title="Fixture RSS" type="rss" xmlUrl="{f["link"].replace("&", "&amp;")}" />\n' in t
    assert t.endswith("\t</body>\n</opml>\n")


def test_export_escapes_xml(user):
    tag = uuid.uuid4().hex[:8]
    u = PUBLISHER + f"/feed/rss.xml?a=1&b={tag}"
    fid = str(uuid.uuid4())
    db(f"INSERT INTO Feed (id,title,link) VALUES ('{fid}','A <b> & \\\"q\\\" ''x''','{u}')")
    db(f"INSERT INTO FeedList (userId,feedId) VALUES ('{user.id}','{fid}')")
    t = user.get("/v1/feeds/export").text
    assert 'text="A &lt;b&gt; &amp; &quot;q&quot; &apos;x&apos;"' in t
    assert "xmlUrl=\"" + PUBLISHER + f"/feed/rss.xml?a=1&amp;b={tag}\"" in t


def opml(*outlines):
    return '<?xml version="1.0"?><opml version="2.0"><head><title>x</title></head><body>' + "".join(outlines) + "</body></opml>"


def imp(user, body, ctype="text/x-opml"):
    return user.post("/v1/feeds/import", content=body, headers={"Content-Type": ctype})


def test_import_opml(user):
    a, b = PUBLISHER + fresh("/feed/rss.xml"), PUBLISHER + fresh("/feed/atom.xml")
    b_slash = b.replace("/feed/atom.xml?", "/feed/atom.xml/?")
    body = opml(f'<outline text="Folder"><outline text="A" xmlUrl="{a}"/></outline>', f'<outline title="B" text="x" xmlUrl="{b_slash}"/>',
                f'<outline text="dup" xmlUrl="{a}"/>', '<outline text="ftp" xmlUrl="ftp://x/y"/>', '<outline text="no url"/>')
    r = imp(user, body)
    assert r.status_code == 200, r.text
    assert r.json() == {"imported": 2, "skipped": 0, "failed": []}
    links = {f["link"] for f in user.get("/v1/feeds").json()}
    assert links == {a, b}          # trailing slash is normalized, duplicates and ftp urls are dropped
    again = imp(user, body).json()
    assert again == {"imported": 0, "skipped": 2, "failed": []}


@pytest.mark.parametrize("ctype", ["text/xml", "application/xml", "text/x-opml"])
def test_import_accepts_xml_content_types(user, ctype):
    assert imp(user, opml(f'<outline text="A" xmlUrl="{PUBLISHER + fresh("/feed/rss.xml")}"/>'), ctype).json()["imported"] == 1


def test_import_empty_opml_and_title_fallback(user):
    assert imp(user, opml()).json() == {"imported": 0, "skipped": 0, "failed": []}
    u = PUBLISHER + fresh("/feed/rss.xml")
    imp(user, opml(f'<outline xmlUrl="{u}"/>'))
    assert any(f["link"] == u for f in user.get("/v1/feeds").json())


def test_import_too_long_url_fails_softly(user):
    u = "http://example.com/" + "a" * 1100
    r = imp(user, opml(f'<outline text="L" xmlUrl="{u}"/>')).json()
    assert r["imported"] == 0 and len(r["failed"]) == 1 and r["failed"][0]["url"] == u


@pytest.mark.parametrize("body,ctype", [("", "text/x-opml"), ("   ", "application/xml"), ("plain", "text/plain"), ("<a></a>", "application/xml"),
                                        ("<<<not xml", "application/xml")])
def test_import_bad_bodies_are_400(user, body, ctype):
    assert imp(user, body, ctype).status_code == 400


def test_import_json_body_is_400(user):
    assert user.post("/v1/feeds/import", json={"a": 1}).status_code == 400


def test_import_over_5mb_is_400(user):
    assert imp(user, "x" * 5_500_000, "application/xml").status_code == 400
