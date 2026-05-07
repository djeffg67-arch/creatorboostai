import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/site/Layout";
import axios from "axios";
import { toast } from "sonner";
import {
    GraduationCap, Activity, Zap, Wallet, Wrench, Zap as ZapIcon,
    Lightbulb, TrendingDown, Building2, Network, AlertTriangle,
    CheckCircle2, Play, Pause, RotateCcw, ChevronRight, Lock, Mail, X,
    Sun, BatteryCharging,
} from "lucide-react";
import { ExecutiveAvatar } from "@/components/avatar/ExecutiveAvatar";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center" data-testid="school-koollite-scene">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300">Scene 6 · Koollite Tie-In · Dual-Path Strategy</span>
        <Lightbulb size={40} className="text-amber-300" />
        <h2 className="font-heading max-w-3xl text-2xl font-semibold text-white sm:text-3xl">
            Two upgrade paths. <span className="text-amber-300">Same Koollite product.</span>
        </h2>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Koollite's 220 lm/W LED platform lets every district choose between
            <span className="text-white"> brighter classrooms</span> at the same wattage,
            or <span className="text-white">dramatic energy savings</span> at the same brightness.
            CreatorBoostAI runs both options against the district's actual fixtures and triggers a contractor proposal.
        </p>
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-cyan-500/40 bg-cyan-500/10 p-4 text-left" data-testid="school-koollite-option-a">
                <div className="flex items-center gap-2">
                    <Sun size={14} className="text-cyan-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Option A · Max Brightness</span>
                </div>
                <p className="mt-2 text-sm text-white">Same wattage. ~47% more lumens.</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    <li>• Brighter classrooms, gyms, hallways</li>
                    <li>• Improved camera + safety compliance</li>
                    <li>• Zero increase in the energy bill</li>
                </ul>
            </div>
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-left" data-testid="school-koollite-option-b">
                <div className="flex items-center gap-2">
                    <BatteryCharging size={14} className="text-emerald-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Option B · Max Savings</span>
                </div>
                <p className="mt-2 text-sm text-white">Same brightness. ~50% less wattage.</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    <li>• Direct annual energy savings</li>
                    <li>• Funds reallocated to academics</li>
                    <li>• Lower HVAC load + ESG impact</li>
                </ul>
            </div>
        </div>
        <a
            href="/koollite/roi"
            data-testid="school-koollite-cta"
            className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-900 transition-colors hover:bg-amber-300"
        >
            Run dual-path ROI for my district <ChevronRight size={12} />
        </a>
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
// Soft-gate email capture modal — shown at Scene 3 (once per session)
// ══════════════════════════════════════════════════════════════════
const DEMO_KEY = "education";
const GATE_STORAGE_KEY = `cb_demo_gate_${DEMO_KEY}`;

const SoftGateModal = ({ open, onClose, onSuccess }) => {
    const [form, setForm] = useState({ email: "", name: "", company: "", role: "" });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!form.email.includes("@")) { toast.error("Work email required"); return; }
        setBusy(true);
        try {
            const { data } = await axios.post(`${API}/demo/capture`, {
                email: form.email.trim().toLowerCase(),
                demo: DEMO_KEY,
                name: form.name.trim() || null,
                company: form.company.trim() || null,
                role: form.role.trim() || null,
            });
            // Persist so we never re-prompt this browser
            try { sessionStorage.setItem(GATE_STORAGE_KEY, "1"); } catch { /* noop */ }
            toast.success(`Unlocked · tailored follow-up in ${data.scheduled_outreach_hours}h`);
            onSuccess?.(data);
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not save email");
        } finally { setBusy(false); }
    };

    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/85 p-4 backdrop-blur-sm"
            data-testid="school-demo-gate-modal"
        >
            <form
                onSubmit={submit}
                className="w-full max-w-md rounded-lg border border-cyan-500/30 bg-ink-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1">
                            <Lock size={11} className="text-cyan-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Unlock full insights</span>
                        </div>
                        <h3 className="font-heading mt-3 text-xl font-semibold text-white">
                            Enter your work email to unlock full system insights
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            You'll see the rest of the demo now and get a tailored follow-up referencing what you viewed.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="school-demo-gate-close"
                        className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                        title="Keep watching without sharing"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="mt-5 space-y-2">
                    <div className="relative">
                        <Mail size={13} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
                        <input
                            required
                            type="email"
                            placeholder="work email *"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            data-testid="school-demo-gate-email"
                            className="w-full rounded-md border border-white/10 bg-ink-800 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                            autoFocus
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="name (optional)"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        data-testid="school-demo-gate-name"
                        className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="district / company"
                            value={form.company}
                            onChange={(e) => setForm({ ...form, company: e.target.value })}
                            data-testid="school-demo-gate-company"
                            className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                        />
                        <input
                            type="text"
                            placeholder="role"
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            data-testid="school-demo-gate-role"
                            className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={busy}
                    data-testid="school-demo-gate-submit"
                    className="mt-5 w-full rounded-md bg-cyan-500 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                >
                    {busy ? "Unlocking…" : "Unlock full demo insights"}
                </button>
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                    No spam · unsubscribe anywhere
                </p>
            </form>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════
