"""Iter 62 — Phase 0/1 Agentic Demo
Tests:
1) /api/audit/demo-feed — public, no auth, PII redacted, correct shape
2) Iter 61 regression — /api/cfo-case/generate (insurance), /api/audit/list (founder),
   /api/business-builder/website-generate
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"

PII_FORBIDDEN_KEYS = {"lead_id", "inputs_preview", "output_preview", "email", "phone", "company"}
ALLOWED_KEYS = {"decision_id", "timestamp", "agent_id", "action", "reasoning_summary", "confidence"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def founder_token(session):
    r = session.post(f"{BASE_URL}/api/ops/founder-access", json={"key": FOUNDER_KEY}, timeout=30)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": data["email"], "token": data["token"]}


# === Phase 0: demo-feed endpoint ===
class TestDemoFeed:
    def test_demo_feed_public_no_auth(self, session):
        r = session.post(f"{BASE_URL}/api/audit/demo-feed", json={"limit": 5}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "decisions" in data and "total" in data
        assert isinstance(data["decisions"], list)
        assert data["total"] == len(data["decisions"])
        assert len(data["decisions"]) >= 1, "Expected ≥1 audit row from prior runs"

    def test_demo_feed_redacts_pii(self, session):
        r = session.post(f"{BASE_URL}/api/audit/demo-feed", json={"limit": 50}, timeout=15)
        assert r.status_code == 200
        for row in r.json()["decisions"]:
            row_keys = set(row.keys())
            leaked = row_keys & PII_FORBIDDEN_KEYS
            assert not leaked, f"PII leaked: {leaked} in row {row.get('decision_id')}"
            extra = row_keys - ALLOWED_KEYS
            assert not extra, f"Unexpected key(s) in demo feed: {extra}"

    def test_demo_feed_shape_per_row(self, session):
        r = session.post(f"{BASE_URL}/api/audit/demo-feed", json={"limit": 10}, timeout=15)
        decisions = r.json()["decisions"]
        for d in decisions:
            assert isinstance(d.get("decision_id"), str) and len(d["decision_id"]) > 0
            assert isinstance(d.get("timestamp"), str)
            assert isinstance(d.get("agent_id"), str)
            assert isinstance(d.get("action"), str)
            assert isinstance(d.get("reasoning_summary"), str)
            assert isinstance(d.get("confidence"), (int, float))

    def test_demo_feed_limit_clamped(self, session):
        r = session.post(f"{BASE_URL}/api/audit/demo-feed", json={"limit": 9999}, timeout=15)
        assert r.status_code == 200
        assert len(r.json()["decisions"]) <= 50

    def test_demo_feed_default_limit(self, session):
        r = session.post(f"{BASE_URL}/api/audit/demo-feed", json={}, timeout=15)
        assert r.status_code == 200
        assert r.json()["total"] >= 0

    def test_demo_feed_no_auth_headers_required(self):
        # Bare request, no session, no headers beyond defaults
        r = requests.post(f"{BASE_URL}/api/audit/demo-feed", json={"limit": 3}, timeout=15)
        assert r.status_code == 200, "demo-feed must be public"

    def test_demo_feed_sorted_desc(self, session):
        r = session.post(f"{BASE_URL}/api/audit/demo-feed", json={"limit": 10}, timeout=15)
        ts = [d["timestamp"] for d in r.json()["decisions"]]
        assert ts == sorted(ts, reverse=True), "decisions must be ordered timestamp DESC"


# === Iter 61 regression ===
class TestIter61Regression:
    def test_cfo_case_insurance_generates(self, session):
        r = session.post(
            f"{BASE_URL}/api/cfo-case/generate",
            json={"industry": "insurance", "notes": "regression test"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        md = data.get("markdown") or ""
        assert len(md) > 1500, f"markdown too short: {len(md)} chars"

    def test_audit_list_founder_auth(self, session, founder_token):
        r = session.post(
            f"{BASE_URL}/api/audit/list",
            json={**founder_token, "limit": 5},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "trail" in data or "decisions" in data or "rows" in data, f"unexpected shape: {list(data.keys())}"

    def test_audit_list_rejects_no_auth(self, session):
        r = session.post(f"{BASE_URL}/api/audit/list", json={"limit": 5}, timeout=20)
        assert r.status_code in (400, 401, 403, 422)

    def test_business_builder_website_generate(self, session):
        payload = {
            "business_idea": "A SaaS platform that helps B2B founders close revenue 3x faster with AI agents.",
            "business_name": "TEST_AgenticCo",
            "industry": "saas",
        }
        r = session.post(f"{BASE_URL}/api/business-builder/website-generate", json=payload, timeout=180)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True or "site" in data or "html" in data or "website" in data, \
            f"unexpected shape: {list(data.keys())}"
