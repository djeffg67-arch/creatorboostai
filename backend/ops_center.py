"""
CreatorBoostAI Operating Center
================================

Role-based CRM + outreach + demo-link + AI assistant + performance dashboard.

Roles (enforced server-side):
    founder    — full access; bypasses subscription; can invite employees,
                 see every lead and every employee's performance, rotate keys
    executive  — elevated access for the company President (Erin Flanigan):
                 sees all leads + all employees' performance, can reassign,
                 can run outreach/AI/demos — BUT no backend key/settings
                 controls, no tenant deletion, no founder-only surfaces.
    employee   — scoped to leads assigned to them + their own performance.

Every endpoint returns ONLY what the caller's role is allowed to see.
"""
from __future__ import annotations

import os
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# --------------------------------------------------------------------------
# Role constants
# --------------------------------------------------------------------------
ROLE_FOUNDER = "founder"
ROLE_EXECUTIVE = "executive"
ROLE_EMPLOYEE = "employee"
ELEVATED_ROLES = {ROLE_FOUNDER, ROLE_EXECUTIVE}

LEAD_STATUSES = ["new", "contacted", "qualified", "demo_sent", "proposal", "won", "lost"]


# --------------------------------------------------------------------------
# Pydantic models (module-scope so FastAPI body parsing works)
# --------------------------------------------------------------------------
class OpsAuth(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    token: str


class FounderAccessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    key: str


class ExecutiveAccessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    key: str


class EmployeeInvite(OpsAuth):
    invitee_email: EmailStr
    invitee_name: Optional[str] = None


class EmployeeAcceptInvite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invite_token: str


class OtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str = Field(description="founder | executive | employee")
    email: EmailStr
    device_id: Optional[str] = None


class OtpVerify(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str
    email: EmailStr
    code: str
    device_id: Optional[str] = None
    device_label: Optional[str] = None
    remember_device: bool = True


class LogoutRequest(OpsAuth):
    everywhere: bool = True  # rotate token (kills all sessions on all devices)


class LeadCreate(OpsAuth):
    # Caller auth fields (email, token) are inherited from OpsAuth.
    # These are the new LEAD's contact fields — renamed to avoid
    # field-name collisions with the auth payload.
    contact_name: str
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_email: Optional[EmailStr] = None  # elevated roles only
    value_usd: Optional[float] = Field(default=None, ge=0)


class LeadUpdateStatus(OpsAuth):
    lead_id: str
    status: str


class LeadAddNote(OpsAuth):
    lead_id: str
    note: str


class LeadAddTask(OpsAuth):
    lead_id: str
    task: str
    due_at: Optional[str] = None


class LeadReassign(OpsAuth):
    lead_id: str
    assigned_to_email: EmailStr


class OutreachSend(OpsAuth):
    lead_id: Optional[str] = None
    to_email: EmailStr
    subject: str
    body: str


class DemoLinkCreate(OpsAuth):
    lead_id: Optional[str] = None
    demo_type: str = Field(description="realtor | insurance | creator | noldus | supermarket")
    recipient_email: Optional[EmailStr] = None
    recipient_name: Optional[str] = None
    company: Optional[str] = None


class AIChat(OpsAuth):
    session_id: str
    message: str


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _make_magic_token() -> str:
    return secrets.token_urlsafe(24)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


FOUNDER_EMAIL = "jeffrey@creatorboostai.com"
EXECUTIVE_EMAIL = "erin@creatorboostai.com"
EXECUTIVE_NAME = "Erin Flanigan"


# --------------------------------------------------------------------------
# Router factory
# --------------------------------------------------------------------------
def make_router(db, email_service=None) -> APIRouter:
    router = APIRouter(prefix="/ops", tags=["ops"])

    async def _load_user(email: str, token: str) -> Dict[str, Any]:
        user = await db.users.find_one(
            {"email": email, "portal_token": token}, {"_id": 0}
        )
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or token")
        return user

    async def _require_auth(payload: OpsAuth) -> Dict[str, Any]:
        user = await _load_user(payload.email, payload.token)
        if user.get("role") not in (ROLE_FOUNDER, ROLE_EXECUTIVE, ROLE_EMPLOYEE):
            raise HTTPException(status_code=403, detail="Role not authorized for operating center")
        return user

    async def _require_elevated(payload: OpsAuth) -> Dict[str, Any]:
        user = await _require_auth(payload)
        if user.get("role") not in ELEVATED_ROLES:
            raise HTTPException(status_code=403, detail="Elevated role required")
        return user

    async def _require_founder(payload: OpsAuth) -> Dict[str, Any]:
        user = await _require_auth(payload)
        if user.get("role") != ROLE_FOUNDER:
            raise HTTPException(status_code=403, detail="Founder role required")
        return user

    def _scope_for(user: Dict[str, Any]) -> Dict[str, Any]:
        """Mongo filter that scopes visibility: employees see only their assigned
        leads; elevated roles see everything."""
        if user.get("role") in ELEVATED_ROLES:
            return {}
        return {"assigned_to_email": user["email"]}

    def _strip(u: Dict[str, Any]) -> Dict[str, Any]:
        """Frontend-safe user projection."""
        return {
            "email": u.get("email"),
            "name": u.get("name"),
            "role": u.get("role"),
            "scopes": {
                "can_see_all_leads": u.get("role") in ELEVATED_ROLES,
                "can_invite_employees": u.get("role") == ROLE_FOUNDER,
                "can_reassign_leads": u.get("role") in ELEVATED_ROLES,
                "can_see_financials": u.get("role") == ROLE_FOUNDER,
                "can_see_settings": u.get("role") == ROLE_FOUNDER,
                "can_see_all_employees": u.get("role") in ELEVATED_ROLES,
            },
        }

    # ------------------------------------------------------------------
    # Access links (magic-link auth)
    # ------------------------------------------------------------------
    @router.post("/founder-access")
    async def founder_access(payload: FounderAccessRequest):
        key = os.environ.get("FOUNDER_KEY", "")
        if not key or not secrets.compare_digest(payload.key, key):
            raise HTTPException(status_code=401, detail="Invalid founder key")
        now = _now_iso()
        existing = await db.users.find_one({"email": FOUNDER_EMAIL}, {"_id": 0})
        portal_token = (existing or {}).get("portal_token") or secrets.token_urlsafe(32)
        await db.users.update_one(
            {"email": FOUNDER_EMAIL},
            {"$set": {
                "email": FOUNDER_EMAIL,
                "name": "Jeffrey",
                "role": ROLE_FOUNDER,
                "portal_token": portal_token,
                "source": "founder_bypass",
                "updated_at": now,
            }, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
            upsert=True,
        )
        return {"email": FOUNDER_EMAIL, "token": portal_token, "role": ROLE_FOUNDER, "redirect": "/portal/ops"}

    @router.post("/executive-access")
    async def executive_access(payload: ExecutiveAccessRequest):
        key = os.environ.get("EXECUTIVE_KEY", "")
        if not key or not secrets.compare_digest(payload.key, key):
            raise HTTPException(status_code=401, detail="Invalid executive key")
        now = _now_iso()
        existing = await db.users.find_one({"email": EXECUTIVE_EMAIL}, {"_id": 0})
        portal_token = (existing or {}).get("portal_token") or secrets.token_urlsafe(32)
        await db.users.update_one(
            {"email": EXECUTIVE_EMAIL},
            {"$set": {
                "email": EXECUTIVE_EMAIL,
                "name": EXECUTIVE_NAME,
                "title": "President",
                "role": ROLE_EXECUTIVE,
                "portal_token": portal_token,
                "source": "executive_bypass",
                "updated_at": now,
            }, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
            upsert=True,
        )
        return {"email": EXECUTIVE_EMAIL, "name": EXECUTIVE_NAME, "token": portal_token, "role": ROLE_EXECUTIVE, "redirect": "/portal/ops"}

    @router.post("/employee-accept-invite")
    async def employee_accept_invite(payload: EmployeeAcceptInvite):
        invite = await db.ops_invites.find_one({"invite_token": payload.invite_token, "status": "pending"}, {"_id": 0})
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found or already used")
        now = _now_iso()
        email = invite["invitee_email"]
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        portal_token = (existing or {}).get("portal_token") or secrets.token_urlsafe(32)
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "email": email,
                "name": invite.get("invitee_name") or email.split("@")[0],
                "role": ROLE_EMPLOYEE,
                "portal_token": portal_token,
                "invited_by": invite["inviter_email"],
                "source": "employee_invite",
                "updated_at": now,
            }, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
            upsert=True,
        )
        await db.ops_invites.update_one({"invite_token": payload.invite_token}, {"$set": {"status": "accepted", "accepted_at": now}})
        return {"email": email, "token": portal_token, "role": ROLE_EMPLOYEE, "redirect": "/portal/ops"}

    @router.post("/me")
    async def me(payload: OpsAuth):
        user = await _require_auth(payload)
        return _strip(user)

    # ------------------------------------------------------------------
    # OTP (email-based; Twilio SMS auto-used if TWILIO_* env vars present)
    # Trusted-device list lets known devices skip OTP next time.
    # ------------------------------------------------------------------
    OTP_TTL_SEC = 600

    async def _check_trusted_device(email: str, device_id: Optional[str]) -> bool:
        if not device_id:
            return False
        user = await db.users.find_one(
            {"email": email, "trusted_devices.device_id": device_id}, {"_id": 0}
        )
        return user is not None

    @router.post("/otp/request")
    async def otp_request(payload: OtpRequest):
        if payload.role not in (ROLE_FOUNDER, ROLE_EXECUTIVE, ROLE_EMPLOYEE):
            raise HTTPException(status_code=400, detail="role must be founder | executive | employee")
        # Look up user — must already exist (created by founder/exec key or invite)
        user = await db.users.find_one({"email": payload.email}, {"_id": 0})
        if not user or user.get("role") != payload.role:
            # Don't leak which exists; pretend we sent
            return {"sent": True, "trusted_device": False, "delivery": "stub"}
        # Trusted device shortcut
        trusted = await _check_trusted_device(payload.email, payload.device_id)
        if trusted:
            return {"sent": False, "trusted_device": True, "token": user["portal_token"], "role": user["role"], "redirect": "/portal/ops"}
        code = "".join(secrets.choice("0123456789") for _ in range(6))
        now = datetime.now(timezone.utc)
        expires = now.timestamp() + OTP_TTL_SEC
        await db.ops_otps.update_one(
            {"email": payload.email, "role": payload.role},
            {"$set": {"code": code, "expires_at": expires, "device_id": payload.device_id,
                      "created_at": now.isoformat(), "consumed": False}},
            upsert=True,
        )
        delivery = {"email": "queued", "sms": "skipped"}
        if email_service is not None:
            try:
                email_service.send(
                    to=payload.email,
                    subject=f"Your CreatorBoostAI verification code: {code}",
                    html=f"<p>Your CreatorBoostAI verification code is <strong style='font-size:24px;letter-spacing:4px'>{code}</strong>.</p><p>It expires in 10 minutes.</p>",
                )
                delivery["email"] = "sent"
            except Exception as exc:
                delivery["email"] = f"failed:{str(exc)[:80]}"
        # SMS via Twilio — only if env vars set and user has phone on record
        twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
        twilio_from = os.environ.get("TWILIO_FROM_NUMBER")
        phone = user.get("phone")
        if twilio_sid and twilio_token and twilio_from and phone:
            try:
                from twilio.rest import Client  # lazy import
                client = Client(twilio_sid, twilio_token)
                client.messages.create(to=phone, from_=twilio_from,
                                       body=f"CreatorBoostAI code: {code} (expires in 10 min)")
                delivery["sms"] = "sent"
            except Exception as exc:
                delivery["sms"] = f"failed:{str(exc)[:80]}"
        # Dev-mode return so the founder can still log in without a live key
        dev_response = {"sent": True, "trusted_device": False, "delivery": delivery}
        if os.environ.get("OTP_DEV_RETURN_CODE", "true").lower() == "true":
            dev_response["dev_code"] = code  # remove in prod by setting env to "false"
        return dev_response

    @router.post("/otp/verify")
    async def otp_verify(payload: OtpVerify):
        rec = await db.ops_otps.find_one(
            {"email": payload.email, "role": payload.role}, {"_id": 0}
        )
        if not rec or rec.get("consumed"):
            raise HTTPException(status_code=400, detail="No active code — request a new one")
        if rec.get("expires_at", 0) < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=400, detail="Code expired — request a new one")
        if not secrets.compare_digest(str(rec.get("code", "")), str(payload.code)):
            raise HTTPException(status_code=401, detail="Invalid code")
        await db.ops_otps.update_one(
            {"email": payload.email, "role": payload.role},
            {"$set": {"consumed": True, "consumed_at": _now_iso()}},
        )
        user = await db.users.find_one({"email": payload.email}, {"_id": 0})
        if not user or user.get("role") != payload.role:
            raise HTTPException(status_code=404, detail="User not found")
        # Trust this device
        if payload.remember_device and payload.device_id:
            await db.users.update_one(
                {"email": payload.email},
                {"$pull": {"trusted_devices": {"device_id": payload.device_id}}},
            )
            await db.users.update_one(
                {"email": payload.email},
                {"$push": {"trusted_devices": {
                    "device_id": payload.device_id,
                    "label": payload.device_label or "this device",
                    "trusted_at": _now_iso(),
                }}},
            )
        return {"email": user["email"], "name": user.get("name"), "role": user["role"],
                "token": user["portal_token"], "redirect": "/portal/ops"}

    @router.post("/logout")
    async def logout(payload: LogoutRequest):
        user = await _load_user(payload.email, payload.token)
        if payload.everywhere:
            # Rotate token → kills all sessions on all devices
            new_token = secrets.token_urlsafe(32)
            await db.users.update_one(
                {"email": user["email"]},
                {"$set": {"portal_token": new_token, "trusted_devices": []}},
            )
        return {"ok": True, "everywhere": payload.everywhere}

    # ------------------------------------------------------------------
    # Employee management (founder invites; executive + founder can list)
    # ------------------------------------------------------------------
    @router.post("/employees/invite")
    async def invite_employee(payload: EmployeeInvite):
        user = await _require_founder(payload)
        now = _now_iso()
        invite_token = _make_magic_token()
        await db.ops_invites.insert_one({
            "invite_token": invite_token,
            "invitee_email": payload.invitee_email,
            "invitee_name": payload.invitee_name,
            "inviter_email": user["email"],
            "status": "pending",
            "created_at": now,
        })
        # Best-effort email dispatch (Resend) — if no key, we return the link
        invite_url = f"/employee-access?token={invite_token}"
        if email_service is not None:
            try:
                email_service.send(
                    to=payload.invitee_email,
                    subject="You're invited to CreatorBoostAI",
                    html=f"<p>You've been invited as an employee.</p><p><a href='{invite_url}'>Accept invite</a></p>",
                )
            except Exception:
                pass
        return {"invite_token": invite_token, "invite_url": invite_url, "invitee_email": payload.invitee_email}

    @router.post("/employees/list")
    async def list_employees(payload: OpsAuth):
        await _require_elevated(payload)
        cursor = db.users.find({"role": {"$in": [ROLE_EMPLOYEE, ROLE_EXECUTIVE, ROLE_FOUNDER]}},
                               {"_id": 0, "portal_token": 0}).sort("created_at", -1)
        employees = [u async for u in cursor]
        # Attach each one's lead counts
        for e in employees:
            assigned = await db.ops_leads.count_documents({"assigned_to_email": e["email"]})
            won = await db.ops_leads.count_documents({"assigned_to_email": e["email"], "status": "won"})
            e["leads_assigned"] = assigned
            e["leads_won"] = won
        return {"employees": employees}

    # ------------------------------------------------------------------
    # Leads CRUD (scoped by role)
    # ------------------------------------------------------------------
    @router.post("/leads/list")
    async def list_leads(payload: OpsAuth):
        user = await _require_auth(payload)
        q = _scope_for(user)
        cursor = db.ops_leads.find(q, {"_id": 0}).sort("created_at", -1).limit(500)
        return {"leads": [lead async for lead in cursor]}

    @router.post("/leads/create")
    async def create_lead(payload: LeadCreate):
        user = await _require_auth(payload)
        now = _now_iso()
        lead_id = f"LEAD-{uuid.uuid4().hex[:8].upper()}"
        # Employees can only assign to themselves
        assigned = payload.assigned_to_email or user["email"]
        if user["role"] == ROLE_EMPLOYEE and assigned != user["email"]:
            raise HTTPException(status_code=403, detail="Employees can only assign leads to themselves")
        record = {
            "lead_id": lead_id,
            "name": payload.contact_name,
            "email": payload.contact_email,
            "phone": payload.contact_phone,
            "company": payload.company,
            "source": payload.source,
            "status": "new",
            "value_usd": payload.value_usd,
            "assigned_to_email": assigned,
            "created_by_email": user["email"],
            "created_at": now,
            "updated_at": now,
            "notes": [{"text": payload.notes, "by": user["email"], "at": now}] if payload.notes else [],
            "tasks": [],
        }
        await db.ops_leads.insert_one(record)
        return {k: v for k, v in record.items() if k != "_id"}

    @router.post("/leads/status")
    async def update_status(payload: LeadUpdateStatus):
        user = await _require_auth(payload)
        if payload.status not in LEAD_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status (allowed: {LEAD_STATUSES})")
        q = {"lead_id": payload.lead_id}
        if user["role"] == ROLE_EMPLOYEE:
            q["assigned_to_email"] = user["email"]
        result = await db.ops_leads.find_one_and_update(
            q, {"$set": {"status": payload.status, "updated_at": _now_iso()}},
            projection={"_id": 0}, return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Lead not found or not in scope")
        return result

    @router.post("/leads/note")
    async def add_note(payload: LeadAddNote):
        user = await _require_auth(payload)
        q = {"lead_id": payload.lead_id}
        if user["role"] == ROLE_EMPLOYEE:
            q["assigned_to_email"] = user["email"]
        result = await db.ops_leads.find_one_and_update(
            q, {"$push": {"notes": {"text": payload.note, "by": user["email"], "at": _now_iso()}},
                "$set": {"updated_at": _now_iso()}},
            projection={"_id": 0}, return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Lead not found or not in scope")
        return result

    @router.post("/leads/task")
    async def add_task(payload: LeadAddTask):
        user = await _require_auth(payload)
        q = {"lead_id": payload.lead_id}
        if user["role"] == ROLE_EMPLOYEE:
            q["assigned_to_email"] = user["email"]
        task = {"id": uuid.uuid4().hex[:8], "task": payload.task, "due_at": payload.due_at,
                "done": False, "by": user["email"], "at": _now_iso()}
        result = await db.ops_leads.find_one_and_update(
            q, {"$push": {"tasks": task}, "$set": {"updated_at": _now_iso()}},
            projection={"_id": 0}, return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Lead not found or not in scope")
        return result

    @router.post("/leads/reassign")
    async def reassign(payload: LeadReassign):
        await _require_elevated(payload)
        result = await db.ops_leads.find_one_and_update(
            {"lead_id": payload.lead_id},
            {"$set": {"assigned_to_email": payload.assigned_to_email, "updated_at": _now_iso()}},
            projection={"_id": 0}, return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Lead not found")
        return result

    # ------------------------------------------------------------------
    # Outreach (Resend email + log)
    # ------------------------------------------------------------------
    @router.post("/outreach/send")
    async def outreach_send(payload: OutreachSend):
        user = await _require_auth(payload)
        now = _now_iso()
        log_id = f"OUT-{uuid.uuid4().hex[:8].upper()}"
        delivery = {"status": "queued", "provider": "resend", "detail": None}
        if email_service is not None:
            try:
                result = email_service.send(to=payload.to_email, subject=payload.subject, html=f"<p>{payload.body}</p>")
                delivery = {"status": "sent", "provider": "resend", "detail": str(result)[:200] if result else None}
            except Exception as exc:  # graceful fail without key
                delivery = {"status": "failed", "provider": "resend", "detail": str(exc)[:200]}
        record = {
            "outreach_id": log_id,
            "lead_id": payload.lead_id,
            "to_email": payload.to_email,
            "subject": payload.subject,
            "body": payload.body,
            "by_email": user["email"],
            "sent_at": now,
            "delivery": delivery,
        }
        await db.ops_outreach.insert_one(record)
        if payload.lead_id:
            await db.ops_leads.update_one(
                {"lead_id": payload.lead_id},
                {"$set": {"last_contacted_at": now, "updated_at": now,
                          "status_computed": "contacted"}},
            )
        return {k: v for k, v in record.items() if k != "_id"}

    @router.post("/outreach/list")
    async def outreach_list(payload: OpsAuth):
        user = await _require_auth(payload)
        q: Dict[str, Any] = {} if user["role"] in ELEVATED_ROLES else {"by_email": user["email"]}
        cursor = db.ops_outreach.find(q, {"_id": 0}).sort("sent_at", -1).limit(200)
        return {"outreach": [o async for o in cursor]}

    # ------------------------------------------------------------------
    # Demo links (generates a personalized, tracked share URL)
    # ------------------------------------------------------------------
    @router.post("/demo-links/create")
    async def create_demo_link(payload: DemoLinkCreate):
        user = await _require_auth(payload)
        allowed = {"realtor", "insurance", "creator", "noldus", "supermarket"}
        if payload.demo_type not in allowed:
            raise HTTPException(status_code=400, detail=f"demo_type must be one of {sorted(allowed)}")
        share_id = f"CBD-{uuid.uuid4().hex[:10].upper()}"
        now = _now_iso()
        params = []
        if payload.recipient_name:
            params.append(f"name={payload.recipient_name}")
        if payload.company:
            params.append(f"company={payload.company}")
        qs = ("?" + "&".join(params)) if params else ""
        demo_url = f"/demo/{payload.demo_type}{qs}"
        record = {
            "share_id": share_id,
            "demo_type": payload.demo_type,
            "demo_url": demo_url,
            "tracker_url": f"/api/r/{share_id}",
            "lead_id": payload.lead_id,
            "recipient_email": payload.recipient_email,
            "recipient_name": payload.recipient_name,
            "company": payload.company,
            "by_email": user["email"],
            "created_at": now,
            "clicks": 0,
        }
        await db.ops_demo_links.insert_one(record)
        return {k: v for k, v in record.items() if k != "_id"}

    @router.post("/demo-links/list")
    async def list_demo_links(payload: OpsAuth):
        user = await _require_auth(payload)
        q: Dict[str, Any] = {} if user["role"] in ELEVATED_ROLES else {"by_email": user["email"]}
        cursor = db.ops_demo_links.find(q, {"_id": 0}).sort("created_at", -1).limit(200)
        return {"demo_links": [d async for d in cursor]}

    # ------------------------------------------------------------------
    # Performance tiles (rep + team)
    # ------------------------------------------------------------------
    @router.post("/performance")
    async def performance(payload: OpsAuth):
        user = await _require_auth(payload)
        scope = _scope_for(user)

        leads_total = await db.ops_leads.count_documents(scope)
        by_status: Dict[str, int] = {}
        for s in LEAD_STATUSES:
            by_status[s] = await db.ops_leads.count_documents({**scope, "status": s})
        won = by_status.get("won", 0)
        # Pipeline value
        pipeline = 0.0
        won_value = 0.0
        cursor = db.ops_leads.find(scope, {"_id": 0, "value_usd": 1, "status": 1})
        async for lead in cursor:
            v = float(lead.get("value_usd") or 0)
            if lead.get("status") != "lost":
                pipeline += v
            if lead.get("status") == "won":
                won_value += v

        outreach_scope = {} if user["role"] in ELEVATED_ROLES else {"by_email": user["email"]}
        outreach_sent = await db.ops_outreach.count_documents(outreach_scope)

        demo_scope = {} if user["role"] in ELEVATED_ROLES else {"by_email": user["email"]}
        demos_sent = await db.ops_demo_links.count_documents(demo_scope)

        return {
            "role": user["role"],
            "scope_email": None if user["role"] in ELEVATED_ROLES else user["email"],
            "leads_total": leads_total,
            "leads_won": won,
            "leads_by_status": by_status,
            "pipeline_value_usd": round(pipeline, 2),
            "won_value_usd": round(won_value, 2),
            "outreach_sent": outreach_sent,
            "demos_sent": demos_sent,
            "win_rate_pct": round((won / leads_total * 100) if leads_total else 0.0, 1),
        }

    # ------------------------------------------------------------------
    # AI assistant (Claude Sonnet via EMERGENT_LLM_KEY)
    # ------------------------------------------------------------------
    @router.post("/ai/chat")
    async def ai_chat(payload: AIChat):
        user = await _require_auth(payload)
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not llm_key:
            raise HTTPException(status_code=503, detail="AI assistant not configured")
        try:
            # Lazy import so the module never crashes at load time
            from emergentintegrations.llm.chat import LlmChat, UserMessage
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"emergentintegrations unavailable: {exc}")

        role_context = (
            "You are the CreatorBoostAI sales coach. Be concise, actionable, and "
            "grounded in B2B enterprise SaaS selling, lead follow-up, demo pitch "
            "rehearsal, objection handling, and email/outreach copywriting. When "
            "asked to draft an email, output only the email body — no commentary."
        )
        session_id = f"ops-{user['email']}-{payload.session_id}"
        chat = LlmChat(api_key=llm_key, session_id=session_id, system_message=role_context)
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        try:
            reply = await chat.send_message(UserMessage(text=payload.message))
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"AI provider error: {exc}")

        await db.ops_ai_log.insert_one({
            "session_id": session_id, "by_email": user["email"],
            "message": payload.message, "reply": reply, "at": _now_iso(),
        })
        return {"reply": reply, "session_id": session_id}

    return router
