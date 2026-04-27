"""Iter16 — Supermarket demo backend smoke tests.
Covers: TTS prefetch endpoint + /api/share-demo accepting demo_type='supermarket'.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- TTS prefetch (used by SupermarketDemoPage to prefetch 18 scenes) ----
class TestTtsSpeak:
    def test_tts_speak_returns_audio_mpeg(self, api):
        r = api.post(f"{BASE_URL}/api/tts/speak", json={"text": "S R S", "voice": "nova"})
        assert r.status_code == 200, r.text
        ctype = r.headers.get("content-type", "")
        assert "audio/mpeg" in ctype, f"expected audio/mpeg got {ctype}"
        assert len(r.content) > 1000, f"audio body too small: {len(r.content)}"


# ---- /api/share-demo accepts demo_type='supermarket' ----
class TestShareDemoSupermarket:
    def test_share_demo_supermarket_accepted(self, api):
        payload = {
            "recipient_email": "TEST_supermarket@example.com",
            "recipient_name": "Sarah",
            "demo_type": "supermarket",
            "company": "ACME Foods",
            "share_target": "https://bodyiq-training.preview.emergentagent.com/demo/supermarket",
        }
        r = api.post(f"{BASE_URL}/api/share-demo", json=payload)
        assert r.status_code == 202, f"expected 202 got {r.status_code}: {r.text}"
        data = r.json()
        # Resend graceful degrade ⇒ sent may be False, but must NOT 422
        assert "share_id" in data and data["share_id"]
        assert "tracked_url" in data and "/api/r/" in data["tracked_url"]
        assert "demo_url" in data
        # share_target was a full URL → should be respected
        assert "/demo/supermarket" in data["demo_url"]
        # personalization appended
        assert "name=Sarah" in data["demo_url"]
        assert "company=ACME" in data["demo_url"]
        assert data["sent"] in (False, True)

    def test_share_demo_supermarket_default_target(self, api):
        # No share_target → should fall back to /demo/supermarket
        r = api.post(f"{BASE_URL}/api/share-demo", json={
            "recipient_email": "TEST_super2@example.com",
            "recipient_name": "Lee",
            "demo_type": "supermarket",
        })
        assert r.status_code == 202, r.text
        data = r.json()
        assert "/demo/supermarket" in data["demo_url"]

    def test_share_demo_still_rejects_garbage(self, api):
        r = api.post(f"{BASE_URL}/api/share-demo", json={
            "recipient_email": "TEST_x@example.com",
            "demo_type": "garbage",
        })
        assert r.status_code == 422
