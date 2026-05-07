import React, { useMemo, useState } from "react";
import { Layout } from "@/components/site/Layout";
import {
    Rocket, Building2, Globe, Users, Target, MapPin, Tag, Layers,
    Sparkles, ArrowRight, ChevronRight, CheckCircle2, Loader2, Copy,
    FileText, Workflow, Network, Zap, Briefcase, DollarSign, Send,
    LineChart,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * StartupLaunchPage
 * --------------------------------------------------------------
 * Iter 82 · Phase-1 of the AI Business Operating System layer.
 *
 *   Step 1: cinematic landing — positioning, future-phase chips
 *   Step 2: 8-field guided intake
 *   Step 3: result view — 9-section launch plan from Claude Sonnet 4.5
 *
 * Mounted at /startup, /build, /launch.
 */

const FIELDS = [
    { key: "business_name",    label: "Business name",     icon: Building2, placeholder: "Atlas Mobile Diagnostics", lines: 1 },
    { key: "industry",         label: "Industry",          icon: Tag,       placeholder: "On-site equipment diagnostics for mid-sized fleets", lines: 1 },
    { key: "services",         label: "Services",          icon: Layers,    placeholder: "Diagnostics, predictive maintenance, parts sourcing, retainer support", lines: 3 },
    { key: "location",         label: "Location",          icon: MapPin,    placeholder: "Tampa Bay, FL · 50 mile radius", lines: 1 },
    { key: "business_goals",   label: "Business goals",    icon: Target,    placeholder: "Hit $40K MRR by month 9. Build a recurring-retainer book.", lines: 2 },
    { key: "target_customers", label: "Target customers",  icon: Users,     placeholder: "Logistics fleets, last-mile carriers, regional grocery chains", lines: 2 },
    { key: "revenue_goals",    label: "Revenue goals",     icon: DollarSign, placeholder: "$500K Y1 ARR · 60% retainer / 40% project", lines: 1 },
    { key: "branding_style",   label: "Branding style",    icon: Sparkles,  placeholder: "Operator-grade, dark mode, monospace accents, no fluff", lines: 1 },
];

const FUTURE_PHASES = [
    { Icon: Globe,    label: "Website generation",       phase: "Phase 2" },
    { Icon: FileText, label: "Prompt export",            phase: "Phase 2" },
    { Icon: Network,  label: "Deployment integrations",  phase: "Phase 3" },
    { Icon: Workflow, label: "AI builder integrations",  phase: "Phase 3" },
    { Icon: Briefcase,label: "CRM setup automation",     phase: "Phase 3" },
];

export default function StartupLaunchPage() {
    const [stage, setStage] = useState("hero"); // "hero" | "intake" | "result"
    const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, ""])));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const allFilled = useMemo(
        () => FIELDS.every((f) => (form[f.key] || "").trim().length >= 2),
        [form],
    );

    const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

    const submit = async () => {
        if (!allFilled || busy) return;
        setBusy(true); setError(null);
        try {
            const res = await fetch(`${BACKEND_URL}/api/startup-launch/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intake: form }),
            });
            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json.detail || json.error || `HTTP ${res.status}`);
            }
            setResult(json);
            setStage("result");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setError(String(e?.message || e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Layout>
            <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-14" data-testid="startup-launch-page">
                {stage === "hero" && (
                    <Hero onStart={() => setStage("intake")} />
                )}

                {stage === "intake" && (
                    <Intake
                        form={form}
                        onField={setField}
                        onBack={() => setStage("hero")}
                        onSubmit={submit}
                        allFilled={allFilled}
                        busy={busy}
                        error={error}
                    />
                )}

                {stage === "result" && result && (
                    <Result result={result} onRestart={() => { setResult(null); setForm(Object.fromEntries(FIELDS.map((f) => [f.key, "")])); setStage("hero"); }} />
                )}
            </div>
        </Layout>
    );
}

/* ============================ HERO ============================ */

const Hero = ({ onStart }) => (
    <>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                AI Launch Center · Phase 1 · Intake + Orchestration + Generation
            </span>
        </div>
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Launch and operate your business —{" "}
            <span className="text-cyan-400">with one AI system.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            CreatorBoostAI is not a website builder. It is the{" "}
            <span className="text-white">execution and operations layer</span>{" "}
            across your business — generating your launch roadmap, your
            website structure, your homepage copy, your pricing, your
            outreach, your lead gen, and your CRM. One intake. One AI
            system. One operating layer.
        </p>

        {/* Three-pillar positioning */}
        <div className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
                { Icon: Rocket,      title: "Launch the business",    body: "8-field guided intake produces a complete startup roadmap, website plan, and operational systems brief in one pass." },
                { Icon: Network,     title: "Run the operations",     body: "CB acts as the intelligence layer — outreach, lead gen, CRM workflow, and execution tooling are first-class outputs." },
                { Icon: LineChart,   title: "Scale the system",       body: "Future phases plug in website generation, deployment, prompt export, and AI builder integrations natively." },
            ].map((c) => (
                <div key={c.title} className="rounded-md border border-white/10 bg-ink-700/40 p-5">
                    <c.Icon size={18} className="text-cyan-300" />
                    <h3 className="font-heading mt-3 text-lg font-semibold text-white">{c.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{c.body}</p>
                </div>
            ))}
        </div>

        {/* Future-phase placeholder chips */}
        <div className="mt-10" data-testid="startup-launch-future-phases">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                Architected for what's next
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                {FUTURE_PHASES.map((p) => (
                    <div
                        key={p.label}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300"
                    >
                        <p.Icon size={11} className="text-cyan-300" />
                        {p.label}
                        <span className="text-slate-500">· {p.phase}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
                type="button"
                onClick={onStart}
                data-testid="startup-launch-start-btn"
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400"
            >
                <Rocket size={14} /> Launch My Business <ArrowRight size={13} />
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                ~60 seconds · Claude Sonnet 4.5 · 9 sections generated
            </span>
        </div>
    </>
);

/* ============================ INTAKE ============================ */

const Intake = ({ form, onField, onBack, onSubmit, allFilled, busy, error }) => (
    <div data-testid="startup-launch-intake">
        <button
            type="button"
            onClick={onBack}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 hover:text-cyan-300"
        >
            ← Back to overview
        </button>
        <h1 className="font-heading mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Tell CB about your business.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Eight fields. CB synthesizes the full launch plan — website
            structure, homepage copy, pricing, outreach, lead gen, CRM
            workflow — in a single orchestrated pass.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {FIELDS.map((f) => {
                const Icon = f.icon;
                return (
                    <label key={f.key} className="flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            <Icon size={11} />
                            {f.label}
                        </span>
                        {f.lines > 1 ? (
                            <textarea
                                rows={f.lines}
                                value={form[f.key]}
                                onChange={onField(f.key)}
                                placeholder={f.placeholder}
                                data-testid={`intake-${f.key}`}
                                className="rounded-md border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                            />
                        ) : (
                            <input
                                type="text"
                                value={form[f.key]}
                                onChange={onField(f.key)}
                                placeholder={f.placeholder}
                                data-testid={`intake-${f.key}`}
                                className="rounded-md border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                            />
                        )}
                    </label>
                );
            })}
        </div>

        {error && (
            <div className="mt-5 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200" data-testid="intake-error">
                {error}
            </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
                type="button"
                disabled={!allFilled || busy}
                onClick={onSubmit}
                data-testid="intake-submit"
                className={`inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-semibold transition-all ${
                    !allFilled || busy
                        ? "bg-white/10 text-slate-400 cursor-not-allowed"
                        : "bg-cyan-500 text-ink-900 hover:bg-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                }`}
            >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {busy ? "CB is generating your launch plan…" : "Generate launch plan"}
                {!busy && <ArrowRight size={13} />}
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {busy ? "60s · synthesizing 9 sections" : `${Object.values(form).filter((v) => v.trim()).length} of 8 fields complete`}
            </span>
        </div>
    </div>
);

/* ============================ RESULT ============================ */

const Result = ({ result, onRestart }) => {
    const plan = result?.plan || {};
    const intake = result?.intake || {};

    return (
        <div data-testid="startup-launch-result">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5">
                    <CheckCircle2 size={11} className="text-emerald-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                        Launch plan ready · {result.model}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onRestart}
                    data-testid="result-restart"
                    className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 hover:text-cyan-300"
                >
                    Run another intake →
                </button>
            </div>

            <h1 className="font-heading mt-5 text-3xl font-semibold text-white sm:text-4xl">
                {intake.business_name}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
                {intake.industry} · {intake.location}
            </p>

            <div className="mt-8 space-y-5">
                <Section
                    icon={Sparkles} label="Business overview" testid="section-overview"
                    body={
                        plan.business_overview && (
                            <>
                                <p className="text-base text-white">{plan.business_overview.one_liner}</p>
                                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{plan.business_overview.narrative}</p>
                                {plan.business_overview.differentiators?.length > 0 && (
                                    <ul className="mt-3 space-y-1.5">
                                        {plan.business_overview.differentiators.map((d, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                <ChevronRight size={12} className="mt-1 flex-shrink-0 text-cyan-300" />
                                                {d}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )
                    }
                />
                <Section
                    icon={Rocket} label="Startup roadmap" testid="section-roadmap"
                    body={Array.isArray(plan.startup_roadmap) && (
                        <ol className="space-y-3">
                            {plan.startup_roadmap.map((p, i) => (
                                <li key={i} className="rounded-md border border-white/5 bg-ink-900 p-4">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{p.phase}</p>
                                    <p className="mt-1.5 text-sm text-white">{p.objective}</p>
                                    {p.deliverables?.length > 0 && (
                                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                            {p.deliverables.map((d, j) => (
                                                <li key={j} className="flex gap-2"><span className="text-cyan-300">·</span>{d}</li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                />
                <Section
                    icon={Globe} label="Website structure" testid="section-website"
                    body={Array.isArray(plan.website_structure) && (
                        <div className="space-y-3">
                            {plan.website_structure.map((p, i) => (
                                <div key={i} className="rounded-md border border-white/5 bg-ink-900 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-white">{p.title}</p>
                                        <code className="rounded bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">{p.path}</code>
                                    </div>
                                    <p className="mt-1.5 text-xs text-slate-400">{p.purpose}</p>
                                    {p.sections?.length > 0 && (
                                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                            Sections: {p.sections.join(" · ")}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                />
                <Section
                    icon={FileText} label="Homepage copy" testid="section-homepage"
                    body={plan.homepage_copy && (
                        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{plan.homepage_copy.hero_eyebrow}</p>
                            <h3 className="font-heading mt-2 text-2xl font-semibold text-white">{plan.homepage_copy.hero_headline}</h3>
                            <p className="mt-3 text-sm text-slate-300">{plan.homepage_copy.hero_subheadline}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-ink-900">{plan.homepage_copy.primary_cta}</span>
                                <span className="rounded-md border border-cyan-500/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-cyan-300">{plan.homepage_copy.secondary_cta}</span>
                            </div>
                            {plan.homepage_copy.value_props?.length > 0 && (
                                <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
                                    {plan.homepage_copy.value_props.map((v, i) => (
                                        <li key={i} className="flex gap-2"><CheckCircle2 size={12} className="mt-1 flex-shrink-0 text-cyan-300" />{v}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                />
                <Section
                    icon={Layers} label="Service page ideas" testid="section-services"
                    body={Array.isArray(plan.service_page_ideas) && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {plan.service_page_ideas.map((s, i) => (
                                <div key={i} className="rounded-md border border-white/5 bg-ink-900 p-4">
                                    <p className="text-sm text-white">{s.name}</p>
                                    <p className="mt-1.5 text-xs text-slate-400">{s.summary}</p>
                                    {s.outcomes?.length > 0 && (
                                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                            {s.outcomes.map((o, j) => <li key={j} className="flex gap-2"><span className="text-cyan-300">·</span>{o}</li>)}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                />
                <Section
                    icon={DollarSign} label="Pricing structure" testid="section-pricing"
                    body={plan.pricing_structure && (
                        <>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                Model: <span className="text-cyan-300">{plan.pricing_structure.model}</span>
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {(plan.pricing_structure.tiers || []).map((t, i) => (
                                    <div key={i} className="rounded-md border border-cyan-500/30 bg-ink-900 p-4">
                                        <p className="font-heading text-lg text-white">{t.name}</p>
                                        <p className="mt-1 text-2xl font-semibold text-cyan-300">{t.price_label}</p>
                                        <p className="mt-2 text-xs text-slate-400">For {t.fits}</p>
                                        {t.includes?.length > 0 && (
                                            <ul className="mt-3 space-y-1 text-xs text-slate-300">
                                                {t.includes.map((inc, j) => <li key={j} className="flex gap-2"><CheckCircle2 size={11} className="mt-0.5 flex-shrink-0 text-cyan-300" />{inc}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {plan.pricing_structure.rationale && (
                                <p className="mt-3 text-xs text-slate-400 italic">{plan.pricing_structure.rationale}</p>
                            )}
                        </>
                    )}
                />
                <Section
                    icon={Send} label="Outreach strategy" testid="section-outreach"
                    body={plan.outreach_strategy && (
                        <div className="space-y-3">
                            {plan.outreach_strategy.channels?.length > 0 && (
                                <p className="text-sm text-slate-300"><span className="text-cyan-300 font-mono text-[10px] uppercase tracking-[0.22em]">Channels:</span> {plan.outreach_strategy.channels.join(" · ")}</p>
                            )}
                            {plan.outreach_strategy.ideal_first_50 && (
                                <p className="text-sm text-white">{plan.outreach_strategy.ideal_first_50}</p>
                            )}
                            {plan.outreach_strategy.weekly_motion?.length > 0 && (
                                <ul className="space-y-1 text-xs text-slate-300">
                                    {plan.outreach_strategy.weekly_motion.map((m, i) => <li key={i} className="flex gap-2"><Zap size={11} className="mt-0.5 flex-shrink-0 text-cyan-300" />{m}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                />
                <Section
                    icon={Target} label="Lead generation" testid="section-leadgen"
                    body={plan.lead_generation && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {[
                                ["Magnets",                plan.lead_generation.magnets],
                                ["Qualification signals",  plan.lead_generation.qualification_signals],
                                ["Recommended tools",      plan.lead_generation.tools],
                            ].map(([title, list]) => (
                                <div key={title} className="rounded-md border border-white/5 bg-ink-900 p-4">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{title}</p>
                                    <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                        {(list || []).map((m, i) => <li key={i} className="flex gap-2"><span className="text-cyan-300">·</span>{m}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                />
                <Section
                    icon={Workflow} label="CRM workflow" testid="section-crm"
                    body={plan.crm_workflow && (
                        <>
                            {plan.crm_workflow.stages?.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {plan.crm_workflow.stages.map((s, i) => (
                                        <React.Fragment key={i}>
                                            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{s}</span>
                                            {i < plan.crm_workflow.stages.length - 1 && <ChevronRight size={11} className="text-slate-500" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                            {plan.crm_workflow.automations?.length > 0 && (
                                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                                    {plan.crm_workflow.automations.map((a, i) => <li key={i} className="flex gap-2"><Zap size={11} className="mt-0.5 flex-shrink-0 text-cyan-300" />{a}</li>)}
                                </ul>
                            )}
                            {plan.crm_workflow.stack_recommendation && (
                                <p className="mt-3 text-sm text-slate-300">{plan.crm_workflow.stack_recommendation}</p>
                            )}
                        </>
                    )}
                />
            </div>

            {/* Phase 2 placeholder */}
            <div className="mt-10 rounded-md border border-white/10 bg-ink-700/40 p-5" data-testid="result-phase2-placeholder">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Phase 2 · coming soon</p>
                <p className="mt-2 text-sm text-slate-300">
                    Website auto-generation, prompt export, deployment integrations, and CRM setup automations are architected on this foundation. We'll surface them here as they ship.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {FUTURE_PHASES.map((p) => (
                        <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            <p.Icon size={10} className="text-slate-500" />{p.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Section = ({ icon: Icon, label, body, testid }) => {
    if (!body) return null;
    return (
        <section className="rounded-md border border-white/10 bg-ink-700/40 p-5" data-testid={testid}>
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-3">
                <Icon size={13} className="text-cyan-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{label}</span>
            </div>
            <div className="mt-4">{body}</div>
        </section>
    );
};
