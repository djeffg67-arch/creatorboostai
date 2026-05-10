"""Iter 102 — verify /api/ops/outbound/live-pulse signal diagnostic fields."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
MASTER_KEY = "jeffrey-2026-bodyiq-founder-master"


@pytest.fixture(scope="module")
def auth():
    r = requests.post(f"{BASE_URL}/api/ops/founder-access", json={"key": MASTER_KEY}, timeout=20)
    assert r.status_code == 200, f"founder-access failed: {r.status_code} {r.text[:200]}"
    j = r.json()
    assert "email" in j and "token" in j
    return {"email": j["email"], "token": j["token"]}


def test_live_pulse_signal_shape(auth):
    r = requests.post(f"{BASE_URL}/api/ops/outbound/live-pulse", json=auth, timeout=30)
    assert r.status_code == 200, f"live-pulse failed: {r.status_code} {r.text[:200]}"
    body = r.json()
    assert body.get("ok") is True
    sig = body.get("signal")
    assert isinstance(sig, dict), "signal block missing"

    # required keys
    for k in ("level", "label", "summary", "reasons",
              "heartbeat_status", "queue_latency_sec",
              "last_successful_send_at", "last_warning_at", "last_warning_message"):
        assert k in sig, f"signal.{k} missing — full sig keys: {list(sig.keys())}"

    # Types / values
    assert sig["level"] in ("green", "yellow", "red"), f"bad level: {sig['level']}"
    assert isinstance(sig["label"], str) and sig["label"]
    assert isinstance(sig["summary"], str)
    assert isinstance(sig["reasons"], list)
    assert sig["heartbeat_status"] in ("fresh", "stale", "none"), f"bad heartbeat_status: {sig['heartbeat_status']}"
    assert sig["queue_latency_sec"] is None or isinstance(sig["queue_latency_sec"], int)
    assert sig["last_successful_send_at"] is None or isinstance(sig["last_successful_send_at"], str)
    assert sig["last_warning_at"] is None or isinstance(sig["last_warning_at"], str)
    assert sig["last_warning_message"] is None or isinstance(sig["last_warning_message"], str)

    print("\n=== Iter 102 signal block ===")
    for k in ("level", "label", "summary", "reasons", "heartbeat_status",
              "queue_latency_sec", "last_successful_send_at",
              "last_warning_at", "last_warning_message"):
        print(f"  {k}: {sig.get(k)}")


def test_live_pulse_healthy_engine_green(auth):
    r = requests.post(f"{BASE_URL}/api/ops/outbound/live-pulse", json=auth, timeout=30)
    body = r.json()
    sig = body["signal"]
    # On the current healthy engine: should be green; heartbeat fresh.
    assert sig["level"] == "green", f"expected green on healthy engine but got {sig['level']} ({sig.get('reasons')})"
    assert sig["heartbeat_status"] == "fresh", f"expected fresh, got {sig['heartbeat_status']}"
    assert sig["label"] == "Operational"
    # 0% errors per the iter context
    er = body.get("signal", {}).get("error_rate", 0) or 0
    # reasons should include the all_expected_workers_fresh tag for green
    assert "all_expected_workers_fresh" in sig["reasons"], \
        f"missing all_expected_workers_fresh in reasons: {sig['reasons']}"
