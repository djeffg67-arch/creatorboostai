from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
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

# ---------- Stripe ----------
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

# ---------- Email ----------
from email_service import (
    send_lead_welcome, send_contact_ack, send_training_confirmation, send_forensic_confirmation
)

# ---------- TTS ----------
from tts_service import generate_or_cache as tts_generate, ALLOWED_VOICES, DEFAULT_VOICE

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
    "forensic_library": {
        "name": "Forensic Visual Library",
        "amount": 59.00,
        "currency": "usd",
        "type": "library",
        "description": "Forensic Visual Library — lifetime access",
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
    "cb_starter_monthly": {
        "name": "CreatorBoostAI Starter", "tier": "starter", "interval": "month",
        "amount": 49.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_STARTER_MONTHLY",
    },
    "cb_starter_annual":  {
        "name": "CreatorBoostAI Starter", "tier": "starter", "interval": "year",
        "amount": 490.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_STARTER_ANNUAL",
    },
    "cb_pro_monthly":     {
        "name": "CreatorBoostAI Pro",     "tier": "pro",     "interval": "month",
        "amount": 149.00, "currency": "usd",
        "price_id_env": "STRIPE_PRICE_CB_PRO_MONTHLY",
    },
    "cb_pro_annual":      {
        "name": "CreatorBoostAI Pro",     "tier": "pro",     "interval": "year",
        "amount": 1490.00, "currency": "usd",
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


class SubscriptionCheckoutCreate(BaseModel):
    plan_key: str
    origin_url: str
    email: Optional[EmailStr] = None


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
VALID_SOURCES = {"demo", "demo_training", "training", "contact", "newsletter", "forensic_library", "home"}


@api_router.get("/")
async def root():
    return {"service": "BodyIQ-AI", "status": "online"}


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
async def list_transactions(_: str = Depends(verify_admin)):
    docs = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
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
    }
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


@api_router.get("/admin/subscriptions")
async def admin_list_subscriptions(_: str = Depends(verify_admin)):
    """Admin: list all CreatorBoostAI subscription rows (active + canceled)."""
    docs = await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
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
    success_url = f"{origin}/thank-you?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/training" if product["type"] == "training" else f"{origin}/forensic-library"

    stripe_checkout = _stripe_client(http_request)

    metadata = {
        "product_key": payload.product_key,
        "product_name": product["name"],
        "product_type": product["type"],
        "source": "web_checkout",
    }
    if payload.email:
        metadata["customer_email_hint"] = payload.email

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
    success_url = f"{origin}/portal?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"

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
    await _trigger_post_purchase_email(txn)
    await _grant_access_for_txn(txn)
    # If subscription, also seed/refresh the subscriptions collection
    if txn.get("subscription") or txn.get("product_key") in SUBSCRIPTIONS:
        await _upsert_subscription_record_from_txn(txn)


async def _upsert_subscription_record_from_txn(txn: Dict[str, Any]) -> None:
    """Seed the `subscriptions` collection on initial checkout.session.completed."""
    email = txn.get("email")
    plan_key = txn.get("product_key")
    if not email or plan_key not in SUBSCRIPTIONS:
        return
    plan = SUBSCRIPTIONS[plan_key]
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.subscriptions.update_one(
        {"email": email, "plan_key": plan_key},
        {"$set": {
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
        },
         "$setOnInsert": {
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


app.include_router(api_router)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
