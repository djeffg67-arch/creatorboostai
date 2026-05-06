"""Iter 68 · Worker Telemetry + System Signal Light · Backend tests.

Covers:
  - /api/ops/outbound/worker-status (founder auth, structure, fields)
  - /api/ops/outbound/dashboard includes `system_status`
  - Worker heartbeats recorded for scheduler_loop, business_activation_nurture
  - imap_poller correctly absent from worker_heartbeats + shows in optional_inactive
  - daily_autopilot_loop may be optional_inactive on fresh boot
  - Pause flow: pause → yellow/Paused → resume → green/Operational
  - Fault-injection: insert stale + high-error worker doc → level='red'
  - Autopilot-now triggers an `autopilot_cycle` heartbeat eventually
"""
import os
import time
import asyncio
import pytest
import requests
from datetime import datetime, timezone, timedelta

def _load_backend_url():
    u = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if u:
        return u.rstrip("/")
    # Fallback: parse /app/frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    return ""


BASE_URL = _load_backend_url()
MASTER_KEY = "jeffrey-2026-bodyiq-founder-master"
assert BASE_URL, "REACT_APP_BACKEND_URL not set"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(session):
    r = session.post(f"{BASE_URL}/api/ops/founder-access",
                     json={"key": MASTER_KEY}, timeout=30)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text[:300]}"
    return r.json()


@pytest.fixture(scope="module")
def auth_payload(auth):
    return {"email": auth["email"], "token": auth["token"]}


# ──────────────────── 1. Auth gating ─────────────────────
class TestAuthGating:
    def test_worker_status_requires_founder(self, session):
        r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json={"email": "nope@nope.com", "token": "bad"},
                         timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_worker_status_missing_body(self, session):
        r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json={}, timeout=15)
        assert r.status_code in (401, 403, 422)


# ────────────────── 2. Worker status structure ───────────
class TestWorkerStatusStructure:
    def test_worker_status_returns_expected_shape(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json=auth_payload, timeout=20)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("ok") is True
        ss = data["system_status"]
        for k in ("level", "label", "summary", "reasons", "workers",
                  "expected_workers", "missing_workers", "optional_inactive",
                  "stale_count", "error_rate", "total_ticks", "total_errors",
                  "checked_at"):
            assert k in ss, f"missing system_status field: {k}"
        assert ss["level"] in ("green", "yellow", "red"), ss["level"]
        assert ss["label"] in ("Operational", "Degraded", "Stalled", "Paused", "Unknown")
        assert isinstance(ss["summary"], str) and len(ss["summary"]) > 0
        assert isinstance(data["workers"], list)
        assert "paused" in data

    def test_dashboard_embeds_system_status(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/dashboard",
                         json=auth_payload, timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "system_status" in data, "dashboard missing system_status"
        ss = data["system_status"]
        for k in ("level", "label", "summary", "reasons", "workers"):
            assert k in ss


# ─────────────── 3. Heartbeat presence ───────────────────
class TestHeartbeatPresence:
    def test_scheduler_loop_heartbeat_present(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json=auth_payload, timeout=20)
        data = r.json()
        names = {w["worker"] for w in data["workers"]}
        assert "scheduler_loop" in names, f"scheduler_loop missing; have={names}"
        sched = next(w for w in data["workers"] if w["worker"] == "scheduler_loop")
        assert sched["ticks_total"] >= 1

    def test_business_activation_nurture_heartbeat_present(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json=auth_payload, timeout=20)
        data = r.json()
        names = {w["worker"] for w in data["workers"]}
        assert "business_activation_nurture" in names, f"missing; have={names}"

    def test_imap_poller_optional_when_env_unset(self, session, auth_payload):
        imap_set = all(os.environ.get(k, "").strip()
                       for k in ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"))
        if imap_set:
            pytest.skip("IMAP env vars set — skipping optional-inactive test")
        r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json=auth_payload, timeout=20)
        data = r.json()
        names = {w["worker"] for w in data["workers"]}
        assert "imap_poller" not in names, "imap_poller should NOT have heartbeats"
        optional = data["system_status"].get("optional_inactive", [])
        optional_names = {o.get("worker") for o in optional}
        assert "imap_poller" in optional_names, \
            f"imap_poller should be in optional_inactive; got={optional_names}"


# ─────────────── 4. Pause flow (yellow) ──────────────────
class TestPauseFlow:
    def test_pause_flips_to_yellow_then_resume_green(self, session, auth_payload):
        # PAUSE
        r = session.post(f"{BASE_URL}/api/ops/outbound/pause",
                         json={**auth_payload, "paused": True,
                               "reason": "manual_pause_by_founder"}, timeout=20)
        assert r.status_code == 200, r.text[:300]

        time.sleep(1)
        r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json=auth_payload, timeout=20)
        data = r.json()
        ss = data["system_status"]
        assert ss["level"] == "yellow", f"expected yellow when paused, got {ss['level']}"
        assert ss["label"] == "Paused", f"expected Paused, got {ss['label']}"
        assert data["paused"] is True
        # summary or reasons should include pause context
        joined = (ss["summary"] + " " + " ".join(ss.get("reasons", []))).lower()
        assert "pause" in joined or "manual" in joined

        # RESUME
        r2 = session.post(f"{BASE_URL}/api/ops/outbound/pause",
                          json={**auth_payload, "paused": False,
                                "reason": "resume_test"}, timeout=20)
        assert r2.status_code == 200

        time.sleep(1)
        r3 = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                          json=auth_payload, timeout=20)
        ss3 = r3.json()["system_status"]
        assert ss3["level"] in ("green", "yellow"), \
            f"after resume, level should be green (or yellow if some worker drifted), got {ss3['level']}"
        # Must NOT be labelled Paused anymore
        assert ss3["label"] != "Paused", "still labelled Paused after resume"


