"""Worker Telemetry · Heartbeat tracking for background loops (Iter 68)

Every background loop writes a heartbeat each tick, so an operator can:
  - confirm the loop is alive (last_tick_at within stale_after_sec)
  - see error rates / counts
  - get an at-a-glance system_status (green / yellow / red) with reasons

Tracked workers (registered):
  - autopilot_cycle      · per-cycle execution (called by scheduler + manual)
  - scheduler_loop       · 5-min outbound queue tick
  - imap_poller          · 5-min reply scan
  - daily_autopilot_loop · 24-hour cycle
  - business_activation_nurture · 24-hour cycle

Storage: `worker_heartbeats` collection (one doc per worker, upsert on each tick).
Schema:
  {
    worker:           str (unique key),
    last_tick_at:     ISO,           # any tick (success OR error)
    last_ok_at:       ISO,           # last successful tick
    last_error_at:    ISO | None,    # last failed tick
    last_error:       str | None,    # truncated message
    ticks_total:      int,
    errors_total:     int,
    interval_sec:     int,           # expected cadence
    stale_after_sec:  int,           # 2× interval (override allowed)
  }
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

log = logging.getLogger("worker_telemetry")


# Workers register their expected cadence on first heartbeat. The dashboard
# computes "stale" if last_tick_at > 2× interval (or override).
WORKER_DEFAULTS: Dict[str, Dict[str, int]] = {
    "scheduler_loop":         {"interval_sec": 300,   "stale_after_sec": 900},
    "imap_poller":            {"interval_sec": 300,   "stale_after_sec": 900},
    "autopilot_cycle":        {"interval_sec": 86400, "stale_after_sec": 172800},  # daily — wide window
    "daily_autopilot_loop":   {"interval_sec": 86400, "stale_after_sec": 172800},
    "business_activation_nurture": {"interval_sec": 86400, "stale_after_sec": 172800},
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def record_heartbeat(
    db,
    worker: str,
    *,
    ok: bool = True,
    error: Optional[str] = None,
    interval_sec: Optional[int] = None,
    stale_after_sec: Optional[int] = None,
) -> None:
    """Idempotent upsert. Failures are swallowed — telemetry must NEVER crash
    the worker it's measuring."""
    try:
        defaults = WORKER_DEFAULTS.get(worker, {"interval_sec": 300, "stale_after_sec": 900})
        ts = _now_iso()
        update_set = {
            "worker": worker,
            "last_tick_at": ts,
            "interval_sec": interval_sec or defaults["interval_sec"],
            "stale_after_sec": stale_after_sec or defaults["stale_after_sec"],
        }
        if ok:
            update_set["last_ok_at"] = ts
        else:
            update_set["last_error_at"] = ts
            update_set["last_error"] = (error or "")[:500]

        update = {
            "$set": update_set,
            "$inc": {"ticks_total": 1, "errors_total": 0 if ok else 1},
            "$setOnInsert": {"first_tick_at": ts},
        }
        await db.worker_heartbeats.update_one({"worker": worker}, update, upsert=True)
    except Exception as e:
        log.warning(f"[worker_telemetry] heartbeat upsert failed for {worker}: {e}")


async def get_all_workers(db) -> List[Dict[str, Any]]:
    """Return every registered worker (registered = has at least one heartbeat).
    Each row gets a computed `is_stale` and `seconds_since_tick`."""
    out: List[Dict[str, Any]] = []
    try:
        now_dt = datetime.now(timezone.utc)
        cursor = db.worker_heartbeats.find({}, {"_id": 0})
        async for doc in cursor:
            last_tick = doc.get("last_tick_at")
            seconds_since = None
            is_stale = False
            if last_tick:
                try:
                    delta = (now_dt - datetime.fromisoformat(last_tick)).total_seconds()
                    seconds_since = int(delta)
                    is_stale = delta > (doc.get("stale_after_sec") or 900)
                except Exception:
                    pass
            doc["is_stale"] = is_stale
            doc["seconds_since_tick"] = seconds_since
            out.append(doc)
    except Exception as e:
        log.warning(f"[worker_telemetry] get_all_workers failed: {e}")
    return out


