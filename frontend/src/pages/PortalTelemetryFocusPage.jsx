/**
 * PortalTelemetryFocusPage · Iter 96+
 * --------------------------------------------------------------------
 * Founder-auth-gated dashboard at /portal/telemetry/focus that surfaces
 * the homepage's category-filter analytics in a clean operator view.
 *
 * Data:
 *   · GET /api/public/telemetry/focus/summary?days=N (server aggregate)
 *   · /api/public/system-pulse/stream (SSE — same channel as homepage)
 *
 * Auth gate:
 *   · Reads `cb_ops_session` from localStorage
 *   · Calls opsMe(auth) — only `role === 'founder'` is allowed
 *   · Otherwise routes back to /portal
 *
 * Layout:
 *   · Top KPI strip — total focus events, top campaign, avg dwell
 *   · Per-category leaderboard (rank by selects)
 *   · Avg dwell-time per category (bar)
 *   · Top 10 campaigns table
 *   · Live SSE pulse — last 10 events (mirrors homepage feed)
 *   · Day selector chip row (1d / 7d / 30d / 90d)
 *
 * Compose with existing dark command-center aesthetic (ink-900 + cyan).
 * Mobile: 1-col stack. Tablet: 2-col. Desktop: 12-col with 8/4 split.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import {
    BarChart3, Trophy, Clock, Target, Activity, Radio, ArrowLeft,
    LogOut, RefreshCcw, Loader2, Sparkles, AlertTriangle,
} from "lucide-react";
import { opsMe, opsLogout } from "@/lib/api";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = "cb_ops_session";
const DAY_OPTIONS = [
    { id: 1,  label: "1D"  },
    { id: 7,  label: "7D"  },
    { id: 30, label: "30D" },
    { id: 90, label: "90D" },
];
const CATEGORY_ORDER = ["outbound", "revenue", "ai-actions", "alerts", "appointments", "tasks"];
const CATEGORY_LABELS = {
    outbound:       "OUTBOUND",
    revenue:        "REVENUE",
    "ai-actions":   "AI ACTIONS",
    alerts:         "ALERTS",
    appointments:   "APPOINTMENTS",
    tasks:          "TASKS",
};
const CATEGORY_TONES = {
    outbound:       "cyan",
    revenue:        "emerald",
    "ai-actions":   "violet",
    alerts:         "amber",
    appointments:   "violet",
    tasks:          "emerald",
};
const TONE_CLS = {
    emerald: { dot: "bg-emerald-400", text: "text-emerald-200", bar: "bg-emerald-500/60", ring: "ring-emerald-500/30" },
    cyan:    { dot: "bg-cyan-400",    text: "text-cyan-200",    bar: "bg-cyan-500/60",    ring: "ring-cyan-500/30"    },
    violet:  { dot: "bg-violet-400",  text: "text-violet-200",  bar: "bg-violet-500/60",  ring: "ring-violet-500/30"  },
    amber:   { dot: "bg-amber-400",   text: "text-amber-200",   bar: "bg-amber-500/60",   ring: "ring-amber-500/30"   },
};

const fmtDuration = (ms) => {
    if (ms == null) return "—";
    const s = Math.round(ms / 1000);
    if (s < 60)   return `${s}s`;
    if (s < 3600) return `${Math.round(s / 60)}m ${s % 60}s`;
    return `${Math.round(s / 3600)}h`;
};
const fmtNum = (n) => Number(n || 0).toLocaleString();

const readSession = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email && parsed.token) return parsed;
        return null;
    } catch { return null; }
};

export default function PortalTelemetryFocusPage() {
    const navigate = useNavigate();
    const [auth, setAuth]       = useState(null);
    const [authReady, setReady] = useState(false);
    const [days, setDays]       = useState(7);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);
    const [recent, setRecent]   = useState([]);
    const [sseLive, setSseLive] = useState(false);
    const esRef                 = useRef(null);

    // Auth gate — runs once on mount
    useEffect(() => {
        const session = readSession();
        if (!session) {
            navigate("/portal");
            return;
        }
        opsMe({ email: session.email, token: session.token })
            .then((r) => {
                if (!r || r.role !== "founder") {
                    navigate("/portal");
                    return;
                }
                setAuth({ email: session.email, token: session.token, profile: r });
                setReady(true);
            })
            .catch(() => navigate("/portal"));
    }, [navigate]);

    // Load summary whenever days changes (after auth is ready)
    useEffect(() => {
        if (!authReady) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`${BACKEND_URL}/api/public/telemetry/focus/summary?days=${days}`)
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                if (!data || !data.ok) {
                    setError("Failed to load summary");
                    setSummary(null);
                } else {
                    setSummary(data);
                }
            })
            .catch(() => !cancelled && setError("Network error loading summary"))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [days, authReady]);

    // SSE — live pulse mirror of homepage feed
    useEffect(() => {
        if (!authReady || typeof EventSource === "undefined") return undefined;
        let es;
        try {
            es = new EventSource(`${BACKEND_URL}/api/public/system-pulse/stream`);
        } catch { return undefined; }
        esRef.current = es;
        es.addEventListener("ready",     () => setSseLive(true));
        es.addEventListener("heartbeat", () => setSseLive(true));
        es.addEventListener("pulse", (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (!payload || !payload.kind) return;
                setRecent((prev) => [{
                    action_id: payload.action_id || `evt-${Date.now()}`,
                    kind: payload.kind,
                    title: payload.title || "Event",
                    sub: payload.sub || "",
                    ts: Date.now(),
                }, ...prev].slice(0, 10));
            } catch { /* noop */ }
        });
        es.onerror = () => setSseLive(false);
        return () => { try { es.close(); } catch { /* noop */ } };
    }, [authReady]);

    // Derive aggregates from summary
    const aggregates = useMemo(() => {
        if (!summary || !summary.ok) {
            return { perCategory: {}, total: 0, topCampaigns: [], deepLinkLoads: 0 };
        }
        const perCategory = {};
        let total = 0;
        let deepLinkLoads = 0;
        for (const r of summary.rows || []) {
            const slot = perCategory[r.category] || { selects: 0, clears: 0, loads: 0, avg_duration_ms: null };
            if (r.action === "select")           slot.selects = r.count;
            else if (r.action === "clear")       slot.clears  = r.count;
            else if (r.action === "load_with_focus") slot.loads = r.count;
            if (r.action === "clear" && r.avg_duration_ms != null) slot.avg_duration_ms = r.avg_duration_ms;
            perCategory[r.category] = slot;
            total += r.count;
            if (r.action === "load_with_focus") deepLinkLoads += r.count;
        }
        return { perCategory, total, topCampaigns: summary.campaigns || [], deepLinkLoads };
    }, [summary]);

    const topCategory = useMemo(() => {
        const pc = aggregates.perCategory;
        let best = null;
        for (const c of CATEGORY_ORDER) {
            const s = pc[c];
            if (!s) continue;
            const score = s.selects + s.loads;
            if (!best || score > best.score) best = { id: c, score, slot: s };
        }
        return best;
    }, [aggregates]);

    const overallAvgDwell = useMemo(() => {
        const dur = [];
        for (const c of Object.keys(aggregates.perCategory)) {
            const s = aggregates.perCategory[c];
            if (s.avg_duration_ms != null) dur.push(s.avg_duration_ms);
        }
        if (!dur.length) return null;
        return Math.round(dur.reduce((a, b) => a + b, 0) / dur.length);
    }, [aggregates]);

    // Logout helper
    const onLogout = async () => {
        try { if (auth) await opsLogout(auth); } catch { /* noop */ }
        localStorage.removeItem(STORAGE_KEY);
        navigate("/portal");
    };

    if (!authReady) {
        return (
            <Layout>
                <div className="flex min-h-[60vh] items-center justify-center" data-testid="telemetry-auth-loading">
                    <Loader2 size={20} className="animate-spin text-cyan-400" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <main
                data-testid="portal-telemetry-focus"
                className="relative isolate min-h-screen bg-ink-900 pb-20 pt-8 text-slate-100"
            >
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgba(34,211,238,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.4)_1px,transparent_1px)] [background-size:60px_60px]" />

                <div className="mx-auto max-w-[1480px] px-5 lg:px-10">
                    <Header
                        founderEmail={auth.email}
                        days={days}
                        onSetDays={setDays}
                        onRefresh={() => setDays((d) => d)}
                        onLogout={onLogout}
                        loading={loading}
                    />

                    {error && (
                        <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3" data-testid="telemetry-error">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200">
                                <AlertTriangle size={12} className="-mt-0.5 mr-1 inline" />
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Top KPI strip */}
                    <KPIStrip
                        total={aggregates.total}
                        deepLinkLoads={aggregates.deepLinkLoads}
                        topCategory={topCategory}
                        topCampaign={aggregates.topCampaigns[0] || null}
                        overallAvgDwell={overallAvgDwell}
                        loading={loading}
                    />

                    {/* Main grid */}
                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-8 space-y-6">
                            <CategoryLeaderboard perCategory={aggregates.perCategory} loading={loading} />
                            <DwellTimeBar perCategory={aggregates.perCategory} />
                        </div>
                        <div className="lg:col-span-4 space-y-6">
                            <CampaignsTable campaigns={aggregates.topCampaigns} />
                            <LiveSSEFeed events={recent} sseLive={sseLive} />
                        </div>
                    </div>
                </div>
            </main>
        </Layout>
    );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

