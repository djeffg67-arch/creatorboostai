import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Globe, Sparkles, Loader2, ArrowRight, ArrowLeft, RefreshCcw, CheckCircle2,
    Copy, Rocket,
} from "lucide-react";
import { websiteBuilderGenerate } from "@/lib/api";
import { RenderedWebsitePreview } from "@/components/portal/RenderedWebsitePreview";

const BUILD_STEPS = [
    "Generating homepage…",
    "Drafting service pages…",
    "Optimizing messaging for your industry…",
    "Wiring lead capture form to CRM…",
    "Building mobile + desktop layouts…",
    "Preparing for domain deployment…",
];

const FIELDS = [
    { key: "business_idea",  label: "Business idea",        placeholder: "e.g. Mobile dog grooming serving busy Austin pet parents",  required: true,  multiline: true },
    { key: "business_name",  label: "Business name",        placeholder: "Austin Dog Grooming" },
    { key: "industry",       label: "Industry",             placeholder: "Pet services / Real estate / Contractor / Retail…" },
    { key: "location",       label: "Location",             placeholder: "Austin, TX" },
    { key: "audience",       label: "Target customer",      placeholder: "Busy professionals with dogs · suburban Austin" },
    { key: "offer",          label: "Offer / pricing",      placeholder: "$80 flat per visit · same-week booking" },
];

const STARTERS = {
    "Real estate agent": {
        business_idea: "Top-producing real estate agent helping move-up buyers find family homes",
        business_name: "Sarah Lopez Realty",
        industry: "Real estate",
        location: "Phoenix, AZ",
        audience: "Move-up buyers with growing families, $400K-$800K range",
        offer: "Concierge listing service · 7-day-or-less response · 0% buyer agent fee promo",
    },
    "General contractor": {
        business_idea: "Licensed general contractor specializing in kitchen and bath remodels",
        business_name: "Caldwell Build Co",
        industry: "Home improvement / contractor",
        location: "Denver, CO",
        audience: "Homeowners planning $40K+ renovations",
        offer: "Free consultation, 3D design preview, fixed-price contracts",
    },
    "Boutique retail": {
        business_idea: "Curated boutique selling sustainable womenswear",
        business_name: "Linen & Lark",
        industry: "Retail / fashion",
        location: "Charleston, SC",
        audience: "Style-conscious women 28-55 who care about ethical sourcing",
        offer: "Limited-edition drops monthly, ship-anywhere policy, free local pickup",
    },
};

