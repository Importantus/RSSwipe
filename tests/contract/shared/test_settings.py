import pytest


def test_get_settings(user):
    r = user.get("/v1/settings")
    assert r.status_code == 200 and list(r.json()) == ["expTimeRead", "expTimeUnread"]


def test_update_settings(user):
    r = user.put("/v1/settings", json={"expTimeRead": 1000, "expTimeUnread": 5000})
    assert r.status_code == 200 and r.json() == {"expTimeRead": 1000, "expTimeUnread": 5000}
    assert user.put("/v1/settings", json={"expTimeRead": -1}).json() == {"expTimeRead": -1, "expTimeUnread": 5000}
    assert user.put("/v1/settings", json={}).json() == {"expTimeRead": -1, "expTimeUnread": 5000}


@pytest.mark.parametrize("body", [{"expTimeRead": "1"}, {"expTimeUnread": None}, {"x": 1}, {"expTimeRead": True}])
def test_update_settings_validation(user, body):
    assert user.put("/v1/settings", json=body).status_code == 400


def test_requires_auth(anon):
    assert anon.get("/v1/settings").status_code == 401
    assert anon.put("/v1/settings", json={}).status_code == 401
