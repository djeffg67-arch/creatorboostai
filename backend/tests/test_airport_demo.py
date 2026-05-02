"""Airport Demo backend tests: TTS + save-progress with demo_type='airport'."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")


def test_tts_speak_sage_returns_audio():
    r = requests.post(
        f"{BASE_URL}/api/tts/speak",
        json={"text": "Picture a modern international terminal.", "voice": "sage"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    ct = r.headers.get("content-type", "")
    assert "audio" in ct or "mpeg" in ct, f"unexpected content-type: {ct}"
    assert len(r.content) > 500


def test_save_progress_airport():
    body = {
        "session_id": "TEST-airport-001",
        "demo_type": "airport",
        "total_scenes": 9,
    }
    r = requests.post(f"{BASE_URL}/api/demo/session/start", json=body, timeout=20)
    assert r.status_code == 201, r.text
    session_id = r.json()["session_id"]
    # heartbeat midway
    hb = requests.post(
        f"{BASE_URL}/api/demo/session/heartbeat",
        json={"session_id": session_id, "scene": 4, "progress_pct": 50, "watch_seconds": 120},
        timeout=20,
    )
    assert hb.status_code == 200, hb.text


def test_save_progress_airport_midway():
    body = {
        "session_id": "TEST-airport-002",
        "demo_type": "airport",
        "scene": 4,
        "total_scenes": 9,
        "progress_pct": 50,
        "recipient_email": "test@example.com",
    }
    r = requests.post(f"{BASE_URL}/api/demo/session/save", json=body, timeout=20)
    # save may require other fields; accept 200/201/202/422 — assert NOT regex failure for demo_type
    assert r.status_code != 404, r.text
    if r.status_code == 422:
        assert "demo_type" not in r.text or "pattern" not in r.text, r.text


@pytest.mark.parametrize("path", [
    "/demo/noldus", "/demo/supermarket", "/demo/realtor",
    "/demo/insurance", "/demo/creator", "/demo/airport", "/",
])
def test_public_pages_load(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=20)
    assert r.status_code == 200, f"{path} -> {r.status_code}"
