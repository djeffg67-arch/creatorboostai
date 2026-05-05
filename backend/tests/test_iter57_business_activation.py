"""Iter 57 — Business Activation Capture System backend tests.

Covers:
- /api/business-activation/capture (happy path, idempotency, invalid email, graceful email-no-key)
- lead_registry collection side effects (LOCKED, founder, source)
- business_activation_captures + business_activation_nurture collections
- /api/business-activation/admin-list founder auth
"""
import os
import uuid
import pytest
import requests
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend/.env if not already set
if not os.environ.get("REACT_APP_BACKEND_URL"):
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                os.environ["REACT_APP_BACKEND_URL"] = line.split("=", 1)[1].strip()
                break

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
CAPTURE_URL = f"{BASE_URL}/api/business-activation/capture"
ADMIN_URL = f"{BASE_URL}/api/business-activation/admin-list"

FOUNDER_EMAIL_DB = "jeffrey@creatorboostai.com"
FOUNDER_TOKEN_DB = "PkxH2sPAHuiXiOCgHqE-_MnnQDUUwXxziPeFmzmhCsw"
EXPECTED_ASSIGNED = "j.davidg67@gmail.com"  # FOUNDER_EMAIL constant in business_activation.py


@pytest.fixture(scope="module")
def qa_email():
    return f"qa.iter57.{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture(scope="module")
def qa_business():
    # Unique per run so we don't dedupe into a prior-run lead via company+loc match
    return f"TEST QA Grooming {uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def capture_payload(qa_email, qa_business):
    return {
        "name": "QA Iter57 Tester",
        "email": qa_email,
        "business_type": "Pet services",
        "business_name": qa_business,
        "blocks": [
            {
                "tool": "break_even",
                "tool_label": "Break-Even Calculator",
                "markdown": "# Break-Even Analysis\n\nFixed: $2,000\nVariable: $15\nPrice: $50\n\n**Break-even: 58 units**",
            },
            {
                "tool": "startup_checklist",
                "tool_label": "Texas LLC Checklist",
                "markdown": "## Steps\n\n- File Certificate of Formation\n- EIN from IRS\n- Operating Agreement",
            },
        ],
        "wants_outbound_help": True,
        "consent_marketing": True,
        "source": "startup_builder",
        "session_id": "qa-iter57-sess",
    }


class TestCapture:
    def test_capture_happy_path(self, capture_payload):
        r = requests.post(CAPTURE_URL, json=capture_payload, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["is_new_lead"] is True
        assert isinstance(d["lead_id"], str) and len(d["lead_id"]) > 10
        assert isinstance(d["capture_id"], str) and len(d["capture_id"]) > 10
        assert d["pdf_size_bytes"] > 0
        assert d["continue_url"].endswith(f"activation={d['capture_id']}")
        assert d["nurture_scheduled"] is True
        # Preview has no RESEND_API_KEY → graceful degrade
        assert d["email_delivered"] is False
        assert d["email_error"] and "RESEND_API_KEY" in d["email_error"]
        # Stash IDs via pytest cache
        pytest._iter57_lead_id = d["lead_id"]  # type: ignore[attr-defined]
        pytest._iter57_capture_id = d["capture_id"]  # type: ignore[attr-defined]

    def test_capture_idempotent_same_lead(self, capture_payload):
        """Re-submit same email → is_new_lead=false, same lead_id (dedup by fingerprint)."""
        r = requests.post(CAPTURE_URL, json=capture_payload, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["is_new_lead"] is False
        assert d["lead_id"] == getattr(pytest, "_iter57_lead_id")
        # New capture_id each time
        assert d["capture_id"] != getattr(pytest, "_iter57_capture_id")

    def test_capture_invalid_email_422(self):
        bad = {
            "name": "Bad Email",
            "email": "not-an-email",
            "blocks": [],
        }
        r = requests.post(CAPTURE_URL, json=bad, timeout=30)
        assert r.status_code == 422, r.text


# Verify DB side-effects via direct Mongo access (more reliable than admin-list alone)
def test_db_side_effects(capture_payload):
    import asyncio
    import motor.motor_asyncio
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")

    async def _run():
        client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        try:
            email = capture_payload["email"].lower()
            # 1. Lead registry: LOCKED to founder
            lead = await db.leads_registry.find_one({"email": email}, {"_id": 0})
            assert lead is not None, "Lead not persisted to leads_registry"
            assert lead["lock_status"] == "LOCKED"
            assert lead["assigned_to_user_id"] == EXPECTED_ASSIGNED
            assert lead["source"] == "startup_builder"
            assert lead["status"] == "new"

            # 2. Capture doc persisted with blocks
            cap = await db.business_activation_captures.find_one(
                {"email": email}, {"_id": 0}, sort=[("created_at", -1)]
            )
            assert cap is not None
            assert cap["name"] == capture_payload["name"]
            assert cap["block_count"] == 2
            assert cap["wants_outbound_help"] is True
            assert len(cap["blocks"]) == 2

            # 3. Nurture scheduled
            nur = await db.business_activation_nurture.find_one(
                {"capture_id": cap["id"]}, {"_id": 0}
            )
            assert nur is not None
            assert nur["status"] == "active"
            assert nur["step_1"]["scheduled_at"]
            assert nur["step_1"]["delivered_ok"] is False
            assert nur["step_2"]["scheduled_at"] > nur["step_1"]["scheduled_at"]
            assert nur["step_3"]["scheduled_at"] > nur["step_2"]["scheduled_at"]
            assert nur["step_2"]["sent_at"] is None
            assert nur["step_3"]["sent_at"] is None
        finally:
            client.close()

    asyncio.run(_run())


class TestAdminList:
    def test_admin_list_requires_auth(self):
        # Bad token → 401
        r = requests.post(ADMIN_URL, json={"email": "x@y.z", "token": "bogus"}, timeout=15)
        assert r.status_code == 401, r.text

    def test_admin_list_founder_ok(self, capture_payload):
        r = requests.post(
            ADMIN_URL,
            json={"email": FOUNDER_EMAIL_DB, "token": FOUNDER_TOKEN_DB},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "captures" in d and "total" in d
        assert isinstance(d["captures"], list)
        # At least our two captures should be present
        mine = [c for c in d["captures"] if c.get("email") == capture_payload["email"].lower()]
        assert len(mine) >= 2, f"Expected >=2 captures for QA email, got {len(mine)}"
        sample = mine[0]
        # nurture progress enrichment
        assert "nurture" in sample
        for k in ("step_1", "step_2", "step_3"):
            assert k in sample["nurture"]
            assert "sent" in sample["nurture"][k]
