"""Backend tests · /api/share-demo for Noldus demo (Iter 10)"""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")


def test_share_demo_noldus_payload_from_frontend():
    """Replicates the payload NoldusDemoPage sends. Should accept noldus demo_type and URL share_target."""
    payload = {
        "recipient_email": "test@example.com",
        "demo_type": "noldus",
        "share_target": f"{BASE_URL}/demo/noldus",
    }
    r = requests.post(f"{BASE_URL}/api/share-demo", json=payload, timeout=15)
    print("STATUS:", r.status_code, "BODY:", r.text[:500])
    # Per review request item 9: should return 200/202 with sent:true OR sent:false
    assert r.status_code in (200, 202), f"Expected 200/202, got {r.status_code}: {r.text}"
    body = r.json()
    assert "sent" in body


def test_share_demo_legacy_realtor_still_works():
    """Regression: existing realtor share still works."""
    payload = {
        "recipient_email": "test@example.com",
        "sender_name": "Test Sender",
        "demo_type": "realtor",
        "share_target": "demo",
    }
    r = requests.post(f"{BASE_URL}/api/share-demo", json=payload, timeout=15)
    assert r.status_code in (200, 202)
    body = r.json()
    assert "sent" in body and "demo_url" in body
