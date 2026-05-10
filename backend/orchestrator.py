"""Agentic Orchestrator (Iter 59) — Sovereign Intelligence Engine, MVP-1

Goal (per Jeffrey, verbatim):
    "Capture a high-intent lead, generate a value-first asset, and immediately
     initiate personalized outbound to convert that lead into a booked meeting
     or customer."

This is REAL execution — not a demo stub. It uses primitives that already exist:
  • lead_registry.upsert_lead     — Exclusive Lead Engine (locked, deduped)
  • email_service.send_with_result — real Resend send when RESEND_API_KEY is set
  • emergentintegrations Claude    — research + content + outreach generation
  • Iter 57 nurture loop           — auto-queues follow-up emails

What runs tonight:
  • Agent 1 · Researcher   → classifies industry + pain point + asset type
  • Agent 2 · Content      → generates the tailored asset (markdown)
  • Agent 3 · Outreach     → writes the personalized Email 1
  • Agent 4 · Execution    → sends Email 1 + queues 2 follow-ups (T+24h, T+72h)

What's deferred (clearly mocked or skipped, per user direction):
  • Vector DB / RAG document lookup (Phase 1 = light system-output reuse only)
  • Sandbox isolation (E2B / Modal) — agents call Claude + Resend, no code exec
  • External signal APIs (Crunchbase / Clearbit / MLS) — not connected yet

Endpoints under /api/orchestrator:
  POST /run           — trigger the full chain on an arbitrary lead spec
  POST /run-on-lead   — trigger the chain on an existing leads_registry row
  POST /list          — founder feed of recent runs (for the dashboard card)
  POST /detail        — full step-by-step trace of one run
"""
from __future__ import annotations

import os
import uuid
import asyncio
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr

log = logging.getLogger("orchestrator")

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
except Exception:
    LlmChat = LlmUserMessage = None  # type: ignore

# Iter 60 · Correction Agent + Signal Scoring
from correction_agent import with_correction  # noqa: E402
from signal_scoring import touch_signal       # noqa: E402

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
SITE_URL = (os.environ.get("SITE_URL") or "https://creatorboostai.com").rstrip("/")
FOUNDER_EMAIL = (os.environ.get("FOUNDER_EMAIL") or "j.davidg67@gmail.com").strip().lower()
DEEP_MODEL = "claude-sonnet-4-5-20250929"
FAST_MODEL = "claude-haiku-4-5-20251001"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────── Asset templates by type ────────────────
# These are the system prompts the Content Agent picks from based on what the
# Researcher classifies. They reuse the same patterns as business_builder.TOOLS
# so we get consistent voice + the same 600-900 word constraint.
ASSET_PROMPTS: Dict[str, str] = {
    "business_plan_lite": (
        "Produce a tight 1-page business plan for the lead's stated business. Sections: "
        "Problem, Offer, Target customer, Pricing, Year-1 path. 250-400 words. No fluff. "
        "Markdown. End with one specific next-step the lead should take this week."
    ),
    "roi_report": (
        "Produce a 1-page ROI report tailored to the lead. Pull from inputs: industry, "
        "current cost or revenue band, geo. Show: assumptions block, monthly savings or "
        "uplift, 12-month total, payback period (months), risk note. 200-350 words. End "
        "with the single biggest variable the lead should validate."
    ),
    "real_estate_correction": (
        "The lead is a real estate professional with an expired listing or stalled deal. "
        "Produce a 1-page Listing Correction Strategy: 1) Top 3 likely reasons it expired, "
        "2) Recommended price adjustment band with justification, 3) 4-week re-launch "
        "checklist, 4) Buyer-targeting refinement. Concrete and specific. 250-400 words."
    ),
    "energy_savings": (
        "The lead operates a facility (retail, restaurant, office). Produce a 1-page "
        "Lighting + Energy Savings Brief: 1) Current-baseline assumptions, 2) LED retrofit "
        "savings range (kWh + $/yr), 3) Available rebate programs to investigate (state by "
        "industry), 4) Estimated payback period, 5) Top-3 questions to confirm with utility. "
        "250-400 words. Honest about what needs verification."
    ),
    "icp_brief": (
        "Produce a 1-page Ideal Customer Profile brief tailored to the lead's business. "
        "Output: persona, top 3 pains, where they spend time online, 4 buying triggers, "
        "first-week outreach plan. 200-350 words."
    ),
}


