import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Activity, Bell, ChevronRight, ShieldCheck, Workflow, Zap, TrendingUp,
    DollarSign, Users, CheckCircle2, Target, ArrowRight, Sparkles,
    Server, RadioTower, Lock, Globe2, Clock,
} from "lucide-react";
import { MasterHomepageAvatar } from "@/components/avatar/MasterHomepageAvatar";

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

const EXECUTION_FEED = [
    { time: "9:41 AM", title: "Lead from Website captured",     sub: "Routed to Sales Rep · Maria S.",        tone: "cyan" },
    { time: "9:40 AM", title: "Maintenance Alert resolved",     sub: "Asset APU-410 · Terminal 3",            tone: "amber" },
    { time: "9:40 AM", title: "Follow-up Email sent",           sub: "Lead · Solar Project Inquiry",          tone: "emerald" },
    { time: "9:39 AM", title: "Deal Stage updated",             sub: "123 Main St · Under Contract",          tone: "fuchsia" },
    { time: "9:38 AM", title: "Invoice generated",              sub: "INV-30493 · $32,450",                   tone: "cyan" },
    { time: "9:36 AM", title: "New Appointment Booked",         sub: "Tom R. · Today 2:00 PM",                tone: "violet" },
];

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
                            tone="emerald"
                            label="Live System Status"
                            value="All Systems Operational"
                            Icon={Activity}
                            testid="mcc-status-system"
                            pulse
                        />
                        <StatusChip
                            tone="cyan"
                            label="AI Activity"
                            value="287 actions executed today"
                            Icon={Zap}
                            testid="mcc-status-ai"
                        />
                        <StatusChip
                            tone="slate"
                            label={clock}
                            value="Local"
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
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                                    Streaming
                                </span>
                            </div>
                            <ul className="mt-2 space-y-2">
                                {EXECUTION_FEED.map((e, i) => {
                                    const tone = TONE_CLS[e.tone] || TONE_CLS.cyan;
                                    return (
                                        <li
                                            key={i}
                                            className="rounded border border-white/5 bg-ink-700/40 p-2"
                                            data-testid={`mcc-feed-item-${i}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`h-1.5 w-1.5 rounded-full ${tone.split(" ")[0]} ${i === 0 ? "animate-pulse" : ""}`} />
                                                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{e.time}</span>
                                            </div>
                                            <p className={`mt-1 text-xs font-medium ${tone.split(" ")[1]}`}>{e.title}</p>
                                            <p className="text-[11px] text-slate-400">{e.sub}</p>
                                        </li>
                                    );
                                })}
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
                                <KpiTile Icon={DollarSign}    label="Revenue impact" value="$1.42M"  delta="+18%"  tone="emerald" testid="mcc-kpi-revenue" />
                                <KpiTile Icon={Target}        label="Leads captured" value="342"     delta="+24%"  tone="cyan"    testid="mcc-kpi-leads" />
                                <KpiTile Icon={TrendingUp}    label="Deals in pipeline" value="128" delta="+15%"  tone="cyan"    testid="mcc-kpi-deals" />
                                <KpiTile Icon={CheckCircle2}  label="Tasks completed"   value="1,247" delta="+31%" tone="emerald" testid="mcc-kpi-tasks" />
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <Users size={12} className="text-emerald-300" />
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">System health</span>
                                </div>
                                <span className="font-mono text-sm font-semibold text-emerald-200">100%</span>
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
