"""Tests for the smart-redirect engine and A/B testing.

Unit tests cover the pure decision logic (rule evaluation, weighted variant
selection, UTM merging). Integration tests drive the full HTTP stack:
register -> create link -> attach rules / A-B test -> hit the redirect.
"""
import os
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(
    tempfile.gettempdir(), "utm_test.db")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.services.ab_testing import pick_variant
from app.services.smart_redirect import (
    ClickContext, build_context, evaluate_rules, merge_link_utms,
    parse_accept_language, rule_matches,
)


# ════════════════════════════════════════════════════════════════════
# Unit tests — smart redirect rule evaluation
# ════════════════════════════════════════════════════════════════════

@dataclass
class FakeRule:
    conditions: list
    destination_url: str = "https://x.test/"
    priority: int = 100
    is_active: bool = True
    id: str = "rule"
    created_at: str = ""


def _ctx(**kw) -> ClickContext:
    base = dict(country_code="in", device_type="mobile", browser="chrome",
                os="android", language="en", hour=15, weekday=2, date="2026-06-17")
    base.update(kw)
    return ClickContext(**base)


def test_equals_match_is_case_insensitive():
    rule = FakeRule([{"field": "country_code", "operator": "equals", "value": "IN"}])
    assert evaluate_rules([rule], _ctx()) is rule


def test_equals_no_match_returns_none():
    rule = FakeRule([{"field": "country_code", "operator": "equals", "value": "US"}])
    assert evaluate_rules([rule], _ctx()) is None


def test_in_operator():
    rule = FakeRule([{"field": "device_type", "operator": "in", "value": ["mobile", "tablet"]}])
    assert evaluate_rules([rule], _ctx()) is rule
    assert evaluate_rules([rule], _ctx(device_type="desktop")) is None


def test_contains_operator():
    rule = FakeRule([{"field": "browser", "operator": "contains", "value": "chro"}])
    assert evaluate_rules([rule], _ctx()) is rule


def test_conditions_are_anded():
    rule = FakeRule([
        {"field": "country_code", "operator": "equals", "value": "in"},
        {"field": "device_type", "operator": "equals", "value": "desktop"},
    ])
    # country matches but device does not -> rule fails
    assert evaluate_rules([rule], _ctx()) is None
    assert evaluate_rules([rule], _ctx(device_type="desktop")) is rule


def test_priority_ordering_first_match_wins():
    low = FakeRule([{"field": "country_code", "operator": "equals", "value": "in"}],
                   destination_url="https://low/", priority=10)
    high = FakeRule([{"field": "country_code", "operator": "equals", "value": "in"}],
                    destination_url="https://high/", priority=200)
    matched = evaluate_rules([high, low], _ctx())
    assert matched is low  # lower priority value evaluated first


def test_inactive_rules_are_skipped():
    rule = FakeRule([{"field": "country_code", "operator": "equals", "value": "in"}],
                    is_active=False)
    assert evaluate_rules([rule], _ctx()) is None


def test_numeric_hour_between():
    rule = FakeRule([{"field": "hour", "operator": "between", "value": [9, 17]}])
    assert evaluate_rules([rule], _ctx(hour=15)) is rule
    assert evaluate_rules([rule], _ctx(hour=3)) is None


def test_weekday_name_alias():
    rule = FakeRule([{"field": "weekday", "operator": "equals", "value": "wed"}])
    assert evaluate_rules([rule], _ctx(weekday=2)) is rule  # Wed == 2


def test_date_between_lexicographic():
    rule = FakeRule([{"field": "date", "operator": "between",
                      "value": ["2026-06-01", "2026-06-30"]}])
    assert evaluate_rules([rule], _ctx(date="2026-06-17")) is rule
    assert evaluate_rules([rule], _ctx(date="2026-07-01")) is None


def test_malformed_condition_never_crashes():
    rule = FakeRule([{"field": "country_code"}])  # missing operator/value
    assert evaluate_rules([rule], _ctx()) is None
    rule2 = FakeRule([{"field": "nonsense", "operator": "equals", "value": "x"}])
    assert evaluate_rules([rule2], _ctx()) is None


def test_empty_conditions_do_not_match():
    assert rule_matches([], _ctx()) is False


def test_parse_accept_language():
    assert parse_accept_language("fr-FR,fr;q=0.9,en;q=0.8") == "fr"
    assert parse_accept_language("en-US") == "en"
    assert parse_accept_language("") == ""


def test_build_context_time_fields():
    now = datetime(2026, 6, 17, 15, 30, tzinfo=timezone.utc)
    ctx = build_context("1.2.3.4", "Mozilla/5.0", "de-DE,de;q=0.9", now=now)
    assert ctx.hour == 15
    assert ctx.date == "2026-06-17"
    assert ctx.weekday == datetime(2026, 6, 17).weekday()
    assert ctx.language == "de"


