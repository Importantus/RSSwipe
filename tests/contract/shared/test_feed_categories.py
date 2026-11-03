import uuid
from conftest import Api, PASSWORD, new_email


def make(user, name="Tech", **kw):
    r = user.post("/v1/feed-categories", json={"name": name, **kw})
    assert r.status_code == 201, r.text
    return r.json()


def test_empty_by_default(user):
    assert user.get("/v1/feed-categories").json() == []


def test_requires_auth(anon):
    assert anon.get("/v1/feed-categories").status_code == 401


def test_create_list_update_delete(user):
    c = make(user, "  Tech  ", color="blue")
    assert c["name"] == "Tech" and c["color"] == "blue" and c["feedIds"] == []
    assert user.get("/v1/feed-categories").json()[0]["id"] == c["id"]
    r = user.put(f"/v1/feed-categories/{c['id']}", json={"name": "News", "color": "rose"})
    assert r.status_code == 200 and r.json()["name"] == "News" and r.json()["color"] == "rose"
    assert user.delete(f"/v1/feed-categories/{c['id']}").status_code == 200
    assert user.get("/v1/feed-categories").json() == []
    assert user.delete(f"/v1/feed-categories/{c['id']}").status_code == 404


def test_validation(user):
    assert user.post("/v1/feed-categories", json={"name": ""}).status_code == 400
    assert user.post("/v1/feed-categories", json={"name": "   "}).status_code == 400
    assert user.post("/v1/feed-categories", json={"name": "x" * 31}).status_code == 400
    assert user.post("/v1/feed-categories", json={"name": "a", "color": "no spaces"}).status_code == 400
    assert user.post("/v1/feed-categories", json={"name": "a", "feedIds": ["nope"]}).status_code == 400


def test_name_is_unique_per_user(user):
    make(user, "Tech")
    assert user.post("/v1/feed-categories", json={"name": "Tech"}).status_code == 400
    other = make(user, "Other")
    assert user.put(f"/v1/feed-categories/{other['id']}", json={"name": "Tech"}).status_code == 400
    # another user may use the same name
    a = Api()
    r = a.post("/v1/register", json={"name": "B", "email": new_email(), "password": PASSWORD})
    a.token = r.json()["token"]
    assert a.post("/v1/feed-categories", json={"name": "Tech"}).status_code == 201


def test_feeds_in_categories(user, follow):
    f1, f2 = follow(path="/feed/rss.xml").json(), follow(path="/feed/atom.xml").json()
    c = make(user, "Tech", feedIds=[f1["id"]])
    assert c["feedIds"] == [f1["id"]]
    r = user.put(f"/v1/feed-categories/{c['id']}/feeds/{f2['id']}")
    assert sorted(r.json()["feedIds"]) == sorted([f1["id"], f2["id"]])
    assert user.put(f"/v1/feed-categories/{c['id']}/feeds/{f2['id']}").status_code == 200  # idempotent
    # a feed can be in several categories
    d = make(user, "News", feedIds=[f1["id"]])
    assert d["feedIds"] == [f1["id"]]
    r = user.delete(f"/v1/feed-categories/{c['id']}/feeds/{f1['id']}")
    assert r.json()["feedIds"] == [f2["id"]]
    r = user.put(f"/v1/feed-categories/{c['id']}", json={"feedIds": []})
    assert r.json()["feedIds"] == []


def test_unfollow_removes_membership(user, follow):
    f = follow().json()
    c = make(user, "Tech", feedIds=[f["id"]])
    assert user.delete(f"/v1/feeds/{f['id']}").status_code == 200
    assert user.get("/v1/feed-categories").json()[0]["feedIds"] == []
    assert user.get("/v1/feed-categories").json()[0]["id"] == c["id"]


def test_only_followed_feeds_and_own_categories(user, follow):
    other = Api()
    r = other.post("/v1/register", json={"name": "B", "email": new_email(), "password": PASSWORD})
    other.token = r.json()["token"]
    f = follow().json()
    assert other.post("/v1/feed-categories", json={"name": "x", "feedIds": [f["id"]]}).status_code == 400
    c = make(user, "Mine")
    assert other.put(f"/v1/feed-categories/{c['id']}", json={"name": "Hacked"}).status_code == 404
    assert other.delete(f"/v1/feed-categories/{c['id']}").status_code == 404
    assert other.put(f"/v1/feed-categories/{c['id']}/feeds/{f['id']}").status_code == 404
    assert user.put(f"/v1/feed-categories/{c['id']}/feeds/{uuid.uuid4()}").status_code == 400
