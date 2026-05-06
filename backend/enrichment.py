"""Internal Heuristic Enrichment (Iter 66)

Zero-dependency enrichment pass for newly ingested business filings:
  - Guess likely website domain from business name
  - Guess likely contact email pattern (info@, contact@, owner@) when only a
    business name + domain candidate is known
  - Map state abbreviation → full state name
  - Light industry classification from business name keywords
  - Score-friendly metadata: needs_enrichment flag, confidence

This is intentionally not a paid vendor. When Apollo / Hunter / Clay /
Lusha keys arrive, that adapter takes precedence and falls back here.

Schema returned:
{
  domain_candidate: str | None,
  email_candidate:  str | None,
  industry_guess:   str | None,
  state_full:       str | None,
  needs_enrichment: bool,
  confidence:       "low" | "medium" | "high",
  notes:            str,
}
"""
from __future__ import annotations

import re
import logging
from typing import Dict, Any, Optional

from email_verifier import verify_email

log = logging.getLogger("enrichment")

US_STATE_MAP = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}

# Industry keyword → label. Order matters (first match wins).
INDUSTRY_KEYWORDS = [
    (r"\b(contractor|construction|build(ing|ers?)?|electric(al)?|plumb(ing|er)?|roof(ing|er)?|hvac|painting|landscape|paving|drywall|carpentry)\b", "construction"),
    (r"\b(realt(y|or|ors)|real estate|broker(age)?|properties|homes|properti(es|es group))\b", "real_estate"),
    (r"\b(restaurant|cafe|bistro|grill|kitchen|eatery|pizz(a|eria)|bakery|deli|catering|coffee)\b", "food_service"),
    (r"\b(market|grocery|store|mart|deli|liquor|convenience|c-?store|gas station|fuel|petroleum)\b", "retail"),
    (r"\b(salon|spa|barber|nails|beauty|hair|aesthetics|wellness|massage|fitness|gym|yoga)\b", "personal_care"),
    (r"\b(law|legal|attorney|firm|advocates|counsel)\b", "legal"),
    (r"\b(clinic|medical|dental|chiro|therapy|health|physician|nurs(ing|e))\b", "healthcare"),
    (r"\b(consult(ing|ants)|advisor(s|y)|services|solutions|partners|associates)\b", "professional_services"),
    (r"\b(logistics|transport|trucking|hauling|delivery|courier|freight)\b", "logistics"),
    (r"\b(tech|technologies|systems|software|digital|labs|cyber|data|analytics|ai)\b", "technology"),
    (r"\b(school|academy|education|tutor(ing)?|learning|college|university)\b", "education"),
    (r"\b(insurance|underwriting|brokers?|risk)\b", "insurance"),
    (r"\b(auto|motor|cars?|repair|garage|tire|automotive|dealership)\b", "automotive"),
    (r"\b(salon|cleaning|janitorial|maid|housekeep)\b", "cleaning"),
    (r"\b(media|marketing|agency|productions?|studios?|creative)\b", "marketing"),
]

# Generic noise words to strip when guessing a domain
ENTITY_SUFFIXES = re.compile(
    r"\b(LLC|L\.L\.C\.|INC|INC\.|LLP|LP|LTD|CORP|CORPORATION|CO|COMPANY|GROUP|HOLDINGS|ENTERPRISES|SERVICES|VENTURES)\b",
    re.IGNORECASE,
)


def normalize_state(state: Optional[str]) -> Optional[str]:
    if not state:
        return None
    s = state.strip().upper()
    if len(s) == 2 and s in US_STATE_MAP:
        return US_STATE_MAP[s]
    # Sometimes already a full name
    for full in US_STATE_MAP.values():
        if full.lower() == s.lower():
            return full
    return state.title()


def guess_industry(business_name: str, declared_industry: Optional[str] = None) -> Optional[str]:
    if declared_industry:
        return declared_industry.strip().lower().replace(" ", "_")
    if not business_name:
        return None
    name = business_name.lower()
    for pattern, label in INDUSTRY_KEYWORDS:
        if re.search(pattern, name, re.IGNORECASE):
            return label
    return None


def guess_domain(business_name: str) -> Optional[str]:
    """Build a likely .com domain from a business name. Strips entity suffixes
    and non-alphanumeric. NOT verified — caller should verify via DNS."""
    if not business_name:
        return None
    cleaned = ENTITY_SUFFIXES.sub("", business_name)
    cleaned = re.sub(r"[^a-zA-Z0-9 ]+", "", cleaned).strip()
    parts = [p for p in cleaned.split() if p]
    if not parts:
        return None
    stem = "".join(parts).lower()[:40]
    if not stem or len(stem) < 3:
        return None
    return f"{stem}.com"


async def enrich_filing(db, filing: Dict[str, Any]) -> Dict[str, Any]:
    """Take a normalized state-filing row and produce enriched metadata.
    Does NOT mutate the filing dict. Returns enrichment payload."""
    business_name = (filing.get("business_name") or "").strip()
    declared_email = (filing.get("email") or "").strip().lower()
    declared_website = (filing.get("website") or "").strip().lower()
    state = filing.get("state")

    industry_guess = guess_industry(business_name, filing.get("industry"))
    state_full = normalize_state(state)

    # Domain resolution priority: declared website > guessed
    domain_candidate: Optional[str] = None
    if declared_website:
        domain_candidate = re.sub(r"^https?://", "", declared_website).rstrip("/").split("/")[0]
    if not domain_candidate:
        domain_candidate = guess_domain(business_name)

    # Email resolution: declared > role-pattern at domain
    email_candidate: Optional[str] = declared_email if declared_email and "@" in declared_email else None
    if not email_candidate and domain_candidate:
        # Role accounts — info@ is the safest first guess for new businesses
        email_candidate = f"info@{domain_candidate}"

    needs_enrichment = False
    confidence = "low"
    notes_parts = []

    # Verify whichever email candidate we resolved
    verify_status: Optional[str] = None
    verify_reason: Optional[str] = None
    if email_candidate:
        v = await verify_email(db, email_candidate, allow_consumer=False)
        verify_status = v["status"]
        verify_reason = v["reason"]
        if verify_status == "verified":
            confidence = "medium" if email_candidate.startswith(("info@", "contact@", "office@", "admin@")) else "high"
        elif verify_status == "risky":
            needs_enrichment = True
            notes_parts.append(f"email_risky: {verify_reason}")
        else:
            needs_enrichment = True
            notes_parts.append(f"email_invalid: {verify_reason}")
            email_candidate = None
    else:
        needs_enrichment = True
        notes_parts.append("no_email_resolved")

    return {
        "domain_candidate": domain_candidate,
        "email_candidate": email_candidate if verify_status == "verified" else None,
        "email_status": verify_status,
        "email_reason": verify_reason,
        "industry_guess": industry_guess,
        "state_full": state_full,
        "needs_enrichment": needs_enrichment,
        "confidence": confidence,
        "notes": "; ".join(notes_parts) or "ok",
    }


__all__ = ["enrich_filing", "guess_industry", "guess_domain", "normalize_state", "US_STATE_MAP"]
