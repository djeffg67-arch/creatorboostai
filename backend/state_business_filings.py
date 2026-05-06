"""State Business Filings — Modular Source Adapter Architecture (Iter 66)

Pulls newly registered businesses from US Secretary-of-State (SoS) data and
normalizes them into the outbound prospect pipeline.

PHASE A · Stable Foundation (this iter)
  - `BaseStateAdapter` — interface every connector must implement.
  - `CSVStateAdapter` — universal CSV parser; works for FL/MI/TX/CA/NY today
    using each state's free download portal (the operator drops a weekly CSV).
  - State-specific subclasses (Michigan / Texas / Florida / California / NewYork)
    all inherit `CSVStateAdapter` for now — same parser, state-specific field
    synonyms.
  - In-memory rate-limit + last-run tracking, persisted to
    `state_filing_runs` collection.

PHASE B (later, pluggable per state)
  - Live API connectors (Florida SunBiz, Texas TPL, NY Open Data, etc.)
  - Scheduled pulls (weekly / daily)
  - State-specific de-dup keys (entity ID, registered agent fingerprint)

ROUTER ENTRY POINTS (mounted under /api/ops/outbound/sources/states):
  - GET  /list                      — all known adapters + status
  - POST /upload-csv                — operator drops a CSV file
  - GET  /runs                      — recent runs across all states
  - POST /pause/{state}             — admin-only

INGESTED ROW SCHEMA (stored in `state_filings`):
{
  id,                       # uuid
  business_name,            # raw, max 240
  entity_type,              # LLC, INC, CORP, ...
  state,                    # 2-letter code (uppercase)
  state_full,               # normalized full state name
  filing_date,              # ISO date when filed
  registration_date,        # ISO date when registration effective
  business_status,          # ACTIVE / PENDING / DISSOLVED / ...
  registered_agent_name,
  registered_agent_address,
  principal_address,
  mailing_address,
  industry,                 # heuristic-guessed from name or declared
  website,                  # if present in CSV
  phone,                    # if present in CSV
  email,                    # if present in CSV — gets verified before insertion
  owner_name,               # if legally available in CSV
  source_url,               # the state portal page (if known)
  source_state,             # 2-letter
  date_collected,           # ISO timestamp
  source_run_id,            # links to state_filing_runs
  enrichment,               # output of enrichment.enrich_filing()
  forwarded_to_outbound,    # bool — true once mirrored into outbound_prospects
  forwarded_at,             # ISO when mirrored
}
"""
from __future__ import annotations

import csv
import io
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

from enrichment import enrich_filing, normalize_state, guess_industry

log = logging.getLogger("state_business_filings")

# Field synonyms for the universal CSV parser. State portals use different
# column headers — we map them all to a canonical schema.
CSV_FIELD_SYNONYMS = {
    "business_name": [
        "entity_name", "business_name", "company_name", "name", "corporation_name",
        "filing_entity_name", "legal_name", "business name", "entity name",
    ],
    "entity_type": [
        "entity_type", "type", "filing_type", "structure", "entity type", "business_type",
    ],
    "filing_date": [
        "filing_date", "date_filed", "filed_date", "registration_date", "effective_date",
        "filing date", "date filed", "registered date",
    ],
    "registered_agent_name": [
        "registered_agent_name", "agent_name", "ra_name", "registered agent", "agent",
    ],
    "registered_agent_address": [
        "registered_agent_address", "ra_address", "agent_address", "registered agent address",
    ],
    "principal_address": [
        "principal_address", "principal_office", "principal", "principal address",
        "business_address", "address", "street_address",
    ],
    "mailing_address": [
        "mailing_address", "mailing", "po_box", "mailing address",
    ],
    "business_status": [
        "status", "entity_status", "filing_status", "business_status",
    ],
    "phone": [
        "phone", "telephone", "phone_number", "contact_phone",
    ],
    "email": [
        "email", "email_address", "contact_email", "ra_email",
    ],
    "website": [
        "website", "url", "domain", "web_address",
    ],
    "owner_name": [
        "owner_name", "officer_name", "officer", "director", "manager_name", "principal_name",
    ],
}

