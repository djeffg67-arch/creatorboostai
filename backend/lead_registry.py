"""Lead Registry · Single-Tenant Foundation (Iter 50)

Implements the foundation of Jeffrey's "exclusive ownership" architecture:
  - Master `leads_registry` collection
  - Deduplication (email + phone + company+location similarity)
  - Locking (LOCKED / AVAILABLE / EXPIRED)
  - Distribution (atomic claim + lock)
  - Reassignment (auto-expire after N days of inactivity)

This iteration is intentionally single-tenant: every lead is owned by Jeffrey
unless explicitly assigned. Multi-tenant company/independent/hybrid +
commission attribution + credit system land in the next iteration.

Schema (`leads_registry`):
  {
    lead_id (UUID),
    name, company, email, phone, industry_tag, location, source,
    status,                           # new / contacted / qualified / hot / won / lost
    assigned_to_user_id,              # email of the rep / company-rep / founder
    assigned_to_company_id,           # nullable (independent reps don't have one)
    assigned_timestamp,
    lock_status,                      # LOCKED | AVAILABLE | EXPIRED
    last_activity_at,                 # bumped on email/click/reply/note
    created_at, updated_at,
    source_outbound_prospect_id,      # back-link when sourced from outbound engine
    source_demo_capture_id,           # back-link when sourced from demo capture
    dedupe_key,                       # normalized email|phone|company-loc
  }
"""
from __future__ import annotations

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

log = logging.getLogger("lead_registry")

