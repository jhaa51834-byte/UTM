"""Tests for the Smart Deep Linking Engine.

Unit tests cover the pure decision logic (platform detection, intent-URL
construction, interstitial rendering, fingerprinting). Integration tests drive
the redirect: Android -> app/intent, iOS -> app/store, Desktop -> website.
"""
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(
    tempfile.gettempdir(), "utm_test.db")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.services.deep_link import (
    build_intent_url, build_interstitial_html, choose_targets,
    detect_platform, device_fingerprint,
)

ANDROID_UA = ("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
IOS_UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
          "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
DESKTOP_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")


# ════════════════════════════════════════════════════════════════════
# Unit tests
# ════════════════════════════════════════════════════════════════════

def test_detect_platform():
    assert detect_platform(ANDROID_UA) == "android"
    assert detect_platform(IOS_UA) == "ios"
    assert detect_platform(DESKTOP_UA) == "desktop"
    assert detect_platform("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)") == "ios"
    assert detect_platform("") == "desktop"


def test_device_fingerprint_deterministic():
    a = device_fingerprint("1.2.3.4", ANDROID_UA)
    assert a == device_fingerprint("1.2.3.4", ANDROID_UA)
    assert a != device_fingerprint("9.9.9.9", ANDROID_UA)
    assert a != device_fingerprint("1.2.3.4", IOS_UA)


def test_build_intent_url():
    url = build_intent_url("acmeapp://product/123", "com.acme.app",
                           "https://play.google.com/store/apps/details?id=com.acme.app")
    assert url.startswith("intent://product/123#Intent;")
    assert "scheme=acmeapp;" in url
    assert "package=com.acme.app;" in url
    assert "S.browser_fallback_url=" in url
    assert url.endswith(";end")


class FakeConfig:
    def __init__(self, **kw):
        self.android_package_name = kw.get("android_package_name", "")
        self.android_deep_link = kw.get("android_deep_link", "")
        self.play_store_url = kw.get("play_store_url", "")
        self.ios_deep_link = kw.get("ios_deep_link", "")
        self.app_store_url = kw.get("app_store_url", "")


def test_choose_targets():
    cfg = FakeConfig(
        android_package_name="com.acme.app",
        android_deep_link="acmeapp://p/1",
        play_store_url="https://play.google.com/x",
        ios_deep_link="acmeapp://p/1",
        app_store_url="https://apps.apple.com/x",
    )
    a_app, a_store = choose_targets(cfg, "android")
    assert a_app.startswith("intent://") and a_store == "https://play.google.com/x"
    i_app, i_store = choose_targets(cfg, "ios")
    assert i_app == "acmeapp://p/1" and i_store == "https://apps.apple.com/x"
    assert choose_targets(cfg, "desktop") == ("", "")


def test_choose_targets_store_only():
    cfg = FakeConfig(play_store_url="https://play.google.com/x")
    app_t, store = choose_targets(cfg, "android")
    assert app_t == "https://play.google.com/x" and store == "https://play.google.com/x"


def test_interstitial_html():
    html = build_interstitial_html("acmeapp://p/1", "https://apps.apple.com/x", "ios")
    assert "noindex" in html
    assert "acmeapp://p/1" in html
    assert "apps.apple.com" in html
    assert "location.replace" in html


# ════════════════════════════════════════════════════════════════════
# Integration tests
# ════════════════════════════════════════════════════════════════════

@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _auth_headers(client) -> dict:
    import uuid
    suffix = uuid.uuid4().hex[:8]
    resp = client.post("/api/v1/auth/register", json={
        "email": f"user_{suffix}@test.io", "password": "Sup3rSecret!",
        "full_name": "Test User", "org_name": f"Acme {suffix}",
    })
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _create_link(client, headers, dest="https://fallback.example.com/landing") -> dict:
    resp = client.post("/api/v1/links", headers=headers, json={
        "destination_url": dest, "title": "App link",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


FULL_CONFIG = {
    "android_package_name": "com.acme.app",
    "android_deep_link": "acmeapp://product/123",
    "play_store_url": "https://play.google.com/store/apps/details?id=com.acme.app",
    "ios_bundle_id": "com.acme.app",
    "ios_deep_link": "acmeapp://product/123",
    "app_store_url": "https://apps.apple.com/app/id123456",
    "desktop_url": "https://acme.com/product/123",
    "deferred": True,
}


def test_deeplink_upsert_and_get(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)

    put = client.put(f"/api/v1/links/{link['id']}/deeplink", headers=headers, json=FULL_CONFIG)
    assert put.status_code == 200, put.text
    assert put.json()["android_package_name"] == "com.acme.app"

    # Upsert again (replace) — still one config
    put2 = client.put(f"/api/v1/links/{link['id']}/deeplink", headers=headers,
                      json={**FULL_CONFIG, "desktop_url": "https://acme.com/v2"})
    assert put2.status_code == 200
    got = client.get(f"/api/v1/links/{link['id']}/deeplink", headers=headers).json()
    assert got["desktop_url"] == "https://acme.com/v2"


def test_deeplink_validation(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)
    # No platform configured
    bad = client.put(f"/api/v1/links/{link['id']}/deeplink", headers=headers, json={})
    assert bad.status_code == 422
    # App link must be a URI
    bad2 = client.put(f"/api/v1/links/{link['id']}/deeplink", headers=headers,
                      json={"android_deep_link": "notauri"})
    assert bad2.status_code == 422


def test_deeplink_redirect_per_platform(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)
    code = link["short_code"]
    client.put(f"/api/v1/links/{link['id']}/deeplink", headers=headers, json=FULL_CONFIG)

    # Android -> interstitial with intent URL + package
    a = client.get(f"/r/{code}", headers={"user-agent": ANDROID_UA}, follow_redirects=False)
    assert a.status_code == 200
    assert "intent://" in a.text and "com.acme.app" in a.text

    # iOS -> interstitial with app scheme + App Store fallback
    i = client.get(f"/r/{code}", headers={"user-agent": IOS_UA}, follow_redirects=False)
    assert i.status_code == 200
    assert "acmeapp://product/123" in i.text and "apps.apple.com" in i.text

    # Desktop -> explicit website (302)
    d = client.get(f"/r/{code}", headers={"user-agent": DESKTOP_UA}, follow_redirects=False)
    assert d.status_code == 302
    assert d.headers["location"].startswith("https://acme.com/product/123")


def test_deeplink_desktop_falls_through_without_desktop_url(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers, dest="https://fallback.example.com/home")
    code = link["short_code"]
    client.put(f"/api/v1/links/{link['id']}/deeplink", headers=headers, json={
        "android_deep_link": "acmeapp://x", "play_store_url": "https://play.google.com/x",
        "desktop_url": "",
    })
    d = client.get(f"/r/{code}", headers={"user-agent": DESKTOP_UA}, follow_redirects=False)
    assert d.status_code == 302
    assert d.headers["location"].startswith("https://fallback.example.com/home")


def test_deeplink_org_isolation(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)
    client.put(f"/api/v1/links/{link['id']}/deeplink", headers=headers, json=FULL_CONFIG)

    other = _auth_headers(client)
    assert client.get(f"/api/v1/links/{link['id']}/deeplink", headers=other).status_code == 404
    assert client.delete(f"/api/v1/links/{link['id']}/deeplink", headers=other).status_code == 404


def test_deferred_resolve_graceful_without_redis(client):
    # No Redis in the test env -> endpoint must degrade to found=false, not error.
    resp = client.get("/api/v1/deeplink/resolve", headers={"user-agent": ANDROID_UA})
    assert resp.status_code == 200
    assert resp.json()["found"] is False
