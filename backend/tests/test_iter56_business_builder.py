"""Backend tests for Iter 56 — Business Builder Module.

Covers:
- GET  /api/business-builder/tools  → 17 tools, schema check
- POST /api/business-builder/generate startup_checklist (Texas LLC) → markdown ≥ 500 chars + disclaimer
- POST /api/business-builder/generate break_even minimal inputs → markdown contains digit/$
- POST /api/business-builder/generate unknown tool → 400
"""
import os
import re
import pytest
import requests
from pathlib import Path


def _load_backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not url:
        env_path = Path("/app/frontend/.env")
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("REACT_APP_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip()
                    break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_backend_url()
BB = f"{BASE_URL}/api/business-builder"

# Generation endpoints can take 8-25s due to Claude Sonnet latency.
GEN_TIMEOUT = 60


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ──────────────── Tool catalog ────────────────
class TestToolsCatalog:
    def test_list_tools_returns_17(self, session):
        r = session.get(f"{BB}/tools", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "tools" in data
        tools = data["tools"]
        assert isinstance(tools, list)
        assert len(tools) == 17, f"expected 17 tools, got {len(tools)}"

        expected_keys = {
            "business_plan", "financial_projections", "loan_summary", "startup_checklist",
            "icp_builder", "sales_script", "email_campaign", "pitch_deck_outline",
            "offer_pricing", "market_research", "competitor_research", "social_content",
            "proposal", "invoice", "break_even", "roi_calc", "startup_budget",
        }
        keys = {t["key"] for t in tools}
        assert keys == expected_keys, f"missing/extra keys: {expected_keys ^ keys}"

        # Each tool has required fields
        for t in tools:
            assert "key" in t and "label" in t and "fields" in t
            assert isinstance(t["fields"], list)
            assert len(t["fields"]) >= 1


# ──────────────── Generate happy-path ────────────────
class TestGenerate:
    def test_generate_startup_checklist_texas_llc(self, session):
        payload = {
            "tool": "startup_checklist",
            "inputs": {
                "business_name": "TEST Co",
                "industry": "Pet services",
                "state": "Texas",
                "structure": "LLC",
            },
        }
        r = session.post(f"{BB}/generate", json=payload, timeout=GEN_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("tool") == "startup_checklist"
        assert d.get("tool_label") == "First-Year Startup Checklist"
        md = d.get("markdown") or ""
        assert isinstance(md, str)
        assert len(md) >= 500, f"markdown too short: {len(md)}"
        # Disclaimer present (verbatim phrase from DISCLAIMER constant)
        assert "Draft document — review with a qualified professional." in md, \
            "legal disclaimer missing from markdown"

    def test_generate_break_even_has_numbers(self, session):
        payload = {
            "tool": "break_even",
            "inputs": {
                "fixed_costs_monthly": "1500",
                "avg_unit_price": "80",
                "avg_unit_variable_cost": "20",
            },
        }
        r = session.post(f"{BB}/generate", json=payload, timeout=GEN_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        md = d.get("markdown") or ""
        assert len(md) >= 200
        # Either a $ sign or a digit must appear → confirms LLM produced quantitative content
        assert ("$" in md) or bool(re.search(r"\d", md)), "no numbers / $ in break-even output"

    def test_generate_unknown_tool_returns_400(self, session):
        r = session.post(
            f"{BB}/generate",
            json={"tool": "definitely_not_a_tool", "inputs": {}},
            timeout=15,
        )
        assert r.status_code == 400, r.text
        d = r.json()
        # FastAPI default error shape
        assert "detail" in d
        assert "Unknown tool" in d["detail"]
