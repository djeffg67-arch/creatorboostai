"""Business Activation Capture System (Iter 57)

The primary top-of-funnel pipeline. Every Business Builder output that the
founder generates can be converted into a captured + LOCKED lead via the
"Activate My Business System" CTA.

Pipeline:
  1. Frontend posts session inputs + outputs (collected from the Builder)
  2. Backend compiles all outputs into ONE branded PDF (reportlab)
  3. Backend writes the lead into `leads_registry` with assigned_to_user_id =
     FOUNDER_EMAIL → globally LOCKED via the Exclusive Lead Engine.
  4. Backend sends the activation email (PDF attached) via Resend.
  5. Backend schedules a 3-step nurture sequence (T+0 confirmation, T+24h
     execution, T+72h offer-help). Optional `wants_outbound_help` flag pushes
     the lead into a queue for outbound conversion services later.
  6. A background scheduler ticks every ~5 min and drips overdue nurture steps.

Endpoints:
  POST /api/business-activation/capture   - public capture + activate
  POST /api/business-activation/admin-list - founder list (debug + ops view)

Helpers exported for server.py:
  make_business_activation_router(db) -> APIRouter
  business_activation_nurture_loop(db, interval_sec=300)
"""
from __future__ import annotations

import os
import io
import re
import uuid
import base64
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr

log = logging.getLogger("business_activation")

FOUNDER_EMAIL = (os.environ.get("FOUNDER_EMAIL") or "j.davidg67@gmail.com").strip().lower()
SITE_URL = (os.environ.get("SITE_URL") or "https://creatorboostai.com").rstrip("/")

