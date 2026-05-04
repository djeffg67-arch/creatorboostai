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
    channel: str = Field(default="email", description="email | sms")
    phone: Optional[str] = None  # required if channel == sms
    device_id: Optional[str] = None


class OtpVerify(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str
    email: EmailStr
    code: str
    device_id: Optional[str] = None
    device_label: Optional[str] = None
    remember_device: bool = True


class AdminUserUpsert(OpsAuth):
    """Founder-only: add or update an approved user record."""
    target_email: EmailStr
    target_name: Optional[str] = None
    target_phone: Optional[str] = None
    target_role: str = Field(description="founder | executive | employee")
    active: bool = True


class AdminUserAction(OpsAuth):
    target_email: EmailStr


class AdminLoginAttemptsQuery(OpsAuth):
    limit: int = Field(default=50, ge=1, le=500)
    outcome: Optional[str] = None  # success | failed | delivery_failed


class LogoutRequest(OpsAuth):
    everywhere: bool = True  # rotate token (kills all sessions on all devices)


class DemoRevenueRequest(OpsAuth):
    range: str = Field(default="30d", description="today | 7d | 30d | all")


class DemoSavesGeoRequest(OpsAuth):
    range: str = Field(default="30d", description="today | 7d | 30d | all")


class AccessLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    origin_url: Optional[str] = None


class AccessLinkConsume(BaseModel):
    model_config = ConfigDict(extra="forbid")
    magic_token: str = Field(min_length=16, max_length=128)


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


def _mask_destination(destination: str, channel: str) -> str:
    """Mask email/phone for UI display so we confirm the channel without
    echoing the full PII back to the client."""
    if channel == "email" and "@" in destination:
        name, _, domain = destination.partition("@")
        if len(name) <= 2:
            masked_name = name[:1] + "*"
        else:
            masked_name = name[:2] + "***"
        return f"{masked_name}@{domain}"
    # SMS — keep country code + last 4, mask the middle
    digits_only = "".join(c for c in destination if c.isdigit() or c == "+")
    if len(digits_only) >= 6:
        return digits_only[:3] + "***" + digits_only[-4:]
    return "***"


FOUNDER_EMAIL = os.environ.get("FOUNDER_EMAIL", "jeffrey@creatorboostai.com").strip().lower()
FOUNDER_NAME = os.environ.get("FOUNDER_NAME", "Jeffrey").strip()
FOUNDER_PHONE = os.environ.get("FOUNDER_PHONE", "").strip()
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
        set_doc: Dict[str, Any] = {
            "email": FOUNDER_EMAIL,
            "name": FOUNDER_NAME,
            "role": ROLE_FOUNDER,
            "portal_token": portal_token,
            "source": "founder_bypass",
            "active": True,
            "updated_at": now,
        }
        if FOUNDER_PHONE:
            set_doc["phone"] = FOUNDER_PHONE
        await db.users.update_one(
            {"email": FOUNDER_EMAIL},
            {"$set": set_doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
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
    # OTP — email or SMS; truthful delivery status
    # Trusted-device list lets known devices skip OTP next time.
    # ------------------------------------------------------------------
    OTP_TTL_SEC = 600
    OTP_RESEND_COOLDOWN_SEC = 30

    async def _check_trusted_device(email: str, device_id: Optional[str]) -> bool:
        if not device_id:
            return False
        user = await db.users.find_one(
            {"email": email, "trusted_devices.device_id": device_id}, {"_id": 0}
        )
        return user is not None

    async def _log_login_attempt(*, email: str, role: Optional[str], channel: str,
                                  outcome: str, detail: Optional[str] = None,
                                  delivery_ok: Optional[bool] = None,
                                  provider_id: Optional[str] = None,
                                  ip: Optional[str] = None) -> None:
        """Append-only audit log. Founder sees this via /api/ops/admin/login-attempts."""
        try:
            await db.ops_login_attempts.insert_one({
                "id": str(uuid.uuid4()),
                "email": email,
                "role": role,
                "channel": channel,          # email | sms
                "outcome": outcome,          # sent | delivery_failed | user_not_found | role_mismatch | inactive | invalid_code | expired | verified | rate_limited | trusted_device
                "detail": detail,
                "delivery_ok": delivery_ok,
                "provider_id": provider_id,  # Resend email id or Twilio SID if available
                "ip": ip,
                "created_at": _now_iso(),
            })
        except Exception:
            pass  # Logging must never break flows

    @router.post("/otp/request")
    async def otp_request(payload: OtpRequest):
        channel = (payload.channel or "email").lower()
        if payload.role not in (ROLE_FOUNDER, ROLE_EXECUTIVE, ROLE_EMPLOYEE):
            raise HTTPException(status_code=400, detail="role must be founder | executive | employee")
        if channel not in ("email", "sms"):
            raise HTTPException(status_code=400, detail="channel must be email or sms")

        user = await db.users.find_one({"email": payload.email}, {"_id": 0})

        # Role / existence / active gate. We keep the user-facing message generic
        # to prevent enumeration but log the true outcome server-side.
        generic_failure = {
            "sent": False,
            "trusted_device": False,
            "channel": channel,
            "delivery_ok": False,
            "message": "If that email is on file for this role, a code is on its way.",
        }
        if not user:
            await _log_login_attempt(email=payload.email, role=payload.role, channel=channel, outcome="user_not_found")
            return generic_failure
        if user.get("role") != payload.role:
            await _log_login_attempt(email=payload.email, role=payload.role, channel=channel, outcome="role_mismatch")
            return generic_failure
        if user.get("active") is False:
            await _log_login_attempt(email=payload.email, role=payload.role, channel=channel, outcome="inactive")
            return generic_failure

        # Trusted device shortcut
        trusted = await _check_trusted_device(payload.email, payload.device_id)
        if trusted:
            await _log_login_attempt(email=payload.email, role=payload.role, channel=channel,
                                     outcome="trusted_device", delivery_ok=True)
            return {"sent": False, "trusted_device": True, "channel": channel,
                    "delivery_ok": True, "token": user["portal_token"],
                    "role": user["role"], "redirect": "/portal/ops"}

        # Cooldown — check the newest existing OTP row
        existing = await db.ops_otps.find_one({"email": payload.email, "role": payload.role}, {"_id": 0})
        if existing and not existing.get("consumed"):
            try:
                last = datetime.fromisoformat(existing["created_at"])
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                delta = (datetime.now(timezone.utc) - last).total_seconds()
                if delta < OTP_RESEND_COOLDOWN_SEC:
                    retry_after = int(OTP_RESEND_COOLDOWN_SEC - delta)
                    await _log_login_attempt(email=payload.email, role=payload.role,
                                             channel=channel, outcome="rate_limited")
                    return {
                        "sent": False, "trusted_device": False, "channel": channel,
                        "delivery_ok": False,
                        "retry_after_sec": retry_after,
                        "message": f"Please wait {retry_after}s before requesting another code.",
                    }
            except Exception:
                pass

        # Mint a fresh 6-digit code
        code = "".join(secrets.choice("0123456789") for _ in range(6))
        now = datetime.now(timezone.utc)
        await db.ops_otps.update_one(
            {"email": payload.email, "role": payload.role},
            {"$set": {
                "code": code,
                "expires_at": now.timestamp() + OTP_TTL_SEC,
                "device_id": payload.device_id,
                "channel": channel,
                "created_at": now.isoformat(),
                "consumed": False,
                "attempts": 0,
            }},
            upsert=True,
        )

        # Channel-specific delivery
        delivery_ok = False
        delivery_detail: Optional[str] = None
        provider_id: Optional[str] = None
        destination: str = ""

        if channel == "email":
            destination = payload.email
            try:
                from email_service import send_otp_code, email_delivery_available
            except Exception:
                send_otp_code = None

                def email_delivery_available():
                    return False
            if not email_delivery_available():
                delivery_detail = "Email delivery not configured yet. Please try SMS or contact support."
            else:
                try:
                    delivery_ok = await send_otp_code(
                        to_email=payload.email, code=code, role=payload.role, expires_min=10
                    )
                    delivery_detail = None if delivery_ok else "We could not deliver the email code."
                except Exception as exc:
                    delivery_ok = False
                    delivery_detail = f"Email delivery error: {str(exc)[:140]}"
        else:  # sms
            from sms_service import send_otp_sms, normalize_phone, sms_configured
            phone_on_file = user.get("phone")
            requested_phone = normalize_phone(payload.phone or "")
            # Require an SMS-enabled user and the entered phone to match the one on file.
            if not phone_on_file:
                delivery_detail = "No phone number on file for this account. Please use email or contact admin."
            elif requested_phone and normalize_phone(phone_on_file) != requested_phone:
                delivery_detail = "That phone number does not match the one on file."
            elif not sms_configured():
                delivery_detail = "SMS delivery not configured yet. Please try email or contact support."
            else:
                destination = phone_on_file
                result = await send_otp_sms(to_phone=phone_on_file, code=code, role=payload.role)
                delivery_ok = bool(result.get("ok"))
                provider_id = result.get("sid")
                if not delivery_ok:
                    delivery_detail = result.get("error") or "Unable to deliver SMS."

        # Mask destination for the UI (never echo full email or phone)
        masked_destination = _mask_destination(destination, channel) if destination else None

        outcome = "sent" if delivery_ok else "delivery_failed"
        await _log_login_attempt(
            email=payload.email, role=payload.role, channel=channel, outcome=outcome,
            detail=delivery_detail, delivery_ok=delivery_ok, provider_id=provider_id,
        )

        response: Dict[str, Any] = {
            "sent": delivery_ok,
            "trusted_device": False,
            "channel": channel,
            "delivery_ok": delivery_ok,
            "destination_masked": masked_destination,
            "expires_in_sec": OTP_TTL_SEC,
            "resend_cooldown_sec": OTP_RESEND_COOLDOWN_SEC,
            "message": (
                f"Code sent via {channel.upper()} — check your "
                + ("inbox" if channel == "email" else "texts") + "."
                if delivery_ok else (delivery_detail or "We could not deliver the code.")
            ),
        }
        # Dev-mode echo ONLY when explicitly enabled and delivery failed so founders
        # can still log in during setup. Never returned when delivery succeeded.
        if (not delivery_ok
                and os.environ.get("OTP_DEV_RETURN_CODE", "false").lower() == "true"):
            response["dev_code"] = code
        return response

    @router.post("/otp/verify")
    async def otp_verify(payload: OtpVerify):
        rec = await db.ops_otps.find_one(
            {"email": payload.email, "role": payload.role}, {"_id": 0}
        )
        if not rec or rec.get("consumed"):
            await _log_login_attempt(email=payload.email, role=payload.role,
                                     channel=rec.get("channel", "email") if rec else "email",
                                     outcome="expired", detail="no active code")
            raise HTTPException(status_code=400, detail="No active code — request a new one")
        if rec.get("expires_at", 0) < datetime.now(timezone.utc).timestamp():
            await _log_login_attempt(email=payload.email, role=payload.role,
                                     channel=rec.get("channel", "email"),
                                     outcome="expired", detail="code expired")
            raise HTTPException(status_code=400, detail="Code expired — request a new one")
        # Hard cap 5 wrong attempts per issued code
        if rec.get("attempts", 0) >= 5:
            await db.ops_otps.update_one(
                {"email": payload.email, "role": payload.role},
                {"$set": {"consumed": True, "consumed_at": _now_iso(), "locked_out": True}},
            )
            await _log_login_attempt(email=payload.email, role=payload.role,
                                     channel=rec.get("channel", "email"),
                                     outcome="invalid_code", detail="max attempts exceeded")
            raise HTTPException(status_code=429, detail="Too many attempts — request a new code")
        if not secrets.compare_digest(str(rec.get("code", "")), str(payload.code)):
            await db.ops_otps.update_one(
                {"email": payload.email, "role": payload.role},
                {"$inc": {"attempts": 1}},
            )
            remaining = max(0, 5 - (rec.get("attempts", 0) + 1))
            await _log_login_attempt(email=payload.email, role=payload.role,
                                     channel=rec.get("channel", "email"),
                                     outcome="invalid_code",
                                     detail=f"attempts_left={remaining}")
            raise HTTPException(status_code=401, detail=f"Invalid code ({remaining} tries left)")
        await db.ops_otps.update_one(
            {"email": payload.email, "role": payload.role},
            {"$set": {"consumed": True, "consumed_at": _now_iso()}},
        )
        user = await db.users.find_one({"email": payload.email}, {"_id": 0})
        if not user or user.get("role") != payload.role:
            await _log_login_attempt(email=payload.email, role=payload.role,
                                     channel=rec.get("channel", "email"),
                                     outcome="role_mismatch")
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
        # Success — log it
        await _log_login_attempt(
            email=user["email"], role=user["role"],
            channel=rec.get("channel", "email"),
            outcome="verified", delivery_ok=True,
        )
        return {"email": user["email"], "name": user.get("name"), "role": user["role"],
                "token": user["portal_token"], "redirect": "/portal/ops"}

    # After successful OTP verify, log it
    async def _log_verified(email: str, role: str, channel: str) -> None:
        await _log_login_attempt(email=email, role=role, channel=channel,
                                 outcome="verified", delivery_ok=True)

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
    # Self-serve Access-Link recovery
    # ------------------------------------------------------------------
    # Buyers / founders / executives / employees who lose their original
    # access email can enter their email on /team-access and receive a fresh
    # one-time magic link. The link is short-lived (15 min) and single-use;
    # when consumed it returns the correct role's portal session so the user
    # lands back on /portal/ops with the correct RBAC scopes.
    #
    # Security guarantees:
    #   - Generic 200 response regardless of whether the email exists
    #   - One active outstanding token per email (new request invalidates prior)
    #   - 60s cooldown per email (rate-limited silently — still returns 200)
    #   - Tokens expire in 15 min and can only be consumed once
    #   - Role is looked up server-side from `users.role` — never trusted from client
    #   - Every request is logged to `ops_access_link_requests`
    ACCESS_LINK_TTL_SEC = 900  # 15 minutes
    ACCESS_LINK_COOLDOWN_SEC = 60
    _ACCESS_LINK_GENERIC_RESPONSE = {
        "ok": True,
        "message": "If that email is registered, a fresh access link is on the way.",
    }

    async def _log_access_link_request(email: str, role: Optional[str], status: str, ip: Optional[str] = None) -> None:
        try:
            await db.ops_access_link_requests.insert_one({
                "id": str(uuid.uuid4()),
                "email": email,
                "role": role,
                "status": status,  # sent | rate_limited | unknown_email | unsupported_role
                "ip": ip,
                "created_at": _now_iso(),
            })
        except Exception:
            # Logging failures never break the flow
            pass

    @router.post("/access-link/request")
    async def access_link_request(payload: AccessLinkRequest):
        email = payload.email.lower().strip()
        now = datetime.now(timezone.utc)

        # Rate-limit: look up the most recent request for this email
        recent = await db.ops_access_link_requests.find_one(
            {"email": email}, {"_id": 0}, sort=[("created_at", -1)]
        )
        if recent:
            try:
                last = datetime.fromisoformat(recent["created_at"])
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                if (now - last).total_seconds() < ACCESS_LINK_COOLDOWN_SEC:
                    await _log_access_link_request(email, None, "rate_limited")
                    return _ACCESS_LINK_GENERIC_RESPONSE
            except Exception:
                pass

        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            await _log_access_link_request(email, None, "unknown_email")
            return _ACCESS_LINK_GENERIC_RESPONSE
        role = user.get("role")
        if role not in (ROLE_FOUNDER, ROLE_EXECUTIVE, ROLE_EMPLOYEE):
            await _log_access_link_request(email, role, "unsupported_role")
            return _ACCESS_LINK_GENERIC_RESPONSE

        # Invalidate any prior unused tokens for this email (defensive;
        # prevents accumulation of live tokens if a user clicks repeatedly
        # after the cooldown lapses).
        await db.ops_access_link_tokens.update_many(
            {"email": email, "used": False},
            {"$set": {"used": True, "invalidated_at": _now_iso(), "invalidation_reason": "superseded"}},
        )

        magic_token = secrets.token_urlsafe(32)
        expires_at = (now.timestamp() + ACCESS_LINK_TTL_SEC)
        await db.ops_access_link_tokens.insert_one({
            "id": str(uuid.uuid4()),
            "magic_token": magic_token,
            "email": email,
            "role": role,
            "expires_at": expires_at,
            "used": False,
            "created_at": now.isoformat(),
        })

        origin = (payload.origin_url or os.environ.get("SITE_URL") or "").rstrip("/")
        from urllib.parse import urlencode
        magic_url = f"{origin}/team-access?{urlencode({'magic': magic_token})}"

        if email_service is not None:
            role_label = {
                ROLE_FOUNDER: "Founder",
                ROLE_EXECUTIVE: "Executive",
                ROLE_EMPLOYEE: "Employee",
            }.get(role, "Team Member")
            html = (
                f"<p>You asked for a fresh CreatorBoostAI access link.</p>"
                f"<p>Click to sign in to your <strong>{role_label}</strong> dashboard — "
                f"this link expires in 15 minutes and can only be used once:</p>"
                f"<p style='margin:22px 0;'>"
                f"<a href='{magic_url}' "
                f"style='display:inline-block;background:#06B6D4;color:#0A0F1C;"
                f"padding:12px 22px;text-decoration:none;border-radius:6px;"
                f"font-weight:600;font-size:14px;'>Open dashboard →</a>"
                f"</p>"
                f"<p style='font-size:12px;color:#94A3B8;'>"
                f"Didn't request this? You can ignore this email — no changes were made to your account."
                f"</p>"
            )
            try:
                email_service.send(
                    to=email,
                    subject="Your CreatorBoostAI access link",
                    html=html,
                )
            except Exception:
                # Never raise — delivery failure must not leak through the generic response
                pass

        await _log_access_link_request(email, role, "sent")
        return _ACCESS_LINK_GENERIC_RESPONSE

    @router.post("/access-link/consume")
    async def access_link_consume(payload: AccessLinkConsume):
        rec = await db.ops_access_link_tokens.find_one(
            {"magic_token": payload.magic_token}, {"_id": 0}
        )
        if not rec:
            raise HTTPException(status_code=404, detail="Access link not found")
        if rec.get("used"):
            raise HTTPException(status_code=410, detail="Access link already used")
        if rec.get("expires_at", 0) < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=410, detail="Access link expired")

        user = await db.users.find_one({"email": rec["email"]}, {"_id": 0})
        if not user:
            # User deleted between request + consume — treat as gone
            await db.ops_access_link_tokens.update_one(
                {"magic_token": payload.magic_token},
                {"$set": {"used": True, "consumed_at": _now_iso(), "consumption_outcome": "user_missing"}},
            )
            raise HTTPException(status_code=404, detail="Account not found")

        role = user.get("role")
        if role not in (ROLE_FOUNDER, ROLE_EXECUTIVE, ROLE_EMPLOYEE):
            await db.ops_access_link_tokens.update_one(
                {"magic_token": payload.magic_token},
                {"$set": {"used": True, "consumed_at": _now_iso(), "consumption_outcome": "role_changed"}},
            )
            raise HTTPException(status_code=403, detail="Account role no longer supports operating-center access")

        # Mark token consumed (single-use)
        await db.ops_access_link_tokens.update_one(
            {"magic_token": payload.magic_token},
            {"$set": {"used": True, "consumed_at": _now_iso(), "consumption_outcome": "success"}},
        )
        return {
            "email": user["email"],
            "name": user.get("name"),
            "role": role,
            "token": user["portal_token"],
            "redirect": "/portal/ops",
        }

    # ------------------------------------------------------------------
    # Founder-only admin CRUD (approved users + login attempts audit log)
    # ------------------------------------------------------------------
    @router.post("/admin/users/list")
    async def admin_users_list(payload: OpsAuth):
        await _require_founder(payload)
        cursor = db.users.find(
            {"role": {"$in": [ROLE_FOUNDER, ROLE_EXECUTIVE, ROLE_EMPLOYEE]}},
            {"_id": 0, "portal_token": 0, "trusted_devices": 0}
        ).sort("created_at", -1)
        rows = await cursor.to_list(500)
        # Enrich with trusted device count (separate query keeps projection safe)
        out = []
        for r in rows:
            td_count = await db.users.count_documents({
                "email": r["email"], "trusted_devices.0": {"$exists": True}
            })
            out.append({
                **r,
                "active": r.get("active", True),
                "trusted_device_count": td_count,
            })
        return {"users": out, "total": len(out)}

    @router.post("/admin/users/upsert")
    async def admin_users_upsert(payload: AdminUserUpsert):
        user = await _require_founder(payload)
        if payload.target_role not in (ROLE_FOUNDER, ROLE_EXECUTIVE, ROLE_EMPLOYEE):
            raise HTTPException(status_code=400, detail="Invalid role")
        from sms_service import normalize_phone
        normalized_phone = normalize_phone(payload.target_phone or "") if payload.target_phone else None
        if payload.target_phone and not normalized_phone:
            raise HTTPException(status_code=400, detail="Phone must be in valid E.164 format (e.g. +16162145861)")
        now = _now_iso()
        target_email = payload.target_email.lower().strip()
        existing = await db.users.find_one({"email": target_email}, {"_id": 0})
        portal_token = (existing or {}).get("portal_token") or secrets.token_urlsafe(32)
        set_doc: Dict[str, Any] = {
            "email": target_email,
            "name": payload.target_name or (existing or {}).get("name") or target_email.split("@")[0],
            "role": payload.target_role,
            "portal_token": portal_token,
            "active": payload.active,
            "source": "admin_upsert",
            "updated_at": now,
            "updated_by": user["email"],
        }
        if normalized_phone:
            set_doc["phone"] = normalized_phone
        await db.users.update_one(
            {"email": target_email},
            {"$set": set_doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
            upsert=True,
        )
        await db.ops_admin_audit.insert_one({
            "id": str(uuid.uuid4()),
            "actor_email": user["email"],
            "action": "user_upsert",
            "target_email": target_email,
            "fields": {k: v for k, v in set_doc.items() if k != "portal_token"},
            "created_at": now,
        })
        return {"ok": True, "email": target_email, "role": payload.target_role, "active": payload.active}

    @router.post("/admin/users/deactivate")
    async def admin_users_deactivate(payload: AdminUserAction):
        user = await _require_founder(payload)
        target_email = payload.target_email.lower().strip()
        if target_email == FOUNDER_EMAIL:
            raise HTTPException(status_code=400, detail="Cannot deactivate the founder account")
        existing = await db.users.find_one({"email": target_email}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        await db.users.update_one(
            {"email": target_email},
            {"$set": {"active": False, "updated_at": _now_iso(),
                      "deactivated_by": user["email"]},
             "$unset": {"trusted_devices": ""}},
        )
        await db.ops_admin_audit.insert_one({
            "id": str(uuid.uuid4()),
            "actor_email": user["email"],
            "action": "user_deactivate",
            "target_email": target_email,
            "created_at": _now_iso(),
        })
        return {"ok": True, "email": target_email, "active": False}

    @router.post("/admin/users/reset-access")
    async def admin_users_reset_access(payload: AdminUserAction):
        """Rotate the user's portal_token and clear all trusted devices.
        Forces them to OTP-verify on their next sign-in from every device."""
        user = await _require_founder(payload)
        target_email = payload.target_email.lower().strip()
        existing = await db.users.find_one({"email": target_email}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        new_token = secrets.token_urlsafe(32)
        await db.users.update_one(
            {"email": target_email},
            {"$set": {"portal_token": new_token, "trusted_devices": [],
                      "updated_at": _now_iso(), "access_reset_by": user["email"]}},
        )
        # Also invalidate any outstanding access-link magic tokens
        await db.ops_access_link_tokens.update_many(
            {"email": target_email, "used": False},
            {"$set": {"used": True, "invalidated_at": _now_iso(),
                      "invalidation_reason": "admin_reset"}},
        )
        await db.ops_admin_audit.insert_one({
            "id": str(uuid.uuid4()),
            "actor_email": user["email"],
            "action": "user_reset_access",
            "target_email": target_email,
            "created_at": _now_iso(),
        })
        return {"ok": True, "email": target_email}

    @router.post("/admin/login-attempts")
    async def admin_login_attempts(payload: AdminLoginAttemptsQuery):
        await _require_founder(payload)
        q: Dict[str, Any] = {}
        if payload.outcome:
            q["outcome"] = payload.outcome
        cursor = db.ops_login_attempts.find(q, {"_id": 0}).sort("created_at", -1).limit(payload.limit)
        rows = await cursor.to_list(payload.limit)
        # Aggregate counters for the header tiles
        totals = {"total": 0, "verified": 0, "delivery_failed": 0, "invalid_code": 0, "rate_limited": 0}
        pipeline = [{"$group": {"_id": "$outcome", "count": {"$sum": 1}}}]
        agg = await db.ops_login_attempts.aggregate(pipeline).to_list(20)
        for a in agg:
            totals["total"] += a["count"]
            key = a["_id"]
            if key in totals:
                totals[key] = a["count"]
        return {"attempts": rows, "totals": totals}

    @router.post("/admin/delivery-status")
    async def admin_delivery_status(payload: OpsAuth):
        """Founder-only: returns the current Resend/Twilio configuration state
        so the admin UI can display green/red pills next to each provider."""
        await _require_founder(payload)
        from email_service import email_delivery_available, SENDER_EMAIL as _SENDER, SENDER_NAME as _SENDER_NAME
        from sms_service import sms_configured
        return {
            "email": {
                "configured": email_delivery_available(),
                "provider": "Resend",
                "sender": _SENDER,
                "sender_name": _SENDER_NAME,
            },
            "sms": {
                "configured": sms_configured(),
                "provider": "Twilio",
                "from_number": os.environ.get("TWILIO_FROM_NUMBER", ""),
            },
        }

    # ------------------------------------------------------------------
    # Demo-to-Revenue analytics — founder-only dashboard endpoint.
    # Mirror of /api/admin/demo-revenue but auth'd by ops portal token
    # so the founder UI doesn't need a separate ADMIN_PASSWORD login.
    # ------------------------------------------------------------------
    @router.post("/demo-saves-geo")
    async def demo_saves_geo(payload: DemoSavesGeoRequest):
        """Founder heat-map — aggregate saved demos by city + country.

        Clusters rows that share a lat/lon (±0.5° bucket) so a city with 10
        saves gets one larger marker instead of 10 stacked pins. Skips saves
        with no geo (rows from private IPs / failed lookups).
        """
        await _require_founder(payload)
        from datetime import datetime, timezone, timedelta

        now = datetime.now(timezone.utc)
        if payload.range == "today":
            cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif payload.range == "7d":
            cutoff = (now - timedelta(days=7)).isoformat()
        elif payload.range == "30d":
            cutoff = (now - timedelta(days=30)).isoformat()
        else:
            cutoff = None

        query: Dict[str, Any] = {"lat": {"$ne": None}}
        if cutoff:
            query["created_at"] = {"$gte": cutoff}
        rows = [s async for s in db.demo_saves.find(query, {"_id": 0})]

        # Bucket by (round(lat/lon to 1 decimal), city) so nearby saves merge
        buckets: Dict[tuple, Dict[str, Any]] = {}
        by_country: Dict[str, int] = {}
        for r in rows:
            lat = r.get("lat")
            lon = r.get("lon")
            if lat is None or lon is None:
                continue
            key = (round(float(lat), 1), round(float(lon), 1), r.get("city") or "")
            if key not in buckets:
                buckets[key] = {
                    "lat": round(float(lat), 4),
                    "lon": round(float(lon), 4),
                    "city": r.get("city"),
                    "region": r.get("region"),
                    "country_code": r.get("country_code"),
                    "count": 0,
                    "demos": {},
                }
            buckets[key]["count"] += 1
            dt = r.get("demo_type") or "other"
            buckets[key]["demos"][dt] = buckets[key]["demos"].get(dt, 0) + 1
            cc = r.get("country_code")
            if cc:
                by_country[cc] = by_country.get(cc, 0) + 1

        markers = sorted(buckets.values(), key=lambda m: m["count"], reverse=True)
        top_countries = sorted(
            [{"country_code": cc, "count": n} for cc, n in by_country.items()],
            key=lambda x: x["count"], reverse=True,
        )[:10]

        return {
            "range": payload.range,
            "total_with_geo": len(rows),
            "markers": markers,
            "top_countries": top_countries,
        }

    # ------------------------------------------------------------------
    @router.post("/demo-revenue")
    async def demo_revenue(payload: DemoRevenueRequest):
        await _require_founder(payload)
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        if payload.range == "today":
            cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif payload.range == "7d":
            cutoff = (now - timedelta(days=7)).isoformat()
        elif payload.range == "30d":
            cutoff = (now - timedelta(days=30)).isoformat()
        else:
            cutoff = None

        sess_query: Dict[str, Any] = {}
        if cutoff:
            sess_query["started_at"] = {"$gte": cutoff}
        sessions = [s async for s in db.demo_sessions.find(sess_query, {"_id": 0})]

        rev_query: Dict[str, Any] = {}
        if cutoff:
            rev_query["at"] = {"$gte": cutoff}
        revenue_events = [r async for r in db.demo_revenue_events.find(rev_query, {"_id": 0})]

        DEMO_REGISTRY = {
            "realtor":     {"label": "Real Estate", "industry": "Real Estate"},
            "insurance":   {"label": "Insurance",   "industry": "Insurance"},
            "supermarket": {"label": "Retail",      "industry": "Retail"},
            "creator":     {"label": "Influencer",  "industry": "Influencer"},
            "noldus":      {"label": "Enterprise",  "industry": "Enterprise"},
            "airport":     {"label": "Airport Demo", "industry": "Enterprise / Airport"},
            "sita":        {"label": "Airport Demo", "industry": "Enterprise / Airport"},
            "general":     {"label": "General",     "industry": "General"},
        }
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

            def _count_events(evtype, sl=demo_sessions_list):
                c = 0
                for s in sl:
                    for ev in s.get("events", []) or []:
                        if ev.get("type") == evtype:
                            c += 1
                return c
            cta_clicks       = _count_events("cta_click") + _count_events("cta_clicked")
            meetings_booked  = _count_events("meeting_booked")
            enterprise_reqs  = _count_events("enterprise_request")
            saved_sessions   = _count_events("demo_saved")
            resumed_sessions = _count_events("demo_resumed")

            rev = [r for r in revenue_events if r.get("source_demo") == key]
            subs_started = sum(1 for r in rev if r.get("kind") == "subscription_started")
            revenue      = round(sum(float(r.get("amount") or 0) for r in rev), 2)
            mrr          = round(sum(float(r.get("mrr_created") or 0) for r in rev), 2)
            plans_sold   = sorted({r.get("plan_key") for r in rev if r.get("plan_key")})
            views        = len(demo_sessions_list)
            conv_rate    = round((subs_started / views) * 100, 2) if views else 0.0

            rows.append({
                "demo_key": key, "demo_name": reg["label"], "industry": reg["industry"],
                "views": views, "unique_visitors": unique_visitors,
                "avg_completion_pct": avg_completion,
                "saved_sessions": saved_sessions, "resumed_sessions": resumed_sessions,
                "cta_clicks": cta_clicks, "meetings_booked": meetings_booked,
                "enterprise_requests": enterprise_reqs, "hot_leads": len(hot_leads_set),
                "subscriptions": subs_started, "plans_selected": plans_sold,
                "revenue": revenue, "mrr": mrr, "conversion_rate": conv_rate,
            })

        def _top(rows_in, key_fn, n=5):
            return sorted(rows_in, key=key_fn, reverse=True)[:n]
        top_subs = _top(rows, lambda r: r["subscriptions"])
        top_rev  = _top(rows, lambda r: r["revenue"])
        top_ent  = _top(rows, lambda r: r["enterprise_requests"])
        top_conv = _top([r for r in rows if r["views"] > 0], lambda r: r["conversion_rate"])

        feed = []
        for s in sessions:
            feed.append({
                "at": s.get("started_at"), "kind": "demo_viewed",
                "demo": s.get("demo_type"),
                "who": s.get("recipient_email") or s.get("recipient_name"),
                "meta": {"progress_pct": s.get("progress_pct")},
            })
            if s.get("completed"):
                feed.append({
                    "at": s.get("completed_at") or s.get("last_heartbeat_at"),
                    "kind": "demo_completed", "demo": s.get("demo_type"),
                    "who": s.get("recipient_email") or s.get("recipient_name"),
                    "meta": {"watch_seconds": s.get("watch_seconds")},
                })
            for ev in (s.get("events", []) or []):
                t = ev.get("type") or ""
                if t in ("cta_click", "cta_clicked", "meeting_booked",
                         "enterprise_request", "demo_saved", "demo_resumed",
                         "share_click", "share_send"):
                    feed.append({
                        "at": ev.get("at"), "kind": t, "demo": s.get("demo_type"),
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
                    "amount": r.get("amount"), "plan_key": r.get("plan_key"),
                    "mrr": r.get("mrr_created"),
                },
            })
        feed = [f for f in feed if f.get("at")]
        feed.sort(key=lambda f: f["at"], reverse=True)
        feed = feed[:60]

        return {
            "range": payload.range,
            "range_cutoff_iso": cutoff,
            "summary": {
                "total_views":              sum(r["views"] for r in rows),
                "total_hot_leads":          sum(r["hot_leads"] for r in rows),
                "total_meetings":           sum(r["meetings_booked"] for r in rows),
                "total_enterprise_requests": sum(r["enterprise_requests"] for r in rows),
                "total_subscriptions":      sum(r["subscriptions"] for r in rows),
                "total_revenue":            round(sum(r["revenue"] for r in rows), 2),
                "total_mrr":                round(sum(r["mrr"] for r in rows), 2),
            },
            "rows": rows,
            "top": {
                "by_subscriptions":       top_subs,
                "by_revenue":             top_rev,
                "by_enterprise_requests": top_ent,
                "by_conversion_rate":     top_conv,
            },
            "activity": feed,
        }

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

        # --- CRM leads (manually created via /leads endpoints) ---
        crm_total = await db.ops_leads.count_documents(scope)
        by_status: Dict[str, int] = {}
        for s in LEAD_STATUSES:
            by_status[s] = await db.ops_leads.count_documents({**scope, "status": s})
        won = by_status.get("won", 0)
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

        # --- Outbound engine activity (founders + president see it; EMs see 0) ---
        ob_total = ob_new = ob_contacted = ob_qualified = ob_demo_sent = 0
        ob_sent_today = 0
        ob_captured = 0
        demo_views_total = 0
        demo_captures_total = 0
        demo_conversion_rate = 0.0
        if user["role"] in ELEVATED_ROLES:
            ob_total      = await db.outbound_prospects.count_documents({"source": {"$ne": "internal_archived"}})
            ob_new        = await db.outbound_prospects.count_documents({"status": {"$in": ["new", "scored"]}, "source": {"$ne": "internal_archived"}})
            ob_contacted  = await db.outbound_prospects.count_documents({"status": "contacted", "source": {"$ne": "internal_archived"}})
            ob_qualified  = await db.outbound_prospects.count_documents({"status": {"$in": ["replied_positive", "qualified"]}, "source": {"$ne": "internal_archived"}})
            # demos sent by the engine = prospects with demo_sent_at populated
            # (FU2 demo-link injection + initial teaser for score≥70 prospects).
            ob_demo_sent  = await db.outbound_prospects.count_documents({"demo_sent_at": {"$ne": None}, "source": {"$ne": "internal_archived"}})
            # Demo conversion analytics (Inbound demo lead capture)
            ob_captured = await db.outbound_prospects.count_documents({"source": "demo_capture"})
            demo_views_total = await db.demo_page_views.count_documents({})
            demo_captures_total = await db.demo_captures.count_documents({})
            demo_conversion_rate = (
                round(min(100.0, (demo_captures_total / demo_views_total) * 100), 2) if demo_views_total else 0.0
            )
            # today's outbound sends
            from datetime import datetime as _dt, timezone as _tz
            today_key = _dt.now(_tz.utc).strftime("%Y-%m-%d")
            ob_sent_today = await db.outbound_events.count_documents({"type": "sent", "day_key": today_key})

        # Blended status counts (CRM + outbound) so the dashboard reflects
        # all business activity, not just the manual CRM pipeline.
        blended_by_status = dict(by_status)
        blended_by_status["new"]         = by_status.get("new", 0) + ob_new
        blended_by_status["contacted"]   = by_status.get("contacted", 0) + ob_contacted
        blended_by_status["qualified"]   = by_status.get("qualified", 0) + ob_qualified
        blended_by_status["demo_sent"]   = by_status.get("demo_sent", 0) + ob_demo_sent

        # --- Automation status panel (Jeffrey's spec) ---
        last_lead = await db.outbound_prospects.find_one(
            {"source": {"$ne": "internal_archived"}},
            {"_id": 0, "business_name": 1, "email": 1, "source": 1, "created_at": 1},
            sort=[("created_at", -1)],
        )
        last_sent_ev = await db.outbound_events.find_one(
            {"type": "sent"}, {"_id": 0, "prospect_id": 1, "subject": 1, "simulated": 1, "created_at": 1},
            sort=[("created_at", -1)],
        )
        last_sent_prospect = None
        if last_sent_ev:
            last_sent_prospect = await db.outbound_prospects.find_one(
                {"id": last_sent_ev.get("prospect_id")},
                {"_id": 0, "business_name": 1, "email": 1},
            )
        last_demo = await db.outbound_prospects.find_one(
            {"demo_sent_at": {"$ne": None}, "source": {"$ne": "internal_archived"}},
            {"_id": 0, "business_name": 1, "target_segment": 1, "demo_label": 1, "demo_sent_at": 1},
            sort=[("demo_sent_at", -1)],
        )
        last_run = await db.outbound_autopilot_runs.find_one(
            {}, {"_id": 0, "started_at": 1, "status": 1},
            sort=[("started_at", -1)],
        )
        ob_state = await db.outbound_campaign_state.find_one({}, {"_id": 0})
        recent_errors = await db.outbound_events.find(
            {"type": {"$in": ["send_failed", "skipped_suppressed"]}},
            {"_id": 0, "type": 1, "prospect_id": 1, "created_at": 1},
        ).sort("created_at", -1).to_list(5)

        # Deliverability snapshot (last 7 days) for spam-protection status
        from datetime import datetime as _dt, timezone as _tz, timedelta as _td
        since = (_dt.now(_tz.utc) - _td(days=7)).isoformat()
        sent_7d = await db.outbound_events.count_documents({"type": "sent", "created_at": {"$gte": since}})
        bounced_7d = await db.outbound_events.count_documents({"type": "bounced", "created_at": {"$gte": since}})
        bounce_rate = (bounced_7d / sent_7d) if sent_7d else 0.0
        spam_risk = "high" if bounce_rate >= 0.05 else "medium" if bounce_rate >= 0.02 else "low"

        return {
            "role": user["role"],
            "scope_email": None if user["role"] in ELEVATED_ROLES else user["email"],
            # Blended metrics (CRM + outbound)
            "leads_total": crm_total + ob_total,
            "leads_won": won,
            "leads_by_status": blended_by_status,
            "pipeline_value_usd": round(pipeline, 2),
            "won_value_usd": round(won_value, 2),
            "outreach_sent": outreach_sent + (await db.outbound_events.count_documents({"type": "sent"}) if user["role"] in ELEVATED_ROLES else 0),
            "demos_sent": demos_sent + ob_demo_sent,
            "win_rate_pct": round((won / max(1, crm_total + ob_total) * 100), 1),
            # Breakdown — lets the UI distinguish manual CRM from engine-generated
            "crm_leads_total": crm_total,
            "outbound_prospects_total": ob_total,
            # Inbound demo capture metrics (Jeffrey's soft-gate spec)
            "inbound_demo_leads": ob_captured,
            "demo_views_total": demo_views_total,
            "demo_captures_total": demo_captures_total,
            "demo_conversion_rate": demo_conversion_rate,
            # Automation status panel
            "automation": {
                "engine_paused": bool((ob_state or {}).get("paused")),
                "daily_limit": int((ob_state or {}).get("daily_limit", 10)),
                "sent_today": ob_sent_today,
                "last_lead": last_lead,
                "last_email_sent": {
                    "business_name": (last_sent_prospect or {}).get("business_name"),
                    "email": (last_sent_prospect or {}).get("email"),
                    "subject": (last_sent_ev or {}).get("subject"),
                    "simulated": bool((last_sent_ev or {}).get("simulated")),
                    "at": (last_sent_ev or {}).get("created_at"),
                } if last_sent_ev else None,
                "last_demo_sent": last_demo,
                "last_autopilot_run": last_run,
                "next_scheduled_run": (ob_state or {}).get("next_scheduled_at"),
                "spam_risk": spam_risk,
                "bounce_rate_7d": round(bounce_rate * 100, 2),
                "recent_errors": recent_errors,
            },
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
