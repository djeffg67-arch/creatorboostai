"""Universal Lead Intake API (Iter 51)

Endpoints (all under /api/leads):
  - POST /import-csv       multipart upload — auto-maps LinkedIn/Hunter/Snov/Lusha
  - POST /add-manual       single-add (paste-from-Lusha or fast form)
  - POST /list             filtered list for the dashboard
  - POST /update-status    move through new/contacted/responded/meeting_set/closed
  - POST /touch            bump last_activity_at when user copies email/clicks LinkedIn
  - POST /release          manually release a lead
  - POST /stats            dashboard summary (counts by status/source/industry)

All endpoints are auth-gated. Founder + executive see all leads; employees
see only leads assigned to them.
"""
from __future__ import annotations

import os
import logging
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

import lead_registry as LR

log = logging.getLogger("leads_router")


class _Auth(BaseModel):
    email: str
    token: str


class LeadFields(BaseModel):
    """Lead data — nested under `lead` in requests so auth.email doesn't shadow lead.email."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    source: str = Field(default="manual", description="LinkedIn / Lusha / Hunter / Snov / manual")


class LeadAddManual(_Auth):
    lead: LeadFields


class LeadList(_Auth):
    source: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    limit: int = 200


class LeadStatusUpdate(_Auth):
    lead_id: str
    status: str


class LeadTouch(_Auth):
    lead_id: str
    type_: str = "activity"           # email_copied / linkedin_opened / note / call_attempt
    note: Optional[str] = None


class LeadRelease(_Auth):
    lead_id: str


def make_leads_router(db, require_auth_any_role) -> APIRouter:
    """`require_auth_any_role(payload)` is an async function from server.py that
    verifies `email + token` against the users table and returns the user dict.
    It must accept any of (founder | executive | employee) — visibility is
    scoped inside each handler based on role."""
    router = APIRouter(prefix="/api/leads", tags=["leads"])

    ELEVATED = {"founder", "executive", "president"}

    def _is_admin(user: Dict[str, Any]) -> bool:
        return (user.get("role") or "").lower() in ELEVATED

    @router.post("/add-manual")
    async def add_manual(payload: LeadAddManual):
        user = await require_auth_any_role(payload)
        body = payload.lead.model_dump()
        body["imported_by"] = user["email"]
        body["assigned_to_user_id"] = user["email"]
        body["import_method"] = "manual"
        if not (body.get("email") or body.get("phone") or (body.get("company") and (body.get("name") or body.get("first_name") or body.get("last_name")))):
            raise HTTPException(400, "Need at least: email · or phone · or (company + name)")
        try:
            r = await LR.upsert_lead(db, body)
        except Exception as e:
            log.error(f"add_manual upsert failed: {e}")
            raise HTTPException(500, f"upsert failed: {e}")
        return {
            "ok": True,
            "is_new": r["is_new"],
            "owned_by_other": r.get("owned_by_other", False),
            "lead": r["lead"],
            "message": (
                "Added — exclusive ownership locked." if r["is_new"]
                else "This lead is already owned by another user." if r.get("owned_by_other")
                else "Already in your registry — merged any new fields."
            ),
        }

    @router.post("/import-csv")
    async def import_csv(
        file: UploadFile = File(...),
        email: str = Form(...),
        token: str = Form(...),
        source: str = Form("manual"),
    ):
        # Manual auth roundtrip because of multipart
        user = await require_auth_any_role(_Auth(email=email, token=token))
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(400, "Upload a .csv file")
        content = await file.read()
        if not content:
            raise HTTPException(400, "Empty file")
        if len(content) > 5_000_000:
            raise HTTPException(413, "File too large (max 5 MB)")
        result = await LR.ingest_csv(
            db, content,
            source=source,
            imported_by=user["email"],
        )
        return result

    @router.post("/list")
    async def list_leads(payload: LeadList):
        user = await require_auth_any_role(payload)
        leads = await LR.list_leads(
            db,
            user_id=user["email"],
            is_admin=_is_admin(user),
            source=payload.source,
            industry=payload.industry,
            status=payload.status,
            assigned_to=payload.assigned_to,
            limit=payload.limit,
        )
        return {"ok": True, "leads": leads, "total": len(leads)}

    @router.post("/update-status")
    async def update_status(payload: LeadStatusUpdate):
        user = await require_auth_any_role(payload)
        if payload.status not in LR.LEAD_STATUSES:
            raise HTTPException(400, f"Invalid status. Allowed: {LR.LEAD_STATUSES}")
        # Ownership check (unless admin)
        lead = await db.leads_registry.find_one({"lead_id": payload.lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(404, "Lead not found")
        if not _is_admin(user) and lead.get("assigned_to_user_id") != user["email"]:
            raise HTTPException(403, "Not your lead")
        await LR.update_status(db, payload.lead_id, payload.status, by=user["email"])
        return {"ok": True}

    @router.post("/touch")
    async def touch(payload: LeadTouch):
        user = await require_auth_any_role(payload)
        lead = await db.leads_registry.find_one({"lead_id": payload.lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(404, "Lead not found")
        if not _is_admin(user) and lead.get("assigned_to_user_id") != user["email"]:
            raise HTTPException(403, "Not your lead")
        await LR.touch_activity(db, payload.lead_id, type_=payload.type_,
                                by=user["email"], note=payload.note)
        return {"ok": True}

    @router.post("/release")
    async def release(payload: LeadRelease):
        user = await require_auth_any_role(payload)
        lead = await db.leads_registry.find_one({"lead_id": payload.lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(404, "Lead not found")
        if not _is_admin(user) and lead.get("assigned_to_user_id") != user["email"]:
            raise HTTPException(403, "Not your lead")
        await LR.release_lead(db, payload.lead_id, by=user["email"])
        return {"ok": True}

    @router.post("/stats")
    async def stats(payload: _Auth):
        user = await require_auth_any_role(payload)
        is_admin = _is_admin(user)
        scope: Dict[str, Any] = {} if is_admin else {"assigned_to_user_id": user["email"]}
        total = await db.leads_registry.count_documents(scope)
        by_status: Dict[str, int] = {}
        for s in LR.LEAD_STATUSES:
            by_status[s] = await db.leads_registry.count_documents({**scope, "status": s})
        # Top sources + industries (simple counts)
        sources = ["LinkedIn", "Lusha", "Hunter", "Snov", "manual", "demo_capture"]
        by_source = {}
        for s in sources:
            by_source[s] = await db.leads_registry.count_documents({**scope, "source": s})
        return {
            "ok": True,
            "scope": "all" if is_admin else "mine",
            "total": total,
            "by_status": by_status,
            "by_source": by_source,
        }

    return router


__all__ = ["make_leads_router"]
