import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Lightbulb, Zap, Wrench, ShieldCheck, Building2, MapPin, Cpu, Layers,
    DollarSign, TrendingDown, TrendingUp, Activity, ArrowRight, Check, X,
    Hammer, AlertTriangle, BadgeCheck, FileCheck2, Calculator, Sparkles,
    Globe2, Send, Factory,
} from "lucide-react";
import {
    listLightingSkus, createLightingProposal, getLightingProposal,
    approveLightingProposal, getLightingPortfolio,
    listLightingWarrantyEvents, notifyLightingContractor, getLightingStats,
} from "@/lib/api";

const fmtUSD = (n) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtUSD2 = (n) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtKWh = (n) => n == null ? "—" : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`;

// =================================================================
// HERO
// =================================================================
const Hero = ({ stats }) => (
    <section className="relative overflow-hidden border-b border-white/5" data-testid="lighting-hero">
        <div className="absolute inset-0">
            <img src="/generated/scene-realtor-corporate-office.jpg" alt="" className="h-full w-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-ink-900/40" />
            <div className="absolute inset-0 ambient-grid opacity-40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                <Lightbulb size={12} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    CreatorBoostAI · Lighting Upgrade Engine · Powered by Koollite
                </span>
            </div>
            <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                Identify the savings. Structure the deal.{" "}
                <span className="text-cyan-400">Track every Action ID to financial outcome.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                CreatorBoostAI is the financial and operational intelligence layer.
                Koollite is the manufacturer and supplier. Your existing contractors handle every
                installation and service call. Three roles. Zero overlap. Every project tracked
                from identification to execution to measurable savings.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href="#calculator" data-testid="cta-run-proposal"
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400">
                    <Calculator size={14} /> Run a Real Proposal
                </a>
                <a href="#three-layer" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-6 py-3.5 text-sm font-medium text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-300">
                    <Layers size={14} /> See the Architecture
                </a>
                <a href="#portfolio" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-6 py-3.5 text-sm font-medium text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-300">
                    <Globe2 size={14} /> Multi-location Rollup
                </a>
            </div>
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-3xl">
                {[
                    { label: "Approved projects", value: stats?.approved_projects ?? 154, Icon: BadgeCheck },
                    { label: "Total Action IDs",  value: (stats?.total_projects ?? 184) + " projects", Icon: Cpu },
                    { label: "Annual portfolio savings", value: "$7.7M", Icon: DollarSign },
                    { label: "Net positive cash flow", value: "+$2.9M", Icon: TrendingUp },
                ].map((s) => (
                    <div key={s.label} className="rounded-md border border-white/10 bg-ink-700/40 p-3" data-testid={`hero-stat-${s.label.replace(/\s+/g, "-").toLowerCase()}`}>
                        <div className="flex items-center gap-2"><s.Icon size={11} className="text-cyan-400" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{s.label}</span></div>
                        <p className="font-heading mt-1 text-lg font-semibold text-white">{s.value}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// =================================================================
// THREE-LAYER ARCHITECTURE
// =================================================================
const ThreeLayer = () => (
    <section id="three-layer" className="border-b border-white/5 bg-ink-900 py-14 lg:py-20" data-testid="three-layer-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">System Architecture</p>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                Three layers. One project. <span className="text-cyan-300">No overlap.</span>
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Most lighting upgrade pitches confuse who is on the hook for what. CreatorBoostAI separates
                intelligence, supply, and execution so every party stays inside its lane — and every
                liability stays where it belongs.
            </p>
            <div className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Layer 1 — Intelligence */}
                <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-6" data-testid="layer-intelligence">
                    <div className="flex items-center gap-2"><Cpu size={14} className="text-cyan-300" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Layer 1 · Intelligence</span></div>
                    <h3 className="font-heading mt-3 text-xl font-semibold text-white">CreatorBoostAI</h3>
                    <p className="mt-2 text-sm text-slate-300">Financial + operational engine that identifies savings, structures deals, and tracks Action IDs through their full lifecycle.</p>
                    <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                        {["Analyzes store-level data", "Generates upgrade proposals", "Calculates net cash flow", "Tracks Action ID lifecycle", "Monitors warranty events", "Notifies customer's contractor"].map((b) => (
                            <li key={b} className="flex items-center gap-2"><Check size={12} className="text-cyan-400" /> {b}</li>
                        ))}
                    </ul>
                    <div className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                        Owns: Intelligence. Not installation.
                    </div>
                </div>

                {/* Layer 2 — Product Supply */}
                <div className="rounded-md border border-white/10 bg-ink-700/40 p-6" data-testid="layer-supply">
                    <div className="flex items-center gap-2"><Factory size={14} className="text-amber-300" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Layer 2 · Product Supply</span></div>
                    <h3 className="font-heading mt-3 text-xl font-semibold text-white">Koollite</h3>
                    <p className="mt-2 text-sm text-slate-300">Manufacturer and supplier of LED fixtures only. Provides product specifications, performance data, and 5–7 year warranty coverage. Does not perform installation or field service.</p>
                    <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                        {["Manufactures LED fixtures", "Ships SKUs to project sites", "Provides spec sheets + lumens", "Honors 5–7 yr warranty", "Replacement under warranty", "No labor or install liability"].map((b) => (
                            <li key={b} className="flex items-center gap-2"><Check size={12} className="text-amber-400" /> {b}</li>
                        ))}
                    </ul>
                    <div className="mt-4 rounded-sm border border-amber-500/30 bg-amber-500/5 p-2 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">
                        Owns: Product. Not field service.
                    </div>
                </div>

                {/* Layer 3 — Execution */}
                <div className="rounded-md border border-white/10 bg-ink-700/40 p-6" data-testid="layer-execution">
                    <div className="flex items-center gap-2"><Hammer size={14} className="text-rose-300" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">Layer 3 · Execution</span></div>
                    <h3 className="font-heading mt-3 text-xl font-semibold text-white">Customer's Contractors</h3>
                    <p className="mt-2 text-sm text-slate-300">Your existing service providers handle every installation, every service call, and every replacement. CreatorBoostAI overlays — it does not replace.</p>
                    <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                        {["Customer keeps existing contractors", "All installs by customer's team", "All service calls routed to them", "Receive warranty notifications", "Continue under existing MSA", "No new vendor relationships forced"].map((b) => (
                            <li key={b} className="flex items-center gap-2"><Check size={12} className="text-rose-400" /> {b}</li>
                        ))}
                    </ul>
                    <div className="mt-4 rounded-sm border border-rose-500/30 bg-rose-500/5 p-2 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">
                        Owns: Field execution. Always.
                    </div>
                </div>
            </div>

            {/* Neutrality strip */}
            <div className="mt-8 rounded-md border border-amber-500/30 bg-amber-500/5 p-4" data-testid="neutrality-strip">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Contractor Neutrality Layer</p>
                <p className="mt-2 text-sm text-amber-100">
                    <Hammer size={12} className="inline mr-1.5 text-amber-300" />
                    The customer continues using their existing service providers. CreatorBoostAI does not
                    install, dispatch, or invoice for labor. Koollite ships product. Your team installs it.
                    No labor liability ever sits inside CreatorBoostAI.
                </p>
            </div>
        </div>
    </section>
);

// =================================================================
// KOOLLITE CATALOG
// =================================================================
const KoolliteCatalog = ({ skus }) => (
    <section id="catalog" className="border-b border-white/5 bg-ink-800/30 py-14 lg:py-20" data-testid="koollite-catalog-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Koollite Catalog · Manufacturer + Supplier</p>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                Four fixture lines. <span className="text-cyan-300">Specs, performance data, warranty terms.</span>
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {skus.map((s) => (
                    <div key={s.sku} className="rounded-md border border-white/10 bg-ink-700/40 p-5" data-testid={`sku-card-${s.sku}`}>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{s.sku}</span>
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-300">{s.warranty_years}-yr warranty</span>
                        </div>
                        <h3 className="font-heading mt-3 text-lg font-semibold text-white">{s.name}</h3>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{s.category}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Spec label="Lumens" value={s.lumens.toLocaleString()} />
                            <Spec label="Watts" value={`${s.watts} W`} />
                            <Spec label="Lifetime" value={`${(s.lifetime_hours / 1000).toFixed(0)}K hrs`} />
                            <Spec label="Unit cost" value={fmtUSD(s.unit_cost)} />
                        </div>
                        <p className="mt-3 text-xs text-slate-300">{s.best_for}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const Spec = ({ label, value }) => (
    <div className="rounded-sm border border-white/5 bg-ink-900 px-2 py-1.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-0.5 font-mono text-[11px] text-cyan-300">{value}</p>
    </div>
);

// =================================================================
// CALCULATOR (gated by email)
// =================================================================
const PROPOSAL_DEFAULTS = {
    email: "", company: "", contact_name: "", location_label: "Store 1142",
    sqft: 48000, fixture_count: 420, operating_hours_per_day: 18,
    operating_days_per_year: 363, energy_cost_per_kwh: 0.16,
    annual_maintenance_cost: 24000, sku: "KL-LP-60",
    deal_structure: "subscription", term_months: 60,
    current_avg_watts: 120, customer_contractor_name: "",
};

const Calculator2 = ({ skus }) => {
    const [form, setForm] = useState(PROPOSAL_DEFAULTS);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [emailUnlocked, setEmailUnlocked] = useState(false);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value === "" ? "" : Number(e.target.value) }));

    const submit = async () => {
        if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
            toast.error("Enter your work email to unlock the proposal");
            return;
        }
        setEmailUnlocked(true);
        setBusy(true);
        try {
            const payload = {
                ...form,
                sqft: Number(form.sqft),
                fixture_count: Number(form.fixture_count),
                operating_hours_per_day: Number(form.operating_hours_per_day),
                operating_days_per_year: Number(form.operating_days_per_year),
                energy_cost_per_kwh: Number(form.energy_cost_per_kwh),
                annual_maintenance_cost: Number(form.annual_maintenance_cost),
                term_months: Number(form.term_months),
                current_avg_watts: Number(form.current_avg_watts),
            };
            const data = await createLightingProposal(payload);
            setResult(data);
            toast.success(`Proposal generated · Action ID ${data.action_id}`);
            // scroll to result
            setTimeout(() => {
                document.getElementById("proposal-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 200);
        } catch (e) {
            const msg = e?.response?.data?.detail || "Could not generate proposal";
            toast.error(typeof msg === "string" ? msg : "Validation error");
        } finally { setBusy(false); }
    };

    return (
        <section id="calculator" className="border-b border-white/5 bg-ink-900 py-14 lg:py-20" data-testid="calculator-section">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Run a Real Proposal · Email-Gated</p>
                <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                    Drop in your store data. <span className="text-cyan-300">We'll generate the upgrade deal.</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                    Real math. Real Koollite SKU. Real Action ID. The proposal is saved to your account and
                    can be approved, modified, or shared with your CFO.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Form */}
                    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 lg:col-span-7" data-testid="calculator-form">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Input label="Work email *" testid="calc-email" type="email" value={form.email} onChange={set("email")} placeholder="cfo@yourcompany.com" />
                            <Input label="Company" testid="calc-company" value={form.company} onChange={set("company")} placeholder="Acme Retail" />
                            <Input label="Contact name" testid="calc-contact-name" value={form.contact_name} onChange={set("contact_name")} placeholder="Jane Doe" />
                            <Input label="Location label" testid="calc-location" value={form.location_label} onChange={set("location_label")} placeholder="Store 1142 · Bronx" />

                            <Input label="Square footage" testid="calc-sqft" type="number" value={form.sqft} onChange={setNum("sqft")} />
                            <Input label="Fixture count" testid="calc-fixtures" type="number" value={form.fixture_count} onChange={setNum("fixture_count")} />
                            <Input label="Operating hours / day" testid="calc-hours-day" type="number" step="0.5" value={form.operating_hours_per_day} onChange={setNum("operating_hours_per_day")} />
                            <Input label="Operating days / year" testid="calc-days-yr" type="number" value={form.operating_days_per_year} onChange={setNum("operating_days_per_year")} />
                            <Input label="Energy cost ($/kWh)" testid="calc-kwh" type="number" step="0.01" value={form.energy_cost_per_kwh} onChange={setNum("energy_cost_per_kwh")} />
                            <Input label="Current avg fixture watts" testid="calc-cur-watts" type="number" value={form.current_avg_watts} onChange={setNum("current_avg_watts")} />
                            <Input label="Annual maintenance cost ($)" testid="calc-maint" type="number" value={form.annual_maintenance_cost} onChange={setNum("annual_maintenance_cost")} />
                            <Input label="Customer's contractor" testid="calc-contractor" value={form.customer_contractor_name} onChange={set("customer_contractor_name")} placeholder="Existing electrical service co." />

                            <Select label="Koollite SKU" testid="calc-sku" value={form.sku} onChange={set("sku")}>
                                {skus.map((s) => <option key={s.sku} value={s.sku}>{s.sku} · {s.name}</option>)}
                            </Select>
                            <Select label="Deal structure" testid="calc-deal" value={form.deal_structure} onChange={set("deal_structure")}>
                                <option value="purchase">Direct Purchase (capex)</option>
                                <option value="subscription">Subscription Financing (opex)</option>
                            </Select>

                            {form.deal_structure === "subscription" && (
                                <Select label="Term (months)" testid="calc-term" value={form.term_months} onChange={set("term_months")}>
                                    {[24, 36, 48, 60, 72, 84].map((t) => <option key={t} value={t}>{t} months</option>)}
                                </Select>
                            )}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button onClick={submit} disabled={busy} data-testid="calc-submit"
                                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60">
                                <Sparkles size={13} /> {busy ? "Generating…" : "Generate Proposal"}
                            </button>
                            {!emailUnlocked && (
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                    Your email is your project key — your Action ID is private to your account.
                                </span>
                            )}
                        </div>
                    </div>

                    {/* What you'll get */}
                    <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5 lg:col-span-5" data-testid="calculator-preview">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">What you'll get</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-200">
                            {[
                                "Total project cost · fixtures + estimated install",
                                "Annual energy + maintenance savings",
                                "Payback period and ROI",
                                "Net positive cash flow (subscription path)",
                                "Unique Action ID for lifecycle tracking",
                                "Warranty terms (5–7 yr on Koollite SKUs)",
                                "Contractor neutrality disclosure attached",
                            ].map((b) => (
                                <li key={b} className="flex items-start gap-2"><Check size={13} className="mt-0.5 flex-shrink-0 text-cyan-400" />{b}</li>
                            ))}
                        </ul>
                        <div className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100">
                            <Hammer size={11} className="inline mr-1 text-amber-300" />
                            Install handled by your contractor. CreatorBoostAI does not install, dispatch, or invoice for labor.
                        </div>
                    </div>
                </div>

                {result && <ProposalResult result={result} />}
            </div>
        </section>
    );
};

const Input = ({ label, testid, ...props }) => (
    <label className="block">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        <input {...props} data-testid={testid}
            className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
    </label>
);

const Select = ({ label, testid, children, ...props }) => (
    <label className="block">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        <select {...props} data-testid={testid}
            className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
            {children}
        </select>
    </label>
);

// =================================================================
// PROPOSAL RESULT
// =================================================================
const ProposalResult = ({ result }) => {
    const [approved, setApproved] = useState(result.status === "approved");
    const [busy, setBusy] = useState(false);

    const approve = async () => {
        setBusy(true);
        try {
            await approveLightingProposal(result.action_id);
            setApproved(true);
            toast.success("Project approved · routed to deployment queue");
        } catch { toast.error("Could not approve"); }
        finally { setBusy(false); }
    };

    const beforeAfter = [
        { label: "Annual energy (kWh)",  before: result.annual_kwh_before,  after: result.annual_kwh_after, format: fmtKWh, savings: result.annual_kwh_saved },
        { label: "Annual energy cost",   before: result.annual_kwh_before * result.inputs.energy_cost_per_kwh, after: result.annual_kwh_after * result.inputs.energy_cost_per_kwh, format: fmtUSD2, savings: result.annual_energy_savings },
        { label: "Annual maintenance",   before: result.inputs.annual_maintenance_cost, after: result.inputs.annual_maintenance_cost - result.annual_maintenance_savings, format: fmtUSD2, savings: result.annual_maintenance_savings },
    ];

    return (
        <div id="proposal-result" className="mt-10 rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-6" data-testid="proposal-result">
            {/* Action ID header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Action ID · lifecycle tracker</p>
                    <p className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">{result.action_id}</p>
                    <p className="mt-1 text-xs text-slate-400">{result.inputs.location_label} · {result.inputs.company || result.inputs.email} · created {new Date(result.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={approved ? "approved" : result.status} />
                    {!approved && (
                        <button onClick={approve} disabled={busy} data-testid="approve-proposal-btn"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60">
                            <Check size={12} /> {busy ? "Approving…" : "Approve & route to deployment"}
                        </button>
                    )}
                </div>
            </div>

            {/* Headline numbers */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="proposal-headline-tiles">
                <Tile Icon={DollarSign} label="Total project cost" value={fmtUSD(result.total_project_cost)} sub={`Fixtures ${fmtUSD(result.fixture_subtotal)} + Install ${fmtUSD(result.contractor_install_estimate)}`} tone="white" />
                <Tile Icon={TrendingDown} label="Annual energy savings" value={fmtUSD(result.annual_energy_savings)} sub={`${fmtKWh(result.annual_kwh_saved)} eliminated`} tone="cyan" />
                <Tile Icon={Wrench} label="Annual maintenance savings" value={fmtUSD(result.annual_maintenance_savings)} sub="85% reduction modeled" tone="cyan" />
                <Tile Icon={Activity} label="Payback period" value={`${result.payback_period_years} yrs`} sub={`Total annual savings ${fmtUSD(result.annual_total_savings)}`} tone="amber" />
            </div>

            {/* Deal structure */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="deal-structure-block">
                <div className={`rounded-md border p-4 ${result.deal_structure === "purchase" ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-ink-700/40"}`}>
                    <div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Deal · Direct Purchase (capex)</span>{result.deal_structure === "purchase" && <BadgeCheck size={14} className="text-cyan-300" />}</div>
                    <p className="font-heading mt-3 text-2xl font-semibold text-white">{fmtUSD(result.total_project_cost)}</p>
                    <p className="text-xs text-slate-300">One-time. Customer keeps all annual savings.</p>
                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Net annual cash flow</p>
                    <p className="font-heading text-xl font-semibold text-cyan-300">{fmtUSD(result.annual_total_savings)} <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">/ yr</span></p>
                </div>
                <div className={`rounded-md border p-4 ${result.deal_structure === "subscription" ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-ink-700/40"}`}>
                    <div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Deal · Subscription Financing (opex)</span>{result.deal_structure === "subscription" && <BadgeCheck size={14} className="text-cyan-300" />}</div>
                    {result.deal_structure === "subscription" ? (
                        <>
                            <p className="font-heading mt-3 text-2xl font-semibold text-white">{fmtUSD2(result.monthly_payment)}<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400"> / mo</span></p>
                            <p className="text-xs text-slate-300">{result.inputs.term_months} mo term · {fmtUSD(result.annual_payment)} / yr</p>
                            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Net annual cash flow</p>
                            <p className={`font-heading text-xl font-semibold ${result.net_annual_cash_flow >= 0 ? "text-cyan-300" : "text-rose-300"}`}>
                                {result.net_annual_cash_flow >= 0 ? "+" : ""}{fmtUSD(result.net_annual_cash_flow)} <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">/ yr (after payment)</span>
                            </p>
                        </>
                    ) : (
                        <p className="mt-3 text-sm text-slate-400">Switch deal structure on the form to compare subscription terms.</p>
                    )}
                </div>
            </div>

            {/* Before / After dashboard */}
            <div className="mt-6 rounded-md border border-white/10 bg-ink-900 p-5" data-testid="before-after-dashboard">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Before · After · Savings</p>
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Metric</th>
                                <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Before</th>
                                <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">After</th>
                                <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Savings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {beforeAfter.map((r) => (
                                <tr key={r.label} className="border-b border-white/5">
                                    <td className="px-3 py-2 text-slate-200">{r.label}</td>
                                    <td className="px-3 py-2 font-mono text-rose-300">{r.format(r.before)}</td>
                                    <td className="px-3 py-2 font-mono text-slate-300">{r.format(r.after)}</td>
                                    <td className="px-3 py-2 font-mono text-cyan-300">{r.format(r.savings)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Contractor neutrality + warranty */}
            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4" data-testid="result-neutrality">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Contractor Neutrality · attached to this Action ID</p>
                    <p className="mt-2 text-sm text-amber-100">
                        <Hammer size={12} className="inline mr-1 text-amber-300" />
                        Installation will be performed by <span className="font-semibold">{result.inputs.customer_contractor_name || "the customer's existing service provider"}</span>.
                        CreatorBoostAI does not install, dispatch, or invoice for labor. Koollite supplies the fixtures only.
                    </p>
                </div>
                <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="result-warranty">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Warranty · Koollite {result.sku.sku}</p>
                    <p className="mt-2 text-sm text-cyan-100">
                        <ShieldCheck size={12} className="inline mr-1 text-cyan-300" />
                        {result.sku.warranty_years}-year third-party warranty on parts. Failure events trigger a notification to your contractor — replacements honored under warranty.
                    </p>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400" data-testid="result-action-id-line">
                <Cpu size={11} className="text-cyan-400" />
                <span>Action ID:</span> <span className="text-cyan-300">{result.action_id}</span>
                <span>·</span>
                <span>Status:</span> <span className="text-cyan-300">{approved ? "approved" : result.status}</span>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const tone = status === "approved" ? "cyan" : status === "deployed" ? "cyan" : "amber";
    const cls = tone === "cyan" ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-amber-500/40 bg-amber-500/10 text-amber-300";
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] ${cls}`} data-testid="status-badge">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" /> {status}
        </span>
    );
};

const Tile = ({ Icon, label, value, sub, tone }) => {
    const ring = tone === "cyan" ? "border-cyan-500/30 bg-cyan-500/5" : tone === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-ink-700/40";
    return (
        <div className={`rounded-sm border p-3 ${ring}`}>
            <div className="flex items-center gap-2"><Icon size={11} className="text-cyan-400" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</span></div>
            <p className="font-heading mt-1 text-lg font-semibold text-white">{value}</p>
            {sub && <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{sub}</p>}
        </div>
    );
};

// =================================================================
// MULTI-LOCATION PORTFOLIO
// =================================================================
const Portfolio = ({ data }) => {
    if (!data) return null;
    const { national, regions, recent_projects = [] } = data;
    return (
        <section id="portfolio" className="border-b border-white/5 bg-ink-800/30 py-14 lg:py-20" data-testid="portfolio-section">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Multi-Location Rollout · {national.tenant}</p>
                <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                    {national.stores.toLocaleString()} stores. <span className="text-cyan-300">One command center.</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                    Each region rolls up to a national view. Every Action ID tracks from identification to
                    execution to financial outcome — and stays auditable across the lifecycle.
                </p>

                {/* National headline */}
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="portfolio-national-tiles">
                    <Tile Icon={Building2} label="Stores" value={national.stores.toLocaleString()} sub="Across 6 regions" tone="white" />
                    <Tile Icon={Lightbulb} label="Fixtures" value={national.fixtures.toLocaleString()} sub="Upgraded or queued" tone="white" />
                    <Tile Icon={DollarSign} label="Annual savings" value={fmtUSD(national.annual_savings)} sub="Energy + maintenance" tone="cyan" />
                    <Tile Icon={TrendingUp} label="Net cash flow" value={fmtUSD(national.net_annual_cash_flow)} sub="After modeled payments" tone="cyan" />
                </div>

                {/* Regional breakdown */}
                <div className="mt-6 overflow-x-auto rounded-md border border-white/10 bg-ink-700/40" data-testid="portfolio-regions">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-ink-900">
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Region</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Stores</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Fixtures</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Annual savings</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Approved</th>
                            </tr>
                        </thead>
                        <tbody>
                            {regions.map((r) => (
                                <tr key={r.region} className="border-b border-white/5">
                                    <td className="px-3 py-2 text-white"><MapPin size={11} className="mr-1 inline text-cyan-400" />{r.region}</td>
                                    <td className="px-3 py-2 font-mono text-slate-300">{r.stores}</td>
                                    <td className="px-3 py-2 font-mono text-slate-300">{r.fixtures.toLocaleString()}</td>
                                    <td className="px-3 py-2 font-mono text-cyan-300">{fmtUSD(r.annual_savings)}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-900"><div className="h-full bg-cyan-400" style={{ width: `${r.approved_pct}%` }} /></div>
                                            <span className="font-mono text-[10px] text-cyan-300">{r.approved_pct}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Recent real Action IDs */}
                {recent_projects.length > 0 && (
                    <div className="mt-6" data-testid="portfolio-recent-projects">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Recent Action IDs · saved this session</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {recent_projects.slice(0, 6).map((p) => (
                                <div key={p.action_id} className="rounded-sm border border-white/10 bg-ink-900 p-3">
                                    <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-cyan-300">{p.action_id}</span><StatusBadge status={p.status} /></div>
                                    <p className="mt-1 truncate text-sm text-white">{p.inputs?.location_label}</p>
                                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{fmtUSD(p.annual_total_savings)} / yr · {p.deal_structure}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

// =================================================================
// WARRANTY SYSTEM
// =================================================================
const WarrantySystem = () => {
    const sample = [
        { tier: "Active warranty",  count: "184",   pct: 88, tone: "cyan",  Icon: ShieldCheck, detail: "5–7 yr · Koollite" },
        { tier: "Service flagged",  count: "12",    pct: 6,  tone: "amber", Icon: AlertTriangle, detail: "Routed to customer's contractor" },
        { tier: "Expiring 90d",     count: "8",     pct: 4,  tone: "amber", Icon: Activity,    detail: "Renewal evaluation queued" },
        { tier: "Out of warranty",  count: "4",     pct: 2,  tone: "rose",  Icon: X,           detail: "Replacement queue · risk-ranked" },
    ];
    const events = [
        { id: "WE-7C24F1A2", action: "CBLU-K8X4-9F2T", store: "Store 1142", sku: "KL-LP-60", failure: "Driver failure · year 2 of 5", status: "Routed to existing contractor" },
        { id: "WE-7C24F1B7", action: "CBLU-T3M9-PV2D", store: "Store 0411", sku: "KL-RC-22", failure: "Premature burnout · year 1 of 5", status: "Replacement under warranty · scheduled" },
        { id: "WE-7C24F1C9", action: "CBLU-V8K2-DW3F", store: "Store 2073", sku: "KL-CN-200", failure: "Flicker · year 3 of 7", status: "Routed to existing contractor" },
        { id: "WE-7C24F1D4", action: "CBLU-Q4P9-Z7XJ", store: "Store 1556", sku: "KL-HB-150", failure: "Controller fault · year 2 of 7", status: "Replacement under warranty · scheduled" },
    ];
    const toneRing = { cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300", amber: "border-amber-500/30 bg-amber-500/5 text-amber-300", rose: "border-rose-500/30 bg-rose-500/5 text-rose-300" };
    return (
        <section id="warranty" className="border-b border-white/5 bg-ink-900 py-14 lg:py-20" data-testid="warranty-section">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Warranty + Service Routing</p>
                <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                    Failures fire a notification. <span className="text-cyan-300">Your contractor handles the field.</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                    CreatorBoostAI tracks every fixture against its Koollite warranty term. When a failure event
                    is detected, the system files a warranty claim, generates a service ticket, and routes the
                    physical work to your existing service provider. We track. Koollite covers. Your contractor executes.
                </p>

                {/* Coverage tiles */}
                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="warranty-coverage-tiles">
                    {sample.map((s) => (
                        <div key={s.tier} className={`rounded-sm border p-3 ${toneRing[s.tone]}`}>
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><s.Icon size={13} /><span className="font-mono text-[10px] uppercase tracking-[0.22em]">{s.tier}</span></div><span className="font-mono text-[10px] uppercase tracking-[0.22em]">{s.pct}%</span></div>
                            <p className="font-heading mt-2 text-2xl font-semibold text-white">{s.count}</p>
                            <p className="mt-0.5 text-xs text-slate-300">{s.detail}</p>
                        </div>
                    ))}
                </div>

                {/* Events */}
                <div className="mt-6 overflow-x-auto rounded-md border border-white/10 bg-ink-700/40" data-testid="warranty-events-table">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-ink-900">
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Event</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Action ID</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Store · SKU</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Failure</th>
                                <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Routing</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((e) => (
                                <tr key={e.id} className="border-b border-white/5">
                                    <td className="px-3 py-2 font-mono text-[10px] text-cyan-300">{e.id}</td>
                                    <td className="px-3 py-2 font-mono text-[10px] text-cyan-300">{e.action}</td>
                                    <td className="px-3 py-2 text-slate-200">{e.store} · <span className="font-mono text-[10px] text-slate-300">{e.sku}</span></td>
                                    <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">{e.failure}</td>
                                    <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">→ {e.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-3 text-base font-semibold text-cyan-100 sm:text-lg" data-testid="warranty-tagline">
                    <FileCheck2 size={14} className="inline mr-2 text-cyan-300" />
                    No labor liability inside CreatorBoostAI. No installation under our roof. Just intelligence and enforcement at scale.
                </p>
            </div>
        </section>
    );
};

// =================================================================
// PAGE
// =================================================================
export default function LightingUpgradeEnginePage() {
    const [skus, setSkus] = useState([]);
    const [stats, setStats] = useState(null);
    const [portfolio, setPortfolio] = useState(null);

    useEffect(() => {
        listLightingSkus().then((d) => setSkus(d.skus || [])).catch(() => setSkus([]));
        getLightingStats().then(setStats).catch(() => {});
        getLightingPortfolio().then(setPortfolio).catch(() => {});
    }, []);

    const skuMemo = useMemo(() => skus, [skus]);

    return (
        <Layout>
            <div className="bg-ink-900" data-testid="lighting-upgrade-engine-page">
                <Hero stats={stats} />
                <ThreeLayer />
                {skuMemo.length > 0 && <KoolliteCatalog skus={skuMemo} />}
                <Calculator2 skus={skuMemo} />
                <Portfolio data={portfolio} />
                <WarrantySystem />

                {/* Closer */}
                <section className="bg-ink-900 py-14 lg:py-20">
                    <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">CreatorBoostAI · Lighting Upgrade Engine</p>
                        <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                            Identify the savings. Structure the deal.{" "}
                            <span className="text-cyan-300">Track every Action ID to financial outcome.</span>
                        </h2>
                        <p className="mt-4 text-sm text-slate-300 sm:text-base">
                            CreatorBoostAI is the intelligence. Koollite is the supplier. Your contractors install.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                            <a href="#calculator" className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400">
                                <Calculator size={14} /> Run a Real Proposal <ArrowRight size={14} />
                            </a>
                            <a href="/contact" className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900">
                                <Send size={14} /> Talk to Strategy
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
