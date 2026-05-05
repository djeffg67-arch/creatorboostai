"""Iter 60 — Phase 1 functional tests.

Coverage:
  • Weak Signal Scoring (touch_signal, thresholds, capping, history)
  • Region persistence on capture + agent_runs
  • Correction Agent (recovery, exhaustion, backoff timing)
  • SMS no-op when Twilio not configured (preview env)
  • Regression: business-builder/tools=17, orchestrator/list still works
  • Capture without outbound_help: no orchestrator_run_started entry
  • No compliance content in capture/asset
"""
from __future__ import annotations

import os
import sys
import time
import uuid
import asyncio
import pytest
import requests

# Load backend env so FOUNDER_PHONE / EMERGENT_LLM_KEY are available to in-process imports
from dotenv import load_dotenv  # type: ignore
load_dotenv("/app/backend/.env")

# add backend to path so we can import signal_scoring + correction_agent
sys.path.insert(0, "/app/backend")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def founder_auth(api):
    r = api.post(f"{BASE_URL}/api/ops/founder-access", json={"key": FOUNDER_KEY}, timeout=60)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    d = r.json()
    return {"email": d["email"], "token": d["token"]}


def _make_db():
    """Create a fresh motor client. Must be called INSIDE the running event loop
    because motor binds the IO executor to the loop active at construction time."""
    from motor.motor_asyncio import AsyncIOMotorClient
    return AsyncIOMotorClient(MONGO_URL)[DB_NAME]


@pytest.fixture
def db():
    """Placeholder fixture — call _make_db() inside async functions instead."""
    return None


def _rand_email(tag: str) -> str:
    return f"qa.iter60.{tag}.{uuid.uuid4().hex[:8]}@example.com"


# ──────────────── Capture + signal scoring ────────────────

class TestCaptureSignalScoring:
    """POST /capture with outbound_help=True + 2 blocks; verify signal scoring + region."""

    @pytest.fixture(scope="class")
    def capture_with_help(self, api):
        email = _rand_email("capwh")
        payload = {
            "name": "Texas Realtor",
            "email": email,
            "business_type": "real_estate",
            "business_name": "TexCap Realty",
            "region": "Texas",
            "blocks": [
                {"tool": "business_plan", "tool_label": "Business Plan",
                 "markdown": "# Plan\n\nbody"},
                {"tool": "icp", "tool_label": "ICP Brief",
                 "markdown": "# ICP\n\nbody"},
            ],
            "wants_outbound_help": True,
            "consent_marketing": True,
            "source": "qa_iter60",
        }
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json=payload, timeout=60)
        assert r.status_code == 200, f"capture failed: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert d.get("ok") is True
        return {"resp": d, "email": email}

    def test_capture_lead_signal_score_and_region(self, db, capture_with_help):
        lead_id = capture_with_help["resp"]["lead_id"]
        # poll briefly for orchestrator entries to be appended
        async def _check():
            db = _make_db()
            lead = None
            for _ in range(8):
                lead = await db.leads_registry.find_one(
                    {"lead_id": lead_id},
                    {"_id": 0, "signal_score": 1, "signal_history": 1, "region": 1},
                )
                if lead and (lead.get("signal_score") or 0) >= 50:
                    return lead
                await asyncio.sleep(2)
            return lead
        lead = asyncio.run(_check())
        assert lead is not None, "lead not in registry"
        score = lead.get("signal_score") or 0
        assert score >= 50, f"signal_score expected >=50, got {score}"
        assert lead.get("region") == "Texas", f"region={lead.get('region')!r}"
        history = lead.get("signal_history") or []
        kinds = [e.get("kind") for e in history]
        # Required deltas per capture: 1x capture_submitted + 2x builder_tool_run.
        # Lead-engine merges may cause duplicate runs; allow >=1 captures with proper ratios.
        cap_count = kinds.count("capture_submitted")
        assert cap_count >= 1, f"missing capture_submitted: {kinds}"
        assert kinds.count("builder_tool_run") >= 2 * cap_count, f"builder_tool_run<2*captures: {kinds}"

    def test_capture_with_help_triggers_orchestrator_signal_entries(self, db, capture_with_help, founder_auth, api):
        """Wait for the background orchestrator to fire orchestrator_run_started + asset_generated."""
        lead_id = capture_with_help["resp"]["lead_id"]

        async def _poll():
            db = _make_db()
            kinds: list = []
            deadline = time.time() + 120
            while time.time() < deadline:
                lead = await db.leads_registry.find_one(
                    {"lead_id": lead_id}, {"_id": 0, "signal_history": 1},
                )
                kinds = [e.get("kind") for e in ((lead or {}).get("signal_history") or [])]
                if "orchestrator_run_started" in kinds and "asset_generated" in kinds:
                    return kinds
                await asyncio.sleep(8)
            return kinds

        kinds = asyncio.run(_poll())
        assert "orchestrator_run_started" in kinds, f"missing orchestrator_run_started; kinds={kinds}"
        assert "asset_generated" in kinds, f"missing asset_generated; kinds={kinds}"

    def test_capture_no_help_no_orchestrator_entry(self, db, api):
        email = _rand_email("cap_nohelp")
        payload = {
            "name": "NoHelp",
            "email": email,
            "business_type": "general",
            "business_name": "NoHelpCo",
            "blocks": [
                {"tool": "business_plan", "tool_label": "Business Plan", "markdown": "# x\n\ny"},
            ],
            "wants_outbound_help": False,
            "consent_marketing": True,
            "source": "qa_iter60_nohelp",
        }
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json=payload, timeout=60)
        assert r.status_code == 200
        lead_id = r.json()["lead_id"]
        time.sleep(8)

        async def _get():
            db = _make_db()
            return await db.leads_registry.find_one(
                {"lead_id": lead_id}, {"_id": 0, "signal_history": 1},
            )
        lead = asyncio.run(_get())
        kinds = [e.get("kind") for e in (lead.get("signal_history") or [])]
        assert "orchestrator_run_started" not in kinds, f"unexpected orchestrator_run_started; kinds={kinds}"
        cap_count = kinds.count("capture_submitted")
        assert cap_count >= 1
        assert kinds.count("builder_tool_run") >= cap_count


