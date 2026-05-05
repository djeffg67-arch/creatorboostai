"""Start Engine · First-login activation flow (Iter 54)

Endpoints under /api/start-engine:
  - POST /status         — does this user need onboarding?
  - POST /path-leads     — Path 1: generate 10-25 internal seed leads, assigned + locked
  - POST /path-import    — Path 2: just flips onboarding_complete; UI routes to /portal/ops?mode=import
  - POST /path-explore   — Path 3: just flips onboarding_complete; UI routes to /portal/ops?mode=demo
  - POST /complete       — manual flag flip (rarely used)
  - POST /reset          — founder-only · re-arm onboarding for a user (testing)

Plan-limit awareness — when a user has a `plan_tier` from a Stripe webhook, the
generated lead count and downstream caps respect the plan table:
  startup_starter   →  10 leads, 10 emails/day,  no follow-ups, no multi-sender, no hot-lead
  startup_growth    →  25 leads, 25 emails/day,  follow-ups, no multi-sender, no hot-lead
  startup_pro       →  50 leads, 50 emails/day,  follow-ups, multi-sender, hot-lead
  starter           →  50 leads, 50 emails/day,  full
  growth            → 100 leads,100 emails/day,  full
  team / enterprise → 200 leads,200 emails/day,  full
  default (no plan) →  10 leads, 10 emails/day,  follow-ups
"""
from __future__ import annotations

import os
import uuid
import random
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

log = logging.getLogger("start_engine")


PLAN_LIMITS = {
    "startup_starter":  {"lead_generation_limit_daily": 10,  "emails_per_day": 10,  "follow_up_enabled": False, "multi_sender_enabled": False, "hot_lead_enabled": False},
    "startup_growth":   {"lead_generation_limit_daily": 25,  "emails_per_day": 25,  "follow_up_enabled": True,  "multi_sender_enabled": False, "hot_lead_enabled": False},
    "startup_pro":      {"lead_generation_limit_daily": 50,  "emails_per_day": 50,  "follow_up_enabled": True,  "multi_sender_enabled": True,  "hot_lead_enabled": True},
    "starter":          {"lead_generation_limit_daily": 50,  "emails_per_day": 50,  "follow_up_enabled": True,  "multi_sender_enabled": True,  "hot_lead_enabled": True},
    "growth":           {"lead_generation_limit_daily": 100, "emails_per_day": 100, "follow_up_enabled": True,  "multi_sender_enabled": True,  "hot_lead_enabled": True},
    "team":             {"lead_generation_limit_daily": 200, "emails_per_day": 200, "follow_up_enabled": True,  "multi_sender_enabled": True,  "hot_lead_enabled": True},
}
DEFAULT_LIMITS = {"lead_generation_limit_daily": 10, "emails_per_day": 10, "follow_up_enabled": True, "multi_sender_enabled": False, "hot_lead_enabled": False}


def get_plan_limits(plan_tier: Optional[str]) -> Dict[str, Any]:
    return PLAN_LIMITS.get((plan_tier or "").lower(), DEFAULT_LIMITS)


# Synthetic seed-lead pool — deliberate `.example.com` RFC-2606 domains so the
# outbound engine simulates sends and never hits real inboxes during onboarding.
_SEED_INDUSTRIES = [
    ("realtor",            "Real Estate"),
    ("insurance_agent",    "Insurance"),
    ("contractor_service", "Contractor"),
    ("supermarket_grocery","Supermarket"),
    ("c_store",            "C-Store"),
    ("sales_team_agency",  "Sales Team"),
]
_SEED_NAMES = ["Avery Park", "Jordan Lee", "Riley Chen", "Casey Brooks", "Morgan Reed",
               "Quinn Walker", "Drew Patel", "Skyler Hayes", "Sage Bennett", "Rowan Diaz",
               "Emerson Cole", "Hayden Ross", "Devon Cruz", "Reese Mitchell", "Logan Park"]
_SEED_COMPANY_TYPES = {
    "realtor":            ["Realty Group", "Brokers", "Properties LLC", "Real Estate"],
    "insurance_agent":    ["Insurance Agency", "Risk Group", "Coverage LLC"],
    "contractor_service": ["Contractors", "Plumbing & HVAC", "Electrical Services"],
    "supermarket_grocery":["Fresh Markets", "Grocery Co", "Supermarkets Inc"],
    "c_store":            ["Convenience Stores", "Quick Mart", "Market Express"],
    "sales_team_agency":  ["Sales Agency", "Growth Partners", "Revenue Group"],
}
_SEED_CITIES = ["Austin TX", "Dallas TX", "Houston TX", "Atlanta GA", "Charlotte NC",
                "Nashville TN", "Miami FL", "Phoenix AZ", "Denver CO", "Portland OR"]


def _make_seed_lead(idx: int, user_email: str) -> Dict[str, Any]:
    industry, label = random.choice(_SEED_INDUSTRIES)
    suffix = random.choice(_SEED_COMPANY_TYPES[industry])
    name = random.choice(_SEED_NAMES)
    last = name.split(" ")[-1].lower()
    company = f"{name.split(' ')[0]} {suffix}"
    domain_slug = f"{last}{random.randint(10, 999)}.example.com"
    return {
        "name": name,
        "first_name": name.split(" ")[0],
        "last_name": name.split(" ")[1] if " " in name else "",
        "email": f"{last}@{domain_slug}",
        "company": company,
        "industry": industry,
        "industry_tag": industry,
        "location": random.choice(_SEED_CITIES),
        "title": "Owner / Operator",
        "source": "internal_seed",
        "import_method": "start_engine",
        "imported_by": user_email,
        "assigned_to_user_id": user_email,
        "status": "new",
    }


