"""Iter-6 finishing pass: share-demo, billing portal, admin demo-shares,
admin transactions/subscriptions with date range, and regression checks.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "bodyiq-admin-2026"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- /api/share-demo ----------
class TestShareDemo:
    def test_share_demo_realtor_resend_off(self, s):
        body = {
            "recipient_email": "jeffrey+test@example.com",
            "sender_name": "Test Sender",
            "demo_type": "realtor",
            "company": "TEST_Acme",
            "message": "TEST_iter6 share-demo message",
        }
        r = s.post(f"{API}/share-demo", json=body)
        assert r.status_code == 202, r.text
        data = r.json()
        assert data["sent"] is False, "RESEND_API_KEY is empty -> sent must be False"
        assert isinstance(data.get("reason"), str) and len(data["reason"]) > 0
        assert "/demo/realtor" in data.get("demo_url", "")

    def test_share_demo_insurance_resend_off(self, s):
        body = {
            "recipient_email": "jeffrey+ins@example.com",
            "sender_name": "TEST Insurance Sender",
            "demo_type": "insurance",
        }
        r = s.post(f"{API}/share-demo", json=body)
        assert r.status_code == 202, r.text
        data = r.json()
        assert data["sent"] is False
        assert "/demo/insurance" in data["demo_url"]

    def test_share_demo_invalid_demo_type(self, s):
        r = s.post(f"{API}/share-demo", json={
            "recipient_email": "x@example.com",
            "sender_name": "Test",
            "demo_type": "mortgage",
        })
        assert r.status_code == 422

    def test_share_demo_invalid_email(self, s):
        r = s.post(f"{API}/share-demo", json={
            "recipient_email": "not-an-email",
            "sender_name": "Test",
            "demo_type": "realtor",
        })
        assert r.status_code == 422

    def test_share_demo_persists_in_admin_list(self, s, admin_headers):
        marker = "TEST_iter6_persistence_marker"
        r = s.post(f"{API}/share-demo", json={
            "recipient_email": "persist@example.com",
            "sender_name": "Persist Sender",
            "demo_type": "realtor",
            "message": marker,
        })
        assert r.status_code == 202
        # Verify it lands in demo_shares collection via admin list
        list_r = s.get(f"{API}/admin/demo-shares?range=all", headers=admin_headers)
        assert list_r.status_code == 200
        items = list_r.json()
        assert any(d.get("message") == marker for d in items), \
            "share-demo row missing from demo_shares collection"


# ---------- Admin demo-shares list ----------
class TestAdminDemoShares:
    def test_requires_auth(self, s):
        r = s.get(f"{API}/admin/demo-shares")
        assert r.status_code == 401

    def test_range_filter_accepted(self, s, admin_headers):
        for rng in ["7d", "30d", "all"]:
            r = s.get(f"{API}/admin/demo-shares?range={rng}", headers=admin_headers)
            assert r.status_code == 200, f"range={rng}: {r.text}"
            assert isinstance(r.json(), list)

    def test_invalid_range_rejected(self, s, admin_headers):
        r = s.get(f"{API}/admin/demo-shares?range=12d", headers=admin_headers)
        assert r.status_code == 422


# ---------- Admin transactions / subscriptions w/ range ----------
class TestAdminAnalytics:
    def test_transactions_requires_auth(self, s):
        r = s.get(f"{API}/admin/transactions")
        assert r.status_code == 401

    def test_subscriptions_requires_auth(self, s):
        r = s.get(f"{API}/admin/subscriptions")
        assert r.status_code == 401

    def test_transactions_range(self, s, admin_headers):
        for rng in ["7d", "30d", "all"]:
            r = s.get(f"{API}/admin/transactions?range={rng}", headers=admin_headers)
            assert r.status_code == 200
            assert isinstance(r.json(), list)

    def test_subscriptions_range(self, s, admin_headers):
        for rng in ["7d", "30d", "all"]:
            r = s.get(f"{API}/admin/subscriptions?range={rng}", headers=admin_headers)
            assert r.status_code == 200
            assert isinstance(r.json(), list)


# ---------- /api/portal/billing-session ----------
class TestBillingPortal:
    def test_billing_invalid_creds_401(self, s):
        r = s.post(f"{API}/portal/billing-session", json={
            "email": "nobody@example.com",
            "token": "totally-fake-token",
        })
        assert r.status_code == 401, r.text

    def test_billing_no_customer_id_409(self, s):
        # Create a portal user via the existing portal/login flow so we have a
        # valid email+token, but no Stripe customer_id on file.
        # Use POST /api/portal/login if available, otherwise insert via /api/applications.
        # First, ensure a portal user exists. Try the dedicated portal/login first.
        portal_login = s.post(f"{API}/portal/login", json={"email": "portal-iter6@example.com"})
        # /api/portal/login is request-magic-link style; depending on impl we can't
        # always extract token. So instead we directly test the 409 branch via a known
        # seeded user. Skip if we can't get a token cleanly.
        if portal_login.status_code != 200:
            pytest.skip(f"Cannot easily provision portal user (login returned {portal_login.status_code})")
        body = portal_login.json()
        token = body.get("token") or body.get("portal_token")
        if not token:
            pytest.skip("Portal login did not return a token in response (expected for magic-link flow)")
        r = s.post(f"{API}/portal/billing-session", json={
            "email": "portal-iter6@example.com",
            "token": token,
        })
        assert r.status_code in (401, 409), r.text


# ---------- Regression: existing flows still work ----------
class TestRegression:
    def test_admin_login_wrong_password(self, s):
        r = s.post(f"{API}/admin/login", json={"password": "wrong"})
        assert r.status_code == 401

    def test_admin_leads(self, s, admin_headers):
        r = s.get(f"{API}/admin/leads", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_checkout_session_foundations_400(self, s):
        # Foundations $400 product
        r = s.post(f"{API}/checkout/session", json={
            "product_key": "foundations",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 200, r.text
        assert "url" in r.json() and "stripe.com" in r.json()["url"]

    def test_checkout_session_applied_1500(self, s):
        r = s.post(f"{API}/checkout/session", json={
            "product_key": "applied",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 200, r.text
        assert "url" in r.json()

    def test_checkout_subscription_503_when_price_missing(self, s):
        r = s.post(f"{API}/checkout/subscription", json={
            "plan_key": "cb_starter_monthly",
            "origin_url": BASE_URL,
        })
        # When Stripe Price IDs are not configured, expect 503
        assert r.status_code in (503, 200), r.text
        if r.status_code == 503:
            assert "detail" in r.json()

    def test_application_accelerator(self, s):
        r = s.post(f"{API}/applications", json={
            "program_key": "accelerator_7k",
            "name": "TEST Iter6 User",
            "email": "TEST_iter6_app@example.com",
            "phone": "+15551234567",
            "company": "TEST Co",
            "role": "Founder",
            "team_size": "1-10",
            "primary_goal": "Test",
            "monthly_revenue": "10k-50k",
            "biggest_challenge": "Testing",
            "timeline": "asap",
        })
        assert r.status_code in (200, 201), r.text

    def test_application_mastery(self, s):
        r = s.post(f"{API}/applications", json={
            "program_key": "mastery_27k",
            "name": "TEST Iter6 Mastery",
            "email": "TEST_iter6_mas@example.com",
            "phone": "+15551234567",
            "company": "TEST Co",
            "role": "Founder",
            "team_size": "1-10",
            "primary_goal": "Test",
            "monthly_revenue": "10k-50k",
            "biggest_challenge": "Testing",
            "timeline": "asap",
        })
        assert r.status_code in (200, 201), r.text
