"""
focus_telemetry.py — Iter 96+
--------------------------------------------------------------------
Minimal telemetry surface for the homepage's interactive operator
console. Captures which category filters visitors apply, how long they
stay focused, and which campaigns drove the visit.

Privacy posture:
  · No IP address stored
  · No browser fingerprint
  · No user-agent string
  · UTM params are stored only when explicitly passed by the client
  · This is aggregate behaviour data, not user-identifiable

Endpoints:
  POST /api/public/telemetry/focus       — log a focus event (no auth)
  GET  /api/public/telemetry/focus/summary — daily rollup (no auth)

Schema (focus_telemetry collection):
  {
    _id:           ObjectId (auto),
    category:      "revenue" | "outbound" | "actions" | "alerts" | ...,
    action:        "select" | "clear" | "load_with_focus",
    duration_ms:   int | null,
    utm_source:    str | null,
    utm_campaign:  str | null,
    referrer_host: str | null,        # ONLY hostname, never full URL
    server_time:   ISO8601 string (UTC, Z-suffixed),
  }
"""
from __future__ import annotations
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Body, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

log = logging.getLogger("focus_telemetry")

# Whitelisted category slugs (URL-facing). Anything else is rejected.
ALLOWED_CATEGORIES = frozenset({
    "outbound", "revenue", "ai-actions", "alerts", "appointments", "tasks",
})
ALLOWED_ACTIONS = frozenset({"select", "clear", "load_with_focus"})

# Tight regex so attackers can't inject arbitrary strings via UTM/referrer
SAFE_TOKEN = re.compile(r"^[A-Za-z0-9._\-]{1,64}$")


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _safe_token(v: Optional[str]) -> Optional[str]:
    if not v or not isinstance(v, str):
        return None
    v = v.strip()
    if not v or not SAFE_TOKEN.match(v):
        return None
    return v


def _safe_host(referrer: Optional[str]) -> Optional[str]:
    """Extract just the hostname (no path, no query) from a referrer URL.

    Returns None for unparseable / suspicious values.
    """
    if not referrer or not isinstance(referrer, str):
        return None
    try:
        # urlparse will accept naked hostnames too — fall back gracefully
        u = urlparse(referrer.strip())
        host = (u.hostname or u.path or "").split("/")[0].lower()
        if not host or not SAFE_TOKEN.match(host.replace(".", "")):
            return None
        # cap length to be safe
        return host[:128]
    except Exception:
        return None


class FocusEventIn(BaseModel):
    category: str = Field(..., description="Whitelisted category slug")
    action: str = Field(..., description="select | clear | load_with_focus")
    duration_ms: Optional[int] = Field(None, ge=0, le=24 * 3600 * 1000)
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    referrer: Optional[str] = None  # only the hostname is persisted


def make_focus_telemetry_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/api/public/telemetry", tags=["public-telemetry"])

    @router.post("/focus")
    async def log_focus_event(payload: FocusEventIn = Body(...)) -> Dict[str, Any]:
        if payload.category not in ALLOWED_CATEGORIES:
            raise HTTPException(status_code=400, detail="category not allowed")
        if payload.action not in ALLOWED_ACTIONS:
            raise HTTPException(status_code=400, detail="action not allowed")

        doc = {
            "category":     payload.category,
            "action":       payload.action,
            "duration_ms":  payload.duration_ms,
            "utm_source":   _safe_token(payload.utm_source),
            "utm_campaign": _safe_token(payload.utm_campaign),
            "referrer_host": _safe_host(payload.referrer),
            "server_time":  _utcnow_iso(),
        }
        try:
            await db.focus_telemetry.insert_one(doc)
        except Exception as exc:  # noqa: BLE001
            log.warning("[focus-telemetry] write failed: %s", exc)
            return {"ok": False, "stored": False}
        return {"ok": True, "stored": True}

    @router.get("/focus/summary")
    async def focus_summary(days: int = 7) -> Dict[str, Any]:
        """Aggregate: per-category select count + avg duration over the
        last N days. Public + cached at the CDN layer (immutable per minute).
        """
        days = max(1, min(int(days or 7), 90))
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace("+00:00", "Z")
        try:
            pipeline = [
                {"$match": {"server_time": {"$gte": since}}},
                {"$group": {
                    "_id": {"category": "$category", "action": "$action"},
                    "count": {"$sum": 1},
                    "avg_duration_ms": {"$avg": "$duration_ms"},
                }},
            ]
            rows = []
            async for r in db.focus_telemetry.aggregate(pipeline):
                rows.append({
                    "category": r["_id"]["category"],
                    "action":   r["_id"]["action"],
                    "count":    int(r.get("count") or 0),
                    "avg_duration_ms": (
                        round(float(r["avg_duration_ms"]), 1)
                        if r.get("avg_duration_ms") is not None else None
                    ),
                })

            # Top campaigns (utm_campaign, last N days)
            campaign_rows = []
            campaign_pipeline = [
                {"$match": {"server_time": {"$gte": since}, "utm_campaign": {"$ne": None}}},
                {"$group": {"_id": "$utm_campaign", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ]
            async for r in db.focus_telemetry.aggregate(campaign_pipeline):
                campaign_rows.append({"campaign": r["_id"], "count": int(r["count"])})

        except Exception as exc:  # noqa: BLE001
            log.warning("[focus-telemetry] summary failed: %s", exc)
            return {"ok": False, "rows": [], "campaigns": []}

        return {
            "ok": True,
            "days": days,
            "rows": rows,
            "campaigns": campaign_rows,
            "server_time": _utcnow_iso(),
        }

    return router


__all__ = ["make_focus_telemetry_router"]
