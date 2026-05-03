"""External lead-source integration shells.

Phase A · this file ships INACTIVE adapters for Apollo.io, Outscraper, Clay,
Instantly.ai, and Smartlead. Each adapter:

  · `is_configured()` — returns True only when the relevant API key /
    webhook secret is present in the environment.
  · `pull(limit, segments)` (lead-source adapters) — returns a list[dict]
    of normalized prospect rows. Returns [] when not configured so the
    autopilot loop continues using internal seed sources without crashing.
  · `send(to, subject, html, plain)` (sender adapters) — returns False
    when not configured so Resend remains the primary path.

Phase B · adding a real key activates the adapter automatically. To wire
real HTTP calls, replace the `# TODO live impl` blocks with the playbook
returned by `integration_playbook_expert_v2`.

Normalized prospect row schema (return value of `pull()`):
{
    "business_name": str,
    "contact_name":  str | None,
    "email":         str,
    "industry":      str | None,
    "website":       str | None,
    "location":      str | None,
    "linkedin_url":  str | None,
    "notes":         str | None,
    "source":        "apollo" | "outscraper" | "clay" | ...,
}
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

log = logging.getLogger("lead_sources")


# ───────────────────────── Apollo.io ─────────────────────────
class ApolloAdapter:
    name = "apollo"

    @staticmethod
    def is_configured() -> bool:
        return bool(os.environ.get("APOLLO_API_KEY", "").strip())

    @classmethod
    async def pull(cls, limit: int = 50, segments: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Return up to `limit` normalized prospect rows. No-op when key
        missing. Once `APOLLO_API_KEY` is set, replace TODO block with
        the real /v1/people/search call from the integration playbook."""
        if not cls.is_configured():
            return []
        # TODO live impl — call Apollo.io /api/v1/mixed_people/search with
        # segments → titles + organization industries, then map results to
        # the normalized schema. Honor `limit` against per-day cap.
        log.info("[apollo] configured but live fetch not yet implemented — returning []")
        return []


# ───────────────────────── Outscraper (Google Maps) ─────────────────────────
class OutscraperAdapter:
    name = "outscraper"

    @staticmethod
    def is_configured() -> bool:
        return bool(os.environ.get("OUTSCRAPER_API_KEY", "").strip())

    @classmethod
    async def pull(cls, limit: int = 50, segments: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Pull local-business leads via Outscraper's Maps Search API.
        No-op when key missing."""
        if not cls.is_configured():
            return []
        # TODO live impl — call https://api.app.outscraper.com/maps/search-v3
        # with segment-derived queries (e.g. "convenience store near me",
        # "supermarket chain"), then dedupe + normalize.
        log.info("[outscraper] configured but live fetch not yet implemented — returning []")
        return []


# ───────────────────────── Clay (push-only via webhook) ─────────────────────────
class ClayAdapter:
    """Clay sends leads TO us via webhook → no `pull()` needed. The
    `is_configured()` flag controls whether the inbound webhook receiver
    accepts pushes."""
    name = "clay"

    @staticmethod
    def is_configured() -> bool:
        return bool(os.environ.get("CLAY_WEBHOOK_SECRET", "").strip())

    @staticmethod
    def secret_matches(provided: str) -> bool:
        expected = os.environ.get("CLAY_WEBHOOK_SECRET", "").strip()
        return bool(expected) and provided.strip() == expected

    @staticmethod
    def normalize(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Accept a Clay payload row and return a normalized prospect
        dict, or None if the row is unusable."""
        email = (row.get("email") or row.get("work_email") or "").strip().lower()
        business = (row.get("company") or row.get("business_name") or row.get("organization_name") or "").strip()
        if not email or "@" not in email or not business:
            return None
        return {
            "business_name": business[:240],
            "contact_name":  (row.get("name") or row.get("full_name") or "").strip()[:160] or None,
            "email":         email,
            "industry":      (row.get("industry") or row.get("vertical") or "").strip()[:120] or None,
            "website":       (row.get("website") or row.get("domain") or "").strip()[:500] or None,
            "location":      (row.get("location") or row.get("city") or "").strip()[:160] or None,
            "linkedin_url":  (row.get("linkedin_url") or row.get("linkedin") or "").strip()[:500] or None,
            "notes":         (row.get("notes") or "").strip()[:2000] or None,
            "role":          (row.get("title") or row.get("role") or "").strip()[:160] or None,
            "source":        "clay",
        }


# ───────────────────────── Instantly.ai (sender shell) ─────────────────────────
class InstantlyAdapter:
    name = "instantly"

    @staticmethod
    def is_configured() -> bool:
        return bool(os.environ.get("INSTANTLY_API_KEY", "").strip())

    @classmethod
    async def send(cls, to: str, subject: str, html: str, plain: str) -> bool:
        if not cls.is_configured():
            return False
        # TODO live impl — call POST https://api.instantly.ai/api/v1/email
        # with workspace + campaign id from env. For now, return False so
        # the engine falls back to Resend.
        log.info("[instantly] configured but live send not yet implemented — falling back")
        return False


# ───────────────────────── Smartlead (sender shell) ─────────────────────────
class SmartleadAdapter:
    name = "smartlead"

    @staticmethod
    def is_configured() -> bool:
        return bool(os.environ.get("SMARTLEAD_API_KEY", "").strip())

    @classmethod
    async def send(cls, to: str, subject: str, html: str, plain: str) -> bool:
        if not cls.is_configured():
            return False
        # TODO live impl — call POST https://server.smartlead.ai/api/v1/...
        log.info("[smartlead] configured but live send not yet implemented — falling back")
        return False


LEAD_SOURCES = (ApolloAdapter, OutscraperAdapter)
SENDERS = (InstantlyAdapter, SmartleadAdapter)


def configured_status() -> Dict[str, bool]:
    """Return a dict {adapter_name: is_configured} for the dashboard."""
    return {
        "apollo":     ApolloAdapter.is_configured(),
        "outscraper": OutscraperAdapter.is_configured(),
        "clay":       ClayAdapter.is_configured(),
        "instantly":  InstantlyAdapter.is_configured(),
        "smartlead":  SmartleadAdapter.is_configured(),
    }


__all__ = [
    "ApolloAdapter",
    "OutscraperAdapter",
    "ClayAdapter",
    "InstantlyAdapter",
    "SmartleadAdapter",
    "LEAD_SOURCES",
    "SENDERS",
    "configured_status",
]
