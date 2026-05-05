"""Dark Funnel Tracking · Phase 1 (Iter 61)

Light, real, tied to outbound. Tracks engagement signals that feed
`signal_scoring` and triggers re-engagement when activity dies.

What ships tonight:
  • Resend webhook receiver — `email.opened` and `email.clicked` events
    push touch_signal (+10 / +20).
  • Tracked-redirect endpoint — `GET /api/dark-funnel/r?t=<token>` records
    a click + redirects to the destination URL.
  • Helper `mint_tracked_url(db, lead_id, dest_url, kind="link_click")` →
    returns a CB-hosted tracked URL for use inside outbound emails.
  • Engagement spike detector — when a lead receives 3+ engagement signals
    within 60 minutes, mark `signal_alerts_fired.spike` (idempotent).
  • Re-engagement scanner — runs every 5 min on the existing nurture loop;
    finds leads with `last_signal_at` >= 48h old AND `signal_score >= 30`
    AND no prior re-engagement send → fires the canned re-engage email.

Not building (per Jeffrey's Phase 1 cap):
  ✗ Heatmaps · ✗ multi-source intent · ✗ behavioral modeling
"""
from __future__ import annotations

import os
import uuid
import hashlib
import hmac
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

log = logging.getLogger("dark_funnel")

RESEND_WEBHOOK_SECRET = (os.environ.get("RESEND_WEBHOOK_SECRET") or "").strip()
SITE_URL = (os.environ.get("SITE_URL") or "https://creatorboostai.com").rstrip("/")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────── Tracked URL helper ────────────────
async def mint_tracked_url(db, *, lead_id: str, dest_url: str,
                           kind: str = "link_click",
                           ttl_days: int = 90) -> str:
    """Returns a CB-hosted URL that records a click signal and 302s to dest_url."""
    if not lead_id or not dest_url:
        return dest_url
    token = uuid.uuid4().hex
    await db.dark_funnel_tokens.insert_one({
        "token": token, "lead_id": lead_id, "dest_url": dest_url,
        "kind": kind, "clicks": 0,
        "expires_at": (_now_dt() + timedelta(days=ttl_days)).isoformat(),
        "created_at": _now_iso(),
    })
    return f"{SITE_URL}/api/dark-funnel/r?t={token}"


# ──────────────── Spike detector ────────────────
async def _detect_engagement_spike(db, lead_id: str) -> bool:
    """Mark lead as engagement-spike if 3+ signal entries occur in 60 min.
    Idempotent — only fires once per lead."""
    lead = await db.leads_registry.find_one(
        {"lead_id": lead_id},
        {"_id": 0, "signal_history": 1, "signal_alerts_fired": 1, "name": 1, "email": 1},
    )
    if not lead:
        return False
    fired = lead.get("signal_alerts_fired") or {}
    if fired.get("engagement_spike"):
        return False
    cutoff = (_now_dt() - timedelta(minutes=60)).isoformat()
    recent = [h for h in (lead.get("signal_history") or [])
              if h.get("at", "") >= cutoff and h.get("kind") in
              ("email_opened", "email_clicked", "demo_viewed", "client_portal_opened")]
    if len(recent) >= 3:
        await db.leads_registry.update_one(
            {"lead_id": lead_id},
            {"$set": {"signal_alerts_fired.engagement_spike": _now_iso()}},
        )
        log.info(f"[dark-funnel] spike fired · lead={lead_id} · count={len(recent)}")
        return True
    return False


