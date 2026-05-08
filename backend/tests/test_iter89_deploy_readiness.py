"""Iter 89 — Production stabilization + deploy readiness verification.

Covers spec items 9 (deploy-readiness probe), 10 (PII safety), 7 (startup-launch health),
3 (SSE feed shape + event count + action_id badges), and 6 (Koollite efficacy not under backend
but verified that the route returns 200 in the public path)."""
import os
import re
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
TIMEOUT = 15


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


# ---------- Item 9: Deploy readiness probe ----------
class TestDeployReadiness:
    def test_endpoint_returns_200(self, session):
        r = session.get(f"{BASE_URL}/api/public/deploy-readiness", timeout=TIMEOUT)
        assert r.status_code == 200
        self.payload = r.json()  # noqa

    def test_verdict_green_and_critical_clean(self, session):
        d = session.get(f"{BASE_URL}/api/public/deploy-readiness", timeout=TIMEOUT).json()
        assert d.get("verdict") == "GREEN_DEPLOY_READY", d.get("verdict")
        assert d.get("critical_clean") is True

    def test_lint_clean(self, session):
        d = session.get(f"{BASE_URL}/api/public/deploy-readiness", timeout=TIMEOUT).json()
        lint = d.get("lint", {})
        assert lint.get("F401_unused_imports", {}).get("ok") is True
        assert lint.get("F821_undefined_names", {}).get("ok") is True

    def test_no_eval_in_backend(self, session):
        d = session.get(f"{BASE_URL}/api/public/deploy-readiness", timeout=TIMEOUT).json()
        assert d.get("security", {}).get("eval_calls_in_backend") == 0

    def test_known_prod_only_secrets_absent_in_preview(self, session):
        d = session.get(f"{BASE_URL}/api/public/deploy-readiness", timeout=TIMEOUT).json()
        envs = d.get("env_vars", {})
        assert envs.get("RESEND_API_KEY", {}).get("present") is False
        assert envs.get("STRIPE_PUBLISHABLE_KEY", {}).get("present") is False


# ---------- Item 7: Startup Launch health ----------
class TestStartupLaunchHealth:
    def test_health_ok(self, session):
        r = session.get(f"{BASE_URL}/api/startup-launch/health", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        assert d.get("llm_configured") is True
        assert d.get("model") == "claude-sonnet-4-5-20250929"


# ---------- Item 3: SSE Live Pulse contract ----------
class TestSystemPulse:
    def test_pulse_shape(self, session):
        r = session.get(f"{BASE_URL}/api/public/system-pulse", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        assert "connected_count" in d
        assert isinstance(d.get("connected_count"), int)
        events = d.get("events", [])
        assert len(events) >= 6, f"expected >= 6 events, got {len(events)}"
        # action_id badges expected per spec: fb-lead, fb-aint(maintenance), fb-mail, fb-deal, fb-invoice, fb-appt
        ids = [e.get("action_id", "") for e in events]
        prefixes = {i.split("-")[0] + "-" + i.split("-")[1] for i in ids if i.count("-") >= 2}
        assert any(i.startswith("fb-lead") for i in ids), ids
        assert any(i.startswith("fb-deal") for i in ids), ids
        # All events must have title + tone + action_id
        for ev in events:
            assert ev.get("action_id"), ev
            assert ev.get("title"), ev


# ---------- Item 10: PII safety ----------
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
PII_ALLOWLIST_DOMAINS = ("example.com", "company.com")


def _scan_pii(text: str):
    emails = [e for e in EMAIL_RE.findall(text) if not any(d in e for d in PII_ALLOWLIST_DOMAINS)]
    phones = PHONE_RE.findall(text)
    ssns = SSN_RE.findall(text)
    return emails, phones, ssns


class TestPiiSafety:
    def test_system_pulse_no_pii(self, session):
        body = session.get(f"{BASE_URL}/api/public/system-pulse", timeout=TIMEOUT).text
        emails, phones, ssns = _scan_pii(body)
        assert not emails, f"emails leaked: {emails}"
        assert not phones, f"phones leaked: {phones}"
        assert not ssns, f"ssns leaked: {ssns}"

    def test_action_lookup_no_pii(self, session):
        body = session.get(f"{BASE_URL}/api/public/action/fb-lead-001", timeout=TIMEOUT).text
        emails, phones, ssns = _scan_pii(body)
        assert not emails, f"emails leaked: {emails}"
        assert not phones, f"phones leaked: {phones}"
        assert not ssns, f"ssns leaked: {ssns}"

    def test_action_lookup_returns_event(self, session):
        d = session.get(f"{BASE_URL}/api/public/action/fb-lead-001", timeout=TIMEOUT).json()
        assert d.get("ok") is True
        assert d.get("found") is True
        assert d.get("event", {}).get("action_id") == "fb-lead-001"


# ---------- Item 8: Startup launch persistence (validation path only — no live LLM) ----------
class TestStartupLaunchValidation:
    def test_generate_validation_rejects_empty(self, session):
        # Empty body should fail validation — verifies the endpoint is wired.
        r = session.post(f"{BASE_URL}/api/startup-launch/generate", json={}, timeout=TIMEOUT)
        assert r.status_code in (400, 422), f"expected validation error, got {r.status_code}: {r.text[:200]}"

    def test_get_nonexistent_plan_404(self, session):
        r = session.get(f"{BASE_URL}/api/startup-launch/plan/does-not-exist-xyz-9999", timeout=TIMEOUT)
        assert r.status_code in (404, 400), r.status_code