async def compute_system_status(db, *, paused: bool = False, pause_reason: Optional[str] = None) -> Dict[str, Any]:
    """Computes the traffic-light status for the founder dashboard signal light.

    Levels:
      green  — engine running cleanly, all *expected* workers fresh, no errors.
      yellow — paused-by-operator, OR 1 worker stale, OR errors >0% but <50%.
      red    — multiple workers stale OR error rate ≥ 50% in last 24h.

    Workers that are intentionally disabled (e.g. imap_poller without IMAP env)
    or that haven't fired their first tick yet (e.g. daily_autopilot_loop on a
    fresh boot) are reported in `optional_inactive` rather than treated as a
    failure. The signal-light only cares about workers that *should* be running.
    """
    import os
    workers = await get_all_workers(db)

    if paused:
        return {
            "level": "yellow",
            "label": "Paused",
            "summary": pause_reason or "Engine paused by operator.",
            "reasons": [pause_reason or "engine_paused"],
            "workers": workers,
            "worker_count": len(workers),
            "stale_count": 0,
            "checked_at": _now_iso(),
        }

    # Which workers do we EXPECT to be active right now?
    # - imap_poller: only if IMAP_HOST + IMAP_USER + IMAP_PASSWORD are set
    # - autopilot_cycle: only if it's been kicked off at least once (manual or daily loop)
    # - daily_autopilot_loop: only if AUTOPILOT_LOOP != off (default on)
    imap_configured = all(
        os.environ.get(k, "").strip() for k in ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD")
    )
    autopilot_loop_on = os.environ.get("AUTOPILOT_LOOP", "on").lower() != "off"
    scheduler_on = os.environ.get("OUTBOUND_SCHEDULER", "on").lower() != "off"
    nurture_on = os.environ.get("NURTURE_SCHEDULER", "on").lower() != "off"

    seen = {w["worker"]: w for w in workers}
    expected: List[str] = []
    optional_inactive: List[Dict[str, str]] = []

    if scheduler_on:
        expected.append("scheduler_loop")
    if nurture_on:
        expected.append("business_activation_nurture")
    if imap_configured:
        expected.append("imap_poller")
    else:
        optional_inactive.append({"worker": "imap_poller",
                                  "reason": "IMAP env vars not configured (intentional)"})

    # daily_autopilot_loop runs on a 24h cadence — first tick lands ~24h after
    # boot. If the loop is enabled but hasn't ticked yet, classify as "warming
    # up" rather than "stalled" — it's expected to be silent.
    if autopilot_loop_on:
        if "daily_autopilot_loop" in seen:
            expected.append("daily_autopilot_loop")
        else:
            optional_inactive.append({"worker": "daily_autopilot_loop",
                                      "reason": "First tick lands ~24h after boot"})
    # autopilot_cycle is event-driven (manual/loop). Not expected to be present.
    if "autopilot_cycle" not in seen:
        optional_inactive.append({"worker": "autopilot_cycle",
                                  "reason": "Event-driven · fires on /autopilot-now or daily loop"})

    missing = [w for w in expected if w not in seen]
    stale = [seen[w] for w in expected if w in seen and seen[w].get("is_stale")]

    total_ticks = sum(int(w.get("ticks_total") or 0) for w in workers)
    total_errors = sum(int(w.get("errors_total") or 0) for w in workers)
    error_rate = (total_errors / total_ticks) if total_ticks else 0.0

    reasons: List[str] = []

    if not workers:
        return {
            "level": "red",
            "label": "Unknown",
            "summary": "No worker heartbeats yet — the engine has never reported.",
            "reasons": ["no_heartbeats_recorded"],
            "workers": [],
            "worker_count": 0,
            "stale_count": 0,
            "optional_inactive": optional_inactive,
            "checked_at": _now_iso(),
        }

    if len(stale) >= 2 or error_rate >= 0.50 or len(missing) >= 2:
        level = "red"
        if len(stale) >= 2:
            reasons.append(f"{len(stale)}_workers_stale")
        if error_rate >= 0.50:
            reasons.append(f"error_rate_{round(error_rate*100)}pct")
        if len(missing) >= 2:
            reasons.append(f"{len(missing)}_expected_workers_missing")
    elif len(stale) >= 1 or error_rate > 0.0 or len(missing) >= 1:
        level = "yellow"
        if len(stale) >= 1:
            reasons.append(f"{len(stale)}_worker_stale")
        if error_rate > 0.0:
            reasons.append(f"error_rate_{round(error_rate*100)}pct")
        if len(missing) >= 1:
            reasons.append(f"{len(missing)}_expected_worker_missing")
    else:
        level = "green"
        reasons.append("all_expected_workers_fresh")

    label_map = {"green": "Operational", "yellow": "Degraded", "red": "Stalled"}
    summary_map = {
        "green":  f"All {len(expected)} expected workers fresh · no recent errors.",
        "yellow": f"{len(stale)} stale · {round(error_rate*100)}% errors · {len(missing)} missing.",
        "red":    f"{len(stale)} stalled · {round(error_rate*100)}% errors · {len(missing)} missing.",
    }

    return {
        "level": level,
        "label": label_map[level],
        "summary": summary_map[level],
        "reasons": reasons,
        "workers": workers,
        "worker_count": len(workers),
        "expected_workers": expected,
        "missing_workers": missing,
        "optional_inactive": optional_inactive,
        "stale_count": len(stale),
        "error_rate": round(error_rate, 4),
        "total_ticks": total_ticks,
        "total_errors": total_errors,
        "checked_at": _now_iso(),
    }


__all__ = ["record_heartbeat", "get_all_workers", "compute_system_status", "WORKER_DEFAULTS"]
