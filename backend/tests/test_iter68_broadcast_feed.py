"""
Iter 68 — BroadcastFeed backend tests.
Verify POST /api/ops/outbound/live-pulse returns broadcast_events array (newest first, max 25)
with required fields per event: ts, kind, lane, summary, ref, simulated.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")

MASTER_KEY = "jeffrey-2026-bodyiq-founder-master"
LIVE_PULSE = f"{BASE_URL}/api/ops/outbound/live-pulse"
FOUNDER_ACCESS = f"{BASE_URL}/api/ops/founder-access"

VALID_LANES = {"outreach", "reply", "demo", "hot", "deal", "scheduling", "intake", "engine"}


@pytest.fixture(scope="module")
def founder_auth():
    r = requests.post(FOUNDER_ACCESS, json={"key": MASTER_KEY}, timeout=15)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text}"
    j = r.json()
    assert "email" in j and "token" in j
    return {"email": j["email"], "token": j["token"]}


@pytest.fixture(scope="module")
def pulse_payload(founder_auth):
    r = requests.post(LIVE_PULSE, json=founder_auth, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


class TestBroadcastEvents:
    def test_broadcast_events_key_present(self, pulse_payload):
        assert "broadcast_events" in pulse_payload, "broadcast_events missing from live-pulse response"
        assert isinstance(pulse_payload["broadcast_events"], list)

    def test_broadcast_events_max_25(self, pulse_payload):
        events = pulse_payload["broadcast_events"]
        assert len(events) <= 25, f"expected ≤25 events, got {len(events)}"

    def test_broadcast_events_required_fields(self, pulse_payload):
        events = pulse_payload["broadcast_events"]
        if not events:
            pytest.skip("no broadcast events in current dataset — cannot validate fields")
        required = {"ts", "kind", "lane", "summary", "ref", "simulated"}
        for ev in events:
            missing = required - set(ev.keys())
            assert not missing, f"event missing fields {missing}: {ev}"

    def test_broadcast_events_lane_values(self, pulse_payload):
        events = pulse_payload["broadcast_events"]
        if not events:
            pytest.skip("no broadcast events")
        for ev in events:
            assert ev["lane"] in VALID_LANES, f"invalid lane '{ev['lane']}' in {ev}"

    def test_broadcast_events_summary_human_readable(self, pulse_payload):
        events = pulse_payload["broadcast_events"]
        if not events:
            pytest.skip("no broadcast events")
        for ev in events:
            assert isinstance(ev["summary"], str), "summary must be string"
            assert len(ev["summary"]) > 3, f"summary too short: {ev['summary']!r}"

    def test_broadcast_events_sorted_newest_first(self, pulse_payload):
        events = pulse_payload["broadcast_events"]
        if len(events) < 2:
            pytest.skip("need ≥2 events to validate sort order")
        timestamps = [ev.get("ts") or "" for ev in events]
        assert timestamps == sorted(timestamps, reverse=True), "events must be newest-first"

    def test_broadcast_events_simulated_is_bool(self, pulse_payload):
        events = pulse_payload["broadcast_events"]
        if not events:
            pytest.skip("no broadcast events")
        for ev in events:
            assert isinstance(ev["simulated"], bool), f"simulated must be bool, got {type(ev['simulated'])}"


class TestAuthGating:
    def test_no_auth_rejected(self):
        r = requests.post(LIVE_PULSE, json={}, timeout=15)
        assert r.status_code in (401, 403, 422)

    def test_wrong_token_rejected(self):
        r = requests.post(LIVE_PULSE, json={"email": "j.davidg67@gmail.com", "token": "bad-token-x"}, timeout=15)
        assert r.status_code in (401, 403)
