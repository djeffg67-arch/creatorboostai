"""Iter 63 — Website Builder one-click publish + custom domain tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/business-builder"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _site_payload(brand="TEST_BodyIQ Training"):
    return {
        "brand": brand,
        "domain": "bodyiq-training",
        "hero": {
            "headline": "Train smarter with BodyIQ",
            "sub": "AI-powered personal training",
            "primary_cta": "Book Now",
        },
        "about": "We build elite athletes.",
        "services": [{"name": "1:1 Coaching", "desc": "Personal sessions"}],
    }


# ──────────────── /website-publish ────────────────
class TestWebsitePublish:
    def test_publish_success_returns_public_url(self, session):
        slug = f"test-publish-{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/website-publish", json={
            "site": _site_payload(),
            "owner_email": f"TEST_{uuid.uuid4().hex[:6]}@example.com",
            "slug": slug,
            "business_name": "TEST BodyIQ",
            "industry": "Fitness",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["slug"] == slug
        assert data["site_id"]
        assert data["public_url"].startswith("https://")
        assert f"/p/{slug}" in data["public_url"]
        assert data["published_at"]

    def test_publish_slug_collision_resolves(self, session):
        slug = f"test-collide-{uuid.uuid4().hex[:6]}"
        r1 = session.post(f"{API}/website-publish", json={"site": _site_payload(), "slug": slug})
        r2 = session.post(f"{API}/website-publish", json={"site": _site_payload(), "slug": slug})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["slug"] == slug
        assert r2.json()["slug"] != slug
        assert r2.json()["slug"].startswith(slug + "-")

    def test_publish_missing_brand_400(self, session):
        r = session.post(f"{API}/website-publish", json={"site": {"hero": {}}})
        assert r.status_code == 400


# ──────────────── /published/{slug} ────────────────
class TestFetchPublished:
    def test_fetch_bumps_visit_count_and_404(self, session):
        slug = f"test-fetch-{uuid.uuid4().hex[:6]}"
        session.post(f"{API}/website-publish", json={"site": _site_payload(), "slug": slug})
        r1 = session.get(f"{API}/published/{slug}")
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["ok"] and d1["slug"] == slug
        assert d1["business_name"]
        assert isinstance(d1["site"], dict) and d1["site"].get("brand")
        v1 = d1["visit_count"]

        r2 = session.get(f"{API}/published/{slug}")
        assert r2.status_code == 200
        v2 = r2.json()["visit_count"]
        assert v2 > v1, f"visit_count did not increment: {v1} -> {v2}"

        r404 = session.get(f"{API}/published/does-not-exist-{uuid.uuid4().hex[:8]}")
        assert r404.status_code == 404


# ──────────────── /published/{slug}/lead ────────────────
class TestPublishedLead:
    @pytest.fixture(scope="class")
    def published_slug(self, session):
        slug = f"test-lead-{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/website-publish", json={"site": _site_payload(), "slug": slug, "business_name": "TEST Lead Biz"})
        assert r.status_code == 200
        return slug

    def test_lead_with_email_creates_lead_id(self, session, published_slug):
        r = session.post(f"{API}/published/{published_slug}/lead", json={
            "name": "TEST Visitor",
            "email": f"TEST_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+15555550000",
            "message": "Interested in 1:1 coaching",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d.get("lead_id"), f"lead_id should not be null: {d}"

    def test_lead_no_email_or_phone_400(self, session, published_slug):
        r = session.post(f"{API}/published/{published_slug}/lead", json={"name": "x", "message": "hi"})
        assert r.status_code == 400

    def test_lead_unknown_slug_404(self, session):
        r = session.post(f"{API}/published/nope-{uuid.uuid4().hex[:8]}/lead", json={
            "name": "x", "email": "a@b.com",
        })
        assert r.status_code == 404


# ──────────────── /published/{slug}/connect-domain ────────────────
class TestConnectDomain:
    @pytest.fixture(scope="class")
    def published_slug(self, session):
        slug = f"test-domain-{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/website-publish", json={"site": _site_payload(), "slug": slug})
        assert r.status_code == 200
        return slug

    def test_connect_domain_returns_dns_instructions(self, session, published_slug):
        r = session.post(f"{API}/published/{published_slug}/connect-domain", json={
            "custom_domain": "mybusiness.com",
            "email": "owner@mybusiness.com",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("status") == "pending_dns"
        assert d.get("target_url") and "/p/" in d["target_url"]
        assert isinstance(d.get("dns_instructions"), list)
        assert len(d["dns_instructions"]) >= 2
        types = {x.get("type") for x in d["dns_instructions"]}
        assert "CNAME" in types
        assert any("A" in t for t in types)

        # Verify persisted on the published doc
        fetch = session.get(f"{API}/published/{published_slug}")
        assert fetch.status_code == 200
        assert fetch.json().get("custom_domain") == "mybusiness.com"

    def test_connect_domain_rejects_malformed(self, session, published_slug):
        r = session.post(f"{API}/published/{published_slug}/connect-domain", json={
            "custom_domain": "not a domain",
            "email": "a@b.com",
        })
        assert r.status_code == 400

    def test_connect_domain_unknown_slug_404(self, session):
        r = session.post(f"{API}/published/nope-{uuid.uuid4().hex[:8]}/connect-domain", json={
            "custom_domain": "x.com",
        })
        assert r.status_code == 404
