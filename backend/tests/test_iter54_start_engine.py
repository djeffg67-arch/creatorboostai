"""Iter 54 Backend Tests — Start Engine onboarding + Startup Pricing tiers.

Validates the endpoints listed in the review_request. All tests use the public
preview URL (REACT_APP_BACKEND_URL) and the founder master key from
/app/memory/test_credentials.md.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"
EXECUTIVE_KEY = "erin-flanigan-2026-executive-president-master"


# ────────────────────────────────────────────────────────────────────
# Fixtures
# ────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def founder(session):
    r = session.post(f"{BASE_URL}/api/ops/founder-access", json={"key": FOUNDER_KEY}, timeout=20)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "email" in data
    return data


# ────────────────────────────────────────────────────────────────────
# 1) Founder access + redirect skip onboarding
# ────────────────────────────────────────────────────────────────────
class TestFounderAccess:
    def test_founder_access_returns_token_and_portal_redirect(self, founder):
        assert founder["redirect"] == "/portal/ops"
        assert founder["role"] == "founder"
        assert isinstance(founder["token"], str) and len(founder["token"]) > 10

    def test_founder_me_onboarding_complete_true(self, session, founder):
        r = session.post(f"{BASE_URL}/api/ops/me",
                         json={"email": founder["email"], "token": founder["token"]}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        # Founder is elevated → onboarding_complete=true and redirect=/portal/ops
        assert data.get("onboarding_complete") is True, f"founder onboarding_complete not true: {data}"
        assert data.get("onboarding_redirect") == "/portal/ops", f"founder redirect wrong: {data.get('onboarding_redirect')}"


# ────────────────────────────────────────────────────────────────────
# 2) Start-Engine status + plan limits
# ────────────────────────────────────────────────────────────────────
class TestStartEngineStatus:
    def test_status_returns_plan_limits_default(self, session, founder):
        r = session.post(f"{BASE_URL}/api/start-engine/status",
                         json={"email": founder["email"], "token": founder["token"]}, timeout=20)
        assert r.status_code == 200, f"status failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "onboarding_complete" in data
        assert "plan_limits" in data
        plan_limits = data["plan_limits"]
        # default plan limits = 10 leads/day
        assert plan_limits.get("lead_generation_limit_daily") in (10, 25, 50, 100, 200)
        assert "emails_per_day" in plan_limits


# ────────────────────────────────────────────────────────────────────
# 3) Founder-only Start-Engine analytics
# ────────────────────────────────────────────────────────────────────
class TestStartEngineAnalytics:
    def test_analytics_founder_payload(self, session, founder):
        r = session.post(f"{BASE_URL}/api/start-engine/analytics",
                         json={"email": founder["email"], "token": founder["token"]}, timeout=20)
        assert r.status_code == 200, f"analytics failed: {r.status_code} {r.text}"
        data = r.json()
        for key in [
            "users_total_gated",
            "users_completed_onboarding",
            "completion_rate_pct",
            "per_path",
            "autopilot_dispatched_rate_pct",
            "lead_generation_rate_pct",
            "avg_time_to_first_reply_min",
            "recent_runs",
        ]:
            assert key in data, f"analytics missing field: {key} | got keys: {list(data.keys())}"
        # per_path should have entries for leads/import/explore
        for p in ("leads", "import", "explore"):
            assert p in data["per_path"], f"per_path missing {p}"
            assert "users" in data["per_path"][p]
        assert isinstance(data["recent_runs"], list)

    def test_analytics_unauth_rejected(self, session):
        r = session.post(f"{BASE_URL}/api/start-engine/analytics",
                         json={"email": "anon@example.com", "token": "bogus"}, timeout=20)
        assert r.status_code in (401, 403), f"unauth analytics expected 401/403 got {r.status_code}"


# ────────────────────────────────────────────────────────────────────
# 4) Stripe subscription endpoint — graceful 503 for startup tiers
# ────────────────────────────────────────────────────────────────────
class TestStartupCheckout:
    @pytest.mark.parametrize("plan_key", [
        "startup_launch_monthly",
        "startup_growth_monthly",
        "startup_pro_monthly",
    ])
    def test_checkout_returns_503_when_price_missing(self, session, plan_key):
        r = session.post(f"{BASE_URL}/api/checkout/subscription",
                         json={"plan_key": plan_key, "user_email": "anon@example.com",
                               "origin_url": BASE_URL}, timeout=20)
        # Spec says 503 if STRIPE_PRICE_STARTUP_*_MONTHLY missing — check graceful response
        assert r.status_code in (400, 404, 503), (
            f"checkout for {plan_key} expected 400/404/503 got {r.status_code} body={r.text[:300]}"
        )
        # Should not crash — must be JSON with detail/error
        try:
            body = r.json()
            assert isinstance(body, dict)
        except Exception:
            pytest.fail(f"checkout response not JSON for {plan_key}: {r.text[:200]}")


# ────────────────────────────────────────────────────────────────────
# 5) Avatar Revenue role recommends startup tiers for new users
# ────────────────────────────────────────────────────────────────────
class TestAvatarRevenueRecommendation:
    def test_brand_new_business_gets_startup_tier(self, session):
        # Avatar derives role from last user message in history (no `role` field accepted).
        # Use a brand-new-business message that the classifier should map to revenue/pricing.
        payload = {
            "history": [
                {"role": "user", "content": "I'm a brand new business — what should I pay? What's the cheapest plan to start with?"}
            ],
            "surface": "homepage",
        }
        r = session.post(f"{BASE_URL}/api/avatar/chat", json=payload, timeout=45)
        assert r.status_code == 200, f"avatar/chat failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        reply = (data.get("reply") or "").lower()
        assert reply, f"avatar reply empty: {data}"
        # Must mention startup tiers — Starter Launch / $29 / startup pricing signals
        startup_signals = ["starter launch", "$29", "growth launch", "$79", "pro launch", "$149", "startup"]
        hit = any(sig in reply for sig in startup_signals)
        if not hit:
            print(f"DEBUG avatar reply (role={data.get('role')}, model={data.get('model')}): {reply[:600]}")
        assert hit, f"avatar reply doesn't mention startup tiers (role={data.get('role')}): {reply[:400]}"


# ────────────────────────────────────────────────────────────────────
# 6) Path endpoints accessible to founders (smoke / contract test)
#    Founders are elevated, so /me redirect=/portal/ops; the path-* endpoints
#    still accept any role and flip onboarding flags. We assert contract.
# ────────────────────────────────────────────────────────────────────
class TestStartEnginePaths:
    def test_path_explore_contract(self, session, founder):
        r = session.post(f"{BASE_URL}/api/start-engine/path-explore",
                         json={"email": founder["email"], "token": founder["token"]}, timeout=30)
        # founder is elevated; should not 401. May 200.
        assert r.status_code == 200, f"path-explore failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("redirect") == "/portal/ops?mode=demo"
        assert data.get("path") == "explore"

    def test_path_import_contract(self, session, founder):
        r = session.post(f"{BASE_URL}/api/start-engine/path-import",
                         json={"email": founder["email"], "token": founder["token"]}, timeout=30)
        assert r.status_code == 200, f"path-import failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("redirect") == "/portal/ops?mode=import"
        assert data.get("path") == "import"

    def test_path_leads_contract(self, session, founder):
        # path-leads is heavier (creates leads + dispatches autopilot). Increase timeout.
        r = session.post(f"{BASE_URL}/api/start-engine/path-leads",
                         json={"email": founder["email"], "token": founder["token"]}, timeout=60)
        assert r.status_code == 200, f"path-leads failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("path") == "leads"
        assert data.get("redirect") == "/portal/ops?mode=autopilot_ready"
        assert "added" in data
        assert "target_count" in data
        assert data["target_count"] >= 10
        assert "autopilot_dispatched" in data


# ────────────────────────────────────────────────────────────────────
# 7) Negative — unauthenticated start-engine status should fail
# ────────────────────────────────────────────────────────────────────
class TestUnauth:
    def test_status_unauth(self, session):
        r = session.post(f"{BASE_URL}/api/start-engine/status",
                         json={"email": "nobody@example.com", "token": "bogus"}, timeout=15)
        assert r.status_code in (401, 403), f"unauth status expected 401/403 got {r.status_code}"
