import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(
    tempfile.gettempdir(), "utm_test.db")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.services.governance import seed_default_rules


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_default_rules(db)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_generate_endpoint(client):
    resp = client.post("/api/generate-utm", json={
        "base_url": "https://example.com/product",
        "utm_source": "google", "utm_medium": "cpc",
        "utm_campaign": "summer_sale_2026", "utm_content": "banner_1"})
    data = resp.json()
    assert resp.status_code == 200
    assert data["final_url"] == (
        "https://example.com/product?utm_source=google&utm_medium=cpc"
        "&utm_campaign=summer_sale_2026&utm_content=banner_1")
    assert data["blocked"] is False
    assert data["history_id"] is not None


def test_governance_blocks_google_email(client):
    resp = client.post("/api/generate-utm", json={
        "base_url": "https://example.com",
        "utm_source": "google", "utm_medium": "email",
        "utm_campaign": "test"})
    data = resp.json()
    assert data["blocked"] is True
    assert any(i["code"] == "governance_violation" for i in data["issues"])


def test_force_overrides_governance(client):
    resp = client.post("/api/generate-utm", json={
        "base_url": "https://example.com",
        "utm_source": "google", "utm_medium": "email",
        "utm_campaign": "test", "force": True})
    assert resp.json()["final_url"]


def test_validate_endpoint(client):
    resp = client.post("/api/validate", json={
        "base_url": "https://example.com", "utm_source": "", "utm_medium": ""})
    data = resp.json()
    assert data["valid"] is False


def test_history_records_and_filters(client):
    client.post("/api/generate-utm", json={
        "base_url": "https://example.com", "utm_source": "google",
        "utm_medium": "cpc", "utm_campaign": "alpha"},
        headers={"X-User": "priya"})
    client.post("/api/generate-utm", json={
        "base_url": "https://example.com", "utm_source": "email",
        "utm_medium": "email", "utm_campaign": "beta"})
    assert len(client.get("/api/history").json()) == 2
    assert len(client.get("/api/history", params={"source": "google"}).json()) == 1
    assert client.get("/api/history", params={"q": "beta"}).json()[0]["utm_campaign"] == "beta"


def test_template_roundtrip(client):
    resp = client.post("/api/save-template", json={
        "name": "LinkedIn Lead Gen", "utm_source": "linkedin",
        "utm_medium": "paid_social"})
    assert resp.status_code == 200
    templates = client.get("/api/templates").json()
    assert templates[0]["name"] == "LinkedIn Lead Gen"


def test_governance_rules_require_admin(client):
    payload = {"name": "x", "match_field": "utm_source", "match_value": "bing",
               "required_field": "utm_medium", "allowed_values": ["cpc"]}
    assert client.post("/api/governance-rules", json=payload).status_code == 403
    assert client.post("/api/governance-rules", json=payload,
                       headers={"X-Role": "admin"}).status_code == 200


def test_bulk_generate(client):
    csv_data = ("URL,Source,Medium,Campaign,Content,Term\n"
                "https://example.com/a,google,cpc,sale,,\n"
                "https://example.com/b,email,email,newsletter,top,\n"
                "notaurl,google,cpc,bad,,\n")
    resp = client.post("/api/bulk-generate",
                       files={"file": ("test.csv", csv_data, "text/csv")})
    data = resp.json()
    assert data["total"] == 3 and data["ok"] == 2
    assert data["rows"][0]["final_url"].startswith("https://example.com/a?utm_source=google")
    assert data["rows"][2]["status"] == "error"


def test_qr_endpoint(client):
    resp = client.get("/api/qr", params={"url": "https://example.com/p?utm_source=x"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    svg = client.get("/api/qr", params={"url": "https://example.com/p?utm_source=x",
                                        "fmt": "svg"})
    assert svg.headers["content-type"].startswith("image/svg")


def test_ai_suggest_rules_engine(client):
    resp = client.post("/api/ai-suggest", json={
        "description": "LinkedIn campaign for healthcare professionals in India"})
    data = resp.json()
    assert data["utm_source"] == "linkedin"
    assert data["utm_medium"] == "paid_social"
    assert "healthcare" in data["utm_campaign"] and "india" in data["utm_campaign"]
    assert data["needs_approval"] is True
