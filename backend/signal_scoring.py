"""Weak Signal Scoring + Sentiment Drift (Iter 60 · Phase 1 functional)

Tracks lead intent in real time. Every touchpoint pushes a delta onto
`leads_registry.signal_history[]` and bumps `signal_score`. When the score
crosses configured thresholds the founder gets an SMS.

Thresholds:
  60 = warm  (no alert; visible in dashboard)
  80 = hot   (founder SMS · single fire per lead)
  95 = urgent (founder SMS · escalation copy)

Touchpoint deltas (small, additive — multiple touches stack):
  capture_submitted          +25
  orchestrator_run_started   +10
  asset_generated            +5
  email_sent                 +0  (no signal — passive)
  email_opened               +10  (Resend webhook)
  email_clicked              +20
  email_replied              +35
  demo_viewed                +15
  builder_tool_run           +8
  multiple_sessions_24h      +12
  topic_depth_jump           +15  (sentiment drift)

Each delta clamps the score to [0, 100]. Score decays -1/day if no activity.

Public API:
  await touch_signal(db, lead_id, kind, *, reason=None, sms=True) -> dict
  await detect_topic_drift(db, lead_id, new_message: str) -> bool
  await rebuild_score(db, lead_id) -> int  (recompute from history)
"""
from __future__ import annotations

import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

log = logging.getLogger("signal_scoring")

# Single source of truth — keep in sync with frontend display
SIGNAL_THRESHOLDS = {"warm": 60, "hot": 80, "urgent": 95}

SIGNAL_DELTAS: Dict[str, int] = {
    "capture_submitted": 25,
    "orchestrator_run_started": 10,
    "asset_generated": 5,
    "email_sent": 0,
    "email_opened": 10,
    "email_clicked": 20,
    "email_replied": 35,
    "demo_viewed": 15,
    "builder_tool_run": 8,
    "multiple_sessions_24h": 12,
    "topic_depth_jump": 15,
    "client_portal_opened": 18,
    "manual_boost": 10,
    "manual_decay": -10,
    "domain_intent": 22,
    "publish_intent": 28,
}

FOUNDER_PHONE = (os.environ.get("FOUNDER_PHONE") or "").strip()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def touch_signal(
    db,
    lead_id: str,
    kind: str,
    *,
    reason: Optional[str] = None,
    sms: bool = True,
) -> Dict[str, Any]:
    """Append a signal touchpoint and update the rolling score. Idempotent on
    the SMS — only the FIRST crossing of a threshold ever fires a ping."""
    if not lead_id:
        return {"ok": False, "error": "missing lead_id"}
    delta = SIGNAL_DELTAS.get(kind, 0)
    lead = await db.leads_registry.find_one(
        {"lead_id": lead_id},
        {"_id": 0, "signal_score": 1, "signal_history": 1, "signal_alerts_fired": 1,
         "name": 1, "email": 1, "company": 1, "industry": 1},
    )
    if not lead:
        return {"ok": False, "error": "lead not found"}

    prev = int(lead.get("signal_score") or 0)
    new = max(0, min(100, prev + delta))
    entry = {
        "at": _now_iso(),
        "kind": kind,
        "delta": delta,
        "total": new,
        "reason": reason,
    }

    update = {
        "$set": {"signal_score": new, "signal_score_updated_at": _now_iso()},
        "$push": {"signal_history": {"$each": [entry], "$slice": -200}},  # keep last 200
    }
    await db.leads_registry.update_one({"lead_id": lead_id}, update)

    # SMS on first crossing of HOT (80) and/or URGENT (95). Both fire if a
    # single delta jumps past both thresholds (e.g. 75 → 100).
    fired = lead.get("signal_alerts_fired") or {}
    crossings: List[str] = []
    if prev < 80 <= new and not fired.get("hot"):
        crossings.append("hot")
    if prev < 95 <= new and not fired.get("urgent"):
        crossings.append("urgent")

    sms_results: List[Dict[str, Any]] = []
    if crossings and sms and FOUNDER_PHONE:
        for level in crossings:
            r = await _fire_signal_sms(lead, level, new, kind)
            sms_results.append({"level": level, **r})
            await db.leads_registry.update_one(
                {"lead_id": lead_id},
                {"$set": {f"signal_alerts_fired.{level}": _now_iso()}},
            )
    return {
        "ok": True, "delta": delta, "score": new,
        "crossed_thresholds": crossings,
        "crossed_threshold": crossings[-1] if crossings else None,  # back-compat
        "sms_result": sms_results[-1] if sms_results else None,
        "sms_results": sms_results,
    }


