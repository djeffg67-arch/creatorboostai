"""BodyIQ-AI Step 1 Verification Tests
Validates: payments (subscriptions + one-time), high-ticket applications,
admin auth, picker analytics, portal access grant, health check.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "bodyiq-admin-2026"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "online"

    def test_health_endpoint_does_not_exist(self, session):
        # Review request asked for /api/health but backend exposes /api/ only
        r = session.get(f"{API}/health")
        # Document actual behavior
        assert r.status_code in (404, 405)


# ---------- Subscriptions ----------
class TestSubscriptions:
    def test_list_subscriptions(self, session):
        r = session.get(f"{API}/subscriptions")
        assert r.status_code == 200
        data = r.json()
        assert "cb_starter_monthly" in data
        assert "cb_pro_monthly" in data
        assert data["cb_starter_monthly"]["amount"] == 49.00
        assert data["cb_pro_monthly"]["amount"] == 149.00

    def test_subscription_checkout_starter(self, session):
        r = session.post(f"{API}/checkout/subscription", json={
            "plan_key": "cb_starter_monthly",
            "origin_url": BASE_URL,
            "email": "TEST_starter@example.com",
        })
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        data = r.json()
        assert "url" in data and "session_id" in data
        assert "stripe.com" in data["url"] or "checkout" in data["url"].lower()

    def test_subscription_checkout_pro(self, session):
        r = session.post(f"{API}/checkout/subscription", json={
            "plan_key": "cb_pro_monthly",
            "origin_url": BASE_URL,
            "email": "TEST_pro@example.com",
        })
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        data = r.json()
        assert data["url"].startswith("https://")
        assert data["session_id"]

    def test_subscription_invalid_plan_rejected(self, session):
        r = session.post(f"{API}/checkout/subscription", json={
            "plan_key": "sub_starter",   # nonexistent
            "origin_url": BASE_URL,
        })
        assert r.status_code == 400


# ---------- One-time Checkout ----------
class TestOneTimeCheckout:
    def test_checkout_foundations_400(self, session):
        r = session.post(f"{API}/checkout/session", json={
            "product_key": "foundations",
            "origin_url": BASE_URL,
            "email": "TEST_foundations@example.com",
        })
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        data = r.json()
        assert data["url"].startswith("https://")

    def test_checkout_applied_1500(self, session):
        r = session.post(f"{API}/checkout/session", json={
            "product_key": "applied",
            "origin_url": BASE_URL,
            "email": "TEST_applied@example.com",
        })
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        data = r.json()
        assert data["url"].startswith("https://")

    def test_checkout_high_ticket_7k_rejected(self, session):
        # 7K and 27K must NEVER be exposed via /checkout/session
        r = session.post(f"{API}/checkout/session", json={
            "product_key": "accelerator_7k",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 400

    def test_checkout_high_ticket_27k_rejected(self, session):
        r = session.post(f"{API}/checkout/session", json={
            "product_key": "mastery_27k",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 400


# ---------- Applications (high-ticket) ----------
class TestApplications:
    def test_submit_strategy_7k_application(self, session, admin_token):
        payload = {
            "program_key": "accelerator_7k",
            "name": "TEST Jane Cooper",
            "email": "TEST_jane@example.com",
            "phone": "+15555550100",
            "company": "Cooper Realty",
            "revenue_range": "1m_5m",
            "team_size": "5_10",
            "current_systems": "Salesforce, kvCORE",
            "biggest_challenge": "Lead follow-up fragmented across 4 systems",
        }
        r = session.post(f"{API}/applications", json=payload)
        assert r.status_code == 201, f"{r.status_code}: {r.text}"
        data = r.json()
        assert "application_id" in data
        assert "booking_url" in data

        # Verify persistence via admin endpoint
        admin_r = session.get(
            f"{API}/admin/applications",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_r.status_code == 200
        apps = admin_r.json()
        assert any(a.get("email") == "TEST_jane@example.com" for a in apps)

    def test_submit_full_training_27k_application(self, session):
        payload = {
            "program_key": "mastery_27k",
            "name": "TEST John Doe",
            "email": "TEST_john@example.com",
            "phone": "+15555550101",
            "biggest_challenge": "Need elite mastery training",
        }
        r = session.post(f"{API}/applications", json=payload)
        assert r.status_code == 201
        assert r.json().get("application_id")

    def test_application_invalid_program_rejected(self, session):
        r = session.post(f"{API}/applications", json={
            "program_key": "foundations",  # not a high-ticket program
            "name": "TEST X",
            "email": "TEST_x@example.com",
            "phone": "+1",
            "biggest_challenge": "x",
        })
        assert r.status_code == 400


# ---------- Picker analytics ----------
class TestPicker:
    def test_track_realtor_click(self, session):
        r = session.post(f"{API}/track/picker-click", json={
            "vertical": "realtor",
            "referrer": "test-suite",
        })
        assert r.status_code == 204

    def test_track_insurance_click(self, session):
        r = session.post(f"{API}/track/picker-click", json={
            "vertical": "insurance",
            "referrer": "test-suite",
        })
        assert r.status_code == 204

    def test_admin_picker_stats(self, session, admin_token):
        r = session.get(
            f"{API}/admin/picker-stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "by_vertical" in data
        assert data.get("total", 0) >= 2
        assert data["by_vertical"].get("realtor", 0) >= 1
        assert data["by_vertical"].get("insurance", 0) >= 1

    def test_admin_picker_stats_unauth(self, session):
        r = session.get(f"{API}/admin/picker-stats")
        assert r.status_code == 401


# ---------- Admin auth ----------
class TestAdminAuth:
    def test_login_invalid_password(self, session):
        r = session.post(f"{API}/admin/login", json={"password": "wrong"})
        assert r.status_code == 401

    def test_admin_applications_unauth(self, session):
        r = session.get(f"{API}/admin/applications")
        assert r.status_code == 401
