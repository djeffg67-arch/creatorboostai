"""Resend email service with graceful degradation.

If RESEND_API_KEY is empty or sending fails, we log and return False without
raising so checkout / lead flows never break because of email issues.
"""
import os
import asyncio
import logging
from typing import Optional, Dict, Any

import resend

logger = logging.getLogger(__name__)

SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
SENDER_NAME = os.environ.get("SENDER_NAME", "BodyIQ-AI")
REPLY_TO_EMAIL = os.environ.get("REPLY_TO_EMAIL", SENDER_EMAIL)
# NOTE: read at module import for the boot banner / SDK init only.
# Every actual send and every `_email_enabled()` call re-reads `os.environ` so
# new keys injected by the deployment platform are picked up without requiring
# a full container restart.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
# If DNS for the branded sender isn't verified yet, set USE_RESEND_TEST_DOMAIN=true
# to temporarily send from onboarding@resend.dev (Resend's pre-verified test domain).
USE_TEST_DOMAIN = os.environ.get("USE_RESEND_TEST_DOMAIN", "false").lower() == "true"
EFFECTIVE_SENDER = "onboarding@resend.dev" if USE_TEST_DOMAIN else SENDER_EMAIL


def _live_resend_key() -> str:
    """Always re-read the env so the running process picks up secrets injected
    after import (e.g. on a hot-redeploy that doesn't fully restart the container)."""
    return os.environ.get("RESEND_API_KEY", "").strip()


if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.warning(
        f"[RESEND ENABLED] sender={EFFECTIVE_SENDER} reply_to={REPLY_TO_EMAIL} "
        f"key_prefix={RESEND_API_KEY[:6]}... key_len={len(RESEND_API_KEY)}"
    )
else:
    logger.warning(
        "[RESEND DISABLED at import] RESEND_API_KEY was empty when backend started — "
        "the live key (if injected later) is re-read on every send."
    )


def _email_enabled() -> bool:
    """True if a Resend key is currently in the live environment.
    Re-reads `os.environ` on every call so deployment-time secret injection
    is picked up without a hard restart."""
    return bool(_live_resend_key())


def email_delivery_available() -> bool:
    """Public helper — same as `_email_enabled()`."""
    return _email_enabled()


async def _send(to: str, subject: str, html: str) -> bool:
    # Re-read the key at request time so a freshly injected secret is picked up
    # without requiring a hard container restart.
    live_key = _live_resend_key()
    if not live_key:
        logger.warning(
            f"[RESEND DISABLED] Would have sent email — RESEND_API_KEY is empty in os.environ. "
            f"to={to} subject={subject!r}"
        )
        return False
    # Always (re)assign the SDK's key — defensive against stale module state.
    resend.api_key = live_key
    # Re-read sender configuration so the deployed env is the source of truth.
    live_sender = (os.environ.get("SENDER_EMAIL") or SENDER_EMAIL).strip()
    live_reply = (os.environ.get("REPLY_TO_EMAIL") or live_sender).strip()
    live_use_test = (os.environ.get("USE_RESEND_TEST_DOMAIN", "false").lower() == "true")
    effective_sender = "onboarding@resend.dev" if live_use_test else live_sender
    params = {
        "from": f"{SENDER_NAME} <{effective_sender}>",
        "to": [to],
        "subject": subject,
        "html": html,
        "reply_to": live_reply,
    }
    logger.info(
        f"[RESEND CALL] from={params['from']} to={to} subject={subject!r} "
        f"key_prefix={live_key[:6]}... key_len={len(live_key)}"
    )
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info(f"[RESEND OK] id={email_id} to={to} subject={subject!r}")
        return True
    except Exception as e:
        logger.error(f"[RESEND FAIL] to={to} subject={subject!r} error={e!r}")
        return False


async def send_raw(to: str, subject: str, html: str) -> bool:
    """Public raw-send helper for ops / internal modules that build their own HTML."""
    return await _send(to, subject, html)


