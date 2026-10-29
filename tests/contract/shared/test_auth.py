import time
import pytest
from conftest import Api, PASSWORD, db, decode_jwt, forge_jwt, new_email, is_iso_date

# bcrypt hashes produced by the TypeScript backend's node-bcrypt (cost 10)
LEGACY_HASH = "$2b$10$Vhy0KzRbnLh4eiI2MuJeUuOft8AEaKxlOa0p1YLEvpjbG7OYDL74y"      # "legacy-password"
LONG80_HASH = "$2b$10$/zyuLYN8K9CLsiX.zP3EOe3V8Grw.wpy58NDz06SIs85A7DzlhshG"       # "A" * 80 (node truncates at 72 bytes)
UMLAUT_HASH = "$2b$10$rqUmlIl0IcQZWPOkC2q76OoM.OVYqdC4kozrFOM/LUPoz4saUAmsq"       # "pässwörd-üß€"


def test_register_shape(anon):
    email = new_email()
    r = anon.post("/v1/register", json={"name": "Alice", "email": email, "password": PASSWORD})
    assert r.status_code == 201
    b = r.json()
    assert list(b) == ["token", "user"]
    assert list(b["user"]) == ["id", "name", "email", "createdAt"]
    assert b["user"]["name"] == "Alice" and b["user"]["email"] == email
    assert len(b["user"]["id"]) == 36 and is_iso_date(b["user"]["createdAt"])


def test_register_creates_default_settings(user):
    assert user.get("/v1/settings").json() == {"expTimeRead": 259200000, "expTimeUnread": -1}


def test_token_payload_and_lifetime(user):
    p = decode_jwt(user.token)
    assert p["id"] == user.id
    assert p["exp"] - p["iat"] == 365 * 86400  # JWT_EXPIRATION=365d like production


@pytest.mark.parametrize("body", [
    {}, {"name": "A", "email": "a@b.de"}, {"email": "a@b.de", "password": PASSWORD},
    {"name": "A", "email": "a@b.de", "password": "short"}, {"name": "A", "email": "a@b.de", "password": "x" * 101},
    {"name": "", "email": "a@b.de", "password": PASSWORD}, {"name": "x" * 31, "email": "a@b.de", "password": PASSWORD},
    {"name": "A", "email": "no-at-sign", "password": PASSWORD}, {"name": 5, "email": "a@b.de", "password": PASSWORD},
    {"name": "A", "email": "a@b.de", "password": PASSWORD, "extra": 1}, [1, 2],
])
def test_register_validation(anon, body):
    r = anon.post("/v1/register", json=body)
    assert r.status_code == 400
    assert isinstance(r.json()["message"], str)


def test_register_boundaries(anon):
    ok = anon.post("/v1/register", json={"name": "x" * 30, "email": new_email(), "password": "x" * 100})
    assert ok.status_code == 201
    ok = anon.post("/v1/register", json={"name": "x", "email": new_email(), "password": "x" * 8})
    assert ok.status_code == 201


def test_register_duplicate_email_is_case_insensitive(anon, user):
    for email in (user.email, user.email.upper()):
        r = anon.post("/v1/register", json={"name": "Dup", "email": email, "password": PASSWORD})
        assert r.status_code == 400


def test_login(anon, user):
    r = anon.post("/v1/login", json={"email": user.email, "password": PASSWORD})
    assert r.status_code == 200
    assert list(r.json()) == ["token"]
    assert decode_jwt(r.json()["token"])["id"] == user.id


def test_login_email_is_case_insensitive(anon, user):
    assert anon.post("/v1/login", json={"email": user.email.upper(), "password": PASSWORD}).status_code == 200


def test_login_urlencoded_form_is_accepted(anon, user):
    r = anon.post("/v1/login", data={"email": user.email, "password": PASSWORD})
    assert r.status_code == 200


@pytest.mark.parametrize("email,pw", [("nobody@example.com", PASSWORD), (None, "wrong-password")])
def test_login_failure_is_always_401(anon, user, email, pw):
    r = anon.post("/v1/login", json={"email": email or user.email, "password": pw})
    assert r.status_code == 401
    assert r.json()["message"] == "Not authorized"


@pytest.mark.parametrize("body", [{}, {"email": "a@b.de"}, {"password": PASSWORD}, {"email": "x", "password": PASSWORD},
                                  {"email": "a@b.de", "password": "short"}, {"email": "a@b.de", "password": PASSWORD, "x": 1}])
def test_login_validation(anon, body):
    assert anon.post("/v1/login", json=body).status_code == 400


# --- token handling ------------------------------------------------------------------
def test_missing_or_garbage_token(anon):
    for h in ({}, {"Authorization": "Bearer"}, {"Authorization": "Bearer garbage"}, {"Authorization": "tokenwithoutspace"},
              {"Authorization": ""}):
        r = anon.get("/v1/user", headers=h)
        assert r.status_code == 401, h
        assert r.json()["message"] == "Not authorized"


def test_forged_token_with_shared_secret_is_accepted(anon, user):
    now = int(time.time())
    t = forge_jwt({"id": user.id, "iat": now, "exp": now + 3600})
    assert anon.get("/v1/user", headers={"Authorization": f"Bearer {t}"}).json()["id"] == user.id


