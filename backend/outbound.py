"""CreatorBoostAI · Outbound Prospecting + Reply Engine · Phase 1.

Self-contained FastAPI sub-router + background scheduler + AI helpers.
Surface mounted at /api/ops/outbound by server.py.

Phase 1 scope:
    · CSV upload + manual prospect entry
    · AI scoring (Claude Sonnet) across 9 verticals
    · Personalized initial email generation (no demo) + teaser for high-fit
    · Resend delivery with unsubscribe footer + daily limit + natural spacing
    · Manual "Mark Replied" reply detection
    · Follow-up cadence (2d / 5d / 8d)
    · AI positive-reply drafts → admin approval queue
    · LinkedIn message generation (copy-to-clipboard, mark-sent tracking)
    · Suppression list + unsubscribe endpoint (public)
    · Deliverability risk auto-pause (bounce >5% or complaint >0.3%)
"""

from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import logging
import os
import random
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, Body
from pydantic import BaseModel, EmailStr, Field

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
except Exception:  # pragma: no cover · allows server.py import even if lib missing
    LlmChat = None
    LlmUserMessage = None

log = logging.getLogger("outbound")


# ════════════════════════════════════════════════════════════════════
# CONSTANTS · 9 verticals + demo map + deliverability guardrails
# ════════════════════════════════════════════════════════════════════
TARGET_SEGMENTS = [
    "realtor",
    "insurance_agent",
    "creator_influencer",
    "contractor_service",
    "retail_chain",
    "airport_enterprise",
    "sales_team_agency",
    "c_store",
    "supermarket_grocery",
    "education_school",
]

# Phase 6 · 8-category reply taxonomy
REPLY_CATEGORIES = (
    "interested",          # warm — wants info or to talk
    "asked_question",      # has a specific question
    "needs_demo",          # explicitly requests a demo / link
    "not_interested",      # polite no
    "unsubscribe",         # opt-out / remove me
    "wrong_person",        # bounced internally / wrong contact
    "positive",            # generic warm but uncategorized
    "needs_founder_response",  # sensitive / pricing / legal — escalate
)

REPLY_CATEGORY_TO_STATUS = {
    "interested":             "replied_positive",
    "asked_question":         "replied_positive",
    "needs_demo":             "replied_positive",
    "positive":               "replied_positive",
    "needs_founder_response": "replied_positive",
    "wrong_person":           "replied",
    "not_interested":         "not_interested",
    "unsubscribe":            "unsubscribed",
}

SEGMENT_DISPLAY = {
    "realtor":             "Realtors / Brokerages",
    "insurance_agent":     "Insurance Agents",
    "creator_influencer":  "Creators / Influencers",
    "contractor_service":  "Contractors · Service Businesses",
    "retail_chain":        "Retail Chains",
    "airport_enterprise":  "Airports · Enterprise Operations",
    "sales_team_agency":   "Sales Teams · Agencies",
    "c_store":             "Convenience Stores (C-Stores)",
    "supermarket_grocery": "Supermarkets · Grocery Chains",
    "education_school":    "Education · School Districts / Universities",
}

# Maps each segment → best-fit demo route + brand vocabulary. Used when
# the system decides to either teaser-link or full-demo-link.
DEMO_MAP = {
    "realtor":             {"route": "/demo/realtor",     "label": "Realtor Decision Engine"},
    "insurance_agent":     {"route": "/demo/insurance",   "label": "Insurance Signal Engine"},
    "creator_influencer":  {"route": "/demo/creator",     "label": "Creator Growth Engine"},
    "contractor_service":  {"route": "/lighting",          "label": "Lighting Upgrade Engine"},
    "retail_chain":        {"route": "/demo/supermarket", "label": "Retail Ops Decision Engine"},
    "airport_enterprise":  {"route": "/demo/airport",     "label": "Airport Overlay Engine"},
    "sales_team_agency":   {"route": "/demo/noldus",      "label": "Enterprise Signal Engine"},
    "c_store":             {"route": "/demo/supermarket", "label": "C-Store Ops Engine"},
    "supermarket_grocery": {"route": "/demo/supermarket", "label": "Grocery Ops Engine"},
    "education_school":    {"route": "/demo/education",   "label": "School District Intelligence System"},
}

DAILY_LIMIT_DEFAULT = int(os.environ.get("OUTBOUND_DAILY_LIMIT", "10"))   # Phase A · Low Credit Execution Mode
SEND_WINDOW_HOURS = 14                 # spread sends across 14-hour workday
MIN_SEND_SPACING_SEC = 60              # hard floor between two sends
BOUNCE_RATE_PAUSE_THRESHOLD = 0.05     # auto-pause if ≥5 % over last 7 days
COMPLAINT_RATE_PAUSE_THRESHOLD = 0.003  # auto-pause if ≥0.3 % over last 7 days
FOLLOWUP_OFFSETS_DAYS = [2, 5, 10]      # cadence · FU1(d2) / FU2(d5) / FU3(d10)
MAX_EMAILS_BEFORE_COLD = 4              # initial + 3 follow-ups → then cold
DEMO_VIEWER_DELAY_MIN_HRS = 12          # warm demo viewer delay lower bound
DEMO_VIEWER_DELAY_MAX_HRS = 24          # warm demo viewer delay upper bound
DEMO_VIEWER_BASELINE_SCORE = 82         # pre-scored warm lead baseline
MIN_SCORE_TO_SEND = int(os.environ.get("OUTBOUND_MIN_SCORE", "70"))  # Phase A · only high-fit leads proceed to email

# Subject-line rotation seeds — picked per prospect for variety without
# repeating across the cadence. The AI sees one of these as a style hint.
SUBJECT_STYLE_POOL = (
    "curiosity-led, <=6 words",
    "specific-to-business, <=7 words",
    "question-form, <=8 words",
    "outcome-focused, <=6 words",
    "observational, <=7 words",
    "referral-style, <=7 words",
)

# Tone variation cycled through follow-ups to avoid template-feel.
TONE_VARIATIONS = (
    "direct and respectful",
    "warm and brief",
    "curious and soft",
    "observational and specific",
)

# Dumb spam-word filter applied to AI-generated emails.
SPAM_WORDS = (
    "!!!", "$$$", "act now", "100% free", "click here", "limited time",
    "no obligation", "guarantee", "earn money", "risk free", "congratulations",
)


# ════════════════════════════════════════════════════════════════════
# MODELS
# ════════════════════════════════════════════════════════════════════
class OpsAuth(BaseModel):
    email: EmailStr
    token: str


class ProspectIn(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=240)
    contact_name: Optional[str] = Field(default=None, max_length=160)
    email: EmailStr
    industry: Optional[str] = Field(default=None, max_length=120)
    website: Optional[str] = Field(default=None, max_length=500)
    location: Optional[str] = Field(default=None, max_length=160)
    notes: Optional[str] = Field(default=None, max_length=2000)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)


class ManualProspectIn(BaseModel):
    # Auth fields
    auth_email: EmailStr
    auth_token: str
    # Prospect fields
    business_name: str = Field(..., min_length=1, max_length=240)
    contact_name: Optional[str] = Field(default=None, max_length=160)
    email: EmailStr
    industry: Optional[str] = Field(default=None, max_length=120)
    website: Optional[str] = Field(default=None, max_length=500)
    location: Optional[str] = Field(default=None, max_length=160)
    notes: Optional[str] = Field(default=None, max_length=2000)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)


class ProspectIdIn(OpsAuth):
    prospect_id: str


class ProspectReplyIn(OpsAuth):
    prospect_id: str
    reply_body: Optional[str] = Field(default=None, max_length=6000)
    positive: Optional[bool] = None
    category: Optional[str] = Field(default=None, max_length=40)  # 8-category reply taxonomy


class DraftApproveIn(OpsAuth):
    draft_id: str
    edited_body: Optional[str] = Field(default=None, max_length=8000)


class PauseToggleIn(OpsAuth):
    paused: bool
    reason: Optional[str] = Field(default=None, max_length=400)


