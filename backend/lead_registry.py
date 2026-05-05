"""Lead Registry · Single-Tenant Foundation (Iter 50) + Universal Lead Intake (Iter 51)

Implements the foundation of Jeffrey's "exclusive ownership" architecture:
  - Master `leads_registry` collection
  - Deduplication (email + phone + company+location similarity)
  - Locking (LOCKED / AVAILABLE / EXPIRED)
  - Distribution (atomic claim + lock)
  - Reassignment (auto-expire after N days of inactivity)

Iter 51 additions:
  - Explicit `fingerprint_hash` (sha1 of email | phone | normalized-company-name)
  - `import_batch_id` + `imported_by` for source/batch attribution
  - Status pipeline: new / contacted / responded / meeting_set / closed
  - CSV multi-format ingestion (LinkedIn / Hunter / Snov / Lusha exports)
  - Manual single-add helper
  - Filtered list helper for the Leads dashboard
"""
from __future__ import annotations

import os
import re
import csv
import io
import uuid
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

log = logging.getLogger("lead_registry")

EXPIRY_DAYS_DEFAULT = int(os.environ.get("LEAD_LOCK_EXPIRY_DAYS", "10"))

# Iter 51 · status pipeline (Jeffrey's spec)
LEAD_STATUSES = ["new", "contacted", "responded", "meeting_set", "closed"]

