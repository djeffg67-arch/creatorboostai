"""Avatar Intelligence Layer (Iter 52)

Multi-agent orchestrator for the CreatorBoostAI conversational avatar. Per
Jeffrey's spec — the brain (this module) lives inside the platform; visual
avatar provider (HeyGen / D-ID) plugs in later as a face/voice layer.

Endpoints (all under /api/avatar):
  - POST /chat           — regular request/response JSON
  - POST /chat-stream    — Server-Sent Events streaming
  - POST /escalate       — log to avatar_escalations + notify founder
  - POST /quick-context  — fetch live CB context for a session (used by widget on first open)

Design rules (Jeffrey's non-negotiables):
  1. Every response can carry structured `actions[]` the frontend executes
  2. Exclusive Lead Engine messaging baked into the system prompt
  3. Speed: Claude Haiku 4.5 default; auto-escalate to Sonnet 4.5 for pricing/strategy/objections
  4. Live CB context injected per turn (leads, demos, subscription, follow-ups, hot leads)
  5. Founder-escalation hook on low-confidence answers
"""
from __future__ import annotations

import os
import re
import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

log = logging.getLogger("avatar")

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
except Exception:
    LlmChat = LlmUserMessage = None  # type: ignore

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()

# Speed-vs-depth model selection
FAST_MODEL = "claude-haiku-4-5-20251001"
DEEP_MODEL = "claude-sonnet-4-5-20250929"

# Triggers for the deep model. If any phrase in the user's message matches,
# we switch to Sonnet.
DEEP_TRIGGERS = (
    "pricing", "price", "cost", "how much", "subscription", "upgrade", "plan",
    "investor", "objection", "compare", "alternative", "strategy", "roadmap",
    "founder", "negotiate", "enterprise", "contract", "rfp", "procurement",
    "data privacy", "compliance", "soc2", "gdpr",
)

# Action verbs the LLM may emit. Frontend MUST map each to a real navigation /
# trigger. Anything outside this set is silently dropped.
ALLOWED_ACTIONS = {
    "route_to_demo",       # {demo: airport|supermarket|education|c_store|insurance|realtor|contractor|creator|noldus}
    "capture_lead",        # {fields:{name,email,company,role,industry}}
    "open_pricing",        # {plan?: starter|growth|pro}
    "start_signup",        # {plan?: ...}
    "schedule_followup",   # {when?: '2-days', topic?: 'demo'}
    "escalate_to_founder", # {reason: ...}
    "open_calendly",       # {url}
    "show_quick_replies",  # {chips:[...]}
}

# Quick-reply chips for the homepage widget on first open.
HOMEPAGE_QUICK_REPLIES = [
    "How does this get me leads?",
    "Show me the airport demo",
    "Show me the supermarket demo",
    "Pricing",
    "How is this different from Apollo?",
    "Tell me about the Exclusive Lead Engine",
    "I want to start",
    "Talk to founder",
]


# Demo route keywords — used by both the system prompt (so the avatar knows
# what to say) and the action extractor (so the frontend can navigate).
DEMO_ROUTES = {
    "airport":     "/demo/airport",
    "supermarket": "/demo/supermarket",
    "c_store":     "/demo/supermarket",
    "education":   "/demo/education",
    "school":      "/demo/education",
    "insurance":   "/demo/insurance",
    "realtor":     "/demo/realtor",
    "real_estate": "/demo/realtor",
    "contractor":  "/lighting",
    "noldus":      "/demo/noldus",
    "enterprise":  "/demo/noldus",
    "creator":     "/demo/creator",
    "lighting":    "/lighting",
}


