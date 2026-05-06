import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import HookDemoPlayer, { BehindTheScenes, IndustryChipRow } from "@/components/demo/HookDemoPlayer";
import { getHookDemo, INDUSTRY_CHIPS } from "@/lib/hookDemos";
import { ArrowLeft, Sparkles, Layers } from "lucide-react";

/**
 * Layer 1 of the cinematic funnel — 30-60 second hook demos.
 * Route: /demo/quick/:industry
 *
 * If the requested industry doesn't have a hook demo yet, we redirect
 * to the existing long-form demo (set in INDUSTRY_CHIPS.fallback).
 */
export default function HookDemoPage() {
    const { industry } = useParams();
    const navigate = useNavigate();
    const [demo, setDemo] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        const d = getHookDemo(industry);
        if (d) {
            setDemo(d);
            setMissing(false);
            return;
        }
        // Hook not built yet — fall back to long-form demo.
        const chip = INDUSTRY_CHIPS.find((c) => c.id === industry);
        if (chip?.fallback) {
            navigate(chip.fallback, { replace: true });
            return;
        }
        setMissing(true);
    }, [industry, navigate]);

    return (
        <Layout>
            <div className="relative min-h-[88vh] bg-ink-900 text-slate-100" data-testid="hook-demo-page">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_60%)]" />
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.07),transparent_55%)]" />

                <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
                    {/* Top strip · breadcrumb + industry switch */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Link to="/demo"
                                data-testid="hook-back-to-picker"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                                <ArrowLeft size={11} /> All demos
                            </Link>
                            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                <Sparkles size={11} /> Layer 1 · 60s hook demo
                            </span>
                        </div>
                        {demo && (
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400" data-testid="hook-current-industry">
                                Industry: <span className="text-white">{demo.label}</span>
                            </p>
                        )}
                    </div>

                    {missing && (
                        <div className="mt-10 rounded-md border border-rose-500/30 bg-rose-500/5 p-6" data-testid="hook-not-found">
                            <p className="font-heading text-2xl text-white">Hook demo not available for "{industry}".</p>
                            <p className="mt-2 text-sm text-slate-400">Pick another industry to continue.</p>
                            <div className="mt-4">
                                <IndustryChipRow />
                            </div>
                        </div>
                    )}

                    {demo && (
                        <>
                            {/* Player */}
                            <div className="mt-6">
                                <HookDemoPlayer demo={demo} />
                            </div>

                            {/* Behind-the-scenes reveal · sets up the depth narrative */}
                            <BehindTheScenes demo={demo} />

                            {/* Layered next steps (also redundant with in-player CTAs — visible always) */}
                            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Link to={demo.full_walkthrough_path}
                                    data-testid="hook-next-walkthrough"
                                    className="group rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5 transition-all hover:border-cyan-400/60 hover:bg-cyan-500/10">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Layer 2</p>
                                    <p className="font-heading mt-1 text-xl font-semibold text-white">Industry walkthrough</p>
                                    <p className="mt-1 text-sm text-slate-300">{demo.full_walkthrough_label}</p>
                                </Link>
                                <Link to={demo.executive_path}
                                    data-testid="hook-next-executive"
                                    className="group rounded-md border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/[0.05]">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Layer 3</p>
                                    <p className="font-heading mt-1 text-xl font-semibold text-white">Executive deep dive</p>
                                    <p className="mt-1 text-sm text-slate-300">Governance · audit trail · multi-agent execution.</p>
                                </Link>
                            </div>

                            {/* Industry switcher */}
                            <div className="mt-10 rounded-md border border-white/5 bg-white/[0.02] p-5" data-testid="hook-industry-switcher">
                                <div className="flex items-center gap-2">
                                    <Layers size={13} className="text-cyan-300" />
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                        Want to see how this works in your business?
                                    </p>
                                </div>
                                <div className="mt-3">
                                    <IndustryChipRow activeId={demo.id} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
}