export default function WebsiteBuilderPage() {
    const [inputs, setInputs] = useState({});
    const [busy, setBusy] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [site, setSite] = useState(null);
    const [error, setError] = useState(null);
    const stepTimerRef = useRef(null);

    // Animate build steps while busy.
    useEffect(() => {
        if (!busy) {
            setStepIdx(0);
            if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
            return;
        }
        if (stepIdx >= BUILD_STEPS.length) return;
        stepTimerRef.current = setTimeout(() => setStepIdx((i) => i + 1), 1100);
        return () => clearTimeout(stepTimerRef.current);
    }, [busy, stepIdx]);

    const set = (k, v) => setInputs((p) => ({ ...p, [k]: v }));

    const applyStarter = (key) => {
        const s = STARTERS[key];
        if (s) setInputs(s);
    };

    const generate = async () => {
        if (!inputs.business_idea || inputs.business_idea.trim().length < 4) {
            toast.error("Tell the avatar what business this is for");
            return;
        }
        setBusy(true);
        setSite(null);
        setError(null);
        setStepIdx(0);
        try {
            const r = await websiteBuilderGenerate(inputs);
            setSite(r.site || null);
            toast.success("Website ready");
        } catch (e) {
            const msg = e?.response?.data?.detail || e?.message || "Generation failed";
            setError(msg);
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    const reset = () => {
        setSite(null);
        setError(null);
        setStepIdx(0);
    };

    const copyJSON = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(site, null, 2));
            toast.success("Copied site JSON");
        } catch { toast.error("Copy failed"); }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-ink-900 text-slate-100" data-testid="website-builder-page">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Globe size={20} className="text-emerald-300" />
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">CreatorBoostAI · Website Builder</p>
                                <h1 className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">
                                    Build your business website in seconds
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link to="/portal/builder" data-testid="cta-back-builder"
                                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                                <ArrowLeft size={11} /> Back to Builder
                            </Link>
                            <Link to="/demo/startup" data-testid="cta-watch-startup-demo-from-builder"
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                <Rocket size={11} /> Watch Demo
                            </Link>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[420px,1fr]">
                        {/* Left: input form */}
                        <div className="space-y-4">
                            <div className="rounded-md border border-white/10 bg-ink-700/30 p-5">
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Tell the avatar about your business</p>
                                <p className="mt-1 text-xs text-slate-400">A real Claude-generated site appears in seconds. No templates.</p>
                                <div className="mt-3 flex flex-wrap gap-1.5" data-testid="builder-starters">
                                    {Object.keys(STARTERS).map((k) => (
                                        <button key={k} onClick={() => applyStarter(k)}
                                            data-testid={`starter-${k.toLowerCase().replace(/\s+/g, "-")}`}
                                            className="rounded-full border border-white/10 bg-ink-900 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300">
                                            {k}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 space-y-3">
                                    {FIELDS.map((f) => (
                                        <div key={f.key}>
                                            <label className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                                {f.label}{f.required && <span className="ml-1 text-rose-300">*</span>}
                                            </label>
                                            {f.multiline ? (
                                                <textarea
                                                    value={inputs[f.key] || ""}
                                                    onChange={(e) => set(f.key, e.target.value)}
                                                    placeholder={f.placeholder}
                                                    rows={3}
                                                    data-testid={`builder-input-${f.key}`}
                                                    className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                                                />
                                            ) : (
                                                <input
                                                    value={inputs[f.key] || ""}
                                                    onChange={(e) => set(f.key, e.target.value)}
                                                    placeholder={f.placeholder}
                                                    data-testid={`builder-input-${f.key}`}
                                                    className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={generate}
                                    disabled={busy}
                                    data-testid="builder-generate-website"
                                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-300 disabled:opacity-60"
                                >
                                    {busy ? <><Loader2 size={14} className="animate-spin" /> Building your site…</> : <><Sparkles size={14} /> Generate Website <ArrowRight size={14} /></>}
                                </button>
                                {site && !busy && (
                                    <button
                                        onClick={reset}
                                        data-testid="builder-reset-website"
                                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-ink-900 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300"
                                    >
                                        <RefreshCcw size={11} /> Try a different angle
                                    </button>
                                )}
                            </div>

                            {/* Build log — visible while busy or until first generation */}
                            <div className="rounded-md border border-cyan-500/20 bg-ink-700/30 p-4" data-testid="builder-build-log">
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Build log</p>
                                <div className="mt-2 space-y-1.5">
                                    {BUILD_STEPS.map((s, i) => {
                                        const done = busy ? i < stepIdx : !!site && i < BUILD_STEPS.length;
                                        const current = busy && i === stepIdx;
                                        return (
                                            <div key={s}
                                                 data-testid={`build-step-${i}`}
                                                 className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 font-mono text-[11px] ${
                                                     done ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                                                     : current ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                                                     : "border-white/5 bg-ink-900 text-slate-500"
                                                 }`}>
                                                {done ? <CheckCircle2 size={11} className="text-emerald-300" />
                                                    : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                                                    : <span className="h-2 w-2 rounded-full bg-white/10" />}
                                                <span>{s}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {error && (
                                    <p data-testid="builder-error" className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Right: preview */}
                        <div className="space-y-4">
                            {!site && !busy && (
                                <div className="flex h-[400px] flex-col items-center justify-center rounded-md border border-white/10 bg-ink-700/20 text-center" data-testid="builder-placeholder">
                                    <Globe size={32} className="text-slate-500" />
                                    <p className="mt-3 font-heading text-lg font-semibold text-white">Your live preview lands here.</p>
                                    <p className="mt-1 max-w-sm text-sm text-slate-400">
                                        Tell the avatar about your business on the left, then click Generate.
                                    </p>
                                </div>
                            )}
                            {busy && !site && (
                                <div className="flex h-[400px] flex-col items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/5" data-testid="builder-loading">
                                    <span className="inline-block h-3 w-3 animate-ping rounded-full bg-cyan-400" />
                                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">Composing your website…</p>
                                    <p className="mt-1 max-w-sm text-center text-xs text-slate-400">
                                        Real Claude generation · industry-tuned messaging · ~10-30s
                                    </p>
                                </div>
                            )}
                            {site && (
                                <>
                                    <RenderedWebsitePreview site={site} testIdPrefix="builder-website" />
                                    <div className="flex flex-wrap items-center gap-2" data-testid="builder-actions">
                                        <button onClick={copyJSON} data-testid="builder-copy-json"
                                            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                                            <Copy size={11} /> Copy JSON
                                        </button>
                                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                            Layered next: 1-click publish · domain · hosting
                                        </span>
                                    </div>
                                </>
                            )}
                            <p className="font-mono text-[9px] text-slate-500">
                                Draft website preview · review before publishing. CreatorBoostAI generates copy and structure;
                                you review and adjust before going live.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
