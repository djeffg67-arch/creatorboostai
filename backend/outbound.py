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

# Pipeline values per segment — used to auto-create Deal estimates
# whenever a prospect is qualified (demo capture, demo viewed, positive
# reply). Jeffrey's exact spec.
SEGMENT_PIPELINE_VALUES = {
    "airport_enterprise":  150_000,
    "supermarket_grocery":  75_000,
    "education_school":     50_000,
    "insurance_agent":      40_000,
    "realtor":              30_000,
    "c_store":              50_000,
    "retail_chain":         50_000,   # treated like c_store/grocery class
    "contractor_service":   35_000,
    "sales_team_agency":    40_000,
    "creator_influencer":   15_000,
}
SEGMENT_PIPELINE_DEFAULT = 40_000        # fallback for unknown segments
ENTERPRISE_PIPELINE_VALUE = 200_000      # explicit "enterprise" upgrade tier

# ── Force-Reply Day 0 noun per segment (Iter 50)
#  e.g., "Do you currently manage [locations / stores / teams / classrooms]?"
SEGMENT_NOUN = {
    "airport_enterprise":  "operations",
    "supermarket_grocery": "stores",
    "education_school":    "classrooms",
    "insurance_agent":     "agents",
    "realtor":             "listings",
    "c_store":             "stores",
    "retail_chain":        "locations",
    "contractor_service":  "service teams",
    "sales_team_agency":   "reps",
    "creator_influencer":  "channels",
}
SEGMENT_NOUN_DEFAULT = "locations"

# ── Sender pool for multi-inbox rotation (Iter 50)
def _sender_pool() -> List[str]:
    raw = os.environ.get("OUTBOUND_SENDER_POOL", "").strip()
    if not raw:
        return []
    return [s.strip() for s in raw.split(",") if s.strip()]

def _per_inbox_daily_cap() -> int:
    try:
        return max(1, int(os.environ.get("OUTBOUND_PER_INBOX_DAILY_CAP", "45")))
    except Exception:
        return 45

def _ramp_schedule() -> List[int]:
    """Domain-warming ramp · week-indexed daily cap. Default matches the
    iter-66+ spec (Week 1 → 50/day · Week 2 → 100/day · Week 3+ → 200/day).
    Override via OUTBOUND_RAMP_SCHEDULE env (comma-separated values, one per
    week). The final value applies to all subsequent weeks."""
    raw = os.environ.get("OUTBOUND_RAMP_SCHEDULE", "50,100,200")
    try:
        return [max(1, int(x.strip())) for x in raw.split(",") if x.strip()]
    except Exception:
        return [50, 100, 200]


def _ramp_step_days() -> int:
    """How many days each ramp step lasts. 7 = week-indexed (default)."""
    try:
        return max(1, int(os.environ.get("OUTBOUND_RAMP_STEP_DAYS", "7")))
    except Exception:
        return 7