# ──────────────── Signal cap + threshold crossing ────────────────

class TestSignalCapAndThreshold:
    @pytest.fixture(scope="class")
    def seed_lead(self, api):
        # Use capture to create a lead
        email = _rand_email("cap_test")
        payload = {
            "name": "Cap Tester", "email": email,
            "business_type": "general", "business_name": "CapCo",
            "blocks": [{"tool": "x", "tool_label": "X", "markdown": "# x\nbody"}],
            "wants_outbound_help": False,
        }
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json=payload, timeout=60)
        assert r.status_code == 200
        return r.json()["lead_id"]

    def test_score_caps_at_100(self, db, seed_lead):
        from signal_scoring import touch_signal

        async def _go():
            db = _make_db()
            for _ in range(6):
                await touch_signal(db, seed_lead, "capture_submitted", sms=False)
            lead = await db.leads_registry.find_one({"lead_id": seed_lead}, {"_id": 0, "signal_score": 1})
            return lead.get("signal_score")

        score = asyncio.run(_go())
        assert score == 100, f"expected cap at 100 got {score}"

    def test_threshold_hot_fires_once_no_twilio(self, db, api):
        """Direct touch_signal: prev<80, delta crosses 80 → crossed='hot', SMS no-op (ok=False)."""
        from signal_scoring import touch_signal

        # New lead via capture
        email = _rand_email("hot")
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json={
            "name": "Hot", "email": email,
            "business_type": "general", "business_name": "HotCo",
            "blocks": [{"tool": "x", "tool_label": "X", "markdown": "# x\ny"}],
            "wants_outbound_help": False,
        }, timeout=60)
        lead_id = r.json()["lead_id"]

        async def _go():
            db = _make_db()
            # Force score to ~75 by direct mongo set, then crossing
            await db.leads_registry.update_one(
                {"lead_id": lead_id},
                {"$set": {"signal_score": 75, "signal_alerts_fired": {}}},
            )
            res1 = await touch_signal(db, lead_id, "email_replied")  # +35 → cap 100
            res2 = await touch_signal(db, lead_id, "email_replied")  # already capped + already fired
            lead = await db.leads_registry.find_one(
                {"lead_id": lead_id},
                {"_id": 0, "signal_score": 1, "signal_alerts_fired": 1},
            )
            return res1, res2, lead

        res1, res2, lead = asyncio.run(_go())
        assert res1["score"] == 100
        assert res1["crossed_threshold"] in ("hot", "urgent"), f"expected crossing got {res1}"
        # SMS should be a graceful no-op (ok=False) since Twilio creds absent
        if res1.get("sms_result") is not None:
            assert res1["sms_result"].get("ok") is False, f"sms_result expected ok=False, got {res1['sms_result']}"
        # signal_alerts_fired persists ONLY if FOUNDER_PHONE is set in this test process.
        # In preview, dotenv loading should populate it; if it's missing we still validate
        # that the crossing was detected and SMS path didn't crash.
        if os.environ.get("FOUNDER_PHONE"):
            fired = lead.get("signal_alerts_fired") or {}
            assert fired.get("hot") or fired.get("urgent"), f"alerts_fired missing: {fired}"
        # second call: no new crossing (already fired OR cap already at 100)
        assert res2.get("crossed_threshold") is None, f"second call should not re-cross: {res2}"