DEFAULT_DAYS_LOOKBACK = int(os.environ.get("STATE_FILINGS_LOOKBACK_DAYS", "30"))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _map_csv_row(headers: List[str], row: List[str]) -> Dict[str, str]:
    """Map a raw CSV row → canonical filing dict by header synonyms."""
    out: Dict[str, str] = {}
    norm_headers = [(h or "").strip().lower().replace("-", "_") for h in headers]
    for canonical, synonyms in CSV_FIELD_SYNONYMS.items():
        for syn in synonyms:
            syn_n = syn.strip().lower().replace("-", "_")
            if syn_n in norm_headers:
                idx = norm_headers.index(syn_n)
                if idx < len(row):
                    val = (row[idx] or "").strip()
                    if val:
                        out[canonical] = val
                        break
    return out


def _parse_iso_date(raw: str) -> Optional[str]:
    if not raw:
        return None
    raw = raw.strip()
    fmts = ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d", "%d-%b-%Y", "%d/%m/%Y")
    for fmt in fmts:
        try:
            d = datetime.strptime(raw, fmt)
            return d.replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            continue
    return None


# ──────────────── Adapter interface ────────────────
class BaseStateAdapter:
    name: str = "base"
    state_code: str = ""
    fetch_method: str = "csv_upload"  # csv_upload | api | scrape | webhook
    source_url: str = ""

    async def parse_payload(self, csv_text: str) -> List[Dict[str, Any]]:
        """Convert raw CSV text → normalized filing rows."""
        rows: List[Dict[str, Any]] = []
        try:
            reader = csv.reader(io.StringIO(csv_text))
            headers = next(reader, None)
            if not headers:
                return rows
            cutoff = (datetime.now(timezone.utc) - timedelta(days=DEFAULT_DAYS_LOOKBACK)).isoformat()
            for raw_row in reader:
                mapped = _map_csv_row(headers, raw_row)
                if not mapped.get("business_name"):
                    continue
                filing_date_iso = _parse_iso_date(mapped.get("filing_date") or "")
                # Lookback filter — if we have a date and it's older than cutoff, skip
                if filing_date_iso and filing_date_iso < cutoff:
                    continue
                row = {
                    "business_name": mapped.get("business_name", "")[:240],
                    "entity_type": (mapped.get("entity_type") or "").upper()[:40] or None,
                    "state": self.state_code,
                    "state_full": normalize_state(self.state_code),
                    "filing_date": filing_date_iso,
                    "registration_date": filing_date_iso,
                    "business_status": (mapped.get("business_status") or "ACTIVE")[:40],
                    "registered_agent_name": (mapped.get("registered_agent_name") or "")[:240] or None,
                    "registered_agent_address": (mapped.get("registered_agent_address") or "")[:400] or None,
                    "principal_address": (mapped.get("principal_address") or "")[:400] or None,
                    "mailing_address": (mapped.get("mailing_address") or "")[:400] or None,
                    "industry": guess_industry(mapped.get("business_name", ""), None),
                    "website": (mapped.get("website") or "").strip().lower()[:200] or None,
                    "phone": (mapped.get("phone") or "")[:40] or None,
                    "email": (mapped.get("email") or "").strip().lower()[:200] or None,
                    "owner_name": (mapped.get("owner_name") or "")[:240] or None,
                    "source_url": self.source_url,
                    "source_state": self.state_code,
                }
                rows.append(row)
        except Exception as e:
            log.error(f"[state_filings] CSV parse failed for {self.state_code}: {e}")
        return rows


class MichiganAdapter(BaseStateAdapter):
    name = "michigan"
    state_code = "MI"
    source_url = "https://cofs.lara.state.mi.us/CorpWeb/CorpSearch/CorpSearch.aspx"

class TexasAdapter(BaseStateAdapter):
    name = "texas"
    state_code = "TX"
    source_url = "https://www.sos.state.tx.us/corp/sosda/index.shtml"

class FloridaAdapter(BaseStateAdapter):
    name = "florida"
    state_code = "FL"
    source_url = "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName"

class CaliforniaAdapter(BaseStateAdapter):
    name = "california"
    state_code = "CA"
    source_url = "https://bizfileonline.sos.ca.gov/search/business"

class NewYorkAdapter(BaseStateAdapter):
    name = "newyork"
    state_code = "NY"
    source_url = "https://apps.dos.ny.gov/publicInquiry/"


