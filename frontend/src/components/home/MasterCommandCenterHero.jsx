import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Activity, Bell, ChevronRight, ShieldCheck, Workflow, Zap, TrendingUp,
    DollarSign, Users, CheckCircle2, Target, ArrowRight, Sparkles,
    Server, RadioTower, Lock, Globe2, Clock, Search, X,
} from "lucide-react";
import { MasterHomepageAvatar } from "@/components/avatar/MasterHomepageAvatar";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PULSE_POLL_MS = 30000;       // KPI/header refresh — events come via SSE
const SSE_RECONNECT_MS = 5000;     // backoff before re-opening dropped streams
const FEED_MAX_ITEMS = 6;

/**
 * MasterCommandCenterHero
 * --------------------------------------------------------------
 * Iter 86 · Homepage hero rebuilt around the "CreatorBoostAI Master
 * Experience" command-center framework. The 5-scene avatar plays inside
 * the Welcome panel; the Live Execution Feed and Today's Impact KPIs
 * render the live-AI-operating-system feel around it.
 *
 * Layout (desktop): top status bar · 12-col grid below.
 *   [3 cols] welcome avatar
 *   [5 cols] welcome copy + trust strip
 *   [4 cols] Live Execution Feed + Today's Impact
 *
 * Layout (mobile): stacked. Avatar top, copy below, feed + KPIs at the
 * bottom.
 */

const FALLBACK_EVENTS = [
    { action_id: "fb-lead-001",  time: "9:41 AM", kind: "lead",        title: "Lead from Website captured", sub: "Routed to Sales Rep · M.S.",   tone: "cyan" },
    { action_id: "fb-maint-002", time: "9:40 AM", kind: "maintenance", title: "Maintenance Alert resolved", sub: "Asset APU-410 · Terminal 3",   tone: "amber" },
    { action_id: "fb-email-003", time: "9:40 AM", kind: "email",       title: "Follow-up Email sent",       sub: "Lead · Solar Project Inquiry", tone: "emerald" },
    { action_id: "fb-deal-004",  time: "9:39 AM", kind: "deal",        title: "Deal Stage updated",         sub: "Property · Under Contract",    tone: "fuchsia" },
    { action_id: "fb-inv-005",   time: "9:38 AM", kind: "invoice",     title: "Invoice generated",          sub: "Auto-routed for approval",     tone: "cyan" },
    { action_id: "fb-appt-006",  time: "9:36 AM", kind: "appointment", title: "New Appointment Booked",     sub: "Calendar synced · Reminder set", tone: "violet" },
];

const FALLBACK_KPIS = {
    revenue_impact: { value: "$1.42M", delta: "+18%" },
    leads_captured: { value: "342",    delta: "+24%" },
    deals_pipeline: { value: "128",    delta: "+15%" },
    tasks_done:     { value: "1,247",  delta: "+31%" },
    system_health_pct: 100,
};

const TONE_CLS = {
    cyan:     "bg-cyan-400 text-cyan-300",
    emerald:  "bg-emerald-400 text-emerald-300",
    amber:    "bg-amber-400 text-amber-300",
    fuchsia:  "bg-fuchsia-400 text-fuchsia-300",
    violet:   "bg-violet-400 text-violet-300",
};