# ──────────────── SYSTEM PROMPT ────────────────
def _system_prompt(role: str, context: Dict[str, Any]) -> str:
    """Build the role-tagged system prompt with live CB context injected."""
    base = (
        "You are the CreatorBoostAI avatar — an AI business operator, NOT a basic chatbot. "
        "You speak on behalf of CreatorBoostAI: an AI business execution system that helps "
        "companies, sales reps, contractors, realtors, insurance agents, supermarkets, "
        "convenience stores, startups, influencers and other sectors generate leads, manage "
        "follow-up, automate revenue actions, and grow without giving duplicate leads to "
        "competing users.\n\n"
        "═══ POSITIONING (use this language consistently) ═══\n"
        "• CreatorBoostAI is NOT just a demo tool. It is an AI execution system.\n"
        "• Every lead inside CreatorBoostAI is EXCLUSIVE — never shared, never duplicated, never resold.\n"
        "• The Exclusive Lead Engine locks each lead to one user/rep/company. Global ownership tracking.\n"
        "• No two reps ever work the same lead. That alone beats Apollo, ZoomInfo, lead vendors, marketing agencies.\n"
        "• Sectors served: real estate, insurance, retail, contractors, enterprise, supermarkets, c-stores, education, sales teams, creators.\n\n"
        "═══ STYLE ═══\n"
        "Direct. Confident. Business-focused. Zero corporate fluff. No emoji. No exclamation marks. "
        "No 'great question'. Get to value in the first sentence.\n\n"
        "═══ ACTIONS ═══\n"
        "When the user asks to see something or take a step, emit a structured action so the "
        "interface can take real action — not just talk. Available actions:\n"
        "  • route_to_demo {demo}        - send the user to a specific industry demo\n"
        "    valid demos: airport, supermarket, c_store, education, insurance, realtor, contractor, noldus, creator\n"
        "  • capture_lead {fields}       - ask for name+email+company+role to log a lead\n"
        "  • open_pricing {plan?}        - send to /pricing (optional plan: starter|growth|pro)\n"
        "  • start_signup {plan?}        - kick off Stripe checkout\n"
        "  • schedule_followup {topic?}  - log a follow-up reminder\n"
        "  • escalate_to_founder {reason}- when you cannot confidently answer\n"
        "  • open_calendly               - send to Jeffrey's Calendly\n"
        "  • show_quick_replies {chips}  - present clickable chips\n\n"
        "Output STRICT JSON only:\n"
        "{\"reply\": \"<2-4 sentences max>\", \"actions\": [{\"type\":\"...\",\"...\":\"...\"}]}\n"
        "If no action fits, return actions: []. Keep replies SHORT — the user is in a live conversation.\n"
    )

    role_tags = {
        "presenter": (
            "═══ ROLE: PRESENTER ═══\n"
            "You are guiding the user through a demo. Reference the right industry demo based on "
            "what they hint at. Always name the specific demo route they should see next.\n"
        ),
        "research": (
            "═══ ROLE: RESEARCH ═══\n"
            "User is asking for industry-specific context, comparisons, or proof points. Cite "
            "concrete pain points and ROI. Mention the Exclusive Lead Engine differentiator.\n"
        ),
        "lead": (
            "═══ ROLE: LEAD CAPTURE ═══\n"
            "User is showing intent. Ask for name + email + company + role IF you don't already "
            "have them in the captured_lead context. Emit `capture_lead` action with the fields you've "
            "collected so the UI can persist + lock the lead in the Exclusive Lead Engine.\n"
        ),
        "revenue": (
            "═══ ROLE: REVENUE ═══\n"
            "User is asking about pricing, plans, or signup. Decide which tier to recommend by\n"
            "looking at LIVE CONTEXT below — specifically `is_signed_in`, `my_leads`, and\n"
            "`user.subscription`.\n"
            "  STARTUP TIERS (recommend if anonymous, brand-new, my_leads=0, or user calls\n"
            "  themselves a startup/solo/just-launching/early-stage):\n"
            "    • Starter Launch  $29/mo  - 10 leads/day, no follow-ups, single sender\n"
            "    • Growth Launch   $79/mo  - 25 leads/day, follow-ups on, single sender\n"
            "    • Pro Launch     $149/mo  - 50 leads/day, follow-ups, multi-sender, hot leads\n"
            "  STANDARD TIERS (recommend if user has a team / scaling / mentions reps /\n"
            "  multi-office / >25 leads in their pipeline):\n"
            "    • Starter   $97/mo   - solo operator, light usage\n"
            "    • Growth   $297/mo   - sales teams, full automation\n"
            "    • Pro      $597/mo   - multi-rep, multi-sector\n"
            "    • Enterprise: $7K-$200K engagements (Stripe + Calendly route)\n"
            "Always recommend ONE tier confidently. If unsure, default to Starter Launch ($29).\n"
            "Emit `open_pricing` with the matching plan key (startup_starter | startup_growth |\n"
            "startup_pro | starter | growth | pro) so the UI can scroll to that card.\n"
        ),
        "followup": (
            "═══ ROLE: FOLLOW-UP ═══\n"
            "User wants to be contacted later or scheduled. Emit `schedule_followup` or "
            "`open_calendly` action. Capture lead if not yet captured.\n"
        ),
    }

    ctx_str = json.dumps(context, default=str)[:3500]
    ctx_block = (
        "═══ LIVE CONTEXT (this user, right now) ═══\n"
        f"{ctx_str}\n"
        "Use this context to give answers that feel personal — reference the user's leads, "
        "demos viewed, subscription state if relevant.\n"
    )
    return base + role_tags.get(role, role_tags["presenter"]) + ctx_block


