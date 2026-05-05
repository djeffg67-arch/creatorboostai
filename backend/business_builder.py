"""Business Builder Module (Iter 56)

Structured wizard endpoints that turn a small set of founder inputs into a
draft document via Claude Sonnet 4.5. Each tool returns markdown that the
frontend renders + exports to PDF / DOCX / CSV (client-side).

All outputs include a legal disclaimer ("draft document, not licensed advice").

Endpoints under `/api/business-builder`:
  POST /generate  - run a tool with structured inputs

The 16 tool keys map to a system prompt. The frontend's BuilderPage owns the
wizard UX (step 1: pick tool, step 2: structured inputs, step 3: generate +
export).
"""
from __future__ import annotations

import os
import json
import logging
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("business_builder")

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
except Exception:
    LlmChat = LlmUserMessage = None  # type: ignore

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
DEEP_MODEL = "claude-sonnet-4-5-20250929"

DISCLAIMER = (
    "\n\n---\n\n"
    "**Draft document — review with a qualified professional.** This output is decision-support material, "
    "not licensed legal, tax, or financial advice. Verify all assumptions, numbers, and legal requirements "
    "with a qualified attorney, CPA, or financial advisor before relying on it."
)


# ──────────────── Tool catalog (16 builders) ────────────────
TOOLS: Dict[str, Dict[str, Any]] = {
    "business_plan": {
        "label": "Business Plan",
        "fields": ["business_name", "industry", "location", "target_customer", "pricing_idea", "year1_goal"],
        "system": (
            "You are a startup business plan writer. Produce a clean, structured 8-section business plan in "
            "markdown: 1) Executive Summary 2) Problem 3) Solution / Offering 4) Market & Target Customer "
            "5) Competition + Differentiation 6) Go-to-Market & Sales Strategy 7) Operations + Team "
            "8) Financial Outlook (year-1 revenue + costs + path to profit). Be concrete, no fluff, no "
            "unicorn claims. 600-900 words."
        ),
    },
    "financial_projections": {
        "label": "Financial Projections (12-month)",
        "fields": ["business_name", "industry", "starting_cash", "monthly_fixed_costs", "avg_unit_price", "expected_units_m1"],
        "system": (
            "You are a startup CFO. Build a realistic 12-month financial projection table in markdown — "
            "columns: Month / Units Sold / Revenue / COGS / Gross Profit / Fixed Costs / Operating Profit / "
            "Cash Balance. Assume 12-15% MoM growth on units (justify the assumption). End with a 6-bullet "
            "summary: total revenue, gross margin %, breakeven month, peak cash burn, year-end cash, key risk."
        ),
    },
    "loan_summary": {
        "label": "Loan-Ready Summary",
        "fields": ["business_name", "loan_amount", "use_of_funds", "industry", "owner_name", "owner_experience_years"],
        "system": (
            "You are writing a loan-ready 1-page executive summary for a small-business / SBA lender. "
            "Sections: 1) Business Overview (2-3 sentences) 2) Use of Funds (line-item) 3) Repayment Plan "
            "(monthly cashflow showing comfortable DSCR ≥1.25) 4) Collateral / Personal Guarantee statement "
            "5) Owner Experience 6) Why this is bankable (3 bullets). Be conservative and specific."
        ),
    },
    "startup_checklist": {
        "label": "First-Year Startup Checklist",
        "fields": ["business_name", "industry", "state", "structure"],
        "system": (
            "You are a startup operator. Produce a tactical first-year startup checklist for the given "
            "business + state, grouped into: Legal & Registration, Banking & Finance, Brand & Web, "
            "Customer Acquisition, Operations, Compliance. Each item has a one-line action + a target week "
            "(W1-W52). Include state-specific items (LLC filing, EIN, state tax ID, sales tax permit) where "
            "relevant. 30-50 items total."
        ),
    },
    "icp_builder": {
        "label": "Ideal Customer Profile",
        "fields": ["product_description", "industry", "price_point", "geo"],
        "system": (
            "You are an ICP analyst. Define one tight ICP for this product/service. Output sections: "
            "1) Primary persona (role, company size, age, decision authority) 2) Pain points (5 bullets) "
            "3) Buying triggers (3 bullets) 4) Where they spend time online (5 channels) 5) Objections "
            "(4 with rebuttals) 6) Lead-list filter spec (job-title keywords, company-size band, geo). "
            "Concrete and specific — no generic SMB language."
        ),
    },
    "sales_script": {
        "label": "Sales Discovery Script",
        "fields": ["product_description", "icp_role", "price_point"],
        "system": (
            "You are a sales coach. Produce a 15-minute discovery call script: opening (30s), 5 discovery "
            "questions, 3 qualification questions (BANT-style), value-prop transition, demo / next-step "
            "ask, common objection handlers (3). Conversational tone, no corporate fluff."
        ),
    },
    "email_campaign": {
        "label": "Cold Email Campaign (5-touch)",
        "fields": ["product_description", "icp_role", "industry", "value_prop_one_line"],
        "system": (
            "You are a cold-email copywriter. Produce a 5-touch sequence for the ICP role + industry. "
            "Touch 1 (Day 0): force-reply opener · Touch 2 (Day 1, +24h): bump · Touch 3 (Day 3): proof "
            "point · Touch 4 (Day 5): Loom offer · Touch 5 (Day 8): polite close. Each touch: subject + "
            "35-80 word body. Reference the recipient's industry by name. No emoji. No exclamation marks."
        ),
    },
    "pitch_deck_outline": {
        "label": "Pitch Deck Outline (12 slides)",
        "fields": ["business_name", "industry", "stage", "ask_amount"],
        "system": (
            "You are a YC-style pitch coach. Produce a 12-slide deck outline. Per slide: title + 2-4 "
            "bullets the founder must put on the slide + speaker note (1-2 sentences). Slides: 1 Title "
            "2 Problem 3 Solution 4 Market 5 Product 6 Traction 7 Business Model 8 Go-to-Market 9 "
            "Competition 10 Team 11 Financials 12 Ask & Use of Funds. Tight + investor-grade."
        ),
    },
    "offer_pricing": {
        "label": "Offer & Pricing Builder",
        "fields": ["product_description", "delivery_format", "competitor_price_band", "target_margin_pct"],
        "system": (
            "You are a pricing strategist. Build a 3-tier offer ladder (Core / Plus / Premium) for this "
            "product. Per tier: name, price, what's included (5 bullets), who it's for (1 line), "
            "anchor justification. Then 3-bullet recommendation on which tier to lead with + why."
        ),
    },
    "market_research": {
        "label": "Market Research Brief",
        "fields": ["industry", "geo", "product_description"],
        "system": (
            "You are a market researcher. Produce a 1-page market brief: TAM/SAM/SOM (with the math "
            "shown — even if rough), 3 dominant industry trends, top 3 competitors with their positioning, "
            "white-space opportunities (3 bullets), 5-year industry tailwinds/headwinds. Cite reasoning, "
            "flag where data is uncertain."
        ),
    },
    "competitor_research": {
        "label": "Competitor Teardown",
        "fields": ["my_business_description", "competitor_names_csv"],
        "system": (
            "You are a competitive analyst. Build a comparison table (markdown) covering: pricing, "
            "positioning, distribution channels, weaknesses, customer reviews summary, my advantage. "
            "End with a 4-bullet 'how to win' wedge for the asker's business."
        ),
    },
    "social_content": {
        "label": "Social Content Plan (30 days)",
        "fields": ["business_name", "industry", "primary_platform", "voice_style"],
        "system": (
            "You are a content strategist. Produce a 30-day content plan for the given platform. Each "
            "day: title + 1-line hook + content type (carousel/video/text/poll). Mix: 40% education, 30% "
            "story, 20% offer, 10% social proof. Include 3 pinned-post ideas at the end."
        ),
    },
    "proposal": {
        "label": "Client Proposal Generator",
        "fields": ["client_name", "scope_summary", "deliverables_csv", "fee_amount", "timeline_weeks"],
        "system": (
            "You are a B2B services proposal writer. Produce a clean proposal: 1) Engagement Summary "
            "2) Scope & Deliverables (line-item) 3) Timeline & Milestones (week-by-week) 4) Investment & "
            "Payment Terms 5) Success Metrics 6) Mutual Acceptance block. Confident, no jargon, signature-ready."
        ),
    },
    "invoice": {
        "label": "Invoice / Estimate",
        "fields": ["client_name", "client_address", "line_items_csv", "tax_pct", "due_days"],
        "system": (
            "You are generating an invoice. Output a clean markdown invoice with: header (your business "
            "+ client info), invoice number (random), date issued, due date (today + due_days), itemized "
            "lines with qty/rate/amount, subtotal, tax, total, payment instructions. Concise."
        ),
    },
    "break_even": {
        "label": "Break-Even Calculator",
        "fields": ["fixed_costs_monthly", "avg_unit_price", "avg_unit_variable_cost"],
        "system": (
            "You are a financial analyst. Compute the break-even point. Show: (1) the formula, (2) the "
            "math with numbers substituted, (3) break-even units/month, (4) break-even revenue/month, "
            "(5) break-even units/day assuming 25 sell-days/month, (6) sensitivity table — what changes "
            "if price ±10%, fixed costs ±10%."
        ),
    },
    "roi_calc": {
        "label": "ROI Calculator",
        "fields": ["investment_amount", "expected_monthly_return", "horizon_months"],
        "system": (
            "You are a financial analyst. Compute ROI. Show: total return over horizon, ROI %, "
            "annualized ROI %, payback period (months), IRR (approx). Then 3-bullet sanity check on the "
            "assumptions and what to stress-test."
        ),
    },
    "startup_budget": {
        "label": "Startup Budget Calculator",
        "fields": ["business_name", "industry", "structure", "expected_runway_months"],
        "system": (
            "You are a startup CFO. Build a startup budget table: One-Time Costs (legal, branding, web, "
            "equipment, deposits) + Monthly Operating Costs (rent, payroll, software, marketing, "
            "insurance, misc.) + Recommended Reserve (3-6 months operating). Total cash needed to launch + "
            "reach runway target. Itemized with realistic ranges per industry."
        ),
    },
}


