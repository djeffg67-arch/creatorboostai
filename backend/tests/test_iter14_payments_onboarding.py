"""Iteration 14 — Stripe payments + onboarding tests.

Covers:
  - GET /api/products  (8 entries, including new strategy/full_training)
  - GET /api/subscriptions  (6 plans incl. growth tier)
  - POST /api/checkout/session  (one-time, all 4 training products)
  - POST /api/checkout/subscription  (503s with helpful env-var message)
  - GET /api/checkout/status/{id}  (404 + valid lookup)
  - Verify webhook handler/idempotency wiring exists in server.py
"""
import os
import re
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend/.env
    env_file = Path("/app/frontend/.env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Catalog tests ----------
class TestCatalog:
    def test_products_returns_eight_with_new_tiers(self, api):
        r = api.get(f"{BASE_URL}/api/products", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        assert len(data) == 8, f"Expected 8 products, got {len(data)}: {list(data)}"

        # Required keys
        for key in ("foundations", "applied", "strategy", "full_training",
                    "forensic_library", "signal_pack_standard",
                    "signal_pack_pro", "signal_pack_enterprise"):
            assert key in data, f"Missing product: {key}"

        # New tiers correctness
        assert data["strategy"]["amount"] == 7000.00
        assert data["strategy"]["type"] == "training"
        assert data["full_training"]["amount"] == 27000.00
        assert data["full_training"]["type"] == "training"
        assert data["foundations"]["amount"] == 400.00
        assert data["applied"]["amount"] == 1500.00

    def test_subscriptions_returns_six_plans(self, api):
        r = api.get(f"{BASE_URL}/api/subscriptions", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        expected = {
            "cb_starter_monthly": 97.00,
            "cb_starter_annual": 970.00,
            "cb_growth_monthly": 297.00,
            "cb_growth_annual": 2970.00,
            "cb_pro_monthly": 997.00,
            "cb_pro_annual": 9970.00,
        }
        assert len(data) == 6, f"Expected 6 plans, got {len(data)}: {list(data)}"
        for k, amt in expected.items():
            assert k in data, f"Missing plan: {k}"
            assert data[k]["amount"] == amt, f"{k}: expected {amt}, got {data[k]['amount']}"
        # Tiers
        assert data["cb_growth_monthly"]["tier"] == "growth"
        assert data["cb_growth_monthly"]["interval"] == "month"
        assert data["cb_growth_annual"]["interval"] == "year"


# ---------- One-time checkout tests ----------
class TestOneTimeCheckout:
    @pytest.mark.parametrize("product_key,amount", [
        ("foundations", 400.00),
        ("applied", 1500.00),
        ("strategy", 7000.00),
        ("full_training", 27000.00),
    ])
    def test_create_checkout_session_for_training_products(self, api, product_key, amount):
        r = api.post(
            f"{BASE_URL}/api/checkout/session",
            json={
                "product_key": product_key,
                "origin_url": BASE_URL,
                "email": f"TEST_{product_key}@example.com",
            },
            timeout=30,
        )
        assert r.status_code == 200, f"{product_key} → {r.status_code}: {r.text}"
        body = r.json()
        assert "url" in body and "session_id" in body
        assert body["url"].startswith("https://checkout.stripe.com/"), body["url"]
        assert body["session_id"].startswith("cs_"), body["session_id"]

        # Verify txn is persisted by hitting status endpoint
        sid = body["session_id"]
        s = api.get(f"{BASE_URL}/api/checkout/status/{sid}", timeout=30)
        assert s.status_code == 200, s.text
        sdata = s.json()
        assert sdata["product_key"] == product_key
        # amount_total may come from Stripe (cents) or DB fallback (cents). Validate cents.
        assert sdata["amount_total"] == int(round(amount * 100)), sdata

    def test_status_returns_404_for_unknown_session(self, api):
        r = api.get(f"{BASE_URL}/api/checkout/status/cs_test_does_not_exist_xyz", timeout=15)
        assert r.status_code == 404

    def test_invalid_product_returns_400(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/session",
            json={"product_key": "nope", "origin_url": BASE_URL},
            timeout=15,
        )
        assert r.status_code == 400


# ---------- Subscription checkout tests (expect 503 by spec) ----------
class TestSubscriptionCheckout:
    @pytest.mark.parametrize("plan_key,env_var", [
        ("cb_starter_monthly", "STRIPE_PRICE_CB_STARTER_MONTHLY"),
        ("cb_growth_monthly", "STRIPE_PRICE_CB_GROWTH_MONTHLY"),
        ("cb_pro_monthly", "STRIPE_PRICE_CB_PRO_MONTHLY"),
    ])
    def test_subscription_returns_503_with_env_hint(self, api, plan_key, env_var):
        r = api.post(
            f"{BASE_URL}/api/checkout/subscription",
            json={"plan_key": plan_key, "origin_url": BASE_URL, "email": "test@example.com"},
            timeout=20,
        )
        assert r.status_code == 503, f"{plan_key} → {r.status_code}: {r.text}"
        body = r.json()
        # FastAPI serializes detail under "detail"
        msg = (body.get("detail") or "").upper()
        assert env_var in msg, f"Expected env var name in error: {body}"

    def test_invalid_plan_returns_400(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/subscription",
            json={"plan_key": "cb_bogus_monthly", "origin_url": BASE_URL},
            timeout=15,
        )
        assert r.status_code == 400


# ---------- Webhook handler wiring (read server.py — no fire) ----------
class TestWebhookWiring:
    def test_webhook_endpoint_and_idempotency_present(self):
        srv = Path("/app/backend/server.py").read_text()
        assert '@api_router.post("/webhook/stripe")' in srv
        assert "checkout.session.completed" in srv
        assert "invoice.paid" in srv
        assert "processed_webhook_events" in srv
        # Sanity: idempotency early-return
        assert re.search(r"already\s*=\s*await db\.processed_webhook_events\.find_one", srv)


# ---------- Backward compat ----------
class TestBackwardCompat:
    def test_thank_you_route_resolves_in_frontend(self):
        # SPA route — verify React app loads (200) at /thank-you (returns same index.html)
        r = requests.get(f"{BASE_URL}/thank-you", timeout=20, allow_redirects=True)
        assert r.status_code == 200
        # Index HTML should contain root div
        assert 'id="root"' in r.text or "root" in r.text
