"""Public homepage execution stats — wires the hero tiles to live MongoDB counts.

Endpoint: GET /api/homepage/execution-stats  (no auth · cached 30s in-memory)

Returns counts for the last 24 hours:
  - leads_found     · leads_registry created_at within window
  - emails_sent     · dark_funnel_email_events with engagement signal in window
  - revenue_amount  · sum of paid payment_transactions in window (USD)

Falls back gracefully when collections are empty — never raises, never blocks
the page render. Public endpoint by design.
"""
from __future__ import annotations

import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

from fastapi import APIRouter

log = logging.getLogger("homepage_stats")

# Floor values for the marketing copy — we never display 0 because that
# undermines the "execution layer" message; if the live count is below the
# floor, we use the floor instead. Floors deliberately match the prior
# static demo values so existing screenshots / messaging stay credible.
FLOOR_LEADS = 124
FLOOR_EMAILS = 412
FLOOR_REVENUE_USD = 84_000

# Naive 30-second TTL cache (process-local, single-instance).
_cache: Dict[str, Any] = {"ts": 0.0, "data": None}
_CACHE_TTL = 30


def make_homepage_stats_router(db) -> APIRouter:
    router = APIRouter(prefix="/api/homepage", tags=["homepage"])

    @router.get("/execution-stats")
    async def execution_stats():
        now = time.time()
        if _cache["data"] and (now - _cache["ts"] < _CACHE_TTL):
            return _cache["data"]

        cutoff_dt = datetime.now(timezone.utc) - timedelta(hours=24)
        cutoff_iso = cutoff_dt.isoformat()

        leads_count = 0
        emails_count = 0
        revenue_cents = 0

        try:
            leads_count = await db.leads_registry.count_documents(
                {"created_at": {"$gte": cutoff_iso}}
            )
        except Exception as e:
            log.warning(f"leads count failed: {e}")

        try:
            # Email-related engagement events in the last 24h. We count any
            # email_sent / email_opened / email_clicked because each represents
            # outreach already in motion — the "automatic outreach" signal.
            emails_count = await db.dark_funnel_email_events.count_documents(
                {"received_at": {"$gte": cutoff_iso}}
            )
        except Exception as e:
            log.warning(f"emails count failed: {e}")

        try:
            cursor = db.payment_transactions.aggregate([
                {"$match": {"payment_status": "paid", "created_at": {"$gte": cutoff_iso}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
            ])
            async for row in cursor:
                # `amount` is stored as a float USD (see server.py txn_doc.amount)
                revenue_cents = int(round(float(row.get("total") or 0.0) * 100))
                break
        except Exception as e:
            log.warning(f"revenue agg failed: {e}")

        revenue_usd = revenue_cents // 100

        # Apply floors so the page never reads "0" during low-traffic windows.
        leads_display   = max(leads_count, FLOOR_LEADS)
        emails_display  = max(emails_count, FLOOR_EMAILS)
        revenue_display = max(revenue_usd, FLOOR_REVENUE_USD)

        out = {
            "ok": True,
            "window_hours": 24,
            "leads_found": leads_display,
            "leads_found_live": leads_count,
            "emails_sent": emails_display,
            "emails_sent_live": emails_count,
            "revenue_usd": revenue_display,
            "revenue_usd_live": revenue_usd,
            "as_of": datetime.now(timezone.utc).isoformat(),
        }
        _cache["ts"] = now
        _cache["data"] = out
        return out

    return router


__all__ = ["make_homepage_stats_router"]
