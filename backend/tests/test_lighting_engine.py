"""
Tests for /api/lighting/* — CreatorBoostAI Lighting Upgrade Engine (Iter 21)
"""
import os
import re

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api/lighting"

ACTION_ID_RE = re.compile(r"^CBLU-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")
WE_RE = re.compile(r"^WE-[A-F0-9]{8}$")
CN_RE = re.compile(r"^CN-[A-F0-9]{8}$")

DEFAULT_PROPOSAL = {
    "email": "cfo@example.com",
    "company": "Acme",
    "contact_name": "Jane",
    "location_label": "Store 1142",
    "sqft": 48000,
    "fixture_count": 420,
    "operating_hours_per_day": 18,
    "operating_days_per_year": 363,
    "energy_cost_per_kwh": 0.16,
    "annual_maintenance_cost": 24000,
    "sku": "KL-LP-60",
    "deal_structure": "subscription",
    "term_months": 60,
    "current_avg_watts": 120,
}


# ---------- Catalog ----------
class TestSkus:
    def test_skus_list(self):
        r = requests.get(f"{API}/skus", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["manufacturer"] == "Koollite"
        assert d["role"] == "manufacturer_supplier_only"
        skus = d["skus"]
        ids = {s["sku"] for s in skus}
        assert ids == {"KL-HB-150", "KL-LP-60", "KL-RC-22", "KL-CN-200"}
        for s in skus:
            for f in ("sku", "name", "lumens", "watts", "lifetime_hours", "warranty_years", "unit_cost"):
                assert f in s, f"missing field {f} in {s['sku']}"


# ---------- Proposal CRUD + financials ----------
class TestProposal:
    def test_create_subscription_proposal(self):
        r = requests.post(f"{API}/proposal", json=DEFAULT_PROPOSAL, timeout=15)
        assert r.status_code == 201, r.text
        d = r.json()
        assert ACTION_ID_RE.match(d["action_id"]), d["action_id"]
        # Financial sanity
        assert d["fixture_subtotal"] == round(420 * 142.0, 2)
        assert d["contractor_install_estimate"] == round(d["fixture_subtotal"] * 0.22, 2)
        assert d["total_project_cost"] == round(d["fixture_subtotal"] + d["contractor_install_estimate"], 2)
        assert d["annual_kwh_before"] > d["annual_kwh_after"]
        assert d["annual_kwh_saved"] == round(d["annual_kwh_before"] - d["annual_kwh_after"], 1)
        assert d["annual_maintenance_savings"] == round(24000 * 0.85, 2)
        assert d["annual_total_savings"] == round(d["annual_energy_savings"] + d["annual_maintenance_savings"], 2)
        assert d["deal_structure"] == "subscription"
        assert d["monthly_payment"] is not None
        assert d["annual_payment"] is not None
        assert d["payback_period_years"] > 0
        pytest.action_id = d["action_id"]

    def test_create_purchase_proposal_cashflow(self):
        payload = {**DEFAULT_PROPOSAL, "deal_structure": "purchase"}
        r = requests.post(f"{API}/proposal", json=payload, timeout=15)
        assert r.status_code == 201
        d = r.json()
        assert d["deal_structure"] == "purchase"
        assert d["monthly_payment"] is None
        assert d["annual_payment"] is None
        assert d["net_annual_cash_flow"] == d["annual_total_savings"]

    def test_invalid_deal_structure(self):
        payload = {**DEFAULT_PROPOSAL, "deal_structure": "lease"}
        r = requests.post(f"{API}/proposal", json=payload, timeout=15)
        # Pydantic may catch with 422 — module raises 400; either is acceptable rejection
        assert r.status_code in (400, 422), r.text

    def test_unknown_sku(self):
        payload = {**DEFAULT_PROPOSAL, "sku": "KL-XX-999"}
        r = requests.post(f"{API}/proposal", json=payload, timeout=15)
        assert r.status_code == 404

    def test_missing_required_fields(self):
        bad = {k: v for k, v in DEFAULT_PROPOSAL.items() if k not in ("email", "sqft", "fixture_count")}
        r = requests.post(f"{API}/proposal", json=bad, timeout=15)
        assert r.status_code == 422

    def test_get_proposal(self):
        aid = getattr(pytest, "action_id", None)
        if not aid:
            pytest.skip("no action_id from previous test")
        r = requests.get(f"{API}/proposal/{aid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["action_id"] == aid

    def test_get_proposal_404(self):
        r = requests.get(f"{API}/proposal/CBLU-XXXX-YYYY", timeout=15)
        assert r.status_code == 404

    def test_approve_proposal(self):
        aid = getattr(pytest, "action_id", None)
        if not aid:
            pytest.skip("no action_id")
        r = requests.post(f"{API}/proposal/{aid}/approve", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "approved"
        assert "approved_at" in d
        # Verify persistence
        g = requests.get(f"{API}/proposal/{aid}", timeout=15).json()
        assert g["status"] == "approved"


# ---------- Portfolio ----------
class TestPortfolio:
    def test_portfolio_rollup(self):
        r = requests.get(f"{API}/portfolio", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "national" in d and "regions" in d
        assert len(d["regions"]) == 6
        names = {r["region"] for r in d["regions"]}
        assert names == {"Northeast", "Southeast", "Midwest", "South Central", "West", "Pacific NW"}
        for f in ("stores", "fixtures", "annual_savings", "annual_payment_estimate", "net_annual_cash_flow"):
            assert f in d["national"]
        assert "recent_projects" in d


# ---------- Warranty + contractor neutrality ----------
class TestWarranty:
    def test_warranty_event_create_and_notify(self):
        aid = getattr(pytest, "action_id", None)
        if not aid:
            pytest.skip("no action_id")
        # warranty event
        we = requests.post(f"{API}/warranty-event", json={
            "action_id": aid,
            "location_label": "Store 1142",
            "fixture_sku": "KL-LP-60",
            "failure_type": "driver_failure",
            "notes": "two units flickering",
        }, timeout=15)
        assert we.status_code == 201, we.text
        ev = we.json()
        assert WE_RE.match(ev["event_id"]), ev["event_id"]
        pytest.event_id = ev["event_id"]

        # warranty event with bad action id
        bad = requests.post(f"{API}/warranty-event", json={
            "action_id": "CBLU-XXXX-YYYY",
            "location_label": "x",
            "fixture_sku": "KL-LP-60",
            "failure_type": "other",
        }, timeout=15)
        assert bad.status_code == 404

        # warranty event with bad sku
        bad2 = requests.post(f"{API}/warranty-event", json={
            "action_id": aid,
            "location_label": "Store",
            "fixture_sku": "KL-XX-999",
            "failure_type": "other",
        }, timeout=15)
        assert bad2.status_code == 404

        # contractor notification linked
        n = requests.post(f"{API}/notify-contractor", json={
            "action_id": aid,
            "warranty_event_id": ev["event_id"],
            "customer_contractor_name": "Mike's Electric",
            "customer_contractor_email": "mike@example.com",
        }, timeout=15)
        assert n.status_code == 201, n.text
        nd = n.json()
        assert CN_RE.match(nd["notification_id"]), nd["notification_id"]
        assert nd["neutrality_disclaimer"]
        assert "does not perform" in nd["neutrality_disclaimer"].lower()

        # event should be updated
        events = requests.get(f"{API}/warranty-events", params={"action_id": aid}, timeout=15).json()
        match = [e for e in events if e["event_id"] == ev["event_id"]]
        assert match and match[0]["status"] == "routed_to_contractor"


# ---------- Stats ----------
class TestStats:
    def test_stats(self):
        r = requests.get(f"{API}/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["manufacturer"] == "Koollite"
        assert d["execution_layer"] == "Customer's existing contractors"
        assert d["intelligence_layer"] == "CreatorBoostAI"
        assert d["total_projects"] >= 1
        assert d["total_warranty_events"] >= 1