# ──────────────── Request model ────────────────
class GenerateReq(BaseModel):
    tool: str = Field(min_length=1, max_length=50)
    inputs: Dict[str, str] = Field(default_factory=dict)
    user_email: Optional[str] = None
    session_id: Optional[str] = None


def _build_user_message(tool: Dict[str, Any], inputs: Dict[str, str]) -> str:
    lines = [f"Generate a draft {tool['label']} based on the following inputs:\n"]
    for f in tool["fields"]:
        v = (inputs.get(f) or "").strip() or "(not provided)"
        lines.append(f"- **{f.replace('_', ' ')}**: {v}")
    lines.append("\nProduce the document in clean markdown, ready to print or export.")
    return "\n".join(lines)


async def _call_claude(system: str, user_msg: str, session_id: str) -> str:
    if not (LlmChat and LlmUserMessage and EMERGENT_LLM_KEY):
        raise HTTPException(503, "LLM not configured (EMERGENT_LLM_KEY missing)")
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model(
        "anthropic", DEEP_MODEL
    )
    reply = await asyncio.wait_for(
        chat.send_message(LlmUserMessage(text=user_msg)),
        timeout=45.0,
    )
    return str(reply or "").strip()


# ──────────────── Website Builder (Iter 62) ────────────────
WEBSITE_SYSTEM_PROMPT = (
    "You are an elite conversion copywriter and brand strategist. Given a business "
    "description, output a complete website structure as STRICT JSON only. No "
    "preamble. No markdown fences. No commentary outside the JSON. The JSON object "
    "must use exactly these keys:\n"
    "{\n"
    '  "domain": "<short, hyphenated, .com domain stem>",\n'
    '  "brand": "<business name as written>",\n'
    '  "tagline": "<5-10 word memorable tagline>",\n'
    '  "hero": {\n'
    '    "eyebrow": "<short location/industry tag, 2-5 words>",\n'
    '    "headline": "<6-12 word benefit-driven headline>",\n'
    '    "subheadline": "<one sentence, 12-22 words>",\n'
    '    "primary_cta": "<2-4 words, action verb>",\n'
    '    "secondary_cta": "<2-4 words>"\n'
    "  },\n"
    '  "services": [\n'
    '    {"title": "<3-5 words>", "desc": "<1 sentence value prop>", "price": "<\'$X\' or \'Starting at $X\' or null>"},\n'
    "    ... 3 to 4 services\n"
    "  ],\n"
    '  "about": "<2-3 sentence founder/business pitch in first person>",\n'
    '  "trust_points": ["<short bullet>", "<short bullet>", "<short bullet>", "<short bullet>"],\n'
    '  "contact_fields": ["<field 1>", "<field 2>", "<field 3>", "<industry-specific field 4>"],\n'
    '  "contact_cta": "<3-5 words>",\n'
    '  "footer_blurb": "<one sentence>"\n'
    "}\n\n"
    "Adapt copy to the industry. Voice: confident, specific, action-oriented. Avoid "
    "generic phrases like 'world-class' or 'best in class'. Output ONLY the JSON object."
)


