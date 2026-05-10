import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    LayoutDashboard, BarChart3, Users, Briefcase, TrendingUp, Wallet,
    UserCog, Heart, Box, Activity, FileText, Plug, Settings,
    Shield, Radio, Sparkles, ArrowRight, Play,
} from "lucide-react";
import { LiveOperationalOverlay } from "./LiveOperationalOverlay";
import { useLivePulseBeacons } from "./useLivePulseBeacons";
import { LiveActionIDStrip } from "./LiveActionIDStrip";
import { LiveCategoryCounters } from "./LiveCategoryCounters";
import { useFilterURLSync } from "./useFilterURLSync";

/**
 * MasterExperienceShell · Iter 96+
 * --------------------------------------------------------------------
 * Top-of-fold cinematic hero. Replaces the static landing hero with the
 * "CreatorBoostAI Master Experience" command-center visual:
 *   · collapsed sidebar TEASE on desktop (visual only — not navigation)
 *   · uploaded master mockup as the centered dashboard image with glow
 *     border, slow zoom, parallax-on-mouse, ambient lighting overlays
 *   · 5 pulsing live status chips
 *   · primary + secondary CTA pair
 *
 * Heavy heavy lifting (live execution feed + avatar) stays in the
 * existing MasterCommandCenterHero, which is mounted DIRECTLY BELOW
 * this shell so the homepage scrolls into the live operator surface.
 */

const SIDEBAR_NAV = [
    { icon: LayoutDashboard, label: "Command Center", active: true },
    { icon: BarChart3,       label: "Overview" },
    { icon: Users,           label: "Leads" },
    { icon: Briefcase,       label: "Operations" },
    { icon: TrendingUp,      label: "Sales" },
    { icon: Wallet,          label: "Finance" },
    { icon: UserCog,         label: "Workforce" },
    { icon: Heart,           label: "Customers" },
    { icon: Box,             label: "Assets" },
    { icon: Activity,        label: "AI Activity" },
    { icon: FileText,        label: "Reports" },
    { icon: Plug,            label: "Integrations" },
    { icon: Settings,        label: "Settings" },
];

const STATUS_CHIPS = [
    { id: "system",   label: "Live System Status",      value: "All Systems Operational",  tone: "emerald", testid: "status-chip-system" },
    { id: "ai",       label: "AI Activity",             value: "287 Actions Today",        tone: "cyan",    testid: "status-chip-ai" },
    { id: "security", label: "Enterprise Security",     value: "SOC 2 Active",             tone: "violet",  testid: "status-chip-security" },
    { id: "exec",     label: "Real-Time Execution",     value: "Enabled",                  tone: "cyan",    testid: "status-chip-exec" },
    { id: "industry", label: "Multi-Industry Ops",      value: "14 Verticals · Active",    tone: "amber",   testid: "status-chip-industry" },
];

const TONE_CLS = {
    emerald: { dot: "bg-emerald-400",  text: "text-emerald-200",  ring: "ring-emerald-500/30",  bg: "bg-emerald-500/5"  },
    cyan:    { dot: "bg-cyan-400",     text: "text-cyan-200",     ring: "ring-cyan-500/30",     bg: "bg-cyan-500/5"     },
    violet:  { dot: "bg-violet-400",   text: "text-violet-200",   ring: "ring-violet-500/30",   bg: "bg-violet-500/5"   },
    amber:   { dot: "bg-amber-400",    text: "text-amber-200",    ring: "ring-amber-500/30",    bg: "bg-amber-500/5"    },
};