// Main page · scene player
// ══════════════════════════════════════════════════════════════════

export default function SchoolDistrictDemoPage() {
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef(Date.now());
    const [gateOpen, setGateOpen] = useState(false);
    const [gatePassed, setGatePassed] = useState(() => {
        try { return sessionStorage.getItem(GATE_STORAGE_KEY) === "1"; } catch { return false; }
    });

    // Log a demo view on mount (fires once per page-load)
    useEffect(() => {
        axios.post(`${API}/demo/view`, {
            demo: DEMO_KEY,
            referrer: document.referrer || null,
            scene: 0,
        }).catch(() => {});
    }, []);

    // Open soft gate when viewer reaches Scene 3 (idx 2), once per session
    useEffect(() => {
        if (!gatePassed && idx >= 2 && !gateOpen) {
            setGateOpen(true);
            setPlaying(false);
        }
    }, [idx, gatePassed, gateOpen]);

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
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-9">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{current.eyebrow}</p>
                            <div
                                className="mt-2 min-h-[520px] rounded-lg border border-white/10 bg-ink-800/40"
                                data-testid={`school-demo-scene-${current.id}`}
                            >
                                <ActiveScene />
                            </div>
                        </div>
                        <aside className="lg:col-span-3">
                            <div className="sticky top-4 flex justify-center lg:justify-end">
                                <ExecutiveAvatar
                                    variant="demo-cinematic"
                                    registry="school"
                                    sceneId={current?.id}
                                    sceneIndex={idx}
                                    sceneCount={SCENES.length}
                                    sceneLabel={current?.title || current?.eyebrow}
                                    paused={!playing}
                                    speaking={playing}
                                    onSceneEnd={() => {
                                        const nextIdx = Math.min(idx + 1, SCENES.length - 1);
                                        const target = SCENES.slice(0, nextIdx).reduce((a, c) => a + c.durationMs, 0);
                                        startRef.current = Date.now() - target;
                                        setElapsed(target);
                                        setIdx(nextIdx);
                                    }}
                                    chipAccent="cyan"
                                    testId="school-demo-avatar"
                                />
                            </div>
                        </aside>
                    </div>

                    {/* Scene pager */}
                    <div className="flex flex-wrap items-center gap-2" data-testid="school-demo-pager">
                        {SCENES.map((s, i) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    const target = SCENES.slice(0, i).reduce((a, c) => a + c.durationMs, 0);
                                    startRef.current = Date.now() - target;
                                    setElapsed(target);
                                    setIdx(i);
                                }}
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

            {/* Soft-gate email capture modal */}
            <SoftGateModal
                open={gateOpen}
                onClose={() => { setGateOpen(false); /* soft gate — keep watching */ setPlaying(true); }}
                onSuccess={() => { setGatePassed(true); setGateOpen(false); setPlaying(true); }}
            />
        </Layout>
    );
}
