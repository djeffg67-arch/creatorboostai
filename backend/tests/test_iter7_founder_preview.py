"""Iter-7 backend tests: POST /api/founder/auth + regression on prior endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # Fallback: read from frontend/.env
    try:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                    break
    except Exception:
        pass

FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ------- Founder auth ------------------------------------------------
class TestFounderAuth:
    def test_empty_key_rejected(self, client):
        r = client.post(f"{BASE_URL}/api/founder/auth", json={"key": ""})
        assert r.status_code == 401, r.text

    def test_wrong_key_rejected(self, client):
        r = client.post(f"{BASE_URL}/api/founder/auth", json={"key": "wrong-key-123"})
        assert r.status_code == 401, r.text

    def test_correct_key_returns_full_entitlements(self, client):
        r = client.post(f"{BASE_URL}/api/founder/auth", json={"key": FOUNDER_KEY})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "founder"
        assert data.get("email")
        assert isinstance(data.get("token"), str) and len(data["token"]) > 16
        ents = data.get("entitlements", [])
        assert len(ents) == 9, f"expected 9 entitlements (3+4+2), got {len(ents)}"
        # 3 PRODUCTS, 4 SUBSCRIPTIONS, 2 HIGH_TICKET
        kinds = {}
        for e in ents:
            kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
        assert kinds.get("one_time") == 3, f"products: {kinds}"
        assert kinds.get("subscription") == 4, f"subs: {kinds}"
        assert kinds.get("high_ticket") == 2, f"high_ticket: {kinds}"

    def test_idempotent_returns_same_token(self, client):
        r1 = client.post(f"{BASE_URL}/api/founder/auth", json={"key": FOUNDER_KEY})
        r2 = client.post(f"{BASE_URL}/api/founder/auth", json={"key": FOUNDER_KEY})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["email"] == r2.json()["email"]
        # Token should be stable across calls (existing user keeps portal_token)
        assert r1.json()["token"] == r2.json()["token"]

    def test_missing_field_422(self, client):
        r = client.post(f"{BASE_URL}/api/founder/auth", json={})
        assert r.status_code == 422

    def test_founder_login_via_portal(self, client):
        """The founder token should work against /api/portal/login (full integration)."""
        r = client.post(f"{BASE_URL}/api/founder/auth", json={"key": FOUNDER_KEY})
        assert r.status_code == 200
        data = r.json()
        login = client.post(f"{BASE_URL}/api/portal/login", json={
            "email": data["email"], "token": data["token"],
        })
        assert login.status_code == 200, login.text
        body = login.json()
        assert body["email"] == data["email"]
        assert len(body["entitlements"]) == 9


# ------- Regression: prior flows still green ------------------------------
class TestRegressionFlows:
    def test_share_demo(self, client):
        r = client.post(f"{BASE_URL}/api/share-demo", json={
            "recipient_email": "TEST_iter7@example.com",
            "sender_name": "Iter7 Tester",
            "demo_type": "realtor",
        })
        assert r.status_code == 202, r.text
        assert "sent" in r.json() and "demo_url" in r.json()

    def test_admin_login_wrong(self, client):
        r = client.post(f"{BASE_URL}/api/admin/login", json={"password": "wrong"})
        assert r.status_code == 401

    def test_admin_login_correct(self, client):
        r = client.post(f"{BASE_URL}/api/admin/login", json={"password": "bodyiq-admin-2026"})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_checkout_session_foundations(self, client):
        r = client.post(f"{BASE_URL}/api/checkout/session", json={
            "product_key": "foundations",
            "origin_url": BASE_URL,
            "email": "TEST_iter7@example.com",
        })
        assert r.status_code == 200, r.text
        assert "url" in r.json() and "session_id" in r.json()

    def test_application_accelerator(self, client):
        r = client.post(f"{BASE_URL}/api/applications", json={
            "program_key": "accelerator_7k",
            "name": "TEST iter7",
            "email": "TEST_iter7_app@example.com",
            "phone": "+1-555-0100",
            "biggest_challenge": "Want signal accelerator",
        })
        assert r.status_code == 201, r.text
        assert "booking_url" in r.json()

    def test_portal_login_invalid(self, client):
        r = client.post(f"{BASE_URL}/api/portal/login", json={
            "email": "nobody@example.com", "token": "BADTOKEN",
        })
        assert r.status_code == 401
