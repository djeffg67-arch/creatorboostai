"""Correction Agent (Iter 60 · Phase 1 functional)

Wraps any async operation with retry-with-exponential-backoff. Logs silent
retries. Surfaces final failure to founder via SMS (when configured).

Behavior:
  • 3 attempts: 0s, 2s, 8s
  • Silent retry — only logs to `workflow_corrections` collection
  • On final failure → founder SMS (one per kind/lead pair per 60 minutes)

Public API:
  await with_correction(coro_factory, *, kind, db, lead_id=None, context=None) -> result

  `coro_factory` is a zero-arg async callable that returns the coroutine to
  await. Using a factory (not a coroutine directly) is mandatory because
  coroutines can only be awaited once — we need to re-create per attempt.
"""
from __future__ import annotations

import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Awaitable, Callable, Dict, Optional, TypeVar

log = logging.getLogger("correction_agent")

T = TypeVar("T")

BACKOFF_DELAYS = (0.0, 2.0, 8.0)  # seconds before each attempt
SUPPRESS_SMS_WINDOW = timedelta(minutes=60)

FOUNDER_PHONE = (os.environ.get("FOUNDER_PHONE") or "").strip()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def with_correction(
    coro_factory: Callable[[], Awaitable[T]],
    *,
    kind: str,
    db,
    lead_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
) -> T:
    """Run `coro_factory()` with exponential-backoff retry. Returns the result
    on success. Raises the final exception on permanent failure."""
    last_err: Optional[BaseException] = None
    attempts: list[Dict[str, Any]] = []

    for i, delay in enumerate(BACKOFF_DELAYS):
        if delay > 0:
            await asyncio.sleep(delay)
        try:
            result = await coro_factory()
            if i > 0:
                # Recovered after retries — log success
                await _log(db, kind=kind, lead_id=lead_id, status="recovered",
                           attempts=attempts + [{"i": i, "ok": True}],
                           context=context)
            return result
        except Exception as e:
            err_repr = f"{type(e).__name__}: {str(e)[:300]}"
            last_err = e
            attempts.append({"i": i, "ok": False, "error": err_repr})
            log.warning(f"[correction] {kind} attempt {i+1}/{len(BACKOFF_DELAYS)} failed: {err_repr}")

    # All attempts exhausted
    await _log(db, kind=kind, lead_id=lead_id, status="failed",
               attempts=attempts, context=context)
    await _alert_founder_if_needed(db, kind=kind, lead_id=lead_id,
                                    error=str(last_err)[:300] if last_err else "unknown",
                                    context=context)
    if last_err:
        raise last_err
    raise RuntimeError(f"correction agent: {kind} failed without exception")


async def _log(db, *, kind: str, lead_id: Optional[str], status: str,
               attempts: list, context: Optional[Dict[str, Any]]) -> None:
    try:
        import uuid
        await db.workflow_corrections.insert_one({
            "id": str(uuid.uuid4()),
            "kind": kind,
            "status": status,
            "lead_id": lead_id,
            "attempts": attempts,
            "context": context or {},
            "created_at": _now_iso(),
        })
    except Exception as e:
        log.warning(f"workflow_corrections log failed: {e}")


async def _alert_founder_if_needed(
    db, *, kind: str, lead_id: Optional[str], error: str,
    context: Optional[Dict[str, Any]],
) -> None:
    """Suppress duplicate alerts within 60 min for the same (kind, lead_id) pair."""
    if not FOUNDER_PHONE:
        return
    try:
        from sms_service import sms_configured, _send_sync  # type: ignore
        if not sms_configured():
            return
        cutoff = (datetime.now(timezone.utc) - SUPPRESS_SMS_WINDOW).isoformat()
        recent = await db.workflow_corrections.find_one({
            "kind": kind, "lead_id": lead_id, "status": "failed",
            "alert_sent_at": {"$gte": cutoff},
        })
        if recent:
            return
        body = (f"⚠️ CB workflow failure · {kind}"
                f"{' · lead ' + lead_id[:8] if lead_id else ''}"
                f" · {error[:100]}")[:160]
        res = await asyncio.to_thread(_send_sync, FOUNDER_PHONE, body)
        # Stamp the most-recent failure doc with the alert send so
        # _alert_founder_if_needed's "recent" lookup blocks duplicates within 60min.
        await db.workflow_corrections.find_one_and_update(
            {"kind": kind, "lead_id": lead_id, "status": "failed",
             "alert_sent_at": {"$exists": False}},
            {"$set": {"alert_sent_at": _now_iso(), "alert_result": res}},
            sort=[("created_at", -1)],
        )
    except Exception as e:
        log.error(f"founder alert failed: {e}")


__all__ = ["with_correction", "BACKOFF_DELAYS"]
