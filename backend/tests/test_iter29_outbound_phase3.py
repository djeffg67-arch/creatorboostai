"""Iteration 29 · CreatorBoostAI Outbound Engine Phase 3
Tests autopilot loop, sources-status, clay-webhook, 8-category mark-replied, RBAC.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"
EXEC_KEY = "erin-flanigan-2026-executive-president-master"


def _login(master_key: str):
    r = requests.post(f"{API}/ops/founder-access", json={"key": master_key}, timeout=15)
    if r.status_code == 200:
        d = r.json()
        return d["email"], d["token"]
    r = requests.post(f"{API}/ops/executive-access", json={"key": master_key}, timeout=15)
    if r.status_code == 200:
        d = r.json()
        return d["email"], d["token"]
    pytest.skip(f"Auth failed for {master_key}: {r.status_code} {r.text[:150]}")


@pytest.fixture(scope="module")
def founder():
    e, t = _login(FOUNDER_KEY)
    return {"email": e, "token": t}


@pytest.fixture(scope="module")
def execu():
    e, t = _login(EXEC_KEY)
    return {"email": e, "token": t}


# ── Sources Status ──
class TestSourcesStatus:
    def test_sources_status_shape(self, founder):
        r = requests.post(f"{API}/ops/outbound/sources-status", json=founder, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sources" in data
        src = data["sources"]
        for key in ("apollo", "outscraper", "clay", "instantly", "smartlead"):
            assert key in src, f"missing source {key}"
            assert isinstance(src[key], bool)
            assert src[key] is False, f"{key} should be False (env not set)"


# ── Autopilot Now ──
class TestAutopilotNow:
    def test_autopilot_now_founder_full_cycle(self, founder):
        r = requests.post(f"{API}/ops/outbound/autopilot-now", json=founder, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("ok", "started_at", "seeded", "external_added",
                    "sources_configured", "scored", "sent_this_cycle",
                    "imap", "cold_finalized", "finished_at", "sent_today"):
            assert key in data, f"missing key {key} in response keys={list(data.keys())}"
        assert data["ok"] is True
        assert isinstance(data["seeded"], dict)
        assert "added" in data["seeded"] and "skipped" in data["seeded"]
        # sources_configured should be {apollo, outscraper, clay, instantly, smartlead}
        sc = data["sources_configured"]
        assert isinstance(sc, dict)
        for key in ("apollo", "outscraper", "clay", "instantly", "smartlead"):
            assert key in sc

    def test_autopilot_now_executive_403(self, execu):
        r = requests.post(f"{API}/ops/outbound/autopilot-now", json=execu, timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"

    def test_autopilot_now_no_auth_401(self):
        r = requests.post(f"{API}/ops/outbound/autopilot-now",
                          json={"email": "nobody@example.com", "token": "garbage"},
                          timeout=30)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:200]}"


# ── Autopilot History ──
class TestAutopilotHistory:
    def test_history_returns_runs(self, founder):
        r = requests.post(f"{API}/ops/outbound/autopilot-history", json=founder, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "runs" in data
        assert isinstance(data["runs"], list)
        # After previous test_autopilot_now test, should have at least one run
        if data["runs"]:
            run = data["runs"][0]
            assert "started_at" in run
            assert "scored" in run
            assert "sent_this_cycle" in run


# ── Clay Webhook (public endpoint) ──
class TestClayWebhook:
    def test_clay_webhook_not_configured(self):
        r = requests.post(f"{API}/ops/outbound/clay-webhook",
                          json={"secret": "whatever", "leads": []}, timeout=15)
        # Env has no CLAY_WEBHOOK_SECRET → 503
        assert r.status_code in (503, 403), f"expected 503/403, got {r.status_code}: {r.text[:200]}"


# ── Dashboard new fields ──
class TestDashboard:
    def test_dashboard_has_new_fields(self, founder):
        r = requests.post(f"{API}/ops/outbound/dashboard", json=founder, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "last_autopilot_run" in data, f"missing last_autopilot_run in {list(data.keys())}"
        assert "sources_configured" in data, f"missing sources_configured in {list(data.keys())}"


# ── 8-Category mark-replied ──
class TestMarkRepliedCategories:
    def _add_prospect(self, founder, label):
        test_email = f"test_iter29_{uuid.uuid4().hex[:8]}_{label}@example.com"
        payload = {
            "auth_email": founder["email"],
            "auth_token": founder["token"],
            "business_name": f"TEST Iter29 {label}",
            "email": test_email,
        }
        r = requests.post(f"{API}/ops/outbound/prospects/add", json=payload, timeout=30)
        if r.status_code != 200:
            pytest.skip(f"add prospect failed: {r.status_code} {r.text[:150]}")
        data = r.json()
        pid = data.get("prospect_id") or data.get("id") or (data.get("prospect") or {}).get("id")
        if not pid:
            pytest.skip(f"no id returned: {data}")
        return pid, test_email

    def _mark(self, founder, pid, category):
        return requests.post(
            f"{API}/ops/outbound/prospects/mark-replied",
            json={**founder, "prospect_id": pid,
                  "reply_body": f"test reply for {category}",
                  "category": category},
            timeout=30,
        )

    def _fetch(self, founder, pid):
        # fetch via list — find our id
        r = requests.post(f"{API}/ops/outbound/prospects/list",
                          json={**founder}, timeout=30)
        if r.status_code != 200:
            return None
        items = r.json().get("items") or r.json().get("prospects") or []
        for p in items:
            if p.get("id") == pid:
                return p
        return None

    def test_unsubscribe_sets_flags(self, founder):
        pid, _ = self._add_prospect(founder, "unsub")
        r = self._mark(founder, pid, "unsubscribe")
        assert r.status_code == 200, r.text
        p = self._fetch(founder, pid)
        assert p is not None, "prospect not found after mark-replied"
        assert p.get("unsubscribed") is True, f"unsubscribed should be True, got {p.get('unsubscribed')}"
        assert p.get("suppressed") is True, f"suppressed should be True, got {p.get('suppressed')}"
        assert p.get("status") == "unsubscribed", f"got status={p.get('status')}"

    def test_needs_demo_status_replied_positive(self, founder):
        pid, _ = self._add_prospect(founder, "demo")
        r = self._mark(founder, pid, "needs_demo")
        assert r.status_code == 200, r.text
        p = self._fetch(founder, pid)
        assert p is not None
        assert p.get("status") == "replied_positive", f"expected replied_positive, got {p.get('status')}"
        assert p.get("reply_category") == "needs_demo"

    def test_not_interested_auto_suppressed(self, founder):
        pid, _ = self._add_prospect(founder, "noint")
        r = self._mark(founder, pid, "not_interested")
        assert r.status_code == 200, r.text
        p = self._fetch(founder, pid)
        assert p is not None
        assert p.get("status") == "not_interested"
        assert p.get("suppressed") is True, "not_interested should auto-suppress"


# ── Static code-level verification ──
def test_followup_offsets_and_categories_in_code():
    with open("/app/backend/outbound.py", "r") as f:
        src = f.read()
    assert "FOLLOWUP_OFFSETS_DAYS = [2, 5, 10]" in src
    for cat in ("interested", "asked_question", "needs_demo", "not_interested",
                "unsubscribe", "wrong_person", "positive", "needs_founder_response"):
        assert f'"{cat}"' in src, f"category {cat} missing"


def test_lead_sources_module_exists_and_unconfigured():
    import importlib.util
    spec = importlib.util.spec_from_file_location("lead_sources_mod", "/app/backend/lead_sources.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for cls_name in ("ApolloAdapter", "OutscraperAdapter", "ClayAdapter",
                     "InstantlyAdapter", "SmartleadAdapter"):
        assert hasattr(mod, cls_name), f"missing {cls_name}"
        cls = getattr(mod, cls_name)
        assert cls.is_configured() is False


def test_server_startup_log_line_in_source():
    with open("/app/backend/server.py", "r") as f:
        src = f.read()
    assert "background scheduler + imap poller + daily autopilot dispatched" in src
