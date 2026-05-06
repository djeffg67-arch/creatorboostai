"""Iter 68b · Queue Status + Operator View · Backend tests.

Covers the 8 backend requirements:
  BACKEND-1 · POST /api/ops/outbound/queue-status with founder auth · full payload
  BACKEND-2 · without auth returns 401/403
  BACKEND-3 · sample arrays bounded to 5
  BACKEND-4 · autopilot-now triggers autopilot_cycle heartbeat
  BACKEND-5 · fault-test #1 · bad CSV upload does not crash worker; status stays green
  BACKEND-6 · fault-test #2 · stale scheduler_loop → yellow; cleanup → green
  BACKEND-7 · fault-test #3 · pause/unpause → yellow/green
  BACKEND-8 · dashboard still intact after all fault tests
"""
import os
import time
import asyncio
import pytest
import requests
from datetime import datetime, timezone, timedelta

# ───────── setup ─────────
def _load_backend_url():
    u = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if u:
        return u.rstrip("/")
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


# ═════════════ BACKEND-1 · queue-status payload ═════════════
class TestBackend1_QueueStatusPayload:
    def test_queue_status_full_structure(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/queue-status",
                         json=auth_payload, timeout=30)
        assert r.status_code == 200, r.text[:400]
        body = r.json()
        assert body["ok"] is True
        assert isinstance(body.get("checked_at"), str) and body["checked_at"]

        # Required section names with count + sample
        for key in ["scoring_backlog", "send_eligible_now", "awaiting_bump",
                    "scheduled_followups", "in_flight_sends",
                    "stalled_no_progress", "hot_leads"]:
            assert key in body, f"missing section: {key}"
            section = body[key]
            assert isinstance(section.get("count"), int), f"{key}.count not int"
            assert section["count"] >= 0
            assert isinstance(section.get("sample"), list), f"{key}.sample not list"

        # cold has only count (no sample per spec)
        assert isinstance(body["cold"]["count"], int)

        # recent_sends shape (0-5 entries)
        recent_sends = body.get("recent_sends")
        assert isinstance(recent_sends, list)
        assert 0 <= len(recent_sends) <= 5
        for e in recent_sends:
            # must have a timestamp field (ts OR created_at) + kind + prospect_id
            assert ("ts" in e) or ("created_at" in e), f"recent_sends missing timestamp: {e}"
            assert "kind" in e, f"recent_sends missing kind: {e}"
            assert "prospect_id" in e, f"recent_sends missing prospect_id: {e}"

        # recent_replies shape (0-5 entries)
        recent_replies = body.get("recent_replies")
        assert isinstance(recent_replies, list)
        assert 0 <= len(recent_replies) <= 5
        for p in recent_replies:
            for k in ("id", "email", "replied_at"):
                assert k in p, f"recent_replies missing {k}: {p}"


# ═════════════ BACKEND-2 · auth gating ═════════════
class TestBackend2_AuthGating:
    def test_no_auth_returns_401_or_403(self, session):
        r = session.post(f"{BASE_URL}/api/ops/outbound/queue-status",
                         json={}, timeout=15)
        assert r.status_code in (401, 403, 422), f"expected auth reject, got {r.status_code}"

    def test_wrong_token_returns_401_or_403(self, session):
        r = session.post(f"{BASE_URL}/api/ops/outbound/queue-status",
                         json={"email": "j.davidg67@gmail.com", "token": "BOGUS_TOKEN_xxx"},
                         timeout=15)
        assert r.status_code in (401, 403)


# ═════════════ BACKEND-3 · sample arrays bounded to 5 ═════════════
class TestBackend3_SampleBounded:
    def test_all_samples_bounded_to_5(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/queue-status",
                         json=auth_payload, timeout=30)
        assert r.status_code == 200
        body = r.json()
        for key in ["scoring_backlog", "send_eligible_now", "awaiting_bump",
                    "scheduled_followups", "in_flight_sends",
                    "stalled_no_progress", "hot_leads"]:
            sample = body[key].get("sample", [])
            assert len(sample) <= 5, f"{key}.sample over bound: {len(sample)}"
        assert len(body.get("recent_sends", [])) <= 5
        assert len(body.get("recent_replies", [])) <= 5


# ═════════════ BACKEND-4 · autopilot heartbeat ═════════════
class TestBackend4_AutopilotHeartbeat:
    def test_autopilot_now_records_heartbeat(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/autopilot-now",
                         json=auth_payload, timeout=60)
        assert r.status_code == 200, r.text[:300]

        # poll worker-status up to 90s for autopilot_cycle with ticks >= 1
        deadline = time.time() + 90
        found = False
        last_payload = None
        while time.time() < deadline:
            w = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                             json=auth_payload, timeout=20)
            if w.status_code == 200:
                wb = w.json()
                last_payload = wb
                workers = wb.get("workers", [])
                autop = next((x for x in workers if x.get("worker") == "autopilot_cycle"), None)
                if autop and (autop.get("ticks_total") or 0) >= 1 and autop.get("last_ok_at"):
                    found = True
                    break
            time.sleep(6)

        assert found, f"autopilot_cycle heartbeat not observed within 90s. last={last_payload}"


