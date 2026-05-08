"""
Iter 88 pre-deployment regression tests.
Validates the security patches (random→secrets, ADMIN_PASSWORD→env) did not
break backend-critical surfaces:
  - /api/public/system-pulse (Iter 87 polling endpoint, public, must be PII-safe)
  - /api/startup-launch/health
  - /api/startup-launch/generate validation (422 on empty body)
  - /api/startup-launch/plan/{id} 404 path
"""
import os
import re
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/public/system-pulse ----------
class TestPublicSystemPulse:
    def test_status_200(self, api):
        r = api.get(f"{BASE_URL}/api/public/system-pulse", timeout=15)
        assert r.status_code == 200, r.text

    def test_top_level_shape(self, api):
        d = api.get(f"{BASE_URL}/api/public/system-pulse", timeout=15).json()
        assert d.get("ok") is True
        assert d.get("streaming") is True
        assert "server_time" in d
        assert isinstance(d.get("ai_actions_today"), int)
        assert isinstance(d.get("systems_operational"), bool)
        assert isinstance(d.get("events"), list)
        assert len(d["events"]) == 6
        assert isinstance(d.get("kpis"), dict)

    def test_event_shape(self, api):
        d = api.get(f"{BASE_URL}/api/public/system-pulse", timeout=15).json()
        required = {"time", "kind", "title", "sub", "tone"}
        for i, ev in enumerate(d["events"]):
            assert required.issubset(ev.keys()), f"event[{i}] missing fields: {required-set(ev.keys())}"

    def test_kpi_keys(self, api):
        d = api.get(f"{BASE_URL}/api/public/system-pulse", timeout=15).json()
        kpis = d["kpis"]
        for k in ["revenue_impact", "leads_captured", "deals_pipeline", "tasks_done", "system_health_pct"]:
            assert k in kpis, f"kpi missing: {k}"

    def test_no_real_pii(self, api):
        """Public endpoint must never leak real customer emails / domains."""
        d = api.get(f"{BASE_URL}/api/public/system-pulse", timeout=15).json()
        body = json.dumps(d)
        emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", body)
        leaks = [e for e in emails if "example.com" not in e.lower()]
        assert leaks == [], f"PII leaked from public endpoint: {leaks}"


# ---------- /api/startup-launch ----------
class TestStartupLaunch:
    def test_health_200(self, api):
        r = api.get(f"{BASE_URL}/api/startup-launch/health", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        assert d.get("model") == "claude-sonnet-4-5-20250929"
        assert d.get("llm_configured") is True

    def test_generate_validation_422(self, api):
        # Empty body → pydantic 422 (do NOT call live generate, upstream 502 documented)
        r = api.post(f"{BASE_URL}/api/startup-launch/generate", json={}, timeout=15)
        assert r.status_code == 422

    def test_plan_not_found_404(self, api):
        r = api.get(f"{BASE_URL}/api/startup-launch/plan/non-existent", timeout=15)
        assert r.status_code == 404


# ---------- secrets-swap import safety ----------
class TestSecretsSwap:
    def test_no_random_imports_in_patched_files(self):
        for f in [
            "/app/backend/start_engine.py",
            "/app/backend/business_activation.py",
            "/app/backend/outbound.py",
        ]:
            txt = open(f).read()
            # `import random` should be gone (excluding `secrets`)
            assert not re.search(r"^\s*import\s+random\s*$", txt, re.MULTILINE), f"{f} still imports random"
            # Should reference secrets.* now
            assert "secrets." in txt, f"{f} should use secrets module"
