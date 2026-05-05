"""Iter 55 · Client Delivery System — backend contract tests.

Covers the full /api/client surface (founder + public portal) and the
auto-onboarding trigger via POST /api/ops/leads/status (status=won).
"""
from __future__ import annotations

import base64
import os
import uuid

import pytest
import requests

def _resolve_base_url() -> str:
    u = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not u:
        try:
            with open("/app/frontend/.env", "r") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        u = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    return u.rstrip("/")


BASE_URL = _resolve_base_url()
FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"

pytestmark = pytest.mark.skipif(not BASE_URL, reason="REACT_APP_BACKEND_URL not configured")


# ──────────────── Fixtures ────────────────
@pytest.fixture(scope="module")
def founder_auth():
    r = requests.post(f"{BASE_URL}/api/ops/founder-access", json={"key": FOUNDER_KEY}, timeout=15)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    d = r.json()
    return {"email": d["email"], "token": d["token"]}


@pytest.fixture(scope="module")
def created_lead(founder_auth):
    payload = {
        **founder_auth,
        "contact_name": "Iter55 QA Client",
        "company": "Iter55 QA Co",
        "contact_email": f"qa55-{uuid.uuid4().hex[:6]}@iter55.example.com",
        "value_usd": 50000,
    }
    r = requests.post(f"{BASE_URL}/api/ops/leads/create", json=payload, timeout=15)
    assert r.status_code == 200, f"lead create failed: {r.status_code} {r.text}"
    d = r.json()
    assert d.get("lead_id")
    return d


@pytest.fixture(scope="module")
def onboarded(founder_auth, created_lead):
    """Flip the lead to won → triggers auto_onboard_from_lead."""
    r = requests.post(
        f"{BASE_URL}/api/ops/leads/status",
        json={**founder_auth, "lead_id": created_lead["lead_id"], "status": "won"},
        timeout=20,
    )
    assert r.status_code == 200, f"status→won failed: {r.status_code} {r.text}"
    d = r.json()
    assert "onboarded_client_id" in d, f"missing onboarded_client_id: {d}"
    return {"lead_id": created_lead["lead_id"], "client_id": d["onboarded_client_id"]}


@pytest.fixture(scope="module")
def workspace_payload(founder_auth, onboarded):
    r = requests.post(
        f"{BASE_URL}/api/client/workspace",
        json={**founder_auth, "client_id": onboarded["client_id"]},
        timeout=15,
    )
    assert r.status_code == 200, f"workspace failed: {r.status_code} {r.text}"
    return r.json()


