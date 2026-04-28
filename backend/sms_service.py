"""Twilio SMS service with truthful delivery status.

Unlike email_service (which returns bool), this module returns a structured
result so callers can surface the real delivery outcome to the user:
    {"ok": bool, "sid": str|None, "error": str|None, "configured": bool}

If TWILIO_* env vars are empty we return configured=False, ok=False with an
error the frontend can display verbatim. Never raises.
"""
from __future__ import annotations

import os
import asyncio
import logging
import re
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "").strip()

E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def sms_configured() -> bool:
    return bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER)


def normalize_phone(raw: str) -> Optional[str]:
    """Normalize to E.164. Accepts US 10-digit bare numbers (assumes +1),
    strips parentheses/dashes/spaces, validates format."""
    if not raw:
        return None
    cleaned = re.sub(r"[^\d+]", "", raw.strip())
    if not cleaned:
        return None
    if not cleaned.startswith("+"):
        # Assume US if 10 digits
        if len(cleaned) == 10:
            cleaned = "+1" + cleaned
        elif len(cleaned) == 11 and cleaned.startswith("1"):
            cleaned = "+" + cleaned
        else:
            cleaned = "+" + cleaned
    if not E164.match(cleaned):
        return None
    return cleaned


def _build_body(code: str, role: str) -> str:
    role_label = {"founder": "Founder", "executive": "Executive", "employee": "Team"}.get(role, "Team")
    return (
        f"BodyIQ-AI {role_label} access code: {code}\n"
        f"Expires in 10 min. Never share this code. Reply STOP to opt out."
    )


def _send_sync(to: str, body: str) -> Dict[str, Any]:
    """Blocking Twilio send; wrapped via asyncio.to_thread by the async caller."""
    try:
        from twilio.rest import Client  # lazy import — only when actually sending
        from twilio.base.exceptions import TwilioRestException
    except ImportError as exc:
        return {"ok": False, "sid": None, "error": f"twilio SDK not installed: {exc}", "configured": False}

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg = client.messages.create(to=to, from_=TWILIO_FROM_NUMBER, body=body)
        return {"ok": True, "sid": msg.sid, "error": None, "configured": True}
    except TwilioRestException as exc:
        # Extract the Twilio error code + message for truthful UI feedback
        code = getattr(exc, "code", None)
        msg = getattr(exc, "msg", None) or str(exc)
        label = "Unable to deliver SMS"
        if code in (21211, 21614):  # invalid number
            label = "That phone number is invalid or unreachable"
        elif code == 21610:  # opted out
            label = "This number has opted out of SMS from us"
        elif code == 20003:  # auth
            label = "SMS service authentication failed"
        logger.error(f"Twilio send failed to={to} code={code} msg={msg}")
        return {"ok": False, "sid": None, "error": f"{label} ({code})", "configured": True}
    except Exception as exc:
        logger.error(f"Twilio send exception to={to}: {exc}")
        return {"ok": False, "sid": None, "error": f"SMS delivery error: {str(exc)[:120]}", "configured": True}


async def send_otp_sms(*, to_phone: str, code: str, role: str) -> Dict[str, Any]:
    """Send a 6-digit OTP via SMS. Returns a structured delivery result —
    never raises. Always includes `configured` so the caller can distinguish
    misconfiguration from a real send attempt that failed."""
    if not sms_configured():
        return {
            "ok": False,
            "sid": None,
            "error": "SMS delivery is not configured yet — please use email instead.",
            "configured": False,
        }
    normalized = normalize_phone(to_phone)
    if not normalized:
        return {
            "ok": False,
            "sid": None,
            "error": "Please enter a valid phone number (e.g. +16162145861).",
            "configured": True,
        }
    body = _build_body(code, role)
    return await asyncio.to_thread(_send_sync, normalized, body)