NURTURE_DELAYS = {
    "step_1": timedelta(seconds=0),     # immediate (sent inline by capture)
    "step_2": timedelta(hours=24),      # T+24h
    "step_3": timedelta(hours=72),      # T+72h
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────── PDF builder (reportlab, pure-python) ────────────────
def _md_to_pdf_bytes(blocks: List[Dict[str, str]], *, header_business: str, header_owner: str) -> bytes:
    """Compile multiple {tool_label, markdown} blocks into ONE branded PDF.

    Light markdown support: # / ## / ### headings, - / * bullets, --- separator,
    bold (**text**), tables (rendered as monospace lines).
    """
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable, KeepTogether,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.85 * inch, rightMargin=0.85 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
        title="CreatorBoostAI · Business Activation Package",
        author="CreatorBoostAI",
    )
    base = getSampleStyleSheet()
    styles = {
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontSize=18, textColor=colors.HexColor("#0c4a6e"),
                             spaceBefore=14, spaceAfter=8, leading=22),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontSize=14, textColor=colors.HexColor("#155e75"),
                             spaceBefore=12, spaceAfter=6, leading=18),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontSize=11.5, textColor=colors.HexColor("#0e7490"),
                             spaceBefore=10, spaceAfter=4, leading=15),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontSize=10.5, leading=15,
                               textColor=colors.HexColor("#1f2937")),
        "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontSize=10.5, leading=15,
                                 leftIndent=14, bulletIndent=2,
                                 textColor=colors.HexColor("#1f2937")),
        "tableLine": ParagraphStyle("tableLine", parent=base["BodyText"], fontName="Courier",
                                    fontSize=9, leading=11),
        "kicker": ParagraphStyle("kicker", parent=base["BodyText"], fontSize=8.5,
                                 textColor=colors.HexColor("#06b6d4"), spaceBefore=2, spaceAfter=4),
        "tag": ParagraphStyle("tag", parent=base["BodyText"], fontSize=8.5,
                              textColor=colors.HexColor("#64748b")),
        "disclaimer": ParagraphStyle("disclaimer", parent=base["BodyText"], fontSize=8.5,
                                     leading=11, textColor=colors.HexColor("#92400e"),
                                     borderColor=colors.HexColor("#f59e0b"), borderPadding=6,
                                     borderWidth=0.6, leftIndent=2, rightIndent=2),
    }

    story = []

    # Cover
    story.append(Paragraph("CREATORBOOSTAI · BUSINESS ACTIVATION PACKAGE", styles["kicker"]))
    story.append(Paragraph(header_business or "Your Business", styles["h1"]))
    story.append(Paragraph(f"Prepared for: {header_owner or 'Founder'}", styles["tag"]))
    story.append(Paragraph(f"Generated: {_now_dt().strftime('%B %d, %Y · %I:%M %p UTC')}", styles["tag"]))
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#06b6d4"), thickness=1.2, spaceAfter=10))

    def _inline_bold(line: str) -> str:
        # convert **bold** to <b>bold</b>; escape angle brackets first
        line = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", line)

    def _render_markdown(md: str) -> List[Any]:
        flow: List[Any] = []
        for raw in (md or "").replace("\r\n", "\n").split("\n"):
            line = raw.rstrip()
            if not line.strip():
                flow.append(Spacer(1, 4))
                continue
            if line.startswith("# "):
                flow.append(Paragraph(_inline_bold(line[2:]), styles["h1"]))
            elif line.startswith("## "):
                flow.append(Paragraph(_inline_bold(line[3:]), styles["h2"]))
            elif line.startswith("### "):
                flow.append(Paragraph(_inline_bold(line[4:]), styles["h3"]))
            elif line.strip() == "---":
                flow.append(HRFlowable(width="100%", color=colors.HexColor("#cbd5e1"), thickness=0.6,
                                       spaceBefore=6, spaceAfter=6))
            elif re.match(r"^\s*[-*]\s+", line):
                txt = re.sub(r"^\s*[-*]\s+", "", line)
                flow.append(Paragraph("• " + _inline_bold(txt), styles["bullet"]))
            elif "|" in line and line.count("|") >= 2:
                # render tables as monospace lines (lightweight)
                flow.append(Paragraph(line.replace(" ", "&nbsp;"), styles["tableLine"]))
            else:
                flow.append(Paragraph(_inline_bold(line), styles["body"]))
        return flow

    # Sections (one per builder output)
    for i, blk in enumerate(blocks):
        if i > 0:
            story.append(PageBreak())
        story.append(Paragraph(f"SECTION {i+1}", styles["kicker"]))
        story.append(Paragraph(blk.get("tool_label") or "Builder Output", styles["h1"]))
        story.append(Spacer(1, 6))
        story.extend(_render_markdown(blk.get("markdown") or ""))

    # Closing — disclaimer + system invitation
    story.append(PageBreak())
    story.append(Paragraph("ACTIVATE YOUR SYSTEM", styles["kicker"]))
    story.append(Paragraph("This is your starting kit, not the finish line.", styles["h1"]))
    story.append(Paragraph(
        "CreatorBoostAI is the operating system that runs the work behind these documents — leads, "
        "outreach, demos, follow-ups, and client delivery. Click the activation link in your email to "
        "step inside, refine these outputs with the avatar, and start your first execution loop.",
        styles["body"],
    ))
    story.append(Spacer(1, 14))
    story.append(KeepTogether([
        Paragraph(
            "<b>Draft document — not licensed advice.</b> Every output is decision-support material, not "
            "licensed legal, tax, or financial advice. Always review with a qualified attorney, CPA, or "
            "financial advisor before submitting to lenders, investors, or government entities.",
            styles["disclaimer"],
        ),
    ]))

    doc.build(story)
    return buf.getvalue()


# ──────────────── Resend send-with-attachment ────────────────
async def _send_with_attachment(
    *, to: str, subject: str, html: str,
    attachment_filename: Optional[str] = None,
    attachment_b64: Optional[str] = None,
    attachment_content_type: str = "application/pdf",
) -> Dict[str, Any]:
    """Mirrors email_service.send_with_result but also forwards an attachment.
    Returns the same result dict shape so the caller can surface real errors."""
    try:
        import resend  # type: ignore
    except Exception as e:
        return {"ok": False, "error": f"resend not installed: {e}", "error_kind": "import"}

    from email_service import _live_resend_key, FROM_HEADER, REPLY_TO_EMAIL  # type: ignore
    live_key = _live_resend_key()
    if not live_key:
        return {"ok": False, "error": "RESEND_API_KEY not configured",
                "error_kind": "no_api_key", "id": None}

    resend.api_key = live_key
    params: Dict[str, Any] = {
        "from": FROM_HEADER, "to": [to], "subject": subject, "html": html,
        "reply_to": REPLY_TO_EMAIL,
    }
    if attachment_filename and attachment_b64:
        params["attachments"] = [{
            "filename": attachment_filename,
            "content": attachment_b64,
            "content_type": attachment_content_type,
        }]
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        if isinstance(result, dict) and result.get("id"):
            return {"ok": True, "id": result["id"], "error": None,
                    "error_kind": None, "status_code": 200}
        return {"ok": False, "id": None,
                "error": (result or {}).get("error") or f"Unexpected: {result!r}",
                "error_kind": "resend_api_error", "status_code": None}
    except Exception as e:
        return {"ok": False, "id": None, "error": f"{type(e).__name__}: {e}",
                "error_kind": "exception", "status_code": None}