async def send_with_result(to: str, subject: str, html: str) -> Dict[str, Any]:
    """Same as `_send` but returns a structured result so the API route can
    surface the *real* Resend error to the client instead of a generic
    "Email service unavailable" message.

    Return shape:
        {
            "ok": bool,
            "id": str | None,           # Resend message id on success
            "error": str | None,        # human-readable error
            "error_kind": str | None,   # "no_api_key" | "resend_api_error" | "exception"
            "status_code": int | None,  # HTTP status from Resend if available
        }
    """
    live_key = _live_resend_key()
    if not live_key:
        msg = ("RESEND_API_KEY is not present in the live backend environment. "
               "Add it as a deployment secret and redeploy.")
        logger.warning(f"[RESEND DISABLED] send_with_result blocked — {msg}")
        return {"ok": False, "id": None, "error": msg,
                "error_kind": "no_api_key", "status_code": None}

    resend.api_key = live_key
    live_sender = (os.environ.get("SENDER_EMAIL") or SENDER_EMAIL).strip()
    live_reply = (os.environ.get("REPLY_TO_EMAIL") or live_sender).strip()
    live_use_test = (os.environ.get("USE_RESEND_TEST_DOMAIN", "false").lower() == "true")
    effective_sender = "onboarding@resend.dev" if live_use_test else live_sender

    params = {
        "from": f"{SENDER_NAME} <{effective_sender}>",
        "to": [to],
        "subject": subject,
        "html": html,
        "reply_to": live_reply,
    }
    logger.info(
        f"[RESEND CALL] from={params['from']} to={to} subject={subject!r} "
        f"key_prefix={live_key[:6]}... key_len={len(live_key)}"
    )
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        if isinstance(result, dict) and result.get("id"):
            email_id = result["id"]
            logger.info(f"[RESEND OK] id={email_id} to={to} subject={subject!r}")
            return {"ok": True, "id": email_id, "error": None,
                    "error_kind": None, "status_code": 200}
        # Resend returned a dict with an `error` field (older SDKs do this on
        # validation failures instead of raising).
        if isinstance(result, dict) and result.get("error"):
            err_obj = result["error"]
            err_msg = (err_obj.get("message") if isinstance(err_obj, dict)
                       else str(err_obj))
            err_status = (err_obj.get("statusCode") if isinstance(err_obj, dict)
                          else None)
            logger.error(f"[RESEND FAIL] to={to} resend_error={err_msg!r} status={err_status}")
            return {"ok": False, "id": None, "error": err_msg,
                    "error_kind": "resend_api_error", "status_code": err_status}
        # Unknown response shape — surface it as-is so we can debug.
        logger.error(f"[RESEND FAIL] to={to} unexpected_response={result!r}")
        return {"ok": False, "id": None,
                "error": f"Unexpected Resend response: {result!r}",
                "error_kind": "resend_api_error", "status_code": None}
    except Exception as e:
        logger.exception(f"[RESEND FAIL] to={to} subject={subject!r} exception={e!r}")
        return {"ok": False, "id": None, "error": f"{type(e).__name__}: {e}",
                "error_kind": "exception", "status_code": None}


# ---------- Templates ----------

def _wrap(title: str, body_html: str) -> str:
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0F1C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0A0F1C;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#0F172A;border:1px solid rgba(6,182,212,0.2);border-radius:8px;overflow:hidden;">
<tr><td style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
  <div style="display:inline-block;padding:4px 10px;border:1px solid rgba(6,182,212,0.4);border-radius:3px;">
    <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#22D3EE;">BodyIQ-AI · Intelligence System</span>
  </div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 16px 0;color:#F8FAFC;font-size:24px;font-weight:600;letter-spacing:-0.01em;">{title}</h1>
  <div style="color:#CBD5E1;font-size:15px;line-height:1.6;">{body_html}</div>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);background:#0A0F1C;">
  <p style="margin:0;color:#64748B;font-size:12px;">Questions? Just reply to this email.</p>
  <p style="margin:6px 0 0 0;color:#475569;font-size:11px;font-family:'JetBrains Mono',Consolas,monospace;letter-spacing:0.18em;text-transform:uppercase;">– BodyIQ-AI</p>
</td></tr>
</table>
</td></tr></table>
</body></html>"""


async def send_lead_welcome(email: str, source: str) -> bool:
    title = "You're on the list."
    body = """
<p>Thanks for joining.</p>
<p>You're now on the BodyIQ-AI signal list. You'll receive occasional field notes, cohort drops, and case studies — no noise, no spam.</p>
<p>While you wait, explore the guided demo to see the system in action:</p>
<p><a href="https://bodyiq-ai.com/demo" style="display:inline-block;background:#06B6D4;color:#0A0F1C;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Experience the Demo →</a></p>
<p style="margin-top:24px;">Prepare to read what others miss.</p>
"""
    return await _send(email, "Welcome to BodyIQ-AI", _wrap(title, body))


async def send_contact_ack(email: str, name: Optional[str]) -> bool:
    title = "We received your message."
    greet = f"Hi {name}," if name else "Hello,"
    body = f"""