class WebsiteGenReq(BaseModel):
    business_idea: str = Field(min_length=4, max_length=600)
    business_name: Optional[str] = Field(default=None, max_length=80)
    industry: Optional[str] = Field(default=None, max_length=80)
    location: Optional[str] = Field(default=None, max_length=80)
    audience: Optional[str] = Field(default=None, max_length=160)
    offer: Optional[str] = Field(default=None, max_length=200)
    session_id: Optional[str] = None
    user_email: Optional[str] = None


class WebsiteIntentReq(BaseModel):
    """Payload from a 'connect a custom domain' or 'publish' click in the
    website-builder preview. All fields optional except `intent`."""
    intent: str = Field(default="domain_intent", max_length=40)
    email: Optional[str] = Field(default=None, max_length=200)
    name: Optional[str] = Field(default=None, max_length=160)
    desired_domain: Optional[str] = Field(default=None, max_length=120)
    business_name: Optional[str] = Field(default=None, max_length=120)
    business_idea: Optional[str] = Field(default=None, max_length=600)
    industry: Optional[str] = Field(default=None, max_length=80)


def _build_website_user_message(p: "WebsiteGenReq") -> str:
    parts = [f"BUSINESS IDEA: {p.business_idea}"]
    if p.business_name:
        parts.append(f"BUSINESS NAME: {p.business_name}")
    if p.industry:
        parts.append(f"INDUSTRY: {p.industry}")
    if p.location:
        parts.append(f"LOCATION: {p.location}")
    if p.audience:
        parts.append(f"TARGET CUSTOMER: {p.audience}")
    if p.offer:
        parts.append(f"OFFER / PRICING: {p.offer}")
    parts.append("\nReturn the website JSON now.")
    return "\n".join(parts)