# ──────────────── Email content templates ────────────────
def _email_step_1_html(*, name: str, business: str, continue_url: str) -> str:
    return f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#06b6d4">CreatorBoostAI · System Activation</p>
  <h1 style="font-size:22px;line-height:1.3;color:#0c4a6e;margin:8px 0 18px">
    Your business package is ready, {name or 'founder'}.
  </h1>
  <p style="font-size:14px;line-height:1.6">
    Attached is your full <strong>{business or 'business'}</strong> activation package — every output
    you generated, compiled into a single branded PDF you can print, share, or send to a banker today.
  </p>
  <p style="font-size:14px;line-height:1.6">
    But the package is only the starting line. <strong>The system that runs the work behind it</strong> —
    leads, outreach, demos, replies, deals, delivery — is now wired to you. Click below to step inside
    and start your first execution loop with the AI avatar.
  </p>
  <p style="margin:28px 0">
    <a href="{continue_url}" style="background:#10b981;color:#0c1117;padding:14px 22px;border-radius:6px;
       text-decoration:none;font-weight:600;font-size:14px">Activate my system →</a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#475569">
    Or paste this into your browser: <span style="color:#0891b2">{continue_url}</span>
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
  <p style="font-size:11px;line-height:1.5;color:#94a3b8">
    You requested this package from CreatorBoostAI's Business Builder. The PDF is decision-support
    material, not licensed legal/tax/financial advice. Review with a qualified professional.
  </p>
</div>"""


def _email_step_2_html(*, name: str, business: str, continue_url: str) -> str:
    return f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#06b6d4">CreatorBoostAI · Day 1</p>
  <h1 style="font-size:20px;line-height:1.3;color:#0c4a6e;margin:8px 0 18px">
    Plans don't fail. Execution does.
  </h1>
  <p style="font-size:14px;line-height:1.6">
    {name or 'Hey'} — most business plans never reach customer one. Not because the plan was wrong.
    Because the founder ran out of energy holding 50 tools together: cold outreach, replies, follow-ups,
    Calendly bookings, demos, contracts, onboarding.
  </p>
  <p style="font-size:14px;line-height:1.6">
    Your <strong>{business or 'business'}</strong> plan is fine. What you need is one system that
    runs all 50 things while you sleep — that's exactly what CreatorBoostAI does.
  </p>
  <p style="margin:28px 0">
    <a href="{continue_url}" style="background:#06b6d4;color:#0c1117;padding:14px 22px;border-radius:6px;
       text-decoration:none;font-weight:600;font-size:14px">Continue building →</a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#475569">
    See the full builder, refine your plan with the avatar, and unlock the lead engine in 4 minutes.
  </p>
</div>"""


def _email_step_3_html(*, name: str, business: str, continue_url: str, demo_url: str) -> str:
    return f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#06b6d4">CreatorBoostAI · Day 3</p>
  <h1 style="font-size:20px;line-height:1.3;color:#0c4a6e;margin:8px 0 18px">
    Want me to help you ship {business or 'this'}?
  </h1>
  <p style="font-size:14px;line-height:1.6">
    {name or 'Hey'} — I run CreatorBoostAI. If you're stuck on a step (pricing, ICP, first 10 customers,
    loan docs), reply to this email with one question. I'll send you a Loom or short note with a real
    answer. No pitch.
  </p>
  <p style="font-size:14px;line-height:1.6">
    Or — if you'd rather see what the system can do end-to-end before doing more solo work, watch the
    7-minute startup demo:
  </p>
  <p style="margin:24px 0">
    <a href="{demo_url}" style="background:#10b981;color:#0c1117;padding:12px 20px;border-radius:6px;
       text-decoration:none;font-weight:600;font-size:13px;margin-right:8px">Watch startup demo →</a>
    <a href="{continue_url}" style="background:transparent;color:#0c4a6e;padding:12px 20px;border:1px solid #0c4a6e;
       border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">Open my builder</a>
  </p>
  <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin-top:24px">
    Reply STOP to opt out of these execution check-ins.
  </p>
