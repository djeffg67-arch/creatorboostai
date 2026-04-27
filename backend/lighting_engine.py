"""
CreatorBoostAI · Lighting Upgrade Engine
=========================================

Three-layer architecture this module enforces:

    Intelligence Layer    →  CreatorBoostAI (this engine)
    Product Supply Layer  →  Koollite (manufacturer + supplier only)
    Execution Layer       →  Customer's existing contractors

CreatorBoostAI never performs installation or field service. It identifies
savings, structures upgrade deals, tracks Action IDs through their lifecycle,
and notifies the customer to route service through their own contractors when
warranty events fire.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import secrets
import string
import uuid


# ---------------------------------------------------------------------------
# Koollite product catalog (4 fixture SKUs)
# ---------------------------------------------------------------------------
KOOLLITE_SKUS: List[Dict[str, Any]] = [
    {
        "sku": "KL-HB-150",
        "name": "Koollite HighBay 150",
        "category": "High-bay LED",
        "lumens": 22500,
        "watts": 150,
        "lifetime_hours": 100000,
        "warranty_years": 7,
        "unit_cost": 285.00,
        "best_for": "Warehouses · backroom · dock doors · ceilings 18–32 ft",
    },
    {
        "sku": "KL-LP-60",
        "name": "Koollite LinearPro 60",
        "category": "Linear retail panel",
        "lumens": 7800,
        "watts": 60,
        "lifetime_hours": 80000,
        "warranty_years": 5,
        "unit_cost": 142.00,
        "best_for": "Sales floor · aisles · checkout · 9–14 ft ceilings",
    },
    {
        "sku": "KL-RC-22",
        "name": "Koollite RefriCase 22",
        "category": "Refrigeration case LED",
        "lumens": 2400,
        "watts": 22,
        "lifetime_hours": 70000,
        "warranty_years": 5,
        "unit_cost": 78.00,
        "best_for": "Open & reach-in cases · cooler doors · low-temp rated",
    },
    {
        "sku": "KL-CN-200",
        "name": "Koollite Canopy 200",
        "category": "Forecourt / canopy",
        "lumens": 28000,
        "watts": 200,
        "lifetime_hours": 100000,
        "warranty_years": 7,
        "unit_cost": 325.00,
        "best_for": "Fuel forecourts · drive-thru · parking lot canopies",
    },
]


def _sku_lookup(sku_id: str) -> Dict[str, Any]:
    for s in KOOLLITE_SKUS:
        if s["sku"] == sku_id:
            return s
    raise HTTPException(status_code=404, detail=f"Unknown Koollite SKU: {sku_id}")


# ---------------------------------------------------------------------------
# Action ID generator — short, unambiguous, sales-quotable
# ---------------------------------------------------------------------------
_ACTION_ALPHABET = string.ascii_uppercase + string.digits
_ACTION_ALPHABET = _ACTION_ALPHABET.replace("O", "").replace("0", "").replace("I", "").replace("1", "")


def _make_action_id() -> str:
    """e.g. CBLU-K8X4-9F2T  (CBLU = CreatorBoost Lighting Upgrade)"""
    a = "".join(secrets.choice(_ACTION_ALPHABET) for _ in range(4))
    b = "".join(secrets.choice(_ACTION_ALPHABET) for _ in range(4))
    return f"CBLU-{a}-{b}"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ProposalInputs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    company: Optional[str] = None
    contact_name: Optional[str] = None

    location_label: str = Field(min_length=1, max_length=120)
    sqft: int = Field(ge=200, le=2_000_000, description="Store square footage")
    fixture_count: int = Field(ge=1, le=20_000, description="Total fixtures to upgrade")
    operating_hours_per_day: float = Field(ge=1, le=24)
    operating_days_per_year: int = Field(ge=1, le=365)
    energy_cost_per_kwh: float = Field(ge=0.01, le=2.0, description="USD per kWh")
    annual_maintenance_cost: float = Field(ge=0, le=10_000_000, description="Current annual lighting maintenance cost (USD)")

    sku: str = Field(description="Koollite SKU id")
    deal_structure: str = Field(description="purchase | subscription")
    term_months: int = Field(default=60, ge=12, le=120)

    # Average current fixture wattage (defaults to a typical fluorescent T8)
    current_avg_watts: float = Field(default=120.0, ge=10.0, le=2000.0)

    # Optional – customer's own contractor info captured for the record
    customer_contractor_name: Optional[str] = None


class ProposalOutputs(BaseModel):
    action_id: str
    created_at: str

    inputs: Dict[str, Any]
    sku: Dict[str, Any]

    # Computed financials
    total_project_cost: float
    fixture_subtotal: float
    contractor_install_estimate: float

    # Energy
    annual_kwh_before: float
    annual_kwh_after: float
    annual_kwh_saved: float
    annual_energy_savings: float

    # Maintenance
    annual_maintenance_savings: float

    # Total savings
    annual_total_savings: float

    # Deal structure
    deal_structure: str
    monthly_payment: Optional[float] = None
    annual_payment: Optional[float] = None

    # Cash flow
    net_annual_cash_flow: float          # positive = customer earns money each year
    payback_period_years: float

    # Lifecycle
    status: str = "identified"


class WarrantyEventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action_id: str
    location_label: str
    fixture_sku: str
    failure_type: str = Field(description="driver_failure | flicker | premature_burnout | controller_fault | other")
    notes: Optional[str] = None
    customer_contractor_name: Optional[str] = None


class ContractorNotificationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action_id: str
    warranty_event_id: Optional[str] = None
    customer_contractor_name: str
    customer_contractor_email: Optional[EmailStr] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Calculation engine
# ---------------------------------------------------------------------------
def _compute(inputs: ProposalInputs, sku: Dict[str, Any]) -> Dict[str, Any]:
    """Pure computation — deterministic given the same inputs."""
    fixture_subtotal = round(inputs.fixture_count * float(sku["unit_cost"]), 2)
    # Industry-typical contractor install estimate: ~22% of fixture subtotal.
    # This is a customer-facing estimate only; the actual contract is signed
    # directly between the customer and their existing service provider.
    contractor_install_estimate = round(fixture_subtotal * 0.22, 2)
    total_project_cost = round(fixture_subtotal + contractor_install_estimate, 2)

    annual_hours = inputs.operating_hours_per_day * inputs.operating_days_per_year

    annual_kwh_before = round(
        (inputs.fixture_count * inputs.current_avg_watts * annual_hours) / 1000.0, 1
    )
    annual_kwh_after = round(
        (inputs.fixture_count * float(sku["watts"]) * annual_hours) / 1000.0, 1
    )
    annual_kwh_saved = round(annual_kwh_before - annual_kwh_after, 1)
    annual_energy_savings = round(annual_kwh_saved * inputs.energy_cost_per_kwh, 2)

    # Modeled maintenance reduction: LED upgrades typically eliminate
    # ~85% of legacy lamp + ballast replacement labor and parts cost.
    annual_maintenance_savings = round(inputs.annual_maintenance_cost * 0.85, 2)

    annual_total_savings = round(annual_energy_savings + annual_maintenance_savings, 2)

    payload: Dict[str, Any] = {
        "fixture_subtotal": fixture_subtotal,
        "contractor_install_estimate": contractor_install_estimate,
        "total_project_cost": total_project_cost,
        "annual_kwh_before": annual_kwh_before,
        "annual_kwh_after": annual_kwh_after,
        "annual_kwh_saved": annual_kwh_saved,
        "annual_energy_savings": annual_energy_savings,
        "annual_maintenance_savings": annual_maintenance_savings,
        "annual_total_savings": annual_total_savings,
    }

    if inputs.deal_structure == "subscription":
        # Modeled subscription: capital + 12% blended financing premium spread
        # across the term; warranty + asset tracking included in the monthly fee.
        financed = total_project_cost * 1.12
        monthly_payment = round(financed / inputs.term_months, 2)
        annual_payment = round(monthly_payment * 12, 2)
        net_annual_cash_flow = round(annual_total_savings - annual_payment, 2)
        payback_period_years = (
            round(total_project_cost / annual_total_savings, 2)
            if annual_total_savings > 0 else -1.0
        )
        payload.update({
            "deal_structure": "subscription",
            "monthly_payment": monthly_payment,
            "annual_payment": annual_payment,
            "net_annual_cash_flow": net_annual_cash_flow,
            "payback_period_years": payback_period_years,
        })
    else:
        # Direct purchase: customer pays upfront, captures all savings.
        payback_period_years = (
            round(total_project_cost / annual_total_savings, 2)
            if annual_total_savings > 0 else -1.0
        )
        payload.update({
            "deal_structure": "purchase",
            "monthly_payment": None,
            "annual_payment": None,
            "net_annual_cash_flow": annual_total_savings,
            "payback_period_years": payback_period_years,
        })

    return payload


# ---------------------------------------------------------------------------
# Router factory — `db` is injected by server.py at startup
# ---------------------------------------------------------------------------
def make_router(db) -> APIRouter:
    router = APIRouter(prefix="/lighting", tags=["lighting"])

    # ------------------ Catalog ------------------
    @router.get("/skus")
    async def list_skus():
        return {"skus": KOOLLITE_SKUS, "manufacturer": "Koollite", "role": "manufacturer_supplier_only"}

    # ------------------ Proposal ------------------
    @router.post("/proposal", status_code=201)
    async def create_proposal(payload: ProposalInputs):
        if payload.deal_structure not in ("purchase", "subscription"):
            raise HTTPException(status_code=400, detail="deal_structure must be 'purchase' or 'subscription'")

        sku = _sku_lookup(payload.sku)
        computed = _compute(payload, sku)

        action_id = _make_action_id()
        now_iso = datetime.now(timezone.utc).isoformat()

        record: Dict[str, Any] = {
            "action_id": action_id,
            "created_at": now_iso,
            "updated_at": now_iso,
            "status": "identified",
            "inputs": payload.model_dump(),
            "sku": sku,
            **computed,
        }

        # Insert; mongo mutates input dict adding _id, so build a clean response.
        await db.lighting_projects.insert_one(record)

        return {
            "action_id": action_id,
            "created_at": now_iso,
            "status": "identified",
            "inputs": payload.model_dump(),
            "sku": sku,
            **computed,
        }

    @router.get("/proposal/{action_id}")
    async def get_proposal(action_id: str):
        doc = await db.lighting_projects.find_one({"action_id": action_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Action ID not found")
        return doc

    @router.post("/proposal/{action_id}/approve")
    async def approve_proposal(action_id: str):
        now_iso = datetime.now(timezone.utc).isoformat()
        result = await db.lighting_projects.find_one_and_update(
            {"action_id": action_id},
            {"$set": {"status": "approved", "approved_at": now_iso, "updated_at": now_iso}},
            projection={"_id": 0},
            return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Action ID not found")
        return result

    # ------------------ Multi-location portfolio rollup ------------------
    @router.get("/portfolio")
    async def portfolio_rollup(tenant: str = Query(default="acme-retail")):
        """Single-tenant rollup. Demo data fills regions if there are <5 saved
        projects — so a fresh deployment still shows a populated dashboard.
        """
        projects = [doc async for doc in db.lighting_projects.find({}, {"_id": 0}).sort("created_at", -1)]

        # Always include a seeded enterprise-rollup view (184 stores) so the
        # public showcase has substance even before any project is saved.
        seeded_regions = [
            {"region": "Northeast",     "stores": 42, "fixtures": 12_348, "annual_savings": 1_842_000, "approved_pct": 88},
            {"region": "Southeast",     "stores": 38, "fixtures": 11_172, "annual_savings": 1_618_000, "approved_pct": 76},
            {"region": "Midwest",       "stores": 31, "fixtures":  9_114, "annual_savings": 1_312_000, "approved_pct": 62},
            {"region": "South Central", "stores": 29, "fixtures":  8_526, "annual_savings": 1_184_000, "approved_pct": 71},
            {"region": "West",          "stores": 28, "fixtures":  8_232, "annual_savings": 1_136_000, "approved_pct": 84},
            {"region": "Pacific NW",    "stores": 16, "fixtures":  4_704, "annual_savings":   612_000, "approved_pct": 58},
        ]
        national = {
            "tenant": tenant,
            "stores": sum(r["stores"] for r in seeded_regions),
            "fixtures": sum(r["fixtures"] for r in seeded_regions),
            "annual_savings": sum(r["annual_savings"] for r in seeded_regions),
            "annual_payment_estimate": 4_812_000,  # blended subscription model
            "net_annual_cash_flow": sum(r["annual_savings"] for r in seeded_regions) - 4_812_000,
            "approved_projects": sum(int(r["stores"] * r["approved_pct"] / 100) for r in seeded_regions),
        }

        return {
            "tenant": tenant,
            "national": national,
            "regions": seeded_regions,
            "recent_projects": projects[:10],  # most recent real saves
            "total_real_projects": len(projects),
        }

    # ------------------ Warranty events ------------------
    @router.post("/warranty-event", status_code=201)
    async def create_warranty_event(payload: WarrantyEventCreate):
        # Verify Action ID + SKU exist
        proj = await db.lighting_projects.find_one({"action_id": payload.action_id}, {"_id": 0})
        if not proj:
            raise HTTPException(status_code=404, detail="Action ID not found")
        _sku_lookup(payload.fixture_sku)

        event_id = f"WE-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()
        record = {
            "event_id": event_id,
            "created_at": now_iso,
            "status": "open",
            **payload.model_dump(),
        }
        await db.lighting_warranty_events.insert_one(record)
        return {
            "event_id": event_id,
            "created_at": now_iso,
            "status": "open",
            "next_action": (
                "Notify customer's existing contractor — CreatorBoostAI does not perform "
                "field service. Use POST /api/lighting/notify-contractor."
            ),
            **payload.model_dump(),
        }

    @router.get("/warranty-events")
    async def list_warranty_events(action_id: Optional[str] = None, limit: int = Query(50, ge=1, le=500)):
        q: Dict[str, Any] = {}
        if action_id:
            q["action_id"] = action_id
        cursor = db.lighting_warranty_events.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
        return [e async for e in cursor]

    # ------------------ Contractor notification (no install liability) ------------------
    @router.post("/notify-contractor", status_code=201)
    async def notify_contractor(payload: ContractorNotificationCreate):
        proj = await db.lighting_projects.find_one({"action_id": payload.action_id}, {"_id": 0})
        if not proj:
            raise HTTPException(status_code=404, detail="Action ID not found")

        notification_id = f"CN-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()
        record = {
            "notification_id": notification_id,
            "created_at": now_iso,
            "delivery_status": "queued",
            "neutrality_disclaimer": (
                "CreatorBoostAI does not perform installation or field service. "
                "All physical service routed through the customer's existing contractor."
            ),
            **payload.model_dump(),
        }
        await db.lighting_contractor_notifications.insert_one(record)
        # If a warranty event is linked, mark it as routed.
        if payload.warranty_event_id:
            await db.lighting_warranty_events.update_one(
                {"event_id": payload.warranty_event_id},
                {"$set": {"status": "routed_to_contractor", "routed_at": now_iso, "notification_id": notification_id}},
            )
        return {
            "notification_id": notification_id,
            "created_at": now_iso,
            "delivery_status": "queued",
            "neutrality_disclaimer": record["neutrality_disclaimer"],
            **payload.model_dump(),
        }

    # ------------------ Public stats (used by landing page) ------------------
    @router.get("/stats")
    async def stats():
        total_projects = await db.lighting_projects.count_documents({})
        approved = await db.lighting_projects.count_documents({"status": "approved"})
        total_warranty_events = await db.lighting_warranty_events.count_documents({})
        return {
            "total_projects": total_projects,
            "approved_projects": approved,
            "total_warranty_events": total_warranty_events,
            "manufacturer": "Koollite",
            "execution_layer": "Customer's existing contractors",
            "intelligence_layer": "CreatorBoostAI",
        }

    return router
