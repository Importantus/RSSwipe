import uuid
import pytest
from conftest import db, follow_and_wait, is_iso_date

LIST_ITEM_KEYS = ["id", "title", "imageUrl", "link", "publishedAt", "createdAt", "feed",
                  "read", "saved", "starred", "seen", "dateRead", "dateSaved", "dateStarred", "dateSeen"]


def ids(lst): return {a["id"] for a in lst}


# --- reading list ------------------------------------------------------------------------------
def test_readinglist_add_list_remove(user):
    feed, arts = follow_and_wait(user)
    a, b = arts[0]["id"], arts[1]["id"]
    assert user.get("/v1/readinglist").json() == []
    r = user.post("/v1/readinglist/articles", json={"id": a})
    assert r.status_code == 200 and r.json() == {"message": "Article added to reading list"}
    user.post("/v1/readinglist/articles", json={"id": b})
    lst = user.get("/v1/readinglist").json()
    assert ids(lst) == {a, b} and list(lst[0]) == LIST_ITEM_KEYS
    assert list(lst[0]["feed"]) == ["id", "title", "link", "faviconUrl"]
    assert all(x["saved"] is True and is_iso_date(x["dateSaved"]) for x in lst)

    r = user.request("DELETE", "/v1/readinglist/articles", json={"id": a})
    assert r.status_code == 200 and r.json() == {"message": "Article deleted from reading list"}
    assert ids(user.get("/v1/readinglist").json()) == {b}


def test_readinglist_clear(user):
    feed, arts = follow_and_wait(user)
    for a in arts:
        user.post("/v1/readinglist/articles", json={"id": a["id"]})
    user.put(f"/v1/articles/{arts[0]['id']}", json={"read": True})
    user.put("/v1/settings", json={"expTimeRead": -1, "expTimeUnread": -1})
    r = user.request("DELETE", "/v1/readinglist", json={"onlyRead": True})
    assert r.status_code == 200 and r.json() == {"message": "Reading list cleared"}
    assert ids(user.get("/v1/readinglist").json()) == ids(arts[1:])
    user.request("DELETE", "/v1/readinglist", json={"onlyRead": False})
    assert user.get("/v1/readinglist").json() == []
    # clearing also resets dateSaved
    assert db(f"SELECT COUNT(*) FROM ArticleList WHERE userId='{user.id}' AND dateSaved IS NOT NULL AND saved=0") == "0"


def test_readinglist_hides_expired_entries(user):
    feed, arts = follow_and_wait(user)
    a, b, c = (x["id"] for x in arts)
    for x in (a, b, c):
        user.post("/v1/readinglist/articles", json={"id": x})
    user.put(f"/v1/articles/{a}", json={"read": True})
    user.put("/v1/settings", json={"expTimeRead": 3600_000, "expTimeUnread": 3600_000})
    assert ids(user.get("/v1/readinglist").json()) == {a, b, c}
    db(f"UPDATE ArticleList SET dateRead = NOW() - INTERVAL 2 HOUR WHERE userId='{user.id}' AND articleId='{a}'")
    db(f"UPDATE ArticleList SET dateSaved = NOW() - INTERVAL 2 HOUR WHERE userId='{user.id}' AND articleId='{b}'")
    assert ids(user.get("/v1/readinglist").json()) == {c}


def test_readinglist_sql_null_semantics(user):
    """NOT (read AND dateRead < x) is NULL when dateRead is NULL, so such rows disappear. Kept as-is."""
    feed, arts = follow_and_wait(user)
    a, b = arts[0]["id"], arts[1]["id"]
    user.post("/v1/readinglist/articles", json={"id": a})
    user.post("/v1/readinglist/articles", json={"id": b})
    user.put("/v1/settings", json={"expTimeRead": 3600_000, "expTimeUnread": 3600_000})
    db(f"UPDATE ArticleList SET `read`=1, dateRead=NULL WHERE userId='{user.id}' AND articleId='{a}'")
    db(f"UPDATE ArticleList SET dateSaved=NULL WHERE userId='{user.id}' AND articleId='{b}'")
    assert user.get("/v1/readinglist").json() == []


def test_readinglist_validation(user):
    assert user.post("/v1/readinglist/articles", json={}).status_code == 400
    assert user.post("/v1/readinglist/articles", json={"id": "short"}).status_code == 400
    assert user.post("/v1/readinglist/articles", json={"id": str(uuid.uuid4())}).status_code == 404
    assert user.request("DELETE", "/v1/readinglist/articles", json={"id": str(uuid.uuid4())}).status_code == 404
    assert user.request("DELETE", "/v1/readinglist", json={}).status_code == 400
    assert user.request("DELETE", "/v1/readinglist", json={"onlyRead": "yes"}).status_code == 400