# ──────────────── ROLE ROUTING ────────────────
ROLE_KEYWORDS = {
    "revenue":  ("price", "pricing", "cost", "plan", "subscription", "starter", "growth", "pro", "upgrade", "billing", "checkout", "buy", "signup", "sign up", "start", "free trial"),
    "research": ("how does", "compare", "difference", "vs ", "versus", "apollo", "zoominfo", "exclusive", "ownership", "duplicate", "investor", "case study", "stat", "roi", "savings"),
    "lead":     ("interested", "i want", "i'd like", "name is", "email", "my company", "my business", "we are", "we run", "we operate", "talk to me"),
    "followup": ("schedule", "later", "follow up", "follow-up", "calendly", "call me", "reach me", "follow back"),
    "presenter":("demo", "show", "see", "watch", "walk me", "airport", "supermarket", "c-store", "school", "education", "realtor", "real estate", "insurance", "contractor"),
}


def _classify_role(user_msg: str) -> str:
    msg = (user_msg or "").lower()
    scores: Dict[str, int] = {role: 0 for role in ROLE_KEYWORDS}
    for role, keys in ROLE_KEYWORDS.items():
        for k in keys:
            if k in msg:
                scores[role] += 1
    best = max(scores.items(), key=lambda x: x[1])
    return best[0] if best[1] > 0 else "presenter"


def _pick_model(user_msg: str, role: str) -> str:
    """Default fast; escalate to deep on heavy topics."""
    msg = (user_msg or "").lower()
    if role in ("revenue", "research"):
        return DEEP_MODEL
    if any(t in msg for t in DEEP_TRIGGERS):
        return DEEP_MODEL
    if len(msg) > 240:
        return DEEP_MODEL
    return FAST_MODEL


