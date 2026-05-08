import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Activity, Zap, AlertTriangle, CheckCircle2, Clock, Mail, Inbox,
    Radio, ChevronRight, Pause, Send, MessageSquare, Database,
    Search, X,
} from "lucide-react";

/**
 * LiveSendPulse
 * --------------------------------------------------------------
 * Enterprise command-center widget for the Founder/Operator dashboard.
 * Polls /api/ops/outbound/live-pulse every ~4s and renders:
 *
 *   • Heart-beating signal light (green / yellow / red)
 *   • Mode chip (production / sandbox / paused / mixed) — truthful
 *   • Last send card (masked email + timestamp + Action ID)
 *   • Queue depth (in-flight / eligible / awaiting bump / scheduled)
 *   • Live rates (sends last hour / today, replies today)
 *   • Next scheduled action (ts, prospect, cadence step)
 *   • Recent send + reply ticker (last 5 each)
 *   • Worker heartbeat dots with seconds-since-tick
 *
 * Not flashy. Not consumer. Numeric-grid command-center style.
 */

const POLL_INTERVAL_MS = 4000;
const SSE_RECONNECT_MS = 5000;
const LIVE_EVENT_MAX = 6;

const cls = (...x) => x.filter(Boolean).join(" ");

const fmtAge = (iso) => {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
};

