"""CFO-Ready Business Case Generator (Iter 61)

Real, simple, fast. Turns a lead's context into a polished business case that
can be forwarded internally to a CFO/exec/board without edits.

Three industry-specific tracks:
  • koollite_energy  → energy savings / kWh / payback / rebates
  • real_estate      → pricing / ROI / time-to-sale / market positioning
  • general_business → revenue uplift / cost savings / strategic fit

Endpoint:
  POST /api/cfo-case/generate {lead_id?, industry?, inputs?, attach_pdf?}
"""
from __future__ import annotations

import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("cfo_business_case")

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
except Exception:
    LlmChat = LlmUserMessage = None  # type: ignore

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
DEEP_MODEL = "claude-sonnet-4-5-20250929"

INDUSTRY_PROMPTS: Dict[str, str] = {
    "koollite_energy": (
        "You are a CFO writing a 1-page business case for a lighting/energy retrofit. "
        "Output sections in order:\n"
        "  1. Executive Summary (3 sentences max — investment, payback, decision ask)\n"
        "  2. Investment Required (line-item: equipment + install + soft costs)\n"
        "  3. Annual Savings Breakdown (kWh × $/kWh, maintenance reduction, rebates)\n"
        "  4. Payback Period (months) + 5-year cumulative savings table\n"
        "  5. NPV @ 10% discount + IRR (show the math)\n"
        "  6. Strategic Fit (sustainability ESG · operational · risk reduction)\n"
        "  7. Decision: GO / WAIT / DECLINE recommendation with one line of justification\n"
        "Tone: confident, specific, numerical. No marketing fluff. Markdown."
    ),
    "real_estate": (
        "You are a CFO/principal-broker writing a 1-page business case for a real-estate "
        "decision (relist, price-correct, hold, divest). Output sections:\n"
        "  1. Executive Summary (3 sentences — current state + recommended action + financial impact)\n"
        "  2. Position Snapshot (current price · DOM · comp band · carrying cost/mo)\n"
        "  3. Three-Scenario Financial Model (markdown table):\n"
        "     | Scenario | Action | Net Proceeds | Time-to-Close | Carrying Cost Burn |\n"
        "  4. Recommended Path with the math (price-adjustment band + expected DOM)\n"
        "  5. Risk Factors (3 bullets) + Mitigations\n"
        "  6. Decision: PROCEED / ADJUST / WAIT recommendation with one-line justification\n"
        "Tone: principal-broker confident, no flowery language. Markdown."
    ),
    "general_business": (
        "You are a CFO writing a 1-page general business case (operational investment, "
        "vendor decision, growth play). Output sections:\n"
        "  1. Executive Summary (3 sentences — investment, expected return, decision ask)\n"
        "  2. Use of Funds / Scope (line-item)\n"
        "  3. Financial Impact: Year-1 revenue uplift OR cost reduction (with assumptions)\n"
        "  4. Payback Period + 3-year ROI table:\n"
        "     | Year | Investment | Return | Cumulative Net | ROI % |\n"
        "  5. Strategic Fit (one paragraph)\n"
        "  6. Risk Factors (3 bullets) + Mitigations\n"
        "  7. Decision: APPROVE / REVISE / DECLINE recommendation with one-line justification\n"
        "Tone: CFO-grade, conservative on numbers, specific. Markdown."
    ),
}

DISCLAIMER = (
    "\n\n---\n\n"
    "_Draft business case · review with a qualified CPA, financial advisor, or board "
    "before relying on it for material decisions. All numbers are estimates that should "
    "be validated against actual quotes, contracts, and historical performance._"
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _classify_industry(industry: Optional[str], notes: Optional[str] = None) -> str:
    """Pick the right prompt template. Conservative — defaults to general."""
    s = (industry or "").lower() + " " + (notes or "").lower()
    if any(t in s for t in ("koollite", "lighting", "led", "kwh", "energy", "utility",
                             "retrofit", "fluorescent", "rebate")):
        return "koollite_energy"
    if any(t in s for t in ("real estate", "real_estate", "listing", "broker", "agent",
                             "mls", "homes", "property")):
        return "real_estate"
    return "general_business"


# ──────────────── LLM helper (retry-wrapped) ────────────────
async def _generate(industry_key: str, lead_context: Dict[str, Any], inputs: Dict[str, Any],
                    session_id: str) -> str:
    if not (LlmChat and LlmUserMessage and EMERGENT_LLM_KEY):
        raise HTTPException(503, "LLM not configured")
    sys = INDUSTRY_PROMPTS[industry_key] + (
        "\n\nWrite in clean markdown. Start with H1 title. No preamble. End with the "
        "disclaimer line: '_Draft business case — review with a qualified professional._'"
    )
    user_lines = ["Lead context:"]
    for k, v in lead_context.items():
        if v: user_lines.append(f"- **{k}**: {v}")
    if inputs:
        user_lines.append("\nUser-supplied inputs:")
        for k, v in inputs.items():
            if v: user_lines.append(f"- **{k}**: {v}")
    user = "\n".join(user_lines)

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=sys).with_model(
        "anthropic", DEEP_MODEL
    )
    raw = await asyncio.wait_for(chat.send_message(LlmUserMessage(text=user)), timeout=50.0)
    md = str(raw or "").strip()
    if not md:
        raise HTTPException(502, "LLM returned empty content")
    return md + DISCLAIMER


