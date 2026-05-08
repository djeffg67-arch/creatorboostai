"""Iteration 11: Demo Delivery Engine — tracked sessions, heartbeats,
half-view notifications, admin endpoints, and regression checks."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "bodyiq-admin-2026")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def session_id(s):
    r = s.post(
        f"{BASE_URL}/api/demo/session/start",
        json={
            "demo_type": "noldus",
            "recipient_name": "Sarah",
            "recipient_company": "Acme",
            "recipient_email": "sarah@acme.com",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert "session_id" in body and "started_at" in body
    return body["session_id"]


# --- Module: demo session lifecycle ---

class TestDemoSessionLifecycle:
    def test_start_returns_201(self, session_id):
        assert isinstance(session_id, str) and len(session_id) > 10

    def test_heartbeat_below_50(self, s, session_id):
        r = s.post(
            f"{BASE_URL}/api/demo/session/heartbeat",
            json={"session_id": session_id, "progress_pct": 25, "watch_seconds": 30},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body == {"ok": True, "half_view_triggered": False}

    def test_heartbeat_crosses_50(self, s, session_id):
        r = s.post(
            f"{BASE_URL}/api/demo/session/heartbeat",
            json={"session_id": session_id, "progress_pct": 65, "watch_seconds": 90},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["half_view_triggered"] is True

    def test_heartbeat_after_already_notified(self, s, session_id):
        r = s.post(
            f"{BASE_URL}/api/demo/session/heartbeat",
            json={"session_id": session_id, "progress_pct": 80, "watch_seconds": 120},
        )
        assert r.status_code == 200, r.text
        assert r.json()["half_view_triggered"] is False

    def test_event_appended(self, s, session_id):
        r = s.post(
            f"{BASE_URL}/api/demo/session/event",
            json={
                "session_id": session_id,
                "event_type": "cta_click",
                "metadata": {"label": "open_brief", "v": 1},
            },
        )
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

    def test_complete(self, s, session_id):
        r = s.post(
            f"{BASE_URL}/api/demo/session/complete",
            json={"session_id": session_id, "watch_seconds": 360},
        )
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True


# --- Module: validation / errors ---

class TestDemoSessionValidation:
    def test_invalid_demo_type_422(self, s):
        r = s.post(
            f"{BASE_URL}/api/demo/session/start",
            json={"demo_type": "foo"},
        )
        assert r.status_code == 422, r.text

    def test_heartbeat_invalid_session_404(self, s):
        r = s.post(
            f"{BASE_URL}/api/demo/session/heartbeat",
            json={"session_id": "does-not-exist", "progress_pct": 10, "watch_seconds": 1},
        )
        assert r.status_code == 404, r.text

    def test_event_invalid_session_404(self, s):
        r = s.post(
            f"{BASE_URL}/api/demo/session/event",
            json={"session_id": "does-not-exist", "event_type": "cta_click"},
        )
        assert r.status_code == 404, r.text

    def test_complete_invalid_session_404(self, s):
        r = s.post(
            f"{BASE_URL}/api/demo/session/complete",
            json={"session_id": "does-not-exist", "watch_seconds": 1},
        )
        assert r.status_code == 404, r.text


# --- Module: admin demo sessions / notifications ---

class TestAdminDemoEndpoints:
    def test_admin_demo_sessions_summary(self, s, admin_token, session_id):
        r = s.get(
            f"{BASE_URL}/api/admin/demo-sessions?range=30d",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "summary" in body and "sessions" in body
        sm = body["summary"]
        for k in ("total", "half_view", "completed", "completion_rate", "half_view_rate"):
            assert k in sm, f"missing summary key {k}"
        # Find our test session
        match = next((x for x in body["sessions"] if x.get("id") == session_id), None)
        assert match is not None, "test session missing from /admin/demo-sessions"
        assert match["half_view_notified"] is True
        assert match["completed"] is True
        assert match["progress_pct"] == 100
        # Confirm event was persisted on the session
        ev_types = [e.get("type") for e in match.get("events", [])]
        assert "cta_click" in ev_types

    def test_admin_demo_sessions_requires_auth(self, s):
        r = s.get(f"{BASE_URL}/api/admin/demo-sessions")
        assert r.status_code in (401, 403)

    def test_admin_demo_notifications(self, s, admin_token, session_id):
        r = s.get(
            f"{BASE_URL}/api/admin/demo-notifications",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        match = next((n for n in items if n.get("session_id") == session_id), None)
        assert match is not None, "half-view notification not queued"
        assert match["type"] == "demo_half_view"
        assert match["recipient_name"] == "Sarah"


# --- Module: regression on existing endpoints ---

class TestRegressionEndpoints:
    def test_leads_post(self, s):
        r = s.post(
            f"{BASE_URL}/api/leads",
            json={
                "email": "TEST_iter11@example.com",
                "name": "Iter11 Tester",
                "source": "demo",
            },
        )
        assert r.status_code in (200, 201), r.text

    def test_share_demo_noldus(self, s):
        r = s.post(
            f"{BASE_URL}/api/share-demo",
            json={
                "recipient_email": "TEST_iter11_share@example.com",
                "demo_type": "noldus",
                "share_target": f"{BASE_URL}/demo/noldus",
            },
        )
        # iter10 RCA: was 422; main agent was supposed to widen schema. Accept 200/202;
        # if still 422, this surfaces the regression cleanly.
        assert r.status_code in (200, 202), f"status={r.status_code} body={r.text}"

    def test_checkout_session_signal_pack(self, s):
        r = s.post(
            f"{BASE_URL}/api/checkout/session",
            json={
                "product_key": "signal_pack_standard",
                "origin_url": BASE_URL,
                "email": "TEST_iter11_pay@example.com",
            },
        )
        # Stripe test key set but price IDs may not be — accept success or graceful 503
        assert r.status_code in (200, 201, 503), f"status={r.status_code} body={r.text}"