# ──────────────── CONTEXT BUILDER ────────────────
async def build_context(db, *, user_email: Optional[str], session_id: str) -> Dict[str, Any]:
    """Pull live CB data for personalization. Anonymous (homepage) sessions
    get a lightweight context; signed-in users get their full state."""
    ctx: Dict[str, Any] = {
        "session_id": session_id,
        "now_utc": datetime.now(timezone.utc).isoformat(),
        "is_signed_in": bool(user_email),
        "exclusive_lead_engine": {
            "rule": "Every lead is locked to one user/rep/company globally. No duplicates. No reselling.",
            "differentiator_vs": ["Apollo", "ZoomInfo", "lead vendors", "marketing agencies"],
        },
        "available_demos": list({k for k, v in DEMO_ROUTES.items()}),
        "pricing": {
            "startup_starter": {"price": 29,  "per": "month", "fit": "brand-new businesses · 10 leads/day"},
            "startup_growth":  {"price": 79,  "per": "month", "fit": "early-stage · 25 leads/day · follow-ups"},
            "startup_pro":     {"price": 149, "per": "month", "fit": "scaling startup · 50 leads/day · multi-sender · hot leads"},
            "starter":   {"price": 97,  "per": "month", "fit": "solo operator"},
            "growth":    {"price": 297, "per": "month", "fit": "sales teams"},
            "pro":       {"price": 597, "per": "month", "fit": "multi-rep, multi-sector"},
            "enterprise":{"price_range": "7000-200000", "fit": "high-stakes engagements"},
        },
    }
    if user_email:
        try:
            user = await db.users.find_one({"email": user_email}, {"_id": 0, "name": 1, "role": 1, "subscription": 1})
            if user:
                ctx["user"] = user
            # Lead counts for this user
            ctx["my_leads"] = await db.leads_registry.count_documents({"assigned_to_user_id": user_email})
            ctx["my_hot_leads"] = await db.leads_registry.count_documents({
                "assigned_to_user_id": user_email,
                "status": {"$in": ["responded", "meeting_set"]},
            })
            ctx["my_outbound_prospects"] = await db.outbound_prospects.count_documents({})
            # Recent demo views (capped 5)
            recent_demos = []
            async for r in db.demo_page_views.find(
                {"viewer_email": user_email}, {"_id": 0, "demo": 1, "created_at": 1},
            ).sort("created_at", -1).limit(5):
                recent_demos.append(r)
            ctx["recent_demos_viewed"] = recent_demos
        except Exception as e:
            log.error(f"build_context failed: {e}")
    return ctx


# ──────────────── ACTION EXTRACTOR ────────────────
_DEMO_REGEX = re.compile(r"(airport|supermarket|c[\s-]?store|education|school|insurance|realtor|real[\s-]?estate|contractor|noldus|creator|enterprise|lighting)", re.I)


def _normalize_actions(actions: List[Dict[str, Any]], user_msg: str) -> List[Dict[str, Any]]:
    """Whitelist + normalize. Strip unknown action types. Validate demo names."""
    out: List[Dict[str, Any]] = []
    seen_types: set = set()
    for a in actions or []:
        if not isinstance(a, dict):
            continue
        t = (a.get("type") or "").strip().lower()
        if t not in ALLOWED_ACTIONS or t in seen_types:
            continue
        if t == "route_to_demo":
            d = (a.get("demo") or "").strip().lower().replace("-", "_").replace(" ", "_")
            if d in DEMO_ROUTES:
                out.append({"type": "route_to_demo", "demo": d, "route": DEMO_ROUTES[d]})
                seen_types.add(t)
            continue
        if t == "open_calendly":
            out.append({"type": "open_calendly",
                        "url": os.environ.get("CALENDLY_URL", "").strip() or "https://calendly.com/j-davidg67/30min"})
            seen_types.add(t)
            continue
        if t == "open_pricing":
            plan = (a.get("plan") or "").strip().lower()
            payload = {"type": "open_pricing", "route": "/pricing"}
            if plan in ("starter", "growth", "pro"):
                payload["plan"] = plan
            out.append(payload)
            seen_types.add(t)
            continue
        if t == "start_signup":
            out.append({"type": "start_signup", "plan": (a.get("plan") or "").strip().lower() or None})
            seen_types.add(t)
            continue
        if t == "capture_lead":
            fields = a.get("fields") or {}
            out.append({"type": "capture_lead", "fields": fields})
            seen_types.add(t)
            continue
        if t == "schedule_followup":
            out.append({"type": "schedule_followup",
                        "topic": (a.get("topic") or "general"),
                        "when": (a.get("when") or "2_days")})
            seen_types.add(t)
            continue
        if t == "escalate_to_founder":
            out.append({"type": "escalate_to_founder",
                        "reason": (a.get("reason") or "user request")[:200]})
            seen_types.add(t)
            continue
        if t == "show_quick_replies":
            out.append({"type": "show_quick_replies",
                        "chips": list((a.get("chips") or [])[:8])})
            seen_types.add(t)
            continue
    # Heuristic: if user mentioned a demo by name and the model didn't emit a
    # route_to_demo action, add one ourselves.
    if "route_to_demo" not in seen_types:
        m = _DEMO_REGEX.search(user_msg or "")
        if m:
            d = m.group(1).lower().replace("-", "_").replace(" ", "_")
            if d in DEMO_ROUTES:
                out.append({"type": "route_to_demo", "demo": d, "route": DEMO_ROUTES[d]})
    return out