</div>"""


# ──────────────── Pydantic models ────────────────
class BuilderBlock(BaseModel):
    tool: str = Field(min_length=1, max_length=50)
    tool_label: str = Field(min_length=1, max_length=120)
    markdown: str = Field(min_length=1, max_length=200_000)


class CaptureRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    business_type: Optional[str] = Field(default=None, max_length=120)
    business_name: Optional[str] = Field(default=None, max_length=160)
    blocks: List[BuilderBlock] = Field(default_factory=list, max_length=20)
    session_id: Optional[str] = Field(default=None, max_length=120)
    source: Optional[str] = Field(default="startup_builder", max_length=60)
    wants_outbound_help: bool = False
    consent_marketing: bool = True


class FounderAuth(BaseModel):
    email: str
    token: str


# ──────────────── ROUTER ────────────────
def make_business_activation_router(db, require_founder=None) -> APIRouter:
    router = APIRouter(prefix="/api/business-activation", tags=["business-activation"])

    @router.post("/capture")
    async def capture(payload: CaptureRequest):
        # 1. Compile PDF (best-effort — never fail the whole flow)
        clean_email = payload.email.lower().strip()
        biz_name = (payload.business_name or payload.business_type or "Your Business").strip()
        try:
            pdf_bytes = _md_to_pdf_bytes(
                [b.dict() for b in payload.blocks] or [{
                    "tool_label": "Business Activation Package",
                    "markdown": "# Welcome\n\nYour package will be enriched as you continue building inside CreatorBoostAI.",
                }],
                header_business=biz_name,
                header_owner=payload.name,
            )
            pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
            pdf_size = len(pdf_bytes)
        except Exception as e:
            log.error(f"PDF compile failed: {e}")
            pdf_bytes = b""
            pdf_b64 = ""
            pdf_size = 0

        # 2. Register lead via Exclusive Lead Engine (LOCKED to founder/system)
        from lead_registry import upsert_lead, touch_activity  # type: ignore
        lead_payload = {
            "name": payload.name,
            "email": clean_email,
            "company": biz_name if (biz_name and biz_name != "Your Business") else None,
            "industry_tag": payload.business_type,
            "industry": payload.business_type,
            "source": payload.source or "startup_builder",
            "import_method": "business_activation_capture",
            "imported_by": "system",
            "assigned_to_user_id": FOUNDER_EMAIL,  # locks the lead to the founder
            "status": "new",
        }
        result = await upsert_lead(db, lead_payload)
        lead = result["lead"]
        lead_id = lead["lead_id"]
        is_new = result["is_new"]

        await touch_activity(db, lead_id, type_="business_activation_capture",
                             by="system",
                             note=f"tools={','.join(b.tool for b in payload.blocks)}; "
                                  f"pdf_kb={pdf_size//1024}; help={payload.wants_outbound_help}")

        # 3. Persist the capture record (full session) so we can re-send / replay later
        capture_id = str(uuid.uuid4())
        capture_doc = {
            "id": capture_id,
            "lead_id": lead_id,
            "name": payload.name,
            "email": clean_email,
            "business_type": payload.business_type,
            "business_name": payload.business_name,
            "source": payload.source,
            "session_id": payload.session_id,
            "blocks": [b.dict() for b in payload.blocks],
            "block_count": len(payload.blocks),
            "wants_outbound_help": payload.wants_outbound_help,
            "consent_marketing": payload.consent_marketing,
            "pdf_size_bytes": pdf_size,
            "is_new_lead": is_new,
            "created_at": _now_iso(),
        }
        await db.business_activation_captures.insert_one(dict(capture_doc))

        # Iter 58 · BRIDGE TO OUTBOUND — when the user opts into "help me get
        # customers", create an outbound_prospects row so the cold-outreach engine
        # picks them up on its next scheduler tick. Idempotent (skip if email exists).
        outbound_prospect_id: Optional[str] = None
        if payload.wants_outbound_help:
            try:
                existing_p = await db.outbound_prospects.find_one({"email": clean_email}, {"_id": 0, "id": 1})
                if existing_p:
                    outbound_prospect_id = existing_p["id"]
                else:
                    pdoc = {
                        "id": str(uuid.uuid4()),
                        "business_name": biz_name,
                        "contact_name": payload.name,
                        "email": clean_email,
                        "industry": payload.business_type,
                        "website": None,
                        "location": None,
                        "notes": (
                            f"Auto-bridged from Business Activation capture {capture_id}. "
                            f"User opted into 'help me get customers'. "
                            f"Source: {payload.source or 'startup_builder'}."
                        ),
                        "linkedin_url": None,
                        "status": "new",
                        "lead_score": None,
                        "target_segment": "activation_opt_in",
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
                        "source": "business_activation",
                        "source_capture_id": capture_id,
                        "source_lead_id": lead_id,
                        "created_at": _now_iso(),
                        "updated_at": _now_iso(),
                    }
                    await db.outbound_prospects.insert_one(dict(pdoc))
                    outbound_prospect_id = pdoc["id"]
                    log.info(f"[activation] bridged to outbound · prospect_id={outbound_prospect_id}")
            except Exception as e:
                log.warning(f"[activation] outbound bridge failed: {e}")

        # 4. Send Email 1 (immediate) with PDF attached
        continue_url = f"{SITE_URL}/portal/builder?activation={capture_id}"
        email1 = await _send_with_attachment(
            to=clean_email,
            subject="Your Business Plan + AI System Access",
            html=_email_step_1_html(name=payload.name, business=biz_name, continue_url=continue_url),
            attachment_filename=f"{re.sub(r'[^a-zA-Z0-9_-]', '_', biz_name)[:40] or 'business'}_activation.pdf",
            attachment_b64=pdf_b64 or None,
        )

        # 5. Schedule nurture steps 2 + 3
        nurture_doc = {
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "capture_id": capture_id,
            "email": clean_email,
            "name": payload.name,
            "business_name": biz_name,
            "wants_outbound_help": payload.wants_outbound_help,
            "step_1": {
                "scheduled_at": _now_iso(),
                "sent_at": _now_iso() if email1.get("ok") else None,
                "delivered_ok": bool(email1.get("ok")),
                "error": email1.get("error"),
                "resend_id": email1.get("id"),
            },
            "step_2": {
                "scheduled_at": (_now_dt() + NURTURE_DELAYS["step_2"]).isoformat(),
                "sent_at": None, "delivered_ok": False, "error": None, "resend_id": None,
            },
            "step_3": {
                "scheduled_at": (_now_dt() + NURTURE_DELAYS["step_3"]).isoformat(),
                "sent_at": None, "delivered_ok": False, "error": None, "resend_id": None,
            },
            "status": "active",
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.business_activation_nurture.insert_one(dict(nurture_doc))

        # 6. Notify founder of the new captured lead
        try:
            from email_service import send_founder_notification
            help_flag = " · OUTBOUND HELP REQUESTED" if payload.wants_outbound_help else ""
            await send_founder_notification(
                to_email=FOUNDER_EMAIL,
                subject=f"New activation lead · {biz_name}{help_flag}",
                body_html=(
                    f"<p><strong>{payload.name}</strong> ({clean_email}) just activated their business "
                    f"package for <em>{biz_name}</em>.</p>"
                    f"<p>Tools compiled: {', '.join(b.tool for b in payload.blocks) or '(none)'}</p>"
                    f"<p>Lead ID: <code>{lead_id}</code> · {'NEW' if is_new else 'MERGED'} · "
                    f"locked to {FOUNDER_EMAIL}</p>"
                    f"<p>Wants outbound help: <strong>{payload.wants_outbound_help}</strong></p>"
                ),
            )
        except Exception as e:
            log.warning(f"founder notify failed: {e}")

        # Iter 59 · auto-trigger the agentic orchestrator on high-intent captures.
        # Fire-and-forget: the user already has their PDF + Email 1. The
        # orchestrator runs the 4-agent chain in the background and queues
        # personalized follow-ups in business_activation_nurture.
        if payload.wants_outbound_help:
            try:
                from orchestrator import _orchestrate as _orch  # type: ignore
                orch_input = {
                    "name": payload.name,
                    "email": clean_email,
                    "business_name": biz_name,
                    "business_type": payload.business_type,
                    "industry": payload.business_type,
                    "notes": f"Activated via {payload.source or 'startup_builder'}; "
                             f"opted into outbound help; tools={','.join(b.tool for b in payload.blocks)}",
                    "source": "business_activation_orchestrator",
                    "wants_outbound_help": True,
                }
                asyncio.create_task(_orch(db, orch_input, triggered_by="business_activation_capture"))
            except Exception as e:
                log.warning(f"async orchestrator trigger failed: {e}")

        return {
            "ok": True,
            "lead_id": lead_id,
            "capture_id": capture_id,
            "is_new_lead": is_new,
            "email_delivered": bool(email1.get("ok")),
            "email_error": email1.get("error") if not email1.get("ok") else None,
            "pdf_size_bytes": pdf_size,
            "continue_url": continue_url,
            "nurture_scheduled": True,
            "outbound_prospect_id": outbound_prospect_id,
            "outbound_bridged": bool(outbound_prospect_id),
            "orchestrator_triggered": payload.wants_outbound_help,
        }

    async def _trigger_orchestrator_async(lead_input: Dict[str, Any]) -> None:
        """Iter 59 · Fire-and-forget orchestrator chain when a high-intent
        activation comes in. Non-blocking — the user already got their PDF +
        Email 1. The orchestrator adds a second, more personalized email +
        replaces the generic nurture with agent-authored follow-ups."""
        try:
            from orchestrator import _orchestrate as _orch  # type: ignore
            await _orch(db, lead_input, triggered_by="business_activation_capture")
        except Exception as e:
            log.warning(f"async orchestrator trigger failed: {e}")

    @router.post("/admin-list")
    async def admin_list(payload: FounderAuth):
        if require_founder:
            await require_founder(payload)
        cursor = db.business_activation_captures.find({}, {"_id": 0, "blocks": 0}).sort("created_at", -1).limit(200)
        rows = await cursor.to_list(200)
        # Enrich with nurture progress
        for r in rows:
            n = await db.business_activation_nurture.find_one({"capture_id": r["id"]}, {"_id": 0})
            r["nurture"] = {
                k: ({"sent": bool(((n or {}).get(k) or {}).get("sent_at"))}
                    if n else {"sent": False})
                for k in ("step_1", "step_2", "step_3")
            }
        return {"captures": rows, "total": len(rows)}

    return router


# ──────────────── BACKGROUND NURTURE LOOP ────────────────
async def business_activation_nurture_loop(db, interval_sec: int = 300) -> None:
    """Background loop that drips overdue nurture steps. Hooked from server.py
    on app startup. Disabled if NURTURE_SCHEDULER=off."""
    import random
    if os.environ.get("NURTURE_SCHEDULER", "on").lower() == "off":
        log.info("[nurture] disabled by env")
        return
    log.info("[nurture] activation nurture loop starting")
    await asyncio.sleep(30)  # let app start
    while True:
        try:
            await _nurture_tick(db)
        except Exception as e:
            log.error(f"[nurture] tick error: {e}")
        await asyncio.sleep(interval_sec + random.randint(-15, 15))


async def _nurture_tick(db) -> None:
    now_iso = _now_iso()
    # find docs where step_2 is overdue and not sent
    cursor = db.business_activation_nurture.find({
        "status": "active",
        "step_2.sent_at": None,
        "step_2.scheduled_at": {"$lte": now_iso},
    }).limit(50)
    async for doc in cursor:
        await _send_nurture_step(db, doc, "step_2")
    cursor = db.business_activation_nurture.find({
        "status": "active",
        "step_3.sent_at": None,
        "step_3.scheduled_at": {"$lte": now_iso},
    }).limit(50)
    async for doc in cursor:
        await _send_nurture_step(db, doc, "step_3")
        # mark complete
        await db.business_activation_nurture.update_one(
            {"id": doc["id"]},
            {"$set": {"status": "completed", "updated_at": _now_iso()}},
        )


async def _send_nurture_step(db, doc: Dict[str, Any], step: str) -> None:
    continue_url = f"{SITE_URL}/portal/builder?activation={doc.get('capture_id')}"
    if step == "step_2":
        subject = "Plans don't fail. Execution does."
        html = _email_step_2_html(name=doc["name"], business=doc.get("business_name") or "your business",
                                  continue_url=continue_url)
    else:
        subject = f"Want me to help you ship {doc.get('business_name') or 'this'}?"
        demo_url = f"{SITE_URL}/demo/startup"
        html = _email_step_3_html(name=doc["name"], business=doc.get("business_name") or "your business",
                                  continue_url=continue_url, demo_url=demo_url)
    res = await _send_with_attachment(to=doc["email"], subject=subject, html=html)
    await db.business_activation_nurture.update_one(
        {"id": doc["id"]},
        {"$set": {
            f"{step}.sent_at": _now_iso(),
            f"{step}.delivered_ok": bool(res.get("ok")),
            f"{step}.error": res.get("error"),
            f"{step}.resend_id": res.get("id"),
            "updated_at": _now_iso(),
        }},
    )
    log.info(f"[nurture] {step} sent={res.get('ok')} to={doc['email']}")


__all__ = [
    "make_business_activation_router",
    "business_activation_nurture_loop",
]