# ──────────────── LLM helper ────────────────
async def _claude(*, system: str, user: str, session_id: str, model: str = DEEP_MODEL,
                  timeout: float = 30.0) -> str:
    if not (LlmChat and LlmUserMessage and EMERGENT_LLM_KEY):
        raise RuntimeError("LLM not configured (EMERGENT_LLM_KEY missing)")
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model(
        "anthropic", model
    )
    reply = await asyncio.wait_for(chat.send_message(LlmUserMessage(text=user)), timeout=timeout)
    return str(reply or "").strip()


# ──────────────── Agent 1 · Researcher ────────────────
RESEARCH_SYSTEM = (
    "You are the Research Agent inside CreatorBoostAI's autonomous revenue engine. "
    "Given a lead's profile, classify them and pick the highest-value asset to send.\n\n"
    "Output STRICT JSON, no preamble, with these keys:\n"
    "  industry: short canonical label (e.g. 'real_estate', 'lighting_energy', 'restaurant', 'mobile_services', 'startup_services', 'other')\n"
    "  pain_point: ONE sentence in the lead's voice describing what they likely struggle with\n"
    "  asset_type: ONE of [business_plan_lite, roi_report, real_estate_correction, energy_savings, icp_brief]\n"
    "  intent_score: integer 1-100 (how hot is this lead)\n"
    "  hook: ONE sentence the outreach email should open with — must reference the lead's specific situation, not 'I noticed your business'\n"
    "Decision rules:\n"
    "  • real estate / listings / agent / broker → asset_type=real_estate_correction\n"
    "  • lighting / energy / utility / facility / kWh / koollite → asset_type=energy_savings\n"
    "  • brand new business / no leads yet / pre-revenue / launching → asset_type=business_plan_lite\n"
    "  • has revenue / wants more customers / outbound help → asset_type=icp_brief OR roi_report (whichever is more tactical given input)\n"
    "  • everything else with revenue context → asset_type=roi_report\n"
)


async def _agent_research(lead: Dict[str, Any], session_id: str) -> Dict[str, Any]:
    user = (
        f"Name: {lead.get('name') or '?'}\n"
        f"Email: {lead.get('email') or '?'}\n"
        f"Business: {lead.get('business_name') or lead.get('company') or '?'}\n"
        f"Industry: {lead.get('industry') or lead.get('business_type') or '?'}\n"
        f"Notes: {lead.get('notes') or ''}\n"
        f"Source: {lead.get('source') or '?'}\n"
        f"Wants outbound help: {lead.get('wants_outbound_help', False)}\n"
    )
    raw = await _claude(system=RESEARCH_SYSTEM, user=user, session_id=session_id,
                        model=FAST_MODEL, timeout=20.0)
    # Best-effort JSON parse (strip markdown fences if any)
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1]
        cleaned = cleaned.replace("json", "", 1).strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    try:
        data = json.loads(cleaned)
    except Exception as e:
        log.warning(f"researcher returned non-json: {e} · raw={raw[:200]}")
        data = {
            "industry": lead.get("industry") or "other",
            "pain_point": "Wants more qualified leads + a clear path to first customers.",
            "asset_type": "icp_brief",
            "intent_score": 60,
            "hook": "Saw you came through CreatorBoostAI — wanted to get something tactical in your hands.",
        }
    # Validate asset_type
    if data.get("asset_type") not in ASSET_PROMPTS:
        data["asset_type"] = "icp_brief"
    data["raw"] = raw
    return data