export const MasterExperienceShell = () => {
    const stageRef = useRef(null);
    const [parallax, setParallax] = useState({ x: 0, y: 0 });
    const { flashes, sseLive, lastEvent, recentEvents, counts } = useLivePulseBeacons();
    // Filter state — clicking a counter tile narrows strip + beacons + chip
    // visibility to that category. null = "ALL".
    // Initial value seeded from ?focus= URL param so deep-links activate
    // on first paint (zero layout shift, zero hydration mismatch).
    const [selectedCategory, setSelectedCategory] = useState(() => {
        if (typeof window === "undefined") return null;
        const slug = new URLSearchParams(window.location.search).get("focus");
        const map = { outbound: "outbound", revenue: "revenue", "ai-actions": "actions",
                      alerts: "alerts", appointments: "appointments", tasks: "tasks" };
        return slug ? (map[slug] || null) : null;
    });
    // Two-way URL sync + fire-and-forget analytics. Returns `setFocus`
    // which atomically updates state + URL + sends one analytics event.
    const { setFocus: handleSelectCategory } = useFilterURLSync(
        selectedCategory, setSelectedCategory,
    );

    // Subtle parallax on mouse move — GPU-accelerated transform only
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        let raf = 0;
        const handle = (e) => {
            const rect = el.getBoundingClientRect();
            const cx = (e.clientX - rect.left) / rect.width  - 0.5;
            const cy = (e.clientY - rect.top)  / rect.height - 0.5;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => setParallax({ x: cx * 8, y: cy * 6 }));
        };
        const reset = () => setParallax({ x: 0, y: 0 });
        el.addEventListener("mousemove", handle);
        el.addEventListener("mouseleave", reset);
        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener("mousemove", handle);
            el.removeEventListener("mouseleave", reset);
        };
    }, []);

    return (
        <section
            ref={stageRef}
            data-testid="master-experience-shell"
            className="relative isolate overflow-hidden border-b border-white/5 bg-ink-900"
        >
            {/* ── Ambient cinematic backdrop ─────────────────────────── */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                {/* dark gradient base */}
                <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-[#04101c] to-ink-900" />
                {/* moving radial blue ops glow */}
                <div className="absolute -top-1/3 left-1/2 h-[120%] w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.18),rgba(34,211,238,0.06)_45%,transparent_75%)] blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
                {/* secondary violet glow bottom-right */}
                <div className="absolute bottom-0 right-0 h-[60%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.14),transparent_70%)] blur-3xl" />
                {/* grid overlay */}
                <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(34,211,238,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.18)_1px,transparent_1px)] [background-size:60px_60px]" />
                {/* fine grain noise */}
                <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.6%22/></svg>')]" />
            </div>

            {/* ── Top status bar ─────────────────────────────────────── */}
            <div className="relative mx-auto flex max-w-[1720px] items-center gap-3 px-5 pt-6 lg:px-10" data-testid="master-status-bar">
                <div className="flex items-center gap-2">
                    <span className="relative inline-flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                    </span>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI Master Experience · Live</p>
                </div>
                <div className="ml-auto hidden items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400 md:flex">
                    <Shield size={11} className="text-emerald-400" />
                    SOC 2 Type II · Encrypted Infrastructure
                </div>
            </div>

            {/* ── Main 12-col grid ───────────────────────────────────── */}
            <div className="relative mx-auto grid max-w-[1720px] grid-cols-12 gap-6 px-5 pb-20 pt-8 lg:gap-8 lg:px-10 lg:pt-12">

                {/* SIDEBAR TEASE · desktop only · visual environment, NOT nav */}
                <aside
                    data-testid="master-sidebar-tease"
                    aria-hidden="true"
                    className="col-span-1 hidden lg:flex"
                >
                    <div className="sticky top-24 flex w-full flex-col items-center gap-1 rounded-xl border border-white/10 bg-gradient-to-b from-ink-800/60 to-ink-900/40 px-2 py-4 backdrop-blur-md">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/30">
                            <span className="font-heading text-[10px] font-bold text-cyan-200">CB.AI</span>
                        </div>
                        <p className="mt-1 mb-2 font-mono text-[7px] uppercase tracking-[0.18em] text-slate-500">Operator</p>
                        {SIDEBAR_NAV.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.label}
                                    title={item.label}
                                    className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-all ${
                                        item.active
                                            ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
                                            : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                                    }`}
                                    style={{ animation: `fadeInUp 0.6s ease-out ${0.04 * idx}s both` }}
                                >
                                    <Icon size={14} strokeWidth={1.6} />
                                    {item.active && (
                                        <span className="absolute -left-0.5 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-400" />
                                    )}
                                </div>
                            );
                        })}
                        <div className="mt-3 flex w-full flex-col items-center gap-1.5 border-t border-white/5 pt-3">
                            <span className="relative inline-flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            </span>
                            <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-emerald-300">Online</p>
                        </div>
                    </div>
                </aside>

                {/* MAIN STAGE · headline + dashboard image + CTAs */}
                <div className="col-span-12 lg:col-span-11">
                    {/* Headline copy block */}
                    <div className="max-w-3xl">
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/90" data-testid="master-kicker">
                            <Sparkles size={10} className="-mt-0.5 mr-1 inline" />
                            The AI Operating System for Every Business
                        </p>
                        <h1
                            data-testid="master-h1"
                            className="font-heading mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
                        >
                            The Operating System
                            <br />
                            <span className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                                For Every Business.
                            </span>
                        </h1>
                        <p className="mt-4 max-w-2xl font-mono text-[11px] uppercase tracking-[0.20em] text-slate-300/90" data-testid="master-subheadline">
                            One System · Every Industry · Every Team · Real-Time Execution
                        </p>
                        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg" data-testid="master-body-copy">
                            CreatorBoostAI operates over the software your business already uses — helping
                            companies execute faster, organize operations, reduce inefficiencies, manage teams,
                            generate leads, automate workflows, and increase measurable performance across the
                            enterprise.
                        </p>

                        {/* CTAs */}
                        <div className="mt-8 flex flex-wrap items-center gap-3" data-testid="master-cta-row">
                            <Link
                                to="/demo"
                                data-testid="master-cta-launch-demo"
                                className="group inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink-900 shadow-[0_0_28px_rgba(34,211,238,0.45)] transition hover:bg-cyan-400 hover:shadow-[0_0_36px_rgba(34,211,238,0.6)]"
                            >
                                <Play size={13} className="fill-current" />
                                Launch Interactive Demo
                                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                            </Link>
                            <a
                                href="#industry-selector"
                                data-testid="master-cta-choose-industry"
                                className="group inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 transition hover:border-cyan-400/70 hover:bg-cyan-500/10 hover:text-cyan-100"
                            >
                                Choose Your Industry
                                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                            </a>
                            <span className="ml-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                <Radio size={11} className="text-emerald-400" />
                                No credit card · Personalized walkthrough
                            </span>
                        </div>
                    </div>

                    {/* Live status chips strip */}
                    <ul
                        data-testid="master-status-chips"
                        className="mt-9 flex flex-wrap gap-2 lg:gap-2.5"
                    >
                        {STATUS_CHIPS.map((c, idx) => {
                            const t = TONE_CLS[c.tone];
                            return (
                                <li
                                    key={c.id}
                                    data-testid={c.testid}
                                    className={`group inline-flex items-center gap-2 rounded-full border border-white/5 ${t.bg} px-3 py-1.5 ring-1 ${t.ring} backdrop-blur-sm transition-all hover:scale-[1.02]`}
                                    style={{ animation: `fadeInUp 0.7s ease-out ${0.08 * idx}s both` }}
                                >
                                    <span className="relative inline-flex h-1.5 w-1.5">
                                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${t.dot} opacity-70`} />
                                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${t.dot}`} />
                                    </span>
                                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
                                        {c.label}
                                    </span>
                                    <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${t.text}`}>
                                        {c.value}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    {/* CINEMATIC DASHBOARD CENTERPIECE — uploaded master image
                       · Breaks out beyond the 11-col content column to fill
                       ·   nearly the full viewport width on large screens.
                       · Hosts the LiveOperationalOverlay (scan line, beacons,
                       ·   data flow, ECG heartbeat) for the "alive system" feel. */}
                    <div
                        data-testid="master-dashboard-stage"
                        className="relative mt-12 overflow-hidden rounded-2xl lg:mr-[-2vw] master-dashboard-bleed"
                        style={{
                            transform: `perspective(2200px) rotateY(${parallax.x * 0.025}deg) rotateX(${-parallax.y * 0.025}deg)`,
                            transition: "transform 0.22s ease-out",
                        }}
                    >
                        {/* outer glow ring */}
                        <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(closest-side,rgba(34,211,238,0.45),transparent_70%)] blur-2xl opacity-70 animate-[pulse_6s_ease-in-out_infinite]" />
                        {/* outer border w/ glow */}
                        <div className="relative rounded-2xl border border-cyan-500/30 bg-ink-900/40 p-1.5 shadow-[0_0_60px_rgba(34,211,238,0.25),inset_0_0_30px_rgba(34,211,238,0.08)]">
                            {/* slow-zoom inner frame · holds image + live SVG overlay */}
                            <div className="relative overflow-hidden rounded-xl">
                                <img
                                    src="/master-experience-hero.jpg"
                                    alt="CreatorBoostAI Master Experience — enterprise command center dashboard"
                                    data-testid="master-dashboard-img"
                                    loading="eager"
                                    decoding="async"
                                    fetchPriority="high"
                                    className="block h-auto w-full will-change-transform animate-[masterZoom_24s_ease-in-out_infinite]"
                                />
                                {/* Live SVG operational overlay — pulses, scan, flow, ECG */}
                                <LiveOperationalOverlay
                                    flashes={flashes}
                                    sseLive={sseLive}
                                    selectedCategory={selectedCategory}
                                />
                                {/* Last-live-event toast — tiny, fades after each real event */}
                                {lastEvent && (
                                    <LastEventToast key={lastEvent.ts} event={lastEvent} />
                                )}
                            </div>
                            {/* corner brackets */}
                            <CornerBrackets />
                            {/* live "ON AIR" pip */}
                            <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 backdrop-blur-md">
                                <span className="relative inline-flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
                                </span>
                                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-rose-200">On Air · Operating</span>
                            </div>
                            {/* bottom-left telemetry strip — adds "alive system" feel */}
                            <div className="absolute left-4 bottom-4 hidden items-center gap-3 rounded-md border border-white/10 bg-ink-900/70 px-3 py-1.5 backdrop-blur-md md:inline-flex">
                                <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">
                                    <span className="relative inline-flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                    </span>
                                    Telemetry · 287 ops/today
                                </span>
                                <span aria-hidden className="h-3 w-px bg-white/15" />
                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300">SOC 2 · Encrypted</span>
                                <span aria-hidden className="h-3 w-px bg-white/15" />
                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-violet-300">14 Verticals</span>
                            </div>
                        </div>

                        {/* ambient floating orbs around the dashboard */}
                        <div aria-hidden className="pointer-events-none absolute -left-12 top-1/4 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl animate-[float_9s_ease-in-out_infinite]" />
                        <div aria-hidden className="pointer-events-none absolute -right-10 bottom-1/4 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl animate-[float_11s_ease-in-out_infinite_reverse]" />
                    </div>

                    {/* LIVE ACTION ID STRIP — Bloomberg-terminal-style ticker
                       fed by the same SSE stream that drives the beacons.
                       Newest event slides in from the right; oldest scrolls
                       off after the buffer holds 5. Each chip is a clickable
                       Action ID permalink. */}
                    <LiveActionIDStrip
                        recentEvents={recentEvents}
                        sseLive={sseLive}
                        lastEventTs={lastEvent ? lastEvent.ts : 0}
                        selectedCategory={selectedCategory}
                        onClearCategory={() => handleSelectCategory(selectedCategory)}
                    />

                    {/* PER-CATEGORY COUNTER ROW — executive telemetry tiles
                       seeded from /api/public/system-pulse and incremented
                       on every SSE pulse. No flash, no scroll. */}
                    <LiveCategoryCounters
                        counts={counts}
                        sseLive={sseLive}
                        selectedCategory={selectedCategory}
                        onSelectCategory={handleSelectCategory}
                    />

                    {/* Caption strip below dashboard */}
                    <p className="mt-5 max-w-3xl font-mono text-[10px] uppercase tracking-[0.20em] text-slate-500">
                        <span className="text-cyan-300">Above:</span> Live operator surface · 287 actions executed
                        today · 14 verticals · governance + audit baked into every action.
                    </p>
                </div>
            </div>

            {/* keyframes — kept inline because section is self-contained */}
            <style>{`
                @keyframes masterZoom {
                    0%, 100% { transform: scale(1.00); filter: brightness(1.00); }
                    50%      { transform: scale(1.025); filter: brightness(1.05); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    50%      { transform: translateY(-14px) translateX(8px); }
                }
                @keyframes fadeInUp {
                    0%   { opacity: 0; transform: translateY(8px); }
                    100% { opacity: 1; transform: translateY(0);   }
                }
            `}</style>
        </section>
    );
};

