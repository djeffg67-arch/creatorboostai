"""Tests for /api/tts/speak (caching) + /api/lead/analyze (LLM) — realtor demo flow."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


# ---------- Smoke ----------
def test_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "online"


# ---------- TTS ----------
TTS_TEXT = "Welcome. Over the next twelve minutes, you'll see how CreatorBoostAI operates as a unified command center."


def test_tts_speak_returns_audio(session):
    r = session.post(f"{API}/tts/speak", json={"text": TTS_TEXT, "voice": "nova"}, timeout=60)
    assert r.status_code == 200, f"TTS failed: {r.status_code} {r.text[:300]}"
    assert r.headers.get("content-type", "").startswith("audio/")
    assert len(r.content) > 1000  # real audio bytes


def test_tts_speak_cache_is_faster_on_second_call(session):
    payload = {"text": TTS_TEXT + " Cache benchmark.", "voice": "nova"}
    t1 = time.time()
    r1 = session.post(f"{API}/tts/speak", json=payload, timeout=60)
    d1 = time.time() - t1
    assert r1.status_code == 200
    first_len = len(r1.content)

    t2 = time.time()
    r2 = session.post(f"{API}/tts/speak", json=payload, timeout=60)
    d2 = time.time() - t2
    assert r2.status_code == 200
    assert len(r2.content) == first_len  # same bytes
    # cache hit should be considerably faster (allow generous margin)
    print(f"TTS first={d1:.2f}s second={d2:.2f}s")
    assert d2 < d1 or d2 < 1.0


def test_tts_invalid_voice_falls_back(session):
    r = session.post(f"{API}/tts/speak", json={"text": "Voice fallback test.", "voice": "not-a-voice"}, timeout=60)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("audio/")


# ---------- Lead analyze ----------
def test_lead_analyze_buyer(session):
    desc = "Hi, I'm looking for a 3-bedroom rental in Heritage Hill. Pre-approved up to $2,400/mo. Need to move in by April 1."
    r = session.post(f"{API}/lead/analyze", json={"description": desc}, timeout=120)
    assert r.status_code == 200, f"analyze failed: {r.status_code} {r.text[:400]}"
    data = r.json()
    for k in ("lead_type", "intent_score", "urgency", "key_signals", "recommended_action", "personalized_message"):
        assert k in data
    assert data["lead_type"] in {"buyer", "seller", "renter", "property_management", "investor"}
    assert 0 <= data["intent_score"] <= 100
    assert 0 <= data["urgency"] <= 100
    assert isinstance(data["key_signals"], list) and len(data["key_signals"]) >= 1
    assert len(data["personalized_message"]) > 20


def test_lead_analyze_too_short(session):
    r = session.post(f"{API}/lead/analyze", json={"description": "hi"}, timeout=30)
    assert r.status_code == 422


# ---------- Public smoke for other routes ----------
@pytest.mark.parametrize("path", ["/", "/demo", "/demo/realtor", "/training", "/library", "/contact", "/admin"])
def test_frontend_routes_load(session, path):
    r = session.get(f"{BASE_URL}{path}", timeout=30)
    assert r.status_code == 200
    assert "<html" in r.text.lower() or "<!doctype" in r.text.lower()


def test_products_endpoint(session):
    r = session.get(f"{API}/products")
    assert r.status_code == 200
    keys = r.json().keys()
    assert {"foundations", "applied", "forensic_library"}.issubset(set(keys))
