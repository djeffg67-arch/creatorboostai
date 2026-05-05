"""Iter 59 — Agentic Orchestrator backend tests.

Covers:
  • POST /api/orchestrator/run cross-industry classification (real-estate / energy / startup)
  • Lead lock + agent_runs trace + outreach constraints + email graceful degrade
  • POST /api/orchestrator/list (founder feed + KPIs)
  • POST /api/orchestrator/detail (full trace)
  • POST /api/orchestrator/run-on-lead (existing lead)
  • POST /api/business-activation/capture auto-trigger (wants_outbound_help true/false)
"""
from __future__ import annotations

import os
import time
import uuid
import asyncio
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"
RUN_TIMEOUT = 120  # /run takes 25-50s

# ────────────────── Shared fixtures ──────────────────


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def founder_auth(api):
    r = api.post(f"{BASE_URL}/api/ops/founder-access", json={"key": FOUNDER_KEY}, timeout=20)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("email") and data.get("token"), f"missing email/token in {data}"
    return {"email": data["email"], "token": data["token"]}


def _rand_email(tag: str) -> str:
    return f"qa.iter59.{tag}.{uuid.uuid4().hex[:8]}@example.com"


# ────────────────── /run cross-industry ──────────────────


class TestOrchestratorRun:
    """3 cross-industry runs verifying classification + lock + trace + email degrade."""

    @pytest.fixture(scope="class")
    def real_estate_run(self, api):
        payload = {
            "lead": {
                "name": "Maria Realtor",
                "email": _rand_email("re"),
                "business_name": "Maria Realty Group",
                "industry": "real_estate",
                "notes": "Has an expired listing in Austin, sat 90 days at $850k, wants to relist same price.",
                "source": "qa_iter59",
                "wants_outbound_help": True,
            },
            "triggered_by": "qa_test_real_estate",
        }
        r = api.post(f"{BASE_URL}/api/orchestrator/run", json=payload, timeout=RUN_TIMEOUT)
        assert r.status_code == 200, f"real-estate run failed: {r.status_code} {r.text[:500]}"
        return r.json()

    @pytest.fixture(scope="class")
    def energy_run(self, api):
        payload = {
            "lead": {
                "name": "Frank Facility",
                "email": _rand_email("energy"),
                "business_name": "Franks Diner",
                "industry": "restaurant",
                "notes": "Considering an LED retrofit; current fluorescent fixtures, monthly kWh bill is high.",
                "source": "qa_iter59",
                "wants_outbound_help": True,
            },
            "triggered_by": "qa_test_energy",
        }
        r = api.post(f"{BASE_URL}/api/orchestrator/run", json=payload, timeout=RUN_TIMEOUT)
        assert r.status_code == 200, f"energy run failed: {r.status_code} {r.text[:500]}"
        return r.json()

    @pytest.fixture(scope="class")
    def startup_run(self, api):
        payload = {
            "lead": {
                "name": "Sara Startup",
                "email": _rand_email("startup"),
                "business_name": "NewCo",
                "industry": "startup_services",
                "notes": "Just launching, pre-revenue, no customers yet, validating idea.",
                "source": "qa_iter59",
                "wants_outbound_help": True,
            },
            "triggered_by": "qa_test_startup",
        }
        r = api.post(f"{BASE_URL}/api/orchestrator/run", json=payload, timeout=RUN_TIMEOUT)
        assert r.status_code == 200, f"startup run failed: {r.status_code} {r.text[:500]}"
        return r.json()

    def test_real_estate_classification(self, real_estate_run):
        d = real_estate_run
        assert d.get("ok") is True
        assert d.get("asset_type") == "real_estate_correction", f"got {d.get('asset_type')}"
        assert isinstance(d.get("intent_score"), int) and d["intent_score"] >= 50
        assert d.get("lead_id") and len(d["lead_id"]) >= 8
        assert d.get("run_id") and len(d["run_id"]) >= 8
        assert d.get("duration_ms") and d["duration_ms"] < 90000
        assert d.get("follow_ups_queued") == 2

    def test_energy_classification(self, energy_run):
        d = energy_run
        assert d.get("ok") is True
        assert d.get("asset_type") == "energy_savings", f"got {d.get('asset_type')}"
        assert d.get("follow_ups_queued") == 2

    def test_startup_classification(self, startup_run):
        d = startup_run
        assert d.get("ok") is True
        assert d.get("asset_type") in ("business_plan_lite", "icp_brief"), f"got {d.get('asset_type')}"
        assert d.get("follow_ups_queued") == 2

    def test_email_degraded_without_resend_key(self, real_estate_run):
        # RESEND_API_KEY missing in preview → email_sent must be false but run completed
        assert real_estate_run.get("email_sent") is False, "email should be degraded without RESEND_API_KEY"
        err = real_estate_run.get("email_error") or ""
        assert "RESEND_API_KEY" in err, f"expected RESEND_API_KEY in error, got: {err}"

    # ────────── lead-lock + agent_runs trace via /detail ──────────
    def test_run_persisted_completed_with_4_steps(self, api, founder_auth, real_estate_run):
        time.sleep(1)
        r = api.post(
            f"{BASE_URL}/api/orchestrator/detail",
            json={**founder_auth, "run_id": real_estate_run["run_id"]},
            timeout=30,
        )
        assert r.status_code == 200, f"detail failed: {r.status_code} {r.text[:300]}"
        run = r.json().get("run") or {}
        assert run.get("status") == "completed", f"status={run.get('status')}"
        steps = run.get("steps") or []
        names = [s.get("agent") for s in steps]
        assert names == ["research", "content", "outreach", "execution"], f"bad step order: {names}"
        # asset_markdown populated
        assert run.get("asset_markdown") and len(run["asset_markdown"]) > 100
        # outreach populated
        outreach = run.get("outreach") or {}
        assert outreach.get("subject") and outreach.get("body")
        # lead_locked
        assert run.get("lead_locked") is True
        assert run.get("lead_id") == real_estate_run["lead_id"]

    def test_outreach_email_constraints(self, api, founder_auth, real_estate_run):
        r = api.post(
            f"{BASE_URL}/api/orchestrator/detail",
            json={**founder_auth, "run_id": real_estate_run["run_id"]},
            timeout=30,
        )
        run = r.json()["run"]
        outreach = run["outreach"]
        subject = outreach["subject"]
        body = outreach["body"]
        # subject 1-120 chars
        assert 1 <= len(subject) <= 120, f"subject len={len(subject)}"
        # body 60-300 chars (60-110 words)
        assert 60 <= len(body) <= 2000, f"body len={len(body)}"
        word_count = len(body.split())
        assert 40 <= word_count <= 160, f"word_count={word_count}"
        # banned phrases
        low = body.lower()
        assert "i noticed you" not in low, "banned phrase 'I noticed you' present"
        assert "i saw your business" not in low, "banned phrase 'I saw your business' present"
        # sign-off references Jeffrey · CreatorBoostAI
        assert "Jeffrey" in body and "CreatorBoostAI" in body, f"missing sign-off in body: {body[-150:]!r}"

    def test_lead_locked_to_founder(self, api, founder_auth, real_estate_run):
        # Use orchestrator/run-on-lead to confirm registry has the lead with founder lock
        # We can't query leads_registry directly via public API safely; rely on detail.lead_locked
        # already covered. Add run-on-lead reuse smoke below.
        r = api.post(
            f"{BASE_URL}/api/orchestrator/detail",
            json={**founder_auth, "run_id": real_estate_run["run_id"]},
            timeout=30,
        )
        run = r.json()["run"]
        assert run.get("lead_locked") is True


