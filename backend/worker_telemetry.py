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

    Levels (Iter 102 — relaxed thresholds; previous logic flipped to YELLOW
    on a SINGLE worker error in history, which is far too aggressive for a
    long-running production engine that processes thousands of ticks):

      green  — engine running cleanly:
                 · 0 stale workers
                 · 0 missing expected workers
                 · error_rate < 5%
      yellow — degraded but operational:
                 · paused-by-operator, OR
                 · 1 stale worker, OR
                 · 1 missing expected worker, OR
                 · error_rate ≥ 5% AND < 25%
      red    — critical / not sending:
                 · 2+ stale workers, OR
                 · 2+ missing expected workers, OR
                 · error_rate ≥ 25%, OR
                 · scheduler explicitly OFF

    Workers that are intentionally disabled (e.g. imap_poller without IMAP env)
    or that haven't fired their first tick yet (e.g. daily_autopilot_loop on a
    fresh boot) are reported in `optional_inactive` rather than treated as a
    failure. The signal-light only cares about workers that *should* be running.

    Diagnostic fields surfaced for the founder UI tooltip / expandable panel:
      · last_successful_send_at  — ISO timestamp of the most recent OK tick
                                    of `scheduler_loop` (or any send-related
                                    worker), so the founder sees outbound is
                                    actually moving even during a yellow blip.
      · queue_latency_sec        — heuristic time since the most recent OK
                                    scheduler tick (None if never ticked).
      · last_warning_at          — most recent error timestamp across all
                                    workers (drives "Last warning" chip).
      · heartbeat_status         — "fresh" | "stale" | "none" — at-a-glance
                                    summary of whether ANY worker is reporting.
    """
    import os
    workers = await get_all_workers(db)

    # ── Diagnostic fields aggregated across all workers ──
    last_ok_dt = None
    last_err_dt = None
    last_err_msg = None
    scheduler_last_ok = None
    for w in workers:
        # Most recent OK tick across all workers
        ok_at = w.get("last_ok_at")
        if ok_at:
            try:
                dt = datetime.fromisoformat(ok_at)
                if last_ok_dt is None or dt > last_ok_dt:
                    last_ok_dt = dt
            except Exception:
                pass
        # Most recent error
        err_at = w.get("last_error_at")
        if err_at:
            try:
                dt = datetime.fromisoformat(err_at)
                if last_err_dt is None or dt > last_err_dt:
                    last_err_dt = dt
                    last_err_msg = w.get("last_error")
            except Exception:
                pass
        # Scheduler-specific OK tick (drives "queue_latency" + "last_successful_send")
        if w.get("worker") == "scheduler_loop" and w.get("last_ok_at"):
            try:
                scheduler_last_ok = datetime.fromisoformat(w["last_ok_at"])
            except Exception:
                pass

    now_dt = datetime.now(timezone.utc)
    queue_latency_sec = None
    if scheduler_last_ok:
        queue_latency_sec = int((now_dt - scheduler_last_ok).total_seconds())
    elif last_ok_dt:
        queue_latency_sec = int((now_dt - last_ok_dt).total_seconds())

    diagnostics: Dict[str, Any] = {
        "last_successful_send_at": scheduler_last_ok.isoformat() if scheduler_last_ok else (
            last_ok_dt.isoformat() if last_ok_dt else None
        ),
        "last_warning_at": last_err_dt.isoformat() if last_err_dt else None,
        "last_warning_message": last_err_msg,
        "queue_latency_sec": queue_latency_sec,
        "heartbeat_status": (
            "stale" if (workers and any(w.get("is_stale") for w in workers))
            else ("fresh" if workers else "none")
        ),
    }

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
            **diagnostics,
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
        # Fresh boot — no worker has ticked yet. Show as warming up (yellow)
        # rather than red. Scheduler ticks every 5min; this resolves quickly.
        return {
            "level": "yellow",
            "label": "Warming up",
            "summary": "No worker heartbeats yet — first tick lands within ~5 min of boot.",
            "reasons": ["awaiting_first_heartbeat"],
            "workers": [],
            "worker_count": 0,
            "stale_count": 0,
            "optional_inactive": optional_inactive,
            "checked_at": _now_iso(),
            **diagnostics,
        }

    # Iter 102 thresholds: relaxed so a single historical error in a worker
    # with thousands of ticks no longer flips the engine to YELLOW.
    if (
        len(stale) >= 2
        or len(missing) >= 2
        or error_rate >= 0.25
        or not scheduler_on
    ):
        level = "red"
        if not scheduler_on:
            reasons.append("scheduler_disabled_via_env")
        if len(stale) >= 2:
            reasons.append(f"{len(stale)}_workers_stale")
        if error_rate >= 0.25:
            reasons.append(f"error_rate_{round(error_rate*100)}pct_critical")
        if len(missing) >= 2:
            reasons.append(f"{len(missing)}_expected_workers_missing")
    elif (
        len(stale) >= 1
        or len(missing) >= 1
        or error_rate >= 0.05
    ):
        level = "yellow"
        if len(stale) >= 1:
            reasons.append(f"{len(stale)}_worker_stale")
        if error_rate >= 0.05:
            reasons.append(f"error_rate_{round(error_rate*100)}pct_elevated")
        if len(missing) >= 1:
            reasons.append(f"{len(missing)}_expected_worker_missing")
    else:
        level = "green"
        reasons.append("all_expected_workers_fresh")
        if error_rate > 0.0:
            # Surface the rate in green-mode reasons too so the founder sees
            # transparency ("0.3% errors · within tolerance") rather than
            # being told everything is perfect when there are minor blips.
            reasons.append(f"error_rate_{round(error_rate*100)}pct_within_tolerance")

    label_map = {"green": "Operational", "yellow": "Degraded", "red": "Stalled"}
    if level == "green":
        summary = f"Sending live · {len(expected)} workers fresh · {round(error_rate*100, 1)}% errors."
    elif level == "yellow":
        # Surface the strongest signal: ongoing send activity if any.
        if scheduler_last_ok and queue_latency_sec is not None and queue_latency_sec < 600:
            summary = (
                f"Sending live · last successful tick {queue_latency_sec}s ago · "
                f"{len(stale)} stale · {round(error_rate*100, 1)}% errors."
            )
        else:
            summary = (
                f"{len(stale)} stale · {round(error_rate*100, 1)}% errors · "
                f"{len(missing)} missing."
            )
    else:
        summary = f"Sending halted · {len(stale)} stalled · {round(error_rate*100, 1)}% errors."

    return {
        "level": level,
        "label": label_map[level],
        "summary": summary,
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
        **diagnostics,
    }


__all__ = ["record_heartbeat", "get_all_workers", "compute_system_status", "WORKER_DEFAULTS"]
