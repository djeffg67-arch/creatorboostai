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

from fastapi import APIRouter, HTTPException, UploadFile
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
]

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
}

DAILY_LIMIT_DEFAULT = 50
SEND_WINDOW_HOURS = 14                 # spread sends across 14-hour workday
MIN_SEND_SPACING_SEC = 60              # hard floor between two sends
BOUNCE_RATE_PAUSE_THRESHOLD = 0.05     # auto-pause if ≥5 % over last 7 days
COMPLAINT_RATE_PAUSE_THRESHOLD = 0.003  # auto-pause if ≥0.3 % over last 7 days
FOLLOWUP_OFFSETS_DAYS = [2, 5, 8]       # cadence · FU1 / FU2 / FU3
MAX_EMAILS_BEFORE_COLD = 4              # initial + 3 follow-ups → then cold
DEMO_VIEWER_DELAY_MIN_HRS = 12          # warm demo viewer delay lower bound
DEMO_VIEWER_DELAY_MAX_HRS = 24          # warm demo viewer delay upper bound
DEMO_VIEWER_BASELINE_SCORE = 82         # pre-scored warm lead baseline

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
        if is_demo_viewer:
            system = (
                "You are writing a first follow-up email to someone who just viewed a CreatorBoostAI demo "
                "but did NOT book or purchase. They already know the product visually — do NOT re-explain it. "
                "Acknowledge they explored the demo. Offer a concrete next step (short call, or a specific signal-pack). "
                f"Style: 80-110 words, plain text, no hype, no !!!, no ALL CAPS. Subject style: {style_hint}. "
                "Output STRICT JSON only: {\"subject\": \"...\", \"body\": \"...\"}"
            )
        else:
            system = (
                "You are writing a cold-outreach email on behalf of the CreatorBoostAI team. "
                "Style: short, human, specific, zero fluff, no hype, no spam tokens. "
                "CONSTRAINTS: total email body <= 110 words. Zero !!! zero ALL CAPS. "
                "Include at most one link. Plain text, no markdown. "
                "Structure: 1-line opener specific to their business · 1-line pain point · "
                "1-line how CreatorBoostAI helps · soft CTA (one short question). "
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
        system = (
            "You are drafting a reply to a warm prospect who showed interest. "
            "Style: warm, short, offer a concrete next step (demo, brief call, or link). "
            "Include exactly one link: the best-fit demo URL provided. "
            "Output STRICT JSON: {\"subject\": \"...\", \"body\": \"...\"}"
        )
        user = (
            f"Prospect: {p.get('contact_name') or p.get('business_name')}\n"
            f"They replied: {reply_body[:1200]}\n"
            f"Best-fit demo URL to include: {full_demo}\n"
            f"Offer: {p.get('recommended_offer') or 'book a 20-min call'}"
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
        """Send one email with footer + unsub, log the event, bump counters."""
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
                "lead_score": {"$gte": 40},
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

    async def _process_queue() -> int:
        """Returns number of emails sent this invocation. Respects daily limit +
        pause state + natural spacing."""
        state = await _state()
        if state.get("paused"):
            return 0
        daily_limit = int(state.get("daily_limit", DAILY_LIMIT_DEFAULT))
        sent_today = await _today_sent_count()
        remaining = daily_limit - sent_today
        if remaining <= 0:
            return 0

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
                if kind == "initial":
                    include_teaser = int(p.get("lead_score", 0)) >= 70
                    draft = await _draft_email(p, include_teaser)
                else:
                    draft = await _draft_followup(p, which)
                ok = await _send_one(p, draft["subject"], draft["body"], kind=kind)
                if ok:
                    sent_count += 1
                    # natural spacing
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
        positive = payload.positive
        status = "replied_positive" if positive else ("not_interested" if positive is False else "replied")
        await db.outbound_prospects.update_one(
            {"id": p["id"]},
            {"$set": {
                "status": status,
                "replied_at": now_iso(),
                "reply_body": payload.reply_body,
                "reply_sentiment": (
                    "positive" if positive is True else "negative" if positive is False else "neutral"
                ),
                "updated_at": now_iso(),
            }},
        )
        await _log_event(p["id"], "replied", sentiment=status)

        # If positive → draft an AI reply into the approval queue.
        if positive is True:
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
                    "created_at": now_iso(),
                })
            except Exception as e:
                log.error(f"positive reply draft failed: {e}")

            # Notify founder
            try:
                await send_founder_notification(
                    to_email=os.environ.get("FOUNDER_EMAIL", "").strip() or os.environ.get("APPLICATIONS_INBOX", "").strip(),
                    subject=f"[CreatorBoostAI] Positive reply · {p['business_name']}",
                    body_html=(
                        f"<p><strong>{p['business_name']}</strong> ({p['email']}) replied positively.</p>"
                        f"<p><em>{(payload.reply_body or '')[:800]}</em></p>"
                        f"<p>AI draft queued in /portal/ops → Outbound → Drafts.</p>"
                    ),
                )
            except Exception:
                pass

        # If negative → suppress.
        if positive is False:
            await _suppress(p["email"], reason="marked_not_interested")
            await db.outbound_prospects.update_one({"id": p["id"]}, {"$set": {"suppressed": True}})
        return {"ok": True, "status": status}

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
        }
        return mapping.get(d, "sales_team_agency")

    @router.post("/seed-from-demos")
    async def seed_from_demos(payload: OpsAuth):
        await require_founder(payload)
        r = await _seed_demo_viewers(max_per_run=100)
        return {"ok": True, **r}

    @router.post("/run-tick")
    async def run_tick(payload: OpsAuth):
        """Manual kick of the scheduler. Background loop also runs every 5 min."""
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
        })
        if negative:
            await db.outbound_suppression.update_one(
                {"email": m["from"]},
                {"$set": {"reason": "imap_opted_out", "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
            await db.outbound_prospects.update_one({"id": prospect["id"]}, {"$set": {"suppressed": True}})
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


__all__ = ["make_outbound_router", "background_scheduler_loop", "imap_poller_loop", "_imap_poll_once"]