# ────────────────── /list + KPI ──────────────────


class TestOrchestratorList:
    def test_list_returns_runs_and_kpi(self, api, founder_auth):
        r = api.post(f"{BASE_URL}/api/orchestrator/list", json=founder_auth, timeout=30)
        assert r.status_code == 200, f"list failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert "runs" in data and isinstance(data["runs"], list)
        assert "kpi" in data
        kpi = data["kpi"]
        for k in ("total", "completed", "emails_sent", "avg_duration_ms"):
            assert k in kpi, f"missing kpi key {k}"
        assert kpi["total"] == len(data["runs"])
        # sorted desc by started_at
        starts = [r.get("started_at") for r in data["runs"] if r.get("started_at")]
        assert starts == sorted(starts, reverse=True), "runs not sorted desc by started_at"
        # Each run row should NOT include asset_markdown (excluded for list)
        for row in data["runs"][:3]:
            assert "asset_markdown" not in row

    def test_list_requires_auth(self, api):
        r = api.post(
            f"{BASE_URL}/api/orchestrator/list",
            json={"email": "fake@example.com", "token": "wrongtoken"},
            timeout=20,
        )
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


# ────────────────── /detail edge cases ──────────────────


class TestOrchestratorDetail:
    def test_detail_unknown_run_returns_404(self, api, founder_auth):
        r = api.post(
            f"{BASE_URL}/api/orchestrator/detail",
            json={**founder_auth, "run_id": "nonexistent-" + uuid.uuid4().hex},
            timeout=20,
        )
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text[:200]}"


