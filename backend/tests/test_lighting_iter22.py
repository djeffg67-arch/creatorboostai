"""
Iter 22 — Lighting Upgrade Engine: dual-layer (public + portal) + lifecycle
+ admin endpoints. Tests all newly-added surface area.
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
LAPI = f"{API}/lighting"

ACTION_ID_RE = re.compile(r"^CBLU-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")

FOUNDER_KEY = "jeffrey-2026-bodyiq-founder-master"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "bodyiq-admin-2026")


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def founder():
    r = requests.post(f"{API}/founder/auth", json={"key": FOUNDER_KEY}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "email" in d and "token" in d
    return {"email": d["email"], "token": d["token"]}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def founder_proposal(founder):
    payload = {
        "email": founder["email"],
        "contact_name": "Founder",
        "location_label": "Founder Store Iter22",
        "sqft": 42000,
        "fixture_count": 310,
        "operating_hours_per_day": 16,
        "operating_days_per_year": 360,
        "energy_cost_per_kwh": 0.15,
        "annual_maintenance_cost": 18000,
        "sku": "KL-LP-60",
        "deal_structure": "subscription",
        "term_months": 60,
        "current_avg_watts": 120,
    }
    r = requests.post(f"{LAPI}/proposal", json=payload, timeout=15)
    assert r.status_code == 201, r.text
    return r.json()


# ---------- 1) Koollite 7-yr warranty ----------
class TestKoolliteWarranty7yr:
    def test_all_skus_warranty_seven_years(self):
        r = requests.get(f"{LAPI}/skus", timeout=15)
        assert r.status_code == 200
        skus = r.json()["skus"]
        assert len(skus) == 4
        for s in skus:
            assert s["warranty_years"] == 7, f"{s['sku']} warranty_years={s['warranty_years']}"


# ---------- 2) Proposal creation persists to 3 collections + initial ledger row ----------
class TestProposalPersistence:
    def test_proposal_creates_lifecycle_identified_row(self, founder_proposal):
        aid = founder_proposal["action_id"]
        assert ACTION_ID_RE.match(aid)
        assert founder_proposal.get("owner_email")
        assert founder_proposal.get("tenant")
        # lifecycle ledger should have 1 row with from_state=None to_state=identified
        r = requests.get(f"{LAPI}/proposal/{aid}/lifecycle", timeout=15)
        assert r.status_code == 200
        events = r.json()["events"]
        assert len(events) >= 1
        assert events[0]["from_state"] is None
        assert events[0]["to_state"] == "identified"


# ---------- 3) Approve appends ledger row; lifecycle returns 2 events in order ----------
class TestApproveLifecycle:
    def test_approve_transitions_and_appends_row(self, founder_proposal):
        aid = founder_proposal["action_id"]
        r = requests.post(f"{LAPI}/proposal/{aid}/approve", timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        events = requests.get(f"{LAPI}/proposal/{aid}/lifecycle", timeout=15).json()["events"]
        assert len(events) >= 2
        assert events[0]["to_state"] == "identified"
        assert events[1]["from_state"] == "identified"
        assert events[1]["to_state"] == "approved"


# ---------- 4) Deploy + verify-savings ----------
class TestDeployVerify:
    def test_deploy_then_verify(self, founder_proposal):
        aid = founder_proposal["action_id"]
        r = requests.post(f"{LAPI}/proposal/{aid}/deploy", timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "deployed"

        r2 = requests.post(
            f"{LAPI}/proposal/{aid}/verify-savings",
            params={"verified_annual_savings": 12345},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["status"] == "savings_verified"
        assert float(body["verified_annual_savings"]) == 12345.0

        events = requests.get(f"{LAPI}/proposal/{aid}/lifecycle", timeout=15).json()["events"]
        to_states = [e["to_state"] for e in events]
        # identified → approved → deployed → savings_verified (in order)
        assert to_states[:4] == ["identified", "approved", "deployed", "savings_verified"]


# ---------- 5) Stats ----------
class TestStats:
    def test_stats_has_lifecycle_counts(self):
        r = requests.get(f"{LAPI}/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_projects", "approved_projects", "deployed_projects",
                  "savings_verified_projects", "total_warranty_events"):
            assert k in d
        assert d["total_projects"] >= 1
        assert d["savings_verified_projects"] >= 1


# ---------- 6) Portal endpoints ----------
class TestPortalProjects:
    def test_portal_projects_valid(self, founder, founder_proposal):
        r = requests.post(f"{LAPI}/portal/projects",
                          json={"email": founder["email"], "token": founder["token"]},
                          timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == founder["email"]
        assert "tenant" in d
        assert isinstance(d["projects"], list)
        assert len(d["projects"]) >= 1
        assert isinstance(d["locations"], list)
        rollup = d["rollup"]
        for k in ("total_projects", "total_project_cost", "annual_total_savings",
                  "annual_payment", "net_annual_cash_flow", "by_status"):
            assert k in rollup

    def test_portal_projects_invalid_token(self, founder):
        r = requests.post(f"{LAPI}/portal/projects",
                          json={"email": founder["email"], "token": "BAD_TOKEN_XYZ"},
                          timeout=15)
        assert r.status_code == 401


class TestPortalApprove:
    def test_portal_approve_foreign_action_id(self, founder):
        r = requests.post(f"{LAPI}/portal/approve",
                          json={"email": founder["email"], "token": founder["token"],
                                "action_id": "CBLU-XXXX-YYYY"},
                          timeout=15)
        assert r.status_code == 404

    def test_portal_approve_bad_auth(self, founder_proposal):
        r = requests.post(f"{LAPI}/portal/approve",
                          json={"email": "nobody@example.com", "token": "bad",
                                "action_id": founder_proposal["action_id"]},
                          timeout=15)
        assert r.status_code == 401

    def test_portal_approve_valid(self, founder):
        # Create a fresh proposal owned by the founder and approve via portal
        payload = {
            "email": founder["email"],
            "contact_name": "Founder",
            "location_label": "Founder Store Iter22-B",
            "sqft": 40000,
            "fixture_count": 200,
            "operating_hours_per_day": 14,
            "operating_days_per_year": 360,
            "energy_cost_per_kwh": 0.14,
            "annual_maintenance_cost": 12000,
            "sku": "KL-HB-150",
            "deal_structure": "purchase",
            "term_months": 60,
            "current_avg_watts": 250,
        }
        c = requests.post(f"{LAPI}/proposal", json=payload, timeout=15)
        assert c.status_code == 201, c.text
        aid = c.json()["action_id"]

        r = requests.post(f"{LAPI}/portal/approve",
                          json={"email": founder["email"], "token": founder["token"],
                                "action_id": aid},
                          timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved"


# ---------- 7) Admin endpoints ----------
class TestAdminEndpoints:
    def test_admin_projects_requires_auth(self):
        r = requests.get(f"{LAPI}/admin/projects", timeout=15)
        assert r.status_code == 401

    def test_admin_projects_ok(self, admin_token):
        r = requests.get(f"{LAPI}/admin/projects",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "projects" in d and "summary" in d
        s = d["summary"]
        for k in ("total", "by_status", "total_project_cost", "annual_total_savings"):
            assert k in s

    def test_admin_projects_status_filter(self, admin_token):
        r = requests.get(f"{LAPI}/admin/projects?status=approved",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200
        projects = r.json()["projects"]
        for p in projects:
            assert p["status"] == "approved"

    def test_admin_locations_requires_auth(self):
        r = requests.get(f"{LAPI}/admin/locations", timeout=15)
        assert r.status_code == 401

    def test_admin_locations_ok(self, admin_token):
        r = requests.get(f"{LAPI}/admin/locations",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_lifecycle_requires_auth(self, founder_proposal):
        r = requests.get(f"{LAPI}/admin/lifecycle/{founder_proposal['action_id']}", timeout=15)
        assert r.status_code == 401

    def test_admin_lifecycle_ordered(self, founder_proposal, admin_token):
        aid = founder_proposal["action_id"]
        r = requests.get(f"{LAPI}/admin/lifecycle/{aid}",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200
        events = r.json()
        assert isinstance(events, list)
        assert len(events) >= 2
        # Timestamps ordered ascending
        ts = [e["created_at"] for e in events]
        assert ts == sorted(ts)
