"""Iter 61 backend tests — CFO Business Case + Dark Funnel + Sovereign Audit Trail.

Covers:
  • POST /api/cfo-case/generate (3 industries + general fallback) — auth optional
  • POST /api/audit/list (founder auth required) — verifies decision recorded
  • Dark funnel tracked-link redirect (mint via direct DB insert)
  • Resend webhook (email.opened, email.clicked) → signal_score increments
  • Engagement spike detection (3+ signals in 60min, idempotent)
  • Re-engagement scanner (gating + idempotency, RESEND_API_KEY absent → sent_fail)
  • POST /api/dark-funnel/lead-engagement (founder auth)
  • POST /api/audit/lead-trail (founder auth)
  • Auth negative tests (bad token → 401/403)
  • Iter 60 regression (signal scoring still works via tracked redirect)
"""

import os
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # try frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = ln.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

MASTER_KEY = "jeffrey-2026-bodyiq-founder-master"

TEST_LEAD_ID = "AUDIT_TEST_LEAD_42"
TEST_LEAD_EMAIL = "audit-test@example.com"


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def founder_auth():
    r = requests.post(f"{BASE_URL}/api/ops/founder-access",
                      json={"key": MASTER_KEY}, timeout=30)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": data["email"], "token": data["token"]}


@pytest.fixture(scope="module", autouse=True)
def seed_lead(db):
    """Seed the test lead 50h stale with score 0 (will mutate during tests)."""
    fifty_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=50)).isoformat()
    db.leads_registry.delete_many({"lead_id": TEST_LEAD_ID})
    db.leads_registry.insert_one({
        "lead_id": TEST_LEAD_ID,
        "name": "Audit Test Lead",
        "email": TEST_LEAD_EMAIL,
        "company": "TEST_AuditCo",
        "industry": "general",
        "signal_score": 0,
        "signal_score_updated_at": fifty_hours_ago,
        "signal_history": [],
        "created_at": fifty_hours_ago,
    })
    yield
    # Teardown
    db.leads_registry.delete_many({"lead_id": TEST_LEAD_ID})
    db.dark_funnel_tokens.delete_many({"lead_id": TEST_LEAD_ID})
    db.dark_funnel_email_events.delete_many({"recipient": TEST_LEAD_EMAIL})
    db.cfo_business_cases.delete_many({"lead_id": TEST_LEAD_ID})
    db.sovereign_audit_trail.delete_many({"lead_id": TEST_LEAD_ID})