const CornerBrackets = () => (
    <>
        <span aria-hidden className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-cyan-400/70" />
        <span aria-hidden className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-cyan-400/70" />
        <span aria-hidden className="absolute left-2 bottom-2 h-4 w-4 border-l-2 border-b-2 border-cyan-400/70" />
        <span aria-hidden className="absolute right-2 bottom-2 h-4 w-4 border-r-2 border-b-2 border-cyan-400/70" />
    </>
);

/**
 * LastEventToast — tiny enterprise-grade event ticker that surfaces the
 * most recent SSE event. Subtle slide-in + fade-out. Bloomberg-terminal
 * vibe, NOT social-media. Auto-dismisses after 4.2s.
 */
const KIND_LABEL = {
    lead: "LEAD CAPTURED", qualified: "LEAD QUALIFIED",
    email: "AI EMAIL SENT", send: "OUTREACH SENT", reply: "REPLY DETECTED",
    deal: "DEAL UPDATED", invoice: "INVOICE GENERATED",
    appointment: "APPOINTMENT BOOKED",
    maintenance: "ALERT RESOLVED", alert: "ALERT TRIGGERED",
    task: "TASK EXECUTED",
};

const LastEventToast = ({ event }) => {
    const label = KIND_LABEL[event.kind] || (event.kind || "EVENT").toUpperCase();
    return (
        <div
            data-testid="last-event-toast"
            className="pointer-events-none absolute left-3 top-3 z-10 inline-flex max-w-[88%] items-center gap-2 rounded-md border border-cyan-500/40 bg-ink-900/85 px-2.5 py-1.5 backdrop-blur-md cb-toast"
        >
            <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                {label}
            </span>
            {event.action_id && (
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-400">
                    · #{event.action_id}
                </span>
            )}
            <style>{`
                @keyframes cb-toast-life {
                    0%   { opacity: 0; transform: translateY(-6px); }
                    10%  { opacity: 1; transform: translateY(0); }
                    85%  { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-4px); }
                }
                .cb-toast { animation: cb-toast-life 4.2s ease-in-out forwards; }
                @media (prefers-reduced-motion: reduce) {
                    .cb-toast { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

export default MasterExperienceShell;
