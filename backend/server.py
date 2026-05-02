from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, Request
from fastapi.responses import Response, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import csv
import io
import secrets
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'bodyiq-admin-2026')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '').strip()
FOUNDER_KEY = os.environ.get('FOUNDER_KEY', '').strip()

# ---------- Stripe ----------
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

# ---------- Email ----------
from email_service import (
    send_lead_welcome, send_contact_ack, send_training_confirmation,
    send_forensic_confirmation, send_demo_share, send_welcome_with_access,
    send_founder_notification, send_with_result, send_demo_share_with_result,
    SENDER_EMAIL as EMAIL_SENDER, SENDER_NAME as EMAIL_SENDER_NAME,
    REPLY_TO_EMAIL as EMAIL_REPLY_TO, FROM_HEADER as EMAIL_FROM_HEADER,
)

# ---------- TTS ----------
from tts_service import generate_or_cache as tts_generate, ALLOWED_VOICES, DEFAULT_VOICE

# ---------- Lighting Upgrade Engine ----------
from lighting_engine import make_router as make_lighting_router

# ---------- Ops Center (Founder / Executive / Employee CRM) ----------
from ops_center import make_router as make_ops_router

# ---------- LLM ----------
from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
import json as _json
import re as _re

app = FastAPI(title="BodyIQ-AI API")
api_router = APIRouter(prefix="/api")

ADMIN_TOKENS: Dict[str, datetime] = {}

# ---------- Product catalog (SERVER-SIDE ONLY) ----------
PRODUCTS: Dict[str, Dict[str, Any]] = {
    "foundations": {
        "name": "Signal Foundations",
        "amount": 400.00,
        "currency": "usd",
        "type": "training",
        "description": "2-hour live signal recognition training",
    },
    "applied": {
        "name": "Applied Signals",
        "amount": 1500.00,
        "currency": "usd",
        "type": "training",
        "description": "2-3 hour advanced applied signals training",
    },
    "strategy": {
        "name": "Strategy Program",
        "amount": 7000.00,
        "currency": "usd",
        "type": "training",
        "description": "Strategy-tier signal program — direct enrollment",
    },
    "full_training": {
        "name": "Full Training Program",
        "amount": 27000.00,
        "currency": "usd",
        "type": "training",
        "description": "Complete signal mastery training program — direct enrollment",
    },
    "forensic_library": {
        "name": "Forensic Visual Library",
        "amount": 59.00,
        "currency": "usd",
        "type": "library",
        "description": "Forensic Visual Library — lifetime access",
    },
    # Signal Intelligence Packs — BodyIQ-AI Vol. 1: Closing Intelligence.
    # 15–25 labeled signal video clips with structured definitions, decision
    # moments, execution actions, and "What You Missed" insight breakdowns.
    "signal_pack_standard": {
        "name": "Signal Pack Vol. 1 — Standard",
        "amount": 299.00,
        "currency": "usd",
        "type": "signal_pack",
        "description": "Signal Pack Vol. 1: Closing Intelligence — Standard Access",
    },
    "signal_pack_pro": {
        "name": "Signal Pack Vol. 1 — Professional",
        "amount": 499.00,
        "currency": "usd",
        "type": "signal_pack",
        "description": "Signal Pack Vol. 1: Closing Intelligence — Professional Access",
    },
    "signal_pack_enterprise": {
        "name": "Signal Pack Vol. 1 — Enterprise License",
        "amount": 1500.00,
        "currency": "usd",
        "type": "signal_pack",
        "description": "Signal Pack Vol. 1: Closing Intelligence — Enterprise License",
    },
}

# CreatorBoostAI subscription plans (Stripe Checkout in NATIVE subscription mode).
# Each plan maps to a Stripe Price ID (created in the Stripe Dashboard with
# `recurring` config — monthly or yearly). When the wrapper passes
# `stripe_price_id` whose Price has `recurring`, Stripe Checkout opens in
# subscription mode and bills the customer on the Price's interval forever.
# NOTE: $7K and $27K programs are intentionally NOT here — they require an
# application + booking call and are closed manually via Stripe invoice or Zelle.
SUBSCRIPTIONS: Dict[str, Dict[str, Any]] = {
    # ----- Canonical multi-industry plans (Iter 28 — public-facing) -----
    "starter_monthly": {
        "name": "CreatorBoostAI Starter", "tier": "starter", "interval": "month",
        "amount": 297.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_STARTER_MONTHLY",
    },
    "starter_annual": {
        "name": "CreatorBoostAI Starter", "tier": "starter", "interval": "year",
        "amount": 2970.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_STARTER_ANNUAL",
    },
    "team_monthly": {
        "name": "CreatorBoostAI Team", "tier": "team", "interval": "month",
        "amount": 997.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_TEAM_MONTHLY",
    },
    "team_annual": {
        "name": "CreatorBoostAI Team", "tier": "team", "interval": "year",
        "amount": 9970.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_TEAM_ANNUAL",
    },
    "growth_monthly": {
        "name": "CreatorBoostAI Growth", "tier": "growth", "interval": "month",
        "amount": 1997.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_GROWTH_MONTHLY",
    },
    "growth_annual": {
        "name": "CreatorBoostAI Growth", "tier": "growth", "interval": "year",
        "amount": 19970.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_GROWTH_ANNUAL",
    },
    # ----- Legacy plans (kept active so existing webhook flows keep working) -----
    "cb_starter_monthly": {
        "name": "CreatorBoostAI Starter (legacy)", "tier": "starter_legacy", "interval": "month",
        "amount": 97.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_STARTER_MONTHLY",
    },
    "cb_starter_annual":  {
        "name": "CreatorBoostAI Starter (legacy)", "tier": "starter_legacy", "interval": "year",
        "amount": 970.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_STARTER_ANNUAL",
    },
    "cb_growth_monthly":  {
        "name": "CreatorBoostAI Growth (legacy)",  "tier": "growth_legacy",  "interval": "month",
        "amount": 297.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_GROWTH_MONTHLY",
    },
    "cb_growth_annual":   {
        "name": "CreatorBoostAI Growth (legacy)",  "tier": "growth_legacy",  "interval": "year",
        "amount": 2970.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_GROWTH_ANNUAL",
    },
    "cb_pro_monthly":     {
        "name": "CreatorBoostAI Pro (legacy)",     "tier": "pro_legacy",     "interval": "month",
        "amount": 997.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_PRO_MONTHLY",
    },
    "cb_pro_annual":      {
        "name": "CreatorBoostAI Pro (legacy)",     "tier": "pro_legacy",     "interval": "year",
        "amount": 9970.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_PRO_ANNUAL",
    },
    # Enterprise tier: NO checkout — routes to /contact
}

# High-ticket programs that REQUIRE application + booking call before any payment.
# These never expose direct checkout. Manual close via Stripe invoice or Zelle.
HIGH_TICKET_PROGRAMS: Dict[str, Dict[str, Any]] = {
    "accelerator_7k": {
        "name": "Signal Accelerator",
        "amount": 7000.00,
        "currency": "usd",
        "description": "Intensive 1:1 signal training program — application + call required.",
    },
    "mastery_27k": {
        "name": "Signal Mastery",
        "amount": 27000.00,
        "currency": "usd",
        "description": "Elite mastery program — application + call required.",
    },
}


# ---------- Models ----------
class LeadCreate(BaseModel):
    email: EmailStr
    source: str
    name: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    source: str
    name: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdminLogin(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    token: str


class CheckoutSessionCreate(BaseModel):
    product_key: str
    origin_url: str
    email: Optional[EmailStr] = None
    # --- Demo-to-Revenue attribution (all optional; populated by frontend from
    # localStorage.demo_origin set when the viewer pressed Start on a demo).
    source_demo: Optional[str] = None
    source_industry: Optional[str] = None
    lead_id: Optional[str] = None
    company: Optional[str] = None


class SubscriptionCheckoutCreate(BaseModel):
    plan_key: str
    origin_url: str
    email: Optional[EmailStr] = None
    source_demo: Optional[str] = None
    source_industry: Optional[str] = None
    lead_id: Optional[str] = None
    company: Optional[str] = None


class HighTicketApplication(BaseModel):
    program_key: str
    name: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    revenue_range: Optional[str] = None
    team_size: Optional[str] = None
    current_systems: Optional[str] = None
    biggest_challenge: str


class CheckoutSessionOut(BaseModel):
    url: str
    session_id: str


class CheckoutStatusOut(BaseModel):
    session_id: str
    status: str
    payment_status: str
    amount_total: int
    currency: str
    product_key: Optional[str] = None
    product_name: Optional[str] = None
    email: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = DEFAULT_VOICE
    model: Optional[str] = "tts-1"


class LeadAnalyzeRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)


class LeadAnalyzeResponse(BaseModel):
    lead_type: str
    intent_score: int
    urgency: int
    key_signals: List[str]
    recommended_action: str
    personalized_message: str


# ---------- Auth dependency ----------
def verify_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1]
    if token not in ADMIN_TOKENS:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token


# ---------- Lead routes ----------
VALID_SOURCES = {"demo", "demo_training", "training", "contact", "newsletter", "forensic_library", "home", "audit_request", "report_request", "jury_request"}


@api_router.get("/")
async def root():
    return {"service": "BodyIQ-AI", "status": "online"}


# =============================================================================
# Domain warmup — proves the verified Resend domain is live the moment the
# RESEND_API_KEY is injected, without waiting for a real user to trigger OTP.
#
# - Fires once per backend boot (per-key fingerprint, throttled to 24h)
# - Sends a single email to the verified mailbox itself
# - Records {ok, message_id, error, timestamp, key_prefix, from, to, trigger}
#   into the `system_health` collection — permanent audit trail
# - Exposed as GET (last 10 records) + POST (force a fresh send)
# =============================================================================

WARMUP_RECIPIENT = EMAIL_SENDER