# ──────────────── Pydantic models ────────────────
class GenerateReq(BaseModel):
    lead_id: Optional[str] = None
    industry: Optional[str] = Field(default=None, max_length=80)
    inputs: Dict[str, str] = Field(default_factory=dict)
    auth_email: Optional[str] = None
    auth_token: Optional[str] = None


# ──────────────── ROUTER ────────────────
def make_cfo_router(db, require_founder=None) -> APIRouter:
    router = APIRouter(prefix="/api/cfo-case", tags=["cfo-business-case"])

    @router.post("/generate")
    async def generate(payload: GenerateReq):
        # Optional founder auth (used for trust + signal_score boost)
        if payload.auth_email and payload.auth_token and require_founder:
            try:
                from pydantic import BaseModel as _BM

                class _A(_BM):
                    email: str
                    token: str
                await require_founder(_A(email=payload.auth_email, token=payload.auth_token))
            except Exception:
                pass

        # Load lead context if lead_id provided
        lead_context: Dict[str, Any] = {}
        lead = None
        if payload.lead_id:
            lead = await db.leads_registry.find_one(
                {"lead_id": payload.lead_id},
                {"_id": 0, "name": 1, "email": 1, "company": 1, "industry": 1,
                 "industry_tag": 1, "region": 1, "notes": 1, "signal_score": 1},
            )
            if not lead:
                raise HTTPException(404, "lead not found")
            lead_context = {
                "Name": lead.get("name"),
                "Business": lead.get("company"),
                "Industry": lead.get("industry") or lead.get("industry_tag"),
                "Region": lead.get("region"),
                "Signal score": lead.get("signal_score"),
            }

        # Pick industry route
        industry_key = _classify_industry(
            payload.industry or (lead or {}).get("industry") or (lead or {}).get("industry_tag"),
            (lead or {}).get("notes"),
        )

        case_id = str(uuid.uuid4())
        session_id = f"cfo_{case_id}"

        # Wrap generation with the existing Correction Agent
        from correction_agent import with_correction
        markdown = await with_correction(
            lambda: _generate(industry_key, lead_context, payload.inputs, session_id),
            kind="cfo_case_generate", db=db, lead_id=payload.lead_id,
            context={"industry_key": industry_key},
        )

        # Persist
        doc = {
            "id": case_id,
            "lead_id": payload.lead_id,
            "industry": industry_key,
            "inputs": payload.inputs,
            "lead_context": lead_context,
            "markdown": markdown,
            "chars": len(markdown),
            "created_at": _now_iso(),
        }
        await db.cfo_business_cases.insert_one(dict(doc))

        # Boost signal_score if attached to a lead
        if payload.lead_id:
            try:
                from signal_scoring import touch_signal
                await touch_signal(db, payload.lead_id, "asset_generated",
                                   reason=f"cfo_case_{industry_key}")
            except Exception:
                pass

        return {
            "ok": True,
            "case_id": case_id,
            "industry": industry_key,
            "markdown": markdown,
            "chars": len(markdown),
        }

    @router.post("/list")
    async def list_cases(payload: GenerateReq):
        # Founder list — auth required
        if not require_founder:
            raise HTTPException(403, "auth required")
        if not payload.auth_email or not payload.auth_token:
            raise HTTPException(401, "auth required")
        from pydantic import BaseModel as _BM
        class _A(_BM):
            email: str
            token: str
        await require_founder(_A(email=payload.auth_email, token=payload.auth_token))
        rows = await db.cfo_business_cases.find(
            {}, {"_id": 0, "markdown": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        return {"cases": rows, "total": len(rows)}

    return router


__all__ = ["make_cfo_router", "INDUSTRY_PROMPTS"]