def _extract_site_json(text: str) -> Optional[Dict[str, Any]]:
    """Tolerate fenced or prefixed JSON. Returns parsed dict or None."""
    if not text:
        return None
    s = text.strip()
    # Strip ```json ... ``` fence if present
    if s.startswith("```"):
        parts = s.split("```")
        # parts = ["", "json\n{...}\n", "", ...]
        if len(parts) >= 2:
            s = parts[1]
            if s.lower().lstrip().startswith("json"):
                s = s.lstrip()[4:]
        s = s.strip()
    # Direct parse first
    try:
        return json.loads(s)
    except Exception:
        pass
    # Fallback: slice between first { and last }
    try:
        first = s.find("{")
        last = s.rfind("}")
        if first >= 0 and last > first:
            return json.loads(s[first: last + 1])
    except Exception:
        return None
    return None


# ──────────────── ROUTER ────────────────
def make_business_builder_router(db) -> APIRouter:
    router = APIRouter(prefix="/api/business-builder", tags=["business-builder"])

    @router.get("/tools")
    async def list_tools():
        # Public catalog — frontend uses this to render the tool picker
        return {
            "tools": [
                {"key": k, "label": v["label"], "fields": v["fields"]}
                for k, v in TOOLS.items()
            ]
        }

    @router.post("/generate")
    async def generate(payload: GenerateReq):
        tool = TOOLS.get(payload.tool)
        if not tool:
            raise HTTPException(400, f"Unknown tool. Available: {sorted(TOOLS.keys())}")
        session_id = payload.session_id or f"bb_{uuid.uuid4()}"
        system = tool["system"] + (
            "\n\nWrite in clean markdown. No preamble. No 'Here's your...'. Start with the title and the content. "
            "Always include the disclaimer at the end."
        )
        user_msg = _build_user_message(tool, payload.inputs)

        try:
            raw = await _call_claude(system, user_msg, session_id)
        except asyncio.TimeoutError:
            raise HTTPException(504, "LLM timed out — try again with shorter inputs")
        except HTTPException:
            raise
        except Exception as e:
            log.error(f"business-builder generate failed: {e}")
            raise HTTPException(500, f"Generation failed: {str(e)[:200]}")

        if not raw:
            raise HTTPException(502, "LLM returned empty content")

        markdown = raw + DISCLAIMER

        # Persist to history (best-effort)
        try:
            await db.business_builder_runs.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "tool": payload.tool,
                "tool_label": tool["label"],
                "user_email": payload.user_email,
                "inputs": payload.inputs,
                "output_chars": len(markdown),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            pass

        return {
            "ok": True,
            "tool": payload.tool,
            "tool_label": tool["label"],
            "session_id": session_id,
            "markdown": markdown,
        }

    @router.post("/history")
    async def history(payload: BaseModel):
        # Stub for future founder-side analytics. Not a hard requirement now.
        return {"ok": True, "runs": []}

    # ─────────── Iter 62 · Website Builder (real-time site generation) ──────────
    @router.post("/website-generate")
    async def website_generate(payload: WebsiteGenReq):
        if not (LlmChat and LlmUserMessage and EMERGENT_LLM_KEY):
            raise HTTPException(503, "LLM not configured (EMERGENT_LLM_KEY missing)")
        session_id = payload.session_id or f"wb_{uuid.uuid4()}"
        user_msg = _build_website_user_message(payload)
        try:
            raw = await asyncio.wait_for(
                LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id,
                        system_message=WEBSITE_SYSTEM_PROMPT)
                .with_model("anthropic", DEEP_MODEL)
                .send_message(LlmUserMessage(text=user_msg)),
                timeout=45.0,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, "Website generator timed out — try again")
        except Exception as e:
            log.error(f"website-generate failed: {e}")
            raise HTTPException(500, f"Generation failed: {str(e)[:200]}")

        text = str(raw or "").strip()
        # Tolerate stray prose: extract the first JSON object between { and }
        site = _extract_site_json(text)
        if not site:
            raise HTTPException(502, "LLM returned unparseable content")

        # Best-effort persist
        try:
            await db.business_builder_runs.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "tool": "website_builder",
                "tool_label": "Website Builder",
                "user_email": payload.user_email,
                "inputs": payload.model_dump(exclude={"session_id", "user_email"}),
                "output_chars": len(text),
                "site": site,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            pass

        return {"ok": True, "tool": "website_builder", "session_id": session_id, "site": site}

    # ─────────── Iter 62 · Website intent capture (publish / domain) ──────────
    @router.post("/website-intent")
    async def website_intent(payload: WebsiteIntentReq):
        """Capture a publish/domain intent click from the website-builder preview.

        Lightweight conversion event:
          - upsert lead in leads_registry (assigned to founder)
          - log a dark_funnel_event row
          - bump signal_score with touch_signal (+22 / +28)
          - never raises — surface a stable {ok} response to the UI
        """
        from lead_registry import upsert_lead
        from signal_scoring import touch_signal

        kind = (payload.intent or "domain_intent").strip()
        if kind not in ("domain_intent", "publish_intent"):
            kind = "domain_intent"

        # 1. Upsert lead (if email provided) — otherwise log anonymous event
        lead_id: Optional[str] = None
        if payload.email and "@" in payload.email:
            try:
                up = await upsert_lead(db, {
                    "name": (payload.name or payload.business_name or "Website builder visitor")[:160],
                    "email": payload.email.strip().lower()[:200],
                    "company": (payload.business_name or "")[:160] or None,
                    "industry": (payload.industry or "")[:80] or None,
                    "source": "website_builder",
                    "notes": (
                        f"Intent: {kind}; desired_domain={payload.desired_domain or '—'}; "
                        f"idea={(payload.business_idea or '')[:200]}"
                    ),
                })
                lead_id = (up.get("lead") or {}).get("lead_id")
            except Exception as e:
                log.warning(f"website-intent upsert failed: {e}")

        # 2. Dark funnel event row (always, anonymous OK)
        try:
            await db.dark_funnel_events.insert_one({
                "id": str(uuid.uuid4()),
                "lead_id": lead_id,
                "kind": kind,
                "source": "website_builder",
                "email": payload.email,
                "desired_domain": payload.desired_domain,
                "business_name": payload.business_name,
                "industry": payload.industry,
                "ts": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            log.warning(f"website-intent funnel-event insert failed: {e}")

        # 3. Bump signal score on the lead
        if lead_id:
            try:
                await touch_signal(db, lead_id, kind, reason=payload.desired_domain or "website-builder")
            except Exception as e:
                log.warning(f"website-intent signal bump failed: {e}")

        return {
            "ok": True,
            "lead_id": lead_id,
            "intent": kind,
            "queued": "Founder will reach out to wire up your domain shortly.",
        }

    return router


__all__ = ["make_business_builder_router", "TOOLS"]