const fmtFuture = (iso) => {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    if (s < 60) return `in ${s}s`;
    if (s < 3600) return `in ${Math.floor(s / 60)}m`;
    if (s < 86400) return `in ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    return `in ${Math.floor(s / 86400)}d`;
};

const modeStyle = {
    production: { dot: "bg-emerald-400", text: "text-emerald-300", border: "border-emerald-500/40 bg-emerald-500/10", label: "PRODUCTION · LIVE" },
    sandbox:    { dot: "bg-amber-400",   text: "text-amber-300",   border: "border-amber-500/40 bg-amber-500/10",   label: "SANDBOX · LOGGED ONLY" },
    paused:     { dot: "bg-slate-400",   text: "text-slate-300",   border: "border-slate-500/40 bg-slate-500/10",   label: "PAUSED" },
    mixed:      { dot: "bg-amber-400",   text: "text-amber-300",   border: "border-amber-500/40 bg-amber-500/10",   label: "MIXED" },
    unknown:    { dot: "bg-slate-500",   text: "text-slate-400",   border: "border-white/10 bg-white/5",            label: "UNKNOWN" },
};

const signalStyle = {
    green:  { ring: "border-emerald-500/40", glow: "shadow-[0_0_30px_-5px_rgba(52,211,153,0.45)]", dot: "bg-emerald-400", text: "text-emerald-300" },
    yellow: { ring: "border-amber-500/40",   glow: "shadow-[0_0_30px_-5px_rgba(251,191,36,0.45)]", dot: "bg-amber-400",   text: "text-amber-300" },
    red:    { ring: "border-rose-500/40",    glow: "shadow-[0_0_30px_-5px_rgba(244,63,94,0.45)]",  dot: "bg-rose-400",    text: "text-rose-300" },
};

export const LiveSendPulse = ({
    apiBaseUrl,
    authEmail,
    authToken,
    pollMs = POLL_INTERVAL_MS,
    testId = "live-send-pulse",
}) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liveEvents, setLiveEvents] = useState([]);
    const [sseLive, setSseLive] = useState(false);
    const [connectedCount, setConnectedCount] = useState(0);
    const [actionQuery, setActionQuery] = useState("");
    const [remoteHit, setRemoteHit] = useState(null); // {found, event} | null
    const aliveRef = useRef(true);
    const fetchingRef = useRef(false);

    // Iter 92 · Action ID search (operator traceability) — same UX as the
    // homepage hero. Local-first match against the 6-event SSE buffer; if
    // a 24-char ObjectId is pasted that's already off-screen, hits the
    // backend lookup so older events are still discoverable.
    const trimmedActionQuery = actionQuery.trim();
    useEffect(() => {
        if (!trimmedActionQuery || trimmedActionQuery.length < 4) {
            setRemoteHit(null);
            return undefined;
        }
        const lower = trimmedActionQuery.toLowerCase();
        const localHit = (liveEvents || []).some(
            (ev) => (ev.action_id || "").toLowerCase().includes(lower)
                 || (ev.title || "").toLowerCase().includes(lower)
                 || (ev.sub || "").toLowerCase().includes(lower),
        );
        if (localHit) {
            setRemoteHit(null);
            return undefined;
        }
        let cancelled = false;
        const t = window.setTimeout(async () => {
            try {
                const res = await fetch(
                    `${apiBaseUrl}/api/public/action/${encodeURIComponent(trimmedActionQuery)}`,
                    { cache: "no-store" },
                );
                const json = await res.json();
                if (cancelled) return;
                setRemoteHit(json && json.ok && json.found && json.event
                    ? { found: true, event: json.event }
                    : { found: false, reason: json?.reason || "not_found" });
            } catch {
                if (!cancelled) setRemoteHit({ found: false, reason: "error" });
            }
        }, 250);
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [trimmedActionQuery, liveEvents, apiBaseUrl]);

    const matchesQuery = (ev) => {
        if (!trimmedActionQuery) return true;
        const q = trimmedActionQuery.toLowerCase();
        return (ev.action_id || "").toLowerCase().includes(q)
            || (ev.title || "").toLowerCase().includes(q)
            || (ev.sub || "").toLowerCase().includes(q);
    };

    // Iter 90 · Public SSE channel — subscribes to the same anonymized
    // execution stream the homepage hero uses, so operators see sends /
    // leads / deals / appointments hit their dashboard sub-second. The
    // existing 4s operational-telemetry poll stays (different data: mode,
    // ramp, queue) — SSE is purely additive for event push.
    useEffect(() => {
        if (!apiBaseUrl) return undefined;
        let es = null;
        let reconnectTimer = null;
        let cancelled = false;

        const open = () => {
            if (cancelled) return;
            try {
                es = new EventSource(`${apiBaseUrl}/api/public/system-pulse/stream`);
            } catch {
                return; // EventSource unavailable in this browser
            }
            es.addEventListener("ready", (e) => {
                if (cancelled) return;
                setSseLive(true);
                try { setConnectedCount(Number(JSON.parse(e.data).connected_count) || 0); } catch { /* noop */ }
            });
            es.addEventListener("heartbeat", (e) => {
                if (cancelled) return;
                setSseLive(true);
                try { setConnectedCount(Number(JSON.parse(e.data).connected_count) || 0); } catch { /* noop */ }
            });
            es.addEventListener("pulse", (e) => {
                if (cancelled) return;
                let payload = null;
                try { payload = JSON.parse(e.data); } catch { return; }
                if (!payload || !payload.title) return;
                setLiveEvents((prev) => [payload, ...prev].slice(0, LIVE_EVENT_MAX));
                setSseLive(true);
            });
            es.onerror = () => {
                if (cancelled) return;
                setSseLive(false);
                try { es && es.close(); } catch { /* noop */ }
                es = null;
                reconnectTimer = window.setTimeout(open, SSE_RECONNECT_MS);
            };
        };

        open();
        return () => {
            cancelled = true;
            if (reconnectTimer) window.clearTimeout(reconnectTimer);
            try { es && es.close(); } catch { /* noop */ }
        };
    }, [apiBaseUrl]);

    useEffect(() => {
        aliveRef.current = true;
        const tick = async () => {
            if (fetchingRef.current) return;
            if (!apiBaseUrl || !authEmail || !authToken) return;
            fetchingRef.current = true;
            try {
                const res = await fetch(
                    `${apiBaseUrl}/api/ops/outbound/live-pulse`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: authEmail, token: authToken }),
                    },
                );
                const json = await res.json();
                if (!aliveRef.current) return;
                if (json.ok) {
                    setData(json);
                    setError(null);
                } else {
                    setError(json.detail || json.error || "telemetry error");
                }
            } catch (e) {
                if (aliveRef.current) setError(String(e?.message || e));
            } finally {
                fetchingRef.current = false;
                if (aliveRef.current) setLoading(false);
            }
        };
        tick();
        const id = setInterval(tick, pollMs);
        return () => {
            aliveRef.current = false;
            clearInterval(id);
        };
    }, [apiBaseUrl, authEmail, authToken, pollMs]);

    const mode = (data?.mode || "unknown").toLowerCase();
    const ms = modeStyle[mode] || modeStyle.unknown;
    const signal = data?.signal?.level || "yellow";
    const ss = signalStyle[signal] || signalStyle.yellow;

    const workers = data?.workers || [];
    const queue = data?.queue || {};
    const rates = data?.rates || {};
    const recentSends = data?.recent_sends || [];
    const recentReplies = data?.recent_replies || [];
    const lastSend = data?.last_send;
    const nextAction = data?.next_action;

    return (
        <section
            className={cls(
                "relative rounded-md border bg-ink-900",
                ss.ring, ss.glow,
            )}
            data-testid={testId}
            data-mode={mode}
            data-signal={signal}
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                    <SignalLight level={signal} />
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            Live Send Pulse · Operator View
                        </p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                            {data?.signal?.summary || (loading ? "Connecting…" : "—")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className={cls(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em]",
                            sseLive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-ink-700/50 text-slate-400",
                        )}
                        data-testid={`${testId}-sse-chip`}
                        title={sseLive ? "Subscribed to /api/public/system-pulse/stream" : "SSE disconnected · falling back to telemetry poll"}
                    >
                        <span className={cls("h-1.5 w-1.5 rounded-full", sseLive ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
                        {sseLive ? "Streaming Live" : "Reconnecting…"}
                        {sseLive && connectedCount > 0 && (
                            <span className="text-slate-300" data-testid={`${testId}-connected-count`}>
                                · {connectedCount.toLocaleString()} connected
                            </span>
                        )}
                    </span>
                    <span
                        className={cls(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em]",
                            ms.border, ms.text,
                        )}
                        data-testid={`${testId}-mode-chip`}
                    >
                        <span className={cls("h-1.5 w-1.5 rounded-full animate-pulse", ms.dot)} />
                        {ms.label}
                    </span>
                    {data?.paused && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/40 bg-slate-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                            <Pause size={10} /> Paused
                        </span>
                    )}
                </div>
            </div>

            {/* Top row · KPIs */}
            <div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-4 lg:grid-cols-7">
                <Kpi
                    Icon={Send}
                    label="Sent · last hr"
                    value={rates.sends_last_hour ?? "—"}
                    tone="cyan"
                    testid={`${testId}-kpi-sends-hour`}
                />
                <Kpi
                    Icon={Activity}
                    label="Sent · today"
                    value={rates.sends_today ?? "—"}
                    tone="cyan"
                    testid={`${testId}-kpi-sends-today`}
                />
                <Kpi
                    Icon={Inbox}
                    label="Replies · today"
                    value={rates.replies_today ?? "—"}
                    tone="emerald"
                    testid={`${testId}-kpi-replies-today`}
                />
                <Kpi
                    Icon={Zap}
                    label="In flight"
                    value={queue.in_flight ?? "—"}
                    tone="cyan"
                    testid={`${testId}-kpi-in-flight`}
                />
                <Kpi
                    Icon={ChevronRight}
                    label="Eligible now"
                    value={queue.eligible_now ?? "—"}
                    tone="amber"
                    testid={`${testId}-kpi-eligible`}
                />
                <Kpi
                    Icon={Clock}
                    label="Awaiting bump"
                    value={queue.awaiting_bump ?? "—"}
                    tone="amber"
                    testid={`${testId}-kpi-awaiting-bump`}
                />
                <Kpi
                    Icon={Database}
                    label="Scheduled"
                    value={queue.scheduled_followups ?? "—"}
                    tone="cyan"
                    testid={`${testId}-kpi-scheduled`}
                />
            </div>

            {/* Body · last send + next + workers */}
            <div className="grid grid-cols-1 gap-px bg-white/5 lg:grid-cols-3">
                <Panel
                    label="Last Send"
                    icon={Send}
                    tone="cyan"
                    testid={`${testId}-last-send`}
                >
                    {lastSend ? (
                        <ProspectLine
                            ts={lastSend.ts}
                            kind={lastSend.kind}
                            business={lastSend.business_name}
                            email={lastSend.email_masked}
                            tag={lastSend.simulated ? "simulated" : (lastSend.industry || lastSend.state)}
                            subject={lastSend.subject}
                            ageFormatter={fmtAge}
                        />
                    ) : (
                        <Empty text="No sends recorded yet." />
                    )}
                </Panel>

                <Panel
                    label="Next Scheduled Action"
                    icon={Clock}
                    tone="amber"
                    testid={`${testId}-next-action`}
                >
                    {nextAction ? (
                        <ProspectLine
                            ts={nextAction.ts}
                            kind={`step ${nextAction.cadence_step ?? 0}`}
                            business={nextAction.business_name}
                            email={nextAction.email_masked}
                            tag={nextAction.industry || nextAction.state}
                            subject={null}
                            ageFormatter={fmtFuture}
                        />
                    ) : (
                        <Empty text="No upcoming action queued." />
                    )}
                </Panel>

                <Panel
                    label="Workers"
                    icon={Radio}
                    tone="cyan"
                    testid={`${testId}-workers`}
                >
                    <ul className="space-y-1.5">
                        {workers.length === 0 && <Empty text="No worker heartbeats." />}
                        {workers.map((w) => (
                            <li
                                key={w.worker}
                                className="flex items-center justify-between gap-3 border-b border-white/5 pb-1.5 last:border-b-0"
                                data-testid={`${testId}-worker-${w.worker}`}
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className={cls(
                                            "h-1.5 w-1.5 rounded-full",
                                            w.is_stale ? "bg-rose-400" : "bg-emerald-400 animate-pulse",
                                        )}
                                    />
                                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                                        {w.worker}
                                    </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">
                                    {w.seconds_since_tick != null
                                        ? `${w.seconds_since_tick}s · ${w.ticks_total ?? 0} ticks`
                                        : "—"}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </div>

            {/* Iter 90 · SSE-driven live event stream — sub-second push from
                /api/public/system-pulse/stream. Fills with anonymized cross-
                customer execution events the moment they hit `outbound_events`. */}
            <div className="border-t border-white/5 bg-ink-700/30 px-4 py-3" data-testid={`${testId}-sse-strip`}>
                <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Active AI Execution Feed · sub-second push
                    </span>
                    <span
                        className={cls(
                            "inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em]",
                            sseLive ? "text-emerald-300" : "text-slate-500",
                        )}
                    >
                        <span className={cls("h-1.5 w-1.5 rounded-full", sseLive ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
                        {sseLive
                            ? `Streaming Live${connectedCount > 0 ? ` · ${connectedCount.toLocaleString()} connected` : ""}`
                            : "Reconnecting…"}
                    </span>
                </div>
                {liveEvents.length === 0 ? (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Awaiting first event…
                    </p>
                ) : (
                    <>
                        {/* Iter 92 · Action ID search — operator traceability */}
                        <div
                            className="mb-2 flex items-center gap-1.5 rounded border border-white/10 bg-ink-900/70 px-2 py-1.5"
                            data-testid={`${testId}-action-search`}
                        >
                            <Search size={11} className="flex-shrink-0 text-slate-500" />
                            <input
                                type="text"
                                value={actionQuery}
                                onChange={(e) => setActionQuery(e.target.value)}
                                placeholder="Search Action ID · paste 24-char ID to trace"
                                className="flex-1 bg-transparent font-mono text-[11px] text-cyan-200 placeholder:text-slate-500 focus:outline-none"
                                data-testid={`${testId}-action-search-input`}
                                spellCheck={false}
                            />
                            {trimmedActionQuery && (
                                <button
                                    type="button"
                                    onClick={() => setActionQuery("")}
                                    className="text-slate-500 hover:text-cyan-300"
                                    data-testid={`${testId}-action-search-clear`}
                                    title="Clear"
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                        {trimmedActionQuery && trimmedActionQuery.length >= 4 && remoteHit && !remoteHit.found && (
                            <p
                                className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-300"
                                data-testid={`${testId}-action-search-miss`}
                            >
                                No match in current feed · {remoteHit.reason === "invalid_format" ? "ID format invalid" : "ID not found"}
                            </p>
                        )}
                        <ul className="space-y-1.5">
                            {liveEvents.map((ev, i) => {
                                const isMatch = matchesQuery(ev);
                                const dimmed = trimmedActionQuery && !isMatch;
                                const highlighted = trimmedActionQuery && isMatch;
                                const aidShort = (ev.action_id || "").slice(-8) || "—";
                                return (
                                    <li
                                        key={`${ev.action_id || ev.kind}-${ev.time}-${i}`}
                                        className={cls(
                                            "flex items-center gap-3 rounded border px-2.5 py-1.5 transition-all",
                                            highlighted
                                                ? "border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/30"
                                                : dimmed
                                                    ? "border-white/5 bg-ink-900/40 opacity-40"
                                                    : "border-white/5 bg-ink-900/60",
                                        )}
                                        data-testid={`${testId}-sse-event-${i}`}
                                        data-action-id={ev.action_id || ""}
                                        data-match={highlighted ? "true" : "false"}
                                    >
                                        <span className={cls(
                                            "h-1.5 w-1.5 rounded-full flex-shrink-0",
                                            i === 0 ? "animate-pulse" : "",
                                            ev.tone === "emerald" ? "bg-emerald-400" :
                                                ev.tone === "amber" ? "bg-amber-400" :
                                                    ev.tone === "fuchsia" ? "bg-fuchsia-400" :
                                                        ev.tone === "violet" ? "bg-violet-400" : "bg-cyan-400",
                                        )} />
                                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 w-16 flex-shrink-0">{ev.time}</span>
                                        <span className="text-xs font-medium text-white truncate">{ev.title}</span>
                                        <span className="font-mono text-[10px] text-slate-400 truncate">· {ev.sub}</span>
                                        <span className="ml-auto font-mono text-[9px] tracking-wider text-slate-500 flex-shrink-0" title={ev.action_id || ""}>
                                            #{aidShort}
                                        </span>
                                    </li>
                                );
                            })}
                            {remoteHit && remoteHit.found && remoteHit.event && (
                                <li
                                    className="flex items-center gap-3 rounded border border-cyan-400/60 bg-cyan-500/10 px-2.5 py-1.5 ring-1 ring-cyan-400/30"
                                    data-testid={`${testId}-action-search-remote-match`}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                                    <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-300 w-24 flex-shrink-0">From audit log</span>
                                    <span className="text-xs font-medium text-cyan-200 truncate">{remoteHit.event.title}</span>
                                    <span className="font-mono text-[10px] text-slate-400 truncate">· {remoteHit.event.sub}</span>
                                    <span className="ml-auto font-mono text-[9px] tracking-wider text-slate-500 flex-shrink-0">
                                        #{(remoteHit.event.action_id || "").slice(-8)}
                                    </span>
                                </li>
                            )}
                        </ul>
                    </>
                )}
            </div>

            {/* Tickers · sends + replies */}
            <div className="grid grid-cols-1 gap-px bg-white/5 lg:grid-cols-2">
                <Ticker
                    label="Recent Sends"
                    icon={Mail}
                    tone="cyan"
                    items={recentSends}
                    formatter={fmtAge}
                    testid={`${testId}-ticker-sends`}
                    emptyText="No sends in the last cycle."
                />
                <Ticker
                    label="Recent Replies"
                    icon={MessageSquare}
                    tone="emerald"
                    items={recentReplies}
                    formatter={fmtAge}
                    testid={`${testId}-ticker-replies`}
                    emptyText="No replies yet."
                />
            </div>

            {/* Footer · mode reason + last update */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                    {data?.mode_reason || (error ? `error · ${String(error).slice(0, 80)}` : "—")}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                    Polled every {Math.round(pollMs / 1000)}s · last tick {data?.now ? fmtAge(data.now) : "—"}
                </span>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------------ */

const SignalLight = ({ level }) => {
    const ss = signalStyle[level] || signalStyle.yellow;
    return (
        <div className="relative flex h-9 w-9 items-center justify-center" data-testid="live-send-pulse-signal">
            <span className={cls("absolute inset-0 rounded-full opacity-30 animate-ping", ss.dot)} />
            <span className={cls("relative h-3 w-3 rounded-full", ss.dot)} />
        </div>
    );
};

const Kpi = ({ Icon, label, value, tone = "cyan", testid }) => {
    const text = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-cyan-300";
    return (
        <div className="bg-ink-900 px-3 py-3" data-testid={testid}>
            <div className="flex items-center gap-1.5">
                <Icon size={12} className={text} />
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
            </div>
            <p className="font-heading mt-1 text-xl font-semibold text-white">{value}</p>
        </div>
    );
};

const Panel = ({ label, icon: Icon, tone = "cyan", children, testid }) => {
    const text = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-cyan-300";
    return (
        <div className="bg-ink-900 p-4" data-testid={testid}>
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Icon size={12} className={text} />
                <span className={cls("font-mono text-[10px] uppercase tracking-[0.22em]", text)}>{label}</span>
            </div>
            <div className="mt-2.5">{children}</div>
        </div>
    );
};

const Ticker = ({ label, icon: Icon, tone, items, formatter, testid, emptyText }) => {
    const text = tone === "emerald" ? "text-emerald-300" : "text-cyan-300";
    return (
        <div className="bg-ink-900 p-4" data-testid={testid}>
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Icon size={12} className={text} />
                <span className={cls("font-mono text-[10px] uppercase tracking-[0.22em]", text)}>{label}</span>
            </div>
            <ul className="mt-2.5 space-y-1.5">
                {items.length === 0 && <Empty text={emptyText} />}
                {items.map((it, i) => (
                    <li
                        key={`${it.ts}-${i}`}
                        className="flex items-start justify-between gap-3 border-b border-white/5 pb-1.5 last:border-b-0"
                        data-testid={`${testid}-row-${i}`}
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-[11px] text-white">
                                {it.business_name || it.email_masked || "—"}
                            </p>
                            <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                                {it.email_masked || "—"} {it.industry ? `· ${it.industry}` : ""} {it.state ? `· ${it.state}` : ""}
                            </p>
                            {it.subject && (
                                <p className="truncate text-[10px] text-slate-400">{it.subject}</p>
                            )}
                        </div>
                        <span className="flex-shrink-0 font-mono text-[10px] text-slate-400">
                            {formatter(it.ts)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const ProspectLine = ({ ts, kind, business, email, tag, subject, ageFormatter }) => (
    <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-white">{business || email || "—"}</span>
            <span className="font-mono text-[10px] text-slate-400">{ageFormatter(ts)}</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {email || "—"}{tag ? ` · ${tag}` : ""}{kind ? ` · ${kind}` : ""}
        </div>
        {subject && <p className="truncate text-[11px] text-slate-300">{subject}</p>}
    </div>
);

const Empty = ({ text }) => (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{text}</p>
);

export default LiveSendPulse;
