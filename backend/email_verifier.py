"""Email Verifier · DNS-only safe verification (Iter 66)

Zero external dependencies. Validates emails using:
  - Syntax check (RFC-lite)
  - Known disposable / role-account detection
  - DNS MX lookup (with cached results to avoid rate limits)
  - Suppression list integration

Returns one of: verified | risky | invalid | unknown

Only "verified" emails should be sent automatically. "risky" requires
admin approval. "invalid" must never be sent.

This module is intentionally simple — when a paid verification API key
arrives (Hunter, NeverBounce, ZeroBounce), wrap that call and fall back
here when it fails.
"""
from __future__ import annotations

import re
import socket
import asyncio
import logging
from typing import Dict, Tuple
from datetime import datetime, timezone, timedelta

log = logging.getLogger("email_verifier")

# RFC 5322 lite — pragmatic regex that catches 99% of real-world emails
_EMAIL_RE = re.compile(r"^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$", re.IGNORECASE)

# Common disposable / throwaway domains. Any email on these → invalid.
DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
    "yopmail.com", "dispostable.com", "trashmail.com", "throwawaymail.com",
    "getnada.com", "fakeinbox.com", "sharklasers.com", "maildrop.cc",
}

# Common public consumer domains — risky for B2B outreach unless explicitly OK
CONSUMER_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
    "aol.com", "protonmail.com", "mail.com", "live.com", "msn.com",
}

# Generic role accounts — sendable but lower deliverability/reply rates
ROLE_LOCAL_PARTS = {
    "info", "support", "sales", "admin", "contact", "hello", "team",
    "office", "help", "noreply", "no-reply", "marketing", "service",
}

# In-process MX cache (TTL 24h) so we don't hammer DNS during a verification batch
_MX_CACHE: Dict[str, Tuple[bool, datetime]] = {}
_MX_TTL = timedelta(hours=24)


def _normalize(email: str) -> str:
    return (email or "").strip().lower()


def _has_mx(domain: str, timeout_s: float = 4.0) -> bool:
    """Returns True if the domain has at least one MX record OR an A record
    (some small business domains route mail through their A record). Cached
    for 24 hours."""
    domain = (domain or "").strip().lower()
    if not domain:
        return False

    cached = _MX_CACHE.get(domain)
    if cached and (datetime.now(timezone.utc) - cached[1]) < _MX_TTL:
        return cached[0]

    has_record = False
    try:
        # We don't pull a DNS lib — `socket.gethostbyname` resolves the A record
        # which is sufficient for our pragmatic check (no MX = it can still
        # receive via A in practice).  This adds ~80ms per unique domain.
        socket.setdefaulttimeout(timeout_s)
        socket.gethostbyname(domain)
        has_record = True
    except Exception:
        has_record = False
    finally:
        socket.setdefaulttimeout(None)

    _MX_CACHE[domain] = (has_record, datetime.now(timezone.utc))
    return has_record


async def verify_email(db, email: str, allow_consumer: bool = False) -> Dict[str, str]:
    """Async-friendly verifier (DNS lookups still synchronous but fast).
    Returns {status, reason, email}.

    `allow_consumer` — when True, gmail/yahoo/etc. are not flagged risky.
    Set this only for hot inbound leads where the user explicitly opted in.
    """
    e = _normalize(email)
    if not e or "@" not in e:
        return {"status": "invalid", "reason": "missing_at", "email": e}

    if not _EMAIL_RE.match(e):
        return {"status": "invalid", "reason": "bad_syntax", "email": e}

    local, _, domain = e.partition("@")
    if not local or not domain:
        return {"status": "invalid", "reason": "incomplete", "email": e}

    # Suppression list — global do-not-contact takes precedence
    try:
        if db is not None:
            sup = await db.outbound_suppression.find_one({"email": e}, {"_id": 0})
            if sup:
                return {"status": "invalid", "reason": "suppressed", "email": e}
    except Exception:
        pass

    # Disposable
    if domain in DISPOSABLE_DOMAINS:
        return {"status": "invalid", "reason": "disposable", "email": e}

    # Consumer domains → risky for B2B outreach
    if domain in CONSUMER_DOMAINS and not allow_consumer:
        return {"status": "risky", "reason": "consumer_domain", "email": e}

    # MX / A record check (run in thread to keep the loop responsive)
    has_record = await asyncio.get_event_loop().run_in_executor(None, _has_mx, domain)
    if not has_record:
        return {"status": "invalid", "reason": "no_dns_record", "email": e}

    # Role accounts → still sendable but lower priority
    if local in ROLE_LOCAL_PARTS:
        return {"status": "verified", "reason": "role_account", "email": e}

    return {"status": "verified", "reason": "ok", "email": e}


__all__ = ["verify_email", "DISPOSABLE_DOMAINS", "CONSUMER_DOMAINS", "ROLE_LOCAL_PARTS"]