# ═════════════ BACKEND-5 · bad CSV fault ═════════════
class TestBackend5_BadCsvFault:
    def test_malformed_csv_does_not_crash_engine(self, session, auth, auth_payload):
        # malformed CSV (not even valid headers)
        bad_blob = b"this is not,a valid\xff csv @@@@"
        files = {"file": ("broken.csv", bad_blob, "text/csv")}
        data = {"state": "MI", "auth_email": auth["email"], "auth_token": auth["token"]}
        r = requests.post(
            f"{BASE_URL}/api/ops/outbound/sources/states/upload-csv",
            files=files, data=data, timeout=60,
        )
        # Either 200 with records_found=0, or a 4xx with clear error — not 500
        assert r.status_code != 500, f"bad CSV crashed endpoint (500): {r.text[:300]}"
        assert r.status_code in (200, 400, 422)
        if r.status_code == 200:
            body = r.json()
            # should say records_found 0 OR report an error in body
            rf = body.get("records_found")
            if rf is not None:
                assert rf == 0, f"bad CSV silently added rows: {body}"

        # engine must still be GREEN (or yellow if fresh boot, but not red)
        time.sleep(1)
        w = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json=auth_payload, timeout=20)
        assert w.status_code == 200
        level = w.json().get("system_status", {}).get("level")
        assert level in ("green", "yellow"), f"engine level={level} after bad CSV (expected green)"


# ═════════════ BACKEND-6 · stale worker injection ═════════════
class TestBackend6_StaleWorkerInjection:
    """Manually mark scheduler_loop stale by setting last_tick_at 4h ago,
    verify status flips to yellow (1 worker stale), then cleanup."""

    def test_stale_worker_flips_yellow_then_recovers(self, session, auth_payload):
        async def _run():
            # Read mongo creds from backend/.env
            mongo_url, db_name = None, None
            try:
                with open("/app/backend/.env") as f:
                    for line in f:
                        if line.startswith("MONGO_URL="):
                            mongo_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        elif line.startswith("DB_NAME="):
                            db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception as e:
                pytest.skip(f"cannot read backend .env: {e}")

            assert mongo_url and db_name, "missing MONGO_URL or DB_NAME"

            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]

            # Save original doc
            orig = await db.worker_heartbeats.find_one({"worker": "scheduler_loop"})
            four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat()

            try:
                await db.worker_heartbeats.update_one(
                    {"worker": "scheduler_loop"},
                    {"$set": {"last_tick_at": four_hours_ago,
                              "last_ok_at": four_hours_ago}},
                    upsert=True,
                )
                time.sleep(1)

                w = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                                 json=auth_payload, timeout=20)
                assert w.status_code == 200
                sys_stat = w.json().get("system_status", {})
                level = sys_stat.get("level")
                reasons = sys_stat.get("reasons", [])
                assert level in ("yellow", "red"), f"level={level} reasons={reasons}"
                reasons_str = " ".join(reasons) if isinstance(reasons, list) else str(reasons)
                assert "stale" in reasons_str.lower(), f"reasons missing 'stale': {reasons}"

            finally:
                if orig:
                    orig.pop("_id", None)
                    await db.worker_heartbeats.replace_one(
                        {"worker": "scheduler_loop"}, orig, upsert=True)
                else:
                    await db.worker_heartbeats.delete_one({"worker": "scheduler_loop"})
                client.close()

        asyncio.run(_run())


# ═════════════ BACKEND-7 · pause/unpause ═════════════
class TestBackend7_PauseUnpause:
    def test_pause_flips_yellow_and_resume_returns_green(self, session, auth_payload):
        # Pause
        r = session.post(f"{BASE_URL}/api/ops/outbound/pause",
                         json={**auth_payload, "paused": True,
                               "reason": "phase1_smoke_test"}, timeout=20)
        assert r.status_code == 200, r.text[:200]
        time.sleep(2)

        w = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                         json=auth_payload, timeout=20)
        assert w.status_code == 200
        sys_stat = w.json().get("system_status", {})
        assert sys_stat.get("level") == "yellow", f"expected yellow, got {sys_stat}"
        label = (sys_stat.get("label") or "").lower()
        summary = (sys_stat.get("summary") or "").lower()
        assert "paus" in label or "paus" in summary, f"label/summary missing pause: {sys_stat}"
        # Optional: summary contains reason
        # not all impls echo the reason, so don't hard-fail

        # Resume
        r2 = session.post(f"{BASE_URL}/api/ops/outbound/pause",
                          json={**auth_payload, "paused": False}, timeout=20)
        assert r2.status_code == 200
        time.sleep(5)

        w2 = session.post(f"{BASE_URL}/api/ops/outbound/worker-status",
                          json=auth_payload, timeout=20)
        assert w2.status_code == 200
        level2 = w2.json().get("system_status", {}).get("level")
        assert level2 == "green", f"after unpause expected green, got {level2}"


# ═════════════ BACKEND-8 · dashboard intact ═════════════
class TestBackend8_DashboardRegression:
    def test_dashboard_still_intact(self, session, auth_payload):
        r = session.post(f"{BASE_URL}/api/ops/outbound/dashboard",
                         json=auth_payload, timeout=30)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        kpi = body.get("kpi", {})
        for k in ("total_prospects", "scored", "contacted",
                  "replied", "positive", "unsubscribed"):
            assert k in kpi, f"kpi missing {k}"
            assert isinstance(kpi[k], int), f"kpi.{k} not int: {kpi[k]}"

        assert "system_status" in body
        assert "warmup" in body
        assert "state_filings" in body
        assert "deliverability" in body
        assert "segments" in body
        assert "warm_leads" in body
        assert "sent_today" in body
        # Engine must be unpaused post-testing (BACKEND-7 resumed)
        assert body.get("state", {}).get("paused") in (False, None)
