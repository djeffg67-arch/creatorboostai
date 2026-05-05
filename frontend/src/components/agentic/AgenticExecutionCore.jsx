import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Activity, Shield, ShieldCheck, Lock, Zap, Cpu, CheckCircle2, Clock, AlertTriangle,
    DollarSign, TrendingUp, ChevronDown, ChevronUp, PlayCircle, PauseCircle, Eye,
    RefreshCcw, Radio, FileCheck2, Sparkles, X,
} from "lucide-react";
import { api } from "@/lib/api";

// ============================================================================
// Agentic Execution Core · shared library for all CreatorBoostAI demos
// Detected → Reasoned → Executed → Measured
// ============================================================================

/**
 * useAgenticEngine() — single source of truth for Action IDs, revenue tally,
 * reasoning stream entries, and execution mode.
 *
 * Demo pages call:
 *   const engine = useAgenticEngine();
 *   engine.fire({ id:"#8821", trigger:"...", reasoning:"...", action:"...",
 *                 impact_usd: 1200, impact_label:"Savings", status:"executed" });
 * when a scene activates.
 */
export function useAgenticEngine({ initialMode = "auto" } = {}) {
    const [ledger, setLedger] = useState([]);        // ActionID rows
    const [stream, setStream] = useState([]);        // reasoning-tape entries
    const [mode, setMode] = useState(initialMode);   // "auto" | "manual"
    const seenIds = useRef(new Set());

    const fire = useCallback((action) => {
        if (!action || !action.id) return;
        if (seenIds.current.has(action.id)) return;
        seenIds.current.add(action.id);
        const ts = new Date().toISOString();
        setLedger((prev) => [{ ...action, ts }, ...prev].slice(0, 60));
        setStream((prev) => [
            { id: action.id, phase: "detected", text: action.trigger, ts },
            { id: action.id, phase: "reasoned", text: action.reasoning, ts },
            { id: action.id, phase: "executed", text: action.action, ts },
            ...(action.impact_usd ? [{
                id: action.id, phase: "measured",
                text: `${action.impact_label || "Savings"}: $${Number(action.impact_usd).toLocaleString()}`,
                ts,
            }] : []),
            ...prev,
        ].slice(0, 120));
    }, []);

    const reset = useCallback(() => {
        setLedger([]); setStream([]);
        seenIds.current = new Set();
    }, []);

    const totals = useMemo(() => {
        const savings = ledger.filter((a) => (a.impact_label || "Savings").toLowerCase().includes("saving"))
            .reduce((s, a) => s + (+a.impact_usd || 0), 0);
        const revenue = ledger.filter((a) => (a.impact_label || "").toLowerCase().includes("revenue"))
            .reduce((s, a) => s + (+a.impact_usd || 0), 0);
        const avoided = ledger.filter((a) => /avoid|prevent|recover/.test((a.impact_label || "").toLowerCase()))
            .reduce((s, a) => s + (+a.impact_usd || 0), 0);
        const total = ledger.reduce((s, a) => s + (+a.impact_usd || 0), 0);
        return { savings, revenue, avoided, total, count: ledger.length };
    }, [ledger]);

    return { ledger, stream, totals, mode, setMode, fire, reset };
}