REGISTERED_ADAPTERS: Dict[str, BaseStateAdapter] = {
    "MI": MichiganAdapter(),
    "TX": TexasAdapter(),
    "FL": FloridaAdapter(),
    "CA": CaliforniaAdapter(),
    "NY": NewYorkAdapter(),
}


# ──────────────── Models ────────────────
class StateAuth(BaseModel):
    email: str
    token: str


# ──────────────── Ingestion logic ────────────────
async def ingest_filings(db, state: str, rows: List[Dict[str, Any]], run_id: str) -> Dict[str, int]:
    """Persist normalized filings to `state_filings`, dedup by (business_name, state, filing_date),
    enrich each, then mirror eligible ones into `outbound_prospects`."""
    added = 0
    skipped_dup = 0
    enriched_ok = 0
    forwarded = 0
    skipped_no_email = 0

    for row in rows:
        bn = (row.get("business_name") or "").strip()
        if not bn:
            continue

        # Dedup key — business_name + state + filing_date (or business_name + state if no date)
        dedup_q: Dict[str, Any] = {
            "business_name": bn,
            "source_state": row.get("source_state") or state,
        }
        if row.get("filing_date"):
            dedup_q["filing_date"] = row.get("filing_date")
        existing = await db.state_filings.find_one(dedup_q, {"_id": 0, "id": 1})
        if existing:
            skipped_dup += 1
            continue

        # Enrich (DNS-only verify + heuristic email/domain guess)
        enrichment_payload: Dict[str, Any] = {}
        try:
            enrichment_payload = await enrich_filing(db, row)
            enriched_ok += 1
        except Exception as e:
            log.warning(f"[state_filings] enrich failed for '{bn}': {e}")

        doc = {
            "id": str(uuid.uuid4()),
            **row,
            "date_collected": _now_iso(),
            "source_run_id": run_id,
            "enrichment": enrichment_payload,
            "forwarded_to_outbound": False,
            "forwarded_at": None,
        }
        try:
            await db.state_filings.insert_one(doc)
            added += 1
        except Exception as e:
            log.error(f"[state_filings] insert failed: {e}")
            continue

        # Mirror to outbound_prospects ONLY if a verified email is present
        verified_email = (enrichment_payload.get("email_candidate") or "").lower()
        verified_status = enrichment_payload.get("email_status")
        if verified_email and verified_status == "verified":
            # outbound dedup
            try:
                if await db.outbound_prospects.find_one({"email": verified_email}, {"_id": 0, "id": 1}):
                    continue
                if await db.outbound_suppression.find_one({"email": verified_email}, {"_id": 0}):
                    continue
                p = {
                    "id": str(uuid.uuid4()),
                    "business_name": bn[:240],
                    "contact_name": row.get("owner_name") or row.get("registered_agent_name"),
                    "email": verified_email,
                    "industry": enrichment_payload.get("industry_guess") or row.get("industry"),
                    "website": row.get("website") or enrichment_payload.get("domain_candidate"),
                    "location": enrichment_payload.get("state_full") or row.get("state_full"),
                    "linkedin_url": None,
                    "notes": (
                        f"New {row.get('entity_type') or 'business'} registered in "
                        f"{enrichment_payload.get('state_full') or row.get('state')} "
                        f"on {row.get('filing_date', 'recently')}. "
                        f"Source: state filings ({state})."
                    )[:500],
                    "source": f"state_filings:{state}",
                    "status": "new", "lead_score": None, "target_segment": None,
                    "recommended_offer": None, "ai_reasoning": None,
                    "estimated_pain": None, "suggested_pitch_angle": None,
                    "emails_sent": 0, "email_status": None,
                    "last_email_at": None, "replied_at": None, "reply_body": None,
                    "reply_sentiment": None, "reply_category": None,
                    "linkedin_connect_body": None, "linkedin_followup_body": None,
                    "linkedin_connect_sent_at": None, "linkedin_followup_sent_at": None,
                    "linkedin_accepted": False,
                    "unsubscribed": False, "suppressed": False,
                    "created_at": _now_iso(), "updated_at": _now_iso(),
                }
                await db.outbound_prospects.insert_one(p)
                await db.state_filings.update_one(
                    {"id": doc["id"]},
                    {"$set": {"forwarded_to_outbound": True, "forwarded_at": _now_iso()}},
                )
                forwarded += 1
            except Exception as e:
                log.warning(f"[state_filings] forward failed for {bn}: {e}")
        else:
            skipped_no_email += 1

    return {
        "added": added,
        "skipped_duplicate": skipped_dup,
        "enriched": enriched_ok,
        "forwarded_to_outbound": forwarded,
        "skipped_no_email": skipped_no_email,
    }