<p>{greet}</p>
<p>Thanks for reaching out to BodyIQ-AI. Your message is in front of our team and we'll respond within 48 hours.</p>
<p>If your request is time-sensitive, reply directly to this email.</p>
"""
    return await _send(email, "We received your message – BodyIQ-AI", _wrap(title, body))


async def send_training_confirmation(email: str, product_name: str) -> bool:
    title = "Your seat is confirmed."
    body = f"""
<p>You are now enrolled in the <strong style="color:#22D3EE;">{product_name}</strong> training program.</p>
<p>Session details, access instructions, and your calendar invite will be sent within 24 hours.</p>
<p>You will be working through real-world signal interpretation, pattern recognition, and strategic execution frameworks in live environments.</p>
<p>If you have any immediate questions, reply directly to this email.</p>
<p style="margin-top:24px;"><strong>Prepare to read what others miss.</strong></p>
"""
    return await _send(email, "Your Seat is Confirmed – BodyIQ-AI", _wrap(title, body))


async def send_forensic_confirmation(email: str) -> bool:
    title = "Forensic Visual Library – Access Confirmed"
    body = """
<p>Thank you for your purchase of the <strong style="color:#22D3EE;">Forensic Visual Library</strong>.</p>
<p>Access instructions will be delivered to this email within the next 24 hours.</p>
<p>As the library expands, you will receive ongoing updates and new annotated frame drops — all included in your lifetime access.</p>
<p>Questions? Reply directly to this email.</p>
"""
    return await _send(email, "Forensic Visual Library – Access Confirmed", _wrap(title, body))


def _build_demo_share_payload(
    *,
    sender_name: str,
    demo_url: str,
    demo_type: str,
    company: Optional[str] = None,
    message: Optional[str] = None,
    kind: str = "demo",
) -> Dict[str, str]:
    """Build the (title, html) for a demo-share email so both the bool and
    structured-result variants render exactly the same email."""
    vertical = "Insurance" if demo_type == "insurance" else "Real Estate"
    is_preview = kind == "preview"
    if is_preview:
        title = f"{sender_name} sent you the CreatorBoostAI Command Center preview"
    else:
        title = f"{sender_name} sent you a CreatorBoostAI {vertical} demo"
    safe_msg = (message or "").strip().replace("<", "&lt;").replace(">", "&gt;")
    msg_block = (
        f'<p style="margin:18px 0;padding:14px 16px;border-left:3px solid #22D3EE;background:#0A0F1C;'
        f'color:#CBD5E1;font-style:italic;">{safe_msg}</p>'
        if safe_msg else ""
    )
    company_line = f' at <strong style="color:#F8FAFC;">{company}</strong>' if company else ""
    if is_preview:
        intro = (
            "I wanted you to see the live operating layer I'm using. "
            "CreatorBoostAI sits on top of your existing systems and executes "
            "across them — pipelines, follow-ups, content, campaigns, monetization."
        )
        cta_label = "Open the Command Center →"
        meta_line = "Read-only preview · sample data · no signup."
    else:
        intro = (
            f"CreatorBoostAI is the execution layer that sits on top of your "
            f"existing {vertical.lower()} stack — CRM, AMS, MLS, marketing, "
            f"communications — and unifies them into one operating system."
        )
        cta_label = f"View the {vertical} Demo →"
        meta_line = "No signup needed. About 13 minutes."
    body = f"""
<p>Hi,</p>
<p><strong style="color:#F8FAFC;">{sender_name}</strong>{company_line} thought you'd want to see this.</p>
<p>{intro}</p>
{msg_block}
<p style="margin-top:22px;">
  <a href="{demo_url}" style="display:inline-block;background:#06B6D4;color:#0A0F1C;padding:14px 22px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">{cta_label}</a>
</p>
<p style="margin-top:18px;font-size:13px;color:#94A3B8;">Or open in your browser: <a href="{demo_url}" style="color:#22D3EE;">{demo_url}</a></p>
<p style="margin-top:24px;font-size:13px;color:#94A3B8;">{meta_line}</p>
"""
    return {"title": title, "html": _wrap(title, body)}


async def send_demo_share(
    *,
    recipient_email: str,
    sender_name: str,
    demo_url: str,
    demo_type: str,
    company: Optional[str] = None,
    message: Optional[str] = None,
    kind: str = "demo",
) -> bool:
    """Bool variant — kept for existing callers that don't surface errors."""
    p = _build_demo_share_payload(
        sender_name=sender_name, demo_url=demo_url, demo_type=demo_type,
        company=company, message=message, kind=kind,
    )
    return await _send(recipient_email, p["title"], p["html"])