# ════════════════════════════════════════════════════════════════════
# Unit tests — UTM merging
# ════════════════════════════════════════════════════════════════════

@dataclass
class FakeLink:
    utm_source: str = "google"
    utm_medium: str = "cpc"
    utm_campaign: str = "summer"
    utm_content: str = ""
    utm_term: str = ""
    custom_params: dict = field(default_factory=dict)


def test_merge_link_utms_appends_missing():
    out = merge_link_utms("https://dest.test/page", FakeLink())
    assert "utm_source=google" in out
    assert "utm_medium=cpc" in out
    assert "utm_campaign=summer" in out


def test_merge_link_utms_does_not_overwrite():
    out = merge_link_utms("https://dest.test/page?utm_source=override", FakeLink())
    assert "utm_source=override" in out
    assert "utm_source=google" not in out


def test_merge_link_utms_preserves_fragment():
    out = merge_link_utms("https://dest.test/page#anchor", FakeLink())
    assert out.endswith("#anchor")


# ════════════════════════════════════════════════════════════════════
# Unit tests — A/B variant selection
# ════════════════════════════════════════════════════════════════════

@dataclass
class FakeVariant:
    id: str
    weight: int


def test_pick_variant_sticky_is_deterministic():
    variants = [FakeVariant("a", 50), FakeVariant("b", 50)]
    first = pick_variant(variants, seed="visitor-1")
    for _ in range(20):
        assert pick_variant(variants, seed="visitor-1") is first


def test_pick_variant_respects_weight_distribution():
    variants = [FakeVariant("a", 80), FakeVariant("b", 20)]
    counts = {"a": 0, "b": 0}
    for i in range(4000):
        chosen = pick_variant(variants, seed=f"v{i}")
        counts[chosen.id] += 1
    # 'a' should dominate roughly 80/20 — allow generous tolerance.
    assert counts["a"] > counts["b"] * 2


def test_pick_variant_single():
    only = FakeVariant("a", 100)
    assert pick_variant([only], seed="x") is only


def test_pick_variant_zero_weights_uniform():
    variants = [FakeVariant("a", 0), FakeVariant("b", 0)]
    chosen = pick_variant(variants, seed="x")
    assert chosen in variants