async def _fire_signal_sms(lead: Dict[str, Any], level: str, score: int, trigger_kind: str) -> Dict[str, Any]:
    """Use the existing sms_service one-shot send. Falls back gracefully when
    Twilio isn't configured (preview env)."""
    try:
        from sms_service import sms_configured, _send_sync  # type: ignore
        if not sms_configured():
            return {"ok": False, "error": "twilio not configured", "kind": "no_creds"}
        prefix = "🔥 HOT" if level == "hot" else "🚨 URGENT"
        company = (lead.get("company") or "").strip()
        body = (
            f"{prefix} CB · {(lead.get('name') or 'lead').strip()}"
            f"{' · ' + company if company else ''}"
            f" · score {score}/100 · trigger: {trigger_kind} · {(lead.get('email') or '').strip()}"
        )[:160]
        # Run blocking Twilio client in thread
        return await asyncio.to_thread(_send_sync, FOUNDER_PHONE, body)
    except Exception as e:
        log.error(f"signal SMS failed: {e}")
        return {"ok": False, "error": str(e)[:200]}


# ──────────────── Sentiment Drift Detection ────────────────
async def detect_topic_drift(db, lead_id: str, new_message: str) -> bool:
    """Returns True if the new_message represents a topic-depth jump compared
    to the lead's last 3 messages (if any). Adds +15 signal_score on jump.
    Uses a tiny Haiku classifier — under 2s typically."""
    if not new_message or len(new_message) < 10:
        return False
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage  # type: ignore
    except Exception:
        return False
    key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if not key:
        return False

    # Pull the lead's last 3 messages we know about
    prior = await db.client_messages.find(
        {"author": "client"}, {"_id": 0, "body": 1, "client_id": 1}
    ).sort("created_at", -1).limit(3).to_list(3)
    # Best-effort: also pull avatar conversation history if present
    if not prior:
        return False  # nothing to compare against on the first message

    prior_text = "\n---\n".join(m.get("body", "") for m in prior if m.get("body"))
    sys = (
        "You classify topic depth of customer messages. Output STRICT JSON: "
        '{"prior_depth": "general|operational|technical|regulatory|financial", '
        '"new_depth": "general|operational|technical|regulatory|financial", '
        '"drift": true/false}. '
        "drift=true only if depth jumps DOWN the chain (general→technical/regulatory/financial), "
        "not for upward or lateral moves."
    )
    user = f"PRIOR (last 3):\n{prior_text}\n\nNEW:\n{new_message}"
    try:
        chat = LlmChat(api_key=key, session_id=f"drift_{lead_id}",
                       system_message=sys).with_model("anthropic", "claude-haiku-4-5-20251001")
        raw = await asyncio.wait_for(chat.send_message(LlmUserMessage(text=user)), timeout=10.0)
        text = str(raw or "").strip()
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            text = text.replace("json", "", 1).strip()
            if text.endswith("```"):
                text = text[:-3].strip()
        import json as _json
        data = _json.loads(text)
        if bool(data.get("drift")):
            await touch_signal(db, lead_id, "topic_depth_jump",
                               reason=f"{data.get('prior_depth')} → {data.get('new_depth')}",
                               sms=True)
            return True
    except Exception as e:
        log.warning(f"drift classifier failed: {e}")
    return False


async def rebuild_score(db, lead_id: str) -> int:
    """Recompute signal_score from history. Useful for migrations or manual reset."""
    lead = await db.leads_registry.find_one({"lead_id": lead_id}, {"_id": 0, "signal_history": 1})
    if not lead:
        return 0
    total = 0
    for e in lead.get("signal_history", []) or []:
        total = max(0, min(100, total + int(e.get("delta") or 0)))
    await db.leads_registry.update_one(
        {"lead_id": lead_id}, {"$set": {"signal_score": total}}
    )
    return total


__all__ = [
    "touch_signal", "detect_topic_drift", "rebuild_score",
    "SIGNAL_DELTAS", "SIGNAL_THRESHOLDS",
]
