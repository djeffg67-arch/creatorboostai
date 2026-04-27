"""Iteration 9 - BodyIQ-AI Signal Intelligence System tests.

Tests the new Signal Intelligence Pack products, Audit/Report/Jury lead
capture flows, and verifies regression of existing endpoints.
"""
import os
import time
import uuid
import pytest
import requests

def _load_frontend_env():
    p = "/app/frontend/.env"
    if os.path.exists(p):
        for line in open(p):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------------------- Products catalog --------------------
class TestProducts:
    def test_products_endpoint_returns_signal_packs(self, client):
        r = client.get(f"{API}/products")
        assert r.status_code == 200, r.text
        data = r.json()
        # Endpoint may return list or dict; normalize to dict-by-key
        if isinstance(data, list):
            keys = {p.get("key") or p.get("product_key") or p.get("id") for p in data}
            by_key = {p.get("key") or p.get("product_key") or p.get("id"): p for p in data}
        else:
            # dict format - either {products: {...}} or direct dict
            products = data.get("products", data)
            keys = set(products.keys())
            by_key = products

        for k in ("signal_pack_standard", "signal_pack_pro", "signal_pack_enterprise"):
            assert k in keys, f"Missing product {k} in {keys}"

        # Verify amounts
        assert float(by_key["signal_pack_standard"]["amount"]) == 299.0
        assert float(by_key["signal_pack_pro"]["amount"]) == 499.0
        assert float(by_key["signal_pack_enterprise"]["amount"]) == 1500.0

    def test_products_count_at_least_six(self, client):
        r = client.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        if isinstance(data, list):
            n = len(data)
        else:
            n = len(data.get("products", data))
        assert n >= 6, f"Expected >=6 products, got {n}"


# -------------------- Checkout session --------------------
class TestCheckoutSession:
    @pytest.mark.parametrize(
        "product_key", ["signal_pack_standard", "signal_pack_pro", "signal_pack_enterprise"]
    )
    def test_checkout_signal_pack_accepts_key(self, client, product_key):
        """Without Stripe Live Keys we expect 503 (graceful degradation),
        but the endpoint MUST accept the new product_key as valid (not 400)."""
        payload = {
            "product_key": product_key,
            "origin_url": BASE_URL,
            "email": f"TEST_{uuid.uuid4().hex[:8]}@example.com",
        }
        r = client.post(f"{API}/checkout/session", json=payload)
        # Acceptable: 200 (live keys present) or 503 (graceful degradation)
        # NOT acceptable: 400 (means key is rejected as invalid)
        assert r.status_code in (200, 503), (
            f"Got {r.status_code} for {product_key}: {r.text}"
        )
        if r.status_code == 503:
            # Body should mention payments/stripe configuration
            body = r.text.lower()
            assert "stripe" in body or "payment" in body or "configured" in body

    def test_checkout_invalid_product_key_returns_400(self, client):
        r = client.post(
            f"{API}/checkout/session",
            json={
                "product_key": "nonexistent_xyz",
                "origin_url": BASE_URL,
                "email": "TEST_invalid@example.com",
            },
        )
        assert r.status_code == 400, r.text


# -------------------- Lead capture for new sources --------------------
class TestLeadsNewSources:
    @pytest.mark.parametrize(
        "source", ["audit_request", "report_request", "jury_request"]
    )
    def test_lead_create_new_source(self, client, source):
        email = f"TEST_{source}_{uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "email": email,
            "name": f"Test {source}",
            "source": source,
            "message": f"Test message for {source}",
        }
        r = client.post(f"{API}/leads", json=payload)
        # Per review request item #16 — must be 201
        assert r.status_code == 201, (
            f"Expected 201 for source={source}, got {r.status_code}: {r.text}"
        )
        data = r.json()
        assert data.get("email") == email
        assert data.get("source") == source

    @pytest.mark.parametrize("source", ["audit_request", "report_request", "jury_request"])
    def test_lead_persisted_in_stats(self, client, source):
        # Create a lead
        email = f"TEST_persist_{source}_{uuid.uuid4().hex[:6]}@example.com"
        cr = client.post(
            f"{API}/leads",
            json={"email": email, "source": source, "name": "Persist test"},
        )
        if cr.status_code != 201:
            pytest.skip(f"lead create returned {cr.status_code}, skipping persistence check")
        # Stats should include it
        stats = client.get(f"{API}/leads/stats")
        if stats.status_code == 200:
            by_source = stats.json().get("by_source", {})
            assert source in by_source, f"Source {source} not in stats: {by_source}"


# -------------------- Regression: existing endpoints --------------------
class TestRegression:
    def test_root_health(self, client):
        r = client.get(f"{API}/")
        assert r.status_code in (200, 404)  # depends on if root /api defined

    def test_existing_lead_source_still_works(self, client):
        r = client.post(
            f"{API}/leads",
            json={
                "email": f"TEST_home_{uuid.uuid4().hex[:6]}@example.com",
                "source": "home",
                "name": "Regression",
            },
        )
        assert r.status_code == 201, r.text

    def test_existing_product_starter_or_pro_present(self, client):
        r = client.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        if isinstance(data, list):
            keys = {p.get("key") or p.get("product_key") or p.get("id") for p in data}
        else:
            products = data.get("products", data)
            keys = set(products.keys())
        # Should still have at least one pre-existing product like forensic_library
        assert "forensic_library" in keys or len(keys) >= 6