# ──────────────── Correction Agent ────────────────

class TestCorrectionAgent:
    def test_recovers_on_second_attempt(self, db):
        from correction_agent import with_correction

        attempt = {"n": 0}

        async def flaky():
            attempt["n"] += 1
            if attempt["n"] < 2:
                raise RuntimeError("transient boom")
            return "ok"

        async def _go():
            db = _make_db()
            res = await with_correction(flaky, kind="qa_recover_test", db=db,
                                         lead_id="qa-lead-recover")
            await asyncio.sleep(0.2)
            doc = await db.workflow_corrections.find_one(
                {"kind": "qa_recover_test", "lead_id": "qa-lead-recover"},
                sort=[("created_at", -1)],
            )
            return res, doc

        res, doc = asyncio.run(_go())
        assert res == "ok"
        assert doc is not None, "workflow_corrections doc missing"
        assert doc["status"] == "recovered", f"status={doc.get('status')}"
        # attempts list contains exactly the failed attempt + recovery marker (per code: attempts + [{i:1, ok:True}])
        attempts = doc.get("attempts") or []
        # length is 2 (1 failed + 1 ok marker)
        assert len(attempts) == 2, f"attempts len={len(attempts)}: {attempts}"
        assert attempts[0]["ok"] is False
        assert attempts[1]["ok"] is True

    def test_exhausts_three_attempts_and_raises(self, db):
        from correction_agent import with_correction

        async def always_fail():
            raise ValueError("perm boom")

        async def _go():
            db = _make_db()
            err = None
            try:
                await with_correction(always_fail, kind="qa_fail_test", db=db,
                                       lead_id="qa-lead-fail")
            except Exception as e:
                err = e
            await asyncio.sleep(0.2)
            doc = await db.workflow_corrections.find_one(
                {"kind": "qa_fail_test", "lead_id": "qa-lead-fail"},
                sort=[("created_at", -1)],
            )
            return err, doc

        err, doc = asyncio.run(_go())
        assert isinstance(err, ValueError), f"expected ValueError, got {type(err)}"
        assert doc is not None
        assert doc["status"] == "failed", f"status={doc.get('status')}"
        attempts = doc.get("attempts") or []
        assert len(attempts) == 3, f"expected 3 attempts, got {len(attempts)}"
        assert all(a.get("ok") is False for a in attempts)

    def test_backoff_timing(self, db):
        """3 failures should take >= 10s (0+2+8) and < 15s."""
        from correction_agent import with_correction

        async def always_fail():
            raise RuntimeError("boom")

        async def _go():
            db = _make_db()
            t0 = time.time()
            try:
                await with_correction(always_fail, kind="qa_timing_test", db=db,
                                       lead_id="qa-lead-timing")
            except Exception:
                pass
            return time.time() - t0

        elapsed = asyncio.run(_go())
        assert 9.5 <= elapsed < 15.0, f"backoff timing out of range: {elapsed:.2f}s"


