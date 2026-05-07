"""Production Data Hygiene · Iter 70

Tags every prospect as `is_test=true` or `is_test=false` based on email/source
patterns, and hard-archives test rows so:
  1. The autopilot cycle skips them.
  2. The dashboard / Operator View counts production prospects only by default.
  3. Existing audit trail / replies / events stay untouched (preserved).

Detection rules (any match → is_test=true):
  - email matches @example.com / @*.test / @*.invalid / @*.local / @*.localdev / @*.tld
  - email starts with test_ / TEST_
  - business_name starts with TEST / TEST_
  - source IN {internal_seed, internal_archived, demo_capture, demo_session, test, seed, dev, local, mock}

Endpoint exposed:
  POST /api/ops/outbound/admin/data-hygiene/scan      → preview counts
  POST /api/ops/outbound/admin/data-hygiene/apply     → write `is_test` flags + archive
  POST /api/ops/outbound/admin/data-hygiene/status    → live mode summary
"""
from __future__ import annotations

import os
import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

log = logging.getLogger("data_hygiene")

# ─────────────── Detection ───────────────
TEST_EMAIL_DOMAIN_PATTERN = re.compile(
    # @example.com OR @*.{test,invalid,local,localdev,tld,fake,mock,sample,example}
    r"@(?:example\.com|test\.com|.*\.(?:test|invalid|local|localdev|tld|fake|mock|sample|example))$",
    re.IGNORECASE,
)
TEST_EMAIL_PREFIX_PATTERN = re.compile(
    r"^(?:test[_\-]|qa[._\-]|smoke[._\-]|iter\d+[._\-]|autotrigger|auto[._\-]?trigger|ba[._\-]?yes)",
    re.IGNORECASE,
)
TEST_NAME_PREFIX_PATTERN = re.compile(
    r"^(?:TEST[_\s\-]|Iter\d+|AutoTrigger|Smoke[_\s\-]?Test|QA[_\s\-])",
    re.IGNORECASE,
)
TEST_SOURCE_PREFIXES = {
    "internal_seed", "internal_archived", "demo_capture", "demo_session",
    "test", "seed", "dev", "local", "mock", "fake",
}


def is_test_record(prospect: Dict[str, Any]) -> Dict[str, Any]:
    """Returns {is_test: bool, reasons: [...]}."""
    reasons: List[str] = []
    email = (prospect.get("email") or "").strip().lower()
    name = (prospect.get("business_name") or "").strip()
    source = (prospect.get("source") or "").strip().lower()

    if email:
        if TEST_EMAIL_DOMAIN_PATTERN.search(email):
            reasons.append("test_email_domain")
        if TEST_EMAIL_PREFIX_PATTERN.match(email):
            reasons.append("test_email_prefix")
    if name and TEST_NAME_PREFIX_PATTERN.match(name):
        reasons.append("test_business_name")
    if source:
        # `state_filings:*`, `apollo`, `clearbit`, `manual`, `csv_upload` are real.
        # Match against known test source prefixes.
        for prefix in TEST_SOURCE_PREFIXES:
            if source == prefix or source.startswith(f"{prefix}:") or source.startswith(f"{prefix}_"):
                reasons.append(f"source_{prefix}")
                break

    return {"is_test": bool(reasons), "reasons": reasons}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─────────────── Models ───────────────
class HygieneAuth(BaseModel):
    email: str
    token: str


class HygieneApply(BaseModel):
    email: str
    token: str
    archive: bool = True
    add_to_suppression: bool = True