EXPIRY_DAYS_DEFAULT = int(os.environ.get("LEAD_LOCK_EXPIRY_DAYS", "10"))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm_email(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _norm_phone(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"\D+", "", s)[-10:]  # last 10 digits, US-style


def _norm_company_loc(company: Optional[str], location: Optional[str]) -> str:
    c = re.sub(r"[^a-z0-9]", "", (company or "").lower())
    loc = re.sub(r"[^a-z0-9]", "", (location or "").lower())
    if not c:
        return ""
    return f"{c}|{loc}" if loc else c


def _dedupe_keys(payload: Dict[str, Any]) -> List[str]:
    """All keys we'll match against. Lead is a duplicate if ANY hit."""
    keys: List[str] = []
    if email := _norm_email(payload.get("email")):
        keys.append(f"email:{email}")
    if phone := _norm_phone(payload.get("phone")):
        keys.append(f"phone:{phone}")
    if cl := _norm_company_loc(payload.get("company"), payload.get("location")):
        keys.append(f"co:{cl}")
    return keys


async def find_duplicate(db, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return existing lead if email/phone/company-loc matches."""
    keys = _dedupe_keys(payload)
    if not keys:
        return None
    return await db.leads_registry.find_one(
        {"dedupe_keys": {"$in": keys}}, {"_id": 0},
    )


async def upsert_lead(db, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Insert or merge a lead. Idempotent — submitting twice with the same
    email/phone/company-loc won't create a duplicate.

    Returns the canonical lead doc plus `is_new` flag."""
    keys = _dedupe_keys(payload)
    existing = await find_duplicate(db, payload)
    now_s = _now_iso()
    if existing:
        # Merge — fill in any missing fields the new payload provides
        update_set: Dict[str, Any] = {"updated_at": now_s}
        for fld in ("name", "company", "phone", "industry_tag", "location", "source"):
            if payload.get(fld) and not existing.get(fld):
                update_set[fld] = payload[fld]
        # Always merge in any new dedupe keys we hadn't seen
        all_keys = list(set((existing.get("dedupe_keys") or []) + keys))
        update_set["dedupe_keys"] = all_keys
        await db.leads_registry.update_one(
            {"lead_id": existing["lead_id"]}, {"$set": update_set},
        )
        merged = await db.leads_registry.find_one({"lead_id": existing["lead_id"]}, {"_id": 0})
        return {"is_new": False, "lead": merged}

    # New lead — start AVAILABLE so the distribution engine can assign it
    lead = {
        "lead_id": str(uuid.uuid4()),
        "name": payload.get("name"),
        "company": payload.get("company"),
        "email": _norm_email(payload.get("email")) or None,
        "phone": _norm_phone(payload.get("phone")) or None,
        "industry_tag": payload.get("industry_tag"),
        "location": payload.get("location"),
        "source": payload.get("source") or "manual",
        "status": payload.get("status") or "new",
        "assigned_to_user_id": payload.get("assigned_to_user_id"),
        "assigned_to_company_id": payload.get("assigned_to_company_id"),
        "assigned_timestamp": now_s if payload.get("assigned_to_user_id") else None,
        "lock_status": "LOCKED" if payload.get("assigned_to_user_id") else "AVAILABLE",
        "last_activity_at": now_s,
        "source_outbound_prospect_id": payload.get("source_outbound_prospect_id"),
        "source_demo_capture_id": payload.get("source_demo_capture_id"),
        "dedupe_keys": keys,
        "created_at": now_s,
        "updated_at": now_s,
    }
    await db.leads_registry.insert_one(lead)
    return {"is_new": True, "lead": lead}


async def claim_leads(
    db,
    user_id: str,
    *,
    company_id: Optional[str] = None,
    industry_tag: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 25,
) -> List[Dict[str, Any]]:
    """Atomically claim up to `limit` AVAILABLE leads matching the filters.
    Each lead is locked to `user_id`. Returns the list of claimed leads."""
    q: Dict[str, Any] = {"lock_status": "AVAILABLE"}
    if industry_tag:
        q["industry_tag"] = industry_tag
    if location:
        q["location"] = location
    claimed: List[Dict[str, Any]] = []
    for _ in range(max(0, limit)):
        result = await db.leads_registry.find_one_and_update(
            q,
            {"$set": {
                "lock_status": "LOCKED",
                "assigned_to_user_id": user_id,
                "assigned_to_company_id": company_id,
                "assigned_timestamp": _now_iso(),
                "updated_at": _now_iso(),
            }},
            projection={"_id": 0},
            sort=[("created_at", 1)],   # oldest first
            return_document=True,
        )
        if not result:
            break
        # find_one_and_update with return_document=True returns post-update doc
        # but motor < 3.0 requires ReturnDocument.AFTER. Fallback: re-fetch.
        if not result.get("lock_status"):
            result = await db.leads_registry.find_one(
                {"lead_id": result.get("lead_id")}, {"_id": 0},
            )
        claimed.append(result)
    return claimed


async def expire_stale_locks(db, expiry_days: int = EXPIRY_DAYS_DEFAULT) -> int:
    """Reassignment logic: any lead LOCKED with no activity in X days is
    flipped back to AVAILABLE so the pool stays liquid. Returns count flipped."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=expiry_days)).isoformat()
    r = await db.leads_registry.update_many(
        {
            "lock_status": "LOCKED",
            "$or": [
                {"last_activity_at": {"$lte": cutoff}},
                {"assigned_timestamp": {"$lte": cutoff}, "last_activity_at": {"$exists": False}},
            ],
            "status": {"$nin": ["won", "lost"]},
        },
        {"$set": {
            "lock_status": "EXPIRED",
            "assigned_to_user_id": None,
            "assigned_to_company_id": None,
            "expired_at": _now_iso(),
            "updated_at": _now_iso(),
        }},
    )
    # Then flip EXPIRED → AVAILABLE so they re-enter the pool
    r2 = await db.leads_registry.update_many(
        {"lock_status": "EXPIRED"},
        {"$set": {"lock_status": "AVAILABLE", "updated_at": _now_iso()}},
    )
    return r.modified_count + r2.modified_count


async def touch_activity(db, lead_id: str) -> None:
    """Bump `last_activity_at` so the lock doesn't expire."""
    await db.leads_registry.update_one(
        {"lead_id": lead_id},
        {"$set": {"last_activity_at": _now_iso(), "updated_at": _now_iso()}},
    )


async def update_status(db, lead_id: str, status: str) -> None:
    """Move a lead through the pipeline. Bumps activity automatically."""
    await db.leads_registry.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": status, "last_activity_at": _now_iso(), "updated_at": _now_iso()}},
    )


__all__ = [
    "find_duplicate", "upsert_lead", "claim_leads",
    "expire_stale_locks", "touch_activity", "update_status",
]