# ──────────────── Region field bounds ────────────────

class TestRegionBounds:
    def test_region_80_chars_ok(self, api):
        region80 = "C" * 80
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json={
            "name": "RegionMax", "email": _rand_email("r80"),
            "business_type": "general", "business_name": "RegionMaxCo",
            "region": region80,
            "blocks": [{"tool": "x", "tool_label": "X", "markdown": "# x\ny"}],
            "wants_outbound_help": False,
        }, timeout=60)
        assert r.status_code == 200, f"80-char region rejected: {r.status_code} {r.text[:200]}"

    def test_region_81_chars_rejected(self, api):
        region81 = "C" * 81
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json={
            "name": "RegionOver", "email": _rand_email("r81"),
            "business_type": "general", "business_name": "RegionOverCo",
            "region": region81,
            "blocks": [{"tool": "x", "tool_label": "X", "markdown": "# x\ny"}],
            "wants_outbound_help": False,
        }, timeout=60)
        # Pydantic max_length=80 → 422
        assert r.status_code in (422, 400), f"expected 422/400 for 81-char region got {r.status_code}"


# ──────────────── No compliance content ────────────────

class TestNoComplianceContent:
    def test_no_dre_or_state_specific_compliance_in_response(self, api):
        """California real_estate capture; the only legal text allowed is the disclaimer
        'Draft document — not licensed advice'. NO DRE/state-specific compliance text."""
        email = _rand_email("compliance_check")
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json={
            "name": "Cali Realtor", "email": email,
            "business_type": "real_estate", "business_name": "CaliCo",
            "region": "California",
            "blocks": [{"tool": "business_plan", "tool_label": "Business Plan",
                        "markdown": "# Plan\n\nCalifornia real estate."}],
            "wants_outbound_help": False,
        }, timeout=60)
        assert r.status_code == 200
        # The capture response itself shouldn't include compliance/DRE text
        body = r.text
        for forbidden in ("DRE", "Bureau of Real Estate", "California Bureau",
                          "BRE License", "Department of Real Estate"):
            assert forbidden.lower() not in body.lower(), f"forbidden compliance text '{forbidden}' present"


# ──────────────── Regression checks ────────────────

class TestRegression:
    def test_business_builder_tools_returns_17(self, api):
        r = api.get(f"{BASE_URL}/api/business-builder/tools", timeout=20)
        assert r.status_code == 200, f"tools list failed: {r.status_code}"
        data = r.json()
        tools = data.get("tools") or data
        assert isinstance(tools, list)
        assert len(tools) == 17, f"expected 17 tools, got {len(tools)}"

    def test_orchestrator_list_still_works(self, api, founder_auth):
        r = api.post(f"{BASE_URL}/api/orchestrator/list", json=founder_auth, timeout=60)
        assert r.status_code == 200, f"orchestrator list failed: {r.status_code} {r.text[:200]}"
        d = r.json()
        assert "runs" in d and isinstance(d["runs"], list)
        assert "kpi" in d
        for k in ("total", "completed", "emails_sent", "avg_duration_ms"):
            assert k in d["kpi"]

    def test_agent_runs_region_persisted(self, db, api):
        """Run /api/orchestrator/run with region; verify agent_runs.region populated."""
        email = _rand_email("region_run")
        r = api.post(f"{BASE_URL}/api/orchestrator/run", json={
            "lead": {
                "name": "Region Run", "email": email,
                "business_name": "RegionCo",
                "industry": "general",
                "region": "Florida",
                "notes": "test",
                "wants_outbound_help": True,
            },
            "triggered_by": "qa_iter60_region",
        }, timeout=180)
        assert r.status_code == 200, f"orch /run failed: {r.status_code} {r.text[:300]}"
        run_id = r.json()["run_id"]

        async def _get():
            db = _make_db()
            return await db.agent_runs.find_one({"id": run_id}, {"_id": 0, "region": 1, "lead_id": 1})

        doc = asyncio.run(_get())
        assert doc is not None
        assert doc.get("region") == "Florida", f"region not on agent_runs: {doc.get('region')!r}"