# ─────────────── 5. Fault injection (red) ────────────────
class TestFaultInjection:
    def test_stale_high_error_worker_flips_red(self, session, auth_payload):
        """Insert a stale + high-error fake doc directly into MongoDB,
        then verify the system_status transitions to red."""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
        except ImportError:
            pytest.skip("motor not available in test env")

        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not (mongo_url and db_name):
            # Try /app/backend/.env
            try:
                with open("/app/backend/.env") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("MONGO_URL="):
                            mongo_url = line.split("=", 1)[1].strip().strip('"')
                        elif line.startswith("DB_NAME="):
                            db_name = line.split("=", 1)[1].strip().strip('"')
            except Exception:
                pass
        if not (mongo_url and db_name):
            pytest.skip("MONGO_URL/DB_NAME not set — can't inject")

        async def inject_and_cleanup():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            two_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            # Use a test-only worker name so we don't clobber the real scheduler_loop
            fake = "TEST_stale_worker_iter68"
            await db.worker_heartbeats.update_one(
                {"worker": fake},
                {"$set": {
                    "worker": fake,
                    "last_tick_at": two_hours_ago,
                    "last_ok_at": two_hours_ago,
                    "ticks_total": 999,
                    "errors_total": 500,
                    "interval_sec": 300,
                    "stale_after_sec": 900,
                }},
                upsert=True,
            )
            # Also clobber scheduler_loop + business_activation_nurture to stale
            # so compute_system_status sees 2 stale EXPECTED workers → red
            for w in ("scheduler_loop", "business_activation_nurture"):
                await db.worker_heartbeats.update_one(
                    {"worker": w},
                    {"$set": {"last_tick_at": two_hours_ago,
                              "last_ok_at": two_hours_ago,
                              "errors_total": 500, "ticks_total": 999,
                              "stale_after_sec": 900}},
                    upsert=True,
                )
            client.close()
            return fake

        async def cleanup(fake):
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            await db.worker_heartbeats.delete_one({"worker": fake})
            # Restore scheduler_loop & nurture by setting their heartbeat to NOW
            # (the live workers will re-tick soon anyway, but give immediate relief)
            now = datetime.now(timezone.utc).isoformat()
            for w in ("scheduler_loop", "business_activation_nurture"):
                await db.worker_heartbeats.update_one(
                    {"worker": w},
                    {"$set": {"last_tick_at": now, "last_ok_at": now,
                              "errors_total": 0, "ticks_total": 1,
                              "stale_after_sec": 900}},
                )
            client.close()

        fake = asyncio.run(inject_and_cleanup())
        try:
            r = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                             json=auth_payload, timeout=20)
            data = r.json()
            ss = data["system_status"]
            assert ss["level"] == "red", f"expected red, got {ss['level']} · reasons={ss.get('reasons')}"
            reasons = " ".join(ss.get("reasons", []))
            # Should flag staleness AND/OR error_rate
            assert ("stale" in reasons or "error_rate" in reasons), \
                f"expected stale/error_rate reason, got {reasons}"
        finally:
            asyncio.run(cleanup(fake))


# ─────────────── 6. Autopilot cycle heartbeat ────────────
class TestAutopilotCycleHeartbeat:
    def test_autopilot_now_eventually_writes_heartbeat(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/autopilot-now",
                         json=auth_payload, timeout=30)
        assert r.status_code == 200, r.text[:300]
        # Autopilot runs in background · heartbeat lands AFTER cycle finishes.
        # Wait up to 120s (review note said 90s is safe).
        found = False
        last_hb = None
        for _ in range(24):  # 24 * 5s = 120s
            time.sleep(5)
            w = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                             json=auth_payload, timeout=20).json()
            for worker in w.get("workers", []):
                if worker["worker"] == "autopilot_cycle" and worker.get("last_ok_at"):
                    last_hb = worker
                    found = True
                    break
            if found:
                break
        assert found, "autopilot_cycle heartbeat never appeared within 120s"
        assert last_hb["ticks_total"] >= 1


# ─────────────── 7. Regression: dashboard still works ────
class TestRegressionDashboard:
    def test_dashboard_has_kpi_fields(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/dashboard",
                         json=auth_payload, timeout=30)
        assert r.status_code == 200
        data = r.json()
        # KPIs — don't assert exact keys (schema may vary) but something should exist
        assert "system_status" in data
        # common KPI-like fields — at least ONE must be present
        kpi_fields = ["totals", "kpis", "kpi", "counts", "prospects_total",
                      "total_prospects", "stats"]
        assert any(f in data for f in kpi_fields), \
            f"no KPI-like field found; keys={list(data.keys())[:20]}"