const Header = ({ founderEmail, days, onSetDays, onRefresh, onLogout, loading }) => (
    <header data-testid="telemetry-header" className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
            <Link
                to="/portal/ops"
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.20em] text-slate-400 hover:text-cyan-300 transition"
                data-testid="telemetry-back-link"
            >
                <ArrowLeft size={11} /> Operator Console
            </Link>
            <h1 className="font-heading mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Focus Telemetry
            </h1>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.20em] text-slate-400">
                Homepage · category lens engagement & campaign attribution · founder view
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                · {founderEmail}
            </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-white/10 bg-ink-800/60" data-testid="telemetry-day-selector">
                {DAY_OPTIONS.map((opt) => (
                    <button
                        type="button"
                        key={opt.id}
                        onClick={() => onSetDays(opt.id)}
                        data-testid={`telemetry-days-${opt.id}`}
                        data-active={days === opt.id ? "true" : "false"}
                        className={`px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                            days === opt.id
                                ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={onRefresh}
                data-testid="telemetry-refresh"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-800/60 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
            >
                {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />}
                Refresh
            </button>
            <button
                type="button"
                onClick={onLogout}
                data-testid="telemetry-logout"
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200 transition hover:border-rose-400/50"
            >
                <LogOut size={11} /> Logout
            </button>
        </div>
    </header>
);

const KPIStrip = ({ total, deepLinkLoads, topCategory, topCampaign, overallAvgDwell }) => {
    const cards = [
        { id: "total",       label: "TOTAL EVENTS",       value: fmtNum(total),                                            icon: Activity, tone: "cyan",    sub: "All actions" },
        { id: "deeplinks",   label: "DEEP-LINK LOADS",    value: fmtNum(deepLinkLoads),                                    icon: Target,   tone: "violet",  sub: "Visitors landed with ?focus=" },
        { id: "topcat",      label: "TOP LENS",           value: topCategory ? CATEGORY_LABELS[topCategory.id] : "—",      icon: Trophy,   tone: topCategory ? CATEGORY_TONES[topCategory.id] : "cyan", sub: topCategory ? `${fmtNum(topCategory.score)} interactions` : "" },
        { id: "avgdwell",    label: "AVG DWELL",          value: fmtDuration(overallAvgDwell),                             icon: Clock,    tone: "emerald", sub: "Filter-active duration" },
        { id: "topcamp",     label: "TOP CAMPAIGN",       value: topCampaign ? topCampaign.campaign : "—",                 icon: Sparkles, tone: "amber",   sub: topCampaign ? `${fmtNum(topCampaign.count)} events` : "" },
    ];
    return (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="telemetry-kpi-strip">
            {cards.map((c) => {
                const Icon = c.icon;
                const tone = TONE_CLS[c.tone] || TONE_CLS.cyan;
                return (
                    <div
                        key={c.id}
                        data-testid={`telemetry-kpi-${c.id}`}
                        className={`relative overflow-hidden rounded-xl border border-white/10 bg-ink-800/40 p-4 ring-1 ${tone.ring} backdrop-blur-sm`}
                    >
                        <div className="flex items-center gap-2">
                            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {c.label}
                            </span>
                            <Icon size={11} className={`ml-auto ${tone.text}`} strokeWidth={1.7} />
                        </div>
                        <p className={`font-heading mt-2 text-[20px] leading-tight font-semibold tabular-nums ${tone.text}`} data-testid={`telemetry-kpi-${c.id}-value`}>
                            {c.value}
                        </p>
                        {c.sub && (
                            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-slate-500">
                                {c.sub}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const CategoryLeaderboard = ({ perCategory }) => {
    const rows = CATEGORY_ORDER.map((id) => ({
        id,
        label: CATEGORY_LABELS[id],
        tone: CATEGORY_TONES[id],
        ...(perCategory[id] || { selects: 0, clears: 0, loads: 0, avg_duration_ms: null }),
    })).sort((a, b) => (b.selects + b.loads) - (a.selects + a.loads));
    const max = Math.max(1, ...rows.map((r) => r.selects + r.loads));

    return (
        <section data-testid="telemetry-category-leaderboard" className="rounded-xl border border-white/10 bg-ink-800/40 backdrop-blur-sm">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-cyan-300" />
                    <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-300">
                        Category Engagement Leaderboard
                    </h2>
                </div>
            </header>
            <div className="divide-y divide-white/5" data-testid="telemetry-leaderboard-rows">
                {rows.map((r, idx) => {
                    const tone  = TONE_CLS[r.tone] || TONE_CLS.cyan;
                    const score = r.selects + r.loads;
                    const pct   = Math.max(2, Math.round((score / max) * 100));
                    return (
                        <div
                            key={r.id}
                            data-testid={`telemetry-row-${r.id}`}
                            className="flex items-center gap-4 px-5 py-3.5"
                        >
                            <span className="w-6 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                #{idx + 1}
                            </span>
                            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            <span className={`w-32 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.text}`}>
                                {r.label}
                            </span>
                            <div className="flex flex-1 items-center gap-3">
                                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                                    <div
                                        className={`absolute inset-y-0 left-0 ${tone.bar} transition-[width] duration-500`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-12 text-right font-mono text-[10px] font-semibold tabular-nums text-slate-200">
                                    {fmtNum(score)}
                                </span>
                            </div>
                            <div className="hidden gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:flex">
                                <span data-testid={`telemetry-row-${r.id}-selects`}>{fmtNum(r.selects)} selects</span>
                                <span data-testid={`telemetry-row-${r.id}-loads`}>{fmtNum(r.loads)} deep-links</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const DwellTimeBar = ({ perCategory }) => {
    const rows = CATEGORY_ORDER.map((id) => ({
        id,
        label: CATEGORY_LABELS[id],
        tone: CATEGORY_TONES[id],
        avg: (perCategory[id] || {}).avg_duration_ms,
    })).filter((r) => r.avg != null);
    if (!rows.length) {
        return (
            <section data-testid="telemetry-dwell" className="rounded-xl border border-white/10 bg-ink-800/40 p-5 backdrop-blur-sm">
                <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-300">
                    <Clock size={12} className="-mt-0.5 mr-1.5 inline" /> Avg Dwell Per Category
                </h2>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    No clear-events recorded for this period yet.
                </p>
            </section>
        );
    }
    const max = Math.max(...rows.map((r) => r.avg));
    return (
        <section data-testid="telemetry-dwell" className="rounded-xl border border-white/10 bg-ink-800/40 p-5 backdrop-blur-sm">
            <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-300">
                <Clock size={12} className="-mt-0.5 mr-1.5 inline" /> Avg Dwell Per Category
            </h2>
            <div className="mt-4 space-y-3">
                {rows.map((r) => {
                    const tone = TONE_CLS[r.tone] || TONE_CLS.cyan;
                    const pct  = Math.max(4, Math.round((r.avg / max) * 100));
                    return (
                        <div key={r.id} className="flex items-center gap-3" data-testid={`telemetry-dwell-${r.id}`}>
                            <span className={`w-32 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.text}`}>
                                {r.label}
                            </span>
                            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                                <div
                                    className={`absolute inset-y-0 left-0 ${tone.bar} transition-[width] duration-500`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="w-16 text-right font-mono text-[10px] font-semibold tabular-nums text-slate-200">
                                {fmtDuration(r.avg)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const CampaignsTable = ({ campaigns }) => {
    return (
        <section data-testid="telemetry-campaigns" className="rounded-xl border border-white/10 bg-ink-800/40 backdrop-blur-sm">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-300" />
                    <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-300">
                        Top Campaigns (UTM)
                    </h2>
                </div>
            </header>
            <div className="divide-y divide-white/5" data-testid="telemetry-campaigns-rows">
                {!campaigns.length && (
                    <p className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        No UTM-attributed events yet — use ?utm_campaign=xyz on share links.
                    </p>
                )}
                {campaigns.slice(0, 10).map((c, idx) => (
                    <div key={c.campaign} className="flex items-center gap-3 px-5 py-2.5" data-testid={`telemetry-campaign-${c.campaign}`}>
                        <span className="w-6 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            #{idx + 1}
                        </span>
                        <span className="flex-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-slate-200">
                            {c.campaign}
                        </span>
                        <span className="font-mono text-[10px] font-semibold tabular-nums text-amber-200">
                            {fmtNum(c.count)}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
};

const LiveSSEFeed = ({ events, sseLive }) => (
    <section data-testid="telemetry-sse-feed" className="rounded-xl border border-white/10 bg-ink-800/40 backdrop-blur-sm">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <div className="flex items-center gap-2">
                <Radio size={14} className={sseLive ? "text-cyan-300" : "text-slate-500"} />
                <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-300">
                    Live System Pulse
                </h2>
            </div>
            <span className="inline-flex items-center gap-1.5">
                <span className="relative inline-flex h-1.5 w-1.5">
                    <span className={`absolute inline-flex h-full w-full rounded-full ${sseLive ? "animate-ping bg-emerald-400 opacity-70" : "bg-slate-500"}`} />
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${sseLive ? "bg-emerald-400" : "bg-slate-500"}`} />
                </span>
                <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {sseLive ? "Connected" : "Disconnected"}
                </span>
            </span>
        </header>
        <div className="divide-y divide-white/5" data-testid="telemetry-sse-rows">
            {!events.length && (
                <p className="px-5 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Awaiting next operational event…
                </p>
            )}
            {events.map((e) => (
                <a
                    key={`${e.action_id}-${e.ts}`}
                    href={`/?action=${encodeURIComponent(e.action_id)}`}
                    className="block px-5 py-2.5 transition hover:bg-white/5"
                    data-testid={`telemetry-sse-row-${e.action_id}`}
                >
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                            {e.kind}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-200 truncate">
                            {e.title}
                        </span>
                        <span className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.18em] text-slate-600">
                            #{(e.action_id || "").slice(0, 8)}…
                        </span>
                    </div>
                </a>
            ))}
        </div>
    </section>
);