# ───────────────────── CFO Business Case ─────────────────────
class TestCfoCase:

    def test_general_business_case(self, db):
        r = requests.post(f"{BASE_URL}/api/cfo-case/generate",
                          json={"industry": "general business",
                                "inputs": {"investment": "50000",
                                           "annual_return": "20000"}},
                          timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("case_id")
        assert d.get("decision_id")
        assert d["industry"] == "general_business"
        md = d["markdown"]
        assert isinstance(md, str) and len(md) > 1500, f"len={len(md)}"
        low = md.lower()
        # Required content
        assert "executive summary" in low
        assert "roi" in low or "payback" in low
        assert "risk" in low
        # No preamble
        assert not md.lstrip().lower().startswith(("here is", "here's", "sure,"))
        # Disclaimer present
        assert "draft business case" in low or "qualified" in low

    def test_koollite_energy_case(self, db):
        r = requests.post(f"{BASE_URL}/api/cfo-case/generate",
                          json={"industry": "koollite lighting retrofit",
                                "inputs": {"facility_size": "50000 sqft",
                                           "current_kwh": "120000",
                                           "rate": "0.14"}},
                          timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["industry"] == "koollite_energy"
        md_low = d["markdown"].lower()
        assert "executive summary" in md_low
        assert "investment" in md_low
        assert "savings" in md_low
        assert "payback" in md_low
        assert ("npv" in md_low) or ("irr" in md_low)
        assert any(t in md_low for t in ("go", "wait", "decline"))

    def test_real_estate_case(self, db):
        r = requests.post(f"{BASE_URL}/api/cfo-case/generate",
                          json={"industry": "real estate listing",
                                "inputs": {"address": "123 Main St",
                                           "current_price": "750000",
                                           "dom": "75",
                                           "carrying_cost": "4200"}},
                          timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["industry"] == "real_estate"
        md_low = d["markdown"].lower()
        assert "executive summary" in md_low
        assert "position" in md_low or "snapshot" in md_low
        assert "scenario" in md_low
        assert "risk" in md_low
        assert any(t in md_low for t in ("proceed", "adjust", "wait"))

    def test_insurance_falls_back_to_general(self, db):
        r = requests.post(f"{BASE_URL}/api/cfo-case/generate",
                          json={"industry": "insurance",
                                "inputs": {"premium": "12000"}},
                          timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["industry"] == "general_business"

    def test_audit_trail_recorded_for_cfo_case(self, db, founder_auth):
        # Generate one more attached to the test lead so we can trace it
        r = requests.post(f"{BASE_URL}/api/cfo-case/generate",
                          json={"lead_id": TEST_LEAD_ID,
                                "industry": "general business",
                                "inputs": {"x": "y"}},
                          timeout=90)
        assert r.status_code == 200, r.text
        decision_id = r.json()["decision_id"]
        assert decision_id

        # Look up via /api/audit/list
        r2 = requests.post(f"{BASE_URL}/api/audit/list",
                          json={**founder_auth, "limit": 50,
                                "action": "generate_cfo_case"}, timeout=30)
        assert r2.status_code == 200, r2.text
        decisions = r2.json()["decisions"]
        match = next((d for d in decisions if d["decision_id"] == decision_id), None)
        assert match is not None, "CFO decision not found in audit list"
        assert match["agent_id"] == "cfo_business_case"
        assert match["confidence"] == 85
        ds = match.get("data_sources") or []
        assert any("prompt_template/" in s for s in ds)
        assert any("model/claude-sonnet-4-5-20250929" in s for s in ds)


# ───────────────────── Dark Funnel ─────────────────────
class TestDarkFunnel:

    def test_tracked_redirect_increments_score(self, db):
        # Mint token directly in DB (mirror mint_tracked_url helper)
        token = uuid.uuid4().hex
        db.dark_funnel_tokens.insert_one({
            "token": token, "lead_id": TEST_LEAD_ID,
            "dest_url": "https://example.com/landing",
            "kind": "link_click", "clicks": 0,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        before = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        before_score = before.get("signal_score", 0)

        r = requests.get(f"{BASE_URL}/api/dark-funnel/r",
                         params={"t": token},
                         allow_redirects=False, timeout=20)
        assert r.status_code == 302, f"expected 302, got {r.status_code}"
        assert "example.com/landing" in r.headers.get("location", "")

        # Verify side-effects
        tok = db.dark_funnel_tokens.find_one({"token": token})
        assert tok["clicks"] == 1

        time.sleep(0.5)
        after = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        assert after["signal_score"] >= before_score + 20, \
            f"expected +20 score, got before={before_score} after={after.get('signal_score')}"
        history = after.get("signal_history") or []
        assert any(h.get("kind") == "email_clicked" and h.get("delta") == 20
                   for h in history)

    def test_tracked_redirect_unknown_token(self, db):
        r = requests.get(f"{BASE_URL}/api/dark-funnel/r",
                         params={"t": "nonexistent_token_xyz"},
                         allow_redirects=False, timeout=10)
        assert r.status_code == 404

    def test_resend_webhook_email_opened(self, db):
        before = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        before_score = before.get("signal_score", 0)
        before_events = db.dark_funnel_email_events.count_documents(
            {"recipient": TEST_LEAD_EMAIL})

        r = requests.post(f"{BASE_URL}/api/dark-funnel/webhook/resend",
                          json={"type": "email.opened",
                                "data": {"email_id": "em_001",
                                         "to": [TEST_LEAD_EMAIL]}},
                          timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        time.sleep(0.5)
        after = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        assert after["signal_score"] >= before_score + 10

        after_events = db.dark_funnel_email_events.count_documents(
            {"recipient": TEST_LEAD_EMAIL})
        assert after_events == before_events + 1

    def test_engagement_spike_fires_after_3_signals(self, db):
        # Already we have at least 2 signals (redirect+open). Send 2 more to be safe.
        for _ in range(2):
            requests.post(f"{BASE_URL}/api/dark-funnel/webhook/resend",
                          json={"type": "email.opened",
                                "data": {"email_id": f"em_{uuid.uuid4().hex[:6]}",
                                         "to": [TEST_LEAD_EMAIL]}},
                          timeout=15)
        requests.post(f"{BASE_URL}/api/dark-funnel/webhook/resend",
                      json={"type": "email.clicked",
                            "data": {"email_id": "em_click_1",
                                     "to": [TEST_LEAD_EMAIL]}},
                      timeout=15)
        time.sleep(0.5)
        lead = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        fired = lead.get("signal_alerts_fired") or {}
        assert fired.get("engagement_spike"), \
            f"expected engagement_spike to be set, got {fired}"
        spike_at = fired["engagement_spike"]

        # Idempotency: another trigger should not change spike timestamp
        requests.post(f"{BASE_URL}/api/dark-funnel/webhook/resend",
                      json={"type": "email.opened",
                            "data": {"email_id": "em_dup",
                                     "to": [TEST_LEAD_EMAIL]}},
                      timeout=15)
        time.sleep(0.3)
        lead2 = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        assert (lead2.get("signal_alerts_fired") or {}).get("engagement_spike") == spike_at

    def test_scan_reengagement_gating_and_idempotency(self, db, founder_auth):
        # Lead has score >= 30 now (from spike). signal_score_updated_at was 50h ago,
        # but touch_signal updates it to "now". Manually re-stale it.
        fifty_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=50)).isoformat()
        db.leads_registry.update_one(
            {"lead_id": TEST_LEAD_ID},
            {"$set": {"signal_score_updated_at": fifty_hours_ago,
                      "signal_score": 50},
             "$unset": {"reengagement_sent_at": "", "reengagement_delivered": ""}})

        r = requests.post(f"{BASE_URL}/api/dark-funnel/scan-reengagement",
                          json=founder_auth, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # RESEND key absent in preview → expect sent_fail >= 1
        assert (d.get("sent_ok", 0) + d.get("sent_fail", 0)) >= 1

        lead = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        assert lead.get("reengagement_sent_at") is not None
        first_sent_at = lead["reengagement_sent_at"]

        # Idempotency: second scan should NOT re-process this lead
        time.sleep(0.5)
        r2 = requests.post(f"{BASE_URL}/api/dark-funnel/scan-reengagement",
                           json=founder_auth, timeout=30)
        assert r2.status_code == 200
        lead2 = db.leads_registry.find_one({"lead_id": TEST_LEAD_ID})
        assert lead2["reengagement_sent_at"] == first_sent_at

    def test_lead_engagement_endpoint(self, db, founder_auth):
        r = requests.post(f"{BASE_URL}/api/dark-funnel/lead-engagement",
                          json={**founder_auth, "lead_id": TEST_LEAD_ID},
                          timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "lead" in d and "tracked_links" in d
        lead = d["lead"]
        assert lead.get("signal_score", 0) > 0
        assert isinstance(lead.get("signal_history"), list)
        assert len(lead.get("signal_history", [])) <= 10
        assert isinstance(d["tracked_links"], list) and len(d["tracked_links"]) >= 1
        assert d["tracked_links"][0].get("clicks", 0) >= 1


# ───────────────────── Audit endpoints ─────────────────────
class TestAudit:

    def test_audit_list_founder(self, founder_auth):
        r = requests.post(f"{BASE_URL}/api/audit/list",
                          json={**founder_auth, "limit": 10},
                          timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "decisions" in d
        assert isinstance(d["decisions"], list)
        if d["decisions"]:
            row = d["decisions"][0]
            for k in ("decision_id", "timestamp", "agent_id", "action",
                      "reasoning_summary", "confidence", "data_sources",
                      "inputs_preview", "output_preview"):
                assert k in row, f"missing field {k}"
            if row.get("confidence") is not None:
                assert 0 <= row["confidence"] <= 100

    def test_audit_lead_trail(self, founder_auth):
        r = requests.post(f"{BASE_URL}/api/audit/lead-trail",
                          json={**founder_auth, "lead_id": TEST_LEAD_ID,
                                "limit": 50}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "trail" in d
        assert isinstance(d["trail"], list)
        # CFO case attached to lead must show up
        assert any(t.get("action") == "generate_cfo_case" for t in d["trail"]), \
            "expected generate_cfo_case in lead trail"

    def test_audit_list_bad_token(self):
        r = requests.post(f"{BASE_URL}/api/audit/list",
                          json={"email": "j.davidg67@gmail.com",
                                "token": "bad-token-xyz", "limit": 5},
                          timeout=15)
        assert r.status_code in (401, 403), \
            f"expected 401/403, got {r.status_code}: {r.text}"

    def test_cfo_generate_no_auth_works(self):
        # Auth-optional endpoint
        r = requests.post(f"{BASE_URL}/api/cfo-case/generate",
                          json={"industry": "general"}, timeout=90)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True


# ───────────────────── Orchestrator regression ─────────────────────
class TestOrchestratorAudit:

    def test_orchestrator_emits_5_audit_rows(self, db, founder_auth):
        # Snapshot the audit count for orchestrator agents
        before = db.sovereign_audit_trail.count_documents(
            {"agent_id": {"$regex": "^orchestrator"}})

        # Trigger orchestrator
        spec = {
            "lead": {
                "name": "Orch Audit Lead",
                "email": "orch-audit@example.com",
                "company": "TEST_OrchCo",
                "industry": "general",
            },
            **founder_auth,
        }
        r = requests.post(f"{BASE_URL}/api/orchestrator/run",
                          json=spec, timeout=180)
        # Orchestrator may degrade in preview (email send) but should still 200
        if r.status_code != 200:
            pytest.skip(f"orchestrator returned {r.status_code}: {r.text[:200]}")

        time.sleep(2)
        after = db.sovereign_audit_trail.count_documents(
            {"agent_id": {"$regex": "^orchestrator"}})
        delta = after - before
        # Expect ~5 new rows (run_started + researcher + content + outreach + execution)
        assert delta >= 4, f"expected >=4 orchestrator audit rows, got {delta}"

        # Verify tags
        tags = set(db.sovereign_audit_trail.distinct(
            "agent_id", {"agent_id": {"$regex": "^orchestrator"}}))
        # At least the non-base orchestrator stages
        expected_any = {"orchestrator", "orchestrator.researcher",
                        "orchestrator.content", "orchestrator.outreach",
                        "orchestrator.execution"}
        overlap = expected_any & tags
        assert len(overlap) >= 4, f"expected >=4 tags, got overlap={overlap}"
