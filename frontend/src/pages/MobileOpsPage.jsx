/**
 * Mobile Founder Ops · /m/ops  (Iter 69)
 *
 * One-handed glance view of the outbound engine. Reuses the same session
 * stored by /portal/ops (`cb_ops_session` in localStorage). If no session,
 * shows a single-input founder-key login.
 *
 * Polls:
 *   - opsOutboundDashboard (system_status + sent_today + warmup)
 *   - opsOutboundQueueStatus (leads waiting + hot leads)
 * every 30s. Pull-to-refresh button at the bottom.
 *
 * No nav chrome, no marketing layout — this is a tool, not a page.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    RefreshCcw, ChevronRight, Activity, Flame, Send, Inbox, LogOut, Loader2,
    Pause, Play,
} from "lucide-react";
import {
    opsFounderAccess, opsOutboundDashboard, opsOutboundQueueStatus,
    opsOutboundPause,
} from "@/lib/api";

const STORAGE_KEY = "cb_ops_session";

const loadSession = () => {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        return s?.email && s?.token ? s : null;
    } catch { return null; }
};

export default function MobileOpsPage() {
    const [auth, setAuth] = useState(loadSession);

    if (!auth) return <MobileLogin onAuth={setAuth} />;
    return <MobileDash auth={auth} onSignOut={() => { localStorage.removeItem(STORAGE_KEY); setAuth(null); }} />;
}

/* ─────────────── Login (single founder-key input) ─────────────── */
const MobileLogin = ({ onAuth }) => {
    const [key, setKey] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!key.trim()) return;
        setBusy(true); setErr(null);
        try {
            const r = await opsFounderAccess(key.trim());
            const session = { email: r.email, token: r.token };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* noop */ }
            onAuth(session);
        } catch (e2) {
            setErr(e2?.response?.data?.detail || e2?.message || "Invalid key");
        } finally { setBusy(false); }
    };

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-ink-900 px-5"
             data-testid="mobile-login">
            <form onSubmit={submit} className="w-full max-w-sm space-y-4">
                <div className="text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        CreatorBoostAI · Mobile Ops
                    </p>
                    <p className="font-heading mt-2 text-3xl font-semibold text-white">
                        Founder access
                    </p>
                </div>
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="founder master key"
                    autoComplete="off"
                    autoFocus
                    data-testid="mobile-login-key"
                    className="w-full rounded-md border border-white/10 bg-ink-700 px-4 py-3.5 text-base text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
                {err && (
                    <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
                       data-testid="mobile-login-error">
                        {err}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={busy}
                    data-testid="mobile-login-submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-3.5 text-base font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                >
                    {busy ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign in"}
                </button>
                <p className="text-center font-mono text-[10px] text-slate-500">
                    Same session as /portal/ops. Stays signed in on this device.
                </p>
            </form>
        </div>
    );
};

/* ─────────────── Dashboard (the at-a-glance) ─────────────── */
const MobileDash = ({ auth, onSignOut }) => {
    const [dash, setDash] = useState(null);
    const [queue, setQueue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [err, setErr] = useState(null);
    const intervalRef = useRef(null);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const [d, q] = await Promise.all([
                opsOutboundDashboard(auth).catch(() => null),
                opsOutboundQueueStatus(auth).catch(() => null),
            ]);
            if (d) setDash(d);
            if (q) setQueue(q);
            setErr(null);
        } catch (e) {
            setErr(e?.message || "Failed to load");
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    }, [auth]);

    useEffect(() => {
        refresh();
        intervalRef.current = setInterval(refresh, 30000);
        return () => clearInterval(intervalRef.current);
    }, [refresh]);

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-ink-900 text-slate-300"
                 data-testid="mobile-loading">
                <Loader2 size={20} className="mr-2 animate-spin" />
                <span className="font-mono text-xs uppercase tracking-[0.22em]">Loading engine…</span>
            </div>
        );
    }

    const sys = dash?.system_status;
    const level = sys?.level || "red";
    const paused = !!dash?.state?.paused;
    const sentToday = dash?.sent_today ?? 0;
    const cap = dash?.warmup?.effective_cap || dash?.state?.daily_limit || 0;
    const leadsReady = queue?.send_eligible_now?.count || 0;
    const leadsUnscored = queue?.scoring_backlog?.count || 0;
    const hotCount = queue?.hot_leads?.count || 0;
    const inFlight = queue?.in_flight_sends?.count || 0;
    const stuck = queue?.stalled_no_progress?.count || 0;
    const errors = sys?.total_errors || 0;
    const lastRunIso = dash?.last_autopilot_run?.started_at;
    const lastRunMin = lastRunIso ? Math.max(0, Math.floor((Date.now() - new Date(lastRunIso).getTime()) / 60000)) : null;

    const SIGNAL = {
        green:  { dot: "bg-emerald-400", glow: "shadow-[0_0_36px_rgba(16,185,129,0.65)]",
                  bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-300" },
        yellow: { dot: "bg-amber-400", glow: "shadow-[0_0_36px_rgba(251,191,36,0.65)]",
                  bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-300" },
        red:    { dot: "bg-rose-400", glow: "shadow-[0_0_36px_rgba(244,63,94,0.65)]",
                  bg: "bg-rose-500/10", border: "border-rose-500/40", text: "text-rose-300" },
    }[level] || { dot: "bg-slate-400", glow: "", bg: "bg-slate-500/10",
                   border: "border-slate-500/30", text: "text-slate-300" };

    return (
        <div className="min-h-[100dvh] bg-ink-900 pb-28 text-slate-100" data-testid="mobile-dash">
            {/* Sticky header */}
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-ink-900/95 px-4 py-3 backdrop-blur">
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Mobile Ops</p>
                    <p className="font-heading text-base font-semibold text-white">CreatorBoostAI</p>
                </div>
                <button
                    onClick={onSignOut}
                    data-testid="mobile-signout"
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300"
                >
                    <LogOut size={11} /> Out
                </button>
            </header>

            <main className="space-y-4 px-4 py-5">
                {err && (
                    <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
                       data-testid="mobile-err">
                        {err}
                    </p>
                )}

                {/* SIGNAL LIGHT — biggest, top */}
                <section className={`rounded-2xl border ${SIGNAL.border} ${SIGNAL.bg} p-5`}
                         data-testid="mobile-signal" data-signal-level={level}>
                    <div className="flex items-center gap-3">
                        <span className={`relative inline-flex h-4 w-4 flex-shrink-0 items-center justify-center`}>
                            {level === "green" && (
                                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${SIGNAL.dot} opacity-60`} />
                            )}
                            <span className={`relative inline-flex h-4 w-4 rounded-full ${SIGNAL.dot} ${SIGNAL.glow}`} />
                        </span>
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Engine signal</p>
                            <p className={`font-heading text-3xl font-semibold ${SIGNAL.text}`} data-testid="mobile-signal-label">
                                {sys?.label || (paused ? "Paused" : "Unknown")}
                            </p>
                        </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300" data-testid="mobile-signal-summary">
                        {sys?.summary || "—"}
                    </p>
                </section>

                {/* THE 4 NUMBERS THAT MATTER */}
                <section className="grid grid-cols-2 gap-3" data-testid="mobile-numbers">
                    <BigStat
                        testid="mobile-sent"
                        label="Sent today"
                        value={sentToday}
                        sub={`${cap}/day cap`}
                        accent="emerald"
                    />
                    <BigStat
                        testid="mobile-ready"
                        label="Ready to send"
                        value={leadsReady}
                        sub={leadsUnscored > 0 ? `+${leadsUnscored} unscored` : "scored & verified"}
                        accent="cyan"
                    />
                    <BigStat
                        testid="mobile-hot"
                        label="Hot leads"
                        value={hotCount}
                        sub={hotCount > 0 ? "positive replies waiting" : "—"}
                        accent={hotCount > 0 ? "rose" : "slate"}
                        pulse={hotCount > 0}
                    />
                    <BigStat
                        testid="mobile-cycle"
                        label="Last cycle"
                        value={lastRunMin != null ? (lastRunMin === 0 ? "just now" : `${lastRunMin}m`) : "—"}
                        sub={dash?.last_autopilot_run?.status || "—"}
                        accent="slate"
                        small
                    />
                </section>

                {/* Detail row · in-flight + stuck + errors */}
                <section className="grid grid-cols-3 gap-2 text-center" data-testid="mobile-detail">
                    <DetailPill label="Sending now" value={inFlight} accent={inFlight > 0 ? "cyan" : "slate"} />
                    <DetailPill label="Stuck >7d" value={stuck} accent={stuck > 0 ? "amber" : "slate"} />
                    <DetailPill label="Errors" value={errors} accent={errors > 0 ? "rose" : "slate"} />
                </section>

                {/* Hot leads — most actionable evidence */}
                {(queue?.hot_leads?.sample || []).length > 0 && (
                    <section className="rounded-md border border-rose-500/25 bg-rose-500/5 p-3"
                             data-testid="mobile-hot-list">
                        <div className="flex items-center gap-1.5">
                            <Flame size={13} className="text-rose-300" />
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">
                                Hot leads · take action
                            </p>
                        </div>
                        <ul className="mt-2 space-y-1.5">
                            {queue.hot_leads.sample.map((p) => (
                                <li key={p.id} data-testid={`mobile-hot-${p.id}`}
                                    className="flex items-center justify-between gap-2 text-sm">
                                    <span className="truncate">
                                        <span className="text-rose-300">→ </span>
                                        <span className="text-white">{p.business_name || p.email}</span>
                                    </span>
                                    {p.lead_score != null && (
                                        <span className="flex-shrink-0 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                                            {p.lead_score}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <a href="/portal/ops"
                           data-testid="mobile-hot-cta"
                           className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md bg-rose-400 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-rose-300">
                            Open desktop ops <ChevronRight size={14} />
                        </a>
                    </section>
                )}

                {/* Recent sends + replies — proof the engine is moving */}
                <section className="grid grid-cols-2 gap-2" data-testid="mobile-evidence">
                    <EvidenceBlock
                        testid="mobile-sends"
                        icon={<Send size={11} className="text-emerald-300" />}
                        label="Last sends"
                        accent="emerald"
                        items={(queue?.recent_sends || []).map((e) => ({
                            id: e.prospect_id || e.email,
                            primary: e.kind || "sent",
                            secondary: e.email,
                        }))}
                    />
                    <EvidenceBlock
                        testid="mobile-replies"
                        icon={<Inbox size={11} className="text-cyan-300" />}
                        label="Last replies"
                        accent="cyan"
                        items={(queue?.recent_replies || []).map((p) => ({
                            id: p.id,
                            primary: p.reply_category || "?",
                            secondary: p.business_name || p.email,
                            tone: p.reply_category === "Interested" ? "emerald"
                                  : p.reply_category === "Not Interested" ? "rose" : "cyan",
                        }))}
                    />
                </section>
            </main>

            {/* Sticky bottom action bar */}
            <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-ink-900/95 px-4 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-md items-center gap-2">
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        data-testid="mobile-refresh"
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 disabled:opacity-60"
                    >
                        <RefreshCcw size={12} className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Refreshing" : "Refresh"}
                    </button>
                    <PauseToggleButton auth={auth} paused={paused} onChange={refresh} />
                </div>
                <p className="mt-1.5 text-center font-mono text-[9px] text-slate-500">
                    Auto-refresh 30s · {sys?.checked_at ? new Date(sys.checked_at).toLocaleTimeString() : "—"}
                </p>
            </footer>
        </div>
    );
};

/* ─────────────── Sub-components ─────────────── */
const BigStat = ({ label, value, sub, accent = "slate", small = false, pulse = false, testid }) => {
    const TONE = {
        emerald: "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-300",
        cyan:    "border-cyan-500/30 bg-cyan-500/[0.07] text-cyan-300",
        rose:    "border-rose-500/30 bg-rose-500/[0.07] text-rose-300",
        amber:   "border-amber-500/30 bg-amber-500/[0.07] text-amber-300",
        slate:   "border-white/10 bg-white/[0.03] text-white",
    }[accent];
    return (
        <div data-testid={testid}
             className={`rounded-2xl border ${TONE.split(" ").slice(0, 2).join(" ")} px-4 py-3.5`}>
            <div className="flex items-center gap-1.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
                {pulse && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />}
            </div>
            <p className={`font-heading mt-1 ${small ? "text-2xl" : "text-4xl"} font-semibold tabular-nums leading-none ${TONE.split(" ").pop()}`}>
                {value}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-slate-500">{sub}</p>
        </div>
    );
};

const DetailPill = ({ label, value, accent = "slate" }) => {
    const tone = {
        cyan: "text-cyan-300", amber: "text-amber-300",
        rose: "text-rose-300", slate: "text-slate-300",
    }[accent];
    return (
        <div className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className={`font-heading mt-0.5 text-base font-semibold tabular-nums ${tone}`}>{value}</p>
        </div>
    );
};

const EvidenceBlock = ({ icon, label, accent, items, testid }) => {
    const TONE = {
        emerald: "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300",
        cyan:    "border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300",
    }[accent] || "border-white/10 bg-white/[0.02] text-slate-300";
    return (
        <div data-testid={testid}
             className={`rounded-md border px-3 py-2.5 ${TONE.split(" ").slice(0, 2).join(" ")}`}>
            <div className="flex items-center gap-1.5">
                {icon}
                <p className={`font-mono text-[9px] uppercase tracking-[0.22em] ${TONE.split(" ").pop()}`}>
                    {label}
                </p>
            </div>
            <ul className="mt-1.5 space-y-0.5">
                {items.length === 0 && (
                    <li className="font-mono text-[10px] text-slate-500">none yet</li>
                )}
                {items.slice(0, 3).map((it) => (
                    <li key={it.id} className="truncate text-[11px]">
                        <span className={`font-mono ${
                            it.tone === "emerald" ? "text-emerald-300" :
                            it.tone === "rose"    ? "text-rose-300" :
                            it.tone === "cyan"    ? "text-cyan-300" :
                                                    "text-slate-300"
                        }`}>{it.primary}</span>{" "}
                        <span className="text-slate-300">· {it.secondary}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const PauseToggleButton = ({ auth, paused, onChange }) => {
    const [busy, setBusy] = useState(false);
    const toggle = async () => {
        setBusy(true);
        try {
            await opsOutboundPause({ ...auth, paused: !paused, reason: "mobile_toggle" });
            await onChange();
        } catch (e) { /* surface in next refresh */ }
        finally { setBusy(false); }
    };
    return (
        <button
            onClick={toggle}
            disabled={busy}
            data-testid="mobile-pause-toggle"
            className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] disabled:opacity-60 ${
                paused
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
            }`}
        >
            {busy ? <Loader2 size={12} className="animate-spin" /> :
              paused ? <><Play size={12} fill="currentColor" /> Resume</> :
                       <><Pause size={12} fill="currentColor" /> Pause</>}
        </button>
    );
};