// ============================================================================
// <ActionLedger> — live scrolling Action ID list
// ============================================================================
export const ActionLedger = ({ ledger, limit = 8, testId = "action-ledger" }) => {
    const rows = (ledger || []).slice(0, limit);
    return (
        <div data-testid={testId}
             className="rounded-md border border-cyan-500/25 bg-ink-900/70 backdrop-blur p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity size={12} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Action ID Ledger</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                    {rows.length}/{(ledger || []).length} shown
                </span>
            </div>
            <div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto">
                {rows.length === 0 && (
                    <p className="font-mono text-[10px] text-slate-500">Awaiting first detection…</p>
                )}
                {rows.map((a) => (
                    <div key={a.id} data-testid={`action-row-${a.id.replace(/[^a-zA-Z0-9]/g,"")}`}
                         className="rounded-sm border border-white/5 bg-ink-700/40 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                                {a.id}
                            </span>
                            <StatusChip status={a.status} />
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-200">{a.action}</p>
                        {a.impact_usd ? (
                            <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-emerald-300">
                                <DollarSign size={9} />
                                {a.impact_label || "Savings"}: ${Number(a.impact_usd).toLocaleString()}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatusChip = ({ status = "executed" }) => {
    const s = (status || "").toLowerCase();
    const map = {
        detected:  { icon: Radio,         cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",  label: "Detected" },
        reasoning: { icon: Cpu,           cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",     label: "Reasoning" },
        executing: { icon: Zap,           cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",     label: "Executing" },
        executed:  { icon: CheckCircle2,  cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", label: "Executed" },
        pending:   { icon: Clock,         cls: "border-slate-500/40 bg-slate-500/10 text-slate-300",  label: "Pending approval" },
        measured:  { icon: FileCheck2,    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", label: "Measured" },
        blocked:   { icon: AlertTriangle, cls: "border-rose-500/40 bg-rose-500/10 text-rose-300",     label: "Blocked" },
    };
    const spec = map[s] || map.executed;
    const Icon = spec.icon;
    return (
        <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${spec.cls}`}>
            <Icon size={9} /> {spec.label}
        </span>
    );
};

// ============================================================================
// <ReasoningStream> — Detected / Reasoned / Executed / Measured tape
// ============================================================================
const PHASE_STYLE = {
    detected:  { icon: Radio,        cls: "text-amber-300 border-amber-500/30" },
    reasoned:  { icon: Cpu,          cls: "text-cyan-300 border-cyan-500/30" },
    executed:  { icon: Zap,          cls: "text-emerald-300 border-emerald-500/30" },
    measured:  { icon: TrendingUp,   cls: "text-emerald-300 border-emerald-500/30" },
};

export const ReasoningStream = ({ stream, limit = 6, testId = "reasoning-stream" }) => {
    const rows = (stream || []).slice(0, limit);
    return (
        <div data-testid={testId}
             className="rounded-md border border-emerald-500/20 bg-ink-900/70 backdrop-blur p-3">
            <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-emerald-300" />
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Live Reasoning Stream</p>
            </div>
            <div className="mt-2 space-y-1">
                {rows.length === 0 && (
                    <p className="font-mono text-[10px] text-slate-500">
                        Detected · Reasoned · Executed · Measured
                    </p>
                )}
                {rows.map((r, i) => {
                    const spec = PHASE_STYLE[r.phase] || PHASE_STYLE.executed;
                    const Icon = spec.icon;
                    return (
                        <div key={`${r.id}-${r.phase}-${i}`}
                             data-testid={`stream-row-${i}`}
                             className={`flex items-start gap-2 rounded-sm border bg-ink-700/30 px-2 py-1 text-[11px] ${spec.cls}`}>
                            <Icon size={10} className="mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] opacity-80">
                                    {r.phase} · {r.id}
                                </span>
                                <p className="mt-0.5 truncate text-slate-200">{r.text}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================================
// <RevenueSavingsCounter> — animated running total
// ============================================================================
export const RevenueSavingsCounter = ({ totals, testId = "revenue-counter" }) => {
    const { savings = 0, revenue = 0, total = 0, count = 0 } = totals || {};
    return (
        <div data-testid={testId}
             className="grid grid-cols-3 gap-2 rounded-md border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-3">
            <CounterTile label="Savings" value={savings} tone="emerald" />
            <CounterTile label="Revenue" value={revenue} tone="cyan" />
            <CounterTile label={`Actions (${count})`} value={total} tone="amber" isTotal />
        </div>
    );
};

const CounterTile = ({ label, value, tone, isTotal }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        // tween to new value over 600ms
        const from = display; const to = value; const start = performance.now();
        let raf;
        const step = (now) => {
            const t = Math.min(1, (now - start) / 600);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(from + (to - from) * eased));
            if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const toneCls = {
        emerald: "text-emerald-300",
        cyan:    "text-cyan-300",
        amber:   "text-amber-300",
    }[tone] || "text-emerald-300";

    return (
        <div data-testid={`counter-${label.toLowerCase().split(' ')[0]}`}>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className={`font-heading mt-0.5 text-lg font-semibold tabular-nums ${toneCls} ${isTotal ? "font-bold" : ""}`}>
                ${display.toLocaleString()}
            </p>
        </div>
    );
};

// ============================================================================
// <ExecutionControlPanel> — Auto ↔ Manual mode toggle
// ============================================================================
export const ExecutionControlPanel = ({ mode, setMode, role = "Operator", testId = "execution-control" }) => (
    <div data-testid={testId}
         className="rounded-md border border-cyan-500/25 bg-ink-900/70 backdrop-blur p-3">
        <div className="flex items-center gap-2">
            <Shield size={12} className="text-cyan-300" />
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Execution Control</p>
        </div>
        <div className="mt-2 flex gap-1">
            <button onClick={() => setMode("auto")}
                data-testid="mode-auto"
                className={`flex-1 inline-flex items-center justify-center gap-1 rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                    mode === "auto" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-ink-700 text-slate-400 hover:text-emerald-300"
                }`}>
                <PlayCircle size={10} /> Auto
            </button>
            <button onClick={() => setMode("manual")}
                data-testid="mode-manual"
                className={`flex-1 inline-flex items-center justify-center gap-1 rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                    mode === "manual" ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 bg-ink-700 text-slate-400 hover:text-amber-300"
                }`}>
                <PauseCircle size={10} /> Manual approval
            </button>
        </div>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Role: {role}</p>
    </div>
);

// ============================================================================
// <SovereignVault> — badge + drawer pulling real backend audit rows
// ============================================================================
export const SovereignVault = ({ testId = "sovereign-vault" }) => {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState([]);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setBusy(true);
        try {
            const r = await api.post("/audit/demo-feed", { limit: 25 }).then((x) => x.data);
            setRows(r?.decisions || []);
        } catch { /* public feed — ignore */ } finally { setBusy(false); }
    };

    useEffect(() => { if (open) load(); }, [open]);

    return (
        <>
            <button onClick={() => setOpen(true)}
                data-testid={`${testId}-toggle`}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300 hover:bg-emerald-500 hover:text-ink-900">
                <Lock size={11} /> Sovereign Vault
            </button>
            {open && (
                <div data-testid={`${testId}-drawer`}
                     className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-emerald-500/20 bg-ink-900 p-5 shadow-[-12px_0_40px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-emerald-300" />
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Sovereign Vault</p>
                                <p className="font-mono text-[10px] text-slate-500">Decision traceability · live from audit ledger</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={load} disabled={busy}
                                data-testid={`${testId}-refresh`}
                                className="inline-flex items-center gap-1 rounded-sm border border-white/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300 hover:text-emerald-300">
                                <RefreshCcw size={10} className={busy ? "animate-spin" : ""} /> Refresh
                            </button>
                            <button onClick={() => setOpen(false)}
                                data-testid={`${testId}-close`}
                                className="rounded-sm border border-white/10 p-1 text-slate-300 hover:text-rose-300">
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                    <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        {rows.length} Rationale Packages on file
                    </p>
                    <div className="mt-2 space-y-2" data-testid={`${testId}-rows`}>
                        {rows.length === 0 && (
                            <p className="font-mono text-[10px] text-slate-500">
                                {busy ? "Loading…" : "No decisions yet — fire an Action to populate."}
                            </p>
                        )}
                        {rows.map((r) => (
                            <div key={r.decision_id}
                                 className="rounded-sm border border-white/5 bg-ink-700/40 px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                                        {r.agent_id} · {r.action}
                                    </span>
                                    {typeof r.confidence === "number" && (
                                        <span className="font-mono text-[9px] text-emerald-300">{r.confidence}%</span>
                                    )}
                                </div>
                                <p className="mt-1 text-[11px] leading-snug text-slate-200">{r.reasoning_summary}</p>
                                <p className="mt-1 font-mono text-[9px] text-slate-500">
                                    {new Date(r.timestamp).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

// ============================================================================
// <DecisionRationalePackage> — expandable per-action card
// ============================================================================
export const DecisionRationalePackage = ({ action, defaultOpen = false, testId = "rationale" }) => {
    const [open, setOpen] = useState(defaultOpen);
    if (!action) return null;
    return (
        <div data-testid={`${testId}-${action.id.replace(/[^a-zA-Z0-9]/g,"")}`}
             className="rounded-md border border-cyan-500/20 bg-ink-700/30 p-3">
            <button onClick={() => setOpen((p) => !p)}
                className="flex w-full items-center justify-between text-left">
                <div className="flex items-center gap-2">
                    <Eye size={12} className="text-cyan-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        {action.id} · Rationale
                    </span>
                </div>
                {open ? <ChevronUp size={11} className="text-cyan-300" /> : <ChevronDown size={11} className="text-cyan-300" />}
            </button>
            {open && (
                <div className="mt-3 space-y-2 font-mono text-[11px]">
                    <RationaleRow label="Detected"  text={action.trigger}   icon={Radio}    tone="amber" />
                    <RationaleRow label="Reasoned"  text={action.reasoning} icon={Cpu}      tone="cyan" />
                    <RationaleRow label="Executed"  text={action.action}    icon={Zap}      tone="emerald" />
                    {action.impact_usd ? (
                        <RationaleRow
                            label="Measured"
                            text={`${action.impact_label || "Savings"}: $${Number(action.impact_usd).toLocaleString()}`}
                            icon={TrendingUp}
                            tone="emerald"
                        />
                    ) : null}
                </div>
            )}
        </div>
    );
};

const RationaleRow = ({ label, text, icon: Icon, tone }) => {
    const cls = {
        amber:   "text-amber-300 border-amber-500/30",
        cyan:    "text-cyan-300 border-cyan-500/30",
        emerald: "text-emerald-300 border-emerald-500/30",
    }[tone] || "text-slate-300 border-white/10";
    return (
        <div className={`flex items-start gap-2 rounded-sm border bg-ink-900 px-2 py-1.5 ${cls}`}>
            <Icon size={11} className="mt-0.5 flex-shrink-0" />
            <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] opacity-80">{label}</p>
                <p className="mt-0.5 text-[11px] text-slate-200">{text}</p>
            </div>
        </div>
    );
};

// ============================================================================
// <PortfolioCommandCenter> — final executive dashboard + Execute button
// ============================================================================
const HEATMAP_TILES = [
    { id: "loc-1142", label: "Store 1142",  region: "South",    risk: 82, savings: 18400,  rev: 6200 },
    { id: "loc-2207", label: "Store 2207",  region: "Midwest",  risk: 68, savings: 12100,  rev: 3800 },
    { id: "loc-3054", label: "Store 3054",  region: "Northeast",risk: 61, savings: 9700,   rev: 5400 },
    { id: "loc-4411", label: "Store 4411",  region: "West",     risk: 57, savings: 8800,   rev: 2900 },
    { id: "loc-5019", label: "Store 5019",  region: "South",    risk: 49, savings: 6500,   rev: 4100 },
    { id: "loc-6122", label: "Store 6122",  region: "Midwest",  risk: 38, savings: 4200,   rev: 2300 },
    { id: "loc-7731", label: "Store 7731",  region: "Northeast",risk: 32, savings: 3400,   rev: 1800 },
    { id: "loc-8865", label: "Store 8865",  region: "West",     risk: 24, savings: 2100,   rev: 900 },
];

export const PortfolioCommandCenter = ({ totals, onExecute, testId = "portfolio-command" }) => {
    const [executing, setExecuting] = useState(false);
    const [done, setDone] = useState(false);

    const execute = async () => {
        setExecuting(true);
        // Visual execution sequence (2s) — upstream owner can intercept via onExecute
        if (onExecute) { try { await onExecute(); } catch { /* noop */ } }
        setTimeout(() => { setExecuting(false); setDone(true); }, 2000);
    };

    const totalSavings = HEATMAP_TILES.reduce((s, t) => s + t.savings, 0);
    const totalRev = HEATMAP_TILES.reduce((s, t) => s + t.rev, 0);

    return (
        <div data-testid={testId}
             className="rounded-md border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Portfolio Command Center</p>
                    <h3 className="font-heading mt-1 text-xl font-semibold text-white">Execute across every location</h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    <span className="text-emerald-300">${totalSavings.toLocaleString()} savings</span>
                    <span className="text-cyan-300">${totalRev.toLocaleString()} revenue</span>
                    <span>{HEATMAP_TILES.length} locations</span>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid={`${testId}-heatmap`}>
                {HEATMAP_TILES.map((t) => {
                    const tone = t.risk >= 70 ? "rose" : t.risk >= 50 ? "amber" : t.risk >= 30 ? "cyan" : "emerald";
                    const cls = {
                        rose:    "border-rose-500/40 bg-rose-500/10",
                        amber:   "border-amber-500/40 bg-amber-500/10",
                        cyan:    "border-cyan-500/40 bg-cyan-500/10",
                        emerald: "border-emerald-500/40 bg-emerald-500/10",
                    }[tone];
                    return (
                        <div key={t.id} data-testid={`${testId}-tile-${t.id}`}
                             className={`rounded-sm border ${cls} p-2`}>
                            <div className="flex items-center justify-between">
                                <p className="font-heading text-[12px] font-semibold text-white">{t.label}</p>
                                <span className="font-mono text-[9px] text-slate-400">{t.region}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em]">
                                <span className="text-slate-300">risk {t.risk}</span>
                                <span className="text-emerald-300">${(t.savings + t.rev).toLocaleString()}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                    onClick={execute}
                    disabled={executing || done}
                    data-testid={`${testId}-execute`}
                    className={`inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold ${
                        done ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40" :
                        "bg-emerald-400 text-ink-900 hover:bg-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                    } disabled:opacity-70`}
                >
                    {executing ? <><RefreshCcw size={14} className="animate-spin" /> Executing rollout…</>
                        : done ? <><CheckCircle2 size={14} /> Rollout plan generated · tasks scheduled</>
                        : <><Zap size={14} /> Execute Portfolio Upgrade</>}
                </button>
                {done && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                        rollout · vendor coord · proposals · task scheduling · all queued
                    </div>
                )}
                {totals && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                        Session · {totals.count || 0} actions · ${Number(totals.total || 0).toLocaleString()} impact
                    </span>
                )}
            </div>
        </div>
    );
};

export default {
    useAgenticEngine,
    ActionLedger,
    ReasoningStream,
    RevenueSavingsCounter,
    ExecutionControlPanel,
    SovereignVault,
    DecisionRationalePackage,
    PortfolioCommandCenter,
};