# ──────────────── Agent 2 · Content ────────────────
async def _agent_content(lead: Dict[str, Any], research: Dict[str, Any], session_id: str) -> str:
    asset_type = research["asset_type"]
    system = ASSET_PROMPTS[asset_type] + (
        "\n\nWrite in clean markdown. Start with a single H1 title. No preamble. Be specific to "
        "the lead's stated situation. End with the legal disclaimer line: "
        "'_Draft document — review with a qualified professional. Not licensed advice._'"
    )
    user = (
        f"Lead context:\n"
        f"- Name: {lead.get('name')}\n"
        f"- Business: {lead.get('business_name') or lead.get('company') or '(none stated)'}\n"
        f"- Industry: {research.get('industry')}\n"
        f"- Pain point (researcher's read): {research.get('pain_point')}\n"
        f"- Notes: {lead.get('notes') or '(none)'}\n"
    )
    return await _claude(system=system, user=user, session_id=session_id,
                         model=DEEP_MODEL, timeout=45.0)


# ──────────────── Agent 3 · Outreach ────────────────
OUTREACH_SYSTEM = (
    "You are the Outreach Agent inside CreatorBoostAI. Write the FIRST cold-warm email "
    "to a lead who just received a tailored asset. Constraints:\n"
    "  • 60-110 words, no more.\n"
    "  • Open with the hook from research (do NOT say 'I noticed you' or 'I saw your business').\n"
    "  • Reference the asset by name and what it solves.\n"
    "  • One specific question that requires a 1-line reply.\n"
    "  • End with a sign-off as 'Jeffrey · CreatorBoostAI'.\n"
    "  • No emoji. No exclamation marks. No 'Hope you're doing well'.\n"
    "Output STRICT JSON: { subject: string, body: string (plain text, NOT html, line breaks ok) }"
)


async def _agent_outreach(lead: Dict[str, Any], research: Dict[str, Any],
                          asset_type: str, session_id: str) -> Dict[str, str]:
    user = (
        f"Lead: {lead.get('name')} ({lead.get('email')})\n"
        f"Business: {lead.get('business_name') or '(unknown)'}\n"
        f"Industry: {research.get('industry')}\n"
        f"Pain point: {research.get('pain_point')}\n"
        f"Hook to use: {research.get('hook')}\n"
        f"Asset just sent: {asset_type.replace('_', ' ')}\n"
    )
    raw = await _claude(system=OUTREACH_SYSTEM, user=user, session_id=session_id,
                        model=DEEP_MODEL, timeout=25.0)
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1]
        cleaned = cleaned.replace("json", "", 1).strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    try:
        data = json.loads(cleaned)
        if not isinstance(data, dict) or not data.get("subject") or not data.get("body"):
            raise ValueError("missing subject/body")
        return {"subject": data["subject"][:120], "body": data["body"][:2000]}
    except Exception as e:
        log.warning(f"outreach json parse failed: {e}")
        return {
            "subject": f"Quick question about {lead.get('business_name') or 'your business'}",
            "body": (raw[:1500] if raw else
                     f"Hey {lead.get('name','')},\n\n{research.get('hook','')}\n\n"
                     f"Quick question — what's the single biggest blocker on your plate this week?\n\n"
                     "Jeffrey · CreatorBoostAI"),
        }