async def send_demo_share_with_result(
    *,
    recipient_email: str,
    sender_name: str,
    demo_url: str,
    demo_type: str,
    company: Optional[str] = None,
    message: Optional[str] = None,
    kind: str = "demo",
) -> Dict[str, Any]:
    """Structured variant — surfaces real Resend errors to the API client.
    Same email content as `send_demo_share`."""
    p = _build_demo_share_payload(
        sender_name=sender_name, demo_url=demo_url, demo_type=demo_type,
        company=company, message=message, kind=kind,
    )
    return await send_with_result(recipient_email, p["title"], p["html"])


async def send_welcome_with_access(
    *,
    email: str,
    product_name: str,
    kind: str,  # "one_time" | "subscription"
    portal_magic_url: str,
    portal_token: str,
) -> bool:
    """Post-purchase welcome email that includes the portal magic-link + the
    raw access token as a fallback. Clicking the magic link auto-logs the user
    into /portal. Idempotent — caller should only invoke once per session."""
    if kind == "subscription":
        title = "Your CreatorBoostAI subscription is live."
        lead = (
            "Your subscription to "
            f"<strong style='color:#22D3EE;'>{product_name}</strong> is active. "
            "Use the link below to open your portal — it's bookmarkable and will "
            "keep you signed in."
        )
    else:
        title = "You're in. Access is ready."
        lead = (
            "Your purchase of "
            f"<strong style='color:#22D3EE;'>{product_name}</strong> is confirmed. "
            "Click the button below to open your portal — your entitlements unlock immediately."
        )
    body = f"""
<p>{lead}</p>
<p style="margin-top:22px;">
  <a href="{portal_magic_url}" style="display:inline-block;background:#06B6D4;color:#0A0F1C;padding:14px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
    Open My Portal →
  </a>
</p>
<p style="margin-top:22px;font-size:13px;color:#94A3B8;">
  Prefer manual login? Use this access token on the <a href="{portal_magic_url.split('/portal/magic')[0]}/portal" style="color:#22D3EE;">portal page</a>:
</p>
<p style="font-family:JetBrains Mono,Consolas,monospace;font-size:12px;color:#CBD5E1;word-break:break-all;background:#0A0F1C;border:1px solid rgba(255,255,255,0.08);padding:10px 12px;border-radius:4px;">
  {portal_token}
</p>
<p style="margin-top:18px;font-size:12px;color:#64748B;">
  Save this email — it's your ongoing key to your portal. We won't ask you for a password.
</p>
"""
    return await _send(email, title, _wrap(title, body))


async def send_otp_code(*, to_email: str, code: str, role: str, expires_min: int = 10) -> bool:
    """One-time-code email for `/team-access` login (founder / executive / employee).
    Uses the branded dark wrapper + giant tracked-tracking code block."""
    role_label = {"founder": "Founder", "executive": "Executive", "employee": "Employee"}.get(role, "Team")
    title = f"Your {role_label} access code"
    body = f"""
<p>Use this one-time code to sign in to your CreatorBoostAI operating dashboard:</p>
<p style="margin:28px 0;text-align:center;">
  <span style="display:inline-block;padding:18px 28px;border:1px solid rgba(6,182,212,0.4);border-radius:8px;background:#0A0F1C;font-family:'JetBrains Mono',Consolas,monospace;font-size:32px;letter-spacing:0.35em;color:#22D3EE;font-weight:600;">
    {code}
  </span>
</p>
<p style="font-size:13px;color:#94A3B8;">
  This code expires in {expires_min} minutes. If you didn't request it, you can ignore this email — no changes were made.
</p>
<p style="margin-top:22px;font-size:12px;color:#64748B;">
  Never share this code with anyone. BodyIQ-AI support will never ask for it.
</p>
"""
    return await _send(to_email, title, _wrap(title, body))


async def send_founder_notification(*, to_email: str, subject: str, body_html: str) -> bool:
    """Internal notification (lead captured, demo viewed, purchase received).
    Keeps the branded dark wrapper so notifications feel native to the product."""
    return await _send(to_email, subject, _wrap(subject, body_html))


async def send_founder_alert(*, to_email: str, subject: str, body: str) -> bool:
    """Plain-text founder alert (e.g. half-view notifications). Uses the same
    branded HTML wrapper for consistency. Best-effort: returns False if Resend
    is not configured."""
    safe = body.strip().replace("\n", "<br>")
    html_body = (
        f'<p style="font-family:JetBrains Mono,Consolas,monospace;color:#CBD5E1;'
        f'font-size:13px;line-height:1.7;white-space:pre-wrap;">{safe}</p>'
    )
    return await _send(to_email, subject, _wrap("Founder Alert", html_body))
