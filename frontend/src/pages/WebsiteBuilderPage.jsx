import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Globe, Sparkles, Loader2, ArrowRight, ArrowLeft, RefreshCcw, CheckCircle2,
    Copy, Rocket, Mail, ExternalLink, Server,
} from "lucide-react";
import { websiteBuilderGenerate, websiteBuilderIntent, websiteBuilderPublish, websiteBuilderConnectDomain } from "@/lib/api";
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
                                    <DomainIntentCard site={site} inputs={inputs} />
                                    <div className="flex flex-wrap items-center gap-2" data-testid="builder-actions">
                                        <button onClick={copyJSON} data-testid="builder-copy-json"
                                            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                                            <Copy size={11} /> Copy JSON
                                        </button>
                                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                            Publishes instantly · custom-domain ready
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

// ─────────── Publish + Custom-Domain Card · Iter 63 ───────────
// Three states:
//   1. idle      — show Publish button + email field
//   2. published — show live URL + Visit/Copy + (optional) Connect Domain panel
//   3. domain    — DNS instruction card after a custom domain is requested
const DomainIntentCard = ({ site, inputs }) => {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [published, setPublished] = useState(null);   // {slug, public_url, published_at}
    const [showDomain, setShowDomain] = useState(false);
    const [customDomain, setCustomDomain] = useState("");
    const [domainBusy, setDomainBusy] = useState(false);
    const [domainResult, setDomainResult] = useState(null); // server response

    // Reset when a new site is generated.
    useEffect(() => {
        setPublished(null);
        setShowDomain(false);
        setCustomDomain("");
        setDomainResult(null);
    }, [site]);

    const buildPayload = () => ({
        site,
        owner_email: (email || "").trim().toLowerCase() || null,
        business_name: inputs?.business_name || site?.brand || null,
        industry: inputs?.industry || null,
        slug: site?.domain || null,
    });

    const publishNow = async () => {
        setBusy(true);
        try {
            const r = await websiteBuilderPublish(buildPayload());
            setPublished(r);
            // Best-effort: also log a publish_intent so it shows in the dark-funnel ledger.
            try {
                await websiteBuilderIntent({
                    intent: "publish_intent",
                    email: email || null,
                    business_name: inputs?.business_name || site?.brand || null,
                    business_idea: inputs?.business_idea || null,
                    industry: inputs?.industry || null,
                    desired_domain: r?.public_url || null,
                });
            } catch { /* non-blocking */ }
            toast.success("Site is live");
        } catch (e) {
            const msg = e?.response?.data?.detail || e?.message || "Publish failed";
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    const copyUrl = async () => {
        if (!published?.public_url) return;
        try {
            await navigator.clipboard.writeText(published.public_url);
            toast.success("Link copied");
        } catch { toast.error("Copy failed"); }
    };

    const connectDomain = async () => {
        const d = (customDomain || "").trim().toLowerCase()
            .replace(/^https?:\/\//, "").replace(/\/+$/, "");
        if (!/^[a-z0-9.\-]+\.[a-z]{2,}$/.test(d)) {
            toast.error("Use the bare host, e.g. yourbusiness.com");
            return;
        }
        if (!published?.slug) return;
        setDomainBusy(true);
        try {
            const r = await websiteBuilderConnectDomain(published.slug, {
                custom_domain: d,
                email: email || null,
            });
            setDomainResult(r);
            toast.success("DNS instructions ready");
        } catch (e) {
            const msg = e?.response?.data?.detail || e?.message || "Could not save your domain request";
            toast.error(msg);
        } finally {
            setDomainBusy(false);
        }
    };

    // ───── State 2 + 3 · Site is published
    if (published) {
        return (
            <div data-testid="publish-success-card"
                 className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Site is live</p>
                </div>
                <a href={published.public_url} target="_blank" rel="noopener noreferrer"
                   data-testid="publish-public-url"
                   className="mt-2 block break-all rounded-sm border border-emerald-500/30 bg-ink-900 px-3 py-2 font-mono text-[12px] text-emerald-200 hover:bg-emerald-500/10">
                    {published.public_url}
                </a>
                <div className="mt-2 flex flex-wrap gap-2">
                    <a href={published.public_url} target="_blank" rel="noopener noreferrer"
                       data-testid="publish-visit"
                       className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-ink-900 hover:bg-emerald-300">
                        <ExternalLink size={11} /> Visit live site
                    </a>
                    <button onClick={copyUrl}
                        data-testid="publish-copy-url"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                        <Copy size={11} /> Copy URL
                    </button>
                    <button onClick={() => setShowDomain((p) => !p)}
                        data-testid="publish-toggle-domain"
                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                        <Globe size={11} /> {showDomain ? "Hide" : "Connect a custom domain"}
                    </button>
                </div>

                {showDomain && !domainResult && (
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-3" data-testid="connect-domain-form">
                        <div>
                            <label className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Your domain</label>
                            <input
                                value={customDomain}
                                onChange={(e) => setCustomDomain(e.target.value)}
                                placeholder="yourbusiness.com"
                                data-testid="connect-domain-input"
                                className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={connectDomain}
                            disabled={domainBusy}
                            data-testid="connect-domain-submit"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-cyan-300 disabled:opacity-60"
                        >
                            {domainBusy ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                                : <><Server size={13} /> Get DNS instructions</>}
                        </button>
                        <p className="font-mono text-[9px] text-slate-500">
                            We'll point your domain at this site. You'll need access to your registrar (GoDaddy, Namecheap, Cloudflare, etc.).
                        </p>
                    </div>
                )}

                {domainResult && (
                    <div className="mt-4 border-t border-white/10 pt-3" data-testid="connect-domain-instructions">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            DNS records for {domainResult.custom_domain}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">
                            Status: {domainResult.status} · {domainResult.verification_eta}
                        </p>
                        <div className="mt-3 space-y-2">
                            {(domainResult.dns_instructions || []).map((rec, i) => (
                                <div key={i} data-testid={`dns-record-${i}`}
                                     className="rounded-md border border-cyan-500/20 bg-ink-900 p-3">
                                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                                        <div>
                                            <p className="uppercase tracking-[0.18em] text-slate-500">Type</p>
                                            <p className="text-cyan-300">{rec.type}</p>
                                        </div>
                                        <div>
                                            <p className="uppercase tracking-[0.18em] text-slate-500">Host</p>
                                            <p className="text-white">{rec.host}</p>
                                        </div>
                                        <div>
                                            <p className="uppercase tracking-[0.18em] text-slate-500">Points to</p>
                                            <p className="break-all text-emerald-300">{rec.points_to}</p>
                                        </div>
                                    </div>
                                    {rec.note && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{rec.note}</p>}
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 font-mono text-[9px] text-slate-500">
                            Need help? Email <a href={`mailto:${domainResult.support_email}`} className="text-cyan-300 underline">{domainResult.support_email}</a> — we'll wire it up for you.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // ───── State 1 · Idle (not yet published)
    return (
        <div data-testid="publish-card"
             className="rounded-md border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.06] to-emerald-500/[0.04] p-4">
            <div className="flex items-center gap-2">
                <Rocket size={14} className="text-emerald-300" />
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Publish your site</p>
                    <p className="font-mono text-[10px] text-slate-400">Goes live instantly on a CreatorBoostAI subdomain. Free.</p>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                    <Mail size={9} className="mr-1 inline" /> Your email <span className="text-slate-500">(optional)</span>
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    data-testid="publish-email"
                    className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                    onClick={publishNow}
                    disabled={busy}
                    data-testid="publish-submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-[0_0_18px_rgba(16,185,129,0.3)] hover:bg-emerald-300 disabled:opacity-60"
                >
                    {busy ? <><Loader2 size={13} className="animate-spin" /> Publishing…</>
                        : <><Rocket size={13} /> Publish now (instant)</>}
                </button>
                <p className="font-mono text-[9px] text-slate-500">
                    Lead-form submissions route directly into your CRM. Connect your own domain after publish.
                </p>
            </div>
        </div>
    );
};

