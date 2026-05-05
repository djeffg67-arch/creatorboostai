import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import {
    Rocket, FileText, TrendingUp, Banknote, Users, Mail, Sparkles,
    ArrowRight, Play, Pause, RotateCcw, CheckCircle2, MessageSquare, Building2,
} from "lucide-react";

const SCENES = [
    {
        title: "Tell the avatar your business idea",
        Icon: MessageSquare,
        kicker: "Scene 1 · The Spark",
        body: "“Tell me what business you want to start. I'll help you build the plan, documents, numbers, leads, outreach, and next steps.”",
        chip: "Founder enters: 'Mobile dog grooming · Austin TX · solo · $80 avg ticket'",
    },
    {
        title: "Structured questions, not endless chat",
        Icon: Users,
        kicker: "Scene 2 · Discovery",
        body: "Industry. Location. Pricing idea. Year-1 goal. Six structured questions in 90 seconds — every input maps to a real output.",
        chip: "ICP captured · pricing band locked · year-1 revenue target set",
    },
    {
        title: "A real business plan in minutes",
        Icon: FileText,
        kicker: "Scene 3 · The Plan",
        body: "Executive summary, market, competition, GTM, ops, financials. 8 sections. Markdown-clean. Print to PDF or export to DOCX with one click.",
        chip: "8-section plan generated · PDF + DOCX exports unlocked",
    },
    {
        title: "12-month financial projections",
        Icon: TrendingUp,
        kicker: "Scene 4 · The Numbers",
        body: "Realistic growth assumptions. Month-by-month revenue, COGS, gross margin, fixed costs, operating profit, cash balance. Built like a real CFO would.",
        chip: "Breakeven month: 7 · year-end cash: $42K · gross margin: 68%",
    },
    {
        title: "Loan-ready documents",
        Icon: Banknote,
        kicker: "Scene 5 · The Capital",
        body: "1-page executive summary. Use of funds. Repayment plan with DSCR ≥ 1.25. Owner experience. Bank-ready, lender-ready.",
        chip: "Loan summary · DSCR 1.4 · use-of-funds itemized",
    },
    {
        title: "A targeted lead list — not a Lusha export",
        Icon: Users,
        kicker: "Scene 6 · The Customers",
        body: "ICP locked. Lead-list filter spec generated. Each lead routes through the Exclusive Lead Engine — locked to you, never duplicated, never resold.",
        chip: "ICP defined · 47 prospects assembled · all locked to founder",
    },
    {
        title: "Value-first outreach the avatar writes for you",
        Icon: Mail,
        kicker: "Scene 7 · The Outreach",
        body: "5-touch cadence. Day 0 force-reply. Day 1 bump. Day 3 proof point. Day 5 Loom offer. Day 8 polite close. Personalized to each prospect's industry + city.",
        chip: "5 emails drafted per lead · all in voice · ready to send",
    },
    {
        title: "Demo or offer page launched",
        Icon: Sparkles,
        kicker: "Scene 8 · The Conversion",
        body: "Soft-gated demo page captures email + company. The intent score auto-bumps. The Hot Leads button surfaces them in the Ops portal in real time.",
        chip: "First demo viewed · soft-gate triggered · prospect score 85",
    },
    {
        title: "Replies tracked. Engagement scored. Hot leads pinged.",
        Icon: CheckCircle2,
        kicker: "Scene 9 · The Signal",
        body: "Every reply gets AI-classified into interested / neutral / not-interested. Interested replies auto-create deals + send Calendly. Founder gets SMS within 60 seconds.",
        chip: "1 deal created · $2,800 pipeline · founder notified",
    },
    {
        title: "From win → client workspace · automatic",
        Icon: Building2,
        kicker: "Scene 10 · The Delivery",
        body: "Lead flips to won. Client account auto-created. 6-step checklist seeded. Magic link emailed. Delivery AI takes over. Zero manual handoff.",
        chip: "Client onboarded · workspace active · status: in_progress",
    },
];

export default function StartupDemoPage() {
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(true);

    useEffect(() => {
        if (!playing) return;
        const t = setTimeout(() => setIdx((i) => (i + 1 < SCENES.length ? i + 1 : i)), 7000);
        return () => clearTimeout(t);
    }, [idx, playing]);

    const scene = SCENES[idx];
    const progress = Math.round((100 * (idx + 1)) / SCENES.length);

    return (
        <Layout>
            <div className="relative min-h-[90vh] bg-ink-900 text-slate-100" data-testid="startup-demo-page">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_60%)]" />
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.08),transparent_55%)]" />

                <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:py-16">
                    <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-3 py-1.5">
                            <Rocket size={11} className="text-emerald-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">CreatorBoostAI · Founder Demo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPlaying((p) => !p)}
                                data-testid="demo-toggle-play"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300"
                            >
                                {playing ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Play</>}
                            </button>
                            <button
                                onClick={() => { setIdx(0); setPlaying(true); }}
                                data-testid="demo-replay"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300"
                            >
                                <RotateCcw size={11} /> Replay
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-ink-700/50">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5" data-testid="demo-scene-pager">
                        {SCENES.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setIdx(i); setPlaying(false); }}
                                data-testid={`demo-scene-${i}`}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? "bg-emerald-400/70" : "bg-white/10 hover:bg-white/20"}`}
                                aria-label={`Scene ${i + 1}`}
                            />
                        ))}
                    </div>

                    {/* Active scene */}
                    <div className="mt-12 min-h-[360px] rounded-md border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-6 sm:p-10" data-testid="demo-active-scene">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/10">
                                <scene.Icon size={20} className="text-emerald-300" />
                            </div>
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">{scene.kicker}</p>
                                <h2 className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">
                                    {scene.title}
                                </h2>
                            </div>
                        </div>
                        <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-lg">
                            {scene.body}
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-ink-900 px-4 py-2.5 font-mono text-[11px] text-cyan-300">
                            <Sparkles size={12} /> {scene.chip}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="mt-12 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 text-center sm:p-10">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Stop watching · start building</p>
                        <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                            Build your business plan + first lead list in under 10 minutes.
                        </h3>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Link
                                to="/portal/builder"
                                data-testid="startup-demo-cta-builder"
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-emerald-300"
                            >
                                Open Business Builder <ArrowRight size={15} />
                            </Link>
                            <Link
                                to="/pricing"
                                data-testid="startup-demo-cta-pricing"
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-ink-900 px-5 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                            >
                                See Startup Pricing
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