# ──────────────── Re-engagement scanner ────────────────
async def reengagement_scan_once(db) -> Dict[str, int]:
    """Find leads inactive 48h+ with score >= 30, send re-engage email.
    Tags them so we don't double-send. Returns counts."""
    cutoff = (_now_dt() - timedelta(hours=48)).isoformat()
    cursor = db.leads_registry.find({
        "signal_score": {"$gte": 30},
        "signal_score_updated_at": {"$lt": cutoff, "$exists": True},
        "reengagement_sent_at": {"$exists": False},
        "email": {"$exists": True, "$nin": [None, ""]},
    }, {"_id": 0, "lead_id": 1, "name": 1, "email": 1, "company": 1,
        "signal_score": 1}).limit(20)

    sent_ok = 0
    sent_fail = 0
    async for lead in cursor:
        try:
            from email_service import send_with_result  # type: ignore
            html = (
                f'<div style="font-family:Inter,Arial,sans-serif;max-width:520px;color:#0f172a">'
                f'<p style="font-size:14px;line-height:1.6">'
                f'Hey {lead.get("name") or "there"} — just a quick check-in. '
                f'You started something inside CreatorBoostAI a couple of days ago and the '
                f'system is still holding it for you (it\'s locked to your account, no one '
                f'else can claim it).</p>'
                f'<p style="font-size:14px;line-height:1.6">If you got pulled away, that\'s '
                f'normal. The asset, lead lock, and follow-up sequence are all still here. '
                f'Reply with one sentence about what\'s in the way and I\'ll send back a '
                f'specific next step.</p>'
                f'<p style="margin:24px 0">'
                f'<a href="{SITE_URL}/portal/builder" '
                f'style="background:#10b981;color:#0c1117;padding:12px 22px;border-radius:6px;'
                f'text-decoration:none;font-weight:600;font-size:13px">Pick up where I left off →</a>'
                f'</p>'
                f'<p style="font-size:12px;color:#94a3b8">Reply STOP to opt out.</p>'
                f'</div>'
            )
            res = await send_with_result(
                to=lead["email"],
                subject="Your CreatorBoostAI lead is still locked to you",
                html=html,
            )
            await db.leads_registry.update_one(
                {"lead_id": lead["lead_id"]},
                {"$set": {
                    "reengagement_sent_at": _now_iso(),
                    "reengagement_delivered": bool(res.get("ok")),
                }},
            )
            if res.get("ok"):
                sent_ok += 1
                # +12 to score for the re-engagement push (counts as activity)
                from signal_scoring import touch_signal
                await touch_signal(db, lead["lead_id"], "manual_boost",
                                   reason="reengagement_email_sent", sms=False)
            else:
                sent_fail += 1
        except Exception as e:
            log.error(f"reengage send failed for {lead.get('lead_id')}: {e}")
            sent_fail += 1
    return {"sent_ok": sent_ok, "sent_fail": sent_fail}


async def reengagement_loop(db, interval_sec: int = 600) -> None:
    """Background loop. Skips if env=off."""
    if os.environ.get("REENGAGEMENT_SCANNER", "on").lower() == "off":
        log.info("[dark-funnel] reengagement loop disabled")
        return
    log.info("[dark-funnel] reengagement loop starting")
    await asyncio.sleep(45)
    while True:
        try:
            r = await reengagement_scan_once(db)
            if r["sent_ok"] or r["sent_fail"]:
                log.info(f"[dark-funnel] reengagement tick: {r}")
        except Exception as e:
            log.error(f"reengagement tick error: {e}")
        await asyncio.sleep(interval_sec)


# ──────────────── ROUTER ────────────────
class FounderAuth(BaseModel):
    email: str
    token: str