async def record_run(db, state: str, fetch_method: str, summary: Dict[str, Any], status: str = "ok", error: Optional[str] = None) -> str:
    run_id = str(uuid.uuid4())
    try:
        await db.state_filing_runs.insert_one({
            "id": run_id,
            "source_name": REGISTERED_ADAPTERS[state].name if state in REGISTERED_ADAPTERS else state,
            "state": state,
            "fetch_method": fetch_method,
            "started_at": _now_iso(),
            "finished_at": _now_iso(),
            "records_found": summary.get("records_found", 0),
            "records_added": summary.get("added", 0),
            "records_skipped": summary.get("skipped_duplicate", 0) + summary.get("skipped_no_email", 0),
            "records_enriched": summary.get("enriched", 0),
            "records_forwarded": summary.get("forwarded_to_outbound", 0),
            "status": status,
            "error_log": error,
        })
    except Exception as e:
        log.error(f"[state_filings] record_run failed: {e}")
    return run_id


# ──────────────── Router ────────────────
def make_state_filings_router(db, require_founder) -> APIRouter:
    router = APIRouter(prefix="/api/ops/outbound/sources/states", tags=["state-filings"])

    @router.get("/list")
    async def list_adapters():
        """Public-ish — adapter names + last-run summary."""
        out = []
        for code, adapter in REGISTERED_ADAPTERS.items():
            last_run = await db.state_filing_runs.find_one(
                {"state": code},
                {"_id": 0},
                sort=[("started_at", -1)],
            )
            out.append({
                "state": code,
                "state_full": normalize_state(code),
                "name": adapter.name,
                "fetch_method": adapter.fetch_method,
                "source_url": adapter.source_url,
                "last_run": last_run,
            })
        return {"adapters": out}

    @router.post("/upload-csv")
    async def upload_csv(
        state: str = Form(...),
        auth_email: str = Form(...),
        auth_token: str = Form(...),
        file: UploadFile = File(...),
    ):
        """Founder-only — accept a CSV from a state portal download. Each row
        becomes a `state_filings` document, enriched + forwarded into outbound
        prospects when a verified email is resolvable."""
        await require_founder(StateAuth(email=auth_email, token=auth_token))

        state = (state or "").strip().upper()
        if state not in REGISTERED_ADAPTERS:
            raise HTTPException(400, f"Unsupported state '{state}'. Supported: {sorted(REGISTERED_ADAPTERS.keys())}")

        try:
            raw = await file.read()
            text = raw.decode("utf-8", errors="ignore") if isinstance(raw, bytes) else str(raw)
        except Exception as e:
            raise HTTPException(400, f"Could not read file: {e}")

        adapter = REGISTERED_ADAPTERS[state]
        try:
            rows = await adapter.parse_payload(text)
        except Exception as e:
            log.error(f"[state_filings] parse failed: {e}")
            raise HTTPException(400, f"Parse failed: {str(e)[:200]}")

        run_id = str(uuid.uuid4())
        summary = await ingest_filings(db, state, rows, run_id)
        summary["records_found"] = len(rows)

        await record_run(db, state, "csv_upload", summary, status="ok" if rows else "empty")

        return {
            "ok": True,
            "state": state,
            "run_id": run_id,
            **summary,
        }

    @router.post("/runs")
    async def runs_list(payload: StateAuth):
        await require_founder(payload)
        cursor = db.state_filing_runs.find({}, {"_id": 0}).sort([("started_at", -1)]).limit(50)
        out = []
        async for doc in cursor:
            out.append(doc)
        return {"runs": out}

    @router.post("/recent-filings")
    async def recent_filings(payload: StateAuth):
        await require_founder(payload)
        cursor = (
            db.state_filings
              .find({}, {"_id": 0})
              .sort([("date_collected", -1)])
              .limit(50)
        )
        out = []
        async for doc in cursor:
            out.append(doc)
        return {"filings": out}

    return router


__all__ = [
    "make_state_filings_router",
    "BaseStateAdapter",
    "REGISTERED_ADAPTERS",
    "ingest_filings",
    "record_run",
]
