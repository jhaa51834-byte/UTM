"""Tests for the marketing tag validator (GA4 / Adobe / Tealium / GTM / Meta)."""
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(
    tempfile.gettempdir(), "utm_test.db")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.services.tag_validator import detect_tags

GA4 = '<script src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234"></script>' \
      '<script>gtag("config","G-ABC1234");</script>'
GTM = '<script>(function(){})();</script><!-- googletagmanager.com/gtm.js?id=GTM-ABCD12 -->'
UA = "<script src='https://www.google-analytics.com/analytics.js'></script>" \
     "<script>ga('create','UA-12345-1','auto');</script>"
ADOBE = '<script src="//assets.adobedtm.com/launch-EN123.min.js"></script>' \
        '<script>_satellite.pageBottom();</script><!-- AppMeasurement -->'
TEALIUM = '<script src="//tags.tiqcdn.com/utag/acme/main/prod/utag.js"></script>'
META = "<script>fbq('init','123456789012345');</script>" \
       "<script src='https://connect.facebook.net/en_US/fbevents.js'></script>"
DATALAYER = "<script>window.dataLayer = window.dataLayer || [];</script>"


def _find(report, key):
    return next(t for t in report.tags if t.key == key)


# ── Pure detection ───────────────────────────────────────────────────

def test_detect_ga4():
    r = detect_tags(GA4)
    ga4 = _find(r, "ga4")
    assert ga4.found and "G-ABC1234" in ga4.ids


def test_detect_gtm():
    r = detect_tags(GTM)
    gtm = _find(r, "gtm")
    assert gtm.found and "GTM-ABCD12" in gtm.ids


def test_detect_universal_analytics_warns():
    r = detect_tags(UA)
    ua = _find(r, "ua")
    assert ua.found and "UA-12345-1" in ua.ids
    assert any("deprecated" in rec.message.lower() for rec in r.recommendations)


def test_detect_adobe():
    r = detect_tags(ADOBE)
    assert _find(r, "adobe_launch").found
    assert _find(r, "adobe_analytics").found


def test_detect_tealium():
    assert _find(detect_tags(TEALIUM), "tealium").found


def test_detect_meta_pixel_id():
    r = detect_tags(META)
    pixel = _find(r, "meta_pixel")
    assert pixel.found and "123456789012345" in pixel.ids


def test_detect_data_layer():
    r = detect_tags(GTM + DATALAYER)
    assert any("dataLayer" in dl for dl in r.data_layers)


def test_empty_html_flags_missing_analytics():
    r = detect_tags("<html><body>nothing</body></html>")
    assert not any(t.found for t in r.tags)
    assert any(rec.level == "error" for rec in r.recommendations)
    assert r.score < 50


def test_utm_extracted_from_url():
    r = detect_tags("", "https://x.com/p?utm_source=google&utm_medium=cpc&foo=bar")
    assert r.utm_present
    assert r.utm_params["utm_source"] == "google"
    assert "foo" not in r.utm_params


def test_full_coverage_scores_high():
    r = detect_tags(GA4 + GTM + DATALAYER, "https://x.com/?utm_source=g")
    assert r.score >= 90


# ── Endpoint ─────────────────────────────────────────────────────────

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


def test_endpoint_validates_html(client):
    headers = _auth_headers(client)
    resp = client.post("/api/v1/validate-tags", headers=headers,
                       json={"html": GA4 + GTM, "url": "https://x.com/?utm_source=g"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["score"] > 0
    assert any(t["key"] == "ga4" and t["found"] for t in data["tags"])
    assert data["fetched"] is False


def test_endpoint_requires_input(client):
    headers = _auth_headers(client)
    assert client.post("/api/v1/validate-tags", headers=headers, json={}).status_code == 422


def test_endpoint_requires_auth(client):
    assert client.post("/api/v1/validate-tags", json={"html": GA4}).status_code == 401
