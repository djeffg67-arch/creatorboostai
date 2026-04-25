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
from datetime import datetime, timezone

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


# ---------- Products (public) ----------
@api_router.get("/products")
async def list_products():
    return {
        k: {"name": v["name"], "amount": v["amount"], "currency": v["currency"], "type": v["type"], "description": v["description"]}
        for k, v in PRODUCTS.items()
    }


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
    stripe_checkout = _stripe_client(request)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logging.getLogger(__name__).error(f"Webhook verify failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event.event_type == "checkout.session.completed" and event.session_id:
        txn = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
        if txn:
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "payment_status": event.payment_status,
                    "status": "complete",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            if event.payment_status == "paid":
                txn["payment_status"] = event.payment_status
                await _trigger_post_purchase_email(txn)
    return {"received": True}


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