# ─────────────── Router ───────────────
def make_data_hygiene_router(db, require_founder) -> APIRouter:
    router = APIRouter(prefix="/api/ops/outbound/admin/data-hygiene", tags=["data-hygiene"])

    @router.post("/scan")
    async def scan(payload: HygieneAuth):
        """Preview — count test/demo records by detection rule. No writes."""
        await require_founder(payload)

        # Tally by reason via aggregation
        total = await db.outbound_prospects.count_documents({})
        already_tagged = await db.outbound_prospects.count_documents({"is_test": True})

        sample: List[Dict[str, Any]] = []
        cursor = db.outbound_prospects.find(
            {},
            {"_id": 0, "id": 1, "email": 1, "business_name": 1, "source": 1, "status": 1, "is_test": 1},
        ).limit(2000)
        async for doc in cursor:
            tag = is_test_record(doc)
            if tag["is_test"]:
                sample.append({**doc, "_reasons": tag["reasons"]})

        # Count by source for context
        source_counts: List[Dict[str, Any]] = []
        async for r in db.outbound_prospects.aggregate([
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]):
            source_counts.append({"source": r["_id"] or "<null>", "count": r["count"]})

        # Count by reason
        reason_counts: Dict[str, int] = {}
        for s in sample:
            for r in s["_reasons"]:
                reason_counts[r] = reason_counts.get(r, 0) + 1

        return {
            "ok": True,
            "total_prospects": total,
            "already_tagged_test": already_tagged,
            "test_records_detected": len(sample),
            "production_records_estimate": total - len(sample),
            "by_reason": reason_counts,
            "by_source": source_counts,
            "sample": sample[:25],
        }

    @router.post("/apply")
    async def apply(payload: HygieneApply):
        """Tag every detected test record with `is_test=true` + archive_at + skip_send=true.
        Optionally adds them to outbound_suppression so they can NEVER be sent to.
        Idempotent — running twice is safe."""
        await require_founder(payload)

        now = _now_iso()
        tagged = 0
        archived = 0
        suppressed_added = 0

        cursor = db.outbound_prospects.find({}, {"_id": 0, "id": 1, "email": 1,
                                                  "business_name": 1, "source": 1})
        async for doc in cursor:
            tag = is_test_record(doc)
            if not tag["is_test"]:
                continue
            update_set: Dict[str, Any] = {
                "is_test": True,
                "test_reasons": tag["reasons"],
                "tagged_test_at": now,
            }
            if payload.archive:
                update_set["status"] = "archived_test"
                update_set["skip_send"] = True
                update_set["archived_at"] = now
                archived += 1
            try:
                await db.outbound_prospects.update_one({"id": doc["id"]}, {"$set": update_set})
                tagged += 1
            except Exception as e:
                log.warning(f"[data-hygiene] tag failed for {doc.get('id')}: {e}")
                continue

            # Suppression list
            if payload.add_to_suppression and doc.get("email"):
                e = (doc.get("email") or "").strip().lower()
                try:
                    existing = await db.outbound_suppression.find_one({"email": e}, {"_id": 0})
                    if not existing:
                        await db.outbound_suppression.insert_one({
                            "email": e,
                            "reason": "data_hygiene_test_record",
                            "ts": now,
                        })
                        suppressed_added += 1
                except Exception as e2:
                    log.warning(f"[data-hygiene] suppress failed for {e}: {e2}")

        return {
            "ok": True,
            "tagged": tagged,
            "archived": archived,
            "suppressed_added": suppressed_added,
            "applied_at": now,
        }

    @router.post("/status")
    async def status(payload: HygieneAuth):
        """Live snapshot — production vs. test counts + send-from + Resend status."""
        await require_founder(payload)

        total = await db.outbound_prospects.count_documents({})
        test = await db.outbound_prospects.count_documents({"is_test": True})
        archived = await db.outbound_prospects.count_documents({"status": "archived_test"})
        production_eligible = await db.outbound_prospects.count_documents({
            "is_test": {"$ne": True},
            "status": {"$nin": ["archived_test", "unsubscribed"]},
            "unsubscribed": {"$ne": True},
            "suppressed": {"$ne": True},
        })

        # Send-from configuration
        from_email = (
            os.environ.get("OUTBOUND_FROM_EMAIL")
            or os.environ.get("FROM_EMAIL")
            or os.environ.get("RESEND_FROM_EMAIL")
            or "info@creatorboostai.com"
        )
        resend_configured = bool(os.environ.get("RESEND_API_KEY"))
        imap_configured = all(os.environ.get(k, "").strip() for k in ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"))

        # Engine state
        camp = await db.outbound_campaign_state.find_one({}, {"_id": 0}) or {}
        paused = bool(camp.get("paused"))

        # Production mode label
        if not resend_configured:
            mode = "sandbox"
            mode_reason = "RESEND_API_KEY not configured · sends are logged but not delivered"
        elif paused:
            mode = "paused"
            mode_reason = camp.get("pause_reason") or "engine paused by operator"
        elif test > 0 and archived < test:
            mode = "mixed"
            mode_reason = f"{test - archived} test records still unarchived"
        else:
            mode = "production"
            mode_reason = "Live · sends from Resend · production prospects only"

        return {
            "ok": True,
            "mode": mode,
            "mode_reason": mode_reason,
            "totals": {
                "all_prospects": total,
                "test_records": test,
                "archived_test": archived,
                "production_eligible": production_eligible,
            },
            "send_from": from_email,
            "resend_configured": resend_configured,
            "imap_configured": imap_configured,
            "paused": paused,
            "checked_at": _now_iso(),
        }

    return router


__all__ = ["make_data_hygiene_router", "is_test_record", "compute_mode_summary"]


async def compute_mode_summary(db) -> Dict[str, Any]:
    """Reusable mode probe — returns the same {mode, mode_reason, resend_configured, paused}
    payload that `/data-hygiene/status` returns. Imported by other modules
    (e.g. outbound `live-pulse`) to surface a truthful production/sandbox label.
    """
    total = await db.outbound_prospects.count_documents({})
    test = await db.outbound_prospects.count_documents({"is_test": True})
    archived = await db.outbound_prospects.count_documents({"status": "archived_test"})
    production_eligible = await db.outbound_prospects.count_documents({
        "is_test": {"$ne": True},
        "status": {"$nin": ["archived_test", "unsubscribed"]},
        "unsubscribed": {"$ne": True},
        "suppressed": {"$ne": True},
    })
    resend_configured = bool(os.environ.get("RESEND_API_KEY"))
    camp = await db.outbound_campaign_state.find_one({}, {"_id": 0}) or {}
    paused = bool(camp.get("paused"))
    if not resend_configured:
        mode = "sandbox"
        mode_reason = "RESEND_API_KEY not configured · sends are logged but not delivered"
    elif paused:
        mode = "paused"
        mode_reason = camp.get("pause_reason") or "engine paused by operator"
    elif test > 0 and archived < test:
        mode = "mixed"
        mode_reason = f"{test - archived} test records still unarchived"
    else:
        mode = "production"
        mode_reason = "Live · sends from Resend · production prospects only"
    return {
        "mode": mode,
        "mode_reason": mode_reason,
        "resend_configured": resend_configured,
        "paused": paused,
        "totals": {
            "all_prospects": total,
            "test_records": test,
            "archived_test": archived,
            "production_eligible": production_eligible,
        },
    }
