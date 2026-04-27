"""
Iteration 13: Email click-tracking + personalization across all 5 demos.

Covers:
  - POST /api/share-demo with recipient_name → returns share_id & tracked_url
  - demo_url has personalization query params appended
  - demo_type=sita is accepted by the regex
  - GET /api/r/{share_id} returns 302 to personalized demo URL
  - Click increments click_count and populates first_clicked_at
  - POST /api/demo/session/heartbeat half-view trigger fires once only
  - GET /api/admin/demo-sessions returns summary + sessions
  - GET /api/admin/demo-shares (auth) returns click-tracking fields
"""

import os
import urllib.parse as up

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "bodyiq-admin-2026")


# ------------- fixtures -------------
@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin_api(admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ------------- /api/share-demo -------------
class TestShareDemo:
    def test_share_demo_realtor_with_personalization(self, api):
        payload = {
            "recipient_email": "TEST_realtor@example.com",
            "recipient_name": "Sarah",
            "sender_name": "Jeffrey",
            "demo_type": "realtor",
            "company": "Acme Realty",
            "message": "Take a look",
        }
        r = api.post(f"{BASE_URL}/api/share-demo", json=payload)
        assert r.status_code == 202, r.text
        data = r.json()
        assert "share_id" in data and data["share_id"]
        assert "tracked_url" in data and "/api/r/" in data["tracked_url"]
        assert "demo_url" in data
        # personalization params must appear on the demo_url
        q = dict(up.parse_qsl(up.urlparse(data["demo_url"]).query))
        assert q.get("name") == "Sarah"
        assert q.get("company") == "Acme Realty"
        assert q.get("email") == "TEST_realtor@example.com"
        # graceful degradation when RESEND not configured
        assert data["sent"] in (False, True)

    def test_share_demo_accepts_sita(self, api):
        r = api.post(f"{BASE_URL}/api/share-demo", json={
            "recipient_email": "TEST_sita@example.com",
            "recipient_name": "Dana",
            "demo_type": "sita",
            "company": "SITA",
        })
        assert r.status_code == 202, r.text
        data = r.json()
        assert "share_id" in data
        assert "/demo/sita" in data["demo_url"]

    def test_share_demo_rejects_invalid_demo_type(self, api):
        r = api.post(f"{BASE_URL}/api/share-demo", json={
            "recipient_email": "TEST_x@example.com",
            "demo_type": "garbage",
        })
        assert r.status_code == 422


# ------------- /api/r/{share_id} click tracking -------------
class TestClickTracking:
    def test_redirect_and_click_count(self, api, admin_api):
        # 1) create a share
        create = api.post(f"{BASE_URL}/api/share-demo", json={
            "recipient_email": "TEST_click@example.com",
            "recipient_name": "Mia",
            "demo_type": "creator",
            "company": "Lumen",
        })
        assert create.status_code == 202
        share_id = create.json()["share_id"]
        tracked = create.json()["tracked_url"]

        # 2) hit the tracked URL — disable redirects so we can read 302 + Location
        r = api.get(tracked, allow_redirects=False)
        assert r.status_code == 302, f"expected 302 got {r.status_code}"
        loc = r.headers.get("Location") or r.headers.get("location")
        assert loc, "missing Location header"
        # Location should point at /demo/creator with personalization
        parsed = up.urlparse(loc)
        assert parsed.path.endswith("/demo/creator")
        q = dict(up.parse_qsl(parsed.query))
        assert q.get("name") == "Mia"
        assert q.get("company") == "Lumen"

        # 3) click again to confirm click_count increments
        r2 = api.get(tracked, allow_redirects=False)
        assert r2.status_code == 302

        # 4) verify click_count >= 2 and first_clicked_at populated
        admin_resp = admin_api.get(f"{BASE_URL}/api/admin/demo-shares?range=all")
        assert admin_resp.status_code == 200
        rows = admin_resp.json()
        match = next((row for row in rows if row.get("id") == share_id), None)
        assert match is not None, f"share_id {share_id} not found in admin list"
        assert match.get("click_count", 0) >= 2
        assert match.get("first_clicked_at") is not None
        assert match.get("last_clicked_at") is not None

    def test_invalid_share_id_redirects_to_fallback(self, api):
        r = api.get(f"{BASE_URL}/api/r/non-existent-id-123", allow_redirects=False)
        assert r.status_code == 302
        # Location should be the SITE_URL fallback (homepage)


# ------------- demo session lifecycle + half-view -------------
class TestHalfViewNotification:
    def _start_session(self, api, demo_type="realtor", **kw):
        body = {
            "demo_type": demo_type,
            "recipient_name": kw.get("name", "TEST_HalfView"),
            "recipient_company": kw.get("company", "Acme"),
            "recipient_email": kw.get("email", "TEST_hv@example.com"),
        }
        r = api.post(f"{BASE_URL}/api/demo/session/start", json=body)
        assert r.status_code == 201, r.text
        return r.json()["session_id"]

    def test_half_view_fires_once(self, api):
        sid = self._start_session(api)
        # First crossing 50%
        r1 = api.post(f"{BASE_URL}/api/demo/session/heartbeat", json={
            "session_id": sid, "progress_pct": 60, "watch_seconds": 30
        })
        assert r1.status_code == 200
        assert r1.json().get("half_view_triggered") is True
        # Subsequent calls must NOT re-fire
        r2 = api.post(f"{BASE_URL}/api/demo/session/heartbeat", json={
            "session_id": sid, "progress_pct": 75, "watch_seconds": 45
        })
        assert r2.status_code == 200
        assert r2.json().get("half_view_triggered") is False
        r3 = api.post(f"{BASE_URL}/api/demo/session/heartbeat", json={
            "session_id": sid, "progress_pct": 90, "watch_seconds": 60
        })
        assert r3.json().get("half_view_triggered") is False

    def test_below_50_does_not_trigger(self, api):
        sid = self._start_session(api, name="TEST_NoTrigger")
        r = api.post(f"{BASE_URL}/api/demo/session/heartbeat", json={
            "session_id": sid, "progress_pct": 30, "watch_seconds": 10
        })
        assert r.status_code == 200
        assert r.json().get("half_view_triggered") is False


# ------------- admin endpoints -------------
class TestAdminEndpoints:
    def test_admin_demo_shares_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/admin/demo-shares")
        assert r.status_code == 401

    def test_admin_demo_shares_returns_click_fields(self, admin_api):
        r = admin_api.get(f"{BASE_URL}/api/admin/demo-shares")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        if rows:
            row = rows[0]
            for key in ("id", "demo_type", "recipient_email", "click_count",
                        "first_clicked_at", "last_clicked_at", "tracked_url"):
                assert key in row, f"missing field {key} in admin demo-shares row"

    def test_admin_demo_sessions_summary(self, admin_api):
        r = admin_api.get(f"{BASE_URL}/api/admin/demo-sessions")
        assert r.status_code == 200
        body = r.json()
        assert "summary" in body and "sessions" in body
        s = body["summary"]
        for key in ("total", "half_view", "completed", "completion_rate", "half_view_rate"):
            assert key in s
        if body["sessions"]:
            sess = body["sessions"][0]
            # personalization fields exist on the session model
            for key in ("demo_type", "recipient_name", "recipient_company", "progress_pct"):
                assert key in sess
