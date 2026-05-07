"""Backend tests for /api/startup-launch/* (Iter 82)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bodyiq-training.preview.emergentagent.com").rstrip("/")
PREFIX = f"{BASE_URL}/api/startup-launch"

EXPECTED_KEYS = [
    "business_overview", "startup_roadmap", "website_structure",
    "homepage_copy", "service_page_ideas", "pricing_structure",
    "outreach_strategy", "lead_generation", "crm_workflow",
]

VALID_INTAKE = {
    "intake": {
        "business_name": "TEST Atlas Mobile Diagnostics",
        "industry": "On-site equipment diagnostics for mid-sized fleets",
        "services": "Diagnostics, predictive maintenance, parts sourcing, retainer support",
        "location": "Tampa Bay, FL · 50 mile radius",
        "business_goals": "Hit $40K MRR by month 9. Build a recurring-retainer book.",
        "target_customers": "Logistics fleets, last-mile carriers, regional grocery chains",
        "revenue_goals": "$500K Y1 ARR · 60% retainer / 40% project",
        "branding_style": "Operator-grade, dark mode, monospace accents, no fluff",
    }
}

# Cached plan_id reused across tests to avoid extra LLM calls
_plan_cache = {"plan_id": None}


# ── Health endpoint
class TestHealth:
    def test_health_endpoint(self):
        r = requests.get(f"{PREFIX}/health", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["llm_configured"] is True
        assert d["model"] == "claude-sonnet-4-5-20250929"
        assert d["phase"] == "1 · intake + orchestration + generation"
        assert d["phase2_ready"] is False
        assert isinstance(d["future_hooks"], list) and len(d["future_hooks"]) == 5
        for h in [
            "website_generation", "prompt_export", "deployment_integrations",
            "ai_builder_integrations", "crm_setup_automation",
        ]:
            assert h in d["future_hooks"]


# ── Validation
class TestValidation:
    def test_missing_field_returns_422(self):
        bad = {"intake": {k: v for k, v in VALID_INTAKE["intake"].items() if k != "industry"}}
        r = requests.post(f"{PREFIX}/generate", json=bad, timeout=15)
        assert r.status_code == 422, r.text


# ── Generation (single LLM call, cached)
class TestGenerate:
    def test_generate_full_plan(self):
        r = requests.post(f"{PREFIX}/generate", json=VALID_INTAKE, timeout=120)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:600]}"
        d = r.json()
        assert d["ok"] is True
        assert "plan_id" in d and isinstance(d["plan_id"], str)
        assert d["model"] == "claude-sonnet-4-5-20250929"
        assert "created_at" in d
        assert "_id" not in d
        assert d["intake"]["business_name"] == VALID_INTAKE["intake"]["business_name"]
        plan = d["plan"]
        assert isinstance(plan, dict)
        for k in EXPECTED_KEYS:
            assert k in plan, f"missing key: {k}"
        # Spot-check non-null content for at least a few high-value sections
        assert plan["business_overview"] is not None
        assert plan["startup_roadmap"] is not None
        _plan_cache["plan_id"] = d["plan_id"]


# ── Fetch plan
class TestFetchPlan:
    def test_fetch_existing_plan(self):
        plan_id = _plan_cache.get("plan_id")
        if not plan_id:
            pytest.skip("no plan_id from generate test")
        r = requests.get(f"{PREFIX}/plan/{plan_id}", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["id"] == plan_id
        assert "_id" not in d
        assert d["intake"]["business_name"] == VALID_INTAKE["intake"]["business_name"]
        plan = d["plan"]
        for k in EXPECTED_KEYS:
            assert k in plan

    def test_fetch_nonexistent_plan_404(self):
        r = requests.get(f"{PREFIX}/plan/non-existent-id", timeout=15)
        assert r.status_code == 404, r.text