# ════════════════════════════════════════════════════════════════════
# Integration tests — full HTTP stack
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
    """Register a fresh org admin and return auth headers."""
    import uuid
    suffix = uuid.uuid4().hex[:8]
    resp = client.post("/api/v1/auth/register", json={
        "email": f"user_{suffix}@test.io", "password": "Sup3rSecret!",
        "full_name": "Test User", "org_name": f"Acme {suffix}",
    })
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_link(client, headers, dest="https://shop.example.com/landing") -> dict:
    resp = client.post("/api/v1/links", headers=headers, json={
        "destination_url": dest,
        "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "launch",
        "title": "Launch LP",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_routing_rule_redirects_by_language(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)

    # Rule: French visitors -> French site
    rule = client.post(f"/api/v1/links/{link['id']}/rules", headers=headers, json={
        "name": "French audience",
        "priority": 10,
        "conditions": [{"field": "language", "operator": "equals", "value": "fr"}],
        "destination_url": "https://shop.example.com/fr",
    })
    assert rule.status_code == 201, rule.text

    code = link["short_code"]

    # French visitor follows the rule (and keeps campaign UTMs)
    fr = client.get(f"/r/{code}", headers={"accept-language": "fr-FR,fr;q=0.9"},
                    follow_redirects=False)
    assert fr.status_code == 302
    assert fr.headers["location"].startswith("https://shop.example.com/fr")
    assert "utm_source=google" in fr.headers["location"]

    # English visitor falls through to the default destination
    en = client.get(f"/r/{code}", headers={"accept-language": "en-US,en;q=0.9"},
                    follow_redirects=False)
    assert en.status_code == 302
    assert en.headers["location"].startswith("https://shop.example.com/landing")


def test_rule_crud_and_org_isolation(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)

    created = client.post(f"/api/v1/links/{link['id']}/rules", headers=headers, json={
        "conditions": [{"field": "country_code", "operator": "in", "value": ["IN"]}],
        "destination_url": "https://shop.example.com/in",
    }).json()
    rule_id = created["id"]

    listed = client.get(f"/api/v1/links/{link['id']}/rules", headers=headers).json()
    assert len(listed) == 1

    upd = client.put(f"/api/v1/rules/{rule_id}", headers=headers,
                     json={"is_active": False})
    assert upd.status_code == 200 and upd.json()["is_active"] is False

    # A different org cannot see or delete the rule
    other = _auth_headers(client)
    assert client.get(f"/api/v1/links/{link['id']}/rules", headers=other).status_code == 404
    assert client.delete(f"/api/v1/rules/{rule_id}", headers=other).status_code == 404

    assert client.delete(f"/api/v1/rules/{rule_id}", headers=headers).status_code == 200


def test_invalid_rule_rejected(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)
    # 'in' requires a list value
    bad = client.post(f"/api/v1/links/{link['id']}/rules", headers=headers, json={
        "conditions": [{"field": "country_code", "operator": "in", "value": "IN"}],
        "destination_url": "https://x.test/",
    })
    assert bad.status_code == 422
    # destination must be http(s)
    bad2 = client.post(f"/api/v1/links/{link['id']}/rules", headers=headers, json={
        "conditions": [{"field": "country_code", "operator": "equals", "value": "IN"}],
        "destination_url": "ftp://x.test/",
    })
    assert bad2.status_code == 422


def test_ab_test_lifecycle_and_sticky_redirect(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)
    code = link["short_code"]

    # Reject weights that don't sum to 100
    bad = client.post(f"/api/v1/links/{link['id']}/ab-test", headers=headers, json={
        "name": "LP test",
        "variants": [
            {"name": "A", "destination_url": "https://shop.example.com/a", "weight": 40},
            {"name": "B", "destination_url": "https://shop.example.com/b", "weight": 40},
        ],
    })
    assert bad.status_code == 422

    test = client.post(f"/api/v1/links/{link['id']}/ab-test", headers=headers, json={
        "name": "LP test", "sticky": True,
        "variants": [
            {"name": "A", "destination_url": "https://shop.example.com/a", "weight": 50, "is_control": True},
            {"name": "B", "destination_url": "https://shop.example.com/b", "weight": 50},
        ],
    })
    assert test.status_code == 201, test.text
    test_id = test.json()["id"]
    assert len(test.json()["variants"]) == 2

    # Only one test per link
    dup = client.post(f"/api/v1/links/{link['id']}/ab-test", headers=headers, json={
        "name": "dup",
        "variants": [
            {"name": "A", "destination_url": "https://x.test/a", "weight": 50},
            {"name": "B", "destination_url": "https://x.test/b", "weight": 50},
        ],
    })
    assert dup.status_code == 409

    # Sticky: the same visitor always lands on the same variant
    first = client.get(f"/r/{code}", follow_redirects=False)
    assert first.status_code == 302
    dest = first.headers["location"]
    assert dest.startswith("https://shop.example.com/a") or dest.startswith("https://shop.example.com/b")
    for _ in range(5):
        again = client.get(f"/r/{code}", follow_redirects=False)
        assert again.headers["location"] == dest

    # Pausing the test reverts to the default destination
    client.put(f"/api/v1/ab-tests/{test_id}", headers=headers, json={"status": "paused"})
    paused = client.get(f"/r/{code}", follow_redirects=False)
    assert paused.headers["location"].startswith("https://shop.example.com/landing")

    # Results endpoint degrades gracefully without ClickHouse
    results = client.get(f"/api/v1/ab-tests/{test_id}/results", headers=headers)
    assert results.status_code == 200
    assert len(results.json()["variants"]) == 2


def test_password_protected_link_gate(client):
    headers = _auth_headers(client)
    resp = client.post("/api/v1/links", headers=headers, json={
        "destination_url": "https://secret.example.com/vault",
        "title": "Secret", "password": "letmein",
    })
    assert resp.status_code == 201, resp.text
    code = resp.json()["short_code"]

    # GET shows the gate, does NOT redirect
    gate = client.get(f"/r/{code}", follow_redirects=False)
    assert gate.status_code == 200
    assert "This link is protected" in gate.text
    assert "secret.example.com" not in gate.text  # destination not leaked

    # Wrong password -> 401, re-prompt
    wrong = client.post(f"/r/{code}/verify", data={"password": "nope"},
                        follow_redirects=False)
    assert wrong.status_code == 401
    assert "Incorrect password" in wrong.text

    # Correct password -> 302 to destination
    ok = client.post(f"/r/{code}/verify", data={"password": "letmein"},
                     follow_redirects=False)
    assert ok.status_code == 302
    assert ok.headers["location"].startswith("https://secret.example.com/vault")


def test_declare_winner_promotes_to_link(client):
    headers = _auth_headers(client)
    link = _create_link(client, headers)
    test = client.post(f"/api/v1/links/{link['id']}/ab-test", headers=headers, json={
        "name": "t",
        "variants": [
            {"name": "A", "destination_url": "https://shop.example.com/a", "weight": 50},
            {"name": "B", "destination_url": "https://shop.example.com/b", "weight": 50},
        ],
    }).json()
    winner_variant = test["variants"][1]

    res = client.post(f"/api/v1/ab-tests/{test['id']}/declare-winner", headers=headers,
                      json={"variant_id": winner_variant["id"], "apply_to_link": True})
    assert res.status_code == 200
    assert res.json()["status"] == "completed"
    assert res.json()["winner_variant_id"] == winner_variant["id"]

    # Link now points at the winning variant
    updated = client.get(f"/api/v1/links/{link['id']}", headers=headers).json()
    assert updated["final_url"].startswith("https://shop.example.com/b")