# ──────────────── LLM CALLERS ────────────────
def _new_chat(model: str, system: str, session_id: str) -> "LlmChat":
    if not (LlmChat and LlmUserMessage and EMERGENT_LLM_KEY):
        raise RuntimeError("LLM not configured (EMERGENT_LLM_KEY missing)")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system,
    )
    # Anthropic via emergent integrations
    return chat.with_model("anthropic", model)


async def _call_llm(model: str, system: str, history: List[Dict[str, str]], session_id: str) -> str:
    chat = _new_chat(model, system, session_id)
    # emergent integrations LlmChat retains conversation state by session_id;
    # we fall back to one-shot semantics: send the latest user message after
    # priming with prior turns (best-effort; provider varies).
    last_user = ""
    for turn in history:
        if turn.get("role") == "user":
            last_user = turn.get("content", "")
    if not last_user:
        last_user = "Hello"
    msg = LlmUserMessage(text=last_user)
    raw = await chat.send_message(msg)
    if hasattr(raw, "content"):
        raw = raw.content
    return str(raw)


def _parse_llm_json(raw: str) -> Dict[str, Any]:
    """Tolerant JSON extraction. Returns {reply, actions}."""
    if not raw:
        return {"reply": "Sorry, I couldn't form a response. Try asking a different way.", "actions": []}
    m = re.search(r"\{.*\}", raw, flags=re.S)
    if m:
        try:
            obj = json.loads(m.group(0))
            reply = (obj.get("reply") or "").strip()
            actions = obj.get("actions") or []
            if reply:
                return {"reply": reply, "actions": actions if isinstance(actions, list) else []}
        except Exception:
            pass
    # Fallback: strip JSON markers, return as-is
    txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.M).strip()
    return {"reply": txt[:1000], "actions": []}


