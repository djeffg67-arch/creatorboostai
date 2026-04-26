import React from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import {
    Sparkles, Play, ArrowRight, Building2, ShieldCheck, Brain, Globe2,
    Layers, TrendingUp, Lock, Zap
} from "lucide-react";

const VERTICALS = [
    {
        id: "realtor",
        href: "/demo/realtor",
        Icon: Building2,
        kicker: "Real Estate Operations",
        title: "Brokerages, agents, property management.",
        copy: "CreatorBoostAI sits on top of your CRM, MLS, marketing, and property management stack — Yardi, Salesforce, Follow Up Boss, kvCORE, and the rest — and unifies them into one executive command center.",
        bullets: [
            { Icon: Layers, text: "15 platforms unified — Yardi, MRI, RealPage, AppFolio, Salesforce, FUB, kvCORE, BoomTown, Dotloop, SkySlope" },
            { Icon: Globe2, text: "National command center — heatmap every market, drill state → city → office → agent" },
            { Icon: TrendingUp, text: "Auto-captured leads · AI-scored intent · pipeline forecasting · commission tracking" },
        ],
        runtime: "15 scenes · ~13 min",
        highlight: "from-cyan-500/20 via-blue-500/10",
        ringClass: "hover:ring-cyan-400/50",
        badge: "Most popular",
    },
    {
        id: "insurance",
        href: "/demo/insurance",
        Icon: ShieldCheck,
        kicker: "Insurance Operations",
        title: "Agencies, brokerages, MGAs, carriers.",
        copy: "CreatorBoostAI sits on top of Catalyst CRM, Core, your AMS, your compliance stack, and your communications — and turns them into a single insurance operating system.",
        bullets: [
            { Icon: Layers, text: "16 platforms unified — Catalyst CRM, Core, QQCatalyst, Applied Epic, AMS360, EZLynx, Salesforce FSC, Strike Graph" },
            { Icon: Brain, text: "AI risk + underwriting — score every lead before producer touches the file" },
            { Icon: Lock, text: "SOC 2 + AML/KYC always-ready · audit trail on every action · commission engine with full transparency" },
        ],
        runtime: "16 scenes · ~13 min",
        highlight: "from-cyan-500/20 via-emerald-500/10",
        ringClass: "hover:ring-cyan-400/50",
        badge: "New",
    },
    {
        id: "creators",
        href: "/demo/creator",
        Icon: Brain,
        kicker: "Influencers & Creators",
        title: "Audience monetization · brand-deal automation.",
        copy: "CreatorBoostAI overlays Instagram, TikTok, YouTube, Stripe, Shopify, Patreon, and your brand inbox — and BodyIQ-AI adds frame-by-frame behavioral intelligence on every video — to monetize the audience you already have.",
        bullets: [
            { Icon: TrendingUp, text: "Audience intelligence — surface buyer-intent signals across every channel" },
            { Icon: Layers, text: "Brand-deal pipeline auto-built and auto-pitched on your behalf" },
            { Icon: Globe2, text: "Storefront, paid tiers, sponsorships — one revenue line, one screen" },
        ],
        runtime: "11 scenes · ~6.5 min",
        highlight: "from-cyan-500/20 via-purple-500/10",
        ringClass: "hover:ring-cyan-400/50",
        badge: "New",
    },
    {
        id: "airports",
        href: "/contact",
        Icon: Globe2,
        kicker: "Airports & SITA Systems",
        title: "Operations, concessions, ground handling.",
        copy: "CreatorBoostAI overlays SITA, airline operational systems, and concession data into one terminal-wide command center. Throughput, dwell time, revenue per square foot — live.",
        bullets: [
            { Icon: Layers, text: "SITA + airline + concession + retail data overlaid in one view" },
            { Icon: TrendingUp, text: "Throughput, dwell time, RPSF live · per-terminal and rollup" },
            { Icon: Lock, text: "Compliance + audit-ready reporting across every gate, lounge, and concourse" },
        ],
        runtime: "In production · pilot Q3",
        highlight: "from-cyan-500/20 via-amber-500/10",
        ringClass: "hover:ring-cyan-400/50",
        badge: "Request brief",
    },
];

const COMING_SOON = [
    { name: "Retail & Grocery", note: "Multi-store · POS · scheduling" },
    { name: "Contractors", note: "Trades · dispatch · billing" },
    { name: "Mortgage", note: "Origination + servicing" },
    { name: "Healthcare", note: "Clinics + RCM + scheduling" },
];

