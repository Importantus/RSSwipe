import uuid
import pytest
from conftest import PASSWORD, Api, db, follow_and_wait, is_iso_date, new_email, wait_for, PUBLISHER

LIST_KEYS = ["id", "title", "imageUrl", "link", "publishedAt", "createdAt", "feed", "ArticleHasUser"]
DETAIL_KEYS = ["id", "title", "imageUrl", "link", "publishedAt", "createdAt", "feed",
               "read", "saved", "starred", "seen", "dateRead", "dateSaved", "dateStarred", "dateSeen"]


def second_user():
    o = Api()
    r = o.post("/v1/register", json={"name": "Reader", "email": new_email(), "password": PASSWORD}).json()
    o.token, o.id = r["token"], r["user"]["id"]
    return o


def test_article_list_shape(user):
    feed, arts = follow_and_wait(user)
    assert len(arts) == 3
    a = arts[0]
    assert list(a) == LIST_KEYS
    assert list(a["feed"]) == ["id", "title", "link", "faviconUrl"] and a["feed"]["id"] == feed["id"]
    assert a["ArticleHasUser"] == []
    assert is_iso_date(a["publishedAt"]) and is_iso_date(a["createdAt"])
    assert a["imageUrl"] == PUBLISHER + "/img/1.png".replace("1", a["link"].rsplit("/", 1)[1])
    pubs = [x["publishedAt"] for x in arts]
    assert pubs == sorted(pubs, reverse=True)


def test_limit_and_feed_filter(user):
    f1, _ = follow_and_wait(user, "/feed/rss.xml?n=3")
    f2, _ = follow_and_wait(user, "/feed/atom.xml?n=2", count=2)
    assert len(user.get("/v1/articles?limit=2").json()) == 2
    assert len(user.get("/v1/articles?limit=50").json()) >= 5
    only = user.get(f"/v1/articles?limit=50&feeds={f2['id']}").json()
    assert len(only) == 2 and {a["feed"]["id"] for a in only} == {f2["id"]}
    both = user.get(f"/v1/articles?limit=50&feeds[]={f1['id']}&feeds[]={f2['id']}").json()
    assert len(both) == 5
    both = user.get(f"/v1/articles?limit=50&feeds={f1['id']}&feeds={f2['id']}").json()
    assert len(both) == 5


def test_default_feed_scope_is_followed_feeds(user):
    other = second_user()
    follow_and_wait(other)
    assert user.get("/v1/articles?limit=50").json() == []


def test_feeds_filter_is_not_limited_to_followed_feeds(user):
    other = second_user()
    feed, arts = follow_and_wait(other)
    got = user.get(f"/v1/articles?limit=50&feeds={feed['id']}").json()
    assert {a["id"] for a in got} == {a["id"] for a in arts}


def test_date_filters(user):
    feed, arts = follow_and_wait(user)
    day = arts[0]["publishedAt"][:10]
    q = f"/v1/articles?limit=50&feeds={feed['id']}"
    assert len(user.get(q + f"&startDate={day}").json()) == 3
    assert user.get(q + "&startDate=2999-01-01").json() == []
    assert user.get(q + "&endDate=2000-01-01").json() == []
    assert len(user.get(q + "&endDate=2999-01-01").json()) == 3


@pytest.mark.parametrize("q", ["limit=", "startDate=2023-1-1", "startDate=2023-13-01", "startDate=2023-00-10", "startDate=2023-02-32",
                               "endDate=abc", "foo=1", "feeds[x]=1", "limit=" + "9" * 51])
def test_list_validation(user, q):
    assert user.get("/v1/articles?limit=5&" + q if not q.startswith("limit") else "/v1/articles?" + q).status_code == 400


