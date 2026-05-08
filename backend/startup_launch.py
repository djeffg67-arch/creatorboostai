"""Startup & Business Launch System (Iter 82).

Phase-1 backend for the AI Business Operating System layer. Takes a
guided intake (8 fields) and orchestrates one Claude Sonnet 4.5 call to
produce a structured 9-section business plan: Overview, Roadmap,
Website Structure, Homepage Copy, Service Pages, Pricing, Outreach
Strategy, Lead Generation, CRM/Workflow.

Saves the result so the frontend can re-fetch + share.
Future phases (website generation, prompt export, deployment hooks,
CRM setup, automation) are stubbed but NOT wired here.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
except Exception:
    LlmChat = LlmUserMessage = None  # type: ignore

log = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
DEEP_MODEL = "claude-sonnet-4-5-20250929"

# ────────────────────────────── Models ──────────────────────────────


class StartupIntake(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=120)
    industry: str = Field(..., min_length=2, max_length=160)
    services: str = Field(..., min_length=2, max_length=2000)
    location: str = Field(..., min_length=2, max_length=200)
    business_goals: str = Field(..., min_length=2, max_length=2000)
    target_customers: str = Field(..., min_length=2, max_length=2000)
    revenue_goals: str = Field(..., min_length=2, max_length=400)
    branding_style: str = Field(..., min_length=2, max_length=400)


class StartupGenerateRequest(BaseModel):
    intake: StartupIntake


# ────────────────────────────── Prompts ──────────────────────────────


SYSTEM_PROMPT = (
    "You are CreatorBoostAI's Business Launch Architect. Founders give "
    "you a guided intake; you produce a complete launch plan that reads "
    "like an operating system, not a website builder. The output must be "
    "STRICT JSON only — no preamble, no markdown fences, no commentary "
    "outside the JSON. Use this exact schema:\n"
    "{\n"
    '  "business_overview": {\n'
    '    "one_liner": "<10-18 word elevator pitch>",\n'
    '    "narrative": "<2-3 paragraph description in first person>",\n'
    '    "differentiators": ["<3 to 5 short bullets>"]\n'
    "  },\n"
    '  "startup_roadmap": [\n'
    '    {"phase": "<Week 1>", "objective": "<short>", "deliverables": ["<3-5 bullets>"]},\n'
    '    ... 4 to 6 phases through month 3\n'
    "  ],\n"
    '  "website_structure": [\n'
    '    {"path": "/", "title": "<Home>", "purpose": "<1 sentence>", "sections": ["<3-6 sections>"]},\n'
    '    ... 5 to 8 pages total\n'
    "  ],\n"
    '  "homepage_copy": {\n'
    '    "hero_eyebrow": "<2-5 words>",\n'
    '    "hero_headline": "<6-12 word benefit-driven headline>",\n'
    '    "hero_subheadline": "<1 sentence, 12-22 words>",\n'
    '    "primary_cta": "<2-4 words>",\n'
    '    "secondary_cta": "<2-4 words>",\n'
    '    "value_props": ["<3 short value props>"]\n'
    "  },\n"
    '  "service_page_ideas": [\n'
    '    {"name": "<3-5 words>", "summary": "<1 sentence>", "outcomes": ["<2-3 outcomes>"]},\n'
    '    ... 4 to 6 services\n'
    "  ],\n"
    '  "pricing_structure": {\n'
    '    "model": "<one of: tiered | usage | flat | hybrid>",\n'
    '    "tiers": [\n'
    '      {"name": "<short>", "price_label": "<\'$X\' or \'Starts at $X\' or \'Custom\'>", "fits": "<who>", "includes": ["<3-5 lines>"]},\n'
    '      ... 2 to 3 tiers\n'
    "    ],\n"
    '    "rationale": "<1-2 sentences explaining the model choice>"\n'
    "  },\n"
    '  "outreach_strategy": {\n'
    '    "channels": ["<3-5 channels>"],\n'
    '    "ideal_first_50": "<sentence describing the first 50 customers>",\n'
    '    "weekly_motion": ["<4-6 weekly outreach actions>"]\n'
    "  },\n"
    '  "lead_generation": {\n'
    '    "magnets": ["<3-4 lead magnets>"],\n'
    '    "qualification_signals": ["<3-5 signals>"],\n'
    '    "tools": ["<3-5 specific tool/SaaS names>"]\n'
    "  },\n"
    '  "crm_workflow": {\n'
    '    "stages": ["<5-7 pipeline stages>"],\n'
    '    "automations": ["<4-6 automation rules>"],\n'
    '    "stack_recommendation": "<2-3 sentence recommendation>"\n'
    "  }\n"
    "}\n"
    "Tone: confident, operational, founder-respectful. Avoid hype. Avoid "
    "generic SaaS clichés. Reference the user's actual industry, services, "
    "and location wherever it sharpens the recommendation."
)


def _build_user_message(intake: StartupIntake) -> str:
    return (
        "Generate the launch plan for this business intake:\n\n"
        f"- **Business name**: {intake.business_name}\n"
        f"- **Industry**: {intake.industry}\n"
        f"- **Services**: {intake.services}\n"
        f"- **Location**: {intake.location}\n"
        f"- **Business goals**: {intake.business_goals}\n"
        f"- **Target customers**: {intake.target_customers}\n"
        f"- **Revenue goals**: {intake.revenue_goals}\n"
        f"- **Branding style**: {intake.branding_style}\n\n"
        "Return the JSON object exactly per the schema. No preamble."
    )


def _strip_json(text: str) -> str:
    """Pull the first JSON object out of an LLM response."""
    text = (text or "").strip()
    # Strip ```json fences
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        return fence.group(1)
    # Take from first { to last }
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last > first:
        return text[first : last + 1]
    return text


async def _call_claude(system: str, user_msg: str, session_id: str) -> str:
    if not (LlmChat and LlmUserMessage and EMERGENT_LLM_KEY):
        raise HTTPException(503, "LLM not configured (EMERGENT_LLM_KEY missing)")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", DEEP_MODEL)
    # Sit just under the K8s ingress 60s gateway timeout so a slow-but-successful
    # response surfaces a clean 504 from us, not an opaque 502 from the proxy.
    reply = await asyncio.wait_for(
        chat.send_message(LlmUserMessage(text=user_msg)),
        timeout=50.0,
    )
    return str(reply or "").strip()


# ────────────────────────────── Router ──────────────────────────────


def make_startup_launch_router(db) -> APIRouter:
    router = APIRouter(prefix="/api/startup-launch", tags=["startup-launch"])

    @router.post("/generate")
    async def generate_launch_plan(payload: StartupGenerateRequest) -> Dict[str, Any]:
        intake = payload.intake
        plan_id = str(uuid.uuid4())
        session_id = f"startup-launch-{plan_id}"
        system = SYSTEM_PROMPT
        user_msg = _build_user_message(intake)

        try:
            raw = await _call_claude(system, user_msg, session_id)
        except asyncio.TimeoutError:
            raise HTTPException(504, "Launch plan generation timed out — please retry.")
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            log.exception("[startup-launch] LLM error")
            raise HTTPException(502, f"LLM error: {str(e)[:200]}")

        try:
            plan = json.loads(_strip_json(raw))
        except Exception as e:  # noqa: BLE001
            log.warning(f"[startup-launch] JSON parse failed: {e} · raw[:200]={raw[:200]}")
            raise HTTPException(502, "AI returned malformed JSON — please retry.")

        # Normalize the 9 expected sections so frontend can render safely
        expected_keys = [
            "business_overview", "startup_roadmap", "website_structure",
            "homepage_copy", "service_page_ideas", "pricing_structure",
            "outreach_strategy", "lead_generation", "crm_workflow",
        ]
        for k in expected_keys:
            plan.setdefault(k, None)

        record = {
            "id": plan_id,
            "intake": intake.dict(),
            "plan": plan,
            "model": DEEP_MODEL,
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        try:
            await db.startup_launch_plans.insert_one(record.copy())
        except Exception as e:  # noqa: BLE001
            log.warning(f"[startup-launch] persistence failed: {e}")

        # Strip _id if Mongo mutated the dict
        record.pop("_id", None)
        return {"ok": True, "plan_id": plan_id, **record}

    @router.get("/plan/{plan_id}")
    async def fetch_plan(plan_id: str) -> Dict[str, Any]:
        rec = await db.startup_launch_plans.find_one({"id": plan_id}, {"_id": 0})
        if not rec:
            raise HTTPException(404, "Plan not found")
        return {"ok": True, **rec}

    @router.get("/health")
    async def health() -> Dict[str, Any]:
        return {
            "ok": True,
            "model": DEEP_MODEL,
            "llm_configured": bool(EMERGENT_LLM_KEY and LlmChat),
            "phase": "1 · intake + orchestration + generation",
            "phase2_ready": False,
            "future_hooks": [
                "website_generation",
                "prompt_export",
                "deployment_integrations",
                "ai_builder_integrations",
                "crm_setup_automation",
            ],
        }

    return router