export default function VerticalPickerPage() {
    const apiBase = (process.env.REACT_APP_BACKEND_URL || "") + "/api";
    const trackClick = (vertical) => {
        try {
            const body = JSON.stringify({ vertical, referrer: document.referrer || "" });
            const blob = new Blob([body], { type: "application/json" });
            // sendBeacon survives navigation; falls back to fetch keepalive
            if (navigator.sendBeacon) {
                navigator.sendBeacon(`${apiBase}/track/picker-click`, blob);
            } else {
                fetch(`${apiBase}/track/picker-click`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                    keepalive: true,
                }).catch(() => {});
            }
        } catch { /* never block navigation */ }
    };

    return (
        <Layout>
            <div className="relative mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-20" data-testid="vertical-picker">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, left: -120 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 460, height: 460, bottom: -200, right: -80 }} />
                </div>

                {/* Hero */}
                <section className="text-center" data-testid="picker-hero">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <Sparkles size={12} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Industry Demos · Proof of Capability</span>
                    </div>
                    <h1 className="font-heading mx-auto mt-6 max-w-4xl text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                        See your industry{" "}
                        <span className="text-cyan-400">executed.</span>
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                        Pick the vertical you operate in. Each walkthrough — auto-playing, narrated, ~5–13 minutes — shows how
                        CreatorBoostAI™ + BodyIQ-AI™ overlay your existing stack and turn it into one revenue-driven command center.
                    </p>
                </section>

                {/* Vertical cards */}
                <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8" data-testid="vertical-cards">
                    {VERTICALS.map((v) => (
                        <Link
                            key={v.id}
                            to={v.href}
                            onClick={() => trackClick(v.id)}
                            data-testid={`vertical-card-${v.id}`}
                            className={`group relative overflow-hidden rounded-md border border-white/10 bg-ink-700/40 p-6 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_60px_rgba(6,182,212,0.18)] hover:-translate-y-1 lg:p-8 ${v.ringClass}`}
                        >
                            <div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${v.highlight} to-transparent opacity-40 group-hover:opacity-70 transition-opacity`} />

                            <div className="flex items-start justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                                        <v.Icon size={20} className="text-cyan-300" />
                                    </div>
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{v.kicker}</p>
                                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{v.runtime}</p>
                                    </div>
                                </div>
                                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                                    {v.badge}
                                </span>
                            </div>

                            <h2 className="font-heading mt-6 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                                {v.title}
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-slate-300">
                                {v.copy}
                            </p>

                            <ul className="mt-6 space-y-3">
                                {v.bullets.map((b, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5">
                                            <b.Icon size={12} className="text-cyan-300" />
                                        </div>
                                        <span className="leading-relaxed">{b.text}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-7 flex items-center justify-between flex-wrap gap-3">
                                <span
                                    data-testid={`watch-demo-${v.id}`}
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all group-hover:bg-cyan-400 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.55)]"
                                >
                                    <Play size={14} fill="currentColor" /> {v.id === "airports" ? "Request Airport Brief" : `Watch the ${v.runtime.split("·")[1].trim()} demo`}
                                </span>
                                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 group-hover:text-cyan-300">
                                    No clicks · auto-plays
                                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </section>

                {/* Coming soon */}
                <section className="mt-16 rounded-md border border-white/10 bg-ink-700/30 p-6 lg:p-8" data-testid="picker-coming-soon">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Zap size={13} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Coming Soon</span>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">More verticals shipping monthly</span>
                    </div>
                    <h3 className="font-heading mt-3 text-xl font-semibold text-white sm:text-2xl">
                        Built for any operating-heavy industry.
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Same engine. Same approach: sit on top, oversee, connect, execute. Working on bringing the
                        playbook to every industry where teams run too many disconnected systems.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {COMING_SOON.map((c) => (
                            <div key={c.name} className="rounded-sm border border-white/10 bg-ink-800 p-4">
                                <p className="font-heading text-base font-semibold text-white">{c.name}</p>
                                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{c.note}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Trust strip */}
                <section className="mt-12 flex flex-col items-center text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Have a different industry in mind?
                    </p>
                    <Link
                        to="/contact"
                        data-testid="picker-contact-link"
                        className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-200"
                    >
                        Tell us what you run <ArrowRight size={12} />
                    </Link>
                </section>
            </div>
        </Layout>
    );
}