def _warmup_html(key_prefix: str, trigger: str) -> str:
    when = datetime.now(timezone.utc).isoformat()
    return f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0F172A;color:#F8FAFC;border-radius:12px;">
      <p style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#22D3EE;margin:0 0 12px;">CreatorBoostAI · System Health</p>
      <h2 style="font-size:22px;margin:0 0 12px;color:#F8FAFC;">Domain warmup</h2>
      <p style="font-size:14px;line-height:1.6;color:#CBD5E1;margin:0 0 20px;">
        This is an automated send confirming that the verified Resend domain
        <strong>bodyiq-ai.com</strong> is live and routing through the
        <strong>CreatorBoostAI &lt;{WARMUP_RECIPIENT}&gt;</strong> sender identity.
      </p>
      <table style="width:100%;font-size:12px;color:#94A3B8;border-collapse:collapse;">
        <tr><td style="padding:6px 0;">Trigger</td><td style="padding:6px 0;color:#F8FAFC;">{trigger}</td></tr>
        <tr><td style="padding:6px 0;">Timestamp (UTC)</td><td style="padding:6px 0;color:#F8FAFC;">{when}</td></tr>
        <tr><td style="padding:6px 0;">Key fingerprint</td><td style="padding:6px 0;color:#F8FAFC;font-family:ui-monospace,Menlo,monospace;">{key_prefix}</td></tr>
      </table>
      <p style="font-size:11px;color:#64748B;margin:24px 0 0;">If you didn't expect this email, your RESEND_API_KEY may have been rotated or the backend was redeployed.</p>
    </div>
    """


async def _run_warmup(trigger: str = "startup", force: bool = False) -> Dict[str, Any]:
    """Send a single warmup email to the verified mailbox and persist the
    result. Throttles to 1 send per 24h per key fingerprint unless `force`."""
    raw = os.environ.get("RESEND_API_KEY", "").strip()
    if not raw:
        return {"skipped": True, "reason": "RESEND_API_KEY not present in env"}
    key_prefix = raw[:8]

    if not force:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        existing = await db.system_health.find_one(
            {"kind": "warmup", "key_prefix": key_prefix, "timestamp": {"$gte": cutoff}},
            {"_id": 0},
        )
        if existing:
            return {"skipped": True, "reason": "warmup already recorded in last 24h",
                    "last_record": existing}

    # Sender identity is hard-coded in email_service — re-export here for the
    # audit-log record (so the `from` field in the warmup row reflects what
    # was actually sent, not what env vars happened to say).
    from_header = EMAIL_FROM_HEADER

    result = await send_with_result(
        to=WARMUP_RECIPIENT,
        subject=f"[CreatorBoostAI] Domain warmup · {trigger}",
        html=_warmup_html(key_prefix, trigger),
    )
    record = {
        "id": str(uuid.uuid4()),
        "kind": "warmup",
        "trigger": trigger,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "key_prefix": key_prefix,
        "from": from_header,
        "to": WARMUP_RECIPIENT,
        "ok": bool(result.get("ok")),
        "message_id": result.get("id"),
        "error": result.get("error"),
        "error_kind": result.get("error_kind"),
        "status_code": result.get("status_code"),
    }
    await db.system_health.insert_one(dict(record))
    logger_msg = ("OK" if record["ok"] else f"FAIL ({record['error_kind']})")
    logging.getLogger(__name__).warning(
        f"[WARMUP {logger_msg}] trigger={trigger} key_prefix={key_prefix} "
        f"message_id={record['message_id']} error={record['error']!r}"
    )
    return {"skipped": False, "record": record}


@api_router.get("/health/email")
async def health_email():
    """Public diagnostic — does the deployed backend currently see the Resend key?
    Returns ONLY non-sensitive metadata (key length + first 4 chars). Safe to expose
    on prod because nothing returned would let an attacker reconstruct the key.

    Run from any terminal:
      curl https://YOUR-DEPLOYED-URL/api/health/email
    """
    raw = os.environ.get("RESEND_API_KEY", "")
    stripped = raw.strip()
    env_sender = os.environ.get("SENDER_EMAIL", "").strip()
    env_reply = os.environ.get("REPLY_TO_EMAIL", "").strip()
    env_name = os.environ.get("SENDER_NAME", "").strip()
    env_override_active = bool(env_sender) and env_sender.lower() != EMAIL_SENDER.lower()
    return {
        "configured": bool(stripped),
        "key_present_in_env": "RESEND_API_KEY" in os.environ,
        "key_length": len(stripped),
        "key_prefix": (stripped[:4] + "...") if stripped else None,
        "key_has_leading_whitespace": raw != raw.lstrip(),
        "key_has_trailing_whitespace": raw != raw.rstrip(),
        "sender_email": EMAIL_SENDER,
        "sender_name": EMAIL_SENDER_NAME,
        "reply_to_email": EMAIL_REPLY_TO,
        "effective_from": EMAIL_FROM_HEADER,
        "sender_is_hardcoded": True,
        "env_sender_email": env_sender or None,
        "env_sender_name": env_name or None,
        "env_reply_to_email": env_reply or None,
        "env_override_ignored": env_override_active,
        "env_override_warning": (
            f"Deployment env SENDER_EMAIL={env_sender!r} is being IGNORED. "
            f"Application has hard-coded {EMAIL_SENDER!r}. Remove SENDER_EMAIL "
            f"from your deployment platform's env-var dashboard to silence."
        ) if env_override_active else None,
        "expected_var_name": "RESEND_API_KEY",
    }


@api_router.get("/health/email/warmup")
async def health_email_warmup_audit():
    """Returns the last 10 warmup records — permanent audit trail proving the
    verified Resend domain has been live."""
    cursor = db.system_health.find({"kind": "warmup"}, {"_id": 0}) \
        .sort("timestamp", -1).limit(10)
    rows = await cursor.to_list(length=10)
    return {"count": len(rows), "records": rows}


@api_router.post("/health/email/warmup")
async def health_email_warmup_send():
    """Force a fresh warmup send (bypasses the 24h throttle). Useful after
    rotating the Resend key or redeploying."""
    return await _run_warmup(trigger="manual", force=True)


@api_router.post("/leads", response_model=Lead, status_code=201)
async def create_lead(payload: LeadCreate):
    if payload.source not in VALID_SOURCES:
        raise HTTPException(status_code=400, detail=f"Invalid source. Must be one of: {sorted(VALID_SOURCES)}")

    lead = Lead(**payload.model_dump())
    doc = lead.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.leads.insert_one(doc)

    # Fire welcome / ack email (best-effort)
    try:
        if payload.source == "contact":
            await send_contact_ack(payload.email, payload.name)
        else:
            # Skip synthetic reservation tracking rows
            if not payload.email.endswith("@reservation.example.com"):
                await send_lead_welcome(payload.email, payload.source)
    except Exception as e:
        logging.getLogger(__name__).warning(f"Lead email hook failed: {e}")

    # Founder notification — best-effort internal alert (always skipped for the
    # synthetic reservation rows used by demo tracking).
    try:
        founder_email = os.environ.get("FOUNDER_EMAIL", "").strip()
        if founder_email and not payload.email.endswith("@reservation.example.com"):
            name_line = f"<p><strong>Name:</strong> {payload.name or '—'}</p>" if payload.name else ""
            msg_line = f"<p><strong>Message:</strong> {payload.message}</p>" if payload.message else ""
            await send_founder_notification(
                to_email=founder_email,
                subject=f"🧲 New lead · {payload.source}",
                body_html=(
                    f"<p>A new lead was captured on the platform.</p>"
                    f"<p><strong>Email:</strong> {payload.email}</p>"
                    f"<p><strong>Source:</strong> {payload.source}</p>"
                    f"{name_line}{msg_line}"
                    f"<p style='font-size:12px;color:#64748B;'>Logged at {doc['timestamp']}</p>"
                ),
            )
    except Exception as e:
        logging.getLogger(__name__).warning(f"Founder lead notification failed: {e}")

    return lead


# ---------- Admin routes ----------
@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLogin):
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    token = secrets.token_urlsafe(32)
    ADMIN_TOKENS[token] = datetime.now(timezone.utc)
    return AdminLoginResponse(token=token)


@api_router.post("/admin/logout")
async def admin_logout(_: str = Depends(verify_admin), authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        ADMIN_TOKENS.pop(token, None)
    return {"status": "ok"}


@api_router.get("/admin/leads", response_model=List[Lead])
async def list_leads(_: str = Depends(verify_admin)):
    docs = await db.leads.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5000)
    result = []
    for d in docs:
        if isinstance(d.get('timestamp'), str):
            d['timestamp'] = datetime.fromisoformat(d['timestamp'])
        result.append(Lead(**d))
    return result


@api_router.get("/admin/leads/stats")
async def leads_stats(_: str = Depends(verify_admin)):
    docs = await db.leads.find({}, {"_id": 0, "source": 1}).to_list(10000)
    total = len(docs)
    by_source: Dict[str, int] = {}
    for d in docs:
        s = d.get("source", "unknown")
        by_source[s] = by_source.get(s, 0) + 1
    return {"total": total, "by_source": by_source}


@api_router.get("/admin/leads/export.csv")
async def export_leads_csv(token: str = Query(...)):
    if token not in ADMIN_TOKENS:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    docs = await db.leads.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20000)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "email", "source", "name", "message", "timestamp"])
    for d in docs:
        writer.writerow([
            d.get("id", ""), d.get("email", ""), d.get("source", ""),
            d.get("name", "") or "", (d.get("message", "") or "").replace("\n", " "),
            d.get("timestamp", ""),
        ])
    csv_bytes = buffer.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="bodyiq-leads-{datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")}.csv"'},
    )


@api_router.get("/admin/transactions")
async def list_transactions(
    _: str = Depends(verify_admin),
    range: str = Query("all", regex="^(7d|30d|all)$"),
):
    """Admin · payment_transactions list, filtered by created_at window."""
    query: Dict[str, Any] = {}
    if range != "all":
        days = 7 if range == "7d" else 30
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query["created_at"] = {"$gte": cutoff}
    docs = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


# ---------- Picker analytics ----------
class PickerClick(BaseModel):
    vertical: str  # "realtor" | "insurance" | other
    referrer: Optional[str] = None


@api_router.post("/track/picker-click", status_code=204)
async def track_picker_click(payload: PickerClick, request: Request):
    vertical = (payload.vertical or "").strip().lower()
    if vertical not in {"realtor", "insurance", "mortgage", "healthcare", "advisor", "hospitality"}:
        # accept but bucket anything else under "other" — preserves analytics integrity
        vertical = "other"
    doc = {
        "id": str(uuid.uuid4()),
        "vertical": vertical,
        "referrer": (payload.referrer or "")[:200],
        "ip": (request.client.host if request.client else None),
        "ua": (request.headers.get("user-agent", "") or "")[:200],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.picker_clicks.insert_one(doc)
    return Response(status_code=204)


@api_router.get("/admin/picker-stats")
async def picker_stats(_: str = Depends(verify_admin)):
    docs = await db.picker_clicks.find({}, {"_id": 0}).to_list(50000)
    now = datetime.now(timezone.utc)
    last_24 = (now - timedelta(hours=24)).isoformat()
    last_7d = (now - timedelta(days=7)).isoformat()
    by_vertical: Dict[str, int] = {}
    last24_total = 0
    last7d_total = 0
    for d in docs:
        v = d.get("vertical", "other")
        by_vertical[v] = by_vertical.get(v, 0) + 1
        ts = d.get("timestamp", "")
        if ts >= last_24:
            last24_total += 1
        if ts >= last_7d:
            last7d_total += 1
    return {
        "total": len(docs),
        "by_vertical": by_vertical,
        "last_24h": last24_total,
        "last_7d": last7d_total,
    }


# ---------- Products (public) ----------
@api_router.get("/products")
async def list_products():
    return {
        k: {"name": v["name"], "amount": v["amount"], "currency": v["currency"], "type": v["type"], "description": v["description"]}
        for k, v in PRODUCTS.items()
    }


@api_router.get("/subscriptions")
async def list_subscriptions():
    return {
        k: {"name": v["name"], "tier": v["tier"], "interval": v["interval"], "amount": v["amount"], "currency": v["currency"]}
        for k, v in SUBSCRIPTIONS.items()
    }


@api_router.get("/programs/high-ticket")
async def list_high_ticket():
    """High-ticket programs: NO checkout exposed. Application + booking call required."""
    return {
        k: {"name": v["name"], "amount": v["amount"], "currency": v["currency"], "description": v["description"], "requires_application": True}
        for k, v in HIGH_TICKET_PROGRAMS.items()
    }


# ---------- High-ticket application flow ----------
BOOKING_URL = os.environ.get("BOOKING_URL", "https://calendly.com/creatorboostai/strategy-call")


@api_router.post("/applications", status_code=201)
async def submit_application(payload: HighTicketApplication, request: Request):
    if payload.program_key not in HIGH_TICKET_PROGRAMS:
        raise HTTPException(status_code=400, detail="Invalid program. High-ticket only.")
    program = HIGH_TICKET_PROGRAMS[payload.program_key]
    doc = {
        "id": str(uuid.uuid4()),
        "program_key": payload.program_key,
        "program_name": program["name"],
        "program_amount": program["amount"],
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "company": payload.company,
        "revenue_range": payload.revenue_range,
        "team_size": payload.team_size,
        "current_systems": payload.current_systems,
        "biggest_challenge": payload.biggest_challenge,
        "status": "submitted",  # submitted -> reviewed -> call_booked -> closed_won/closed_lost
        "ip": request.client.host if request.client else None,
        "ua": (request.headers.get("user-agent", "") or "")[:200],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.applications.insert_one(doc)
    # Also save as a lead so it appears in the unified leads view, with
    # source tag indicating which high-ticket program they applied for.
    lead_doc = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "name": payload.name,
        "source": f"application_{payload.program_key}",
        "message": payload.biggest_challenge,
        "metadata": {
            "program_amount": program["amount"],
            "company": payload.company,
            "revenue_range": payload.revenue_range,
            "phone": payload.phone,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.leads.insert_one(lead_doc)
    return {"booking_url": BOOKING_URL, "application_id": doc["id"]}


@api_router.get("/admin/applications")
async def list_applications(_: str = Depends(verify_admin)):
    docs = await db.applications.find({}, {"_id": 0}).sort("timestamp", -1).to_list(2000)
    return docs


# ---------- Stripe Checkout ----------
def _stripe_client(http_request: Request) -> StripeCheckout:
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments not configured (missing STRIPE_API_KEY)")
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


async def _trigger_post_purchase_email(txn: Dict[str, Any]) -> None:
    """Idempotent: sends email once per session when payment_status == 'paid'."""
    if txn.get("email_sent"):
        return
    email = txn.get("email")
    product_key = txn.get("product_key")
    if not email or not product_key:
        return
    # Subscriptions take a different path
    if txn.get("subscription") or product_key in SUBSCRIPTIONS:
        plan = SUBSCRIPTIONS.get(product_key, {"name": product_key})
        try:
            await send_training_confirmation(email, plan.get("name", "CreatorBoostAI"))
            await db.payment_transactions.update_one(
                {"session_id": txn["session_id"]},
                {"$set": {"email_sent": True, "email_sent_at": datetime.now(timezone.utc).isoformat()}},
            )
        except Exception as e:
            logging.getLogger(__name__).error(f"Post-subscription email failed: {e}")
        return
    product = PRODUCTS.get(product_key)
    if not product:
        return
    try:
        if product_key == "forensic_library":
            await send_forensic_confirmation(email)
        else:
            await send_training_confirmation(email, product["name"])
        await db.payment_transactions.update_one(
            {"session_id": txn["session_id"]},
            {"$set": {"email_sent": True, "email_sent_at": datetime.now(timezone.utc).isoformat()}},
        )
    except Exception as e:
        logging.getLogger(__name__).error(f"Post-purchase email failed: {e}")


# ---------- Post-payment access grant: auto-create user account ----------
def _magic_url(origin: str, email: str, token: str, redirect: Optional[str] = None) -> str:
    from urllib.parse import urlencode, quote_plus
    origin_clean = (origin or os.environ.get("SITE_URL") or "").rstrip("/")
    qs = {"email": email, "token": token}
    if redirect:
        qs["redirect"] = redirect
    return f"{origin_clean}/portal/magic?{urlencode(qs, quote_via=quote_plus)}"


async def _grant_access_for_txn(txn: Dict[str, Any]) -> None:
    """Idempotently create / upgrade a user account so the buyer can log in to /portal.
    The account stores only what's needed: email, granted entitlements, and a portal-access
    token. No password is set here — the Resend confirmation email contains the magic link."""
    email = txn.get("email")
    product_key = txn.get("product_key")
    if not email or not product_key:
        return
    is_subscription = bool(txn.get("subscription") or product_key in SUBSCRIPTIONS)
    entitlement = {
        "product_key": product_key,
        "product_name": txn.get("product_name"),
        "kind": "subscription" if is_subscription else "one_time",
        "tier": txn.get("tier"),
        "interval": txn.get("interval"),
        "granted_at": datetime.now(timezone.utc).isoformat(),
        "session_id": txn.get("session_id"),
        "status": "active",
    }
    origin = (txn.get("origin_url") or os.environ.get("SITE_URL") or "").rstrip("/")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        # Avoid duplicate entitlement for same session
        existing_entitlements = existing.get("entitlements", [])
        if any(e.get("session_id") == txn.get("session_id") for e in existing_entitlements):
            return
        existing_entitlements.append(entitlement)
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "entitlements": existing_entitlements,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        # Also send a welcome-with-access email for the *new* entitlement so existing
        # customers who return to buy additional products still get a magic link.
        try:
            portal_token = existing.get("portal_token")
            if portal_token:
                await send_welcome_with_access(
                    email=email,
                    product_name=txn.get("product_name") or product_key,
                    kind=entitlement["kind"],
                    portal_magic_url=_magic_url(origin, email, portal_token),
                    portal_token=portal_token,
                )
        except Exception as e:
            logging.getLogger(__name__).error(f"Welcome-with-access email (existing user) failed: {e}")
        return

    # New user — create with a portal access token
    portal_token = secrets.token_urlsafe(32)
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "portal_token": portal_token,
        "entitlements": [entitlement],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    # Send welcome-with-access email (best-effort; never raise)
    try:
        await send_welcome_with_access(
            email=email,
            product_name=txn.get("product_name") or product_key,
            kind=entitlement["kind"],
            portal_magic_url=_magic_url(origin, email, portal_token),
            portal_token=portal_token,
        )
    except Exception as e:
        logging.getLogger(__name__).error(f"Welcome-with-access email (new user) failed: {e}")


class PortalLoginRequest(BaseModel):
    email: EmailStr
    token: str


@api_router.post("/portal/login")
async def portal_login(payload: PortalLoginRequest):
    user = await db.users.find_one({"email": payload.email, "portal_token": payload.token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or access token")
    # Attach live subscription rows so the portal UI can display billing state.
    subs = await db.subscriptions.find({"email": payload.email}, {"_id": 0}).to_list(50)
    return {
        "email": user["email"],
        "entitlements": user.get("entitlements", []),
        "subscriptions": subs,
    }


# ---------- Magic-link recovery (resend portal access email) ----------
# Simple in-memory rate limit so a bad actor can't flood a real inbox.
# Maps email (lowercased) → last-send timestamp. Resets every 60s per email.
_MAGIC_LINK_RATE_LIMIT: Dict[str, datetime] = {}
_MAGIC_LINK_COOLDOWN = timedelta(seconds=60)


class ResendMagicLinkRequest(BaseModel):
    email: EmailStr
    origin_url: Optional[str] = None


@api_router.post("/portal/resend-magic-link")
async def portal_resend_magic_link(payload: ResendMagicLinkRequest, http_request: Request):
    """Re-sends the portal welcome-with-access email to a buyer who lost their
    original email. Always returns 200 with a generic message to prevent email
    enumeration. Rate-limited to one send per email per 60s.

    Security notes:
    - We never disclose whether the email exists (returns the same response
      either way).
    - We do NOT rotate the portal_token on resend — existing bookmarks / open
      sessions keep working. (If a user suspects their token is compromised,
      they should contact support to force a rotation.)
    """
    email = payload.email.lower().strip()
    now = datetime.now(timezone.utc)
    last = _MAGIC_LINK_RATE_LIMIT.get(email)
    if last and (now - last) < _MAGIC_LINK_COOLDOWN:
        # Still return a 200 with the same generic message to avoid leaking
        # account existence through timing / status code differences.
        return {
            "ok": True,
            "message": "If that email has an account with us, a fresh access link is on the way.",
        }
    _MAGIC_LINK_RATE_LIMIT[email] = now

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user and user.get("portal_token"):
        origin = (payload.origin_url or os.environ.get("SITE_URL") or str(http_request.base_url)).rstrip("/")
        # Use the most recent entitlement as the email context (falls back to generic).
        entitlements = user.get("entitlements") or []
        latest = entitlements[-1] if entitlements else {}
        product_name = latest.get("product_name") or "your CreatorBoostAI account"
        kind = latest.get("kind") or "one_time"
        try:
            await send_welcome_with_access(
                email=user["email"],
                product_name=product_name,
                kind=kind,
                portal_magic_url=_magic_url(origin, user["email"], user["portal_token"]),
                portal_token=user["portal_token"],
            )
        except Exception as e:
            logging.getLogger(__name__).error(f"Magic-link resend failed: {e}")
    return {
        "ok": True,
        "message": "If that email has an account with us, a fresh access link is on the way.",
    }


# ---------- Stripe Customer Portal (self-serve subscription management) ----------
class BillingPortalRequest(BaseModel):
    email: EmailStr
    token: str
    return_url: Optional[str] = None


@api_router.post("/portal/billing-session")
async def portal_billing_session(payload: BillingPortalRequest, http_request: Request):
    """Generates a one-time Stripe Customer Portal URL so authenticated portal
    users can manage their subscription (update card, cancel, switch plan).

    Auth: the user must present their email + portal_token. We then look up the
    Stripe customer_id we cached during checkout and ask Stripe to mint a
    short-lived session URL.

    Note: requires `stripe_customer_id` to be present on a `subscriptions` row
    for this user. That field is populated when the customer.subscription.created
    webhook fires after live checkout. Until live keys + webhook land, this
    returns 503 with a clear message.
    """
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Billing portal unavailable (missing STRIPE_API_KEY)")

    user = await db.users.find_one(
        {"email": payload.email, "portal_token": payload.token}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or access token")

    sub = await db.subscriptions.find_one(
        {"email": payload.email, "stripe_customer_id": {"$exists": True, "$ne": None}},
        {"_id": 0},
    )
    if not sub or not sub.get("stripe_customer_id"):
        raise HTTPException(
            status_code=409,
            detail=(
                "No active Stripe subscription on file. The billing portal will "
                "activate as soon as your subscription is processed (you'll see "
                "a confirmation email)."
            ),
        )

    # Use the official Stripe SDK directly for billing_portal — the
    # emergentintegrations wrapper covers Checkout but not Customer Portal.
    import stripe as _stripe
    _stripe.api_key = STRIPE_API_KEY
    origin = (payload.return_url or os.environ.get("SITE_URL") or str(http_request.base_url)).rstrip("/")
    return_url = f"{origin}/portal"
    try:
        session = await asyncio.to_thread(
            _stripe.billing_portal.Session.create,
            customer=sub["stripe_customer_id"],
            return_url=return_url,
        )
    except Exception as e:
        logging.getLogger(__name__).error(f"Stripe billing portal failed: {e}")
        raise HTTPException(status_code=502, detail="Could not open billing portal")
    return {"url": session.url}


# ---------- Entitlement verification (Phase 4 access gating) ----------
class EntitlementCheckRequest(BaseModel):
    email: EmailStr
    token: str
    product_key: Optional[str] = None
    product_type: Optional[str] = None  # e.g. "signal_pack", "training", "library", "subscription"


def _entitlement_is_active(e: Dict[str, Any]) -> bool:
    """A one-time entitlement is always active. A subscription entitlement is
    considered active unless its status is explicitly set to an inactive value."""
    status = (e.get("status") or "active").lower()
    if e.get("kind") == "subscription":
        return status in {"active", "trialing"}
    return status != "revoked"


def _matches(entitlement: Dict[str, Any], *, product_key: Optional[str], product_type: Optional[str]) -> bool:
    if product_key and entitlement.get("product_key") == product_key:
        return True
    if product_type:
        ek = entitlement.get("product_key") or ""
        prod = PRODUCTS.get(ek) or {}
        if prod.get("type") == product_type:
            return True
        if product_type == "subscription" and entitlement.get("kind") == "subscription":
            return True
    return False


@api_router.post("/portal/entitlement-check")
async def portal_entitlement_check(payload: EntitlementCheckRequest):
    """Verifies the user's access to a given product_key or product_type.
    Returns {entitled: bool, entitlement: {...}|None, email}. Use this to gate
    downloads and in-app content on the client.
    """
    user = await db.users.find_one(
        {"email": payload.email, "portal_token": payload.token}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or access token")
    if not payload.product_key and not payload.product_type:
        raise HTTPException(status_code=400, detail="product_key or product_type required")
    for ent in user.get("entitlements", []):
        if _matches(ent, product_key=payload.product_key, product_type=payload.product_type) and _entitlement_is_active(ent):
            return {"entitled": True, "entitlement": ent, "email": user["email"]}
    return {"entitled": False, "entitlement": None, "email": user["email"]}


# ---------- Signal Pack download (entitlement-gated) ----------
# Static catalog of delivery URLs per tier. Currently points to a placeholder
# location; replace with signed S3 / GCS / CDN URLs once real content is uploaded.
SIGNAL_PACK_DELIVERY: Dict[str, Dict[str, str]] = {
    "signal_pack_standard": {
        "url": os.environ.get("SIGNAL_PACK_STANDARD_URL", ""),
        "label": "Signal Pack Vol. 1 · Standard (ZIP)",
    },
    "signal_pack_pro": {
        "url": os.environ.get("SIGNAL_PACK_PRO_URL", ""),
        "label": "Signal Pack Vol. 1 · Professional (ZIP)",
    },
    "signal_pack_enterprise": {
        "url": os.environ.get("SIGNAL_PACK_ENTERPRISE_URL", ""),
        "label": "Signal Pack Vol. 1 · Enterprise License (ZIP)",
    },
}


class SignalPackDownloadRequest(BaseModel):
    email: EmailStr
    token: str


@api_router.post("/portal/signal-pack-download")
async def portal_signal_pack_download(payload: SignalPackDownloadRequest):
    """Returns a gated download link for the best Signal Pack tier the user owns.
    Tier ordering: enterprise > pro > standard. Returns 402/403 if no entitlement.
    """
    user = await db.users.find_one(
        {"email": payload.email, "portal_token": payload.token}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or access token")
    tier_priority = ["signal_pack_enterprise", "signal_pack_pro", "signal_pack_standard"]
    owned = [e for e in user.get("entitlements", []) if _entitlement_is_active(e)]
    for tier in tier_priority:
        if any(e.get("product_key") == tier for e in owned):
            delivery = SIGNAL_PACK_DELIVERY.get(tier, {})
            product = PRODUCTS.get(tier, {})
            return {
                "entitled": True,
                "tier": tier,
                "label": delivery.get("label") or product.get("name"),
                "download_url": delivery.get("url") or None,
                "pending": not bool(delivery.get("url")),
                "note": (
                    "Your download is being prepared. You'll receive a direct link "
                    "by email within 24 hours."
                    if not delivery.get("url") else None
                ),
            }
    raise HTTPException(status_code=402, detail="No active Signal Pack entitlement on file")


# ---------- Demo share (Resend) ----------
class ShareDemoRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = Field(None, max_length=120)
    sender_name: Optional[str] = Field("A colleague", max_length=120)
    demo_type: str = Field(..., pattern=r"^(realtor|insurance|creator|noldus|enterprise|sita|supermarket)$")
    company: Optional[str] = Field(None, max_length=120)
    message: Optional[str] = Field(None, max_length=1000)
    origin_url: Optional[str] = None
    # "demo" → links to /demo/{realtor|insurance}; "preview" → links to /preview;
    # any other value (typically a full URL like window.location.href) is
    # accepted verbatim — used by the Noldus / Creator share modules.
    share_target: Optional[str] = Field("demo", max_length=500)


def _append_personalization(url: str, *, name: Optional[str], company: Optional[str], email: Optional[str]) -> str:
    """Append ?name=&company=&email= to a URL while preserving any existing query."""
    from urllib.parse import urlparse, urlencode, parse_qsl, urlunparse
    if not (name or company or email):
        return url
    parts = urlparse(url)
    q = dict(parse_qsl(parts.query, keep_blank_values=True))
    if name and "name" not in q:
        q["name"] = name
    if company and "company" not in q:
        q["company"] = company
    if email and "email" not in q:
        q["email"] = email
    return urlunparse(parts._replace(query=urlencode(q)))


@api_router.post("/share-demo", status_code=202)
async def share_demo(payload: ShareDemoRequest, http_request: Request):
    """Sends a personalized share email via Resend.

    `share_target="demo"` (default) → routes recipient to /demo/{realtor|insurance}.
    `share_target="preview"` → routes recipient to /preview (CB Command Center).

    Always logs to the `demo_shares` collection so we get a usage trail even
    when RESEND_API_KEY is empty (graceful degradation). Returns 202 with
    `{sent: bool, reason}` so the client can show success/error UI.
    """
    base = (payload.origin_url or os.environ.get("SITE_URL") or str(http_request.base_url)).rstrip("/")
    if payload.share_target == "preview":
        demo_url = f"{base}/preview"
    elif payload.share_target and payload.share_target.startswith(("http://", "https://")):
        # Caller passed a full URL (e.g. window.location.href from /demo/noldus)
        demo_url = payload.share_target
    else:
        demo_url = f"{base}/demo/{payload.demo_type}"

    # Personalize the demo URL with recipient name/company so the demo greets
    # them directly when they click through.
    demo_url = _append_personalization(
        demo_url,
        name=(payload.recipient_name.strip() if payload.recipient_name else None),
        company=(payload.company.strip() if payload.company else None),
        email=payload.recipient_email,
    )

    sender_name_clean = (payload.sender_name or "A colleague").strip() or "A colleague"

    share_id = str(uuid.uuid4())
    # Trackable click-through URL (logs the click and 302s to demo_url).
    tracked_url = f"{base}/api/r/{share_id}"

    log_doc = {
        "id": share_id,
        "recipient_email": payload.recipient_email,
        "recipient_name": (payload.recipient_name.strip() if payload.recipient_name else None),
        "sender_name": sender_name_clean,
        "company": payload.company,
        "message": payload.message,
        "demo_type": payload.demo_type,
        "share_target": payload.share_target,
        "demo_url": demo_url,
        "tracked_url": tracked_url,
        "ip": http_request.client.host if http_request.client else None,
        "ua": (http_request.headers.get("user-agent", "") or "")[:200],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sent": False,
        "error": None,
        "click_count": 0,
        "first_clicked_at": None,
        "last_clicked_at": None,
    }

    sent = False
    error_msg = None
    error_kind = None
    error_status_code = None
    log = logging.getLogger(__name__)
    log.info(
        f"[share-demo] route_hit recipient={payload.recipient_email} "
        f"demo_type={payload.demo_type} share_target={payload.share_target} "
        f"share_id={share_id}"
    )
    try:
        result = await send_demo_share_with_result(
            recipient_email=payload.recipient_email,
            sender_name=sender_name_clean,
            demo_url=tracked_url,
            demo_type=payload.demo_type,
            company=(payload.company.strip() if payload.company else None),
            message=(payload.message.strip() if payload.message else None),
            kind=payload.share_target,
        )
        sent = bool(result.get("ok"))
        if not sent:
            error_msg = result.get("error") or "Email delivery failed (unknown)."
            error_kind = result.get("error_kind")
            error_status_code = result.get("status_code")
        log.info(
            f"[share-demo] resend_result ok={sent} kind={error_kind} "
            f"status={error_status_code} id={result.get('id')} "
            f"error={error_msg!r}"
        )
    except Exception as e:
        log.exception(f"[share-demo] route_exception recipient={payload.recipient_email}")
        error_msg = f"{type(e).__name__}: {e}"
        error_kind = "route_exception"

    log_doc["sent"] = sent
    log_doc["error"] = error_msg
    log_doc["error_kind"] = error_kind
    log_doc["error_status_code"] = error_status_code
    await db.demo_shares.insert_one(log_doc)

    return {
        "sent": sent,
        "demo_url": demo_url,
        "tracked_url": tracked_url,
        "share_id": share_id,
        "reason": error_msg,
        "error_kind": error_kind,
        "error_status_code": error_status_code,
    }


@api_router.get("/r/{share_id}")
async def track_share_click(share_id: str, request: Request):
    """Trackable redirect — recipients click the email link, we log the click,
    then 302 them straight into the personalized demo. Falls back to the
    homepage if the share record is missing/malformed.
    """
    share = await db.demo_shares.find_one({"id": share_id}, {"_id": 0})
    fallback = (os.environ.get("SITE_URL") or str(request.base_url)).rstrip("/")
    if not share or not share.get("demo_url"):
        return RedirectResponse(url=fallback, status_code=302)

    now_iso = datetime.now(timezone.utc).isoformat()
    update = {
        "$inc": {"click_count": 1},
        "$set": {"last_clicked_at": now_iso},
    }
    if not share.get("first_clicked_at"):
        update["$set"]["first_clicked_at"] = now_iso
    try:
        await db.demo_shares.update_one({"id": share_id}, update)
        # Also append a click record so we have full audit trail.
        await db.demo_share_clicks.insert_one({
            "id": str(uuid.uuid4()),
            "share_id": share_id,
            "recipient_email": share.get("recipient_email"),
            "demo_type": share.get("demo_type"),
            "ip": request.client.host if request.client else None,
            "ua": (request.headers.get("user-agent", "") or "")[:200],
            "referrer": request.headers.get("referer"),
            "timestamp": now_iso,
        })
    except Exception as e:
        logging.getLogger(__name__).error(f"share click tracking failed: {e}")

    return RedirectResponse(url=share["demo_url"], status_code=302)


@api_router.get("/admin/demo-shares")
async def admin_list_demo_shares(
    _: str = Depends(verify_admin),
    range: str = Query("all", regex="^(7d|30d|all)$"),
):
    """Admin · demo-share log, date-filtered."""
    query: Dict[str, Any] = {}
    if range != "all":
        days = 7 if range == "7d" else 30
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query["timestamp"] = {"$gte": cutoff}
    docs = await db.demo_shares.find(query, {"_id": 0}).sort("timestamp", -1).to_list(2000)
    return docs


# ---------- Founder bypass (master access) ----------
class FounderAuthRequest(BaseModel):
    key: str


@api_router.post("/founder/auth")
async def founder_auth(payload: FounderAuthRequest):
    """One-shot founder bypass. Validates the secret FOUNDER_KEY, then auto-creates
    (or refreshes) a master user with every entitlement granted. Returns the
    portal_token so the frontend can drop the user into /portal as a fully
    paid customer with full subscription access — no Stripe call required.

    Security:
      - 401 unless `key` exactly matches `FOUNDER_KEY` env var (constant-time compare)
      - 503 if FOUNDER_KEY env var is empty (fail-shut, never wide-open)
      - The route is intentionally not linked from any nav. Access via /founder?key=...
    """
    if not FOUNDER_KEY:
        raise HTTPException(status_code=503, detail="Founder access not configured (FOUNDER_KEY missing).")
    if not secrets.compare_digest(payload.key, FOUNDER_KEY):
        raise HTTPException(status_code=401, detail="Invalid founder key")

    founder_email = os.environ.get("FOUNDER_EMAIL", "jeffrey@creatorboostai.com").strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Build a master entitlement covering every product + every subscription tier
    entitlements = []
    for k, v in PRODUCTS.items():
        entitlements.append({
            "product_key": k, "product_name": v["name"], "kind": "one_time",
            "tier": "founder", "interval": None,
            "granted_at": now_iso, "session_id": f"founder_{k}",
            "status": "active",
        })
    for k, v in SUBSCRIPTIONS.items():
        entitlements.append({
            "product_key": k, "product_name": v["name"], "kind": "subscription",
            "tier": v["tier"], "interval": v["interval"],
            "granted_at": now_iso, "session_id": f"founder_{k}",
            "status": "active",
        })
    for k, v in HIGH_TICKET_PROGRAMS.items():
        entitlements.append({
            "product_key": k, "product_name": v["name"], "kind": "high_ticket",
            "tier": "founder", "interval": None,
            "granted_at": now_iso, "session_id": f"founder_{k}",
            "status": "active",
        })

    existing = await db.users.find_one({"email": founder_email}, {"_id": 0})
    if existing:
        portal_token = existing.get("portal_token") or secrets.token_urlsafe(32)
        await db.users.update_one(
            {"email": founder_email},
            {"$set": {
                "portal_token": portal_token,
                "role": "founder",
                "entitlements": entitlements,
                "updated_at": now_iso,
            }},
        )
    else:
        portal_token = secrets.token_urlsafe(32)
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": founder_email,
            "portal_token": portal_token,
            "role": "founder",
            "entitlements": entitlements,
            "created_at": now_iso,
            "updated_at": now_iso,
            "source": "founder_bypass",
        })

    return {
        "email": founder_email,
        "token": portal_token,
        "role": "founder",
        "entitlements": entitlements,
    }


@api_router.get("/admin/subscriptions")
async def admin_list_subscriptions(
    _: str = Depends(verify_admin),
    range: str = Query("all", regex="^(7d|30d|all)$"),
):
    """Admin: list CreatorBoostAI subscription rows (active + canceled), date-filtered."""
    query: Dict[str, Any] = {}
    if range != "all":
        days = 7 if range == "7d" else 30
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query["created_at"] = {"$gte": cutoff}
    docs = await db.subscriptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


# ---------- Payment processor abstraction (Stripe primary, Dodo stub) ----------
PAYMENT_PROCESSOR = os.environ.get("PAYMENT_PROCESSOR", "stripe").lower()


@api_router.get("/payment-processor")
async def payment_processor_info():
    """UI uses this to know which processor to call. Stripe is primary; Dodo is a
    stub that returns the same shape — wire actual Dodo SDK when credentials land."""
    return {
        "primary": "stripe",
        "secondary": ["paypal_pending"],   # PayPal wired once Client ID/Secret arrive
        "fallback": ["dodo_stub"],         # Dodo stub — not active
        "active": PAYMENT_PROCESSOR if PAYMENT_PROCESSOR in {"stripe", "dodo"} else "stripe",
    }


@api_router.post("/checkout/session", response_model=CheckoutSessionOut)
async def create_checkout_session(payload: CheckoutSessionCreate, http_request: Request):
    if payload.product_key not in PRODUCTS:
        raise HTTPException(status_code=400, detail=f"Invalid product. Must be one of: {sorted(PRODUCTS.keys())}")

    product = PRODUCTS[payload.product_key]
    origin = payload.origin_url.rstrip("/")
    # Signal Packs go to a dedicated download page (entitlement-gated).
    if product["type"] == "signal_pack":
        success_url = f"{origin}/download/signal-pack?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/cancel?product={payload.product_key}"
    else:
        # Unified success page reads ?product=&session_id= and renders the
        # right onboarding flow (training vs library).
        success_url = (
            f"{origin}/success?session_id={{CHECKOUT_SESSION_ID}}"
            f"&product={payload.product_key}"
        )
        cancel_url = f"{origin}/cancel?product={payload.product_key}"

    stripe_checkout = _stripe_client(http_request)

    metadata = {
        "product_key": payload.product_key,
        "product_name": product["name"],
        "product_type": product["type"],
        "source": "web_checkout",
    }
    if payload.email:
        metadata["customer_email_hint"] = payload.email
    # Demo-to-Revenue attribution — forwarded to Stripe + persisted on txn so
    # the founder dashboard can roll up "revenue per demo".
    if payload.source_demo:
        metadata["source_demo"] = payload.source_demo
    if payload.source_industry:
        metadata["source_industry"] = payload.source_industry
    if payload.lead_id:
        metadata["lead_id"] = payload.lead_id
    if payload.company:
        metadata["company"] = payload.company

    req = CheckoutSessionRequest(
        amount=float(product["amount"]),
        currency=product["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)
    except Exception as e:
        logging.getLogger(__name__).error(f"Stripe session create failed: {e}")
        raise HTTPException(status_code=502, detail="Unable to create checkout session")

    txn_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "product_key": payload.product_key,
        "product_name": product["name"],
        "amount": product["amount"],
        "currency": product["currency"],
        "email": payload.email,
        "origin_url": origin,
        "status": "open",
        "payment_status": "unpaid",
        "email_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata,
    }
    await db.payment_transactions.insert_one(txn_doc)

    return CheckoutSessionOut(url=session.url, session_id=session.session_id)


@api_router.post("/checkout/subscription", response_model=CheckoutSessionOut)
async def create_subscription_session(payload: SubscriptionCheckoutCreate, http_request: Request):
    """CreatorBoostAI subscription checkout — NATIVE Stripe subscription mode.

    Each plan maps to a Stripe Price ID with `recurring` config (set in Stripe
    Dashboard). Passing `stripe_price_id` to the Emergent wrapper makes Stripe
    Checkout open in subscription mode and the customer is billed every period
    automatically. Initial access is granted on `checkout.session.completed`;
    cancellations/renewals are handled by `customer.subscription.deleted` and
    `invoice.paid` events on /api/webhook/stripe.

    Enterprise tier is intentionally not exposed — routes to /contact in the UI."""
    if payload.plan_key not in SUBSCRIPTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {sorted(SUBSCRIPTIONS.keys())}")

    plan = SUBSCRIPTIONS[payload.plan_key]
    price_id = (os.environ.get(plan["price_id_env"], "") or "").strip()
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Subscription billing is not configured for {payload.plan_key}. "
                f"Missing env var {plan['price_id_env']}. Mint a recurring Price in "
                f"Stripe Dashboard → Products and paste the price_... ID into backend/.env."
            ),
        )

    origin = payload.origin_url.rstrip("/")
    success_url = (
        f"{origin}/success?session_id={{CHECKOUT_SESSION_ID}}"
        f"&product={payload.plan_key}&type=subscription"
    )
    cancel_url = f"{origin}/cancel?product={payload.plan_key}"

    stripe_checkout = _stripe_client(http_request)

    metadata = {
        "plan_key": payload.plan_key,
        "plan_tier": plan["tier"],
        "plan_interval": plan["interval"],
        "product_type": "subscription",
        "source": "web_subscription",
    }
    if payload.email:
        metadata["customer_email_hint"] = payload.email
    if payload.source_demo:
        metadata["source_demo"] = payload.source_demo
    if payload.source_industry:
        metadata["source_industry"] = payload.source_industry
    if payload.lead_id:
        metadata["lead_id"] = payload.lead_id
    if payload.company:
        metadata["company"] = payload.company

    # Native subscription mode: passing a recurring Price ID makes Stripe
    # auto-create the subscription on checkout and bill on the recurring
    # interval forever. No need to set mode='subscription' explicitly — Stripe
    # detects it from the Price config.
    req = CheckoutSessionRequest(
        stripe_price_id=price_id,
        quantity=1,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)
    except Exception as e:
        logging.getLogger(__name__).error(f"Stripe subscription session create failed: {e}")
        raise HTTPException(status_code=502, detail="Unable to create subscription session")

    txn_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "product_key": payload.plan_key,
        "product_name": f"{plan['name']} ({plan['interval']}ly)",
        "amount": plan["amount"],
        "currency": plan["currency"],
        "email": payload.email,
        "origin_url": origin,
        "status": "open",
        "payment_status": "unpaid",
        "subscription": True,
        "subscription_mode": "stripe_native",
        "stripe_price_id": price_id,
        "tier": plan["tier"],
        "interval": plan["interval"],
        "email_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata,
    }
    await db.payment_transactions.insert_one(txn_doc)

    return CheckoutSessionOut(url=session.url, session_id=session.session_id)


@api_router.get("/checkout/status/{session_id}", response_model=CheckoutStatusOut)
async def get_checkout_status(session_id: str, http_request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    stripe_status = None
    stripe_payment_status = None
    stripe_amount = int(round(float(txn.get("amount", 0)) * 100))
    stripe_currency = txn.get("currency", "usd")
    stripe_email = None

    try:
        stripe_checkout = _stripe_client(http_request)
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        stripe_status = status.status
        stripe_payment_status = status.payment_status
        stripe_amount = status.amount_total
        stripe_currency = status.currency
        if status.metadata:
            stripe_email = status.metadata.get("customer_email") or status.metadata.get("customer_email_hint")
    except Exception as e:
        # Emergent Stripe proxy GET is unreliable; fall back to DB (webhook keeps it fresh)
        logging.getLogger(__name__).warning(f"Stripe status fetch failed for {session_id}; using DB. err={e}")

    effective_status = stripe_status or txn.get("status", "open")
    effective_payment_status = stripe_payment_status or txn.get("payment_status", "unpaid")
    effective_email = stripe_email or txn.get("email")

    updates = {
        "status": effective_status,
        "payment_status": effective_payment_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if effective_email and effective_email != txn.get("email"):
        updates["email"] = effective_email
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": updates})
    txn.update(updates)

    if effective_payment_status == "paid":
        await _trigger_post_purchase_email(txn)
        await _grant_access_for_txn(txn)

    return CheckoutStatusOut(
        session_id=session_id,
        status=effective_status,
        payment_status=effective_payment_status,
        amount_total=stripe_amount,
        currency=stripe_currency,
        product_key=txn.get("product_key"),
        product_name=txn.get("product_name"),
        email=effective_email,
    )


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook — handles BOTH one-time and native subscription events.

    Events routed:
      - checkout.session.completed       → grant initial access (one-time + sub initial)
      - invoice.paid                     → recurring renewal: refresh subscription record
      - customer.subscription.created    → store subscription record
      - customer.subscription.updated    → keep status / period_end fresh
      - customer.subscription.deleted    → revoke portal access (cancellation / final dunning)

    Idempotency: every event_id is recorded in `processed_webhook_events`.
    Replays are short-circuited so duplicate Stripe deliveries never double-grant
    or double-charge user access.
    """
    stripe_checkout = _stripe_client(request)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logging.getLogger(__name__).error(f"Webhook verify failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    # ---- Idempotency: refuse to process the same event_id twice ----
    event_id = getattr(event, "event_id", None)
    if event_id:
        already = await db.processed_webhook_events.find_one({"event_id": event_id}, {"_id": 0})
        if already:
            return {"received": True, "duplicate": True}
        await db.processed_webhook_events.insert_one({
            "event_id": event_id,
            "event_type": event.event_type,
            "session_id": event.session_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        })

    event_type = event.event_type
    metadata = event.metadata or {}

    if event_type == "checkout.session.completed" and event.session_id:
        await _handle_checkout_completed(event)

    elif event_type == "customer.subscription.created":
        await _upsert_subscription_record(event, status_override="active")

    elif event_type == "customer.subscription.updated":
        await _upsert_subscription_record(event)

    elif event_type == "invoice.paid":
        # Recurring renewal — bump last_renewal_at on the subscription record.
        email = metadata.get("customer_email_hint") or metadata.get("customer_email")
        plan_key = metadata.get("plan_key")
        if email and plan_key:
            await db.subscriptions.update_one(
                {"email": email, "plan_key": plan_key},
                {"$set": {
                    "status": "active",
                    "last_renewal_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=False,
            )

    elif event_type == "customer.subscription.deleted":
        # Final cancellation — mark sub canceled and revoke portal access on user.
        email = metadata.get("customer_email_hint") or metadata.get("customer_email")
        plan_key = metadata.get("plan_key")
        if email:
            await db.subscriptions.update_one(
                {"email": email, **({"plan_key": plan_key} if plan_key else {})},
                {"$set": {
                    "status": "canceled",
                    "canceled_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            # Mark all matching subscription entitlements on the user as inactive.
            user = await db.users.find_one({"email": email}, {"_id": 0})
            if user:
                ents = user.get("entitlements", [])
                changed = False
                for ent in ents:
                    if ent.get("kind") == "subscription" and (not plan_key or ent.get("product_key") == plan_key):
                        ent["status"] = "canceled"
                        ent["canceled_at"] = datetime.now(timezone.utc).isoformat()
                        changed = True
                if changed:
                    await db.users.update_one(
                        {"email": email},
                        {"$set": {"entitlements": ents, "updated_at": datetime.now(timezone.utc).isoformat()}},
                    )

    return {"received": True}


async def _handle_checkout_completed(event) -> None:
    """Initial purchase (one-time OR subscription) — refresh txn + grant access + email."""
    txn = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
    if not txn:
        return
    await db.payment_transactions.update_one(
        {"session_id": event.session_id},
        {"$set": {
            "payment_status": event.payment_status,
            "status": "complete",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if event.payment_status != "paid":
        return
    txn["payment_status"] = event.payment_status
    # Pull customer email from event metadata if txn didn't have one
    if not txn.get("email"):
        meta = event.metadata or {}
        hinted = meta.get("customer_email") or meta.get("customer_email_hint")
        if hinted:
            txn["email"] = hinted
            await db.payment_transactions.update_one(
                {"session_id": event.session_id}, {"$set": {"email": hinted}}
            )
    # For subscriptions: retrieve the Stripe Checkout Session via official SDK
    # so we can cache stripe_customer_id + stripe_subscription_id on the txn.
    # The Emergent webhook wrapper hides these fields. We only run this when
    # a real STRIPE_API_KEY is available — silently skipped during testing.
    if (txn.get("subscription") or txn.get("product_key") in SUBSCRIPTIONS) and STRIPE_API_KEY:
        try:
            import stripe as _stripe
            _stripe.api_key = STRIPE_API_KEY
            sess = await asyncio.to_thread(
                _stripe.checkout.Session.retrieve, event.session_id
            )
            txn["stripe_customer_id"] = sess.get("customer")
            txn["stripe_subscription_id"] = sess.get("subscription")
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "stripe_customer_id": txn["stripe_customer_id"],
                    "stripe_subscription_id": txn["stripe_subscription_id"],
                }},
            )
        except Exception as e:
            logging.getLogger(__name__).warning(
                f"Could not retrieve Stripe session {event.session_id} for customer/sub IDs: {e}"
            )
    await _trigger_post_purchase_email(txn)
    await _grant_access_for_txn(txn)
    # If subscription, also seed/refresh the subscriptions collection
    if txn.get("subscription") or txn.get("product_key") in SUBSCRIPTIONS:
        await _upsert_subscription_record_from_txn(txn)
    # Demo-to-Revenue attribution — persists a record linking this purchase
    # back to the demo the customer watched (if any), and flips any matching
    # lead to "closed_won" so the founder dashboard rolls up accurately.
    await _record_demo_revenue_event(txn, event)


async def _record_demo_revenue_event(txn: Dict[str, Any], event) -> None:
    """Append a `demo_revenue_events` row for Founder Dashboard aggregation.

    Always fires on a paid checkout, even if no demo was attributed — that
    way the dashboard can distinguish (demo-driven) vs (direct) revenue.
    """
    meta = event.metadata or {}
    amount = float(txn.get("amount") or 0.0)
    plan_key = txn.get("product_key") or meta.get("plan_key") or meta.get("product_key")
    is_sub = bool(txn.get("subscription") or (plan_key in SUBSCRIPTIONS))
    mrr_created = 0.0
    if is_sub and plan_key in SUBSCRIPTIONS:
        plan = SUBSCRIPTIONS[plan_key]
        if plan.get("interval") == "month":
            mrr_created = float(plan.get("amount", 0.0))
        elif plan.get("interval") == "year":
            mrr_created = round(float(plan.get("amount", 0.0)) / 12.0, 2)

    row = {
        "id": str(uuid.uuid4()),
        "kind": "subscription_started" if is_sub else "purchase_completed",
        "session_id": txn.get("session_id"),
        "email": txn.get("email") or meta.get("customer_email_hint"),
        "amount": amount,
        "currency": txn.get("currency") or "usd",
        "mrr_created": mrr_created,
        "plan_key": plan_key,
        "plan_tier": meta.get("plan_tier") or (SUBSCRIPTIONS.get(plan_key, {}).get("tier") if plan_key else None),
        "source_demo": meta.get("source_demo") or txn.get("metadata", {}).get("source_demo"),
        "source_industry": meta.get("source_industry") or txn.get("metadata", {}).get("source_industry"),
        "lead_id": meta.get("lead_id") or txn.get("metadata", {}).get("lead_id"),
        "company": meta.get("company") or txn.get("metadata", {}).get("company"),
        "at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.demo_revenue_events.insert_one(dict(row))
    except Exception as e:
        logging.getLogger(__name__).warning(f"demo_revenue_events insert failed: {e}")

    # If we have a lead_id, flip its status to closed_won + attach subscription
    if row["lead_id"]:
        try:
            await db.leads.update_one(
                {"id": row["lead_id"]},
                {"$set": {
                    "status": "closed_won",
                    "closed_at": row["at"],
                    "closed_amount": amount,
                    "closed_session_id": row["session_id"],
                    "closed_plan_key": plan_key,
                    "closed_source_demo": row["source_demo"],
                }},
            )
        except Exception as e:
            logging.getLogger(__name__).warning(f"lead close-won update failed: {e}")



async def _upsert_subscription_record_from_txn(txn: Dict[str, Any]) -> None:
    """Seed the `subscriptions` collection on initial checkout.session.completed."""
    email = txn.get("email")
    plan_key = txn.get("product_key")
    if not email or plan_key not in SUBSCRIPTIONS:
        return
    plan = SUBSCRIPTIONS[plan_key]
    now_iso = datetime.now(timezone.utc).isoformat()
    set_doc = {
        "email": email,
        "plan_key": plan_key,
        "tier": plan["tier"],
        "interval": plan["interval"],
        "amount": plan["amount"],
        "currency": plan["currency"],
        "status": "active",
        "session_id": txn.get("session_id"),
        "stripe_price_id": txn.get("stripe_price_id"),
        "started_at": now_iso,
        "last_renewal_at": now_iso,
        "updated_at": now_iso,
    }
    # Cache the Stripe customer + subscription IDs so the billing portal works
    if txn.get("stripe_customer_id"):
        set_doc["stripe_customer_id"] = txn["stripe_customer_id"]
    if txn.get("stripe_subscription_id"):
        set_doc["stripe_subscription_id"] = txn["stripe_subscription_id"]
    await db.subscriptions.update_one(
        {"email": email, "plan_key": plan_key},
        {"$set": set_doc, "$setOnInsert": {
            "id": str(uuid.uuid4()),
            "created_at": now_iso,
        }},
        upsert=True,
    )


async def _upsert_subscription_record(event, status_override: Optional[str] = None) -> None:
    """Used by customer.subscription.created/updated webhook events.

    The Emergent webhook wrapper exposes only event_id, event_type, session_id,
    payment_status and metadata. So we identify the subscription via the metadata
    we attached at checkout (customer_email_hint + plan_key)."""
    metadata = event.metadata or {}
    email = metadata.get("customer_email_hint") or metadata.get("customer_email")
    plan_key = metadata.get("plan_key")
    if not email or plan_key not in SUBSCRIPTIONS:
        return
    plan = SUBSCRIPTIONS[plan_key]
    now_iso = datetime.now(timezone.utc).isoformat()
    set_doc = {
        "email": email,
        "plan_key": plan_key,
        "tier": plan["tier"],
        "interval": plan["interval"],
        "amount": plan["amount"],
        "currency": plan["currency"],
        "updated_at": now_iso,
    }
    set_on_insert = {
        "id": str(uuid.uuid4()),
        "started_at": now_iso,
        "created_at": now_iso,
    }
    # status goes in either $set (when explicitly overriding) or $setOnInsert
    # (default). Mongo forbids the same field in both operators.
    if status_override:
        set_doc["status"] = status_override
    else:
        set_on_insert["status"] = "active"
    await db.subscriptions.update_one(
        {"email": email, "plan_key": plan_key},
        {"$set": set_doc, "$setOnInsert": set_on_insert},
        upsert=True,
    )


# ---------- TTS ----------
@api_router.post("/tts/speak")
async def tts_speak(payload: TTSRequest):
    voice = payload.voice if payload.voice in ALLOWED_VOICES else DEFAULT_VOICE
    audio = await tts_generate(text=payload.text, voice=voice, model=payload.model or "tts-1")
    if audio is None:
        raise HTTPException(status_code=503, detail="TTS unavailable")
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


# ---------- Lead analyze (live AI) ----------
LEAD_SYSTEM_PROMPT = """You are CreatorBoostAI's real estate analyst. Given a free-form lead description, return a STRICT JSON object only — no prose, no markdown fences. Keys exactly as follows:

{
  "lead_type": "buyer | seller | renter | property_management | investor",
  "intent_score": 0-100 integer,
  "urgency": 0-100 integer,
  "key_signals": ["3-5 short bullet phrases of behavioral / market signals"],
  "recommended_action": "ONE clear next best action sentence under 25 words",
  "personalized_message": "A 3-5 sentence outreach message in the voice of Jeffrey, a Grand Rapids realtor. Personable, direct, references specifics from the lead, suggests a concrete time (e.g. Thursday 3 PM). Sign as '— Jeffrey, BodyIQ Realty'."
}

Rules:
- Output JSON only. No commentary, no code fences.
- All string values plain text (no markdown).
- Pick the single best lead_type even if ambiguous."""


def _extract_json(s: str) -> Optional[dict]:
    if not s:
        return None
    s = s.strip()
    # strip code fences
    s = _re.sub(r"^```(?:json)?\s*", "", s)
    s = _re.sub(r"\s*```$", "", s)
    try:
        return _json.loads(s)
    except Exception:
        # try to grab the first {...} block
        m = _re.search(r"\{.*\}", s, flags=_re.S)
        if m:
            try:
                return _json.loads(m.group(0))
            except Exception:
                return None
        return None


@api_router.post("/lead/analyze", response_model=LeadAnalyzeResponse)
async def analyze_lead(payload: LeadAnalyzeRequest):
    key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="LLM not configured")
    chat = LlmChat(
        api_key=key,
        session_id=str(uuid.uuid4()),
        system_message=LEAD_SYSTEM_PROMPT,
    ).with_model("openai", "gpt-5.1")
    try:
        raw = await chat.send_message(LlmUserMessage(text=payload.description.strip()))
    except Exception as e:
        logging.getLogger(__name__).error(f"LLM analyze failed: {e}")
        raise HTTPException(status_code=502, detail="Analysis service temporarily unavailable")

    data = _extract_json(raw if isinstance(raw, str) else str(raw))
    if not data:
        raise HTTPException(status_code=502, detail="Invalid analysis response")

    # Coerce types & defaults
    try:
        intent = int(data.get("intent_score", 0))
        urgency = int(data.get("urgency", 0))
    except Exception:
        intent, urgency = 0, 0
    intent = max(0, min(100, intent))
    urgency = max(0, min(100, urgency))
    signals = data.get("key_signals") or []
    if not isinstance(signals, list):
        signals = [str(signals)]
    signals = [str(x)[:140] for x in signals][:5]

    valid_types = {"buyer", "seller", "renter", "property_management", "investor"}
    lead_type = str(data.get("lead_type", "buyer")).lower().strip().replace(" ", "_")
    if lead_type not in valid_types:
        lead_type = "buyer"

    return LeadAnalyzeResponse(
        lead_type=lead_type,
        intent_score=intent,
        urgency=urgency,
        key_signals=signals,
        recommended_action=str(data.get("recommended_action", ""))[:300],
        personalized_message=str(data.get("personalized_message", ""))[:1500],
    )


# =====================================================================
# Demo Delivery & Tracking Engine — controlled, trackable, conversion-grade
# =====================================================================
# Each session gets a unique id. The frontend `useDemoTracking` hook fires
# start → periodic heartbeats → events (CTA clicks, share, etc) →
# (optionally) complete. When watch progress crosses 50% we set
# `half_view_notified=True` and queue a notification for the founder.
# Storage is MongoDB (the project's actual datastore — note the user said
# "Supabase" but the codebase has always been MongoDB; PRD reflects this).

VALID_DEMO_TYPES = {"realtor", "insurance", "creator", "noldus", "sita", "enterprise", "supermarket"}


class DemoSessionStart(BaseModel):
    demo_type: str = Field(..., pattern=r"^(realtor|insurance|creator|noldus|sita|enterprise|supermarket)$")
    recipient_id: Optional[str] = Field(None, max_length=120)
    recipient_name: Optional[str] = Field(None, max_length=120)
    recipient_company: Optional[str] = Field(None, max_length=160)
    recipient_email: Optional[EmailStr] = None
    referrer: Optional[str] = Field(None, max_length=500)
    utm: Optional[Dict[str, Any]] = None


class DemoSessionStartOut(BaseModel):
    session_id: str
    started_at: str


class DemoSessionHeartbeat(BaseModel):
    session_id: str
    progress_pct: int = Field(..., ge=0, le=100)
    watch_seconds: int = Field(..., ge=0)
    current_scene: Optional[int] = Field(None, ge=0)
    total_scenes: Optional[int] = Field(None, ge=1)


class DemoSessionEvent(BaseModel):
    session_id: str
    event_type: str = Field(..., max_length=64)  # "cta_click" | "share_click" | "share_send" | "cta_apply" | …
    metadata: Optional[Dict[str, Any]] = None


class DemoSessionComplete(BaseModel):
    session_id: str
    watch_seconds: int = Field(..., ge=0)


@api_router.post("/demo/session/start", response_model=DemoSessionStartOut, status_code=201)
async def demo_session_start(payload: DemoSessionStart, http_request: Request):
    """Open a tracked demo session. Returns a session_id the client uses for
    all subsequent heartbeats / events / complete. Also logs IP + UA."""
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "id": sid,
        "demo_type": payload.demo_type,
        "recipient_id": payload.recipient_id,
        "recipient_name": payload.recipient_name,
        "recipient_company": payload.recipient_company,
        "recipient_email": payload.recipient_email,
        "referrer": payload.referrer,
        "utm": payload.utm or {},
        "started_at": now.isoformat(),
        "last_heartbeat_at": now.isoformat(),
        "watch_seconds": 0,
        "progress_pct": 0,
        "current_scene": 0,
        "total_scenes": None,
        "events": [],
        "completed": False,
        "completed_at": None,
        "half_view_notified": False,
        "ip": http_request.client.host if http_request.client else None,
        "ua": (http_request.headers.get("user-agent", "") or "")[:240],
    }
    await db.demo_sessions.insert_one(doc)
    return DemoSessionStartOut(session_id=sid, started_at=now.isoformat())


async def _maybe_queue_half_view_notification(session: Dict[str, Any]) -> None:
    """When progress crosses 50% for the first time, persist a founder
    notification record. Email delivery (via Resend) is best-effort and only
    fires when keys are configured — graceful degradation otherwise."""
    notif = {
        "id": str(uuid.uuid4()),
        "type": "demo_half_view",
        "session_id": session["id"],
        "demo_type": session["demo_type"],
        "recipient_name": session.get("recipient_name"),
        "recipient_company": session.get("recipient_company"),
        "recipient_email": session.get("recipient_email"),
        "progress_pct": session.get("progress_pct"),
        "watch_seconds": session.get("watch_seconds"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "delivered": False,
    }
    await db.demo_notifications.insert_one(notif)
    # Best-effort founder email — if Resend is configured it'll send,
    # otherwise we just have the queued record on the dashboard.
    founder_email = os.environ.get("FOUNDER_EMAIL", "").strip()
    if not founder_email:
        return
    try:
        from email_service import send_founder_alert  # optional helper
        await send_founder_alert(
            to_email=founder_email,
            subject=f"🔥 {session.get('recipient_name') or 'A prospect'} watched 50% of the {session['demo_type']} demo",
            body=(
                f"Demo: {session['demo_type']}\n"
                f"Recipient: {session.get('recipient_name') or '—'} "
                f"({session.get('recipient_company') or '—'})\n"
                f"Email: {session.get('recipient_email') or '—'}\n"
                f"Progress: {session.get('progress_pct')}% · {session.get('watch_seconds')}s\n"
                f"Session: {session['id']}\n"
            ),
        )
        await db.demo_notifications.update_one(
            {"id": notif["id"]}, {"$set": {"delivered": True}}
        )
    except Exception as e:  # pragma: no cover
        logging.getLogger(__name__).info(f"founder alert deferred: {e}")


@api_router.post("/demo/session/heartbeat", status_code=200)
async def demo_session_heartbeat(payload: DemoSessionHeartbeat):
    """Periodic progress update from the demo client. Triggers half-view
    notification the first time progress crosses 50%."""
    sess = await db.demo_sessions.find_one({"id": payload.session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(404, "Demo session not found")
    update: Dict[str, Any] = {
        "last_heartbeat_at": datetime.now(timezone.utc).isoformat(),
        "progress_pct": payload.progress_pct,
        "watch_seconds": max(payload.watch_seconds, sess.get("watch_seconds", 0)),
    }
    if payload.current_scene is not None:
        update["current_scene"] = payload.current_scene
    if payload.total_scenes is not None:
        update["total_scenes"] = payload.total_scenes
    crossed_half = (
        payload.progress_pct >= 50
        and not sess.get("half_view_notified", False)
    )
    if crossed_half:
        update["half_view_notified"] = True
    await db.demo_sessions.update_one({"id": payload.session_id}, {"$set": update})
    if crossed_half:
        merged = {**sess, **update}
        await _maybe_queue_half_view_notification(merged)
    return {"ok": True, "half_view_triggered": crossed_half}


@api_router.post("/demo/session/event", status_code=200)
async def demo_session_event(payload: DemoSessionEvent):
    """Append a discrete interaction event (CTA click, share, etc)."""
    ev = {
        "type": payload.event_type[:64],
        "at": datetime.now(timezone.utc).isoformat(),
        "metadata": payload.metadata or {},
    }
    res = await db.demo_sessions.update_one(
        {"id": payload.session_id}, {"$push": {"events": ev}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Demo session not found")
    return {"ok": True}


@api_router.post("/demo/session/complete", status_code=200)
async def demo_session_complete(payload: DemoSessionComplete):
    """Mark a demo as fully watched (also acts as a final heartbeat)."""
    res = await db.demo_sessions.update_one(
        {"id": payload.session_id},
        {"$set": {
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "progress_pct": 100,
            "watch_seconds": payload.watch_seconds,
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Demo session not found")
    return {"ok": True}


@api_router.get("/admin/demo-sessions")
async def admin_list_demo_sessions(
    _: str = Depends(verify_admin),
    demo_type: Optional[str] = Query(None),
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    limit: int = Query(200, ge=1, le=2000),
):
    """Founder dashboard feed — all tracked demo sessions, newest first."""
    query: Dict[str, Any] = {}
    if demo_type and demo_type in VALID_DEMO_TYPES:
        query["demo_type"] = demo_type
    if range != "all":
        days = int(range.replace("d", ""))
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query["started_at"] = {"$gte": cutoff}
    cursor = db.demo_sessions.find(query, {"_id": 0}).sort("started_at", -1).limit(limit)
    sessions = [s async for s in cursor]
    # Light summary stats
    total = len(sessions)
    half = sum(1 for s in sessions if s.get("half_view_notified"))
    completed = sum(1 for s in sessions if s.get("completed"))
    return {
        "summary": {
            "total": total,
            "half_view": half,
            "completed": completed,
            "completion_rate": round((completed / total) * 100, 1) if total else 0.0,
            "half_view_rate": round((half / total) * 100, 1) if total else 0.0,
        },
        "sessions": sessions,
    }


@api_router.get("/admin/demo-notifications")
async def admin_list_demo_notifications(
    _: str = Depends(verify_admin),
    limit: int = Query(100, ge=1, le=500),
):
    """Half-view notifications queue — what to follow up on now."""
    cursor = db.demo_notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return [n async for n in cursor]


# =============================================================================
# Demo-to-Revenue analytics — founder-facing aggregation.
# Returns per-demo rollups (views, leads, meetings, subs, revenue, MRR, conv %)
# + a sorted "top revenue demos" list + an activity feed, scoped by a time
# range selector. Backs the new Demo Revenue tab in /portal/ops.
# =============================================================================

# Canonical demo-type registry for display names + industry labels (matches the
# 5 live demos + the /demo hub). Keep in sync with VALID_DEMO_TYPES.
DEMO_REGISTRY: Dict[str, Dict[str, str]] = {
    "realtor":     {"label": "Real Estate", "industry": "Real Estate"},
    "insurance":   {"label": "Insurance",   "industry": "Insurance"},
    "supermarket": {"label": "Retail",      "industry": "Retail"},
    "creator":     {"label": "Influencer",  "industry": "Influencer"},
    "noldus":      {"label": "Enterprise",  "industry": "Enterprise"},
    "general":     {"label": "General",     "industry": "General"},
}


def _range_cutoff_iso(range_key: str) -> Optional[str]:
    """Convert 'today' | '7d' | '30d' | 'all' to an ISO cutoff (or None)."""
    now = datetime.now(timezone.utc)
    if range_key == "today":
        cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range_key == "7d":
        cutoff = now - timedelta(days=7)
    elif range_key == "30d":
        cutoff = now - timedelta(days=30)
    else:
        return None
    return cutoff.isoformat()


@api_router.get("/admin/demo-revenue")
async def admin_demo_revenue(
    _: str = Depends(verify_admin),
    range: str = Query("30d", regex="^(today|7d|30d|all)$"),
):
    """Founder dashboard backing — per-demo rollups + top list + activity feed."""
    cutoff = _range_cutoff_iso(range)

    # ---- Sessions (views) grouped by demo_type ----
    sess_query: Dict[str, Any] = {}
    if cutoff:
        sess_query["started_at"] = {"$gte": cutoff}
    sessions = [s async for s in db.demo_sessions.find(sess_query, {"_id": 0})]

    # ---- Revenue events grouped by source_demo (attribution) ----
    rev_query: Dict[str, Any] = {}
    if cutoff:
        rev_query["at"] = {"$gte": cutoff}
    revenue_events = [r async for r in db.demo_revenue_events.find(rev_query, {"_id": 0})]

    # ---- Leads (hot leads = half-view completes OR completed sessions) ----
    # We count "hot_leads" by unique recipient_email on sessions that hit >=50%.
    # ---- Per-demo rollup ----
    demo_keys = set(DEMO_REGISTRY.keys())
    for s in sessions:
        if s.get("demo_type"):
            demo_keys.add(s["demo_type"])
    for r in revenue_events:
        if r.get("source_demo"):
            demo_keys.add(r["source_demo"])

    rows = []
    for key in sorted(demo_keys):
        reg = DEMO_REGISTRY.get(key, {"label": key.title(), "industry": "Other"})
        demo_sessions_list = [s for s in sessions if s.get("demo_type") == key]
        unique_visitors = len({s.get("ip") for s in demo_sessions_list if s.get("ip")})
        completion_pcts = [s.get("progress_pct", 0) for s in demo_sessions_list]
        avg_completion = round(sum(completion_pcts) / len(completion_pcts), 1) if completion_pcts else 0.0
        hot_leads_set = {
            s.get("recipient_email") for s in demo_sessions_list
            if (s.get("half_view_notified") or s.get("completed")) and s.get("recipient_email")
        }
        # Events
        def _count_events(evtype: str) -> int:
            c = 0
            for s in demo_sessions_list:
                for ev in s.get("events", []) or []:
                    if ev.get("type") == evtype:
                        c += 1
            return c
        cta_clicks        = _count_events("cta_click") + _count_events("cta_clicked")
        meetings_booked   = _count_events("meeting_booked")
        enterprise_reqs   = _count_events("enterprise_request")
        saved_sessions    = _count_events("demo_saved")
        resumed_sessions  = _count_events("demo_resumed")

        rev = [r for r in revenue_events if r.get("source_demo") == key]
        subs_started = sum(1 for r in rev if r.get("kind") == "subscription_started")
        revenue      = round(sum(float(r.get("amount") or 0) for r in rev), 2)
        mrr          = round(sum(float(r.get("mrr_created") or 0) for r in rev), 2)
        plans_sold   = sorted({r.get("plan_key") for r in rev if r.get("plan_key")})
        views        = len(demo_sessions_list)
        conv_rate    = round((subs_started / views) * 100, 2) if views else 0.0

        rows.append({
            "demo_key": key,
            "demo_name": reg["label"],
            "industry": reg["industry"],
            "views": views,
            "unique_visitors": unique_visitors,
            "avg_completion_pct": avg_completion,
            "saved_sessions": saved_sessions,
            "resumed_sessions": resumed_sessions,
            "cta_clicks": cta_clicks,
            "meetings_booked": meetings_booked,
            "enterprise_requests": enterprise_reqs,
            "hot_leads": len(hot_leads_set),
            "subscriptions": subs_started,
            "plans_selected": plans_sold,
            "revenue": revenue,
            "mrr": mrr,
            "conversion_rate": conv_rate,
        })

    # ---- Top lists ----
    def _top(rows_in, key_fn, n=5):
        return sorted(rows_in, key=key_fn, reverse=True)[:n]
    top_subs   = _top(rows, lambda r: r["subscriptions"])
    top_rev    = _top(rows, lambda r: r["revenue"])
    top_ent    = _top(rows, lambda r: r["enterprise_requests"])
    top_conv   = _top([r for r in rows if r["views"] > 0], lambda r: r["conversion_rate"])

    # ---- Activity feed (latest 60 across sessions + events + revenue) ----
    feed = []
    for s in sessions:
        feed.append({
            "at": s.get("started_at"),
            "kind": "demo_viewed",
            "demo": s.get("demo_type"),
            "who": s.get("recipient_email") or s.get("recipient_name"),
            "meta": {"progress_pct": s.get("progress_pct")},
        })
        if s.get("completed"):
            feed.append({
                "at": s.get("completed_at") or s.get("last_heartbeat_at"),
                "kind": "demo_completed",
                "demo": s.get("demo_type"),
                "who": s.get("recipient_email") or s.get("recipient_name"),
                "meta": {"watch_seconds": s.get("watch_seconds")},
            })
        for ev in (s.get("events", []) or []):
            t = ev.get("type") or ""
            if t in ("cta_click", "cta_clicked", "meeting_booked",
                     "enterprise_request", "demo_saved", "demo_resumed",
                     "share_click", "share_send"):
                feed.append({
                    "at": ev.get("at"),
                    "kind": t,
                    "demo": s.get("demo_type"),
                    "who": s.get("recipient_email") or s.get("recipient_name"),
                    "meta": ev.get("metadata") or {},
                })
    for r in revenue_events:
        feed.append({
            "at": r.get("at"),
            "kind": r.get("kind") or "subscription_started",
            "demo": r.get("source_demo") or "direct",
            "who": r.get("email") or r.get("company"),
            "meta": {
                "amount": r.get("amount"),
                "plan_key": r.get("plan_key"),
                "mrr": r.get("mrr_created"),
            },
        })
    feed = [f for f in feed if f.get("at")]
    feed.sort(key=lambda f: f["at"], reverse=True)
    feed = feed[:60]

    total_revenue = round(sum(r["revenue"] for r in rows), 2)
    total_mrr     = round(sum(r["mrr"] for r in rows), 2)
    total_subs    = sum(r["subscriptions"] for r in rows)
    total_views   = sum(r["views"] for r in rows)

    return {
        "range": range,
        "range_cutoff_iso": cutoff,
        "summary": {
            "total_views": total_views,
            "total_hot_leads": sum(r["hot_leads"] for r in rows),
            "total_meetings": sum(r["meetings_booked"] for r in rows),
            "total_enterprise_requests": sum(r["enterprise_requests"] for r in rows),
            "total_subscriptions": total_subs,
            "total_revenue": total_revenue,
            "total_mrr": total_mrr,
        },
        "rows": rows,
        "top": {
            "by_subscriptions":      top_subs,
            "by_revenue":            top_rev,
            "by_enterprise_requests": top_ent,
            "by_conversion_rate":    top_conv,
        },
        "activity": feed,
    }


app.include_router(api_router)
app.include_router(make_lighting_router(db, verify_admin=verify_admin), prefix="/api")


# ---------------------------------------------------------------------------
# Legacy route aliases — stale browser caches from before the `/lighting/*`
# refactor were calling these prefix-less paths and producing 404 spam in
# production logs (GET /api/stats, /api/skus, /api/portfolio, /api/warranty-events).
# Permanent-redirect them to their new homes so any user with a stale bundle
# keeps working without a hard-refresh. These alias routes are harmless once
# every browser has rebuilt against the current frontend. We attach them
# directly to `app` (not `api_router`) because api_router was already
# included above.
# ---------------------------------------------------------------------------
from fastapi.responses import RedirectResponse as _RR

@app.get("/api/stats", include_in_schema=False)
async def _legacy_stats():
    return _RR(url="/api/lighting/stats", status_code=308)

@app.get("/api/skus", include_in_schema=False)
async def _legacy_skus():
    return _RR(url="/api/lighting/skus", status_code=308)

@app.get("/api/portfolio", include_in_schema=False)
async def _legacy_portfolio(request: Request):
    query = ("?" + str(request.url.query)) if request.url.query else ""
    return _RR(url=f"/api/lighting/portfolio{query}", status_code=308)

@app.get("/api/warranty-events", include_in_schema=False)
async def _legacy_warranty_events(request: Request):
    query = ("?" + str(request.url.query)) if request.url.query else ""
    return _RR(url=f"/api/lighting/warranty-events{query}", status_code=308)




class _OpsEmailAdapter:
    """Thin wrapper so ops_center can send emails via the existing Resend
    service without coupling to its async signature."""
    @staticmethod
    def send(to: str, subject: str, html: str):
        try:
            from email_service import _send  # type: ignore
            import asyncio
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(_send(to, subject, html))
            finally:
                loop.close()
        except Exception:
            return False

app.include_router(make_ops_router(db, email_service=_OpsEmailAdapter), prefix="/api")


# ---------- CORS ----------
# Explicitly allow the production domains + any additional origins injected via
# CORS_ORIGINS env var. "*" is used as a safety fallback so a misconfigured
# deployment doesn't silently block traffic — but allow_credentials=True means
# browsers will actually reject "*" on credentialed requests, so the explicit
# list below is what takes effect in production.
_DEFAULT_ALLOWED_ORIGINS = [
    "https://creatorboostai.com",
    "https://www.creatorboostai.com",
    "https://bodyiq-ai.com",
    "https://www.bodyiq-ai.com",
]
_env_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
_allowed_origins = list(dict.fromkeys(_DEFAULT_ALLOWED_ORIGINS + _env_origins))
# Also allow any *.emergentagent.com / *.preview.emergentagent.com preview host
# and any *.creatorboostai.com / *.bodyiq-ai.com sub-domain dynamically.
_origin_regex = (
    r"https://"
    r"(.*\.(creatorboostai\.com|bodyiq-ai\.com|emergentagent\.com|emergent\.host))"
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allowed_origins,
    allow_origin_regex=_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
logging.getLogger(__name__).warning(
    f"[CORS] explicit_origins={_allowed_origins} regex={_origin_regex!r}"
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def _startup_warmup():
    """Best-effort: fire the domain warmup email on boot if the Resend key is
    present and we haven't already recorded a warmup in the last 24h."""
    try:
        result = await _run_warmup(trigger="startup", force=False)
        logging.getLogger(__name__).info(f"[WARMUP STARTUP] {result.get('reason') or 'sent'}")
    except Exception as e:
        logging.getLogger(__name__).error(f"[WARMUP STARTUP FAIL] {e!r}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
