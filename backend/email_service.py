"""Resend email service with graceful degradation.

If RESEND_API_KEY is empty or sending fails, we log and return False without
raising so checkout / lead flows never break because of email issues.
"""
import os
import asyncio
import logging
from typing import Optional

import resend

logger = logging.getLogger(__name__)

SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
REPLY_TO_EMAIL = os.environ.get("REPLY_TO_EMAIL", SENDER_EMAIL)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
# If DNS for the branded sender isn't verified yet, set USE_RESEND_TEST_DOMAIN=true
# to temporarily send from onboarding@resend.dev (Resend's pre-verified test domain).
USE_TEST_DOMAIN = os.environ.get("USE_RESEND_TEST_DOMAIN", "false").lower() == "true"
EFFECTIVE_SENDER = "onboarding@resend.dev" if USE_TEST_DOMAIN else SENDER_EMAIL

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def _email_enabled() -> bool:
    return bool(RESEND_API_KEY)


async def _send(to: str, subject: str, html: str) -> bool:
    if not _email_enabled():
        logger.info(f"[email disabled] Would send to={to} subject={subject!r}")
        return False
    params = {
        "from": f"BodyIQ-AI <{EFFECTIVE_SENDER}>",
        "to": [to],
        "subject": subject,
        "html": html,
        "reply_to": REPLY_TO_EMAIL,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent id={result.get('id')} to={to}")
        return True
    except Exception as e:
        logger.error(f"Email send failed to={to}: {e}")
        return False


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