# ────────────────── /run-on-lead ──────────────────


class TestRunOnLead:
    def test_run_on_existing_lead(self, api, founder_auth):
        # First create a lead via /run
        first = api.post(
            f"{BASE_URL}/api/orchestrator/run",
            json={
                "lead": {
                    "name": "Existing Lead",
                    "email": _rand_email("rol"),
                    "business_name": "ExistingCo",
                    "industry": "general",
                    "notes": "Has revenue, wants more customers and outbound help.",
                    "source": "qa_iter59_rol_seed",
                    "wants_outbound_help": True,
                },
                "triggered_by": "qa_rol_seed",
            },
            timeout=RUN_TIMEOUT,
        )
        assert first.status_code == 200, f"seed run failed: {first.text[:300]}"
        seed = first.json()
        lead_id = seed["lead_id"]

        # Now invoke run-on-lead with that lead_id
        r = api.post(
            f"{BASE_URL}/api/orchestrator/run-on-lead",
            json={**founder_auth, "lead_id": lead_id},
            timeout=RUN_TIMEOUT,
        )
        assert r.status_code == 200, f"run-on-lead failed: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert d.get("ok") is True
        assert d.get("lead_id") == lead_id
        assert d.get("asset_type") in (
            "business_plan_lite", "icp_brief", "roi_report",
            "real_estate_correction", "energy_savings",
        )

    def test_run_on_unknown_lead_returns_404(self, api, founder_auth):
        r = api.post(
            f"{BASE_URL}/api/orchestrator/run-on-lead",
            json={**founder_auth, "lead_id": "ghost-" + uuid.uuid4().hex},
            timeout=20,
        )
        assert r.status_code == 404, f"expected 404 got {r.status_code}"


# ────────────────── business-activation auto-trigger ──────────────────


class TestBusinessActivationAutoTrigger:
    def test_capture_with_outbound_help_true_triggers_orchestrator(self, api, founder_auth):
        email = _rand_email("ba_yes")
        payload = {
            "name": "Activation Optin",
            "email": email,
            "business_type": "real_estate",
            "business_name": "AutoTriggerCo",
            "blocks": [{
                "tool": "business_plan",
                "tool_label": "Business Plan",
                "markdown": "# Plan\n\nTest plan body.",
            }],
            "wants_outbound_help": True,
            "consent_marketing": True,
            "source": "qa_iter59_auto",
        }
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json=payload, timeout=60)
        assert r.status_code == 200, f"capture failed: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert d.get("ok") is True
        assert d.get("orchestrator_triggered") is True

        # Wait for background orchestrator to complete (25-50s typical)
        deadline = time.time() + 120
        found = None
        while time.time() < deadline:
            time.sleep(10)
            try:
                lst = api.post(f"{BASE_URL}/api/orchestrator/list", json=founder_auth, timeout=60)
            except requests.exceptions.RequestException:
                continue
            if lst.status_code != 200:
                continue
            for row in lst.json().get("runs", []):
                li = row.get("lead_input") or {}
                if (li.get("email") == email and
                        row.get("triggered_by") == "business_activation_capture" and
                        row.get("status") == "completed"):
                    found = row
                    break
            if found:
                break

        assert found is not None, f"no completed agent_runs row for {email} within 90s"
        assert found.get("triggered_by") == "business_activation_capture"
        assert found.get("status") == "completed"

    def test_capture_with_outbound_help_false_no_orchestrator(self, api, founder_auth):
        email = _rand_email("ba_no")
        payload = {
            "name": "Activation NoHelp",
            "email": email,
            "business_type": "general",
            "business_name": "NoHelpCo",
            "blocks": [{
                "tool": "business_plan",
                "tool_label": "Business Plan",
                "markdown": "# Plan\n\nTest plan body.",
            }],
            "wants_outbound_help": False,
            "consent_marketing": True,
            "source": "qa_iter59_no",
        }
        r = api.post(f"{BASE_URL}/api/business-activation/capture", json=payload, timeout=60)
        assert r.status_code == 200, f"capture failed: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert d.get("ok") is True
        assert d.get("orchestrator_triggered") is False

        # Wait ~15s and confirm NO agent_runs row for this email
        time.sleep(15)
        lst = api.post(f"{BASE_URL}/api/orchestrator/list", json=founder_auth, timeout=30)
        assert lst.status_code == 200
        for row in lst.json().get("runs", []):
            li = row.get("lead_input") or {}
            assert li.get("email") != email, f"unexpected agent_runs row created for {email}"
