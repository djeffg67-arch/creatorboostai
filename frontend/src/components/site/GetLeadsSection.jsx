import React from "react";
import { Link } from "react-router-dom";
import {
    Target, Send, Repeat, Zap, Eye, TrendingUp,
    Sparkles, Activity, ArrowRight, Briefcase, Building2,
    ShieldCheck, Users, Store,
} from "lucide-react";

/**
 * <GetLeadsSection />
 *
 * Conversion-focused section placed directly under the homepage hero.
 * Tells the visitor the platform is a revenue-generation engine, not just
 * analytics — then routes them to the demo or pricing page.
 *
 * Test IDs (data-testid):
 *   leads-section · leads-title · leads-intro · leads-outcome-<i> ·
 *   leads-creatorboost · leads-bodyiq · leads-closing · leads-audience ·
 *   leads-cta-demo · leads-cta-pricing
 */
const OUTCOMES = [
    { Icon: Target,     label: "Generate high-intent leads" },
    { Icon: Send,       label: "Engage prospects with automated demos" },
    { Icon: Repeat,     label: "Follow up with prospects automatically" },
    { Icon: Zap,        label: "Re-engage prospects who didn’t respond" },
    { Icon: Eye,        label: "Identify serious buyers through behavior & interaction signals" },
    { Icon: TrendingUp, label: "Convert more prospects into paying customers" },
];

const CB_WORK = [
    "Generates leads for your business",
    "Engages prospects automatically",
    "Delivers demos on your behalf",
    "Follows up without manual effort",
    "Re-engages cold prospects",
    "Drives conversions and revenue",
];

const BIQ_WORK = [
    "Detects human behavior patterns",
    "Identifies buyer intent",
    "Highlights who is most likely to convert",
    "Helps you focus on high-value opportunities",
];

const AUDIENCE = [
    { Icon: ShieldCheck, label: "Insurance agents" },
    { Icon: Building2,   label: "Real estate agents" },
    { Icon: Store,       label: "Small business owners" },
    { Icon: Briefcase,   label: "Service providers" },
    { Icon: Users,       label: "Enterprise teams" },
];

export const GetLeadsSection = () => (
    <section
        className="relative border-b border-white/5 bg-ink-900"
        data-testid="leads-section"
        id="leads-engine"
    >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 ambient-grid opacity-30" />
            <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 500, height: 500, top: -160, right: -140 }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            {/* --- Title + Intro --- */}
            <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                    <Sparkles size={12} className="text-cyan-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Revenue engine · Not just analytics
                    </span>
                </div>
                <h2
                    data-testid="leads-title"
                    className="font-heading mt-5 text-balance text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl"
                >
                    How This System Helps You{" "}
                    <span className="text-cyan-400">Get Leads and Close More Deals.</span>
                </h2>
                <p
                    data-testid="leads-intro"
                    className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg"
                >
                    This system is built to help you <span className="font-semibold text-white">generate revenue</span> —
                    not just analyze behavior. CreatorBoostAI actively generates leads, engages prospects,
                    follows up, and helps convert them into paying customers.
                </p>
            </div>

            {/* --- Outcomes --- */}
            <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    What you get
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {OUTCOMES.map((o, i) => (
                        <li
                            key={o.label}
                            data-testid={`leads-outcome-${i}`}
                            className="flex items-start gap-3 rounded-md border border-white/10 bg-ink-700/40 p-4 transition-colors hover:border-cyan-500/40"
                        >
                            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10">
                                <o.Icon size={14} className="text-cyan-300" />
                            </span>
                            <span className="text-sm leading-relaxed text-slate-200 sm:text-base">
                                {o.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* --- CreatorBoostAI (Primary) + BodyIQ-AI (Supporting) --- */}
            <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-5">
                <div
                    data-testid="leads-creatorboost"
                    className="lg:col-span-3 rounded-md border border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 via-ink-800 to-ink-900 p-6 lg:p-8 shadow-[0_0_40px_rgba(6,182,212,0.12)]"
                >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1">
                        <Activity size={11} className="text-cyan-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            Primary engine
                        </span>
                    </span>
                    <h3 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl">
                        CreatorBoostAI
                    </h3>
                    <p className="mt-2 text-sm text-slate-300 sm:text-base">
                        CreatorBoostAI is the system that does the work:
                    </p>
                    <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {CB_WORK.map((w) => (
                            <li key={w} className="flex items-start gap-2 text-sm text-slate-200">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />
                                {w}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                        The execution engine that runs your sales process.
                    </p>
                </div>

                <div
                    data-testid="leads-bodyiq"
                    className="lg:col-span-2 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-8"
                >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-900 px-3 py-1">
                        <Eye size={11} className="text-slate-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                            Supporting layer
                        </span>
                    </span>
                    <h3 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl">
                        BodyIQ-AI
                    </h3>
                    <p className="mt-2 text-sm text-slate-300 sm:text-base">
                        BodyIQ-AI enhances the system by:
                    </p>
                    <ul className="mt-5 space-y-2">
                        {BIQ_WORK.map((w) => (
                            <li key={w} className="flex items-start gap-2 text-sm text-slate-200">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                                {w}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* --- Closing statement --- */}
            <div
                data-testid="leads-closing"
                className="mt-12 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 lg:p-8"
            >
                <p className="font-heading text-xl font-semibold leading-snug text-white sm:text-2xl">
                    You don’t just get insights.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                    CreatorBoostAI does the work to <span className="font-semibold text-white">generate, engage, and close deals</span> —
                    while BodyIQ-AI helps you <span className="font-semibold text-white">win more of them</span>.
                </p>
            </div>

            {/* --- Target audience --- */}
            <div className="mt-12" data-testid="leads-audience">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Built for sales professionals
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {AUDIENCE.map((a) => (
                        <li
                            key={a.label}
                            className="flex items-center gap-2 rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-slate-200 transition-colors hover:border-cyan-500/30"
                        >
                            <a.Icon size={14} className="flex-shrink-0 text-cyan-300" />
                            <span className="truncate">{a.label}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* --- CTAs --- */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                    to="/demo"
                    data-testid="leads-cta-demo"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]"
                >
                    Watch a Demo <ArrowRight size={14} />
                </Link>
                <Link
                    to="/pricing?from=leads-section"
                    data-testid="leads-cta-pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                >
                    See Plans & Pricing
                </Link>
            </div>
        </div>
    </section>
);

export default GetLeadsSection;