# ──────────────── Auto-onboarding ────────────────
class TestAutoOnboarding:
    def test_onboarded_creates_workspace_with_6_tasks_and_welcome(self, workspace_payload):
        assert "client" in workspace_payload
        assert "magic_link" in workspace_payload and workspace_payload["magic_link"]
        assert len(workspace_payload["tasks"]) == 6
        task_keys = sorted(t["key"] for t in workspace_payload["tasks"])
        assert task_keys == sorted([
            "intake_received", "strategy_defined", "setup_complete",
            "first_execution", "review", "optimization"
        ])
        assert len(workspace_payload["messages"]) >= 1
        assert workspace_payload["messages"][0]["author"] == "delivery_ai"
        assert workspace_payload["uploads"] == []
        assert workspace_payload["client"]["status"] == "onboarding"
        # client_token must NOT leak to founder workspace view
        assert "client_token" not in workspace_payload["client"]

    def test_idempotent_second_won_flip(self, founder_auth, onboarded):
        r = requests.post(
            f"{BASE_URL}/api/ops/leads/status",
            json={**founder_auth, "lead_id": onboarded["lead_id"], "status": "won"},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d.get("onboarded_client_id") == onboarded["client_id"]
        # verify no duplicate tasks after second flip
        w = requests.post(
            f"{BASE_URL}/api/client/workspace",
            json={**founder_auth, "client_id": onboarded["client_id"]},
            timeout=15,
        ).json()
        assert len(w["tasks"]) == 6


# ──────────────── /api/client/list ────────────────
class TestClientList:
    def test_founder_list_returns_counts(self, founder_auth, onboarded):
        r = requests.post(f"{BASE_URL}/api/client/list", json=founder_auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "clients" in d and isinstance(d["clients"], list)
        assert "counts" in d
        for key in ["all", "onboarding", "in_progress", "review", "completed", "inactive"]:
            assert key in d["counts"], f"missing count key: {key}"
            assert isinstance(d["counts"][key], int)
        ids = [c["client_id"] for c in d["clients"]]
        assert onboarded["client_id"] in ids
        # client_token never leaks
        assert all("client_token" not in c for c in d["clients"])


# ──────────────── Task toggle + status auto-sync ────────────────
class TestTaskToggleAutoSync:
    def test_toggle_one_task_flips_to_in_progress(self, founder_auth, onboarded):
        r = requests.post(
            f"{BASE_URL}/api/client/task-toggle",
            json={**founder_auth, "client_id": onboarded["client_id"],
                  "task_key": "intake_received", "done": True},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        client = r.json()["client"]
        assert client["status"] == "in_progress"

    def test_complete_all_tasks_flips_to_completed(self, founder_auth, onboarded):
        for key in ["strategy_defined", "setup_complete", "first_execution", "review", "optimization"]:
            r = requests.post(
                f"{BASE_URL}/api/client/task-toggle",
                json={**founder_auth, "client_id": onboarded["client_id"],
                      "task_key": key, "done": True},
                timeout=15,
            )
            assert r.status_code == 200, r.text
        final = r.json()["client"]
        assert final["status"] == "completed"


# ──────────────── Founder: set-status / reply / resend-magic / inactive ────────────────
class TestFounderActions:
    def test_set_status_valid(self, founder_auth, onboarded):
        r = requests.post(
            f"{BASE_URL}/api/client/set-status",
            json={**founder_auth, "client_id": onboarded["client_id"], "status": "review"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["client"]["status"] == "review"

    def test_set_status_invalid_rejected(self, founder_auth, onboarded):
        r = requests.post(
            f"{BASE_URL}/api/client/set-status",
            json={**founder_auth, "client_id": onboarded["client_id"], "status": "bogus"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_founder_reply_appends_message(self, founder_auth, onboarded):
        r = requests.post(
            f"{BASE_URL}/api/client/reply",
            json={**founder_auth, "client_id": onboarded["client_id"], "body": "TEST founder reply"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        msg = r.json()["message"]
        assert msg["author"] == "founder"
        assert msg["body"] == "TEST founder reply"

    def test_resend_magic_returns_delivered_to(self, founder_auth, onboarded):
        r = requests.post(
            f"{BASE_URL}/api/client/resend-magic",
            json={**founder_auth, "client_id": onboarded["client_id"]},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        assert "delivered_to" in d

    def test_inactive_flag_check(self, founder_auth):
        r = requests.post(
            f"{BASE_URL}/api/client/inactive-flag-check",
            json=founder_auth,
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("flagged_count"), int)


# ──────────────── Public portal (magic token) ────────────────
@pytest.fixture(scope="module")
def client_magic_token(founder_auth, onboarded):
    """Fetch real client_token from DB-backed list endpoint is not available
    (token is stripped). Use /resend-magic log? No — the token is created by
    auto_onboard. Get it via direct dev backdoor: re-onboard returns the full
    doc only to founder with manual trigger. Easiest: call /onboard-from-lead
    which returns the client (with token stripped), then resend-magic logs
    the url in client_magic_link_log. We read the token from the preview
    response — instead, rely on a server-only helper? The spec promises the
    founder sees the `magic_link` in the workspace response. Parse the token
    from that URL."""
    w = requests.post(
        f"{BASE_URL}/api/client/workspace",
        json={**founder_auth, "client_id": onboarded["client_id"]},
        timeout=15,
    ).json()
    link = w["magic_link"]
    token = link.split("token=", 1)[-1]
    assert token and len(token) > 8, f"bad token parsed from {link}"
    return token


class TestPublicPortal:
    def test_portal_access_valid_token(self, onboarded, client_magic_token):
        r = requests.post(
            f"{BASE_URL}/api/client/portal/access",
            json={"client_id": onboarded["client_id"], "client_token": client_magic_token},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "client" in d
        assert isinstance(d["tasks"], list)
        assert isinstance(d["messages"], list)
        assert isinstance(d["uploads"], list)

    def test_portal_access_invalid_token(self, onboarded):
        r = requests.post(
            f"{BASE_URL}/api/client/portal/access",
            json={"client_id": onboarded["client_id"], "client_token": "x" * 40},
            timeout=15,
        )
        assert r.status_code == 401

    def test_portal_message_creates_client_msg(self, onboarded, client_magic_token):
        r = requests.post(
            f"{BASE_URL}/api/client/portal/message",
            json={"client_id": onboarded["client_id"],
                  "client_token": client_magic_token,
                  "body": "TEST client message from portal"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        msg = r.json()["message"]
        assert msg["author"] == "client"

    def test_portal_upload_small_png_ok(self, onboarded, client_magic_token):
        # tiny 1x1 PNG
        png_bytes = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
        )
        b64 = base64.b64encode(png_bytes).decode()
        r = requests.post(
            f"{BASE_URL}/api/client/portal/upload",
            json={"client_id": onboarded["client_id"],
                  "client_token": client_magic_token,
                  "filename": "test.png",
                  "mimetype": "image/png",
                  "content_b64": b64},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        up = r.json()["upload"]
        assert up["filename"] == "test.png"
        assert "content_b64" not in up  # never echoed

    def test_portal_upload_too_large_returns_413(self, onboarded, client_magic_token):
        big = base64.b64encode(b"A" * (6 * 1024 * 1024)).decode()
        r = requests.post(
            f"{BASE_URL}/api/client/portal/upload",
            json={"client_id": onboarded["client_id"],
                  "client_token": client_magic_token,
                  "filename": "big.bin",
                  "mimetype": "application/octet-stream",
                  "content_b64": big},
            timeout=30,
        )
        assert r.status_code == 413


# ──────────────── Avatar · client_portal surface forces delivery mode ────────────────
class TestAvatarClientPortal:
    def test_delivery_mode_no_upsell(self):
        r = requests.post(
            f"{BASE_URL}/api/avatar/chat",
            json={
                "surface": "client_portal",
                "history": [
                    {"role": "user", "content": "How do I upload my intake doc? Any next steps?"}
                ],
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        reply = (d.get("reply") or "").lower()
        assert reply, "empty reply"
        for forbidden in ["pricing", "subscribe", "plan "]:
            assert forbidden not in reply, f"forbidden upsell word `{forbidden}` in reply: {reply[:300]}"
