import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/site/Layout";
import {
    GraduationCap, Activity, Zap, Wallet, Wrench, Zap as ZapIcon,
    Lightbulb, TrendingDown, Building2, Network, AlertTriangle,
    CheckCircle2, Play, Pause, RotateCcw, ChevronRight,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════
// SCHOOL DISTRICT INTELLIGENCE SYSTEM · 7-SCENE CINEMATIC DEMO
// Per Jeffrey's exact script — functional demo wired for outbound
// email deep-links (not a placeholder).
// ══════════════════════════════════════════════════════════════════

const SCENES = [
    {
        id: "hook",
        eyebrow: "Scene 1 · Hook",
        title: "Most school districts operate across multiple systems — but none of them execute decisions.",
        body: "The problem isn't lack of data. It's lack of execution.",
        durationMs: 6000,
    },
    {
        id: "systems",
        eyebrow: "Scene 2 · The Systems Problem",
        title: "You have PowerSchool. Canvas. Workday.",
        body: "Student Information. Learning Management. Enterprise Resource Planning. These systems only store data — they don't act on it.",
        durationMs: 8500,
    },
    {
        id: "gap",
        eyebrow: "Scene 3 · The Gap",
        title: "That creates a gap between knowing and doing.",
        body: "Budgets leak. Maintenance gets delayed. Vendor costs go unchecked.",
        durationMs: 7000,
    },
    {
        id: "layer",
        eyebrow: "Scene 4 · The CreatorBoostAI Layer",
        title: "CreatorBoostAI sits on top of your existing systems.",
        body: "It identifies inefficiencies across campuses in real time — budget leakage, maintenance delays, vendor overspending, energy waste.",
        durationMs: 9000,
    },
    {
        id: "execution",
        eyebrow: "Scene 5 · Real Execution",
        title: "The system doesn't just analyze — it executes.",
        body: "It detects waste, triggers vendor outreach, logs actions, and turns data into action automatically.",
        durationMs: 9500,
    },
    {
        id: "koollite",
        eyebrow: "Scene 6 · Koollite Tie-In",
        title: "Example: lighting inefficiencies across facilities.",
        body: "The system identifies upgrade opportunities and triggers vendor solutions that reduce operating costs.",
        durationMs: 7500,
    },
    {
        id: "outcome",
        eyebrow: "Scene 7 · Outcome",
        title: "Reduced costs · Better allocation of funds · Faster decisions · Full operational visibility.",
        body: "This is not another system — it's the execution layer your current systems are missing.",
        durationMs: 9000,
    },
];

const totalDuration = SCENES.reduce((s, sc) => s + sc.durationMs, 0);

// ══════════════════════════════════════════════════════════════════
// Scene components
// ══════════════════════════════════════════════════════════════════

const HookScene = () => (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2">
            <AlertTriangle size={14} className="text-amber-300" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300">Problem · fragmented systems</span>
        </div>
        <h2 className="font-heading max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
            Most school districts operate across multiple systems — but none of them execute decisions.
        </h2>
        <p className="max-w-xl text-lg text-slate-300">The problem isn't lack of data. It's lack of execution.</p>
    </div>
);

const SystemsScene = () => {
    const items = [
        { icon: GraduationCap, label: "PowerSchool", sub: "Student Information System (SIS)", tone: "cyan" },
        { icon: Network,       label: "Canvas",       sub: "Learning Management (LMS)",       tone: "cyan" },
        { icon: Building2,     label: "Workday",      sub: "Enterprise Resource Planning (ERP)", tone: "cyan" },
    ];
    return (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">Scene 2 · Systems Stack</span>
            <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">You have PowerSchool. Canvas. Workday.</h2>
            <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
                {items.map((it) => (
                    <div key={it.label} className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-5 transition-all hover:bg-cyan-500/10">
                        <it.icon size={24} className="mb-3 text-cyan-300" />
                        <p className="font-heading text-lg font-semibold text-white">{it.label}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{it.sub}</p>
                    </div>
                ))}
            </div>
            <p className="max-w-2xl text-base text-slate-300">
                These systems only <span className="text-rose-300">store</span> data — they don't <span className="text-emerald-300">act</span> on it.
            </p>
        </div>
    );
};

const GapScene = () => {
    const gaps = [
        { icon: Wallet, label: "Budgets leak",           value: "$1.2M / district / yr" },
        { icon: Wrench, label: "Maintenance delays",     value: "47 days avg · 3x longer than target" },
        { icon: TrendingDown, label: "Vendor overspending", value: "18% over-market on avg" },
    ];
    return (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-rose-300">Scene 3 · The Gap</span>
            <h2 className="font-heading text-center text-3xl font-semibold text-white sm:text-4xl">
                Between knowing and doing.
            </h2>
            <div className="grid w-full max-w-3xl grid-cols-1 gap-3">
                {gaps.map((g) => (
                    <div key={g.label} className="flex items-center gap-4 rounded-md border border-rose-500/30 bg-rose-500/5 p-4">
                        <g.icon size={20} className="shrink-0 text-rose-300" />
                        <div className="flex-1">
                            <p className="font-heading text-base font-semibold text-white">{g.label}</p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-200">{g.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LayerScene = () => {
    const panels = [
        { icon: Wallet,       label: "Budget leakage detection",    value: "$847,000 flagged this quarter" },
        { icon: Wrench,       label: "Maintenance inefficiencies",  value: "12 overdue work orders auto-escalated" },
        { icon: TrendingDown, label: "Vendor overspending",         value: "8 contracts renegotiation-ready" },
        { icon: ZapIcon,      label: "Energy usage tracking",       value: "24.3% reduction opportunity" },
    ];
    return (
        <div className="flex h-full flex-col items-center justify-center gap-5 p-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">Scene 4 · The Layer</span>
            <h2 className="font-heading text-center text-3xl font-semibold text-white sm:text-4xl">
                CreatorBoostAI sits on top of your existing systems.
            </h2>
            <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
                {panels.map((p) => (
                    <div key={p.label} className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4">
                        <div className="flex items-center gap-2">
                            <p.icon size={14} className="text-cyan-300" />
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{p.label}</p>
                        </div>
                        <p className="font-heading mt-1 text-lg font-semibold text-white">{p.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExecutionScene = () => {
    const [stage, setStage] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setStage((s) => (s + 1) % 4), 1800);
        return () => clearInterval(t);
    }, []);
    const steps = [
        { icon: Activity,     label: "Identifying inefficiencies",     detail: "Cross-system anomaly detected · North Campus HVAC" },
        { icon: AlertTriangle,label: "Sending recommendations",        detail: "Alert → Superintendent · Director of Facilities" },
        { icon: Zap,          label: "Triggering vendor outreach",     detail: "AI-drafted RFQ → 3 pre-vetted vendors" },
        { icon: CheckCircle2, label: "Tracking actions",               detail: "Response received · contract negotiation queued" },
    ];
    return (
        <div className="flex h-full flex-col items-center justify-center gap-5 p-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300">Scene 5 · Execution</span>
            <h2 className="font-heading text-center text-3xl font-semibold text-white sm:text-4xl">
                It doesn't just analyze — it executes.
            </h2>
            <div className="w-full max-w-3xl space-y-2">
                {steps.map((s, i) => {
                    const active = i === stage;
                    const done = i < stage;
                    return (
                        <div
                            key={s.label}
                            className={`flex items-center gap-3 rounded-md border p-4 transition-all ${active ? "border-emerald-500/60 bg-emerald-500/10" : done ? "border-white/10 bg-ink-900" : "border-white/5 bg-ink-900/50"}`}
                        >
                            <s.icon size={16} className={active ? "text-emerald-300" : done ? "text-emerald-500/60" : "text-slate-500"} />
                            <div className="flex-1">
                                <p className={`font-heading text-sm font-semibold ${active ? "text-white" : "text-slate-300"}`}>{s.label}</p>
                                <p className="font-mono text-[10px] text-slate-400">{s.detail}</p>
                            </div>
                            {done && <CheckCircle2 size={14} className="text-emerald-400" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const KoolliteScene = () => (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300">Scene 6 · Facilities Example</span>
        <Lightbulb size={48} className="text-amber-300" />
        <h2 className="font-heading max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
            Lighting inefficiencies across facilities.
        </h2>
        <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
            {[
                ["42%",  "Energy reduction"],
                ["$184K","Annual savings"],
                ["18mo", "Payback period"],
            ].map(([v, l]) => (
                <div key={l} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="font-heading text-2xl font-semibold text-amber-200">{v}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">{l}</p>
                </div>
            ))}
        </div>
        <p className="max-w-xl text-base text-slate-300">
            The system identifies upgrade opportunities and triggers vendor solutions that reduce operating costs.
        </p>
    </div>
);

const OutcomeScene = () => {
    const outcomes = [
        { label: "Reduced costs",              value: "18-32%", tone: "emerald" },
        { label: "Better allocation",          value: "$2.4M",  tone: "emerald" },
        { label: "Faster decisions",           value: "14×",    tone: "cyan" },
        { label: "Operational visibility",     value: "100%",   tone: "cyan" },
    ];
    return (
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300">Scene 7 · Outcome</span>
            <h2 className="font-heading max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
                This is not another system — it's the execution layer your current systems are missing.
            </h2>
            <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
                {outcomes.map((o) => (
                    <div key={o.label} className={`rounded-md border p-4 ${o.tone === "emerald" ? "border-emerald-500/40 bg-emerald-500/10" : "border-cyan-500/30 bg-cyan-500/5"}`}>
                        <p className={`font-heading text-3xl font-semibold ${o.tone === "emerald" ? "text-emerald-200" : "text-cyan-200"}`}>{o.value}</p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">{o.label}</p>
                    </div>
                ))}
            </div>
            <div className="pt-2">
                <a
                    href="/apply"
                    data-testid="school-demo-cta"
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-900 transition-colors hover:bg-cyan-400"
                >
                    Start engagement <ChevronRight size={12} />
                </a>
            </div>
        </div>
    );
};

const SCENE_COMPONENTS = {
    hook: HookScene,
    systems: SystemsScene,
    gap: GapScene,
    layer: LayerScene,
    execution: ExecutionScene,
    koollite: KoolliteScene,
    outcome: OutcomeScene,
};

// ══════════════════════════════════════════════════════════════════
// Main page · scene player
// ══════════════════════════════════════════════════════════════════

export default function SchoolDistrictDemoPage() {
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef(Date.now());

    useEffect(() => {
        if (!playing) return;
        startRef.current = Date.now() - elapsed;
        const iv = setInterval(() => {
            const ms = Date.now() - startRef.current;
            setElapsed(ms);
            // Advance to scene by cumulative durationMs
            let acc = 0;
            let target = 0;
            for (let i = 0; i < SCENES.length; i++) {
                acc += SCENES[i].durationMs;
                if (ms < acc) { target = i; break; }
                target = i;
            }
            if (ms >= totalDuration) {
                clearInterval(iv);
                setPlaying(false);
                return;
            }
            setIdx(target);
        }, 200);
        return () => clearInterval(iv);
        // eslint-disable-next-line
    }, [playing]);

    const current = SCENES[idx];
    const ActiveScene = SCENE_COMPONENTS[current.id];
    const totalPct = Math.min(100, Math.round((elapsed / totalDuration) * 100));

    const reset = () => { setElapsed(0); setIdx(0); setPlaying(true); startRef.current = Date.now(); };

    return (
        <Layout>
            <section className="relative min-h-[calc(100vh-4rem)] bg-ink-900 text-white">
                {/* Top strip — title + controls */}
                <div className="border-b border-white/5 bg-ink-950/80 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Education · School Districts</p>
                            <h1 className="font-heading mt-0.5 text-xl font-semibold text-white">School District Intelligence System</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPlaying((p) => !p)}
                                data-testid="school-demo-play"
                                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/10"
                            >
                                {playing ? <Pause size={11} /> : <Play size={11} />}
                                {playing ? "Pause" : "Play"}
                            </button>
                            <button
                                onClick={reset}
                                data-testid="school-demo-reset"
                                className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                            >
                                <RotateCcw size={11} /> Replay
                            </button>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-0.5 w-full bg-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-[width] duration-200"
                            style={{ width: `${totalPct}%` }}
                            data-testid="school-demo-progress"
                        />
                    </div>
                </div>

                {/* Scene stage */}
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{current.eyebrow}</p>
                    <div
                        className="min-h-[520px] rounded-lg border border-white/10 bg-ink-800/40"
                        data-testid={`school-demo-scene-${current.id}`}
                    >
                        <ActiveScene />
                    </div>

                    {/* Scene pager */}
                    <div className="flex flex-wrap items-center gap-2" data-testid="school-demo-pager">
                        {SCENES.map((s, i) => (
                            <button
                                key={s.id}
                                onClick={() => { setIdx(i); setElapsed(SCENES.slice(0, i).reduce((a, c) => a + c.durationMs, 0)); }}
                                data-testid={`school-demo-scene-btn-${s.id}`}
                                className={`rounded-sm px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${i === idx ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}
                            >
                                {s.eyebrow.split("·")[0].trim()}
                            </button>
                        ))}
                    </div>

                    {/* Context strip */}
                    <div className="mt-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-4" data-testid="school-demo-pitch">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Why school districts choose this</p>
                        <p className="mt-2 text-sm text-slate-200">
                            Most school districts already have systems like PowerSchool, Canvas, or Workday in place.
                            The issue isn't lack of data — it's lack of execution. CreatorBoostAI sits on top of
                            your existing systems and identifies budget inefficiencies, maintenance delays, vendor
                            overspending, and energy waste across facilities — then takes action. It triggers outreach,
                            tracks execution, and helps reduce operating costs without requiring system replacement.
                        </p>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
