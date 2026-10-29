"""Black-box contract test harness.

Environment:
  BASE_URL       backend under test            (default http://localhost:18080)
  IMPL           ts | rust                     (default ts) - selects expectations in deviations/
  PUBLISHER      fake publisher as seen by the backend (default http://publisher:9000)
  COMPOSE_PROFILE_JOBS / DB container name are derived from the compose project `rsswipe-contract`.
"""
import os
import subprocess
import uuid

import httpx
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:18080")
IMPL = os.environ.get("IMPL", "ts")
PUBLISHER = os.environ.get("PUBLISHER", "http://publisher:9000")
COMPOSE = ["docker", "compose", "-f", os.path.join(os.path.dirname(__file__), "docker-compose.yml")]


def pytest_report_header(config):
    return f"contract target: {BASE_URL} (IMPL={IMPL})"


class Api:
    """Thin client; keeps the token and never raises on non-2xx."""

    def __init__(self, token=None):
        self.token = token
        self.c = httpx.Client(base_url=BASE_URL, timeout=60, follow_redirects=False)

    def request(self, method, path, auth=True, **kw):
        headers = kw.pop("headers", {})
        if auth and self.token:
            headers.setdefault("Authorization", f"Bearer {self.token}")
        return self.c.request(method, path, headers=headers, **kw)

    def get(self, path, **kw): return self.request("GET", path, **kw)
    def post(self, path, **kw): return self.request("POST", path, **kw)
    def put(self, path, **kw): return self.request("PUT", path, **kw)
    def delete(self, path, **kw): return self.request("DELETE", path, **kw)


def new_email():
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


PASSWORD = "correct-horse-battery"


@pytest.fixture(scope="session")
def anon():
    return Api()


@pytest.fixture
def user():
    """A freshly registered user with its own client."""
    a = Api()
    email = new_email()
    r = a.post("/v1/register", json={"name": "Tester", "email": email, "password": PASSWORD})
    assert r.status_code == 201, r.text
    a.token = r.json()["token"]
    a.email = email
    a.password = PASSWORD
    a.id = r.json()["user"]["id"]
    return a


def db(sql):
    """Run SQL against the test database, returns stdout (tab separated)."""
    out = subprocess.run(COMPOSE + ["exec", "-T", "db", "mariadb", "-uroot", "-ptest", "rsswipe", "-N", "-B", "-e", sql],
                         capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    return out.stdout.strip()


def run_job(kind):
    """Runs a one-shot job container (kind: feedparser | gc) and returns the CompletedProcess."""
    return subprocess.run(COMPOSE + ["--profile", f"{IMPL}-jobs", "run", "--rm", "-T", f"{IMPL}-{kind}"],
                          capture_output=True, text=True)


@pytest.fixture
def follow(user):
    """follow(url) -> response of POST /v1/feeds"""
    def _f(path="/feed/rss.xml", **body):
        return user.post("/v1/feeds", json={"url": PUBLISHER + path, **body})
    return _f


import base64, hashlib, hmac, json, time

JWT_SECRET = os.environ.get("JWT_SECRET", "contract-test-secret")


def forge_jwt(payload, secret=JWT_SECRET, alg="HS256"):
    """Creates a JWT the way jsonwebtoken would; used to prove token compatibility."""
    def b64(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    head = b64(json.dumps({"alg": alg, "typ": "JWT"}).encode())
    body = b64(json.dumps(payload).encode())
    if alg == "none":
        return f"{head}.{body}."
    digest = {"HS256": hashlib.sha256, "HS384": hashlib.sha384, "HS512": hashlib.sha512}[alg]
    sig = b64(hmac.new(secret.encode(), f"{head}.{body}".encode(), digest).digest())
    return f"{head}.{body}.{sig}"


def decode_jwt(token):
    body = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))


def fresh(path):
    """A feed url that is unique per test, so tests do not share Feed rows."""
    sep = "&" if "?" in path else "?"
    return f"{path}{sep}t={uuid.uuid4().hex[:10]}"


def wait_for(fn, timeout=40, interval=0.5):
    end = time.time() + timeout
    last = None
    while time.time() < end:
        last = fn()
        if last:
            return last
        time.sleep(interval)
    return last


def follow_and_wait(user, path="/feed/rss.xml?n=3", count=3, **body):
    """Follow a fresh feed and wait until the background parse stored `count` articles."""
    r = user.post("/v1/feeds", json={"url": PUBLISHER + fresh(path), **body})
    assert r.status_code == 200, r.text
    feed = r.json()
    arts = wait_for(lambda: (lambda a: a if len(a) >= count else None)(
        user.get(f"/v1/articles?limit=50&feeds={feed['id']}").json()))
    assert arts and len(arts) >= count, f"articles not stored in time: {arts}"
    return feed, arts


def is_iso_date(v):
    import re
    return isinstance(v, str) and re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z", v) is not None