# Iter 51 · CSV header → canonical field mapping. Case-insensitive, whitespace-trimmed.
# Covers LinkedIn Sales Nav, Lusha, Hunter, Snov, generic exports.
CSV_FIELD_SYNONYMS = {
    "first_name": [
        "first_name", "firstname", "first name", "given name", "given_name",
    ],
    "last_name": [
        "last_name", "lastname", "last name", "surname", "family name", "family_name",
    ],
    "name": [
        "full name", "full_name", "name", "contact name", "contact_name",
    ],
    "email": [
        "email", "email address", "email_address", "work email", "work_email",
        "personal email", "primary email", "primary_email",
    ],
    "phone": [
        "phone", "phone number", "phone_number", "mobile", "mobile phone",
        "work phone", "direct phone", "direct dial",
    ],
    "company": [
        "company", "company name", "company_name", "organization",
        "organisation", "employer", "current company", "account",
    ],
    "title": [
        "title", "job title", "job_title", "position", "role", "headline",
    ],
    "industry": [
        "industry", "sector", "vertical", "company industry", "business type",
    ],
    "location": [
        "location", "city", "region", "state", "country", "geo",
        "company location", "office location",
    ],
    "linkedin_url": [
        "linkedin", "linkedin url", "linkedin_url", "profile url",
        "linkedin profile", "url",
    ],
    "website": [
        "website", "domain", "company website", "company_domain", "url",
    ],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm_email(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _norm_phone(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"\D+", "", s)[-10:]  # last 10 digits, US-style


def _norm_company(s: Optional[str]) -> str:
    """Strip common suffixes (LLC, Inc, Corp, Ltd) for fuzzy matching."""
    if not s:
        return ""
    out = s.lower().strip()
    out = re.sub(r"[,\.]", "", out)
    out = re.sub(r"\s+(llc|inc|corp|corporation|ltd|limited|co|company|gmbh|sa|plc|holdings|group)\.?$", "", out)
    return re.sub(r"\s+", " ", out).strip()


def _norm_company_loc(company: Optional[str], location: Optional[str]) -> str:
    c = re.sub(r"[^a-z0-9]", "", _norm_company(company))
    loc = re.sub(r"[^a-z0-9]", "", (location or "").lower())
    if not c:
        return ""
    return f"{c}|{loc}" if loc else c


def _fingerprint_hash(email: str, phone: str, company: str, name: str) -> str:
    """sha1 of canonical signal — primary email, fallback phone or company+name.

    Note: SHA1 is used only for *deduplication fingerprints*, not for any
    cryptographic / authentication purpose — `usedforsecurity=False` declares
    that intent to security scanners (CWE-327 N/A here).
    """
    if email:
        return hashlib.sha1(f"email:{email}".encode(), usedforsecurity=False).hexdigest()
    if phone:
        return hashlib.sha1(f"phone:{phone}".encode(), usedforsecurity=False).hexdigest()
    if company and name:
        return hashlib.sha1(f"co:{_norm_company(company)}|name:{name.lower().strip()}".encode(), usedforsecurity=False).hexdigest()
    if company:
        return hashlib.sha1(f"co:{_norm_company(company)}".encode(), usedforsecurity=False).hexdigest()
    return hashlib.sha1(f"raw:{email}{phone}{company}{name}".encode(), usedforsecurity=False).hexdigest()


def _dedupe_keys(payload: Dict[str, Any]) -> List[str]:
    """All keys we'll match against. Lead is a duplicate if ANY hit."""
    keys: List[str] = []
    if email := _norm_email(payload.get("email")):
        keys.append(f"email:{email}")
    if phone := _norm_phone(payload.get("phone")):
        keys.append(f"phone:{phone}")
    if cl := _norm_company_loc(payload.get("company"), payload.get("location")):
        keys.append(f"co:{cl}")
    return keys


async def find_duplicate(db, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return existing lead if email/phone/company-loc matches."""
    keys = _dedupe_keys(payload)
    if not keys:
        return None
    return await db.leads_registry.find_one(
        {"dedupe_keys": {"$in": keys}}, {"_id": 0},
    )


async def upsert_lead(db, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Insert or merge a lead. Idempotent — submitting twice with the same
    email/phone/company-loc won't create a duplicate.

    Returns {is_new: bool, lead: dict, owned_by_other: bool}.
    `owned_by_other` is True when the existing lead is assigned to a different
    user than `payload.assigned_to_user_id` (Jeffrey's exclusive-ownership rule).
    """
    keys = _dedupe_keys(payload)
    existing = await find_duplicate(db, payload)
    now_s = _now_iso()
    requesting_user = (payload.get("assigned_to_user_id") or "").strip().lower() or None

    if existing:
        owned_by = (existing.get("assigned_to_user_id") or "").strip().lower() or None
        owned_by_other = bool(owned_by and requesting_user and owned_by != requesting_user)

        # Merge — fill in any missing fields the new payload provides
        update_set: Dict[str, Any] = {"updated_at": now_s}
        for fld in ("name", "first_name", "last_name", "title", "company", "phone",
                    "industry_tag", "industry", "location", "linkedin_url", "website",
                    "source", "import_method", "imported_by", "import_batch_id"):
            if payload.get(fld) and not existing.get(fld):
                update_set[fld] = payload[fld]
        all_keys = list(set((existing.get("dedupe_keys") or []) + keys))
        update_set["dedupe_keys"] = all_keys
        await db.leads_registry.update_one(
            {"lead_id": existing["lead_id"]}, {"$set": update_set},
        )
        merged = await db.leads_registry.find_one({"lead_id": existing["lead_id"]}, {"_id": 0})
        return {"is_new": False, "lead": merged, "owned_by_other": owned_by_other}

    # New lead
    email = _norm_email(payload.get("email"))
    phone = _norm_phone(payload.get("phone"))
    company = (payload.get("company") or "").strip()
    name = (payload.get("name") or
            (f"{payload.get('first_name','').strip()} {payload.get('last_name','').strip()}").strip())
    fp = _fingerprint_hash(email, phone, company, name)
    lead = {
        "lead_id": str(uuid.uuid4()),
        "fingerprint_hash": fp,
        "name": name or None,
        "first_name": payload.get("first_name"),
        "last_name": payload.get("last_name"),
        "title": payload.get("title"),
        "company": company or None,
        "email": email or None,
        "phone": phone or None,
        "industry": payload.get("industry"),
        "industry_tag": payload.get("industry_tag") or payload.get("industry"),
        "location": payload.get("location"),
        "linkedin_url": payload.get("linkedin_url"),
        "website": payload.get("website"),
        "source": payload.get("source") or "manual",
        "import_method": payload.get("import_method") or "manual",
        "imported_by": payload.get("imported_by"),
        "import_batch_id": payload.get("import_batch_id"),
        "status": payload.get("status") or "new",
        "assigned_to_user_id": requesting_user,
        "assigned_to_company_id": payload.get("assigned_to_company_id"),
        "assigned_timestamp": now_s if requesting_user else None,
        "lock_status": "LOCKED" if requesting_user else "AVAILABLE",
        "last_activity_at": now_s,
        "last_contacted": None,
        "contact_method": None,
        "response_status": None,
        "source_outbound_prospect_id": payload.get("source_outbound_prospect_id"),
        "source_demo_capture_id": payload.get("source_demo_capture_id"),
        "dedupe_keys": keys,
        "activity_log": [
            {"at": now_s, "type": "imported", "by": payload.get("imported_by"),
             "source": payload.get("source"), "method": payload.get("import_method")},
        ],
        "created_at": now_s,
        "updated_at": now_s,
    }
    await db.leads_registry.insert_one(lead)
    return {"is_new": True, "lead": lead, "owned_by_other": False}


async def claim_leads(
    db,
    user_id: str,
    *,
    company_id: Optional[str] = None,
    industry_tag: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 25,
) -> List[Dict[str, Any]]:
    """Atomically claim up to `limit` AVAILABLE leads matching the filters.
    Each lead is locked to `user_id`. Returns the list of claimed leads."""
    q: Dict[str, Any] = {"lock_status": "AVAILABLE"}
    if industry_tag:
        q["industry_tag"] = industry_tag
    if location:
        q["location"] = location
    claimed: List[Dict[str, Any]] = []
    for _ in range(max(0, limit)):
        result = await db.leads_registry.find_one_and_update(
            q,
            {"$set": {
                "lock_status": "LOCKED",
                "assigned_to_user_id": user_id,
                "assigned_to_company_id": company_id,
                "assigned_timestamp": _now_iso(),
                "updated_at": _now_iso(),
            }},
            projection={"_id": 0},
            sort=[("created_at", 1)],
            return_document=True,
        )
        if not result:
            break
        if not result.get("lock_status"):
            result = await db.leads_registry.find_one(
                {"lead_id": result.get("lead_id")}, {"_id": 0},
            )
        claimed.append(result)
    return claimed


async def expire_stale_locks(db, expiry_days: int = EXPIRY_DAYS_DEFAULT) -> int:
    """Reassignment logic: any lead LOCKED with no activity in X days is
    flipped back to AVAILABLE so the pool stays liquid. Returns count flipped."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=expiry_days)).isoformat()
    r = await db.leads_registry.update_many(
        {
            "lock_status": "LOCKED",
            "$or": [
                {"last_activity_at": {"$lte": cutoff}},
                {"assigned_timestamp": {"$lte": cutoff}, "last_activity_at": {"$exists": False}},
            ],
            "status": {"$nin": ["closed"]},
        },
        {"$set": {
            "lock_status": "EXPIRED",
            "assigned_to_user_id": None,
            "assigned_to_company_id": None,
            "expired_at": _now_iso(),
            "updated_at": _now_iso(),
        }},
    )
    r2 = await db.leads_registry.update_many(
        {"lock_status": "EXPIRED"},
        {"$set": {"lock_status": "AVAILABLE", "updated_at": _now_iso()}},
    )
    return r.modified_count + r2.modified_count


async def touch_activity(db, lead_id: str, *, type_: str = "activity",
                         by: Optional[str] = None, note: Optional[str] = None) -> None:
    """Bump `last_activity_at` + append activity log so the lock doesn't expire."""
    now_s = _now_iso()
    await db.leads_registry.update_one(
        {"lead_id": lead_id},
        {
            "$set": {"last_activity_at": now_s, "updated_at": now_s},
            "$push": {"activity_log": {"at": now_s, "type": type_, "by": by, "note": note}},
        },
    )


async def update_status(db, lead_id: str, status: str, by: Optional[str] = None) -> None:
    """Move a lead through the pipeline. Bumps activity automatically."""
    if status not in LEAD_STATUSES:
        raise ValueError(f"Invalid status: {status} · allowed: {LEAD_STATUSES}")
    now_s = _now_iso()
    lead = await db.leads_registry.find_one({"lead_id": lead_id}, {"_id": 0, "assigned_to_user_id": 1})
    await db.leads_registry.update_one(
        {"lead_id": lead_id},
        {
            "$set": {"status": status, "last_activity_at": now_s, "updated_at": now_s},
            "$push": {"activity_log": {"at": now_s, "type": "status_change", "by": by, "to": status}},
        },
    )
    # Iter 54 · Start Engine analytics — track the first time each user's lead
    # transitions out of `new`. status="contacted" → first_email_sent_at,
    # status in (responded|meeting_set) → first_reply_received_at.
    owner = ((lead or {}).get("assigned_to_user_id") or "").strip().lower()
    if owner:
        if status == "contacted":
            await db.users.update_one(
                {"email": owner, "first_email_sent_at": {"$in": [None, ""]}},
                {"$set": {"first_email_sent_at": now_s}},
            )
            await db.users.update_one(
                {"email": owner, "first_email_sent_at": {"$exists": False}},
                {"$set": {"first_email_sent_at": now_s}},
            )
        elif status in ("responded", "meeting_set"):
            await db.users.update_one(
                {"email": owner, "first_reply_received_at": {"$in": [None, ""]}},
                {"$set": {"first_reply_received_at": now_s}},
            )
            await db.users.update_one(
                {"email": owner, "first_reply_received_at": {"$exists": False}},
                {"$set": {"first_reply_received_at": now_s}},
            )


async def list_leads(
    db,
    *,
    user_id: Optional[str] = None,
    is_admin: bool = False,
    source: Optional[str] = None,
    industry: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """List leads with filters. Non-admin users only see leads assigned to them."""
    q: Dict[str, Any] = {}
    if not is_admin and user_id:
        q["assigned_to_user_id"] = user_id
    if source:
        q["source"] = source
    if industry:
        q["industry"] = industry
    if status:
        q["status"] = status
    if assigned_to and is_admin:
        q["assigned_to_user_id"] = assigned_to
    cursor = db.leads_registry.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, limit))
    return await cursor.to_list(limit)


async def release_lead(db, lead_id: str, by: Optional[str] = None) -> None:
    """Manually release a lead back to AVAILABLE."""
    now_s = _now_iso()
    await db.leads_registry.update_one(
        {"lead_id": lead_id},
        {
            "$set": {
                "lock_status": "AVAILABLE",
                "assigned_to_user_id": None,
                "assigned_to_company_id": None,
                "released_at": now_s,
                "updated_at": now_s,
            },
            "$push": {"activity_log": {"at": now_s, "type": "released", "by": by}},
        },
    )


# ──────────────── CSV INGESTION (Iter 51) ────────────────

def _canonicalize_header(h: str) -> Optional[str]:
    """Map raw CSV header to one of the canonical fields, or None if unknown."""
    if not h:
        return None
    norm = h.strip().lower()
    norm = re.sub(r"[\s_\-/]+", " ", norm).strip()
    for canon, syns in CSV_FIELD_SYNONYMS.items():
        if norm == canon or norm in syns:
            return canon
    return None


def parse_csv(content: bytes) -> List[Dict[str, Any]]:
    """Parse a CSV (any reasonable export format) into normalized lead dicts.
    Handles UTF-8, UTF-8-BOM, and Latin-1. Supports comma + tab + semicolon delimiters.
    """
    # Best-effort decode
    text: str
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(enc)
            break
        except Exception:
            continue
    else:
        text = content.decode("utf-8", errors="ignore")

    # Sniff delimiter
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
    except Exception:
        class _D(csv.Dialect):
            delimiter = ","
            quotechar = '"'
            doublequote = True
            skipinitialspace = True
            lineterminator = "\n"
            quoting = csv.QUOTE_MINIMAL
        dialect = _D()

    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    rows: List[Dict[str, Any]] = []
    if not reader.fieldnames:
        return rows
    # Build header map: original header → canonical field
    header_map: Dict[str, str] = {}
    for h in reader.fieldnames:
        canon = _canonicalize_header(h)
        if canon:
            header_map[h] = canon
    for raw in reader:
        rec: Dict[str, Any] = {}
        for orig, canon in header_map.items():
            v = (raw.get(orig) or "").strip()
            if v:
                # If multiple raw headers map to same canon, keep first non-empty
                rec.setdefault(canon, v)
        # Combine first+last → name if name not present
        if "name" not in rec:
            fn = (rec.get("first_name") or "").strip()
            ln = (rec.get("last_name") or "").strip()
            if fn or ln:
                rec["name"] = f"{fn} {ln}".strip()
        # Skip rows with neither email nor (company+name) — useless lead
        if not rec.get("email") and not (rec.get("company") and rec.get("name")):
            continue
        rows.append(rec)
    return rows


async def ingest_csv(
    db, content: bytes, *,
    source: str = "manual",
    imported_by: Optional[str] = None,
) -> Dict[str, Any]:
    """Parse + ingest a CSV. Returns counts: total, added, duplicates_owned_by_self,
    duplicates_owned_by_other, skipped_no_signal."""
    rows = parse_csv(content)
    batch_id = str(uuid.uuid4())
    added = duplicates_self = duplicates_other = 0
    examples: List[Dict[str, Any]] = []
    for row in rows:
        row.update({
            "source": source,
            "import_method": "csv",
            "imported_by": imported_by,
            "import_batch_id": batch_id,
            "assigned_to_user_id": imported_by,
        })
        try:
            r = await upsert_lead(db, row)
            if r["is_new"]:
                added += 1
            elif r.get("owned_by_other"):
                duplicates_other += 1
                if len(examples) < 5:
                    examples.append({"email": row.get("email"), "company": row.get("company"),
                                     "owned_by": (r["lead"] or {}).get("assigned_to_user_id")})
            else:
                duplicates_self += 1
        except Exception as e:
            log.error(f"ingest_csv row failed: {e}")
    return {
        "ok": True,
        "batch_id": batch_id,
        "total_parsed": len(rows),
        "added": added,
        "duplicates_owned_by_self": duplicates_self,
        "duplicates_owned_by_other": duplicates_other,
        "duplicate_examples_other": examples,
    }


__all__ = [
    "find_duplicate", "upsert_lead", "claim_leads",
    "expire_stale_locks", "touch_activity", "update_status",
    "list_leads", "release_lead", "ingest_csv", "parse_csv",
    "LEAD_STATUSES",
]
