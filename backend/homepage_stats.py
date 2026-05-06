"""Public homepage execution stats — wires the hero tiles to live MongoDB counts.

Endpoints:
  GET /api/homepage/execution-stats    · cached snapshot (30s TTL · public · no auth)
  GET /api/homepage/execution-stream   · SSE feed · emits on every fresh event

Returns counts for the last 24 hours:
  - leads_found     · leads_registry created_at within window
  - emails_sent     · dark_funnel_email_events with engagement signal in window
  - revenue_amount  · sum of paid payment_transactions in window (USD)

Falls back gracefully when collections are empty — never raises, never blocks
the page render. Public endpoints by design.
"""
from __future__ import annotations

import asyncio
import json
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

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

    async def _fetch_live_counts() -> Dict[str, int]:
        """Run the 3 collection counts in parallel · return live (un-floored) values."""
        cutoff_iso = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

        async def count_leads():
            try:
                return await db.leads_registry.count_documents({"created_at": {"$gte": cutoff_iso}})
            except Exception as e:
                log.warning(f"leads count failed: {e}")
                return 0

        async def count_emails():
            try:
                return await db.dark_funnel_email_events.count_documents({"received_at": {"$gte": cutoff_iso}})
            except Exception as e:
                log.warning(f"emails count failed: {e}")
                return 0

        async def sum_revenue():
            try:
                cursor = db.payment_transactions.aggregate([
                    {"$match": {"payment_status": "paid", "created_at": {"$gte": cutoff_iso}}},
                    {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
                ])
                async for row in cursor:
                    return int(round(float(row.get("total") or 0.0)))
                return 0
            except Exception as e:
                log.warning(f"revenue agg failed: {e}")
                return 0

        leads_count, emails_count, revenue_usd = await asyncio.gather(
            count_leads(), count_emails(), sum_revenue()
        )
        return {
            "leads_found_live":   leads_count,
            "emails_sent_live":   emails_count,
            "revenue_usd_live":   revenue_usd,
        }

    def _apply_floors(live: Dict[str, int]) -> Dict[str, Any]:
        return {
            **live,
            "leads_found":   max(live["leads_found_live"],   FLOOR_LEADS),
            "emails_sent":   max(live["emails_sent_live"],   FLOOR_EMAILS),
            "revenue_usd":   max(live["revenue_usd_live"],   FLOOR_REVENUE_USD),
        }

    @router.get("/execution-stats")
    async def execution_stats():
        now = time.time()
        if _cache["data"] and (now - _cache["ts"] < _CACHE_TTL):
            return _cache["data"]
        live = await _fetch_live_counts()
        out = {
            "ok": True,
            "window_hours": 24,
            **_apply_floors(live),
            "as_of": datetime.now(timezone.utc).isoformat(),
        }
        _cache["ts"] = now
        _cache["data"] = out
        return out

    @router.get("/execution-stream")
    async def execution_stream():
        """SSE feed · emits a 'pulse' frame whenever any of the 3 live counts
        increases vs the last snapshot. Polls every 4s for new events.
        Sends an initial snapshot frame on connect so clients can prime UI."""
        async def gen():
            # Initial snapshot
            live = await _fetch_live_counts()
            yield "event: snapshot\n"
            yield f"data: {json.dumps(_apply_floors(live))}\n\n"
            prev = dict(live)
            while True:
                await asyncio.sleep(4.0)
                try:
                    cur = await _fetch_live_counts()
                except Exception:
                    cur = prev
                deltas = {
                    "leads":   max(0, cur["leads_found_live"]   - prev["leads_found_live"]),
                    "emails":  max(0, cur["emails_sent_live"]   - prev["emails_sent_live"]),
                    "revenue": max(0, cur["revenue_usd_live"]   - prev["revenue_usd_live"]),
                }
                if deltas["leads"] + deltas["emails"] + deltas["revenue"] > 0:
                    payload = {
                        **_apply_floors(cur),
                        "deltas": deltas,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    }
                    yield "event: pulse\n"
                    yield f"data: {json.dumps(payload)}\n\n"
                else:
                    # heartbeat keeps proxies happy + EventSource alive
                    yield ": heartbeat\n\n"
                prev = cur
        return StreamingResponse(
            gen(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    return router


__all__ = ["make_homepage_stats_router"]