def test_seen_articles_leave_the_feed(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    assert user.put(f"/v1/articles/{a}", json={"read": True}).status_code == 200
    ids = {x["id"] for x in user.get("/v1/articles?limit=50").json()}
    assert a in ids                       # read but not seen: still listed
    user.put(f"/v1/articles/{a}", json={"seen": True})
    ids = {x["id"] for x in user.get("/v1/articles?limit=50").json()}
    assert a not in ids and len(ids) == 2


def test_readers_of_article_are_listed(user):
    feed, arts = follow_and_wait(user)
    other = second_user()
    other.post("/v1/feeds", json={"url": feed["link"]})
    a = arts[0]["id"]
    other.put(f"/v1/articles/{a}", json={"read": True})
    mine = {x["id"]: x for x in user.get("/v1/articles?limit=50").json()}
    assert mine[a]["ArticleHasUser"] == [{"user": {"id": other.id, "name": "Reader"}}]
    theirs = {x["id"]: x for x in other.get("/v1/articles?limit=50").json()}
    assert theirs[a]["ArticleHasUser"] == []          # a user never sees themself


def test_article_detail_defaults_and_update(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    d = user.get(f"/v1/articles/{a}")
    assert d.status_code == 200
    b = d.json()
    assert list(b) == DETAIL_KEYS
    assert list(b["feed"]) == ["id", "title", "link", "faviconUrl", "description"]
    assert (b["read"], b["saved"], b["starred"], b["seen"]) == (False, False, False, False)
    assert (b["dateRead"], b["dateSaved"], b["dateStarred"], b["dateSeen"]) == (None, None, None, None)

    u = user.put(f"/v1/articles/{a}", json={"read": True, "seen": True, "saved": True})
    assert u.status_code == 200
    ub = u.json()
    assert (ub["read"], ub["seen"], ub["saved"], ub["starred"]) == (True, True, True, False)
    assert is_iso_date(ub["dateRead"]) and is_iso_date(ub["dateSeen"]) and is_iso_date(ub["dateSaved"]) and ub["dateStarred"] is None

    # turning a flag off keeps its date
    off = user.put(f"/v1/articles/{a}", json={"read": False}).json()
    assert off["read"] is False and off["dateRead"] == ub["dateRead"]


def test_marking_read_with_zero_read_expiry_unsaves(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    user.put("/v1/settings", json={"expTimeRead": 0})
    b = user.put(f"/v1/articles/{a}", json={"read": True, "saved": True}).json()
    assert b["read"] is True and b["saved"] is False


@pytest.mark.parametrize("body", [{"read": "yes"}, {"x": 1}, {"read": None}, [1]])
def test_article_update_validation(user, body):
    feed, arts = follow_and_wait(user)
    assert user.put(f"/v1/articles/{arts[0]['id']}", json=body).status_code == 400


def test_article_ids(user):
    assert user.get("/v1/articles/short").status_code == 400
    assert user.put("/v1/articles/short", json={}).status_code == 400
    assert user.get(f"/v1/articles/{uuid.uuid4()}").status_code == 404
    assert user.put(f"/v1/articles/{uuid.uuid4()}", json={"read": True}).status_code == 404
    assert user.get("/v1/articles/content").status_code == 400      # "content" is read as an id


def test_article_state_is_per_user(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    user.put(f"/v1/articles/{a}", json={"read": True})
    other = second_user()
    assert other.get(f"/v1/articles/{a}").json()["read"] is False


# --- content ---------------------------------------------------------------------------------
CONTENT_KEYS = ["title", "content", "textContent", "excerpt", "byline", "dir", "siteName", "lang", "length"]


def test_content_is_extracted_on_the_fly_and_cached(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    r = user.get(f"/v1/articles/{a}/content")
    assert r.status_code == 200, r.text
    c = r.json()["content"]
    assert list(c) == CONTENT_KEYS
    assert "Paragraph 0" in c["content"] and "Paragraph 0" in c["textContent"]
    assert c["lang"] == "en" and isinstance(c["length"], int) and c["length"] > 100
    assert db(f"SELECT status FROM ArticleContent WHERE articleId='{a}'") == "OK"
    assert user.get(f"/v1/articles/{a}/content").json()["content"]["textContent"] == c["textContent"]


def test_content_batch_only_returns_stored_content(user):
    feed, arts = follow_and_wait(user)
    # the feed parser stores content right after creating the article
    stored = wait_for(lambda: db(f"SELECT articleId FROM ArticleContent WHERE status='OK' AND articleId IN ('{arts[0]['id']}')"))
    assert stored
    ghost = str(uuid.uuid4())
    r = user.post("/v1/articles/content", json={"ids": [arts[0]["id"], ghost]})
    assert r.status_code == 200
    b = r.json()
    assert list(b) == [arts[0]["id"], ghost] and b[ghost] is None and list(b[arts[0]["id"]]) == CONTENT_KEYS


def test_content_failure_is_500_and_retry_is_limited(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    db(f"UPDATE Article SET link='{PUBLISHER}/missing' WHERE id='{a}'")
    db(f"DELETE FROM ArticleContent WHERE articleId='{a}'")
    r = user.get(f"/v1/articles/{a}/content")
    assert r.status_code == 500 and isinstance(r.json()["message"], str)
    assert db(f"SELECT status,attempts FROM ArticleContent WHERE articleId='{a}'") == "FAILED\t1"
    user.get(f"/v1/articles/{a}/content")            # inside the retry delay: no new attempt
    assert db(f"SELECT attempts FROM ArticleContent WHERE articleId='{a}'") == "1"
    db(f"UPDATE ArticleContent SET lastAttempt = NOW() - INTERVAL 7 HOUR WHERE articleId='{a}'")
    user.get(f"/v1/articles/{a}/content")
    assert db(f"SELECT attempts FROM ArticleContent WHERE articleId='{a}'") == "2"


def test_content_unknown_or_invalid_id(user):
    assert user.get(f"/v1/articles/{uuid.uuid4()}/content").status_code == 404
    assert user.get("/v1/articles/bad/content").status_code == 400


@pytest.mark.parametrize("body", [{}, {"ids": []}, {"ids": ["short"]}, {"ids": [str(uuid.uuid4())] * 51}, {"ids": "x"}, {"ids": [1]}, {"x": 1}])
def test_content_batch_validation(user, body):
    assert user.post("/v1/articles/content", json=body).status_code == 400


def test_content_batch_max_ids_boundary(user):
    r = user.post("/v1/articles/content", json={"ids": [str(uuid.uuid4()) for _ in range(50)]})
    assert r.status_code == 200 and len(r.json()) == 50


def test_articles_require_auth(anon):
    for m, p in (("get", "/v1/articles"), ("get", "/v1/articles/x"), ("put", "/v1/articles/x"), ("get", "/v1/articles/x/content"),
                 ("post", "/v1/articles/content")):
        assert getattr(anon, m)(p).status_code == 401