DAILY_LIMIT_DEFAULT = int(os.environ.get("OUTBOUND_DAILY_LIMIT", "10"))   # Phase A · Low Credit Execution Mode
SEND_WINDOW_HOURS = 14                 # spread sends across 14-hour workday
MIN_SEND_SPACING_SEC = 60              # hard floor between two sends
BOUNCE_RATE_PAUSE_THRESHOLD = 0.05     # auto-pause if ≥5 % over last 7 days
COMPLAINT_RATE_PAUSE_THRESHOLD = 0.003  # auto-pause if ≥0.3 % over last 7 days
FOLLOWUP_OFFSETS_DAYS = [1, 2, 5]       # Demo-First v2 · Day0 + +45min bump + FU1(d1) / FU2(d2 Loom) / FU3(d5 close)
MAX_EMAILS_BEFORE_COLD = 5              # initial + bump + 3 follow-ups → then cold
BUMP_AFTER_MINUTES = 45                 # +45min auto-bump for unopened/unclicked Day 0 sends
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
        """Iter 50 · FORCE-REPLY Day 0 email. Revenue-correction framing.
        Always includes the demo link + Calendly + a "reply 'no' and I'll close
        the loop" exit so the prospect MUST respond either way. AI personalizes
        the segment noun; structure is locked.
        """
        seg = p.get("target_segment") or "sales_team_agency"
        demo = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
        demo_url = f"{_public_base()}{demo['route']}"
        company = p.get("business_name") or "your team"
        first_name = (p.get("contact_name") or "").split(" ")[0] or "there"
        noun = SEGMENT_NOUN.get(seg, SEGMENT_NOUN_DEFAULT)
        calendly = os.environ.get("CALENDLY_URL", "").strip()
        calendly_line = (
            f"If it's even slightly relevant, grab a quick slot:\n{calendly}\n\n"
            if calendly else ""
        )

        # Hard-locked force-reply template (Iter 50 spec).
        # Subject is fixed: "quick question" — proven 2-3x reply lift vs branded subjects.
        subject = "quick question"
        body = (
            f"Hi {first_name},\n\n"
            f"Do you currently manage {noun} at {company}?\n\n"
            f"I mapped something based on your industry — it shows where operations "
            f"are losing money and how to correct it. Takes about 2 minutes to review.\n\n"
            f"{demo_url}\n\n"
            f"{calendly_line}"
            f"If not, just reply \"no\" and I'll close the loop.\n\n"
            f"— Jeffrey"
        )
        return {"subject": subject, "body": body}

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

    async def _draft_bump(p: Dict[str, Any]) -> Dict[str, str]:
        """Iter 50 · +45min auto-bump email. Hard-locked, ultra-short, no AI.
        Triggered when Day 0 hasn't been opened/clicked after 45 min."""
        seg = p.get("target_segment") or "sales_team_agency"
        demo = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
        demo_url = f"{_public_base()}{demo['route']}"
        first_name = (p.get("contact_name") or "").split(" ")[0] or "there"
        return {
            "subject": "quick bump",
            "body": (
                f"Hi {first_name},\n\n"
                f"Just bumping this — worth a quick look?\n\n"
                f"{demo_url}\n\n"
                f"— Jeffrey"
            ),
        }

    async def _draft_followup(p: Dict[str, Any], which: int) -> Dict[str, str]:
        """Iter 50 · Demo-First v2 follow-up cadence. Revenue-correction framing.

        which=1 → Day 1 · 35-50 words · pressure bump
        which=2 → Day 2 · 50-75 words · LOOM CUSTOM-BUILD OFFER (primary conversion driver)
        which=3 → Day 5 · 35-50 words · soft close
        """
        seg = p.get("target_segment") or "sales_team_agency"
        demo = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
        demo_url = f"{_public_base()}{demo['route']}"
        company = p.get("business_name") or "your team"
        first_name = (p.get("contact_name") or "").split(" ")[0] or "there"
        calendly = os.environ.get("CALENDLY_URL", "").strip()

        if which == 1:
            # Day 1 · pressure bump · revenue-correction framing
            subject = "quick follow up"
            body = (
                f"Hi {first_name},\n\n"
                f"Most operators in your space are leaking 15-25% on costs they can't see.\n\n"
                f"This shows where {company} is losing money and how to correct it:\n{demo_url}\n\n"
                + (f"Or grab 15 min: {calendly}\n\n" if calendly else "")
                + f"— Jeffrey"
            )
            return {"subject": subject, "body": body}

        if which == 2:
            # Day 2 · LOOM CUSTOM-BUILD OFFER (primary conversion driver, Iter 50 spec)
            subject = "want me to do this for you?"
            body = (
                f"Hi {first_name},\n\n"
                f"If you want, I can record a quick 2-minute breakdown using {company}'s "
                f"actual setup and data — show you exactly where the leakage is and how "
                f"the correction works for your specific operation.\n\n"
                f"Want me to do that?\n\n"
                f"Or if you'd rather skim the demo first: {demo_url}\n\n"
                + (f"{calendly}\n\n" if calendly else "")
                + f"— Jeffrey"
            )
            return {"subject": subject, "body": body}

        # Day 5 · soft close (Iter 50 spec)
        subject = "should I close this out?"
        body = (
            f"Hi {first_name},\n\n"
            f"If this isn't a priority right now, no problem.\n\n"
            f"If it is, here's the demo:\n{demo_url}\n\n"
            f"— Jeffrey"
        )
        return {"subject": subject, "body": body}

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
        """Iter 50 · INSTANT CLOSE TRIGGER. When reply classifier returns
        'interested', this fires immediately. Revenue-correction framing.
        Hard-locked template — no AI variance to avoid stalls."""
        calendly = os.environ.get("CALENDLY_URL", "").strip()
        first_name = (p.get("contact_name") or "").split(" ")[0] or "there"
        if calendly:
            body = (
                f"Hi {first_name},\n\n"
                f"Perfect — I'll map this to your numbers and walk you through "
                f"exactly where the leakage is and how the correction works.\n\n"
                f"Grab a quick time here:\n{calendly}\n\n"
                f"— Jeffrey"
            )
        else:
            body = (
                f"Hi {first_name},\n\n"
                f"Perfect — I'll map this to your numbers. What times work this week "
                f"for a 15-min call?\n\n— Jeffrey"
            )
        return {"subject": f"Re: {p.get('reply_subject') or 'your reply'}"[:120], "body": body}

    # ──────────────── DEAL AUTO-CREATION (Demo-First spec) ────────────────
    async def _segment_pipeline_value(seg: str, p: Dict[str, Any]) -> int:
        """Resolve a deal value for a prospect. Defers to an explicit
        `enterprise_tier=True` flag for $200K, otherwise looks up the
        segment table, otherwise uses the safe default."""
        if p.get("enterprise_tier") is True:
            return ENTERPRISE_PIPELINE_VALUE
        return SEGMENT_PIPELINE_VALUES.get(seg, SEGMENT_PIPELINE_DEFAULT)

    async def _create_or_get_deal_for_prospect(
        prospect: Dict[str, Any],
        trigger: str = "demo_capture",
    ) -> Dict[str, Any]:
        """Idempotent: at most ONE deal per prospect. Sets `deal_value_usd`
        and `deal_id` on the prospect doc, mirrors a row into `ops_leads`
        as a `qualified` lead so the Performance dashboard pipeline
        reflects real pipeline value, and logs an `outbound_events.deal_created`
        row for the timeline."""
        # Already has a deal — no-op (returns existing values for caller).
        if prospect.get("deal_id"):
            return {
                "deal_id": prospect["deal_id"],
                "deal_value_usd": prospect.get("deal_value_usd"),
                "is_new": False,
            }
        seg = prospect.get("target_segment") or "sales_team_agency"
        value = await _segment_pipeline_value(seg, prospect)
        deal_id = str(uuid.uuid4())
        now_s = now_iso()
        await db.outbound_prospects.update_one(
            {"id": prospect["id"]},
            {"$set": {
                "deal_id": deal_id,
                "deal_value_usd": value,
                "deal_created_at": now_s,
                "deal_trigger": trigger,
                "status": "qualified" if prospect.get("status") not in ("won", "lost") else prospect.get("status"),
                "updated_at": now_s,
            }},
        )
        # Mirror into ops_leads so /performance pipeline math picks it up
        # (the Performance endpoint sums `value_usd` across non-lost leads).
        try:
            await db.ops_leads.update_one(
                {"source_outbound_prospect_id": prospect["id"]},
                {"$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "name": prospect.get("contact_name") or prospect.get("business_name") or prospect.get("email"),
                    "company": prospect.get("business_name"),
                    "email": prospect.get("email"),
                    "industry": SEGMENT_DISPLAY.get(seg, seg),
                    "status": "qualified",
                    "value_usd": value,
                    "source": "outbound_engine",
                    "source_outbound_prospect_id": prospect["id"],
                    "source_demo": prospect.get("source_demo"),
                    "by_email": os.environ.get("FOUNDER_EMAIL", "").strip() or "founder@creatorboostai.com",
                    "assigned_to_email": None,
                    "trigger": trigger,
                    "created_at": now_s,
                    "updated_at": now_s,
                }},
                upsert=True,
            )
        except Exception as e:
            log.error(f"[deal] ops_leads mirror failed for {prospect.get('email')}: {e}")
        await _log_event(prospect["id"], "deal_created", value_usd=value, trigger=trigger, segment=seg)
        return {"deal_id": deal_id, "deal_value_usd": value, "is_new": True}

    # ──────────────── AI REPLY CLASSIFIER (Demo-First spec) ────────────────
    async def _classify_reply_with_ai(prospect: Dict[str, Any], reply_body: str) -> Dict[str, Any]:
        """Classify an inbound reply into one of three Demo-First buckets:
        - "interested"     → wants more info / demo / call → fire Calendly + create deal
        - "neutral"        → ambiguous / not yet qualified → offer custom store example
        - "not_interested" → polite no / unsubscribe → suppress + stop

        Returns {"bucket": "...", "rationale": "..."}. Falls back to a
        keyword heuristic if Claude is unreachable so the engine still
        progresses in degraded mode.
        """
        body = (reply_body or "").strip()
        # Hard fallback heuristic — always available
        b_lower = body.lower()
        positive_kw = ("interested", "sounds good", "yes", "yeah", "yep", "tell me more",
                       "let's", "book", "call", "demo", "see it", "schedule")
        negative_kw = ("unsubscribe", "remove me", "not interested", "no thanks",
                       "stop", "do not contact", "wrong person", "wrong contact")
        keyword_bucket = (
            "interested" if any(k in b_lower for k in positive_kw) and not any(k in b_lower for k in negative_kw)
            else "not_interested" if any(k in b_lower for k in negative_kw)
            else "neutral"
        )
        # If Claude isn't configured, return the heuristic
        if not (LlmChat and LlmUserMessage and os.environ.get("EMERGENT_LLM_KEY", "").strip()):
            return {"bucket": keyword_bucket, "rationale": "keyword-heuristic (no LLM)", "via": "heuristic"}
        try:
            seg = prospect.get("target_segment") or "sales_team_agency"
            system = (
                "You are a B2B sales reply classifier. Read the prospect's reply and "
                "output STRICT JSON with exactly these keys:\n"
                "  bucket: one of 'interested' | 'neutral' | 'not_interested'\n"
                "  rationale: <12 words explaining the call>\n"
                "Definitions:\n"
                "- interested: explicitly wants more info, a demo, a call, pricing, or asks any qualifying question\n"
                "- neutral: ambiguous, asks for time, says 'maybe', no clear yes or no\n"
                "- not_interested: polite no, unsubscribe, wrong person, do not contact, asks to be removed\n"
                "No prose outside the JSON."
            )
            user = (
                f"Segment: {SEGMENT_DISPLAY.get(seg, seg)}\n"
                f"Prospect company: {prospect.get('business_name') or '—'}\n"
                f"Reply body:\n\"\"\"\n{body[:2000]}\n\"\"\"\n"
                f"Output the classification JSON now."
            )
            raw = await _claude(system, user, session_id=f"reply-classify-{prospect['id']}")
            import json as _json
            m = re.search(r"\{.*\}", raw, flags=re.S)
            if m:
                obj = _json.loads(m.group(0))
                bucket = (obj.get("bucket") or "").strip().lower()
                if bucket in ("interested", "neutral", "not_interested"):
                    return {
                        "bucket": bucket,
                        "rationale": (obj.get("rationale") or "")[:200],
                        "via": "claude",
                    }
        except Exception as e:
            log.error(f"[reply-classifier] Claude failed: {e}")
        return {"bucket": keyword_bucket, "rationale": "fallback-keyword-heuristic", "via": "heuristic"}

    # Expose helpers to module-scope hooks (e.g. /api/demo/capture caller).
    _DEAL_HELPER[id(router)] = _create_or_get_deal_for_prospect
    _CLASSIFIER_HELPER[id(router)] = _classify_reply_with_ai

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
            "sent_today": counts.get("sent", 0),  # alias · matches iter-66 spec
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
            "risk_level": (
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

    # ──────────────── SENDER POOL ROTATION (Iter 50) ────────────────
    async def _pick_sender_email() -> str:
        """Return the next available sender from the pool, respecting the per-inbox
        daily cap. Falls back to the hard-coded `info@creatorboostai.com` when
        no pool is configured."""
        pool = _sender_pool()
        if not pool:
            return "info@creatorboostai.com"
        cap = _per_inbox_daily_cap()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # Pick the inbox with lowest sends today that's still under cap
        best = None
        best_count = cap
        for sender in pool:
            cnt = await db.outbound_events.count_documents(
                {"type": "sent", "day_key": today, "from_email": sender}
            )
            if cnt < best_count:
                best_count = cnt
                best = sender
            if cnt == 0:
                # zero-use inbox wins — round-robin friendly
                return sender
        return best or pool[0]

    # ──────────────── SEND PIPELINE ────────────────
    async def _send_one(prospect: Dict[str, Any], subject: str, body_plain: str, *, kind: str) -> bool:
        """Send one email with footer + unsub, log the event, bump counters.

        Iter 50: sender rotation across `OUTBOUND_SENDER_POOL` + tracking pixel
        injection for open tracking. Simulated for `.example.com` test domains.
        """
        email = prospect["email"]
        if await _is_suppressed(email):
            await _log_event(prospect["id"], "skipped_suppressed", kind=kind)
            return False
        # Pick sender from rotation pool
        from_email = await _pick_sender_email()
        # Unique tracking id so the open/click webhook can correlate back
        track_id = str(uuid.uuid4())
        html_footer, plain_footer = _unsub_footer(email)
        # Open-tracking pixel (1x1 GIF served by /api/email-pixel/{id})
        public_base = _public_base()
        pixel = f"<img src='{public_base}/api/ops/outbound/track/open/{track_id}' width='1' height='1' style='display:none' alt='' />"
        body_html = (
            "<div style='font-family:ui-sans-serif,system-ui;font-size:14px;line-height:1.6;color:#111;'>"
            + body_plain.replace("\n", "<br/>")
            + "</div>"
            + html_footer
            + pixel
        )
        full_plain = body_plain + plain_footer

        # Simulation path for RFC-2606 reserved test domains
        is_simulated = bool(re.search(r"\.example(?:\.com|\.org|\.net)?$", email.lower()))
        if is_simulated:
            await _log_event(
                prospect["id"], "sent", kind=kind, subject=subject[:200],
                simulated=True, from_email=from_email, track_id=track_id,
            )
            cadence_set = _cadence_set_for_kind(kind, prospect)
            await db.outbound_prospects.update_one(
                {"id": prospect["id"]},
                {"$set": {
                    "last_email_at": now_iso(),
                    "status": "contacted" if kind == "initial" else prospect.get("status", "contacted"),
                    "email_status": f"{kind}_simulated",
                    "last_email_subject": subject[:200],
                    "last_email_simulated": True,
                    "last_email_from": from_email,
                    "last_email_track_id": track_id,
                    **cadence_set,
                }, "$inc": {"emails_sent": 1}},
            )
            return True

        # Real send via Resend through the multi-inbox helper
        ok = False
        resend_id: Optional[str] = None
        try:
            from email_service import send_from
            res = await send_from(from_email, email, subject, body_html)
            ok = bool(res.get("ok"))
            resend_id = res.get("id")
        except Exception as e:
            log.error(f"Outbound send_from failed: {e}")
            ok = False
        if ok:
            await _log_event(
                prospect["id"], "sent", kind=kind, subject=subject[:200],
                from_email=from_email, track_id=track_id, resend_id=resend_id,
            )
            cadence_set = _cadence_set_for_kind(kind, prospect)
            await db.outbound_prospects.update_one(
                {"id": prospect["id"]},
                {"$set": {
                    "last_email_at": now_iso(),
                    "status": "contacted" if kind == "initial" else prospect.get("status", "contacted"),
                    "email_status": kind,
                    "last_email_subject": subject[:200],
                    "last_email_from": from_email,
                    "last_email_track_id": track_id,
                    "last_email_resend_id": resend_id,
                    **cadence_set,
                }, "$inc": {"emails_sent": 1}},
            )
        else:
            await _log_event(prospect["id"], "send_failed", kind=kind, from_email=from_email)
        return ok

    def _cadence_set_for_kind(kind: str, prospect: Dict[str, Any]) -> Dict[str, Any]:
        """Compute cadence_step + bump_sent_at updates based on which kind of
        email was just sent. cadence_step = number of CADENCE positions completed
        (initial=1, FU1=2, FU2=3, FU3=4). Bumps don't advance cadence_step."""
        if kind == "initial":
            return {"cadence_step": 1}
        if kind == "bump":
            return {"bump_sent_at": now_iso()}
        if kind.startswith("followup_"):
            try:
                which = int(kind.split("_", 1)[1])
                return {"cadence_step": 1 + which}  # FU1 → 2, FU2 → 3, FU3 → 4
            except Exception:
                return {}
        return {}

    async def _eligible_for_initial() -> List[Dict[str, Any]]:
        now_s = now_iso()
        return await db.outbound_prospects.find(
            {
                "status": {"$in": ["new", "scored"]},
                "unsubscribed": {"$ne": True},
                "suppressed": {"$ne": True},
                "is_test": {"$ne": True},
                "skip_send": {"$ne": True},
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

    async def _due_bumps() -> List[Dict[str, Any]]:
        """Iter 50 · prospects sent the initial email at least BUMP_AFTER_MINUTES
        ago, NOT yet bumped, NOT yet opened/clicked. Sends the +45min nudge."""
        cutoff = (now_dt() - timedelta(minutes=BUMP_AFTER_MINUTES)).isoformat()
        q = {
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "is_test": {"$ne": True},
            "skip_send": {"$ne": True},
            "replied_at": None,
            "emails_sent": 1,                       # only initial sent, no bump yet
            "bump_sent_at": {"$in": [None, False]}, # haven't already bumped
            "last_email_at": {"$lte": cutoff},      # ≥ BUMP_AFTER_MINUTES ago
            # Skip if already opened or clicked — give the open a chance
            "last_opened_at": {"$in": [None, False]},
        }
        return await db.outbound_prospects.find(q, {"_id": 0}).to_list(500)

    async def _due_followups() -> List[Dict[str, Any]]:
        # Iter 50 cadence: emails_sent counts include the +45min bump:
        #   1 = initial (no bump yet)         2 = initial+bump
        #   3 = bump+FU1                       4 = bump+FU1+FU2
        # We follow up only on prospects where the last *cadence* step matters,
        # not the bump. So we identify followup index by `cadence_step`.
        cutoffs = [
            (now_dt() - timedelta(days=FOLLOWUP_OFFSETS_DAYS[0])).isoformat(),
            (now_dt() - timedelta(days=FOLLOWUP_OFFSETS_DAYS[1])).isoformat(),
            (now_dt() - timedelta(days=FOLLOWUP_OFFSETS_DAYS[2])).isoformat(),
        ]
        q = {
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "is_test": {"$ne": True},
            "skip_send": {"$ne": True},
            "replied_at": None,
            "status": {"$in": ["contacted", "demo_sent"]},
            "last_email_at": {"$exists": True, "$ne": None},
        }
        due: List[Dict[str, Any]] = []
        async for p in db.outbound_prospects.find(q, {"_id": 0}):
            # cadence_step: 1=initial sent, 2=FU1 sent, 3=FU2 sent, 4=FU3 sent (cold)
            cadence_step = int(p.get("cadence_step", 1) or 1)
            if cadence_step < 1 or cadence_step > len(FOLLOWUP_OFFSETS_DAYS):
                continue
            threshold = cutoffs[cadence_step - 1]
            if p.get("last_email_at") and p["last_email_at"] <= threshold:
                due.append(p)
        return due

    # Iter 67 · Cold-start safety guardrail
    # Defends domain reputation on Day 1 of warm-up by clamping the daily cap
    # to a small safety threshold (default 10). Lifts automatically on Day 2+,
    # OR can be unlocked manually by the founder via `/admin/cold-start-unlock`.
    COLD_START_DEFAULT_CAP = max(1, int(os.environ.get("OUTBOUND_COLD_START_CAP", "10")))

    async def _cold_start_status() -> Dict[str, Any]:
        """Returns the current cold-start state.
        - active: True only when first-send has occurred AND days_since_first_send < 1
        - unlocked: founder explicitly unlocked it (persists in campaign state)
        - cap: the safety cap that applies if active and not unlocked
        """
        state = await _state()
        if state.get("manual_daily_limit"):
            # Manual override always wins — operator took explicit responsibility.
            return {"active": False, "unlocked": True, "reason": "manual_daily_limit",
                    "cap": COLD_START_DEFAULT_CAP, "days_since_start": None,
                    "first_send_at": None}
        first_send = await db.outbound_events.find_one(
            {"type": "sent"}, {"_id": 0, "created_at": 1}, sort=[("created_at", 1)],
        )
        if not first_send or not first_send.get("created_at"):
            # Engine has not sent its first email yet — guard armed and ready.
            return {"active": True, "unlocked": bool(state.get("cold_start_unlocked")),
                    "reason": "engine_not_yet_started", "cap": COLD_START_DEFAULT_CAP,
                    "days_since_start": None, "first_send_at": None}
        first_iso = first_send["created_at"]
        days_since = (now_dt() - datetime.fromisoformat(first_iso)).days
        active = days_since < 1
        return {
            "active": active,
            "unlocked": bool(state.get("cold_start_unlocked")),
            "reason": "day_1" if active else "lifted_after_day_1",
            "cap": COLD_START_DEFAULT_CAP,
            "days_since_start": days_since,
            "first_send_at": first_iso,
        }

    async def _ramped_daily_limit() -> int:
        """Iter 50/66/67 · ramp daily_limit on a curve over the first ~3 weeks
        from the engine's first send.

        Layered guards (most-restrictive wins):
          1. Manual override → state.daily_limit
          2. Cold-start guardrail → COLD_START_DEFAULT_CAP on Day 1 unless unlocked
          3. Week-indexed ramp → ramp[week_idx]
        """
        state = await _state()
        if state.get("manual_daily_limit"):
            return int(state.get("daily_limit") or DAILY_LIMIT_DEFAULT)
        first_send = await db.outbound_events.find_one(
            {"type": "sent"}, {"_id": 0, "created_at": 1}, sort=[("created_at", 1)],
        )
        if not first_send or not first_send.get("created_at"):
            base = _ramp_schedule()[0]
            # Pre-first-send: still clamp to cold-start cap unless unlocked.
            if state.get("cold_start_unlocked"):
                return base
            return min(base, COLD_START_DEFAULT_CAP)
        days_since = (now_dt() - datetime.fromisoformat(first_send["created_at"])).days
        # Week-indexed by default (iter 66+) — advance one ramp step every
        # `OUTBOUND_RAMP_STEP_DAYS` (default 7).
        ramp = _ramp_schedule()
        idx = min(days_since // _ramp_step_days(), len(ramp) - 1)
        ramp_cap = ramp[idx]
        # Day-1 cold-start clamp (iter 67): only the first 24h after first send.
        if days_since < 1 and not state.get("cold_start_unlocked"):
            return min(ramp_cap, COLD_START_DEFAULT_CAP)
        return ramp_cap

    async def _process_queue(batch_override: Optional[int] = None) -> int:
        """Returns number of emails sent this invocation. Respects daily limit +
        pause state + natural spacing.

        `batch_override`: when provided, overrides the natural-pacing batch
        size. Used by the manual `/autopilot-now` button so each click
        produces visible output instead of trickling 1-2 emails per tick."""
        state = await _state()
        if state.get("paused"):
            return 0
        # Iter 50 · ramped daily limit (auto-step 25 → 50 → 100 → 150 → 200)
        daily_limit = await _ramped_daily_limit()
        sent_today = await _today_sent_count()
        remaining = daily_limit - sent_today
        if remaining <= 0:
            return 0

        if batch_override is not None and batch_override > 0:
            batch_size = min(remaining, batch_override)
        else:
            batch_size = min(remaining, max(1, daily_limit // max(1, SEND_WINDOW_HOURS * 2)))

        queue: List[tuple[Dict[str, Any], str, int]] = []
        # 1. +45min bumps go FIRST — fastest path to a reply
        for p in (await _due_bumps())[:batch_size]:
            queue.append((p, "bump", 0))
        # 2. Initials next (sorted by lead_score desc)
        if len(queue) < batch_size:
            for p in (await _eligible_for_initial())[: batch_size - len(queue)]:
                queue.append((p, "initial", 0))
        # 3. Cadence follow-ups
        if len(queue) < batch_size:
            for p in (await _due_followups())[: batch_size - len(queue)]:
                step = int(p.get("cadence_step", 1) or 1)  # 1=initial sent → next is FU1
                queue.append((p, f"followup_{step}", step))

        sent_count = 0
        for p, kind, which in queue:
            try:
                included_demo = False
                if kind == "initial":
                    draft = await _draft_email(p, include_teaser=True)
                    included_demo = True  # Force-Reply Day 0 always includes demo link
                elif kind == "bump":
                    draft = await _draft_bump(p)
                    included_demo = True  # bump always includes demo link
                else:
                    draft = await _draft_followup(p, which)
                    # FU1 (which==1) and FU2 (which==2) include demo
                    if which in (1, 2):
                        included_demo = True
                is_simulated = bool(re.search(r"\.example(?:\.com|\.org|\.net)?$", (p.get("email") or "").lower()))
                ok = await _send_one(p, draft["subject"], draft["body"], kind=kind)
                if ok:
                    sent_count += 1
                    if included_demo:
                        seg = p.get("target_segment") or "sales_team_agency"
                        demo_info = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
                        await _log_event(p["id"], "demo_sent", kind=kind, demo_route=demo_info["route"], demo_label=demo_info["label"])
                        await db.outbound_prospects.update_one(
                            {"id": p["id"]},
                            {"$set": {
                                "demo_sent_at": now_iso(),
                                "demo_route": demo_info["route"],
                                "demo_label": demo_info["label"],
                            }, "$inc": {"demos_delivered": 1}},
                        )
                    # Iter 50 · 60-120s spacing for real sends to avoid uniform-
                    # cadence spam fingerprints. Uses `secrets.randbelow` per
                    # the security audit even though jitter is non-sensitive.
                    if not is_simulated:
                        await asyncio.sleep(60 + secrets.randbelow(61))
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

    @router.post("/warmup-status")
    async def warmup_status(payload: OpsAuth):
        """Domain-warming ramp status (Iter 67). Returns current week,
        current daily cap, the full ramp schedule, days until next step,
        and the cold-start guardrail state."""
        await require_founder(payload)
        ramp = _ramp_schedule()
        step_days = _ramp_step_days()
        first_send = await db.outbound_events.find_one(
            {"type": "sent"}, {"_id": 0, "created_at": 1}, sort=[("created_at", 1)],
        )
        state = await _state()
        manual = bool(state.get("manual_daily_limit"))
        current_cap = int(state.get("daily_limit") or DAILY_LIMIT_DEFAULT)
        cold = await _cold_start_status()

        out: Dict[str, Any] = {
            "ramp_schedule": ramp,
            "ramp_step_days": step_days,
            "manual_override": manual,
            "manual_daily_limit": current_cap if manual else None,
            "cold_start": cold,
        }

        if not first_send or not first_send.get("created_at"):
            out.update({
                "started": False,
                "warmup_started_at": None,
                "current_week": 1,
                "current_step_index": 0,
                "current_daily_cap": current_cap if manual else ramp[0],
                "next_step_in_days": step_days,
                "next_step_cap": ramp[1] if len(ramp) > 1 else ramp[0],
                "summary": "Engine has not sent its first email yet — week 1 cap will activate on first send.",
            })
            return out

        first_iso = first_send["created_at"]
        days_since = (now_dt() - datetime.fromisoformat(first_iso)).days
        idx = min(days_since // step_days, len(ramp) - 1)
        current_week = idx + 1
        ramp_cap = ramp[idx]

        if idx + 1 < len(ramp):
            days_in_step = days_since % step_days
            next_step_in_days = step_days - days_in_step
            next_step_cap = ramp[idx + 1]
        else:
            next_step_in_days = None
            next_step_cap = ramp_cap  # already at terminal step

        out.update({
            "started": True,
            "warmup_started_at": first_iso,
            "days_since_start": days_since,
            "current_week": current_week,
            "current_step_index": idx,
            "current_daily_cap": current_cap if manual else ramp_cap,
            "ramp_calculated_cap": ramp_cap,
            "next_step_in_days": next_step_in_days,
            "next_step_cap": next_step_cap,
            "summary": (
                f"Manual override · daily cap {current_cap}." if manual
                else f"Week {current_week} of warm-up · daily cap {ramp_cap}." +
                     (f" Next step in {next_step_in_days}d → {next_step_cap}/day." if next_step_in_days else " At terminal step.")
            ),
        })
        return out

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

        # Normalize category — explicit category wins; otherwise run AI classifier
        category = (payload.category or "").strip().lower() if payload.category else None
        if category and category not in REPLY_CATEGORIES:
            category = None
        classifier_result: Optional[Dict[str, Any]] = None
        if not category:
            if payload.positive is True:
                category = "positive"
            elif payload.positive is False:
                category = "not_interested"
            else:
                # AI 3-bucket classifier per Demo-First spec
                try:
                    classifier_result = await _classify_reply_with_ai(p, payload.reply_body or "")
                    bucket = classifier_result["bucket"]
                    category = (
                        "interested" if bucket == "interested"
                        else "not_interested" if bucket == "not_interested"
                        else None  # neutral → leave uncategorized
                    )
                except Exception as e:
                    log.error(f"reply classifier failed: {e}")

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
                "reply_classifier_via": (classifier_result or {}).get("via"),
                "reply_classifier_rationale": (classifier_result or {}).get("rationale"),
                "updated_at": now_iso(),
                **({"unsubscribed": True} if category == "unsubscribe" else {}),
                **({"suppressed": True} if category in ("unsubscribe", "not_interested") else {}),
            }},
        )
        await _log_event(p["id"], "replied", sentiment=status, category=category)

        # Auto-suppress hard exits + mark mirrored deal as lost
        if category in ("unsubscribe", "not_interested"):
            await _suppress(p["email"], reason=f"reply_{category}")
            try:
                await db.ops_leads.update_one(
                    {"source_outbound_prospect_id": p["id"]},
                    {"$set": {"status": "lost", "updated_at": now_iso()}},
                )
            except Exception:
                pass

        # Auto-create Deal on positive (Demo-First spec) — re-fetch to get fresh status
        deal_info: Optional[Dict[str, Any]] = None
        instant_close: Optional[Dict[str, Any]] = None
        if status == "replied_positive":
            p_fresh = await db.outbound_prospects.find_one({"id": p["id"]}, {"_id": 0})
            if p_fresh:
                try:
                    deal_info = await _create_or_get_deal_for_prospect(p_fresh, trigger="reply_positive")
                except Exception as e:
                    log.error(f"deal auto-create failed: {e}")
                # Iter 50 · INSTANT CLOSE TRIGGER — flag HOT, push to top of dashboard,
                # auto-send Calendly response (no founder approval required).
                try:
                    await db.outbound_prospects.update_one(
                        {"id": p["id"]},
                        {"$set": {
                            "intent_level": "HIGH_INTENT",
                            "priority": "immediate",
                            "hot_lead": True,
                            "hot_lead_at": now_iso(),
                        }},
                    )
                    calendly = os.environ.get("CALENDLY_URL", "").strip()
                    if calendly:
                        from email_service import send_from
                        first_name = (p.get("contact_name") or "").split(" ")[0] or "there"
                        instant_html = (
                            f"<p>Hi {first_name},</p>"
                            f"<p>Perfect — I'll map this to your numbers and walk you through "
                            f"exactly where the leakage is and how the correction works.</p>"
                            f"<p>Grab a quick time here:<br/>"
                            f"<a href='{calendly}'>{calendly}</a></p>"
                            f"<p>— Jeffrey</p>"
                        )
                        from_email = await _pick_sender_email()
                        res = await send_from(from_email, p["email"],
                            f"Re: {p.get('reply_subject') or 'your reply'}"[:120],
                            instant_html)
                        instant_close = {
                            "calendly_sent": bool(res.get("ok")),
                            "calendly_url": calendly,
                            "from_email": from_email,
                        }
                        if res.get("ok"):
                            await _log_event(p["id"], "calendly_sent",
                                trigger="instant_close", from_email=from_email,
                                calendly_url=calendly)
                    else:
                        instant_close = {"calendly_sent": False, "reason": "calendly_not_configured"}
                except Exception as e:
                    log.error(f"instant close trigger failed: {e}")
                    instant_close = {"calendly_sent": False, "error": str(e)[:200]}

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

        return {
            "ok": True,
            "status": status,
            "category": category,
            "classifier": classifier_result,
            "deal": deal_info,
            "instant_close": instant_close,
        }

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
            # 12-24h delay before sending warm demo viewer outreach.
            # `secrets.randbelow` keeps the security audit clean even though
            # this jitter is non-sensitive (UX-only spreading).
            delay_span = max(1, int((DEMO_VIEWER_DELAY_MAX_HRS - DEMO_VIEWER_DELAY_MIN_HRS) * 100))
            delay_hours = DEMO_VIEWER_DELAY_MIN_HRS + (secrets.randbelow(delay_span) / 100.0)
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

        # Step 2.5 · State business-filings promotion (Iter 66)
        # Look for state_filings docs that are enrichment-verified but not yet
        # forwarded into outbound_prospects. This handles filings that were
        # ingested between cycles (e.g. an admin uploaded a CSV after the
        # last autopilot run).
        try:
            from state_business_filings import _now_iso as _sf_now
            promoted = 0
            cursor = db.state_filings.find(
                {"forwarded_to_outbound": False, "enrichment.email_candidate": {"$ne": None},
                 "enrichment.email_status": "verified"},
                {"_id": 0},
            ).limit(50)
            async for filing in cursor:
                e = (filing.get("enrichment") or {})
                email_n = (e.get("email_candidate") or "").strip().lower()
                if not email_n or "@" not in email_n:
                    continue
                if await db.outbound_prospects.find_one({"email": email_n}, {"_id": 0, "id": 1}):
                    await db.state_filings.update_one(
                        {"id": filing["id"]},
                        {"$set": {"forwarded_to_outbound": True, "forwarded_at": _sf_now()}},
                    )
                    continue
                if await db.outbound_suppression.find_one({"email": email_n}, {"_id": 0}):
                    continue
                bn = (filing.get("business_name") or "")[:240]
                p = {
                    "id": str(uuid.uuid4()),
                    "business_name": bn,
                    "contact_name": filing.get("owner_name") or filing.get("registered_agent_name"),
                    "email": email_n,
                    "industry": e.get("industry_guess") or filing.get("industry"),
                    "website": filing.get("website") or e.get("domain_candidate"),
                    "location": e.get("state_full") or filing.get("state_full"),
                    "linkedin_url": None,
                    "notes": (
                        f"New {filing.get('entity_type') or 'business'} registered in "
                        f"{e.get('state_full') or filing.get('state')} on "
                        f"{filing.get('filing_date', 'recently')}. Source: state filings."
                    )[:500],
                    "source": f"state_filings:{filing.get('source_state', '')}",
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
                    await db.outbound_prospects.insert_one(p)
                    await db.state_filings.update_one(
                        {"id": filing["id"]},
                        {"$set": {"forwarded_to_outbound": True, "forwarded_at": _sf_now()}},
                    )
                    promoted += 1
                except Exception as e2:
                    log.warning(f"[autopilot] state-filings promote failed: {e2}")
            result["state_filings_promoted"] = promoted
        except Exception as e:
            log.error(f"[autopilot] state-filings promote failed: {e}")
            result["state_filings_promoted"] = 0

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
        # Heartbeat — the autopilot cycle reached the end successfully.
        try:
            from worker_telemetry import record_heartbeat
            await record_heartbeat(db, "autopilot_cycle", ok=True)
        except Exception as _e:
            log.warning(f"[autopilot] heartbeat write failed: {_e}")
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

    @router.post("/admin/cold-start-unlock")
    async def admin_cold_start_unlock(payload: Dict[str, Any] = Body(...)):
        """Iter 67 · founder-only. Bypass the Day-1 cold-start cap (default 10)
        so the full week-1 ramp cap can apply on Day 1 of warm-up.

        Required:
          - email, token (founder auth)
          - confirm: must equal "I-ACCEPT-DOMAIN-REPUTATION-RISK"

        The confirmation phrase is intentional friction — this endpoint is the
        ONLY way to push more than 10 sends in the first 24 hours of a fresh
        domain. The flag clears automatically after 14 days."""
        class _A:
            email = (payload.get("email") or "").strip()
            token = (payload.get("token") or "").strip()
        await require_founder(_A())

        confirm = (payload.get("confirm") or "").strip()
        unlock = bool(payload.get("unlock", True))

        if unlock and confirm != "I-ACCEPT-DOMAIN-REPUTATION-RISK":
            raise HTTPException(
                400,
                "Confirmation required. Pass confirm='I-ACCEPT-DOMAIN-REPUTATION-RISK' "
                "to bypass the Day-1 cold-start cap. To re-lock, pass unlock=false.",
            )

        await db.outbound_campaign_state.update_one(
            {},
            {"$set": {
                "cold_start_unlocked": unlock,
                "cold_start_unlocked_at": now_iso() if unlock else None,
                "cold_start_unlocked_by": _A.email if unlock else None,
                "updated_at": now_iso(),
            }},
            upsert=True,
        )
        cold = await _cold_start_status()
        return {
            "ok": True,
            "unlocked": unlock,
            "cold_start": cold,
            "effective_daily_cap": await _ramped_daily_limit(),
        }

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
            "is_test": {"$ne": True},
            "skip_send": {"$ne": True},
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

        # State-filings panel (Iter 66)
        state_filings_panel: Dict[str, Any] = {}
        try:
            sf_total = await db.state_filings.count_documents({})
            sf_today = await db.state_filings.count_documents({
                "date_collected": {"$gte": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
            })
            sf_enriched = await db.state_filings.count_documents({"enrichment.email_status": "verified"})
            sf_forwarded = await db.state_filings.count_documents({"forwarded_to_outbound": True})
            sf_pending = await db.state_filings.count_documents({
                "forwarded_to_outbound": False, "enrichment.email_status": "verified",
            })
            sf_last_run = await db.state_filing_runs.find_one(
                {}, {"_id": 0}, sort=[("started_at", -1)]
            )
            state_filings_panel = {
                "total_filings": sf_total,
                "filings_24h": sf_today,
                "verified_emails": sf_enriched,
                "forwarded_to_outbound": sf_forwarded,
                "pending_forward": sf_pending,
                "last_run": sf_last_run,
            }
        except Exception as e:
            log.warning(f"[dashboard] state_filings panel failed: {e}")

        # Domain-warming snapshot (Iter 67)
        warmup_panel: Dict[str, Any] = {}
        try:
            ramp = _ramp_schedule()
            step_days = _ramp_step_days()
            first_send = await db.outbound_events.find_one(
                {"type": "sent"}, {"_id": 0, "created_at": 1}, sort=[("created_at", 1)],
            )
            cold_snap = await _cold_start_status()
            if first_send and first_send.get("created_at"):
                ds = (now_dt() - datetime.fromisoformat(first_send["created_at"])).days
                idx = min(ds // step_days, len(ramp) - 1)
                warmup_panel = {
                    "started": True,
                    "current_week": idx + 1,
                    "ramp_calculated_cap": ramp[idx],
                    "next_step_cap": ramp[idx + 1] if idx + 1 < len(ramp) else ramp[idx],
                    "ramp_schedule": ramp,
                    "step_days": step_days,
                    "manual_override": bool(state.get("manual_daily_limit")),
                    "cold_start": cold_snap,
                    "effective_cap": await _ramped_daily_limit(),
                }
            else:
                warmup_panel = {
                    "started": False,
                    "current_week": 1,
                    "ramp_calculated_cap": ramp[0],
                    "next_step_cap": ramp[1] if len(ramp) > 1 else ramp[0],
                    "ramp_schedule": ramp,
                    "step_days": step_days,
                    "manual_override": bool(state.get("manual_daily_limit")),
                    "cold_start": cold_snap,
                    "effective_cap": await _ramped_daily_limit(),
                }
        except Exception as e:
            log.warning(f"[dashboard] warmup panel failed: {e}")

        # System status traffic-light (Iter 68) — at-a-glance health
        try:
            from worker_telemetry import compute_system_status
            system_status = await compute_system_status(
                db,
                paused=bool(state.get("paused")),
                pause_reason=state.get("pause_reason"),
            )
        except Exception as e:
            log.warning(f"[dashboard] system_status compute failed: {e}")
            system_status = {"level": "red", "label": "Unknown",
                             "summary": f"telemetry error: {str(e)[:80]}",
                             "reasons": ["telemetry_compute_failed"], "workers": []}

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
            "state_filings": state_filings_panel,
            "warmup": warmup_panel,
            "system_status": system_status,
        }

    @router.post("/queue-status")
    async def queue_status_endpoint(payload: OpsAuth):
        """Iter 68b · founder-only. Real-time queue visibility.

        Returns counts + sample rows for each pipeline stage:
          - scoring_backlog          · prospects without a lead_score yet
          - send_eligible_now        · scored ≥ MIN_SCORE_TO_SEND, no email yet
          - awaiting_bump            · waiting on +45min bump after initial open
          - scheduled_followups      · cadence step 1-3 with not_before_at in future
          - in_flight_sends          · contacted in last 60min (engine actively working)
          - stalled_no_progress      · contacted >7 days ago, no reply, cadence stalled
          - cold                     · status=cold (engine has stopped reaching out)

        Each section includes the count + up to 5 sample rows for the operator
        to inspect what's actually moving / not moving.
        """
        await require_founder(payload)
        now_s = now_iso()
        sample_proj = {"_id": 0, "id": 1, "business_name": 1, "email": 1,
                       "status": 1, "lead_score": 1, "emails_sent": 1,
                       "last_email_at": 1, "not_before_at": 1, "cadence_step": 1,
                       "industry": 1, "source": 1}

        async def _count(query):
            try:
                return await db.outbound_prospects.count_documents(query)
            except Exception as e:
                log.warning(f"[queue_status] count failed: {e}")
                return 0

        async def _sample(query, sort=None, limit=5):
            try:
                cursor = db.outbound_prospects.find(query, sample_proj)
                if sort:
                    cursor = cursor.sort(sort)
                return await cursor.to_list(limit)
            except Exception as e:
                log.warning(f"[queue_status] sample failed: {e}")
                return []

        # 1 · scoring backlog (production-only)
        scoring_q = {
            "lead_score": None,
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "is_test": {"$ne": True},
            "skip_send": {"$ne": True},
        }

        # 2 · send-eligible right now (production-only)
        send_eligible_q = {
            "status": {"$in": ["new", "scored"]},
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "is_test": {"$ne": True},
            "skip_send": {"$ne": True},
            "emails_sent": {"$lte": 0},
            "lead_score": {"$gte": MIN_SCORE_TO_SEND},
            "$or": [
                {"not_before_at": {"$exists": False}},
                {"not_before_at": None},
                {"not_before_at": {"$lte": now_s}},
            ],
        }

        # 3 · awaiting bump (initial sent, no reply, awaiting +45min)
        awaiting_bump_q = {
            "status": "contacted",
            "emails_sent": 1,
            "replied_at": None,
            "bump_sent_at": None,
        }

        # 4 · scheduled follow-ups
        scheduled_followups_q = {
            "status": "contacted",
            "cadence_step": {"$gte": 1, "$lte": 3},
            "replied_at": None,
            "not_before_at": {"$gt": now_s},
        }

        # 5 · in-flight sends (last 60min)
        cutoff_60m = (now_dt() - timedelta(minutes=60)).isoformat()
        in_flight_q = {
            "last_email_at": {"$gte": cutoff_60m},
        }

        # 6 · stalled — contacted >7 days ago, cadence step 1-3, no reply
        cutoff_7d = (now_dt() - timedelta(days=7)).isoformat()
        stalled_q = {
            "status": "contacted",
            "cadence_step": {"$gte": 1, "$lte": 3},
            "replied_at": None,
            "last_email_at": {"$lt": cutoff_7d},
        }

        # 7 · cold
        cold_q = {"status": "cold"}

        # Hot leads (positive replies awaiting next-action)
        hot_q = {"status": "replied_positive"}

        # Last 5 sends + last 5 replies — recent execution evidence
        recent_sends_cursor = db.outbound_events.find(
            {"type": "sent"},
            {"_id": 0, "ts": 1, "email": 1, "kind": 1, "from_email": 1,
             "subject": 1, "prospect_id": 1, "created_at": 1},
        ).sort([("created_at", -1)]).limit(5)
        recent_sends_raw = await recent_sends_cursor.to_list(5)
        # Normalize: legacy events only have created_at; promise both ts + created_at uniformly.
        recent_sends = [
            {**e, "ts": e.get("ts") or e.get("created_at")}
            for e in recent_sends_raw
        ]

        recent_replies = await db.outbound_prospects.find(
            {"replied_at": {"$ne": None}},
            {"_id": 0, "id": 1, "email": 1, "business_name": 1,
             "replied_at": 1, "reply_category": 1, "reply_sentiment": 1},
        ).sort([("replied_at", -1)]).limit(5).to_list(5)

        return {
            "ok": True,
            "checked_at": now_s,
            "scoring_backlog": {
                "count": await _count(scoring_q),
                "sample": await _sample(scoring_q, sort=[("created_at", 1)]),
            },
            "send_eligible_now": {
                "count": await _count(send_eligible_q),
                "sample": await _sample(send_eligible_q, sort=[("lead_score", -1)]),
            },
            "awaiting_bump": {
                "count": await _count(awaiting_bump_q),
                "sample": await _sample(awaiting_bump_q, sort=[("last_email_at", 1)]),
            },
            "scheduled_followups": {
                "count": await _count(scheduled_followups_q),
                "sample": await _sample(scheduled_followups_q, sort=[("not_before_at", 1)]),
            },
            "in_flight_sends": {
                "count": await _count(in_flight_q),
                "sample": await _sample(in_flight_q, sort=[("last_email_at", -1)]),
            },
            "stalled_no_progress": {
                "count": await _count(stalled_q),
                "sample": await _sample(stalled_q, sort=[("last_email_at", 1)]),
            },
            "cold": {
                "count": await _count(cold_q),
            },
            "hot_leads": {
                "count": await _count(hot_q),
                "sample": await _sample(hot_q, sort=[("replied_at", -1)]),
            },
            "recent_sends": recent_sends,
            "recent_replies": recent_replies,
        }

    @router.post("/worker-status")
    async def worker_status(payload: OpsAuth):
        """Iter 68 · founder-only. Returns every background worker's heartbeat
        + computed traffic-light system status. The UI signal-light reads
        `system_status.level` (green / yellow / red) directly.

        When `paused=true`, the level is yellow (intentional, not a failure).
        When 2+ workers are stale OR error rate ≥50%, the level is red.
        Otherwise green."""
        await require_founder(payload)
        try:
            from worker_telemetry import compute_system_status, get_all_workers
            state = await _state()
            system_status = await compute_system_status(
                db,
                paused=bool(state.get("paused")),
                pause_reason=state.get("pause_reason"),
            )
            workers = await get_all_workers(db)
            return {
                "ok": True,
                "system_status": system_status,
                "workers": workers,
                "paused": bool(state.get("paused")),
                "pause_reason": state.get("pause_reason"),
            }
        except Exception as e:
            log.error(f"[worker_status] failed: {e}")
            return {
                "ok": False,
                "error": str(e)[:200],
                "system_status": {"level": "red", "label": "Unknown",
                                  "summary": "Telemetry error", "reasons": ["telemetry_failed"]},
                "workers": [],
            }

    @router.post("/live-feed")
    async def live_feed(payload: OpsAuth):
        """Live activity feed — last 50 execution events across the system.
        Combines: state-filings runs, autopilot runs, sends, replies, hot
        leads, unsubscribes, suppressions. Returned newest-first so the UI
        can render a Slack-style ticker."""
        await require_founder(payload)
        events: List[Dict[str, Any]] = []

        # Recent state-filings runs
        try:
            cursor = db.state_filing_runs.find({}, {"_id": 0}).sort([("started_at", -1)]).limit(15)
            async for r in cursor:
                events.append({
                    "ts": r.get("started_at"),
                    "kind": "state_filing_run",
                    "summary": (
                        f"Pulled {r.get('records_found', 0)} {r.get('state', '')} filings · "
                        f"+{r.get('records_added', 0)} added · "
                        f"+{r.get('records_forwarded', 0)} forwarded"
                    ),
                    "lane": "intake",
                    "ref": r.get("id"),
                })
        except Exception:
            pass

        # Recent autopilot cycles
        try:
            cursor = db.outbound_autopilot_runs.find({}, {"_id": 0}).sort([("started_at", -1)]).limit(10)
            async for r in cursor:
                res = r.get("result") or {}
                events.append({
                    "ts": r.get("started_at"),
                    "kind": "autopilot_cycle",
                    "summary": (
                        f"Cycle: seeded {((res.get('seeded') or {}).get('added', 0))} · "
                        f"scored {res.get('scored', 0)} · sent {res.get('sent_this_cycle', 0)}"
                    ),
                    "lane": "engine",
                    "ref": r.get("id"),
                })
        except Exception:
            pass

        # Recent sends
        try:
            cursor = db.outbound_events.find(
                {"event": {"$in": ["sent", "replied", "unsubscribed", "complained", "bounced"]}},
                {"_id": 0},
            ).sort([("ts", -1)]).limit(25)
            async for ev in cursor:
                events.append({
                    "ts": ev.get("ts"),
                    "kind": ev.get("event"),
                    "summary": f"{ev.get('event', '').title()} · {ev.get('email', '')}",
                    "lane": "outreach",
                    "ref": ev.get("prospect_id"),
                })
        except Exception:
            pass

        # Recent hot leads (positive replies)
        try:
            cursor = db.outbound_prospects.find(
                {"status": "replied_positive"},
                {"_id": 0, "id": 1, "business_name": 1, "email": 1, "replied_at": 1},
            ).sort([("replied_at", -1)]).limit(10)
            async for p in cursor:
                events.append({
                    "ts": p.get("replied_at"),
                    "kind": "hot_lead",
                    "summary": f"Hot lead created · {p.get('business_name') or p.get('email')}",
                    "lane": "hot",
                    "ref": p.get("id"),
                })
        except Exception:
            pass

        # Sort newest first, drop None timestamps to the end
        events.sort(key=lambda e: e.get("ts") or "", reverse=True)
        return {"ok": True, "events": events[:50]}

    @router.post("/live-pulse")
    async def live_pulse(payload: OpsAuth):
        """Iter 74 · founder-only consolidated dashboard pulse.

        Single low-cost endpoint that the Operator dashboard polls every
        ~4 seconds. Returns everything the Live Send Pulse UI needs in one
        response so we don't hammer the DB with 5 separate calls:

          - mode             · sandbox / production (truthful)
          - signal           · green / yellow / red
          - workers          · per-worker heartbeat ages
          - queue            · counts (in_flight, eligible, awaiting_bump,
                               scheduled_followups, scoring_backlog)
          - last_send        · most recent `sent` event (masked email)
          - next_action      · earliest not_before_at in the future
          - rates            · sends_last_hour, sends_today, replies_today
          - recent_sends     · last 5 sends (masked)
          - recent_replies   · last 5 replies (masked)
          - now              · server iso time (so client can compute drift)
        """
        await require_founder(payload)
        from worker_telemetry import compute_system_status, get_all_workers
        try:
            from data_hygiene import compute_mode_summary
        except Exception:
            compute_mode_summary = None

        state = await _state()
        paused = bool(state.get("paused"))
        signal = await compute_system_status(
            db, paused=paused, pause_reason=state.get("pause_reason")
        )
        workers = await get_all_workers(db)

        # Mode (sandbox vs production)
        mode_payload: Dict[str, Any] = {"mode": "unknown"}
        if compute_mode_summary:
            try:
                mode_payload = await compute_mode_summary(db)
            except Exception as e:
                log.warning(f"[live_pulse] mode summary failed: {e}")
                mode_payload = {"mode": "unknown", "error": str(e)[:120]}

        now_s = now_iso()
        today = today_key()

        # ---- queue counts (production-only, hygiene-respecting) ----
        prod_filter: Dict[str, Any] = {
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "is_test": {"$ne": True},
            "skip_send": {"$ne": True},
        }
        async def _count(extra: Dict[str, Any]) -> int:
            try:
                q = {**prod_filter, **extra}
                return await db.outbound_prospects.count_documents(q)
            except Exception:
                return 0

        q_in_flight = await _count({"last_email_at": {"$ne": None}, "replied_at": None})
        q_eligible = await _count({
            "status": {"$in": ["new", "scored"]},
            "emails_sent": {"$lte": 0},
            "lead_score": {"$gte": MIN_SCORE_TO_SEND},
            "$or": [
                {"not_before_at": {"$exists": False}},
                {"not_before_at": None},
                {"not_before_at": {"$lte": now_s}},
            ],
        })
        q_awaiting_bump = await _count({
            "status": "contacted",
            "last_opened_at": {"$ne": None},
            "replied_at": None,
            "bumped": {"$ne": True},
        })
        q_scheduled = await _count({
            "not_before_at": {"$gt": now_s},
            "cadence_step": {"$gte": 1},
        })
        q_scoring_backlog = await _count({"lead_score": None})

        # ---- send / reply rates ----
        async def _events_count(query: Dict[str, Any]) -> int:
            try:
                return await db.outbound_events.count_documents(query)
            except Exception:
                return 0

        # last hour iso threshold
        try:
            from datetime import datetime as _dt, timedelta as _td, timezone as _tz
            hour_ago = (
                _dt.now(_tz.utc) - _td(hours=1)
            ).isoformat().replace("+00:00", "Z")
        except Exception:
            hour_ago = now_s

        sends_last_hour = await _events_count(
            {"type": "sent", "created_at": {"$gte": hour_ago}}
        )
        sends_today = await _events_count({"type": "sent", "day_key": today})
        replies_today = await _events_count({"type": "reply", "day_key": today})

        # ---- recent send / reply samples (masked) ----
        def _mask(em: str) -> str:
            if not em or "@" not in em:
                return em or ""
            local, _, dom = em.partition("@")
            if len(local) <= 2:
                return f"{local[:1]}***@{dom}"
            return f"{local[:2]}***@{dom}"

        async def _recent(event_type: str, limit: int = 5) -> List[Dict[str, Any]]:
            try:
                items: List[Dict[str, Any]] = []
                cursor = (
                    db.outbound_events.find({"type": event_type}, {"_id": 0})
                    .sort([("created_at", -1)]).limit(limit)
                )
                async for ev in cursor:
                    pid = ev.get("prospect_id")
                    p = None
                    if pid:
                        p = await db.outbound_prospects.find_one(
                            {"id": pid},
                            {"_id": 0, "email": 1, "business_name": 1, "industry": 1, "state": 1},
                        )
                    items.append({
                        "ts": ev.get("created_at"),
                        "kind": ev.get("kind") or event_type,
                        "subject": (ev.get("subject") or "")[:120],
                        "simulated": bool(ev.get("simulated")),
                        "track_id": ev.get("track_id"),
                        "business_name": (p or {}).get("business_name"),
                        "industry": (p or {}).get("industry"),
                        "state": (p or {}).get("state"),
                        "email_masked": _mask((p or {}).get("email", "")),
                        "prospect_id": pid,
                    })
                return items
            except Exception as e:
                log.warning(f"[live_pulse] recent {event_type} failed: {e}")
                return []

        recent_sends = await _recent("sent", 5)
        recent_replies = await _recent("reply", 5)
        last_send = recent_sends[0] if recent_sends else None

        # ---- broadcast events · unified cinematic ticker stream ----
        broadcast_events: List[Dict[str, Any]] = []

        async def _broadcast_recent(event_type: str, lane: str, kind_label: str, limit: int = 8):
            try:
                cursor = (
                    db.outbound_events.find(
                        {"type": event_type}, {"_id": 0}
                    )
                    .sort([("created_at", -1)])
                    .limit(limit)
                )
                async for ev in cursor:
                    pid = ev.get("prospect_id")
                    p = None
                    if pid:
                        p = await db.outbound_prospects.find_one(
                            {"id": pid},
                            {"_id": 0, "email": 1, "business_name": 1, "industry": 1, "state": 1},
                        ) or {}
                    name = (p or {}).get("business_name") or _mask((p or {}).get("email", "")) or "—"
                    geo = " · ".join(filter(None, [(p or {}).get("industry"), (p or {}).get("state")]))
                    if event_type == "sent":
                        summary = f"Outreach sent → {name}{(' · ' + geo) if geo else ''}"
                    elif event_type == "reply":
                        cls = ev.get("reply_category") or "Reply"
                        summary = f"{cls} reply → {name}"
                    elif event_type == "demo_sent":
                        summary = f"Demo link sent → {name}"
                    elif event_type == "demo_viewed":
                        summary = f"Demo opened → {name}"
                    elif event_type == "hot_lead":
                        summary = f"Hot lead detected → {name}"
                    elif event_type == "deal_created":
                        v = ev.get("value_usd") or 0
                        summary = f"Deal created · ${int(v):,} → {name}"
                    elif event_type == "scheduled":
                        summary = f"Scheduling event → {name}"
                    elif event_type == "bumped":
                        summary = f"Follow-up bump → {name}"
                    else:
                        summary = f"{kind_label} → {name}"
                    broadcast_events.append({
                        "ts": ev.get("created_at"),
                        "kind": event_type,
                        "lane": lane,
                        "summary": summary,
                        "ref": pid or ev.get("id"),
                        "simulated": bool(ev.get("simulated")),
                    })
            except Exception as e:
                log.warning(f"[live_pulse] broadcast_recent {event_type} failed: {e}")

        await _broadcast_recent("sent",          "outreach",   "Outreach")
        await _broadcast_recent("reply",         "reply",      "Reply")
        await _broadcast_recent("demo_sent",     "demo",       "Demo sent")
        await _broadcast_recent("demo_viewed",   "demo",       "Demo viewed", limit=5)
        await _broadcast_recent("hot_lead",      "hot",        "Hot lead", limit=5)
        await _broadcast_recent("deal_created",  "deal",       "Deal", limit=5)
        await _broadcast_recent("scheduled",     "scheduling", "Scheduled", limit=5)
        await _broadcast_recent("bumped",        "outreach",   "Bump", limit=5)

        # newest first, drop None ts
        broadcast_events.sort(key=lambda e: e.get("ts") or "", reverse=True)
        broadcast_events = broadcast_events[:25]

        # ---- next scheduled action ----
        next_action: Optional[Dict[str, Any]] = None
        try:
            cursor = (
                db.outbound_prospects.find(
                    {**prod_filter, "not_before_at": {"$gt": now_s}},
                    {"_id": 0, "id": 1, "business_name": 1, "email": 1,
                     "industry": 1, "state": 1, "not_before_at": 1, "cadence_step": 1},
                )
                .sort([("not_before_at", 1)])
                .limit(1)
            )
            async for nx in cursor:
                next_action = {
                    "ts": nx.get("not_before_at"),
                    "business_name": nx.get("business_name"),
                    "industry": nx.get("industry"),
                    "state": nx.get("state"),
                    "email_masked": _mask(nx.get("email", "")),
                    "cadence_step": nx.get("cadence_step", 0),
                }
        except Exception as e:
            log.warning(f"[live_pulse] next_action failed: {e}")

        return {
            "ok": True,
            "now": now_s,
            "mode": mode_payload.get("mode") or "unknown",
            "mode_reason": mode_payload.get("mode_reason"),
            "resend_configured": mode_payload.get("resend_configured", False),
            "paused": paused,
            "pause_reason": state.get("pause_reason"),
            "signal": signal,
            "workers": workers,
            "queue": {
                "in_flight": q_in_flight,
                "eligible_now": q_eligible,
                "awaiting_bump": q_awaiting_bump,
                "scheduled_followups": q_scheduled,
                "scoring_backlog": q_scoring_backlog,
            },
            "rates": {
                "sends_last_hour": sends_last_hour,
                "sends_today": sends_today,
                "replies_today": replies_today,
            },
            "last_send": last_send,
            "next_action": next_action,
            "recent_sends": recent_sends,
            "recent_replies": recent_replies,
            "broadcast_events": broadcast_events,
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

    # ──────────────── PUSH HOT LEADS · TRACKING · WEBHOOK (Iter 50) ────────────────
    @router.post("/push-hot-leads")
    async def push_hot_leads(payload: OpsAuth):
        """Founder-triggered re-engagement scan. Finds prospects who:
          - opened OR clicked the demo URL
          - viewed a demo page
          - captured demo email (soft-gate)
        AND have not yet replied. Sends a short Calendly-only re-engage email."""
        await require_founder(payload)
        calendly = os.environ.get("CALENDLY_URL", "").strip()
        # Eligibility: any engagement signal, no reply, not suppressed, not unsubscribed
        q = {
            "replied_at": None,
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
            "is_test": {"$ne": True},
            "skip_send": {"$ne": True},
            "$or": [
                {"last_opened_at": {"$ne": None}},
                {"last_clicked_at": {"$ne": None}},
                {"captured_from_demo": True},
                {"demo_sent_at": {"$ne": None}},
            ],
        }
        candidates = await db.outbound_prospects.find(q, {"_id": 0}).to_list(200)
        sent = 0
        for p in candidates:
            try:
                # Skip if we already pushed in last 24h
                last_push = p.get("hot_push_at")
                if last_push and (now_dt() - datetime.fromisoformat(last_push)).total_seconds() < 86400:
                    continue
                first_name = (p.get("contact_name") or "").split(" ")[0] or "there"
                seg = p.get("target_segment") or "sales_team_agency"
                demo = DEMO_MAP.get(seg) or DEMO_MAP["sales_team_agency"]
                demo_url = f"{_public_base()}{demo['route']}"
                subject = "quick check"
                if calendly:
                    body = (
                        f"Hi {first_name},\n\n"
                        f"Quick check — did this apply to your setup?\n\n"
                        f"If yes, I'll map your numbers:\n{calendly}\n\n"
                        f"If you want to revisit the demo first: {demo_url}\n\n"
                        f"— Jeffrey"
                    )
                else:
                    body = (
                        f"Hi {first_name},\n\n"
                        f"Quick check — did this apply to your setup?\n\n"
                        f"If yes, I'll map your numbers — what times this week?\n\n"
                        f"Demo if helpful: {demo_url}\n\n"
                        f"— Jeffrey"
                    )
                ok = await _send_one(p, subject, body, kind="hot_push")
                if ok:
                    await db.outbound_prospects.update_one(
                        {"id": p["id"]},
                        {"$set": {"hot_push_at": now_iso()}},
                    )
                    sent += 1
            except Exception as e:
                log.error(f"hot push failed for {p.get('email')}: {e}")
        return {"ok": True, "candidates": len(candidates), "sent": sent}

    @router.get("/track/open/{track_id}")
    async def track_open(track_id: str):
        """Tracking-pixel endpoint. Logs an open event + flags the prospect.
        Returns a 1×1 transparent GIF."""
        from fastapi.responses import Response
        try:
            evt = await db.outbound_events.find_one(
                {"track_id": track_id, "type": "sent"}, {"_id": 0, "prospect_id": 1, "from_email": 1},
            )
            if evt and evt.get("prospect_id"):
                now_s = now_iso()
                await db.outbound_prospects.update_one(
                    {"id": evt["prospect_id"]},
                    {"$set": {"last_opened_at": now_s, "updated_at": now_s},
                     "$inc": {"open_count": 1}},
                )
                await db.outbound_events.insert_one({
                    "id": str(uuid.uuid4()),
                    "prospect_id": evt["prospect_id"],
                    "type": "opened",
                    "track_id": track_id,
                    "from_email": evt.get("from_email"),
                    "day_key": now_dt().strftime("%Y-%m-%d"),
                    "created_at": now_s,
                })
        except Exception as e:
            log.error(f"track_open failed for {track_id}: {e}")
        # 1×1 transparent GIF
        gif = bytes.fromhex("47494638396101000100800000000000ffffff21f90401000001002c00000000010001000002024401003b")
        return Response(content=gif, media_type="image/gif",
                        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"})

    @router.post("/resend-webhook")
    async def resend_webhook(payload: Dict[str, Any]):
        """Resend webhook receiver — opens / clicks / bounces / complaints.
        Set Resend webhook URL to: <base>/api/ops/outbound/resend-webhook
        and `RESEND_WEBHOOK_SECRET` (optional) to gate access."""
        secret = os.environ.get("RESEND_WEBHOOK_SECRET", "").strip()
        if secret and payload.get("secret") != secret:
            raise HTTPException(403, "Invalid Resend webhook secret")
        evt_type = (payload.get("type") or payload.get("event") or "").lower()
        data = payload.get("data") or payload
        resend_id = data.get("email_id") or data.get("id") or data.get("message_id")
        if not resend_id:
            return {"ok": False, "reason": "no_resend_id"}
        # Find prospect by stored last_email_resend_id
        prospect = await db.outbound_prospects.find_one(
            {"last_email_resend_id": resend_id}, {"_id": 0, "id": 1, "email": 1},
        )
        if not prospect:
            return {"ok": True, "matched": False}
        pid = prospect["id"]
        now_s = now_iso()
        if "open" in evt_type:
            await db.outbound_prospects.update_one({"id": pid}, {"$set": {"last_opened_at": now_s}, "$inc": {"open_count": 1}})
            await _log_event(pid, "opened", resend_id=resend_id)
        elif "click" in evt_type:
            await db.outbound_prospects.update_one({"id": pid}, {"$set": {"last_clicked_at": now_s}, "$inc": {"click_count": 1}})
            await _log_event(pid, "clicked", resend_id=resend_id)
        elif "bounce" in evt_type:
            await db.outbound_prospects.update_one({"id": pid}, {"$set": {"bounced": True, "suppressed": True}})
            await _suppress(prospect["email"], reason="resend_bounce")
            await _log_event(pid, "bounced", resend_id=resend_id)
        elif "complain" in evt_type or "complaint" in evt_type:
            await db.outbound_prospects.update_one({"id": pid}, {"$set": {"complained": True, "suppressed": True}})
            await _suppress(prospect["email"], reason="resend_complaint")
            await _log_event(pid, "complained", resend_id=resend_id)
        elif "delivered" in evt_type:
            await _log_event(pid, "delivered", resend_id=resend_id)
        return {"ok": True, "matched": True, "type": evt_type}

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
_DEAL_HELPER: Dict[int, Any] = {}
_CLASSIFIER_HELPER: Dict[int, Any] = {}


async def background_scheduler_loop(
    db, send_outbound_email, send_founder_notification, interval_sec: int = 300
) -> None:
    """Every `interval_sec`, calls the internal tick helper. Respects daily
    limit + pause state. Disabled when OUTBOUND_SCHEDULER=off."""
    if os.environ.get("OUTBOUND_SCHEDULER", "on").lower() == "off":
        log.info("[outbound] scheduler disabled by env")
        return
    log.info("[outbound] scheduler loop starting")
    from worker_telemetry import record_heartbeat
    while True:
        try:
            await _standalone_process_queue(db, send_outbound_email, send_founder_notification)
            await record_heartbeat(db, "scheduler_loop", ok=True, interval_sec=interval_sec)
        except Exception as e:
            log.error(f"[outbound] scheduler tick error: {e}")
            await record_heartbeat(db, "scheduler_loop", ok=False, error=str(e), interval_sec=interval_sec)
        await asyncio.sleep(interval_sec + secrets.randbelow(31) - 15)


# ════════════════════════════════════════════════════════════════════
# IMAP REPLY POLLER — Phase 2 light implementation
# ════════════════════════════════════════════════════════════════════
async def standalone_create_deal(db, prospect: Dict[str, Any], trigger: str = "demo_capture") -> Dict[str, Any]:
    """Module-level idempotent deal creator usable by /api/demo/capture and IMAP poller.
    Mirrors the closure version inside make_outbound_router."""
    if prospect.get("deal_id"):
        return {
            "deal_id": prospect["deal_id"],
            "deal_value_usd": prospect.get("deal_value_usd"),
            "is_new": False,
        }
    seg = prospect.get("target_segment") or "sales_team_agency"
    value = (
        ENTERPRISE_PIPELINE_VALUE if prospect.get("enterprise_tier") is True
        else SEGMENT_PIPELINE_VALUES.get(seg, SEGMENT_PIPELINE_DEFAULT)
    )
    deal_id = str(uuid.uuid4())
    now_s = datetime.now(timezone.utc).isoformat()
    await db.outbound_prospects.update_one(
        {"id": prospect["id"]},
        {"$set": {
            "deal_id": deal_id,
            "deal_value_usd": value,
            "deal_created_at": now_s,
            "deal_trigger": trigger,
            "status": "qualified" if prospect.get("status") not in ("won", "lost") else prospect.get("status"),
            "updated_at": now_s,
        }},
    )
    try:
        await db.ops_leads.update_one(
            {"source_outbound_prospect_id": prospect["id"]},
            {"$setOnInsert": {
                "id": str(uuid.uuid4()),
                "name": prospect.get("contact_name") or prospect.get("business_name") or prospect.get("email"),
                "company": prospect.get("business_name"),
                "email": prospect.get("email"),
                "industry": SEGMENT_DISPLAY.get(seg, seg),
                "status": "qualified",
                "value_usd": value,
                "source": "outbound_engine",
                "source_outbound_prospect_id": prospect["id"],
                "source_demo": prospect.get("source_demo"),
                "by_email": os.environ.get("FOUNDER_EMAIL", "").strip() or "founder@creatorboostai.com",
                "assigned_to_email": None,
                "trigger": trigger,
                "created_at": now_s,
                "updated_at": now_s,
            }},
            upsert=True,
        )
    except Exception as e:
        log.error(f"[deal] ops_leads mirror failed for {prospect.get('email')}: {e}")
    await db.outbound_events.insert_one({
        "id": str(uuid.uuid4()),
        "prospect_id": prospect["id"],
        "type": "deal_created",
        "value_usd": value,
        "trigger": trigger,
        "segment": seg,
        "day_key": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": now_s,
    })
    return {"deal_id": deal_id, "deal_value_usd": value, "is_new": True}


async def standalone_classify_reply(prospect: Dict[str, Any], reply_body: str) -> Dict[str, Any]:
    """Module-level 3-bucket reply classifier (interested|neutral|not_interested).
    Uses Claude when EMERGENT_LLM_KEY is set, otherwise keyword heuristic."""
    body = (reply_body or "").strip()
    b_lower = body.lower()
    positive_kw = ("interested", "sounds good", "yes", "yeah", "yep", "tell me more",
                   "let's", "book", "call", "demo", "see it", "schedule")
    negative_kw = ("unsubscribe", "remove me", "not interested", "no thanks",
                   "stop", "do not contact", "wrong person", "wrong contact")
    keyword_bucket = (
        "interested" if any(k in b_lower for k in positive_kw) and not any(k in b_lower for k in negative_kw)
        else "not_interested" if any(k in b_lower for k in negative_kw)
        else "neutral"
    )
    if not (LlmChat and LlmUserMessage and os.environ.get("EMERGENT_LLM_KEY", "").strip()):
        return {"bucket": keyword_bucket, "rationale": "keyword-heuristic (no LLM)", "via": "heuristic"}
    try:
        seg = prospect.get("target_segment") or "sales_team_agency"
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", "").strip(),
            session_id=f"reply-classify-{prospect['id']}",
            system_message=(
                "You are a B2B sales reply classifier. Read the prospect's reply and "
                "output STRICT JSON with exactly these keys:\n"
                "  bucket: one of 'interested' | 'neutral' | 'not_interested'\n"
                "  rationale: <12 words explaining the call>\n"
                "Definitions:\n"
                "- interested: explicitly wants more info, a demo, a call, pricing, or asks any qualifying question\n"
                "- neutral: ambiguous, asks for time, says 'maybe', no clear yes or no\n"
                "- not_interested: polite no, unsubscribe, wrong person, do not contact, asks to be removed\n"
                "No prose outside the JSON."
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        msg = LlmUserMessage(text=(
            f"Segment: {SEGMENT_DISPLAY.get(seg, seg)}\n"
            f"Prospect company: {prospect.get('business_name') or '—'}\n"
            f"Reply body:\n\"\"\"\n{body[:2000]}\n\"\"\"\n"
            f"Output the classification JSON now."
        ))
        raw = await chat.send_message(msg)
        if hasattr(raw, "content"):
            raw = raw.content
        import json as _json
        m = re.search(r"\{.*\}", str(raw), flags=re.S)
        if m:
            obj = _json.loads(m.group(0))
            bucket = (obj.get("bucket") or "").strip().lower()
            if bucket in ("interested", "neutral", "not_interested"):
                return {"bucket": bucket, "rationale": (obj.get("rationale") or "")[:200], "via": "claude"}
    except Exception as e:
        log.error(f"[reply-classifier] Claude failed: {e}")
    return {"bucket": keyword_bucket, "rationale": "fallback-keyword-heuristic", "via": "heuristic"}


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
        b = m["body"].lower()
        # "Reply YES" / "YES" shortcut — auto-respond with Calendly link
        is_yes_shortcut = bool(re.match(r"^\s*(yes|yeah|yep|sure|ok|sounds good|let'?s do it)[\s\.\!\?]*$", b.strip().split("\n")[0][:60]))
        # AI 3-bucket classifier (Demo-First spec) — interested/neutral/not_interested
        try:
            classification = await standalone_classify_reply(prospect, m["body"])
        except Exception as _e:
            log.error(f"[imap] classifier failed: {_e}")
            classification = {"bucket": "neutral", "rationale": "classifier-error", "via": "heuristic"}
        bucket = classification["bucket"]
        sentiment = "positive" if bucket == "interested" else ("negative" if bucket == "not_interested" else "neutral")
        status = "replied_positive" if bucket == "interested" else ("not_interested" if bucket == "not_interested" else "replied")
        await db.outbound_prospects.update_one(
            {"id": prospect["id"]},
            {"$set": {
                "status": status,
                "replied_at": datetime.now(timezone.utc).isoformat(),
                "reply_body": m["body"][:4000],
                "reply_subject": m["subject"],
                "reply_sentiment": sentiment,
                "reply_category": "yes_shortcut" if is_yes_shortcut else bucket,
                "reply_classifier_via": classification.get("via"),
                "reply_classifier_rationale": classification.get("rationale"),
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
            "category": bucket,
            "source": "imap",
            "yes_shortcut": is_yes_shortcut,
        })
        if bucket == "not_interested":
            await db.outbound_suppression.update_one(
                {"email": m["from"]},
                {"$set": {"reason": "imap_not_interested", "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
            await db.outbound_prospects.update_one({"id": prospect["id"]}, {"$set": {"suppressed": True}})
            try:
                await db.ops_leads.update_one(
                    {"source_outbound_prospect_id": prospect["id"]},
                    {"$set": {"status": "lost", "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
            except Exception:
                pass
        # Interested → INSTANT CLOSE TRIGGER (Iter 50): auto-create Deal + flag HOT + auto-Calendly
        if bucket == "interested":
            try:
                p_fresh = await db.outbound_prospects.find_one({"id": prospect["id"]}, {"_id": 0})
                if p_fresh:
                    await standalone_create_deal(db, p_fresh, trigger="imap_reply_interested")
                # Flag HOT + push to top
                await db.outbound_prospects.update_one(
                    {"id": prospect["id"]},
                    {"$set": {
                        "intent_level": "HIGH_INTENT",
                        "priority": "immediate",
                        "hot_lead": True,
                        "hot_lead_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                # Auto-send Calendly + founder notify
                calendly = os.environ.get("CALENDLY_URL", "").strip()
                if calendly:
                    try:
                        from email_service import send_from
                        first_name = (prospect.get("contact_name") or "").split(" ")[0] or "there"
                        body_html = (
                            f"<p>Hi {first_name},</p>"
                            f"<p>Perfect — I'll map this to your numbers. "
                            f"Grab a quick time here:<br/>"
                            f"<a href='{calendly}'>{calendly}</a></p>"
                            f"<p>— Jeffrey</p>"
                        )
                        # Reuse the same sender that was used originally (or rotate)
                        from_email = prospect.get("last_email_from") or "info@creatorboostai.com"
                        await send_from(from_email, m["from"], f"Re: {m['subject']}", body_html)
                        await db.outbound_events.insert_one({
                            "id": str(uuid.uuid4()),
                            "prospect_id": prospect["id"],
                            "type": "calendly_sent",
                            "trigger": "imap_instant_close",
                            "day_key": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "calendly_url": calendly,
                            "from_email": from_email,
                        })
                        log.info(f"[imap] INSTANT CLOSE → Calendly auto-sent to {m['from']}")
                    except Exception as _e:
                        log.error(f"[imap] instant-close Calendly send failed: {_e}")
            except Exception as _e:
                log.error(f"[imap] instant-close failed: {_e}")
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
    from worker_telemetry import record_heartbeat
    while True:
        try:
            await _imap_poll_once(db)
            await record_heartbeat(db, "imap_poller", ok=True, interval_sec=interval_sec)
        except Exception as e:
            log.error(f"[imap] tick error: {e}")
            await record_heartbeat(db, "imap_poller", ok=False, error=str(e), interval_sec=interval_sec)
        await asyncio.sleep(interval_sec + secrets.randbelow(31) - 15)


async def daily_autopilot_loop(db, send_outbound_email, send_founder_notification, interval_sec: int = 86400) -> None:
    """Once per `interval_sec` (default 24h), run a complete autopilot cycle:
    seed → external pulls → score → send → IMAP → finalize cold. Disabled
    when AUTOPILOT_LOOP=off."""
    if os.environ.get("AUTOPILOT_LOOP", "on").lower() == "off":
        log.info("[autopilot] daily loop disabled by env")
        return
    log.info(f"[autopilot] daily loop starting · interval={interval_sec}s")
    from worker_telemetry import record_heartbeat
    # First run after a short delay so the server can fully boot
    await asyncio.sleep(60)
    while True:
        cycle_ok = True
        cycle_err: Optional[str] = None
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
                    cycle_ok = False
                    cycle_err = str(e)
        except Exception as e:
            log.error(f"[autopilot] cycle error: {e}")
            cycle_ok = False
            cycle_err = str(e)
        await record_heartbeat(db, "daily_autopilot_loop", ok=cycle_ok, error=cycle_err,
                               interval_sec=interval_sec)
        await asyncio.sleep(interval_sec + secrets.randbelow(121) - 60)


_AUTOPILOT_HELPERS: Dict[int, Any] = {}


__all__ = ["make_outbound_router", "background_scheduler_loop", "imap_poller_loop", "_imap_poll_once", "daily_autopilot_loop"]