# ──────────────── REQUEST MODELS ────────────────
class ChatTurn(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    user_email: Optional[str] = None
    history: List[ChatTurn] = Field(default_factory=list)
    surface: str = Field(default="homepage", description="homepage | portal | demo")


class EscalateRequest(BaseModel):
    session_id: str
    user_email: Optional[str] = None
    reason: str
    last_message: Optional[str] = None
    contact: Optional[Dict[str, Any]] = None


class QuickContextRequest(BaseModel):
    session_id: Optional[str] = None
    user_email: Optional[str] = None


# ──────────────── ROUTER ────────────────
def make_avatar_router(db, send_founder_notification=None, require_founder=None) -> APIRouter:
    router = APIRouter(prefix="/api/avatar", tags=["avatar"])

    async def _handle_chat(req: ChatRequest) -> Dict[str, Any]:
        session_id = req.session_id or str(uuid.uuid4())
        last_user_msg = ""
        for turn in req.history:
            if turn.role == "user":
                last_user_msg = turn.content
        if not last_user_msg:
            return {"session_id": session_id, "reply": "Hi — what brings you to CreatorBoostAI?",
                    "actions": [{"type": "show_quick_replies", "chips": HOMEPAGE_QUICK_REPLIES}]}

        role = _classify_role(last_user_msg)
        model = _pick_model(last_user_msg, role)
        ctx = await build_context(db, user_email=req.user_email, session_id=session_id)

        system = _system_prompt(role, ctx)
        history_dicts = [{"role": t.role, "content": t.content} for t in req.history]

        # LLM call with hard timeout so the widget never hangs > 12s
        raw = ""
        try:
            raw = await asyncio.wait_for(
                _call_llm(model, system, history_dicts, session_id), timeout=12.0,
            )
        except asyncio.TimeoutError:
            raw = ""
            log.warning(f"avatar timeout · model={model} role={role}")
        except Exception as e:
            log.error(f"avatar LLM error: {e}")

        parsed = _parse_llm_json(raw)
        actions = _normalize_actions(parsed["actions"], last_user_msg)

        # Founder-escalation fallback
        if not parsed["reply"]:
            parsed["reply"] = ("Let me get the founder on this one — I want to make sure you "
                               "get the right answer.")
            actions = [{"type": "escalate_to_founder", "reason": "no_llm_response"}]

        # Persist a turn record so we can audit
        try:
            await db.avatar_sessions.update_one(
                {"session_id": session_id},
                {
                    "$setOnInsert": {
                        "session_id": session_id,
                        "user_email": req.user_email,
                        "surface": req.surface,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    },
                    "$push": {
                        "turns": {
                            "at": datetime.now(timezone.utc).isoformat(),
                            "user": last_user_msg[:2000],
                            "assistant": parsed["reply"][:2000],
                            "role": role, "model": model,
                            "actions": actions,
                        }
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                },
                upsert=True,
            )
        except Exception as e:
            log.error(f"avatar_sessions log failed: {e}")

        return {
            "session_id": session_id,
            "reply": parsed["reply"],
            "actions": actions,
            "role": role,
            "model": model,
        }

    @router.post("/chat")
    async def chat(req: ChatRequest):
        return await _handle_chat(req)

    @router.post("/chat-stream")
    async def chat_stream(req: ChatRequest):
        """SSE stream: server still calls the LLM in one shot then chunks the
        reply text into word-level events so the UI can render character-by-
        character. This keeps the 'no delay feeling' UX without requiring full
        provider-streaming wiring (which Claude/Anthropic via emergent
        integrations doesn't expose cleanly today)."""
        async def gen() -> AsyncGenerator[bytes, None]:
            payload = await _handle_chat(req)
            words = (payload["reply"] or "").split(" ")
            yield f"event: meta\ndata: {json.dumps({'session_id': payload['session_id'], 'role': payload.get('role'), 'model': payload.get('model')})}\n\n".encode()
            buf = ""
            for i, w in enumerate(words):
                buf += (("" if i == 0 else " ") + w)
                yield f"event: token\ndata: {json.dumps({'t': buf})}\n\n".encode()
                await asyncio.sleep(0.022)  # human-typing cadence
            yield f"event: actions\ndata: {json.dumps({'actions': payload['actions']})}\n\n".encode()
            yield b"event: done\ndata: {}\n\n"
        return StreamingResponse(gen(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache",
                                          "X-Accel-Buffering": "no",
                                          "Connection": "keep-alive"})

    @router.post("/quick-context")
    async def quick_context(req: QuickContextRequest):
        session_id = req.session_id or str(uuid.uuid4())
        ctx = await build_context(db, user_email=req.user_email, session_id=session_id)
        return {
            "session_id": session_id,
            "context": ctx,
            "quick_replies": HOMEPAGE_QUICK_REPLIES,
        }

    @router.post("/escalate")
    async def escalate(req: EscalateRequest):
        now_s = datetime.now(timezone.utc).isoformat()
        # Iter 53 · auto-enrich from session context (latest user message,
        # demo viewed, classified sector, recent CB context).
        sector_guess: Optional[str] = None
        demo_viewed: Optional[str] = None
        last_user_msg: Optional[str] = req.last_message
        try:
            session_doc = await db.avatar_sessions.find_one(
                {"session_id": req.session_id}, {"_id": 0, "turns": 1, "surface": 1},
            )
            turns = (session_doc or {}).get("turns") or []
            # Newest user message wins
            for t in reversed(turns):
                if (t.get("user") or "").strip() and not last_user_msg:
                    last_user_msg = t["user"]
                # Pick up the most recent route_to_demo action emitted
                for a in (t.get("actions") or []):
                    if a.get("type") == "route_to_demo" and not demo_viewed:
                        demo_viewed = a.get("demo")
                        break
            # Sector guess: read from contact.industry || classify last_user_msg
            sector_guess = (req.contact or {}).get("industry") or demo_viewed
            if not sector_guess and last_user_msg:
                m = _DEMO_REGEX.search(last_user_msg)
                if m:
                    sector_guess = m.group(1).lower().replace("-", "_").replace(" ", "_")
        except Exception as _e:
            log.error(f"escalate enrichment failed: {_e}")

        rec = {
            "id": str(uuid.uuid4()),
            "session_id": req.session_id,
            "user_email": req.user_email,
            "reason": (req.reason or "")[:500],
            "last_message": (last_user_msg or "")[:2000],
            "contact": req.contact or {},
            "name": (req.contact or {}).get("name"),
            "email": (req.contact or {}).get("email") or req.user_email,
            "company": (req.contact or {}).get("company"),
            "sector": sector_guess,
            "demo_viewed": demo_viewed,
            "surface": (session_doc or {}).get("surface") if 'session_doc' in dir() else "homepage",
            "status": "open",
            "status_history": [
                {"status": "open", "at": now_s, "by": "avatar"}
            ],
            "notes": [],
            "created_at": now_s,
            "updated_at": now_s,
        }
        await db.avatar_escalations.insert_one(rec)
        # Notify founder (best-effort)
        try:
            if send_founder_notification:
                await send_founder_notification(
                    subject=f"[Avatar Escalation] {(req.reason or '')[:80]}",
                    body_html=(
                        f"<p>The CB avatar escalated a conversation.</p>"
                        f"<p><b>Reason:</b> {req.reason}</p>"
                        f"<p><b>User:</b> {req.user_email or rec.get('email') or 'anonymous'}</p>"
                        f"<p><b>Company:</b> {rec.get('company') or '—'}</p>"
                        f"<p><b>Sector / demo:</b> {rec.get('sector') or rec.get('demo_viewed') or '—'}</p>"
                        f"<p><b>Last message:</b> {rec.get('last_message') or '—'}</p>"
                        f"<p><b>Session:</b> {req.session_id}</p>"
                    ),
                )
        except Exception as e:
            log.error(f"founder notify failed: {e}")
        return {"ok": True, "escalation_id": rec["id"]}

    # ──────────────── ITER 53 · ESCALATION TRIAGE (founder-only) ────────────────

    class _AdminAuth(BaseModel):
        email: str
        token: str

    async def _admin_auth(payload: Dict[str, Any]):
        if not require_founder:
            return {"email": payload.get("email")}
        try:
            shim = _AdminAuth(email=payload.get("email") or "", token=payload.get("token") or "")
        except Exception:
            raise HTTPException(401, "email + token required")
        return await require_founder(shim)

    @router.post("/escalations/list")
    async def escalations_list(payload: Dict[str, Any]):
        """Founder-gated. Returns the escalation triage list with optional filter.

        Body: { email, token, status?: 'open'|'contacted'|'won'|'lost'|'all'|'closed', limit?: 200 }
        """
        await _admin_auth(payload)
        status = (payload.get("status") or "open").strip().lower()
        limit = max(1, min(int(payload.get("limit") or 200), 500))
        q: Dict[str, Any] = {}
        if status == "open":
            q["status"] = {"$in": ["open", "contacted"]}
        elif status == "closed":
            q["status"] = {"$in": ["won", "lost"]}
        elif status in ("contacted", "won", "lost"):
            q["status"] = status
        # status == "all" → no filter
        cursor = db.avatar_escalations.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
        rows = await cursor.to_list(limit)
        # Counts by bucket for the filter pills
        counts: Dict[str, int] = {}
        for s in ("open", "contacted", "won", "lost"):
            counts[s] = await db.avatar_escalations.count_documents({"status": s})
        counts["all"] = sum(counts.values())
        counts["pipeline_open"] = counts["open"] + counts["contacted"]
        return {"ok": True, "escalations": rows, "counts": counts}

    @router.post("/escalations/detail")
    async def escalations_detail(payload: Dict[str, Any]):
        """Founder-gated. Returns a single escalation + the full session transcript."""
        await _admin_auth(payload)
        escalation_id = (payload.get("escalation_id") or "").strip()
        if not escalation_id:
            raise HTTPException(400, "escalation_id required")
        rec = await db.avatar_escalations.find_one({"id": escalation_id}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "Escalation not found")
        transcript: List[Dict[str, Any]] = []
        if rec.get("session_id"):
            sess = await db.avatar_sessions.find_one(
                {"session_id": rec["session_id"]},
                {"_id": 0, "turns": 1, "user_email": 1, "surface": 1, "created_at": 1},
            )
            if sess and sess.get("turns"):
                transcript = sess["turns"]
        return {"ok": True, "escalation": rec, "transcript": transcript}

    @router.post("/escalations/update")
    async def escalations_update(payload: Dict[str, Any]):
        """Founder-gated. Move status: open → contacted → won/lost."""
        user = await _admin_auth(payload)
        escalation_id = (payload.get("escalation_id") or "").strip()
        new_status = (payload.get("status") or "").strip().lower()
        note = (payload.get("note") or "").strip() or None
        if new_status not in ("open", "contacted", "won", "lost"):
            raise HTTPException(400, "status must be one of: open · contacted · won · lost")
        if not escalation_id:
            raise HTTPException(400, "escalation_id required")
        existing = await db.avatar_escalations.find_one({"id": escalation_id}, {"_id": 0})
        if not existing:
            raise HTTPException(404, "Escalation not found")
        now_s = datetime.now(timezone.utc).isoformat()
        history_entry = {"status": new_status, "at": now_s, "by": user.get("email")}
        push_ops: Dict[str, Any] = {"status_history": history_entry}
        if note:
            push_ops["notes"] = {"text": note, "at": now_s, "by": user.get("email")}
        await db.avatar_escalations.update_one(
            {"id": escalation_id},
            {
                "$set": {"status": new_status, "updated_at": now_s,
                         **({"closed_at": now_s} if new_status in ("won", "lost") else {})},
                "$push": push_ops,
            },
        )
        updated = await db.avatar_escalations.find_one({"id": escalation_id}, {"_id": 0})
        return {"ok": True, "escalation": updated}

    @router.post("/escalations/note")
    async def escalations_note(payload: Dict[str, Any]):
        """Founder-gated. Append a free-form note (no status change)."""
        user = await _admin_auth(payload)
        escalation_id = (payload.get("escalation_id") or "").strip()
        note = (payload.get("note") or "").strip()
        if not (escalation_id and note):
            raise HTTPException(400, "escalation_id + note required")
        now_s = datetime.now(timezone.utc).isoformat()
        await db.avatar_escalations.update_one(
            {"id": escalation_id},
            {
                "$push": {"notes": {"text": note, "at": now_s, "by": user.get("email")}},
                "$set": {"updated_at": now_s},
            },
        )
        return {"ok": True}

    return router


__all__ = ["make_avatar_router", "HOMEPAGE_QUICK_REPLIES"]
