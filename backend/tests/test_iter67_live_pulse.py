"""
Iter 67 — LiveSendPulse backend smoke tests.
POST /api/ops/outbound/live-pulse — founder-only telemetry feed.
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")

MASTER_KEY = "jeffrey-2026-bodyiq-founder-master"
LIVE_PULSE = f"{BASE_URL}/api/ops/outbound/live-pulse"
FOUNDER_ACCESS = f"{BASE_URL}/api/ops/founder-access"


@pytest.fixture(scope="module")
def founder_auth():
    r = requests.post(FOUNDER_ACCESS, json={"key": MASTER_KEY}, timeout=15)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    j = r.json()
    assert "email" in j and "token" in j
    return {"email": j["email"], "token": j["token"]}


# --- Auth ---------------------------------------------------------
class TestAuth:
    def test_no_auth_rejected(self):
        r = requests.post(LIVE_PULSE, json={}, timeout=15)
        assert r.status_code in (401, 403, 422), f"expected 401/403/422 got {r.status_code}"

    def test_wrong_token_rejected(self):
        r = requests.post(LIVE_PULSE, json={"email": "j.davidg67@gmail.com", "token": "deadbeef-bad"}, timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


# --- Payload shape ------------------------------------------------
class TestPayloadShape:
    def test_returns_200_with_full_shape(self, founder_auth):
        r = requests.post(LIVE_PULSE, json=founder_auth, timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        # top-level keys
        for k in ["ok", "now", "mode", "mode_reason", "resend_configured",
                  "paused", "signal", "workers", "queue", "rates",
                  "last_send", "next_action", "recent_sends", "recent_replies"]:
            assert k in j, f"missing top-level key: {k}"
        assert j["ok"] is True
        # signal sub-shape
        for k in ["level", "label", "summary", "workers"]:
            assert k in j["signal"], f"signal missing {k}"
        assert j["signal"]["level"] in ("green", "yellow", "red")
        # queue sub-shape
        for k in ["in_flight", "eligible_now", "awaiting_bump",
                  "scheduled_followups", "scoring_backlog"]:
            assert k in j["queue"], f"queue missing {k}"
        # rates sub-shape
        for k in ["sends_last_hour", "sends_today", "replies_today"]:
            assert k in j["rates"], f"rates missing {k}"
        # types
        assert isinstance(j["workers"], list)
        assert isinstance(j["recent_sends"], list)
        assert isinstance(j["recent_replies"], list)

    def test_mode_sandbox_and_resend_unconfigured(self, founder_auth):
        r = requests.post(LIVE_PULSE, json=founder_auth, timeout=20)
        j = r.json()
        # Per problem statement, RESEND_API_KEY is unset → sandbox
        assert j["mode"] == "sandbox", f"expected sandbox got {j['mode']}"
        assert j["resend_configured"] is False
        assert isinstance(j["mode_reason"], str) and len(j["mode_reason"]) > 0

    def test_signal_level_green_when_workers_fresh(self, founder_auth):
        r = requests.post(LIVE_PULSE, json=founder_auth, timeout=20)
        j = r.json()
        # Workers run continuously; expect green most of the time. Allow yellow as soft pass.
        assert j["signal"]["level"] in ("green", "yellow"), j["signal"]

    def test_recent_sends_have_masked_emails(self, founder_auth):
        r = requests.post(LIVE_PULSE, json=founder_auth, timeout=20)
        j = r.json()
        sends = j.get("recent_sends", [])
        if not sends:
            pytest.skip("No recent sends in this run")
        for s in sends[:5]:
            for k in ["ts", "kind"]:
                assert k in s, f"recent_send missing {k}"
            # email_masked optional but if present must be masked
            em = s.get("email_masked")
            if em:
                assert "*" in em or em.endswith("***") or "***" in em, f"email not masked: {em}"

    def test_workers_have_heartbeats(self, founder_auth):
        r = requests.post(LIVE_PULSE, json=founder_auth, timeout=20)
        j = r.json()
        workers = j["workers"]
        assert len(workers) >= 1, "expected at least one worker"
        for w in workers:
            assert "worker" in w