export const MasterCommandCenterHero = () => {
    // Live-feed clock — gives the dashboard a "live system" feel
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30 * 1000);
        return () => window.clearInterval(id);
    }, []);
    const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Live system pulse — polls /api/public/system-pulse every 8s.
    // Falls back to curated demo data on any error so the hero never feels dead.
    const [pulse, setPulse] = useState({
        events: FALLBACK_EVENTS,
        kpis: FALLBACK_KPIS,
        ai_actions_today: 287,
        systems_operational: true,
        streaming: true,
        connected_count: 0,
        live: false, /* true once we get a successful response */
    });

    // Initial-paint snapshot + slower (30s) KPI / header refresh.
    // Live event pushes happen via the SSE effect below — those land
    // sub-second the moment a real send/lead/deal is logged.
    useEffect(() => {
        let cancelled = false;
        let timer = null;
        const tick = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/public/system-pulse`, { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (cancelled) return;
                setPulse((prev) => ({
                    // Prefer the prepended SSE events when we already have
                    // them; only seed `events` from the GET response on the
                    // very first paint (before any SSE event has landed).
                    events: prev.live && prev.events && prev.events.length
                        ? prev.events
                        : (Array.isArray(json.events) && json.events.length ? json.events : FALLBACK_EVENTS),
                    kpis: { ...FALLBACK_KPIS, ...(json.kpis || {}) },
                    ai_actions_today: Number(json.ai_actions_today) || 287,
                    systems_operational: !!json.systems_operational,
                    streaming: !!json.streaming,
                    connected_count: prev.live ? prev.connected_count : Number(json.connected_count) || 0,
                    live: prev.live, // SSE controls the "live" badge
                }));
            } catch {
                /* swallow; keep last good state */
            } finally {
                if (!cancelled) timer = window.setTimeout(tick, PULSE_POLL_MS);
            }
        };
        tick();
        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, []);

    // Iter 89 · Server-Sent Events channel — sub-second push of new
    // execution events the moment they hit `outbound_events`. Auto-
    // reconnects with backoff when the stream drops; falls through
    // gracefully to the GET poll above if the browser blocks SSE.
    useEffect(() => {
        let es = null;
        let reconnectTimer = null;
        let cancelled = false;

        const open = () => {
            if (cancelled) return;
            try {
                es = new EventSource(`${BACKEND_URL}/api/public/system-pulse/stream`);
            } catch {
                // EventSource not available in this browser — stay on GET poll
                return;
            }

            es.addEventListener("ready", (e) => {
                if (cancelled) return;
                let count = 0;
                try { count = Number(JSON.parse(e.data).connected_count) || 0; } catch { /* noop */ }
                setPulse((prev) => ({ ...prev, live: true, streaming: true, connected_count: count }));
            });

            es.addEventListener("heartbeat", (e) => {
                if (cancelled) return;
                let count = 0;
                try { count = Number(JSON.parse(e.data).connected_count) || 0; } catch { /* noop */ }
                setPulse((prev) => ({ ...prev, live: true, streaming: true, connected_count: count }));
            });

            es.addEventListener("pulse", (e) => {
                if (cancelled) return;
                let payload = null;
                try { payload = JSON.parse(e.data); } catch { return; }
                if (!payload || !payload.title) return;
                setPulse((prev) => {
                    const next = [payload, ...(prev.events || [])].slice(0, FEED_MAX_ITEMS);
                    return { ...prev, events: next, live: true, streaming: true };
                });
            });

            es.onerror = () => {
                if (cancelled) return;
                setPulse((prev) => ({ ...prev, live: false }));
                try { es && es.close(); } catch { /* noop */ }
                es = null;
                // Backoff reconnect — keeps the channel resilient through
                // brief proxy / network blips without spamming connects.
                reconnectTimer = window.setTimeout(open, SSE_RECONNECT_MS);
            };
        };

        open();
        return () => {
            cancelled = true;
            if (reconnectTimer) window.clearTimeout(reconnectTimer);
            try { es && es.close(); } catch { /* noop */ }
        };
    }, []);

    const events = pulse.events;
    const kpis = pulse.kpis;
    const aiActionsLabel = useMemo(
        () => `${(pulse.ai_actions_today || 0).toLocaleString()} actions executed today`,
        [pulse.ai_actions_today],
    );
    const systemStatusLabel = pulse.systems_operational ? "All Systems Operational" : "Investigating";
    const systemStatusTone = pulse.systems_operational ? "emerald" : "amber";

    // Iter 92 · Action ID search — operator-grade traceability across
    // the live execution feed. Filters the visible events; if a pasted
    // ID doesn't match anything in the current 6-event buffer, hits the
    // backend lookup (`/api/public/action/{id}`) so off-screen events
    // are still discoverable.
    const [actionQuery, setActionQuery] = useState("");
    const [lookupResult, setLookupResult] = useState({ status: "idle" });
    const trimmedQuery = actionQuery.trim();

    useEffect(() => {
        if (!trimmedQuery || trimmedQuery.length < 4) {
            setLookupResult({ status: "idle" });
            return undefined;
        }
        // Only hit the backend if no current event matches the query
        const lower = trimmedQuery.toLowerCase();
        const localHit = (events || []).some(
            (ev) => (ev.action_id || "").toLowerCase().includes(lower)
                 || (ev.title || "").toLowerCase().includes(lower)
                 || (ev.sub || "").toLowerCase().includes(lower),
        );
        if (localHit) {
            setLookupResult({ status: "local_match" });
            return undefined;
        }
        let cancelled = false;
        const t = window.setTimeout(async () => {
            setLookupResult({ status: "loading" });
            try {
                const res = await fetch(
                    `${BACKEND_URL}/api/public/action/${encodeURIComponent(trimmedQuery)}`,
                    { cache: "no-store" },
                );
                const json = await res.json();
                if (cancelled) return;
                if (json && json.ok && json.found && json.event) {
                    setLookupResult({ status: "remote_match", event: json.event });
                } else {
                    setLookupResult({ status: "miss", reason: json?.reason || "not_found" });
                }
            } catch {
                if (!cancelled) setLookupResult({ status: "error" });
            }
        }, 250); // light debounce so paste doesn't blast the API
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [trimmedQuery, events]);

    // Filter events matching the query for visual highlighting
    const matches = (ev) => {
        if (!trimmedQuery) return true;
        const q = trimmedQuery.toLowerCase();
        return (ev.action_id || "").toLowerCase().includes(q)
            || (ev.title || "").toLowerCase().includes(q)
            || (ev.sub || "").toLowerCase().includes(q);
    };

    return (
        <section
            className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-[#040714] via-[#06091a] to-[#070b22] px-4 py-8 lg:px-8 lg:py-12"
            data-testid="master-command-center-hero"
        >
            {/* Server-rack ambient backdrop — mimics the data-center vibe of the source image */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.10]" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.18),transparent_55%)]" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(6,182,212,0.05)_60%,rgba(6,182,212,0.10))]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />
            </div>

            <div className="relative mx-auto max-w-[1400px]">
                {/* ─────────── Top status bar ─────────── */}
                <header
                    className="flex flex-col items-start justify-between gap-4 rounded-md border border-cyan-500/15 bg-ink-900/60 px-4 py-3 backdrop-blur-md md:flex-row md:items-center"
                    data-testid="mcc-top-header"
                >
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-md border border-cyan-500/40 bg-cyan-500/10 font-heading text-xs font-bold text-cyan-300">
                            CB
                        </div>
                        <div>
                            <h1 className="font-heading text-lg font-bold tracking-wide text-white sm:text-xl" data-testid="mcc-title">
                                CREATORBOOSTAI MASTER EXPERIENCE
                            </h1>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                The operating system for every business
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusChip
                            tone={systemStatusTone}
                            label="Live System Status"
                            value={systemStatusLabel}
                            Icon={Activity}
                            testid="mcc-status-system"
                            pulse
                        />
                        <StatusChip
                            tone="cyan"
                            label="AI Activity"
                            value={aiActionsLabel}
                            Icon={Zap}
                            testid="mcc-status-ai"
                        />
                        <StatusChip
                            tone="slate"
                            label={clock}
                            value={pulse.live ? "Live" : "Local"}
                            Icon={Clock}
                            testid="mcc-status-clock"
                        />
                    </div>
                </header>

                {/* ─────────── 12-col main grid ─────────── */}
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                    {/* COL A · Avatar + scene rail */}
                    <div className="lg:col-span-4">
                        <div className="rounded-md border border-cyan-500/20 bg-ink-900/60 p-4 backdrop-blur-md">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                    AI Operator · Live
                                </span>
                                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                                    <RadioTower size={10} className="animate-pulse" /> On air
                                </span>
                            </div>
                            <div className="flex justify-center">
                                <MasterHomepageAvatar testId="home-hero-avatar" />
                            </div>
                        </div>
                    </div>

                    {/* COL B · Welcome copy + trust pillars + CTAs */}
                    <div className="lg:col-span-5">
                        <div className="rounded-md border border-cyan-500/20 bg-ink-900/55 p-5 backdrop-blur-md lg:p-6">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300" data-testid="mcc-welcome-eyebrow">
                                Welcome to
                            </p>
                            <h2 className="font-heading mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                                CreatorBoost<span className="text-cyan-400">AI</span>
                            </h2>
                            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                Your AI Operating System
                            </p>
                            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-[15px]">
                                I sit on top of the software you already use and turn it into{" "}
                                <span className="text-white">one intelligent, connected, and fully executing system</span>.
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="mcc-trust-strip">
                                <TrustPill Icon={Workflow}     title="No replacement"   sub="Works with what you already use" />
                                <TrustPill Icon={Server}       title="No migration"     sub="No data moves. You stay in control." />
                                <TrustPill Icon={Activity}     title="Real-time"        sub="We don't just report. We run." />
                                <TrustPill Icon={ShieldCheck}  title="Secure & SOC 2"   sub="Enterprise-grade security baked in." />
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-2.5">
                                <Link
                                    to="/demo"
                                    data-testid="mcc-cta-launch-demo"
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400"
                                >
                                    <Sparkles size={14} /> Launch interactive demo <ArrowRight size={13} />
                                </Link>
                                <Link
                                    to="/startup"
                                    data-testid="mcc-cta-startup"
                                    className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/10"
                                >
                                    Build my business <ChevronRight size={14} />
                                </Link>
                                <Link
                                    to="/portal/ops"
                                    data-testid="mcc-cta-command-center"
                                    className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-ink-700/50 px-5 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-cyan-500/40 hover:text-cyan-300"
                                >
                                    Command center
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* COL C · Live Execution Feed (top) + Today's Impact (bottom) */}
                    <div className="space-y-4 lg:col-span-3">
                        <div
                            className="rounded-md border border-cyan-500/20 bg-ink-900/60 p-3 backdrop-blur-md"
                            data-testid="mcc-execution-feed"
                        >
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                    Live execution feed
                                </span>
                                <span
                                    className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] ${pulse.live ? "text-emerald-300" : "text-slate-400"}`}
                                    data-testid="mcc-feed-status"
                                    title={pulse.live ? "Subscribed to /api/public/system-pulse/stream" : "Reconnecting…"}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${pulse.live ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                                    {pulse.live ? "Streaming Live" : "Connecting…"}
                                    {pulse.live && pulse.connected_count > 0 && (
                                        <span className="text-slate-500" data-testid="mcc-connected-count">
                                            · {pulse.connected_count.toLocaleString()} connected
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Iter 92 · Action ID search — operator traceability */}
                            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-900/70 px-2 py-1.5" data-testid="mcc-action-search">
                                <Search size={11} className="flex-shrink-0 text-slate-500" />
                                <input
                                    type="text"
                                    value={actionQuery}
                                    onChange={(e) => setActionQuery(e.target.value)}
                                    placeholder="Search Action ID · paste 24-char ID to trace"
                                    className="flex-1 bg-transparent font-mono text-[11px] text-cyan-200 placeholder:text-slate-500 focus:outline-none"
                                    data-testid="mcc-action-search-input"
                                    spellCheck={false}
                                />
                                {trimmedQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setActionQuery("")}
                                        className="text-slate-500 hover:text-cyan-300"
                                        data-testid="mcc-action-search-clear"
                                        title="Clear"
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                            {trimmedQuery && trimmedQuery.length >= 4 && lookupResult.status === "miss" && (
                                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-300" data-testid="mcc-action-search-miss">
                                    No match in current feed · {lookupResult.reason === "invalid_format" ? "ID format invalid" : "ID not found"}
                                </p>
                            )}
                            {lookupResult.status === "loading" && (
                                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                                    Looking up…
                                </p>
                            )}

                            <ul className="mt-2 space-y-2">
                                {events.map((e, i) => {
                                    const tone = TONE_CLS[e.tone] || TONE_CLS.cyan;
                                    const isMatch = matches(e);
                                    const dimmed = trimmedQuery && !isMatch;
                                    const highlighted = trimmedQuery && isMatch;
                                    const aidShort = (e.action_id || "").slice(-8) || "—";
                                    return (
                                        <li
                                            key={`${e.action_id || e.kind}-${e.time}-${i}`}
                                            className={`rounded border p-2 transition-all ${
                                                highlighted
                                                    ? "border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/30 shadow-[0_0_18px_rgba(6,182,212,0.25)]"
                                                    : dimmed
                                                        ? "border-white/5 bg-ink-700/20 opacity-40"
                                                        : "border-white/5 bg-ink-700/40"
                                            }`}
                                            data-testid={`mcc-feed-item-${i}`}
                                            data-action-id={e.action_id || ""}
                                            data-match={highlighted ? "true" : "false"}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`h-1.5 w-1.5 rounded-full ${tone.split(" ")[0]} ${i === 0 ? "animate-pulse" : ""}`} />
                                                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{e.time}</span>
                                                <span className="ml-auto font-mono text-[9px] tracking-wider text-slate-600" title={e.action_id || ""}>
                                                    #{aidShort}
                                                </span>
                                            </div>
                                            <p className={`mt-1 text-xs font-medium ${tone.split(" ")[1]}`}>{e.title}</p>
                                            <p className="text-[11px] text-slate-400">{e.sub}</p>
                                        </li>
                                    );
                                })}
                                {/* Remote-match: surface the searched-for event below the live feed */}
                                {lookupResult.status === "remote_match" && lookupResult.event && (
                                    <li
                                        className="rounded border border-cyan-400/60 bg-cyan-500/10 p-2 ring-1 ring-cyan-400/30 shadow-[0_0_18px_rgba(6,182,212,0.25)]"
                                        data-testid="mcc-action-search-remote-match"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                            <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">From audit log · {lookupResult.event.time}</span>
                                            <span className="ml-auto font-mono text-[9px] tracking-wider text-slate-500">
                                                #{(lookupResult.event.action_id || "").slice(-8)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs font-medium text-cyan-200">{lookupResult.event.title}</p>
                                        <p className="text-[11px] text-slate-400">{lookupResult.event.sub}</p>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Today's Impact KPIs */}
                        <div
                            className="rounded-md border border-cyan-500/20 bg-ink-900/60 p-3 backdrop-blur-md"
                            data-testid="mcc-todays-impact"
                        >
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                    Today's impact
                                </span>
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                    Auto-refreshed
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <KpiTile Icon={DollarSign}    label="Revenue impact"     value={kpis.revenue_impact?.value} delta={kpis.revenue_impact?.delta} tone="emerald" testid="mcc-kpi-revenue" />
                                <KpiTile Icon={Target}        label="Leads captured"     value={kpis.leads_captured?.value} delta={kpis.leads_captured?.delta} tone="cyan"    testid="mcc-kpi-leads" />
                                <KpiTile Icon={TrendingUp}    label="Deals in pipeline"  value={kpis.deals_pipeline?.value} delta={kpis.deals_pipeline?.delta} tone="cyan"    testid="mcc-kpi-deals" />
                                <KpiTile Icon={CheckCircle2}  label="Tasks completed"    value={kpis.tasks_done?.value}     delta={kpis.tasks_done?.delta}     tone="emerald" testid="mcc-kpi-tasks" />
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <Users size={12} className="text-emerald-300" />
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">System health</span>
                                </div>
                                <span className="font-mono text-sm font-semibold text-emerald-200" data-testid="mcc-system-health">
                                    {kpis.system_health_pct ?? 100}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─────────── Bottom integration / sovereignty strip ─────────── */}
                <div
                    className="mt-5 grid grid-cols-1 gap-3 rounded-md border border-cyan-500/15 bg-ink-900/55 p-4 backdrop-blur-md md:grid-cols-3"
                    data-testid="mcc-sovereignty-strip"
                >
                    <div className="flex items-center gap-3">
                        <Globe2 size={20} className="flex-shrink-0 text-cyan-300" />
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">No rip & replace</p>
                            <p className="text-xs text-slate-300">Sits on top of Salesforce, SAP, Oracle, Microsoft, QuickBooks · 40+ more.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Lock size={20} className="flex-shrink-0 text-emerald-300" />
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Sovereignty layer</p>
                            <p className="text-xs text-slate-300">Your data stays under your control. Governed execution layer, not data ownership.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="flex-shrink-0 text-amber-300" />
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Built for every role</p>
                            <p className="text-xs text-slate-300">Owners · operators · sales reps · employees · founders. One system, every team.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

/* ─────────── Sub-components ─────────── */

const StatusChip = ({ tone = "cyan", label, value, Icon, testid, pulse }) => {
    const cls = {
        emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        cyan:    "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
        slate:   "border-white/10 bg-ink-700/50 text-slate-300",
    }[tone];
    return (
        <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 ${cls}`} data-testid={testid}>
            {Icon && <Icon size={12} className={pulse ? "animate-pulse" : ""} />}
            <div className="leading-tight">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] opacity-80">{label}</p>
                <p className="font-mono text-[10px] font-medium">{value}</p>
            </div>
        </div>
    );
};

const TrustPill = ({ Icon, title, sub }) => (
    <div className="flex items-start gap-2 rounded-md border border-white/5 bg-ink-700/40 p-2">
        <Icon size={14} className="mt-0.5 flex-shrink-0 text-cyan-300" />
        <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">{title}</p>
            <p className="text-[11px] text-slate-300">{sub}</p>
        </div>
    </div>
);

const KpiTile = ({ Icon, label, value, delta, tone = "cyan", testid }) => {
    const deltaCls = tone === "emerald" ? "text-emerald-300" : "text-cyan-300";
    return (
        <div className="rounded border border-white/5 bg-ink-700/40 p-2.5" data-testid={testid}>
            <div className="flex items-center justify-between">
                <Icon size={12} className={deltaCls} />
                <span className={`font-mono text-[9px] ${deltaCls}`}>{delta}</span>
            </div>
            <p className="mt-1 font-heading text-base font-bold text-white sm:text-lg">{value}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400">{label}</p>
        </div>
    );
};

export default MasterCommandCenterHero;
