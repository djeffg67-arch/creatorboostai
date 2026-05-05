import React from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import {
    Rocket, FileText, TrendingUp, Banknote, Users, Mail, Sparkles,
    ArrowRight, CheckCircle2, ShieldCheck, Building2, Globe,
} from "lucide-react";

const TOOLS = [
    { Icon: FileText,   label: "Business plan generator" },
    { Icon: TrendingUp, label: "Financial projections" },
    { Icon: Banknote,   label: "Loan-ready documents" },
    { Icon: Globe,      label: "Business website builder" },
    { Icon: CheckCircle2, label: "Startup checklist" },
    { Icon: Users,      label: "ICP + market research" },
    { Icon: Mail,       label: "Cold-email + outreach scripts" },
    { Icon: Sparkles,   label: "Pitch deck outline" },
];

export default function StartupLandingPage() {
    return (
        <Layout>
            <div className="relative bg-ink-900 text-slate-100" data-testid="startup-landing-page">
                {/* Hero */}
                <section className="relative overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_60%)]" />
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.08),transparent_55%)]" />
                    <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-3 py-1.5">
                            <Rocket size={11} className="text-emerald-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">For new + early-stage businesses</span>
                        </div>
                        <h1 className="font-heading mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                            Start and Grow Your Business With{" "}
                            <span className="text-emerald-300">One AI Operating System</span>
                        </h1>
                        <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                            CreatorBoostAI helps new businesses go from idea to execution — including business plans,
                            startup documents, loan packages, financial projections, lead generation, outreach,
                            demos, decision support, and client management in one system.
                        </p>

                        <div className="mt-10 flex flex-wrap items-center gap-3">
                            <Link
                                to="/portal/builder"
                                data-testid="cta-start-business"
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-emerald-300"
                            >
                                Start a New Business <ArrowRight size={15} />
                            </Link>
                            <Link
                                to="/demo/startup"
                                data-testid="cta-watch-startup-demo"
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-ink-900 px-5 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                            >
                                Watch Startup Demo <ArrowRight size={15} />
                            </Link>
                            <Link
                                to="/portal/builder?tool=business_plan"
                                data-testid="cta-build-plan"
                                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-ink-700/40 px-5 py-3 text-sm font-medium text-slate-200 hover:border-white/30"
                            >
                                Build My Business Plan
                            </Link>
                        </div>

                        {/* Tools grid */}
                        <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="startup-tools-grid">
                            {TOOLS.map(({ Icon, label }) => (
                                <div key={label} className="rounded-md border border-white/10 bg-ink-700/30 p-4">
                                    <Icon size={16} className="text-emerald-300" />
                                    <p className="mt-2 text-xs font-medium text-slate-200">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Website Builder feature highlight */}
                        <div
                            data-testid="startup-website-feature"
                            className="mt-10 overflow-hidden rounded-md border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-6 sm:p-8"
                        >
                            <div className="flex flex-wrap items-start gap-6">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/10">
                                    <Globe size={20} className="text-emerald-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">New · included in every plan</p>
                                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white sm:text-3xl">
                                        Build Your Business Website Instantly
                                    </h3>
                                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                                        CreatorBoostAI creates your full website — pages, messaging, and lead capture —
                                        so you can go live immediately. Homepage, services, about, and contact pages are
                                        written for your industry, optimized for conversion, and wired to your CRM.
                                    </p>
                                    <div className="mt-5 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">Home</span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">Services</span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">About</span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">Contact</span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Lead capture → CRM</span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Mobile + Desktop</span>
                                    </div>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Link
                                            to="/demo/startup"
                                            data-testid="cta-see-website-demo"
                                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-ink-900 hover:bg-emerald-300"
                                        >
                                            See it in the demo <ArrowRight size={13} />
                                        </Link>
                                        <Link
                                            to="/portal/builder"
                                            data-testid="cta-build-website"
                                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-ink-900 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                                        >
                                            Build my website
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Story strip */}
                <section className="border-b border-white/5">
                    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">From idea → first 10 customers</p>
                        <h2 className="font-heading mt-3 max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
                            One platform. Every stage.
                        </h2>
                        <ol className="mt-10 space-y-4">
                            {[
                                ["1", "Tell the avatar your business idea", "Industry, location, goals, pricing — answer 6 questions."],
                                ["2", "Get a business plan + financials", "Draft business plan, 12-month projection, startup budget — exportable to PDF/DOCX."],
                                ["3", "Get loan-ready documents", "Loan summary, repayment schedule, use-of-funds — bank-ready in minutes."],
                                ["4", "Your business website, built for you", "Homepage, services, about, contact + lead capture wired to your CRM. Mobile + desktop. Domain-ready."],
                                ["5", "Build a targeted lead list", "Define your ICP, generate value-first outreach, launch a demo or offer page."],
                                ["6", "Close + onboard clients", "Auto-onboarding workflow + delivery workspace + AI assistant per client."],
                            ].map(([n, t, b]) => (
                                <li key={n} className="flex gap-4 rounded-md border border-white/10 bg-ink-700/30 p-5">
                                    <span className="font-heading flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-base font-semibold text-emerald-300">{n}</span>
                                    <div>
                                        <p className="font-heading text-base font-semibold text-white">{t}</p>
                                        <p className="mt-1 text-sm text-slate-400">{b}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Pricing teaser */}
                <section className="border-b border-white/5">
                    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
                        <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 p-6 text-center sm:p-10">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Built for founders · cancel anytime</p>
                            <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                                Starter Launch <span className="text-emerald-300">$29/mo</span>
                                <span className="ml-2 text-base text-slate-400">· Growth Launch $79/mo · Pro Launch $149/mo</span>
                            </h3>
                            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
                                Pick a plan when you're ready. Outgrow it? One-click upgrade to a Standard tier — your
                                leads, history, and senders move with you.
                            </p>
                            <Link
                                to="/pricing"
                                data-testid="startup-pricing-cta"
                                className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-emerald-400/40 bg-ink-900 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300 hover:bg-emerald-400 hover:text-ink-900"
                            >
                                See pricing <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Disclaimer */}
                <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
                    <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-100/80">
                        <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-amber-300" />
                        <p>
                            All outputs are <strong>draft documents and decision-support material</strong>, not licensed
                            legal, tax, or financial advice. Always review with a qualified attorney, CPA, or financial
                            advisor before relying on them.
                        </p>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