# ════════════════════════════════════════════════════════════════════
# ROUTER FACTORY
# ════════════════════════════════════════════════════════════════════
def make_outbound_router(
    db,
    send_outbound_email,          # async callable(to_email, subject, html, plain) → bool
    send_founder_notification,    # async callable for internal alerts
    require_founder,              # async callable(payload: OpsAuth) -> user dict (raises 401/403)
) -> APIRouter:
    router = APIRouter(prefix="/ops/outbound", tags=["outbound"])

    # ──────────────── UTILITIES ────────────────
    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def now_dt() -> datetime:
        return datetime.now(timezone.utc)

    def today_key() -> str:
        return now_dt().strftime("%Y-%m-%d")

    async def _state() -> Dict[str, Any]:
        s = await db.outbound_campaign_state.find_one({"_id": "state"}, {"_id": 0})
        if not s:
            s = {
                "paused": False,
                "pause_reason": None,
                "daily_limit": DAILY_LIMIT_DEFAULT,
                "sender_name": "CreatorBoostAI",
                "updated_at": now_iso(),
            }
            await db.outbound_campaign_state.update_one(
                {"_id": "state"}, {"$set": s}, upsert=True
            )
        return s

    async def _set_state(**patch) -> None:
        patch["updated_at"] = now_iso()
        await db.outbound_campaign_state.update_one(
            {"_id": "state"}, {"$set": patch}, upsert=True
        )

    async def _today_sent_count() -> int:
        return await db.outbound_events.count_documents(
            {"type": "sent", "day_key": today_key()}
        )

    async def _log_event(prospect_id: str, event_type: str, **extra) -> None:
        doc = {
            "id": str(uuid.uuid4()),
            "prospect_id": prospect_id,
            "type": event_type,
            "day_key": today_key(),
            "created_at": now_iso(),
            **extra,
        }
        await db.outbound_events.insert_one(doc)

    async def _is_suppressed(email: str) -> bool:
        return bool(
            await db.outbound_suppression.find_one({"email": email.strip().lower()})
        )

    async def _suppress(email: str, reason: str) -> None:
        await db.outbound_suppression.update_one(
            {"email": email.strip().lower()},
            {"$set": {"reason": reason, "updated_at": now_iso()}},
            upsert=True,
        )

    def _unsubscribe_token(email: str) -> str:
        """Deterministic, url-safe token for the public unsubscribe link."""
        seed = f"{email.strip().lower()}::{os.environ.get('MONGO_URL', '')}"
        return hashlib.sha256(seed.encode("utf-8")).hexdigest()[:20]

    def _public_base() -> str:
        return (
            os.environ.get("PUBLIC_APP_URL", "").strip()
            or "https://www.creatorboostai.com"
        ).rstrip("/")

    def _unsub_footer(email: str) -> tuple[str, str]:
        """Return (html_footer, plain_footer) with the one-click unsubscribe."""
        link = f"{_public_base()}/api/ops/outbound/unsubscribe/{_unsubscribe_token(email)}?e={email}"
        html = (
            "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;'/>"
            "<p style='font-family:ui-sans-serif,system-ui;font-size:11px;color:#6b7280;line-height:1.5;'>"
            "Sent by CreatorBoostAI · If this isn't useful, "
            f"<a href='{link}' style='color:#6b7280;'>unsubscribe</a> "
            "and we'll remove you immediately."
            "</p>"
        )
        plain = (
            f"\n\n— CreatorBoostAI · unsubscribe: {link}"
        )
        return html, plain

    def _strip_spammy(text: str) -> str:
        """Rewrite obvious spam tokens out of an AI draft."""
        out = text
        for token in SPAM_WORDS:
            out = re.sub(re.escape(token), "", out, flags=re.I)
        out = re.sub(r"!{2,}", "!", out)
        out = re.sub(r"\${2,}", "$", out)
        return out.strip()

    # ──────────────── AI HELPERS ────────────────
    def _llm_key() -> str:
        k = os.environ.get("EMERGENT_LLM_KEY", "").strip()
        if not k:
            raise HTTPException(status_code=503, detail="AI not configured (EMERGENT_LLM_KEY missing)")
        return k

    async def _claude(system: str, user: str, session_id: str) -> str:
        if LlmChat is None:
            raise HTTPException(status_code=503, detail="emergentintegrations not installed")
        chat = LlmChat(api_key=_llm_key(), session_id=session_id, system_message=system)
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        try:
            reply = await chat.send_message(LlmUserMessage(text=user))
        except Exception as exc:
            log.error(f"Claude call failed: {exc}")
            raise HTTPException(status_code=502, detail=f"AI provider error: {exc}")
        return reply

    async def _score_prospect(p: Dict[str, Any]) -> Dict[str, Any]:
        system = (
            "You are the CreatorBoostAI lead-qualifier. For the supplied prospect, "
            "pick the single best-fit segment from this list and output STRICT JSON only "
            f"(no prose, no markdown). Segments: {', '.join(TARGET_SEGMENTS)}.\n"
            "Output schema:\n"
            "{\n"
            "  \"lead_score\": <int 1-100>,\n"
            f"  \"target_segment\": <one of {TARGET_SEGMENTS}>,\n"
            "  \"recommended_offer\": \"<one concise sentence — Starter | Growth | Pro | Audit | Signal Pack | Enterprise brief>\",\n"
            "  \"ai_reasoning\": \"<1–3 sentences on fit and pain point>\",\n"
            "  \"estimated_pain\": \"<one short phrase>\",\n"
            "  \"suggested_pitch_angle\": \"<one concise sentence>\"\n"
            "}\n"
            "Scoring: 80+ = high fit, revenue >$500K/yr or multi-location or enterprise; 60-79 = good fit; 40-59 = maybe; <40 = weak."
        )
        user = (
            f"Business: {p.get('business_name') or '—'}\n"
            f"Contact: {p.get('contact_name') or '—'}\n"
            f"Industry: {p.get('industry') or '—'}\n"
            f"Website: {p.get('website') or '—'}\n"
            f"Location: {p.get('location') or '—'}\n"
            f"Notes: {p.get('notes') or '—'}"
        )
        raw = await _claude(system, user, session_id=f"score-{p['id']}")
        # Pull the first JSON object out of the reply
        import json as _json
        m = re.search(r"\{.*\}", raw, flags=re.S)
        if not m:
            return {
                "lead_score": 50, "target_segment": "sales_team_agency",
                "recommended_offer": "CreatorBoostAI Starter or demo walkthrough",
                "ai_reasoning": raw[:400],
                "estimated_pain": "unknown",
                "suggested_pitch_angle": "Short, specific value prop",
            }
        try:
            obj = _json.loads(m.group(0))
            return obj
        except Exception:
            return {
                "lead_score": 50, "target_segment": "sales_team_agency",
                "recommended_offer": "CreatorBoostAI demo",
                "ai_reasoning": raw[:400],
                "estimated_pain": "unknown",
                "suggested_pitch_angle": "Short, specific value prop",
            }

    async def _draft_email(p: Dict[str, Any], include_teaser: bool) -> Dict[str, str]:
        seg = p.get("target_segment") or "sales_team_agency"
        demo = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
        source_demo = p.get("source_demo")
        is_demo_viewer = bool(source_demo)
        teaser_line = (
            f"If useful, I put together a 90-second teaser: {_public_base()}{demo['route']}"
            if include_teaser else
            ""
        )
        style_hint = random.choice(SUBJECT_STYLE_POOL)
        calendly = os.environ.get("CALENDLY_URL", "").strip()
        calendly_line = (
            f"Open to a 15-min call to see if this fits? Book any slot here: {calendly}"
            if calendly else "Open to a quick call to see if this fits?"
        )
        if is_demo_viewer:
            system = (
                "You are writing a first follow-up email to someone who just viewed a CreatorBoostAI demo "
                "but did NOT book or purchase. They already know the product visually — do NOT re-explain it. "
                "Acknowledge they explored the demo. Offer a concrete next step (short call, or a specific signal-pack). "
                f"CTA requirement: end with a booking offer using this exact line verbatim on its own line: '{calendly_line}' "
                f"Style: 80-110 words, plain text, no hype, no !!!, no ALL CAPS. Subject style: {style_hint}. "
                "Output STRICT JSON only: {\"subject\": \"...\", \"body\": \"...\"}"
            )
        else:
            system = (
                "You are writing a cold-outreach email on behalf of the CreatorBoostAI team. "
                "Style: short, human, specific, zero fluff, no hype, no spam tokens. "
                "CONSTRAINTS: total email body <= 120 words. Zero !!! zero ALL CAPS. "
                "Plain text, no markdown. "
                "Structure: 1-line opener specific to their business · 1-line pain point · "
                "1-line how CreatorBoostAI helps · booking CTA. "
                f"CTA requirement: end with this exact line verbatim on its own line: '{calendly_line}' "
                f"Subject style guidance: {style_hint}. "
                "Output STRICT JSON only: {\"subject\": \"...\", \"body\": \"...\"}"
            )
        user = (
            f"Prospect: {p.get('contact_name') or p.get('business_name')}\n"
            f"Business: {p.get('business_name')}\n"
            f"Segment (best-fit): {SEGMENT_DISPLAY.get(seg, seg)}\n"
            f"Estimated pain: {p.get('estimated_pain') or '—'}\n"
            f"Suggested angle: {p.get('suggested_pitch_angle') or '—'}\n"
            f"Recommended offer: {p.get('recommended_offer') or '—'}\n"
            + (f"They viewed the {source_demo} demo at {_public_base()}{demo['route']}\n" if is_demo_viewer else "")
            + f"Teaser demo (optional, include only if helpful): {teaser_line or '(none — do not add any link)'}\n"
        )
        raw = await _claude(system, user, session_id=f"email-{p['id']}")
        import json as _json
        m = re.search(r"\{.*\}", raw, flags=re.S)
        if not m:
            return {"subject": "Quick idea for " + (p.get("business_name") or "you"),
                    "body": _strip_spammy(raw)[:600]}
        try:
            obj = _json.loads(m.group(0))
            obj["subject"] = _strip_spammy(obj.get("subject", ""))[:120]
            obj["body"] = _strip_spammy(obj.get("body", ""))[:1500]
            return obj
        except Exception:
            return {"subject": "Quick idea", "body": _strip_spammy(raw)[:600]}

    async def _last_sent_subjects(prospect_id: str, limit: int = 3) -> List[str]:
        cursor = db.outbound_events.find(
            {"prospect_id": prospect_id, "type": "sent"},
            {"_id": 0, "subject": 1, "created_at": 1},
        ).sort("created_at", -1).limit(limit)
        out: List[str] = []
        async for r in cursor:
            if r.get("subject"):
                out.append(r["subject"])
        return out

    async def _draft_followup(p: Dict[str, Any], which: int) -> Dict[str, str]:
        """Context-aware follow-up draft. FU1=bump, FU2=proof/demo-link,
        FU3=low-pressure final. Injects prior subjects so the AI avoids
        template repetition and actually references the prior thread."""
        tone = TONE_VARIATIONS[(which - 1) % len(TONE_VARIATIONS)]
        prior_subjects = await _last_sent_subjects(p["id"], limit=3)
        prior = "\n".join([f"  · \"{s}\"" for s in prior_subjects]) or "  (no prior subjects recorded)"

        seg = p.get("target_segment") or "sales_team_agency"
        demo = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
        demo_url = f"{_public_base()}{demo['route']}"
        lead_score = int(p.get("lead_score") or 0)

        # Stage-specific instructions per Jeffrey's cadence spec
        if which == 1:
            stage = (
                "FOLLOW-UP 1 (Day 2) — Simple bump. Acknowledge they may be busy. "
                "Reinforce the outcome. 35-55 words max. Do NOT add a link."
            )
        elif which == 2:
            include_demo = lead_score >= 60  # hi + medium fit get demo in FU2
            stage = (
                "FOLLOW-UP 2 (Day 5) — Introduce a proof concept. Reference how CreatorBoostAI replaces "
                "manual effort with a concrete outcome. 55-80 words. "
                + (f"Include exactly ONE link: {demo_url}" if include_demo else "Do NOT add any link.")
            )
        else:
            stage = (
                "FOLLOW-UP 3 (Day 8) — Final message. Low-pressure close. Ask if the timing is wrong. "
                "40-60 words. Do NOT add a link. One sentence, one soft question."
            )

        system = (
            f"You are writing a short, {tone} follow-up on behalf of CreatorBoostAI. "
            f"{stage} "
            "No hype, no ALL CAPS, no spam tokens, plain text, no markdown. "
            "IMPORTANT: Do NOT reuse any subject line from the prior-subjects list below — pick a different angle. "
            "Reference the prior thread lightly (e.g., 'following up on my note about …'). "
            "Output STRICT JSON: {\"subject\": \"...\", \"body\": \"...\"}"
        )
        user = (
            f"Prospect: {p.get('contact_name') or p.get('business_name')}\n"
            f"Business: {p.get('business_name')}\n"
            f"Segment: {SEGMENT_DISPLAY.get(seg, seg)}\n"
            f"Lead score: {lead_score}\n"
            f"Follow-up #{which} of {len(FOLLOWUP_OFFSETS_DAYS)}\n"
            f"Prior subjects to avoid repeating:\n{prior}\n"
        )
        raw = await _claude(system, user, session_id=f"fu{which}-{p['id']}")
        import json as _json
        m = re.search(r"\{.*\}", raw, flags=re.S)
        if m:
            try:
                obj = _json.loads(m.group(0))
                return {"subject": _strip_spammy(obj.get("subject", ""))[:120],
                        "body": _strip_spammy(obj.get("body", ""))[:1500]}
            except Exception:
                pass
        return {"subject": f"Circling back re: {p.get('business_name')}",
                "body": _strip_spammy(raw)[:600]}

    async def _draft_linkedin(p: Dict[str, Any], kind: str) -> str:
        system = (
            "You are drafting a LinkedIn message on behalf of the CreatorBoostAI founder. "
            "Style: short, human, specific, no hype, no hashtags, no emojis. "
            "Plain text only. 300 characters max for 'connect', 600 for 'followup'."
        )
        user = (
            f"Message type: {kind}\n"
            f"Prospect: {p.get('contact_name') or p.get('business_name')}\n"
            f"Business: {p.get('business_name')}\n"
            f"Best-fit segment: {SEGMENT_DISPLAY.get(p.get('target_segment',''), '—')}\n"
            f"Suggested angle: {p.get('suggested_pitch_angle') or '—'}"
        )
        raw = await _claude(system, user, session_id=f"li-{kind}-{p['id']}")
        cap = 300 if kind == "connect" else 600
        return _strip_spammy(raw).strip()[:cap]

    async def _draft_positive_reply(p: Dict[str, Any], reply_body: str) -> Dict[str, str]:
        seg = p.get("target_segment") or "sales_team_agency"
        demo = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
        full_demo = f"{_public_base()}{demo['route']}"
        calendly = os.environ.get("CALENDLY_URL", "").strip()
        booking_instruction = (
            f"Include this Calendly booking URL as a direct call-to-action line: {calendly}"
            if calendly else
            "End with a question like 'does Tuesday or Wednesday work for a 15-min call?'"
        )
        system = (
            "You are drafting a reply to a warm prospect who showed interest. "
            "Style: warm, short (80-120 words), offer a concrete next step to book a meeting. "
            f"{booking_instruction} "
            "Also reference the best-fit demo URL if appropriate. "
            "Output STRICT JSON: {\"subject\": \"...\", \"body\": \"...\"}"
        )
        user = (
            f"Prospect: {p.get('contact_name') or p.get('business_name')}\n"
            f"They replied: {reply_body[:1200]}\n"
            f"Best-fit demo URL: {full_demo}\n"
            f"Offer: {p.get('recommended_offer') or 'book a 20-min discovery call'}"
        )
        raw = await _claude(system, user, session_id=f"reply-{p['id']}")
        import json as _json
        m = re.search(r"\{.*\}", raw, flags=re.S)
        if m:
            try:
                obj = _json.loads(m.group(0))
                return {"subject": _strip_spammy(obj.get("subject", ""))[:120],
                        "body": _strip_spammy(obj.get("body", ""))[:2000]}
            except Exception:
                pass
        return {"subject": "Re: your reply", "body": _strip_spammy(raw)[:1000]}

    # ──────────────── DELIVERABILITY ────────────────
    async def _deliverability_stats(days: int = 7) -> Dict[str, Any]:
        cutoff = (now_dt() - timedelta(days=days)).isoformat()
        pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$type", "n": {"$sum": 1}}},
        ]
        agg = await db.outbound_events.aggregate(pipeline).to_list(20)
        counts = {r["_id"]: r["n"] for r in agg}
        sent = max(1, counts.get("sent", 0))
        bounced = counts.get("bounced", 0)
        complained = counts.get("complained", 0)
        return {
            "window_days": days,
            "sent": counts.get("sent", 0),
            "bounced": bounced,
            "complained": complained,
            "replied": counts.get("replied", 0),
            "unsubscribed": counts.get("unsubscribed", 0),
            "bounce_rate": round(bounced / sent, 4),
            "complaint_rate": round(complained / sent, 4),
            "risk": (
                "high"   if (bounced / sent) >= BOUNCE_RATE_PAUSE_THRESHOLD or (complained / sent) >= COMPLAINT_RATE_PAUSE_THRESHOLD
                else "medium" if (bounced / sent) >= BOUNCE_RATE_PAUSE_THRESHOLD / 2
                else "low"
            ),
        }

    async def _maybe_auto_pause() -> None:
        stats = await _deliverability_stats(days=7)
        if stats["sent"] >= 50 and (
            stats["bounce_rate"] >= BOUNCE_RATE_PAUSE_THRESHOLD
            or stats["complaint_rate"] >= COMPLAINT_RATE_PAUSE_THRESHOLD
        ):
            state = await _state()
            if not state.get("paused"):
                await _set_state(
                    paused=True,
                    pause_reason=f"auto_paused · bounce_rate={stats['bounce_rate']} · complaint_rate={stats['complaint_rate']}",
                )
                try:
                    await send_founder_notification(
                        to_email=os.environ.get("FOUNDER_EMAIL", "").strip() or os.environ.get("APPLICATIONS_INBOX", "").strip(),
                        subject="[CreatorBoostAI] Outbound auto-paused · deliverability risk",
                        body_html=f"<p>The outbound engine auto-paused.</p><pre>{stats}</pre>",
                    )
                except Exception:
                    pass

    # ──────────────── SEND PIPELINE ────────────────
    async def _send_one(prospect: Dict[str, Any], subject: str, body_plain: str, *, kind: str) -> bool:
        """Send one email with footer + unsub, log the event, bump counters.

        Special case: when the recipient uses an RFC-2606 reserved test domain
        (`.example.com` / `.example.org` / `.example.net` / `.example`), we
        SIMULATE the send — log the event and bump counters without calling
        Resend. This lets the autopilot demonstrate full execution against
        synthetic internal seeds while real prospect emails still go through
        the live Resend pipeline untouched."""
        email = prospect["email"]
        if await _is_suppressed(email):
            await _log_event(prospect["id"], "skipped_suppressed", kind=kind)
            return False
        html_footer, plain_footer = _unsub_footer(email)
        body_html = (
            "<div style='font-family:ui-sans-serif,system-ui;font-size:14px;line-height:1.6;color:#111;'>"
            + body_plain.replace("\n", "<br/>")
            + "</div>"
            + html_footer
        )
        full_plain = body_plain + plain_footer

        # Simulation path for RFC-2606 reserved test domains
        is_simulated = bool(re.search(r"\.example(?:\.com|\.org|\.net)?$", email.lower()))
        if is_simulated:
            await _log_event(prospect["id"], "sent", kind=kind, subject=subject[:200], simulated=True)
            await db.outbound_prospects.update_one(
                {"id": prospect["id"]},
                {"$set": {
                    "last_email_at": now_iso(),
                    "status": "contacted" if kind == "initial" else prospect.get("status", "contacted"),
                    "email_status": f"{kind}_simulated",
                    "last_email_subject": subject[:200],
                    "last_email_simulated": True,
                }, "$inc": {"emails_sent": 1}},
            )
            return True

        # Real send via Resend / configured sender
        ok = False
        try:
            ok = await send_outbound_email(email, subject, body_html, full_plain)
        except Exception as e:
            log.error(f"Outbound send failed: {e}")
            ok = False
        if ok:
            await _log_event(prospect["id"], "sent", kind=kind, subject=subject[:200])
            await db.outbound_prospects.update_one(
                {"id": prospect["id"]},
                {"$set": {
                    "last_email_at": now_iso(),
                    "status": "contacted" if kind == "initial" else prospect.get("status", "contacted"),
                    "email_status": kind,
                    "last_email_subject": subject[:200],
                }, "$inc": {"emails_sent": 1}},
            )
        else:
            await _log_event(prospect["id"], "send_failed", kind=kind)
        return ok

    async def _eligible_for_initial() -> List[Dict[str, Any]]:
        now_s = now_iso()
        return await db.outbound_prospects.find(
            {
                "status": {"$in": ["new", "scored"]},
                "unsubscribed": {"$ne": True},
                "suppressed": {"$ne": True},
                "emails_sent": {"$lte": 0},
                "lead_score": {"$gte": MIN_SCORE_TO_SEND},
                "$or": [
                    {"not_before_at": {"$exists": False}},
                    {"not_before_at": None},
                    {"not_before_at": {"$lte": now_s}},
                ],
            },
            {"_id": 0},
        ).sort("lead_score", -1).to_list(500)

    async def _finalize_cold_prospects() -> int:
        """After MAX_EMAILS_BEFORE_COLD emails + FU3 cadence elapsed, mark
        unresponsive prospects as 'cold' so they stop receiving outreach."""
        cutoff = (now_dt() - timedelta(days=FOLLOWUP_OFFSETS_DAYS[-1])).isoformat()
        r = await db.outbound_prospects.update_many(
            {
                "status": "contacted",
                "replied_at": None,
                "emails_sent": {"$gte": MAX_EMAILS_BEFORE_COLD},
                "last_email_at": {"$lte": cutoff},
            },
            {"$set": {"status": "cold", "updated_at": now_iso()}},
        )
        return r.modified_count

    async def _due_followups() -> List[Dict[str, Any]]:
        cutoffs = [
            (now_dt() - timedelta(days=FOLLOWUP_OFFSETS_DAYS[0])).isoformat(),
            (now_dt() - timedelta(days=FOLLOWUP_OFFSETS_DAYS[1])).isoformat(),
            (now_dt() - timedelta(days=FOLLOWUP_OFFSETS_DAYS[2])).isoformat(),
        ]
        q = {
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "replied_at": None,
            "status": {"$in": ["contacted"]},
            "last_email_at": {"$exists": True, "$ne": None},
        }
        due: List[Dict[str, Any]] = []
        async for p in db.outbound_prospects.find(q, {"_id": 0}):
            sent = int(p.get("emails_sent", 0))
            if sent < 1 or sent > 3:
                continue
            threshold = cutoffs[sent - 1]
            if p.get("last_email_at") and p["last_email_at"] <= threshold:
                due.append(p)
        return due

    async def _process_queue(batch_override: Optional[int] = None) -> int:
        """Returns number of emails sent this invocation. Respects daily limit +
        pause state + natural spacing.

        `batch_override`: when provided, overrides the natural-pacing batch
        size. Used by the manual `/autopilot-now` button so each click
        produces visible output instead of trickling 1-2 emails per tick."""
        state = await _state()
        if state.get("paused"):
            return 0
        daily_limit = int(state.get("daily_limit", DAILY_LIMIT_DEFAULT))
        sent_today = await _today_sent_count()
        remaining = daily_limit - sent_today
        if remaining <= 0:
            return 0

        if batch_override is not None and batch_override > 0:
            batch_size = min(remaining, batch_override)
        else:
            batch_size = min(remaining, max(1, daily_limit // max(1, SEND_WINDOW_HOURS * 2)))

        queue: List[tuple[Dict[str, Any], str, int]] = []
        # Initials first (sorted by lead_score desc)
        for p in (await _eligible_for_initial())[:batch_size]:
            queue.append((p, "initial", 0))
        if len(queue) < batch_size:
            for p in (await _due_followups())[: batch_size - len(queue)]:
                which = int(p.get("emails_sent", 0))  # 1 → followup_1, etc.
                queue.append((p, f"followup_{which}", which))

        sent_count = 0
        for p, kind, which in queue:
            try:
                included_demo = False
                if kind == "initial":
                    include_teaser = int(p.get("lead_score", 0)) >= 70
                    draft = await _draft_email(p, include_teaser)
                    included_demo = include_teaser
                else:
                    draft = await _draft_followup(p, which)
                    # FU2 (which==2) injects demo link when score >= 60
                    if which == 2 and int(p.get("lead_score", 0)) >= 60:
                        included_demo = True
                is_simulated = bool(re.search(r"\.example(?:\.com|\.org|\.net)?$", (p.get("email") or "").lower()))
                ok = await _send_one(p, draft["subject"], draft["body"], kind=kind)
                if ok:
                    sent_count += 1
                    if included_demo:
                        # Phase-6 demo tracking — log dedicated event + bump
                        # prospect doc so /performance.demos_sent reflects real
                        # demo deliveries, not just 2+ emails.
                        seg = p.get("target_segment") or "sales_team_agency"
                        demo_info = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
                        await _log_event(p["id"], "demo_sent", kind=kind, demo_route=demo_info["route"], demo_label=demo_info["label"])
                        await db.outbound_prospects.update_one(
                            {"id": p["id"]},
                            {"$set": {
                                "demo_sent_at": now_iso(),
                                "demo_route": demo_info["route"],
                                "demo_label": demo_info["label"],
                                "status": "demo_sent",
                            }, "$inc": {"demos_delivered": 1}},
                        )
                    # Natural spacing — only for real sends; simulated ones
                    # don't hit any provider so spacing is unnecessary.
                    if not is_simulated:
                        await asyncio.sleep(MIN_SEND_SPACING_SEC)
            except HTTPException:
                break
            except Exception as e:
                log.error(f"Queue item failed: {e}")
                continue

        await _maybe_auto_pause()
        await _finalize_cold_prospects()
        return sent_count

    # Expose the tick helper for the background scheduler.
    _TICK_HELPERS[id(router)] = _process_queue

    # ════════════════════════════════════════════════════════════════
    # ENDPOINTS
    # ════════════════════════════════════════════════════════════════

    @router.post("/state")
    async def get_state(payload: OpsAuth):
        await require_founder(payload)
        state = await _state()
        sent_today = await _today_sent_count()
        stats = await _deliverability_stats()
        return {"state": state, "sent_today": sent_today, "deliverability": stats}

    @router.post("/pause")
    async def pause_toggle(payload: PauseToggleIn):
        await require_founder(payload)
        await _set_state(paused=payload.paused, pause_reason=payload.reason)
        return {"ok": True, "paused": payload.paused}

    @router.post("/prospects/add")
    async def add_prospect(payload: ManualProspectIn):
        await require_founder(OpsAuth(email=payload.auth_email, token=payload.auth_token))
        email_n = payload.email.strip().lower()
        if await db.outbound_prospects.find_one({"email": email_n}):
            raise HTTPException(status_code=409, detail="Prospect with this email already exists")
        doc = {
            "id": str(uuid.uuid4()),
            "business_name": payload.business_name.strip(),
            "contact_name": (payload.contact_name or "").strip() or None,
            "email": email_n,
            "industry": payload.industry,
            "website": payload.website,
            "location": payload.location,
            "notes": payload.notes,
            "linkedin_url": payload.linkedin_url,
            "status": "new",
            "lead_score": None,
            "target_segment": None,
            "recommended_offer": None,
            "ai_reasoning": None,
            "estimated_pain": None,
            "suggested_pitch_angle": None,
            "emails_sent": 0,
            "email_status": None,
            "last_email_at": None,
            "replied_at": None,
            "reply_body": None,
            "reply_sentiment": None,
            "linkedin_connect_body": None,
            "linkedin_followup_body": None,
            "linkedin_connect_sent_at": None,
            "linkedin_followup_sent_at": None,
            "linkedin_accepted": False,
            "unsubscribed": False,
            "suppressed": False,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.outbound_prospects.insert_one(doc)
        return {"ok": True, "prospect_id": doc["id"]}

    @router.post("/prospects/upload")
    async def upload_prospects(auth_email: str, auth_token: str, file: UploadFile):
        await require_founder(OpsAuth(email=auth_email, token=auth_token))
        content = await file.read()
        try:
            text = content.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV encoding: {e}")
        reader = csv.DictReader(io.StringIO(text))
        added = 0
        skipped = 0
        errors: List[str] = []
        for row in reader:
            # Normalize key casing
            r = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
            email = (r.get("email") or r.get("contact email") or "").strip().lower()
            business = (r.get("business_name") or r.get("business") or r.get("company") or "").strip()
            if not email or "@" not in email or not business:
                skipped += 1
                continue
            if await db.outbound_prospects.find_one({"email": email}):
                skipped += 1
                continue
            doc = {
                "id": str(uuid.uuid4()),
                "business_name": business,
                "contact_name": r.get("contact_name") or r.get("name") or None,
                "email": email,
                "industry": r.get("industry") or None,
                "website": r.get("website") or r.get("url") or None,
                "location": r.get("location") or r.get("city") or None,
                "notes": r.get("notes") or None,
                "linkedin_url": r.get("linkedin_url") or r.get("linkedin") or None,
                "status": "new",
                "lead_score": None, "target_segment": None, "recommended_offer": None,
                "ai_reasoning": None, "estimated_pain": None, "suggested_pitch_angle": None,
                "emails_sent": 0, "email_status": None,
                "last_email_at": None, "replied_at": None, "reply_body": None,
                "reply_sentiment": None,
                "linkedin_connect_body": None, "linkedin_followup_body": None,
                "linkedin_connect_sent_at": None, "linkedin_followup_sent_at": None,
                "linkedin_accepted": False,
                "unsubscribed": False, "suppressed": False,
                "created_at": now_iso(), "updated_at": now_iso(),
            }
            try:
                await db.outbound_prospects.insert_one(doc)
                added += 1
            except Exception as e:
                errors.append(str(e)[:200])
        return {"ok": True, "added": added, "skipped": skipped, "errors": errors[:10]}

    @router.post("/prospects/list")
    async def list_prospects(payload: OpsAuth):
        await require_founder(payload)
        items = await db.outbound_prospects.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return {"items": items}

    @router.post("/prospects/score")
    async def score_prospect(payload: ProspectIdIn):
        await require_founder(payload)
        p = await db.outbound_prospects.find_one({"id": payload.prospect_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=404, detail="Prospect not found")
        scored = await _score_prospect(p)
        await db.outbound_prospects.update_one(
            {"id": p["id"]},
            {"$set": {**scored, "status": "scored", "updated_at": now_iso()}},
        )
        return {"ok": True, "score": scored}

    @router.post("/prospects/score-all")
    async def score_all(payload: OpsAuth):
        await require_founder(payload)
        cursor = db.outbound_prospects.find({"lead_score": None}, {"_id": 0})
        n = 0
        async for p in cursor:
            try:
                scored = await _score_prospect(p)
                await db.outbound_prospects.update_one(
                    {"id": p["id"]},
                    {"$set": {**scored, "status": "scored", "updated_at": now_iso()}},
                )
                n += 1
                if n >= 50:  # safety cap per invocation
                    break
            except Exception as e:
                log.error(f"score-all failed for {p.get('id')}: {e}")
                continue
        return {"ok": True, "scored": n}

    @router.post("/prospects/linkedin-generate")
    async def linkedin_generate(payload: ProspectIdIn):
        await require_founder(payload)
        p = await db.outbound_prospects.find_one({"id": payload.prospect_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=404, detail="Prospect not found")
        connect = await _draft_linkedin(p, "connect")
        followup = await _draft_linkedin(p, "followup")
        await db.outbound_prospects.update_one(
            {"id": p["id"]},
            {"$set": {
                "linkedin_connect_body": connect,
                "linkedin_followup_body": followup,
                "updated_at": now_iso(),
            }},
        )
        return {"ok": True, "connect_body": connect, "followup_body": followup}

    @router.post("/prospects/linkedin-mark-sent")
    async def linkedin_mark_sent(payload: ProspectIdIn, which: str = "connect"):
        await require_founder(payload)
        field = "linkedin_connect_sent_at" if which == "connect" else "linkedin_followup_sent_at"
        r = await db.outbound_prospects.update_one(
            {"id": payload.prospect_id},
            {"$set": {field: now_iso(), "updated_at": now_iso()}},
        )
        if not r.matched_count:
            raise HTTPException(status_code=404, detail="Prospect not found")
        await _log_event(payload.prospect_id, f"linkedin_{which}_sent")
        return {"ok": True}

    @router.post("/prospects/mark-replied")
    async def mark_replied(payload: ProspectReplyIn):
        await require_founder(payload)
        p = await db.outbound_prospects.find_one({"id": payload.prospect_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=404, detail="Prospect not found")

        # Normalize category — explicit category wins; otherwise infer from positive flag
        category = (payload.category or "").strip().lower() if payload.category else None
        if category and category not in REPLY_CATEGORIES:
            category = None
        if not category:
            if payload.positive is True:
                category = "positive"
            elif payload.positive is False:
                category = "not_interested"
            else:
                category = None

        status = REPLY_CATEGORY_TO_STATUS.get(category or "", "replied")
        sentiment = (
            "positive" if status == "replied_positive"
            else "negative" if status in ("not_interested", "unsubscribed")
            else "neutral"
        )

        await db.outbound_prospects.update_one(
            {"id": p["id"]},
            {"$set": {
                "status": status,
                "replied_at": now_iso(),
                "reply_body": payload.reply_body,
                "reply_sentiment": sentiment,
                "reply_category": category,
                "updated_at": now_iso(),
                **({"unsubscribed": True} if category == "unsubscribe" else {}),
                **({"suppressed": True} if category in ("unsubscribe", "not_interested") else {}),
            }},
        )
        await _log_event(p["id"], "replied", sentiment=status, category=category)

        # Auto-suppress hard exits
        if category in ("unsubscribe", "not_interested"):
            await _suppress(p["email"], reason=f"reply_{category}")

        # Positive → AI draft + founder notification (email + SMS if configured)
        if status == "replied_positive":
            try:
                draft = await _draft_positive_reply(p, payload.reply_body or "")
                await db.outbound_drafts.insert_one({
                    "id": str(uuid.uuid4()),
                    "prospect_id": p["id"],
                    "prospect_email": p["email"],
                    "business_name": p["business_name"],
                    "subject": draft["subject"],
                    "body": draft["body"],
                    "status": "pending",
                    "category": category,
                    "created_at": now_iso(),
                })
            except Exception as e:
                log.error(f"positive reply draft failed: {e}")

            # Founder email
            try:
                await send_founder_notification(
                    to_email=os.environ.get("FOUNDER_EMAIL", "").strip() or os.environ.get("APPLICATIONS_INBOX", "").strip(),
                    subject=f"[CreatorBoostAI] {category.replace('_', ' ').title()} reply · {p['business_name']}",
                    body_html=(
                        f"<p><strong>{p['business_name']}</strong> ({p['email']}) replied — category <code>{category}</code>.</p>"
                        f"<blockquote style='border-left:3px solid #06b6d4;padding-left:12px;color:#475569;'>{(payload.reply_body or '')[:800]}</blockquote>"
                        f"<p>AI draft queued in /portal/ops → Outbound → Drafts.</p>"
                    ),
                )
            except Exception:
                pass

            # Founder SMS via existing Twilio integration — fire-and-forget
            try:
                from sms_service import _send_sync as _sms_sync, sms_configured, normalize_phone
                phone = normalize_phone(os.environ.get("FOUNDER_PHONE", "").strip())
                if phone and sms_configured():
                    excerpt = (payload.reply_body or "")[:120].replace("\n", " ")
                    body = (
                        f"CreatorBoostAI · {category} reply from {p['business_name']}: "
                        f"\"{excerpt}\" · Approve in /portal/ops Outbound → Drafts"
                    )
                    await asyncio.to_thread(_sms_sync, phone, body)
            except Exception as e:
                log.error(f"founder SMS failed: {e}")

        return {"ok": True, "status": status, "category": category}

    @router.post("/drafts/list")
    async def drafts_list(payload: OpsAuth):
        await require_founder(payload)
        items = await db.outbound_drafts.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"items": items}

    @router.post("/drafts/approve")
    async def drafts_approve(payload: DraftApproveIn):
        await require_founder(payload)
        d = await db.outbound_drafts.find_one({"id": payload.draft_id}, {"_id": 0})
        if not d:
            raise HTTPException(status_code=404, detail="Draft not found")
        if d["status"] != "pending":
            raise HTTPException(status_code=409, detail="Draft not pending")
        p = await db.outbound_prospects.find_one({"id": d["prospect_id"]}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=404, detail="Prospect not found")
        body = (payload.edited_body or d["body"]).strip()
        ok = await _send_one(p, d["subject"], body, kind="reply")
        await db.outbound_drafts.update_one(
            {"id": d["id"]},
            {"$set": {"status": "sent" if ok else "failed", "sent_at": now_iso(), "final_body": body}},
        )
        return {"ok": ok}

    @router.post("/drafts/reject")
    async def drafts_reject(payload: DraftApproveIn):
        await require_founder(payload)
        r = await db.outbound_drafts.update_one(
            {"id": payload.draft_id, "status": "pending"},
            {"$set": {"status": "rejected", "rejected_at": now_iso()}},
        )
        if not r.matched_count:
            raise HTTPException(status_code=404, detail="Draft not found or not pending")
        return {"ok": True}

    async def _seed_demo_viewers(max_per_run: int = 100) -> Dict[str, Any]:
        """Scan demo_sessions + ops_leads for demo viewers who:
          · submitted an email
          · have NOT converted (no subscription / no purchase)
          · are not already in outbound_prospects or suppression
        Insert them as warm 'Warm – Demo Viewer' prospects scored 82+,
        tagged with source_demo, with not_before_at = 12-24h in the future."""
        added = 0
        skipped = 0
        seen_emails: set = set()

        async def _insert_one(*, email: str, name: Optional[str], company: Optional[str],
                              demo_type: Optional[str], source: str) -> bool:
            nonlocal added, skipped
            email_n = (email or "").strip().lower()
            if not email_n or "@" not in email_n or email_n in seen_emails:
                return False
            seen_emails.add(email_n)
            if await db.outbound_prospects.find_one({"email": email_n}, {"_id": 0, "id": 1}):
                skipped += 1
                return False
            if await db.outbound_suppression.find_one({"email": email_n}, {"_id": 0}):
                skipped += 1
                return False
            # Skip if they already converted (have a successful payment txn)
            converted = await db.payment_transactions.find_one(
                {"customer_email": email_n, "payment_status": {"$in": ["paid", "completed", "succeeded"]}},
                {"_id": 0, "id": 1},
            )
            if converted:
                skipped += 1
                return False

            seg = _segment_for_demo(demo_type)
            delay_hours = random.uniform(DEMO_VIEWER_DELAY_MIN_HRS, DEMO_VIEWER_DELAY_MAX_HRS)
            not_before = (now_dt() + timedelta(hours=delay_hours)).isoformat()

            doc = {
                "id": str(uuid.uuid4()),
                "business_name": (company or name or email_n.split("@")[0]).strip()[:240],
                "contact_name": (name or "").strip() or None,
                "email": email_n,
                "industry": SEGMENT_DISPLAY.get(seg, "—"),
                "website": None, "location": None, "linkedin_url": None,
                "notes": f"Auto-seeded from {source} · demo={demo_type or 'general'}",
                "source_demo": demo_type,
                "source": source,
                "status": "scored",
                "lead_score": DEMO_VIEWER_BASELINE_SCORE,
                "target_segment": seg,
                "recommended_offer": "Continuation of the demo they already explored",
                "ai_reasoning": f"Viewed {demo_type or 'a'} demo without converting — high intent warm lead",
                "estimated_pain": "Needs the outcome the demo showed",
                "suggested_pitch_angle": "Pick up where the demo left off",
                "emails_sent": 0, "email_status": None,
                "last_email_at": None, "replied_at": None, "reply_body": None,
                "reply_sentiment": None,
                "linkedin_connect_body": None, "linkedin_followup_body": None,
                "linkedin_connect_sent_at": None, "linkedin_followup_sent_at": None,
                "linkedin_accepted": False,
                "unsubscribed": False, "suppressed": False,
                "not_before_at": not_before,
                "seeded_from_demo": True,
                "created_at": now_iso(), "updated_at": now_iso(),
            }
            try:
                await db.outbound_prospects.insert_one(doc)
                added += 1
                return True
            except Exception as e:
                log.error(f"demo-seed insert failed: {e}")
                return False

        # Source 1 — demo_sessions with recipient_email (shared-link viewers)
        cutoff = (now_dt() - timedelta(days=60)).isoformat()
        async for s in db.demo_sessions.find(
            {
                "recipient_email": {"$nin": [None, ""]},
                "started_at": {"$gte": cutoff},
            },
            {"_id": 0, "recipient_email": 1, "recipient_name": 1, "recipient_company": 1, "demo_type": 1},
        ):
            if added >= max_per_run:
                break
            await _insert_one(
                email=s.get("recipient_email") or "",
                name=s.get("recipient_name"),
                company=s.get("recipient_company"),
                demo_type=(s.get("demo_type") or "").lower() or None,
                source="demo_session",
            )

        # Source 2 — ops_leads with source_demo populated (demo-attributed leads
        # that haven't closed_won).
        if added < max_per_run:
            async for lead in db.ops_leads.find(
                {
                    "contact_email": {"$nin": [None, ""]},
                    "source_demo": {"$nin": [None, ""]},
                    "status": {"$nin": ["won", "closed_won"]},
                    "created_at": {"$gte": cutoff},
                },
                {"_id": 0, "contact_email": 1, "contact_name": 1, "company": 1, "source_demo": 1},
            ):
                if added >= max_per_run:
                    break
                await _insert_one(
                    email=lead.get("contact_email") or "",
                    name=lead.get("contact_name"),
                    company=lead.get("company"),
                    demo_type=(lead.get("source_demo") or "").lower() or None,
                    source="ops_lead",
                )

        return {"added": added, "skipped": skipped}

    def _segment_for_demo(demo_type: Optional[str]) -> str:
        """Map a demo_type string back to a target_segment key."""
        if not demo_type:
            return "sales_team_agency"
        d = demo_type.lower()
        mapping = {
            "realtor": "realtor",
            "insurance": "insurance_agent",
            "creator": "creator_influencer",
            "influencer": "creator_influencer",
            "noldus": "sales_team_agency",
            "enterprise": "sales_team_agency",
            "supermarket": "supermarket_grocery",
            "grocery": "supermarket_grocery",
            "retail": "retail_chain",
            "cstore": "c_store",
            "c_store": "c_store",
            "airport": "airport_enterprise",
            "contractor": "contractor_service",
            "lighting": "contractor_service",
            "education": "education_school",
            "school": "education_school",
            "university": "education_school",
        }
        return mapping.get(d, "sales_team_agency")

    @router.post("/seed-from-demos")
    async def seed_from_demos(payload: OpsAuth):
        await require_founder(payload)
        r = await _seed_demo_viewers(max_per_run=100)
        return {"ok": True, **r}

    async def _seed_internal_leads(max_per_run: int = 15) -> Dict[str, Any]:
        """Phase A fallback — generates synthetic prospects across 4 high-priority
        target industries so the autopilot has fuel to demonstrate execution
        even before Apollo / Outscraper keys are added.

        Each generated prospect:
          · Uses an RFC-2606 reserved `.example.com` email — never delivers
            to a real recipient even if Resend is configured. Counters still
            increment via simulation logic in `_send_one`.
          · Tags `source='internal_seed'` for filtering.
          · Caps total internal-seeded prospects at INTERNAL_LEAD_CAP to avoid
            runaway pollution. Disable entirely with `INTERNAL_LEAD_GEN=off`.
        """
        if os.environ.get("INTERNAL_LEAD_GEN", "on").lower() == "off":
            return {"added": 0, "skipped": 0, "reason": "disabled"}

        cap = int(os.environ.get("INTERNAL_LEAD_CAP", "200"))
        existing_internal = await db.outbound_prospects.count_documents({"source": "internal_seed"})
        if existing_internal >= cap:
            return {"added": 0, "skipped": 0, "reason": "cap_reached"}

        # 5 high-priority target industries × sample businesses + roles.
        INDUSTRY_SAMPLES = [
            ("c_store", "C-Store", [
                ("QuickStop Mart",            "Operations Director"),
                ("Mid-Town Convenience",      "Owner"),
                ("FastLane Fuel & Snacks",    "Regional Manager"),
                ("CornerStop 24",             "VP Operations"),
                ("PitStop Express",           "General Manager"),
            ]),
            ("supermarket_grocery", "Supermarket", [
                ("Heritage Foods Market",     "Director of Ops"),
                ("Greenway Grocery Group",    "VP Operations"),
                ("Family Mart Supermarkets",  "Chief Operating Officer"),
                ("Riverside Grocery Co-op",   "General Manager"),
                ("Harborside Foods Holdings", "VP Revenue"),
            ]),
            ("airport_enterprise", "Airport / Aviation", [
                ("Midwest Regional Airport Authority", "Director of Concessions"),
                ("Coastal Aviation Services",          "Operations Lead"),
                ("Skyline Airport Holdings",           "VP Revenue"),
                ("Plateau Airfield Operations",        "Chief Commercial Officer"),
                ("Capitol Aviation Group",             "Director of Retail"),
            ]),
            ("contractor_service", "Contractor / Service", [
                ("Apex Lighting & Electrical", "Owner"),
                ("Premier Maintenance Group",  "VP Operations"),
                ("Westridge Service Co",       "President"),
                ("Cascade Building Services",  "Director of Operations"),
                ("Beacon Facilities Group",    "Chief Operating Officer"),
            ]),
            ("education_school", "Education / School District", [
                ("Northridge Unified School District",   "Superintendent"),
                ("Heritage Charter Academy Network",     "Director of Operations"),
                ("Pacific Preparatory School",           "Head of School"),
                ("Summit University System",             "VP Facilities & Operations"),
                ("Clearwater Public Schools",            "Chief Financial Officer"),
            ]),
        ]

        # Interleave across all industries so each one gets representation
        # per run. Previous implementation was industry-serial which meant
        # later industries (Education) never got seeded when max_per_run
        # was smaller than the first few industries' business counts.
        added = 0
        skipped = 0
        max_business_idx = max(len(biz) for _, _, biz in INDUSTRY_SAMPLES)
        for b_idx in range(max_business_idx):
            if added >= max_per_run:
                break
            for segment, label, businesses in INDUSTRY_SAMPLES:
                if added >= max_per_run:
                    break
                if b_idx >= len(businesses):
                    continue
                if added + existing_internal >= cap:
                    break
                business_name, role = businesses[b_idx]
                slug = re.sub(r"[^a-z0-9]", "", business_name.lower())[:24]
                tag = secrets.token_hex(3)
                email = f"ops+{tag}@{slug}.example.com"
                if await db.outbound_prospects.find_one({"email": email}, {"_id": 0, "id": 1}):
                    skipped += 1
                    continue
                doc = {
                    "id": str(uuid.uuid4()),
                    "business_name": business_name,
                    "contact_name": None,
                    "email": email,
                    "industry": label,
                    "website": f"https://www.{slug}.example.com",
                    "location": None,
                    "linkedin_url": None,
                    "notes": f"Auto-generated internal seed (Phase A · {segment})",
                    "source": "internal_seed",
                    "role": role,
                    "status": "new",
                    "lead_score": None, "target_segment": None,
                    "recommended_offer": None, "ai_reasoning": None,
                    "estimated_pain": None, "suggested_pitch_angle": None,
                    "emails_sent": 0, "email_status": None,
                    "last_email_at": None, "replied_at": None, "reply_body": None,
                    "reply_sentiment": None, "reply_category": None,
                    "linkedin_connect_body": None, "linkedin_followup_body": None,
                    "linkedin_connect_sent_at": None, "linkedin_followup_sent_at": None,
                    "linkedin_accepted": False,
                    "unsubscribed": False, "suppressed": False,
                    "created_at": now_iso(), "updated_at": now_iso(),
                }
                try:
                    await db.outbound_prospects.insert_one(doc)
                    added += 1
                except Exception as e:
                    log.error(f"[internal_seed] insert failed: {e}")
                    skipped += 1
        return {"added": added, "skipped": skipped}

    async def _autopilot_cycle() -> Dict[str, Any]:
        """One complete autonomous pass: seed → score-unscored → run send queue
        → finalize cold → IMAP poll. Each step is independent and failures are
        logged but never raise — the loop continues so the engine keeps moving
        every day even when one external dep is down."""
        result: Dict[str, Any] = {"started_at": now_iso()}

        # Step 1 · seed warm leads from demo viewers
        try:
            r = await _seed_demo_viewers(max_per_run=50)
            result["seeded"] = r
        except Exception as e:
            log.error(f"[autopilot] seed failed: {e}")
            result["seeded"] = {"error": str(e)[:240]}

        # Step 1.5 · internal lead generator (Phase A fallback fuel) — runs
        # only when the demo-viewer seed didn't add anything new.
        try:
            internal_count = int(os.environ.get("INTERNAL_LEAD_PER_RUN", "10"))  # Phase A · Low Credit Mode
            r2 = await _seed_internal_leads(max_per_run=internal_count)
            result["internal_seeded"] = r2
            # Fold into the seeded counter so the dashboard "Last cycle"
            # accurately reflects fresh fuel injected this cycle.
            result["seeded"]["added"] = (result["seeded"].get("added") or 0) + (r2.get("added") or 0)
        except Exception as e:
            log.error(f"[autopilot] internal seed failed: {e}")
            result["internal_seeded"] = {"error": str(e)[:240]}

        # Step 2 · external lead-source pulls (Apollo / Outscraper) — currently
        # safe no-ops until keys land. Each adapter returns [] when not configured.
        try:
            from lead_sources import LEAD_SOURCES, configured_status
            ext_added = 0
            for adapter in LEAD_SOURCES:
                if not adapter.is_configured():
                    continue
                rows = await adapter.pull(limit=25, segments=TARGET_SEGMENTS)
                for row in rows:
                    email_n = (row.get("email") or "").strip().lower()
                    if not email_n or "@" not in email_n:
                        continue
                    if await db.outbound_prospects.find_one({"email": email_n}, {"_id": 0, "id": 1}):
                        continue
                    if await db.outbound_suppression.find_one({"email": email_n}, {"_id": 0}):
                        continue
                    doc = {
                        "id": str(uuid.uuid4()),
                        "business_name": (row.get("business_name") or "")[:240],
                        "contact_name": row.get("contact_name"),
                        "email": email_n,
                        "industry": row.get("industry"),
                        "website": row.get("website"),
                        "location": row.get("location"),
                        "linkedin_url": row.get("linkedin_url"),
                        "notes": row.get("notes"),
                        "source": adapter.name,
                        "status": "new", "lead_score": None, "target_segment": None,
                        "recommended_offer": None, "ai_reasoning": None,
                        "estimated_pain": None, "suggested_pitch_angle": None,
                        "emails_sent": 0, "email_status": None,
                        "last_email_at": None, "replied_at": None, "reply_body": None,
                        "reply_sentiment": None, "reply_category": None,
                        "linkedin_connect_body": None, "linkedin_followup_body": None,
                        "linkedin_connect_sent_at": None, "linkedin_followup_sent_at": None,
                        "linkedin_accepted": False,
                        "unsubscribed": False, "suppressed": False,
                        "created_at": now_iso(), "updated_at": now_iso(),
                    }
                    try:
                        await db.outbound_prospects.insert_one(doc)
                        ext_added += 1
                    except Exception as e:
                        log.error(f"[autopilot] external insert failed: {e}")
            result["external_added"] = ext_added
            result["sources_configured"] = configured_status()
        except Exception as e:
            log.error(f"[autopilot] external sources failed: {e}")
            result["external_added"] = 0

        # Step 3 · score everything unscored
        try:
            cursor = db.outbound_prospects.find({"lead_score": None}, {"_id": 0})
            scored_n = 0
            async for p in cursor:
                try:
                    scored = await _score_prospect(p)
                    await db.outbound_prospects.update_one(
                        {"id": p["id"]},
                        {"$set": {**scored, "status": "scored", "updated_at": now_iso()}},
                    )
                    scored_n += 1
                    if scored_n >= 50:
                        break
                except Exception:
                    continue
            result["scored"] = scored_n
        except Exception as e:
            log.error(f"[autopilot] score failed: {e}")
            result["scored"] = 0

        # Step 4 · process send queue
        try:
            # Manual autopilot-now click → controlled burst (5 in Low-Credit
            # Mode). Background loop keeps natural 1-2-per-tick pacing for
            # safe deliverability.
            burst = int(os.environ.get("AUTOPILOT_BURST_BATCH", "5"))
            sent_now = await _process_queue(batch_override=burst)
            result["sent_this_cycle"] = sent_now
        except Exception as e:
            log.error(f"[autopilot] send queue failed: {e}")
            result["sent_this_cycle"] = 0

        # Step 5 · IMAP poll for replies (best-effort, graceful when unconfigured)
        try:
            from outbound import _imap_poll_once  # late import to avoid recursion
            imap = await _imap_poll_once(db)
            result["imap"] = imap
        except Exception as e:
            log.error(f"[autopilot] imap poll failed: {e}")
            result["imap"] = {"ok": False, "reason": "exception"}

        # Step 6 · finalize cold (already runs inside _process_queue but called again here for safety)
        try:
            cold_n = await _finalize_cold_prospects()
            result["cold_finalized"] = cold_n
        except Exception as e:
            log.error(f"[autopilot] finalize cold failed: {e}")
            result["cold_finalized"] = 0

        result["finished_at"] = now_iso()
        result["sent_today"] = await _today_sent_count()
        # Diagnostic reasons explaining why any step might have produced 0
        reasons: List[str] = []
        if (result.get("seeded") or {}).get("added", 0) == 0 and (result.get("internal_seeded") or {}).get("added", 0) == 0:
            r = (result.get("internal_seeded") or {}).get("reason")
            if r == "cap_reached":
                reasons.append("internal_cap_reached")
            else:
                reasons.append("no_fresh_demo_viewers")
        if result.get("scored", 0) == 0:
            reasons.append("nothing_to_score")
        if result.get("sent_this_cycle", 0) == 0:
            state = await _state()
            if state.get("paused"):
                reasons.append("engine_paused")
            elif result["sent_today"] >= int(state.get("daily_limit", DAILY_LIMIT_DEFAULT)):
                reasons.append("daily_cap_reached")
            else:
                reasons.append("no_eligible_prospects_to_send")
        result["reasons"] = reasons
        return result

    @router.post("/autopilot-now")
    async def autopilot_now(payload: OpsAuth):
        """Run a complete autopilot cycle. The cycle is kicked off as a
        background task so the HTTP request returns immediately (Claude
        scoring + drafting can take 60-120s, longer than most Kubernetes
        ingress timeouts). The frontend polls /dashboard for `last_autopilot_run`
        to see fresh counts. Set `?wait=1` to block synchronously instead."""
        await require_founder(payload)
        run_id = str(uuid.uuid4())

        # Mark this run as 'running' immediately so the dashboard sees it
        await db.outbound_autopilot_runs.insert_one({
            "id": run_id,
            "started_at": now_iso(),
            "status": "running",
        })

        async def _run_and_persist():
            try:
                r = await _autopilot_cycle()
                await db.outbound_autopilot_runs.update_one(
                    {"id": run_id},
                    {"$set": {**r, "status": "completed"}},
                )
            except Exception as e:
                log.error(f"[autopilot] background run failed: {e}")
                await db.outbound_autopilot_runs.update_one(
                    {"id": run_id},
                    {"$set": {"status": "failed", "error": str(e)[:400], "finished_at": now_iso()}},
                )

        asyncio.create_task(_run_and_persist())
        return {"ok": True, "status": "running", "run_id": run_id, "message": "Autopilot cycle started — check Last cycle in 60-120s"}

    @router.post("/autopilot-history")
    async def autopilot_history(payload: OpsAuth):
        await require_founder(payload)
        runs = await db.outbound_autopilot_runs.find(
            {}, {"_id": 0}
        ).sort("started_at", -1).to_list(20)
        return {"runs": runs}

    @router.post("/sources-status")
    async def sources_status(payload: OpsAuth):
        await require_founder(payload)
        from lead_sources import configured_status
        return {"sources": configured_status()}

    @router.post("/admin/archive-internal")
    async def admin_archive_internal(payload: OpsAuth):
        """Migration · move all internal-seed test prospects to source='internal_archived'
        so KPIs reset to real-source-only. Adds them to the suppression list so they
        cannot accidentally receive future autopilot emails. Frees up the internal-cap
        room so the next 'Run autopilot now' produces fresh seeds."""
        await require_founder(payload)
        # Find all internal seeds
        cursor = db.outbound_prospects.find({"source": "internal_seed"}, {"_id": 0, "id": 1, "email": 1})
        ids: List[str] = []
        emails: List[str] = []
        async for r in cursor:
            ids.append(r["id"])
            emails.append(r["email"])
        if not ids:
            return {"ok": True, "archived": 0, "message": "no internal seeds to archive"}
        # Archive them
        await db.outbound_prospects.update_many(
            {"id": {"$in": ids}},
            {"$set": {
                "source": "internal_archived",
                "status": "archived",
                "suppressed": True,
                "updated_at": now_iso(),
            }},
        )
        # Suppress emails so they cannot be re-targeted
        for e in emails:
            await db.outbound_suppression.update_one(
                {"email": e},
                {"$set": {"reason": "internal_archived", "updated_at": now_iso()}},
                upsert=True,
            )
        return {"ok": True, "archived": len(ids)}

    @router.post("/admin/reset-daily-counter")
    async def admin_reset_daily_counter(payload: OpsAuth):
        """Testing helper — clears today's `sent` event records so the daily 50/day
        cap resets. Use this only when verifying autopilot execution; in production
        the cap should be respected to protect deliverability."""
        await require_founder(payload)
        r = await db.outbound_events.delete_many({"type": "sent", "day_key": today_key()})
        return {"ok": True, "deleted": r.deleted_count}

    @router.post("/admin/set-daily-limit")
    async def admin_set_daily_limit(payload: Dict[str, Any] = Body(...)):
        """Update the engine's daily send cap. Pass {limit: int}. Used by the
        'Low Credit Mode' preset and any future scaling controls."""
        class _A:
            email = (payload.get("email") or "").strip()
            token = (payload.get("token") or "").strip()
        await require_founder(_A())
        try:
            limit = int(payload.get("limit", DAILY_LIMIT_DEFAULT))
        except (TypeError, ValueError):
            raise HTTPException(400, "limit must be an integer")
        limit = max(1, min(limit, 1000))
        await db.outbound_campaign_state.update_one(
            {}, {"$set": {"daily_limit": limit, "updated_at": now_iso()}}, upsert=True,
        )
        return {"ok": True, "daily_limit": limit}

    @router.post("/admin/diagnostics")
    async def admin_diagnostics(payload: OpsAuth):
        """Returns the exact reasons the next autopilot cycle might produce 0
        seeded / 0 scored / 0 sent — so the founder can see why and reset."""
        await require_founder(payload)
        state = await _state()
        sent_today = await _today_sent_count()
        daily_limit = int(state.get("daily_limit", DAILY_LIMIT_DEFAULT))
        unscored = await db.outbound_prospects.count_documents({"lead_score": None})
        internal_count = await db.outbound_prospects.count_documents({"source": "internal_seed"})
        internal_archived = await db.outbound_prospects.count_documents({"source": "internal_archived"})
        eligible_initial = await db.outbound_prospects.count_documents({
            "status": {"$in": ["new", "scored"]},
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "emails_sent": {"$lte": 0},
            "lead_score": {"$gte": MIN_SCORE_TO_SEND},
        })
        cap = int(os.environ.get("INTERNAL_LEAD_CAP", "200"))
        return {
            "paused": bool(state.get("paused")),
            "daily_limit": daily_limit,
            "sent_today": sent_today,
            "remaining_today": max(0, daily_limit - sent_today),
            "unscored_prospects": unscored,
            "eligible_for_initial_send": eligible_initial,
            "min_score_to_send": MIN_SCORE_TO_SEND,
            "internal_seed_count": internal_count,
            "internal_archived_count": internal_archived,
            "internal_cap": cap,
            "internal_cap_remaining": max(0, cap - internal_count),
            "blockers": [
                *(["paused"] if state.get("paused") else []),
                *(["daily_cap_reached"] if sent_today >= daily_limit else []),
                *(["internal_cap_reached"] if internal_count >= cap else []),
                *(["nothing_to_send"] if eligible_initial == 0 else []),
            ],
        }

    @router.post("/admin/self-test-e2e")
    async def admin_self_test_e2e(payload: Dict[str, Any] = Body(...)):
        """End-to-end validation of the demo → capture → score → send pipeline.
        Body: {email, token, test_email, demo? defaults to 'education', send_real_email? bool}.
        Returns step-by-step trace so Jeffrey can verify each phase from one URL.
        When send_real_email=true AND RESEND_API_KEY is set, fires a real email
        to test_email via the outbound sender."""
        class _A:
            email = (payload.get("email") or "").strip()
            token = (payload.get("token") or "").strip()
        await require_founder(_A())
        test_email = (payload.get("test_email") or "").strip().lower()
        if "@" not in test_email:
            raise HTTPException(400, "test_email required")
        demo_key = (payload.get("demo") or "education").strip().lower()
        send_real = bool(payload.get("send_real_email"))

        trace: Dict[str, Any] = {"test_email": test_email, "demo": demo_key}

        # Step 1 · simulate a page view
        await db.demo_page_views.insert_one({
            "id": str(uuid.uuid4()), "demo": demo_key, "scene": 0,
            "referrer": "self-test", "ip": None, "ua": "self-test",
            "created_at": now_iso(),
        })
        trace["step1_view_logged"] = True

        # Step 2 · simulate a capture
        segment = _segment_for_demo(demo_key)
        existing = await db.outbound_prospects.find_one({"email": test_email}, {"_id": 0, "id": 1})
        if existing:
            # Clean slate for this test — remove the existing record so we can trace end-to-end
            await db.outbound_prospects.delete_one({"email": test_email})
        prospect_id = str(uuid.uuid4())
        demo_info = DEMO_MAP.get(segment) or DEMO_MAP["sales_team_agency"]
        doc = {
            "id": prospect_id,
            "business_name": f"Self-Test · {test_email.split('@')[1]}",
            "contact_name": "Self Test",
            "email": test_email,
            "industry": demo_key,
            "source": "demo_capture",
            "source_demo": demo_key,
            "captured_from_demo": True,
            "intent": "high",
            "status": "scored",
            "lead_score": 85,
            "target_segment": segment,
            "recommended_offer": f"Continuation of the {demo_key} demo",
            "ai_reasoning": "self-test",
            "estimated_pain": "needs the outcome the demo illustrated",
            "suggested_pitch_angle": "pick up where the demo left off",
            "emails_sent": 0, "email_status": None,
            "last_email_at": None, "replied_at": None,
            "unsubscribed": False, "suppressed": False,
            "not_before_at": now_iso(),  # eligible immediately for the self-test
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        await db.outbound_prospects.insert_one(doc)
        trace["step2_prospect_id"] = prospect_id
        trace["step2_segment"] = segment
        trace["step2_demo_route"] = demo_info["route"]

        # Step 3 · draft the outreach email
        draft = await _draft_email(doc, include_teaser=True)
        trace["step3_drafted_subject"] = draft.get("subject")
        trace["step3_body_preview"] = (draft.get("body") or "")[:400]
        trace["step3_calendly_included"] = bool(os.environ.get("CALENDLY_URL", "").strip()) and (
            os.environ.get("CALENDLY_URL", "").strip() in (draft.get("body") or "")
        )

        # Step 4 · optionally fire a REAL email (Phase 10 validation)
        trace["step4_send_requested"] = send_real
        trace["step4_resend_configured"] = bool(os.environ.get("RESEND_API_KEY", "").strip())
        if send_real and trace["step4_resend_configured"]:
            ok = await _send_one(doc, draft["subject"], draft["body"], kind="initial")
            trace["step4_sent"] = bool(ok)
        elif send_real:
            trace["step4_sent"] = False
            trace["step4_error"] = "RESEND_API_KEY not configured in this environment"
        else:
            trace["step4_sent"] = False
            trace["step4_note"] = "skipped (send_real_email=false)"

        return {"ok": True, "trace": trace}

    # ── Clay inbound webhook ── public, secret-gated. Clay → POST → outbound.
    @router.post("/clay-webhook")
    async def clay_webhook(body: Dict[str, Any]):
        from lead_sources import ClayAdapter
        secret = (body.get("secret") or "").strip()
        if not ClayAdapter.is_configured():
            raise HTTPException(503, "Clay webhook not configured (set CLAY_WEBHOOK_SECRET)")
        if not ClayAdapter.secret_matches(secret):
            raise HTTPException(403, "Invalid Clay webhook secret")
        rows = body.get("leads") or body.get("rows") or [body.get("lead") or {}]
        if not isinstance(rows, list):
            rows = [rows]
        added, skipped = 0, 0
        for row in rows[:200]:  # cap per request
            norm = ClayAdapter.normalize(row)
            if not norm:
                skipped += 1
                continue
            if await db.outbound_prospects.find_one({"email": norm["email"]}, {"_id": 0, "id": 1}):
                skipped += 1
                continue
            if await db.outbound_suppression.find_one({"email": norm["email"]}, {"_id": 0}):
                skipped += 1
                continue
            doc = {
                "id": str(uuid.uuid4()),
                **norm,
                "status": "new", "lead_score": None, "target_segment": None,
                "recommended_offer": None, "ai_reasoning": None,
                "estimated_pain": None, "suggested_pitch_angle": None,
                "emails_sent": 0, "email_status": None,
                "last_email_at": None, "replied_at": None, "reply_body": None,
                "reply_sentiment": None, "reply_category": None,
                "linkedin_connect_body": None, "linkedin_followup_body": None,
                "linkedin_connect_sent_at": None, "linkedin_followup_sent_at": None,
                "linkedin_accepted": False,
                "unsubscribed": False, "suppressed": False,
                "created_at": now_iso(), "updated_at": now_iso(),
            }
            try:
                await db.outbound_prospects.insert_one(doc)
                added += 1
            except Exception as e:
                log.error(f"[clay] insert failed: {e}")
                skipped += 1
        return {"ok": True, "added": added, "skipped": skipped}

    @router.post("/run-tick")
    async def run_tick(payload: OpsAuth):
        """Legacy single-step send tick (preserved for backwards compat).
        Use /autopilot-now for the full daily cycle."""
        await require_founder(payload)
        sent = await _process_queue()
        return {"ok": True, "sent_this_tick": sent, "sent_today": await _today_sent_count()}

    @router.post("/dashboard")
    async def dashboard(payload: OpsAuth):
        await require_founder(payload)
        # KPI rollup
        total = await db.outbound_prospects.count_documents({})
        scored = await db.outbound_prospects.count_documents({"lead_score": {"$ne": None}})
        contacted = await db.outbound_prospects.count_documents({"emails_sent": {"$gte": 1}})
        replied = await db.outbound_prospects.count_documents({"replied_at": {"$ne": None}})
        positive = await db.outbound_prospects.count_documents({"status": "replied_positive"})
        not_interested = await db.outbound_prospects.count_documents({"status": "not_interested"})
        unsubs = await db.outbound_prospects.count_documents({"unsubscribed": True})
        state = await _state()
        stats = await _deliverability_stats()
        # Segment breakdown
        seg_pipeline = [
            {"$match": {"target_segment": {"$ne": None}}},
            {"$group": {"_id": "$target_segment", "n": {"$sum": 1}, "avg_score": {"$avg": "$lead_score"}}},
        ]
        seg_agg = await db.outbound_prospects.aggregate(seg_pipeline).to_list(50)
        segments = [{"segment": r["_id"], "count": r["n"], "avg_score": round(r.get("avg_score") or 0, 1)} for r in seg_agg]
        # Warm leads
        warm = await db.outbound_prospects.find(
            {"status": {"$in": ["replied_positive", "replied"]}}, {"_id": 0}
        ).sort("replied_at", -1).to_list(50)
        # Last autopilot run
        last_run = await db.outbound_autopilot_runs.find_one(
            {}, {"_id": 0}, sort=[("started_at", -1)]
        )
        # Lead-source configuration status
        try:
            from lead_sources import configured_status
            sources_cfg = configured_status()
        except Exception:
            sources_cfg = {}
        return {
            "kpi": {
                "total_prospects": total,
                "scored": scored,
                "contacted": contacted,
                "replied": replied,
                "positive": positive,
                "not_interested": not_interested,
                "unsubscribed": unsubs,
                "reply_rate": round((replied / contacted), 4) if contacted else 0,
                "positive_rate": round((positive / replied), 4) if replied else 0,
            },
            "state": state,
            "deliverability": stats,
            "segments": segments,
            "warm_leads": warm,
            "sent_today": await _today_sent_count(),
            "last_autopilot_run": last_run,
            "sources_configured": sources_cfg,
        }

    # Public unsubscribe — no auth, uses deterministic token.
    @router.get("/unsubscribe/{token}")
    async def unsubscribe(token: str, e: str = ""):
        if not e:
            return {"ok": False, "error": "missing email"}
        if _unsubscribe_token(e) != token:
            raise HTTPException(status_code=403, detail="Invalid unsubscribe token")
        await _suppress(e, reason="user_unsubscribed")
        await db.outbound_prospects.update_many(
            {"email": e.strip().lower()},
            {"$set": {"unsubscribed": True, "status": "unsubscribed", "updated_at": now_iso()}},
        )
        # Log event against any prospect with that email
        async for p in db.outbound_prospects.find({"email": e.strip().lower()}, {"id": 1, "_id": 0}):
            await _log_event(p["id"], "unsubscribed")
        return {
            "ok": True,
            "message": "You have been unsubscribed. We will not email you again.",
        }

    # Expose the autopilot helper now that _autopilot_cycle is defined.
    _AUTOPILOT_HELPERS[id(router)] = _autopilot_cycle

    return router


# ════════════════════════════════════════════════════════════════════
# BACKGROUND SCHEDULER — server.py spawns this on startup
# ════════════════════════════════════════════════════════════════════
async def _standalone_process_queue(db, send_outbound_email, send_founder_notification) -> int:
    """Mirror of _process_queue without router closures — for the bg loop.
    Duplicates a small amount of logic but keeps scheduling simple and safe."""
    state = await db.outbound_campaign_state.find_one({"_id": "state"}, {"_id": 0}) or {"paused": False}
    if state.get("paused"):
        return 0
    router = make_outbound_router(db, send_outbound_email, send_founder_notification, _NOOP_REQUIRE_FOUNDER)
    # Pull the auth-bypass tick helper out of the router
    tick_fn = _TICK_HELPERS.get(id(router))
    if not tick_fn:
        return 0
    return await tick_fn()


async def _NOOP_REQUIRE_FOUNDER(_payload):  # pragma: no cover
    return {"role": "founder", "email": "scheduler@system"}


_TICK_HELPERS: Dict[int, Any] = {}


async def background_scheduler_loop(
    db, send_outbound_email, send_founder_notification, interval_sec: int = 300
) -> None:
    """Every `interval_sec`, calls the internal tick helper. Respects daily
    limit + pause state. Disabled when OUTBOUND_SCHEDULER=off."""
    if os.environ.get("OUTBOUND_SCHEDULER", "on").lower() == "off":
        log.info("[outbound] scheduler disabled by env")
        return
    log.info("[outbound] scheduler loop starting")
    while True:
        try:
            await _standalone_process_queue(db, send_outbound_email, send_founder_notification)
        except Exception as e:
            log.error(f"[outbound] scheduler tick error: {e}")
        await asyncio.sleep(interval_sec + random.randint(-15, 15))


# ════════════════════════════════════════════════════════════════════
# IMAP REPLY POLLER — Phase 2 light implementation
# ════════════════════════════════════════════════════════════════════
async def _imap_poll_once(db) -> Dict[str, Any]:
    """Connect to IMAP, scan UNSEEN messages in INBOX, match sender email to
    a known prospect, and record a reply + enqueue a draft. Best-effort: any
    misconfig or error returns `{ok: False, reason: '...'}` instead of raising."""
    host = os.environ.get("IMAP_HOST", "").strip()
    user = os.environ.get("IMAP_USER", "").strip()
    password = os.environ.get("IMAP_PASSWORD", "").strip()
    if not (host and user and password):
        return {"ok": False, "reason": "imap_not_configured"}

    import imaplib
    import email as stdlib_email
    from email.header import decode_header

    def _decode(s):
        if not s:
            return ""
        parts = decode_header(s)
        out = ""
        for p, enc in parts:
            if isinstance(p, bytes):
                try:
                    out += p.decode(enc or "utf-8", errors="ignore")
                except Exception:
                    out += p.decode("utf-8", errors="ignore")
            else:
                out += p
        return out

    def _blocking_scan() -> List[Dict[str, str]]:
        results: List[Dict[str, str]] = []
        try:
            M = imaplib.IMAP4_SSL(host, int(os.environ.get("IMAP_PORT", "993")))
            M.login(user, password)
            M.select("INBOX")
            typ, data = M.search(None, "UNSEEN")
            if typ != "OK":
                M.logout()
                return []
            ids = data[0].split()
            for uid in ids[-50:]:  # cap per tick
                typ, msg_data = M.fetch(uid, "(RFC822)")
                if typ != "OK" or not msg_data or not msg_data[0]:
                    continue
                raw = msg_data[0][1]
                msg = stdlib_email.message_from_bytes(raw)
                from_addr = stdlib_email.utils.parseaddr(msg.get("From", ""))[1].lower()
                subject = _decode(msg.get("Subject", ""))[:240]
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            try:
                                body = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="ignore")
                                break
                            except Exception:
                                continue
                else:
                    try:
                        body = msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", errors="ignore")
                    except Exception:
                        body = ""
                results.append({"from": from_addr, "subject": subject, "body": body[:4000], "uid": uid.decode()})
            M.logout()
        except Exception as e:
            log.error(f"[imap] scan failed: {e}")
            return []
        return results

    loop = asyncio.get_event_loop()
    messages = await loop.run_in_executor(None, _blocking_scan)

    matched = 0
    for m in messages:
        prospect = await db.outbound_prospects.find_one({"email": m["from"]}, {"_id": 0})
        if not prospect:
            continue
        if prospect.get("replied_at"):
            continue  # already recorded
        # Rudimentary sentiment heuristic: look for keywords
        b = m["body"].lower()
        positive = any(k in b for k in ("interested", "sounds good", "yes", "tell me more", "let's", "book", "call"))
        negative = any(k in b for k in ("unsubscribe", "remove me", "not interested", "stop", "no thanks"))
        # "Reply YES" / "YES" shortcut — auto-respond with Calendly link
        is_yes_shortcut = bool(re.match(r"^\s*(yes|yeah|yep|sure|ok|sounds good|let'?s do it)[\s\.\!\?]*$", b.strip().split("\n")[0][:60]))
        sentiment = "positive" if positive and not negative else ("negative" if negative else "neutral")
        status = "replied_positive" if sentiment == "positive" else ("not_interested" if sentiment == "negative" else "replied")
        await db.outbound_prospects.update_one(
            {"id": prospect["id"]},
            {"$set": {
                "status": status,
                "replied_at": datetime.now(timezone.utc).isoformat(),
                "reply_body": m["body"][:4000],
                "reply_subject": m["subject"],
                "reply_sentiment": sentiment,
                "reply_category": "yes_shortcut" if is_yes_shortcut else None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        await db.outbound_events.insert_one({
            "id": str(uuid.uuid4()),
            "prospect_id": prospect["id"],
            "type": "replied",
            "day_key": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sentiment": sentiment,
            "source": "imap",
            "yes_shortcut": is_yes_shortcut,
        })
        if negative:
            await db.outbound_suppression.update_one(
                {"email": m["from"]},
                {"$set": {"reason": "imap_opted_out", "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
            await db.outbound_prospects.update_one({"id": prospect["id"]}, {"$set": {"suppressed": True}})
        # YES shortcut → auto-send Calendly booking link (no founder approval needed)
        if is_yes_shortcut:
            calendly = os.environ.get("CALENDLY_URL", "").strip()
            if calendly:
                try:
                    from email_service import send_raw
                    body_html = (
                        f"<p>Great — let's get a time on the calendar.</p>"
                        f"<p>Pick any slot that works for you here:<br/><a href='{calendly}'>{calendly}</a></p>"
                        f"<p>Looking forward to it.<br/>Jeffrey · CreatorBoostAI</p>"
                    )
                    await send_raw(m["from"], f"Re: {m['subject']}", body_html)
                    await db.outbound_events.insert_one({
                        "id": str(uuid.uuid4()),
                        "prospect_id": prospect["id"],
                        "type": "calendly_sent",
                        "day_key": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "calendly_url": calendly,
                    })
                    log.info(f"[imap] YES shortcut → Calendly auto-sent to {m['from']}")
                except Exception as e:
                    log.error(f"[imap] YES auto-response failed: {e}")
        matched += 1
    return {"ok": True, "scanned": len(messages), "matched": matched}


async def imap_poller_loop(db, interval_sec: int = 300) -> None:
    """Best-effort IMAP poller. Disabled gracefully if IMAP_* env vars are
    unset or the server is unreachable."""
    if os.environ.get("IMAP_POLLER", "on").lower() == "off":
        log.info("[imap] poller disabled by env")
        return
    # First check required env — if missing, exit the loop silently
    if not all(os.environ.get(k, "").strip() for k in ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD")):
        log.info("[imap] poller not configured — skipping loop")
        return
    log.info("[imap] poller loop starting")
    while True:
        try:
            await _imap_poll_once(db)
        except Exception as e:
            log.error(f"[imap] tick error: {e}")
        await asyncio.sleep(interval_sec + random.randint(-15, 15))


async def daily_autopilot_loop(db, send_outbound_email, send_founder_notification, interval_sec: int = 86400) -> None:
    """Once per `interval_sec` (default 24h), run a complete autopilot cycle:
    seed → external pulls → score → send → IMAP → finalize cold. Disabled
    when AUTOPILOT_LOOP=off."""
    if os.environ.get("AUTOPILOT_LOOP", "on").lower() == "off":
        log.info("[autopilot] daily loop disabled by env")
        return
    log.info(f"[autopilot] daily loop starting · interval={interval_sec}s")
    # First run after a short delay so the server can fully boot
    await asyncio.sleep(60)
    while True:
        try:
            router = make_outbound_router(db, send_outbound_email, send_founder_notification, _NOOP_REQUIRE_FOUNDER)
            cycle_fn = _AUTOPILOT_HELPERS.get(id(router))
            if cycle_fn:
                run_id = str(uuid.uuid4())
                await db.outbound_autopilot_runs.insert_one({
                    "id": run_id, "started_at": datetime.now(timezone.utc).isoformat(),
                    "status": "running", "trigger": "daily_loop",
                })
                try:
                    r = await cycle_fn()
                    await db.outbound_autopilot_runs.update_one(
                        {"id": run_id}, {"$set": {**r, "status": "completed"}},
                    )
                    log.info(f"[autopilot] cycle complete: sent={r.get('sent_this_cycle')} scored={r.get('scored')} seeded={r.get('seeded', {}).get('added', 0)}")
                except Exception as e:
                    await db.outbound_autopilot_runs.update_one(
                        {"id": run_id},
                        {"$set": {"status": "failed", "error": str(e)[:400],
                                  "finished_at": datetime.now(timezone.utc).isoformat()}},
                    )
                    raise
        except Exception as e:
            log.error(f"[autopilot] cycle error: {e}")
        await asyncio.sleep(interval_sec + random.randint(-60, 60))


_AUTOPILOT_HELPERS: Dict[int, Any] = {}


__all__ = ["make_outbound_router", "background_scheduler_loop", "imap_poller_loop", "_imap_poll_once", "daily_autopilot_loop"]
