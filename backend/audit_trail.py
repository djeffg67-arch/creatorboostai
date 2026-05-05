"""Sovereign Audit Trail · Phase 1 (Iter 61)

Internal traceability — every major AI action emits a structured "Rationale Package":
  - decision_id (uuid)
  - timestamp (utc iso)
  - agent_id (e.g., "cfo_business_case", "orchestrator.researcher")
  - action (short verb · "generate_cfo_case", "send_outreach_email", "score_signal")
  - lead_id (optional join key)
  - data_sources []  · what fed the decision (lead fields, prompt, model)
  - reasoning_summary  · 1-3 sentences in plain English
  - confidence (0-100)
  - inputs_preview (truncated)
  - output_preview (truncated)
  - meta (free-form k/v · model name, latency_ms, retry_count, etc.)

Storage: collection `sovereign_audit_trail` (compound index on lead_id+ts desc).
Phase 1 explicitly excludes: regulatory ingestion, legal automation, external
compliance feeds. This is internal traceability first — we make the system close
deals, then enterprise.
"""
from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("audit_trail")

MAX_PREVIEW = 800  # chars
MAX_REASONING = 600


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _truncate(s: Any, n: int) -> str:
    if s is None:
        return ""
    if not isinstance(s, str):
        try:
            import json as _json
            s = _json.dumps(s, default=str)[:n]
        except Exception:
            s = str(s)[:n]
    return s if len(s) <= n else s[:n] + "…"


async def record_decision(
    db,
    *,
    agent_id: str,
    action: str,
    reasoning_summary: str,
    data_sources: Optional[List[str]] = None,
    confidence: Optional[int] = None,
    lead_id: Optional[str] = None,
    inputs_preview: Any = None,
    output_preview: Any = None,
    meta: Optional[Dict[str, Any]] = None,
) -> str:
    """Persist a Rationale Package. Returns decision_id.

    Best-effort: never raises — audit must NEVER block an action.
    """
    decision_id = str(uuid.uuid4())
    try:
        # clamp confidence
        conf = None
        if confidence is not None:
            try:
                conf = max(0, min(100, int(confidence)))
            except Exception:
                conf = None
        doc = {
            "decision_id": decision_id,
            "timestamp": _now_iso(),
            "agent_id": agent_id[:80],
            "action": action[:80],
            "lead_id": lead_id,
            "data_sources": (data_sources or [])[:20],
            "reasoning_summary": _truncate(reasoning_summary, MAX_REASONING),
            "confidence": conf,
            "inputs_preview": _truncate(inputs_preview, MAX_PREVIEW),
            "output_preview": _truncate(output_preview, MAX_PREVIEW),
            "meta": meta or {},
        }
        await db.sovereign_audit_trail.insert_one(doc)
    except Exception as e:
        log.warning(f"audit record failed: {e}")
    return decision_id


# ──────────────── Router ────────────────
class FounderAuth(BaseModel):
    email: str
    token: str


class TrailQuery(BaseModel):
    email: str
    token: str
    lead_id: Optional[str] = None
    agent_id: Optional[str] = None
    action: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)


def make_audit_router(db, require_founder=None) -> APIRouter:
    router = APIRouter(prefix="/api/audit", tags=["sovereign-audit-trail"])

    @router.post("/list")
    async def list_decisions(payload: TrailQuery):
        if require_founder:
            await require_founder(FounderAuth(email=payload.email, token=payload.token))
        q: Dict[str, Any] = {}
        if payload.lead_id:
            q["lead_id"] = payload.lead_id
        if payload.agent_id:
            q["agent_id"] = payload.agent_id
        if payload.action:
            q["action"] = payload.action
        rows = await db.sovereign_audit_trail.find(q, {"_id": 0}) \
            .sort("timestamp", -1).limit(payload.limit).to_list(payload.limit)
        return {"decisions": rows, "total": len(rows)}

    @router.post("/detail")
    async def detail(payload: dict):
        try:
            q = TrailQuery(**{**payload, "limit": 1})
        except Exception:
            raise HTTPException(400, "missing email/token")
        if require_founder:
            await require_founder(FounderAuth(email=q.email, token=q.token))
        decision_id = (payload or {}).get("decision_id")
        if not decision_id:
            raise HTTPException(400, "decision_id required")
        row = await db.sovereign_audit_trail.find_one(
            {"decision_id": decision_id}, {"_id": 0}
        )
        if not row:
            raise HTTPException(404, "decision not found")
        return row

    @router.post("/lead-trail")
    async def lead_trail(payload: TrailQuery):
        """Compact rationale trail for one lead — used by the founder lead drawer."""
        if require_founder:
            await require_founder(FounderAuth(email=payload.email, token=payload.token))
        if not payload.lead_id:
            raise HTTPException(400, "lead_id required")
        rows = await db.sovereign_audit_trail.find(
            {"lead_id": payload.lead_id},
            {"_id": 0, "decision_id": 1, "timestamp": 1, "agent_id": 1,
             "action": 1, "reasoning_summary": 1, "confidence": 1,
             "data_sources": 1},
        ).sort("timestamp", -1).limit(payload.limit).to_list(payload.limit)
        return {"trail": rows, "total": len(rows)}

    return router


__all__ = ["make_audit_router", "record_decision"]