def test_readinglist_is_per_user(user):
    feed, arts = follow_and_wait(user)
    user.post("/v1/readinglist/articles", json={"id": arts[0]["id"]})
    from shared.test_articles import second_user
    assert second_user().get("/v1/readinglist").json() == []


# --- starred -------------------------------------------------------------------------------------
def test_star_and_unstar(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    user.put(f"/v1/articles/{a}", json={"seen": True})          # an ArticleList row must exist
    assert user.get("/v1/starred").json() == []
    r = user.post("/v1/starred/articles", json={"id": a})
    assert r.status_code == 200 and r.json()["id"] == a and list(r.json()) == [
        "id", "title", "imageUrl", "link", "publishedAt", "createdAt", "feed",
        "read", "saved", "starred", "seen", "dateRead", "dateSaved", "dateStarred", "dateSeen"]
    st = user.get("/v1/starred").json()
    assert ids(st) == {a} and st[0]["starred"] is True and is_iso_date(st[0]["dateStarred"])

    assert user.post("/v1/starred/articles", json={"id": a}).status_code == 400      # already starred
    assert user.request("DELETE", "/v1/starred/articles", json={"id": a}).status_code == 200
    assert user.request("DELETE", "/v1/starred/articles", json={"id": a}).status_code == 400   # already unstarred
    assert user.get("/v1/starred").json() == []


def test_star_needs_existing_list_entry(user):
    feed, arts = follow_and_wait(user)
    assert user.post("/v1/starred/articles", json={"id": arts[0]["id"]}).status_code == 400
    assert user.post("/v1/starred/articles", json={"id": str(uuid.uuid4())}).status_code == 400


def test_star_validation(user):
    assert user.post("/v1/starred/articles", json={}).status_code == 400
    assert user.post("/v1/starred/articles", json={"id": "short"}).status_code == 400
    assert user.post("/v1/starred/articles").status_code == 400
    assert user.request("DELETE", "/v1/starred/articles", json={"id": 5}).status_code == 400


def test_star_path_param_is_ignored(user):
    feed, arts = follow_and_wait(user)
    a = arts[0]["id"]
    user.put(f"/v1/articles/{a}", json={"seen": True})
    assert user.post("/v1/starred/anything", json={"id": a}).status_code == 200
    assert ids(user.get("/v1/starred").json()) == {a}


# --- statistics ----------------------------------------------------------------------------------
def test_statistics_shape_and_counts(user):
    feed, arts = follow_and_wait(user)
    a, b = arts[0]["id"], arts[1]["id"]
    user.put(f"/v1/articles/{a}", json={"read": True, "seen": True, "saved": True})
    user.put(f"/v1/articles/{b}", json={"seen": True})
    user.post("/v1/starred/articles", json={"id": a})
    s = user.get("/v1/statistics/recent").json()
    assert list(s) == ["dateSince", "totalSeen", "totalRead", "totalStarred", "totalSaved", "days", "feeds"]
    assert (s["totalSeen"], s["totalRead"], s["totalStarred"], s["totalSaved"]) == (2, 1, 1, 1)
    assert len(s["days"]) == 7 and list(s["days"][0]) == ["date", "seen", "read", "starred", "saved"]
    assert is_iso_date(s["dateSince"]) and is_iso_date(s["days"][0]["date"])
    assert s["days"][0]["seen"] == 2 and sum(d["seen"] for d in s["days"]) == 2
    dates = [d["date"] for d in s["days"]]
    assert dates == sorted(dates, reverse=True)           # newest first, one per day
    assert s["feeds"] == [{"feedId": feed["id"], "faviconUrl": feed["faviconUrl"] or s["feeds"][0]["faviconUrl"],
                           "title": "Fixture RSS", "read": 1}]


def test_statistics_empty_user(user):
    s = user.get("/v1/statistics/recent").json()
    assert (s["totalSeen"], s["totalRead"], s["feeds"]) == (0, 0, [])
    assert len(s["days"]) == 7


def test_lists_require_auth(anon):
    for p in ("/v1/readinglist", "/v1/starred", "/v1/feed-categories", "/v1/statistics/recent"):
        assert anon.get(p).status_code == 401