# ──────────────── REQUEST MODELS ────────────────
class _Auth(BaseModel):
    email: str
    token: str


class PathRequest(_Auth):
    surface: Optional[str] = None


class ResetRequest(_Auth):
    target_email: str


# ──────────────── ROUTER ────────────────
def make_start_engine_router(db, require_any_role, require_founder=None) -> APIRouter:
    router = APIRouter(prefix="/api/start-engine", tags=["start-engine"])

    async def _set_complete(user_email: str, path: str) -> None:
        now_s = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"email": user_email},
            {"$set": {
                "onboarding_complete": True,
                "onboarding_path": path,
                "onboarding_completed_at": now_s,
                "updated_at": now_s,
            }},
        )

    @router.post("/status")
    async def status(payload: _Auth):
        user = await require_any_role(payload)
        return {
            "ok": True,
            "onboarding_complete": bool(user.get("onboarding_complete")),
            "onboarding_path": user.get("onboarding_path"),
            "plan_tier": user.get("plan_tier"),
            "plan_limits": get_plan_limits(user.get("plan_tier")),
        }

    @router.post("/path-leads")
    async def path_leads(payload: PathRequest):
        """PATH 1 · Generate starter leads and assign them to the user.

        Lead count is plan-aware: Starter Launch 10, Growth Launch 25,
        Pro Launch / Starter 50, Growth/Team 100, no plan → 10.
        Each lead lands in `leads_registry` LOCKED to the user.
        """
        user = await require_any_role(payload)
        limits = get_plan_limits(user.get("plan_tier"))
        target_count = max(10, min(int(limits["lead_generation_limit_daily"]), 50))

        # Build leads & insert via the lead_registry helper for proper dedup.
        from lead_registry import upsert_lead
        added: List[str] = []
        skipped = 0
        for i in range(target_count):
            seed = _make_seed_lead(i, user["email"])
            try:
                r = await upsert_lead(db, seed)
                if r["is_new"]:
                    added.append(r["lead"]["lead_id"])
                else:
                    skipped += 1
            except Exception as e:
                log.error(f"path_leads upsert failed: {e}")
                skipped += 1

        # Track tracking fields per spec
        now_s = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"email": user["email"]},
            {"$set": {
                "first_lead_generated_at": now_s,
                "onboarding_target_lead_count": target_count,
                "onboarding_added_leads": len(added),
            }},
        )
        await _set_complete(user["email"], "leads")

        # Trigger an autopilot tick so the user sees activity within minutes.
        autopilot_dispatched = False
        try:
            import outbound as ob
            import asyncio
            helpers = list(ob._AUTOPILOT_HELPERS.values())
            if helpers:
                asyncio.create_task(helpers[0](trigger="start_engine"))
                autopilot_dispatched = True
        except Exception as e:
            log.error(f"path_leads autopilot trigger failed: {e}")

        # Audit
        await db.start_engine_runs.insert_one({
            "id": str(uuid.uuid4()),
            "user_email": user["email"],
            "path": "leads",
            "target_count": target_count,
            "added": len(added),
            "skipped": skipped,
            "autopilot_dispatched": autopilot_dispatched,
            "plan_tier": user.get("plan_tier"),
            "created_at": now_s,
        })

        return {
            "ok": True,
            "path": "leads",
            "target_count": target_count,
            "added": len(added),
            "skipped": skipped,
            "autopilot_dispatched": autopilot_dispatched,
            "redirect": "/portal/ops?mode=autopilot_ready",
        }

    @router.post("/path-import")
    async def path_import(payload: PathRequest):
        user = await require_any_role(payload)
        await _set_complete(user["email"], "import")
        await db.start_engine_runs.insert_one({
            "id": str(uuid.uuid4()),
            "user_email": user["email"],
            "path": "import",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"ok": True, "path": "import", "redirect": "/portal/ops?mode=import"}

    @router.post("/path-explore")
    async def path_explore(payload: PathRequest):
        user = await require_any_role(payload)
        await _set_complete(user["email"], "explore")
        await db.start_engine_runs.insert_one({
            "id": str(uuid.uuid4()),
            "user_email": user["email"],
            "path": "explore",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"ok": True, "path": "explore", "redirect": "/portal/ops?mode=demo"}

    @router.post("/complete")
    async def complete(payload: _Auth):
        user = await require_any_role(payload)
        await _set_complete(user["email"], user.get("onboarding_path") or "manual")
        return {"ok": True}

    @router.post("/reset")
    async def reset(payload: ResetRequest):
        if not require_founder:
            raise HTTPException(403, "Founder-only")
        await require_founder(_Auth(email=payload.email, token=payload.token))
        target = (payload.target_email or "").strip().lower()
        if not target:
            raise HTTPException(400, "target_email required")
        await db.users.update_one(
            {"email": target},
            {"$set": {
                "onboarding_complete": False,
                "onboarding_path": None,
                "onboarding_completed_at": None,
            }},
        )
        return {"ok": True, "reset_for": target}

    return router


__all__ = ["make_start_engine_router", "get_plan_limits", "PLAN_LIMITS"]