# ──────────────── Agent 4 · Execution ────────────────
async def _agent_execution(
    db, lead: Dict[str, Any], research: Dict[str, Any],
    outreach: Dict[str, str], asset_md: str, run_id: str,
) -> Dict[str, Any]:
    """Send Email 1 immediately + queue 2 follow-ups in business_activation_nurture
    so the existing nurture scheduler picks them up. Re-uses Iter 57 infra."""
    from email_service import send_with_result  # type: ignore
    import html as _html  # noqa: PLC0415

    # Email 1 — orchestrator-personalized first touch (no PDF attachment; the
    # asset markdown is rendered inline so the lead sees value in the inbox).
    body_text = outreach["body"]
    # Iter 61 · Dark Funnel — wrap the CTA URL in a tracked redirect so clicks
    # are recorded as engagement signals on this lead.
    cta_dest = f"{SITE_URL}/portal/builder?orchestrator={run_id}"
    try:
        from dark_funnel import mint_tracked_url
        cta_url = await mint_tracked_url(
            db, lead_id=lead.get("lead_id"), dest_url=cta_dest,
            kind="orchestrator_email_cta",
        )
    except Exception:
        cta_url = cta_dest
    body_html = (
        f'<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">'
        f'<p style="white-space:pre-line;font-size:14px;line-height:1.6">{_html.escape(body_text)}</p>'
        f'<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">'
        f'<p style="font-family:\'Courier New\',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#06b6d4">Tailored asset · {_html.escape(research["asset_type"].replace("_"," "))}</p>'
        f'<div style="font-size:13px;line-height:1.55;color:#334155;border-left:2px solid #06b6d4;padding-left:14px;margin:12px 0">'
        f'<pre style="white-space:pre-wrap;font-family:Inter,Arial,sans-serif;margin:0">{_html.escape(asset_md[:3000])}{"…" if len(asset_md)>3000 else ""}</pre>'
        f'</div>'
        f'<p style="margin:24px 0">'
        f'<a href="{cta_url}" '
        f'style="background:#10b981;color:#0c1117;padding:12px 22px;border-radius:6px;'
        f'text-decoration:none;font-weight:600;font-size:13px">Continue inside the system →</a>'
        f'</p>'
        f'</div>'
    )
    send_res = await send_with_result(to=lead["email"], subject=outreach["subject"], html=body_html)

    # Queue 2 follow-ups by inserting into business_activation_nurture
    nurture_doc = {
        "id": str(uuid.uuid4()),
        "lead_id": lead.get("lead_id"),
        "capture_id": run_id,  # so the continue link still routes back
        "email": lead["email"],
        "name": lead.get("name"),
        "business_name": lead.get("business_name") or lead.get("company") or "your business",
        "wants_outbound_help": bool(lead.get("wants_outbound_help")),
        "step_1": {
            "scheduled_at": _now_iso(),
            "sent_at": _now_iso() if send_res.get("ok") else None,
            "delivered_ok": bool(send_res.get("ok")),
            "error": send_res.get("error"),
            "resend_id": send_res.get("id"),
            "subject": outreach["subject"],
            "agent_authored": True,
        },
        "step_2": {
            "scheduled_at": (_now_dt() + timedelta(hours=24)).isoformat(),
            "sent_at": None, "delivered_ok": False, "error": None, "resend_id": None,
        },
        "step_3": {
            "scheduled_at": (_now_dt() + timedelta(hours=72)).isoformat(),
            "sent_at": None, "delivered_ok": False, "error": None, "resend_id": None,
        },
        "status": "active",
        "source": "orchestrator",
        "orchestrator_run_id": run_id,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.business_activation_nurture.insert_one(dict(nurture_doc))

    return {
        "email_sent": bool(send_res.get("ok")),
        "email_error": send_res.get("error") if not send_res.get("ok") else None,
        "resend_id": send_res.get("id"),
        "nurture_id": nurture_doc["id"],
        "follow_ups_queued": 2,
    }


# ──────────────── Pydantic models ────────────────
class LeadSpec(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    business_name: Optional[str] = Field(default=None, max_length=200)
    business_type: Optional[str] = Field(default=None, max_length=120)
    industry: Optional[str] = Field(default=None, max_length=120)
    region: Optional[str] = Field(default=None, max_length=80)  # Iter 60 · safe baseline
    notes: Optional[str] = Field(default=None, max_length=4000)
    source: Optional[str] = Field(default="orchestrator_manual", max_length=80)
    wants_outbound_help: bool = True


class RunRequest(BaseModel):
    lead: LeadSpec
    triggered_by: Optional[str] = "manual"
    auth_email: Optional[str] = None
    auth_token: Optional[str] = None


class RunOnLead(BaseModel):
    email: str
    token: str
    lead_id: str


class FounderAuth(BaseModel):
    email: str
    token: str


class RunDetailReq(FounderAuth):
    run_id: str


# ──────────────── Core orchestration loop ────────────────
async def _orchestrate(db, lead_input: Dict[str, Any], *, triggered_by: str) -> Dict[str, Any]:
    """Run the full 4-agent chain. Persists each step's output to `agent_runs`
    so the founder can replay or audit. Returns the run summary."""
    run_id = str(uuid.uuid4())
    session_id = f"orch_{run_id}"
    started_at = _now_dt()
    run_doc: Dict[str, Any] = {
        "id": run_id,
        "session_id": session_id,
        "triggered_by": triggered_by,
        "status": "running",
        "started_at": started_at.isoformat(),
        "lead_input": lead_input,
        "steps": [],
    }
    await db.agent_runs.insert_one(dict(run_doc))

    async def _log_step(name: str, ok: bool, ms: int, output: Any, error: Optional[str] = None):
        step = {
            "agent": name, "ok": ok, "duration_ms": ms,
            "output_preview": (str(output)[:600] if output else None),
            "error": error,
            "at": _now_iso(),
        }
        await db.agent_runs.update_one({"id": run_id}, {"$push": {"steps": step}})
        return step

    try:
        # Lock the lead in the Exclusive Lead Engine FIRST so even if downstream
        # fails, we have ownership.
        from lead_registry import upsert_lead, touch_activity  # type: ignore
        biz = (lead_input.get("business_name") or lead_input.get("business_type") or "").strip()
        reg_payload = {
            "name": lead_input.get("name"),
            "email": (lead_input.get("email") or "").lower().strip(),
            "company": biz or None,
            "industry": lead_input.get("industry") or lead_input.get("business_type"),
            "industry_tag": lead_input.get("industry") or lead_input.get("business_type"),
            "source": lead_input.get("source") or "orchestrator_manual",
            "import_method": "orchestrator",
            "imported_by": "system",
            "assigned_to_user_id": FOUNDER_EMAIL,
            "status": "new",
        }
        reg = await upsert_lead(db, reg_payload)
        lead = dict(lead_input)
        lead["lead_id"] = reg["lead"]["lead_id"]
        # Iter 60 · region tag (safe baseline)
        region = (lead_input.get("region") or "").strip()
        if region:
            try:
                await db.leads_registry.update_one(
                    {"lead_id": lead["lead_id"]}, {"$set": {"region": region[:80]}},
                )
            except Exception:
                pass
            await db.agent_runs.update_one({"id": run_id},
                                           {"$set": {"region": region[:80]}})
        await touch_activity(db, lead["lead_id"], type_="orchestrator_started",
                             by="system", note=f"run_id={run_id}")
        await db.agent_runs.update_one({"id": run_id},
                                       {"$set": {"lead_id": lead["lead_id"],
                                                 "lead_locked": True,
                                                 "is_new_lead": reg["is_new"]}})
        # Iter 60 · signal score: orchestrator started
        await touch_signal(db, lead["lead_id"], "orchestrator_run_started",
                           reason=f"run {run_id[:8]}")

        # Iter 61 · Sovereign Audit Trail — record run start
        from audit_trail import record_decision  # noqa: E402
        await record_decision(
            db, agent_id="orchestrator", action="run_started",
            lead_id=lead["lead_id"],
            reasoning_summary=f"Triggered 4-agent chain on lead {lead['lead_id']} (run={run_id}).",
            confidence=100,
            data_sources=[f"leads_registry/{lead['lead_id']}", "trigger:" + (triggered_by or 'manual')],
            inputs_preview={"name": lead.get("name"), "email": lead.get("email"),
                            "company": lead.get("company"), "industry": lead.get("industry")},
            meta={"run_id": run_id, "triggered_by": triggered_by},
        )

        # Agent 1 · Researcher (retry-wrapped)
        t0 = _now_dt()
        research = await with_correction(
            lambda: _agent_research(lead, session_id),
            kind="agent_research", db=db, lead_id=lead["lead_id"],
            context={"run_id": run_id},
        )
        await _log_step("research", True, int((_now_dt() - t0).total_seconds() * 1000),
                        {"asset_type": research["asset_type"],
                         "intent_score": research.get("intent_score"),
                         "industry": research.get("industry")})
        await record_decision(
            db, agent_id="orchestrator.researcher", action="classify_lead",
            lead_id=lead["lead_id"],
            reasoning_summary=(
                f"Classified industry='{research.get('industry')}' · pain='{research.get('pain_point','')[:80]}' "
                f"· asset_type='{research['asset_type']}' · intent_score={research.get('intent_score')}."
            ),
            confidence=int((research.get("intent_score") or 50)),
            data_sources=[f"leads_registry/{lead['lead_id']}", f"model/{FAST_MODEL}"],
            inputs_preview={"lead_summary": {k: lead.get(k) for k in ("name","company","industry","notes","email")}},
            output_preview=research,
            meta={"run_id": run_id, "model": FAST_MODEL},
        )

        # Agent 2 · Content (retry-wrapped)
        t0 = _now_dt()
        asset_md = await with_correction(
            lambda: _agent_content(lead, research, session_id),
            kind="agent_content", db=db, lead_id=lead["lead_id"],
            context={"run_id": run_id, "asset_type": research["asset_type"]},
        )
        await _log_step("content", True, int((_now_dt() - t0).total_seconds() * 1000),
                        {"asset_chars": len(asset_md),
                         "asset_first_line": asset_md.split("\n", 1)[0][:120]})
        await touch_signal(db, lead["lead_id"], "asset_generated",
                           reason=research["asset_type"])
        await record_decision(
            db, agent_id="orchestrator.content", action="generate_asset",
            lead_id=lead["lead_id"],
            reasoning_summary=(
                f"Generated '{research['asset_type']}' asset ({len(asset_md)} chars) tailored to "
                f"researcher classification."
            ),
            confidence=80,
            data_sources=["researcher_output", f"asset_template/{research['asset_type']}", f"model/{DEEP_MODEL}"],
            inputs_preview=research,
            output_preview=asset_md,
            meta={"run_id": run_id, "model": DEEP_MODEL, "asset_type": research["asset_type"]},
        )

        # Agent 3 · Outreach (retry-wrapped)
        t0 = _now_dt()
        outreach = await with_correction(
            lambda: _agent_outreach(lead, research, research["asset_type"], session_id),
            kind="agent_outreach", db=db, lead_id=lead["lead_id"],
            context={"run_id": run_id},
        )
        await _log_step("outreach", True, int((_now_dt() - t0).total_seconds() * 1000),
                        {"subject": outreach["subject"], "body_chars": len(outreach["body"])})
        await record_decision(
            db, agent_id="orchestrator.outreach", action="compose_email",
            lead_id=lead["lead_id"],
            reasoning_summary=(
                f"Composed personalized Email 1 — subject '{outreach['subject'][:60]}' · "
                f"{len(outreach['body'].split())} words."
            ),
            confidence=80,
            data_sources=["researcher_output", "content_output", f"model/{DEEP_MODEL}"],
            inputs_preview={"subject_target": outreach["subject"]},
            output_preview=outreach,
            meta={"run_id": run_id, "model": DEEP_MODEL},
        )

        # Agent 4 · Execution (retry-wrapped)
        t0 = _now_dt()
        exec_res = await with_correction(
            lambda: _agent_execution(db, lead, research, outreach, asset_md, run_id),
            kind="agent_execution", db=db, lead_id=lead["lead_id"],
            context={"run_id": run_id},
        )
        await _log_step("execution", exec_res["email_sent"],
                        int((_now_dt() - t0).total_seconds() * 1000), exec_res,
                        error=exec_res.get("email_error") if not exec_res["email_sent"] else None)
        if exec_res.get("email_sent"):
            await touch_signal(db, lead["lead_id"], "email_sent",
                               reason="orchestrator email 1")
        await record_decision(
            db, agent_id="orchestrator.execution", action="send_outreach_email",
            lead_id=lead["lead_id"],
            reasoning_summary=(
                f"{'Sent' if exec_res.get('email_sent') else 'Attempted'} Email 1 via Resend "
                f"+ queued {exec_res.get('follow_ups_queued', 0)} follow-ups."
                + (f" Error: {exec_res.get('email_error')}" if not exec_res.get('email_sent') else "")
            ),
            confidence=100 if exec_res.get("email_sent") else 40,
            data_sources=["outreach_output", "service:resend", "service:nurture_loop"],
            inputs_preview={"to": lead.get("email"), "subject": outreach["subject"]},
            output_preview=exec_res,
            meta={"run_id": run_id, "email_sent": bool(exec_res.get("email_sent"))},
        )

        # Final write
        finished = _now_dt()
        update = {
            "status": "completed",
            "finished_at": finished.isoformat(),
            "duration_ms": int((finished - started_at).total_seconds() * 1000),
            "research": research,
            "asset_markdown": asset_md,
            "outreach": outreach,
            "execution": exec_res,
        }
        await db.agent_runs.update_one({"id": run_id}, {"$set": update})

        return {
            "ok": True,
            "run_id": run_id,
            "lead_id": lead["lead_id"],
            "is_new_lead": reg["is_new"],
            "asset_type": research["asset_type"],
            "intent_score": research.get("intent_score"),
            "email_sent": exec_res["email_sent"],
            "email_error": exec_res.get("email_error"),
            "follow_ups_queued": exec_res["follow_ups_queued"],
            "duration_ms": update["duration_ms"],
        }

    except asyncio.TimeoutError:
        await db.agent_runs.update_one({"id": run_id},
                                       {"$set": {"status": "timeout",
                                                 "finished_at": _now_iso(),
                                                 "error": "agent timed out"}})
        raise HTTPException(504, "Orchestrator timed out — try a smaller lead spec")
    except Exception as e:
        await db.agent_runs.update_one({"id": run_id},
                                       {"$set": {"status": "error",
                                                 "finished_at": _now_iso(),
                                                 "error": f"{type(e).__name__}: {e}"}})
        log.exception(f"orchestrator run failed: {e}")
        raise HTTPException(500, f"Orchestrator failed: {str(e)[:200]}")


# ──────────────── ROUTER ────────────────
def make_orchestrator_router(db, require_founder=None) -> APIRouter:
    router = APIRouter(prefix="/api/orchestrator", tags=["orchestrator"])

    @router.post("/run")
    async def run(payload: RunRequest):
        # Auth optional — when present and valid, marks the run as authenticated
        triggered_by = payload.triggered_by or "manual"
        if payload.auth_email and payload.auth_token and require_founder:
            try:
                await require_founder(FounderAuth(email=payload.auth_email, token=payload.auth_token))
                triggered_by = f"{triggered_by}:founder"
            except Exception:
                pass
        return await _orchestrate(db, payload.lead.dict(), triggered_by=triggered_by)

    @router.post("/run-on-lead")
    async def run_on_lead(payload: RunOnLead):
        if require_founder:
            await require_founder(FounderAuth(email=payload.email, token=payload.token))
        lead = await db.leads_registry.find_one({"lead_id": payload.lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(404, "lead not found")
        if not lead.get("email"):
            raise HTTPException(400, "lead has no email — orchestrator needs an email to send to")
        spec = {
            "name": lead.get("name") or "Founder",
            "email": lead["email"],
            "business_name": lead.get("company"),
            "business_type": lead.get("industry") or lead.get("industry_tag"),
            "industry": lead.get("industry"),
            "notes": (lead.get("activity_log") or [{}])[-1].get("note") if lead.get("activity_log") else None,
            "source": lead.get("source"),
            "wants_outbound_help": True,
        }
        return await _orchestrate(db, spec, triggered_by="founder_lead_btn")

    @router.post("/list")
    async def list_runs(payload: FounderAuth):
        if require_founder:
            await require_founder(payload)
        rows = await db.agent_runs.find(
            {}, {"_id": 0, "asset_markdown": 0}
        ).sort("started_at", -1).limit(50).to_list(50)
        # KPIs
        total = len(rows)
        completed = sum(1 for r in rows if r.get("status") == "completed")
        emails_sent = sum(1 for r in rows if (r.get("execution") or {}).get("email_sent"))
        avg_ms = (
            sum(r.get("duration_ms") or 0 for r in rows if r.get("duration_ms")) //
            max(1, sum(1 for r in rows if r.get("duration_ms")))
        )
        return {"runs": rows, "kpi": {
            "total": total, "completed": completed, "emails_sent": emails_sent,
            "avg_duration_ms": avg_ms,
        }}

    @router.post("/detail")
    async def detail(payload: RunDetailReq):
        if require_founder:
            await require_founder(payload)
        run = await db.agent_runs.find_one({"id": payload.run_id}, {"_id": 0})
        if not run:
            raise HTTPException(404, "run not found")
        return {"run": run}

    return router


__all__ = ["make_orchestrator_router"]