@pytest.mark.parametrize("alg", ["HS256", "HS384", "HS512"])
def test_hmac_algorithms_are_accepted(anon, user, alg):
    now = int(time.time())
    t = forge_jwt({"id": user.id, "iat": now, "exp": now + 3600}, alg=alg)
    assert anon.get("/v1/user", headers={"Authorization": f"Bearer {t}"}).status_code == 200


def test_authorization_scheme_is_not_checked(anon, user):
    assert anon.get("/v1/user", headers={"Authorization": f"Whatever {user.token}"}).status_code == 200


def test_rejected_tokens(anon, user):
    now = int(time.time())
    bad = {
        "expired": forge_jwt({"id": user.id, "iat": now - 7200, "exp": now - 3600}),
        "wrong secret": forge_jwt({"id": user.id, "iat": now, "exp": now + 3600}, secret="other"),
        "alg none": forge_jwt({"id": user.id, "iat": now, "exp": now + 3600}, alg="none"),
    }
    for name, t in bad.items():
        assert anon.get("/v1/user", headers={"Authorization": f"Bearer {t}"}).status_code == 401, name


# --- compatibility with existing password hashes ------------------------------------
@pytest.fixture
def legacy_user():
    uid, email = f"legacy-{new_email()[5:17]}-0000-0000-0000-000000000000"[:36], new_email()
    db(f"INSERT INTO User (id,name,email,password) VALUES ('{uid}','Legacy','{email}','{LEGACY_HASH}')")
    db(f"INSERT INTO Settings (id,expTimeRead,expTimeUnread,userId) VALUES (UUID(),1000,-1,'{uid}')")
    return uid, email


def test_login_with_hash_created_by_typescript_backend(anon, legacy_user):
    uid, email = legacy_user
    r = anon.post("/v1/login", json={"email": email, "password": "legacy-password"})
    assert r.status_code == 200
    assert decode_jwt(r.json()["token"])["id"] == uid
    assert anon.post("/v1/login", json={"email": email, "password": "legacy-passworD"}).status_code == 401


@pytest.mark.parametrize("h,pw,ok", [
    (LONG80_HASH, "A" * 80, True), (LONG80_HASH, "A" * 72, True), (LONG80_HASH, "A" * 71, False),
    (UMLAUT_HASH, "pässwörd-üß€", True), (UMLAUT_HASH, "passwoerd-uess", False)])
def test_bcrypt_edge_cases(anon, h, pw, ok):
    email = new_email()
    db(f"INSERT INTO User (id,name,email,password) VALUES (UUID(),'E','{email}','{h}')")
    assert (anon.post("/v1/login", json={"email": email, "password": pw}).status_code == 200) is ok


def test_new_password_hashes_use_bcrypt_2b_cost_10(user):
    h = db(f"SELECT password FROM User WHERE id='{user.id}'")
    assert h.startswith("$2b$10$") and len(h) == 60


# --- /user -------------------------------------------------------------------------------
def test_get_user(user):
    r = user.get("/v1/user")
    assert r.status_code == 200
    assert list(r.json()) == ["id", "name", "email", "createdAt"]
    assert r.json()["id"] == user.id


def test_update_name_and_email(user):
    new = new_email()
    r = user.put("/v1/user", json={"name": "Renamed", "email": new})
    assert r.status_code == 200 and r.json()["name"] == "Renamed" and r.json()["email"] == new
    assert Api().post("/v1/login", json={"email": new, "password": PASSWORD}).status_code == 200


def test_update_empty_body_is_noop(user):
    assert user.put("/v1/user", json={}).status_code == 200


def test_update_email_taken(user, anon):
    other = Api()
    email = new_email()
    other.post("/v1/register", json={"name": "O", "email": email, "password": PASSWORD})
    assert user.put("/v1/user", json={"email": email}).status_code == 400
    assert user.put("/v1/user", json={"email": user.email}).status_code == 200  # own email is fine


def test_update_password_requires_correct_old_password(user, anon):
    assert user.put("/v1/user", json={"password": "new-password-1"}).status_code == 403
    assert user.put("/v1/user", json={"password": "new-password-1", "oldPassword": "wrong-password"}).status_code == 403
    assert user.put("/v1/user", json={"password": "new-password-1", "oldPassword": PASSWORD}).status_code == 200
    assert anon.post("/v1/login", json={"email": user.email, "password": "new-password-1"}).status_code == 200
    assert anon.post("/v1/login", json={"email": user.email, "password": PASSWORD}).status_code == 401


@pytest.mark.parametrize("body", [{"name": ""}, {"name": "x" * 31}, {"email": "nope"}, {"password": "short"}, {"x": 1}])
def test_update_validation(user, body):
    assert user.put("/v1/user", json=body).status_code == 400


def test_delete_user(user, anon):
    assert user.request("DELETE", "/v1/user", json={}).status_code == 400
    assert user.request("DELETE", "/v1/user", json={"password": "wrong-password"}).status_code == 403
    r = user.request("DELETE", "/v1/user", json={"password": PASSWORD})
    assert r.status_code == 200 and r.json() == {"message": "User deleted"}
    # the token stays valid (user existence is not checked), but the data is gone
    g = user.get("/v1/user")
    assert g.status_code == 404 and g.json()["message"] == "Not found"
    assert anon.post("/v1/login", json={"email": user.email, "password": PASSWORD}).status_code == 401
    assert db(f"SELECT COUNT(*) FROM Settings WHERE userId='{user.id}'") == "0"