def make_dark_funnel_router(db, require_founder=None) -> APIRouter:
    router = APIRouter(prefix="/api/dark-funnel", tags=["dark-funnel"])

    @router.get("/r")
    async def tracked_redirect(t: str):
        """Tracked-link redirect. Records click signal, 302s to destination."""
        rec = await db.dark_funnel_tokens.find_one({"token": t}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "unknown link")
        # Increment click counter + record signal
        await db.dark_funnel_tokens.update_one(
            {"token": t},
            {"$inc": {"clicks": 1}, "$set": {"last_clicked_at": _now_iso()}},
        )
        try:
            from signal_scoring import touch_signal
            await touch_signal(db, rec["lead_id"], "email_clicked",
                               reason=rec.get("kind") or "link_click")
            await _detect_engagement_spike(db, rec["lead_id"])
        except Exception as e:
            log.warning(f"redirect signal failed: {e}")
        return RedirectResponse(rec["dest_url"], status_code=302)

    @router.post("/webhook/resend")
    async def resend_webhook(request: Request):
        """Receive Resend email events: opened, clicked, delivered, bounced."""
        body_bytes = await request.body()
        # Optional HMAC verification when RESEND_WEBHOOK_SECRET is set
        if RESEND_WEBHOOK_SECRET:
            sig = request.headers.get("svix-signature") or request.headers.get("resend-signature") or ""
            expected = hmac.new(RESEND_WEBHOOK_SECRET.encode(),
                                body_bytes, hashlib.sha256).hexdigest()
            if not sig or expected not in sig:
                raise HTTPException(401, "bad signature")

        try:
            import json as _json
            payload = _json.loads(body_bytes or b"{}")
        except Exception:
            raise HTTPException(400, "bad json")

        evt = (payload.get("type") or "").lower()
        data = payload.get("data") or {}
        email_id = data.get("email_id") or data.get("id")
        recipient = (data.get("to") or [None])
        recipient_email = recipient[0] if isinstance(recipient, list) and recipient else None

        # Persist raw event for audit
        await db.dark_funnel_email_events.insert_one({
            "id": str(uuid.uuid4()),
            "type": evt,
            "email_id": email_id,
            "recipient": recipient_email,
            "raw": payload,
            "received_at": _now_iso(),
        })

        # Match recipient → lead
        if recipient_email:
            lead = await db.leads_registry.find_one(
                {"email": recipient_email.lower().strip()},
                {"_id": 0, "lead_id": 1},
            )
            if lead:
                from signal_scoring import touch_signal
                kind_map = {
                    "email.opened": "email_opened",
                    "email.delivered": None,  # passive, no signal
                    "email.clicked": "email_clicked",
                    "email.bounced": None,    # negative — handle later
                    "email.complained": None,
                }
                signal_kind = kind_map.get(evt)
                if signal_kind:
                    await touch_signal(db, lead["lead_id"], signal_kind, reason=f"resend:{evt}")
                    await _detect_engagement_spike(db, lead["lead_id"])
        return {"ok": True}

    @router.post("/scan-reengagement")
    async def scan_now(payload: FounderAuth):
        """Founder-triggered scan (manual override of the 5-min cron)."""
        if require_founder:
            await require_founder(payload)
        return await reengagement_scan_once(db)

    @router.post("/lead-engagement")
    async def lead_engagement(payload: dict):
        """Founder-only engagement detail for a lead.
        Returns: signal_score, recent history (10), tracked links + click counts."""
        # cheap auth via lead lookup — founders typically pass {email, token, lead_id}
        from pydantic import BaseModel as _BM
        class _Q(_BM):
            email: str
            token: str
            lead_id: str
        try:
            q = _Q(**payload)
        except Exception:
            raise HTTPException(400, "missing email/token/lead_id")
        if require_founder:
            await require_founder(FounderAuth(email=q.email, token=q.token))
        lead = await db.leads_registry.find_one(
            {"lead_id": q.lead_id},
            {"_id": 0, "name": 1, "email": 1, "company": 1, "signal_score": 1,
             "signal_history": 1, "signal_alerts_fired": 1, "region": 1,
             "reengagement_sent_at": 1},
        )
        if not lead:
            raise HTTPException(404, "lead not found")
        links = await db.dark_funnel_tokens.find(
            {"lead_id": q.lead_id},
            {"_id": 0, "token": 1, "dest_url": 1, "kind": 1, "clicks": 1,
             "last_clicked_at": 1, "created_at": 1},
        ).sort("created_at", -1).limit(20).to_list(20)
        history = (lead.get("signal_history") or [])[-10:]
        return {
            "lead": {**lead, "signal_history": history},
            "tracked_links": links,
        }

    return router


__all__ = ["make_dark_funnel_router", "mint_tracked_url",
           "reengagement_scan_once", "reengagement_loop"]
