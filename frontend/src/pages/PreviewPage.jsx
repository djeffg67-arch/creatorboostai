import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Sparkles, ArrowRight, Lock, DollarSign, Users, Target, TrendingUp,
    Layers, Globe2, Brain, Zap, Building2, BarChart3, Activity,
    Mic, Eye, Megaphone, Rocket, Briefcase, MapPin, Network,
} from "lucide-react";

/**
 * /preview · CreatorBoostAI Preview Mode (READ-ONLY)
 *
 * Sample-data dashboard that mirrors the live execution layer. Every action
 * button is intentionally locked behind "Available after activation" — the
 * goal is to give prospects + creators a tactile feel without exposing real
 * data or letting them trigger real workflows.
 *
 * Sections: Command Center · National/Regional Map · AI Opportunity Panel ·
 * Influencer/Creator View · Locked Actions.
 */
export default function PreviewPage() {
    return (
        <Layout>
            <div className="relative mx-auto max-w-[1320px] px-4 py-10 lg:px-8 lg:py-16" data-testid="preview-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, left: -140 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 380, height: 380, bottom: -180, right: -100 }} />
                </div>

                {/* Header */}
                <header className="border-b border-white/5 pb-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Command Center · Preview Mode</span>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="font-heading text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                                Your business. <span className="text-cyan-400">Executed.</span>
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                                CreatorBoostAI sits on top of your existing systems and executes across them.
                                This preview shows sample data. Real data, real actions activate after onboarding.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300 inline-flex items-center gap-1.5">
                                <Lock size={11} /> Read-only · Sample data
                            </span>
                            <Link
                                to="/apply/strategy"
                                data-testid="preview-cta-activate"
                                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_18px_rgba(6,182,212,0.35)] hover:bg-cyan-400"
                            >
                                Activate the live system <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* A. Command Center — sample stats */}
                <Section icon={BarChart3} label="Command Center · Live Pulse">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="preview-command-center">
                        <Stat label="Revenue generated" value="$1.84M" delta="+12.4% MoM" Icon={DollarSign} accent="emerald" />
                        <Stat label="Active leads" value="2,317" delta="194 new today" Icon={Users} accent="cyan" />
                        <Stat label="Opportunities detected" value="48" delta="$320K combined" Icon={Target} accent="amber" />
                        <Stat label="Pipeline forecast" value="$4.2M" delta="next 90 days" Icon={TrendingUp} accent="cyan" />
                    </div>
                    <div className="mt-6 rounded-md border border-white/10 bg-ink-800 p-5" data-testid="preview-integrations">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <Layers size={13} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Systems integrated</span>
                            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">3 active · sample stack</span>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <IntegrationTile name="Salesforce" domain="CRM · sales pipeline" status="syncing" />
                            <IntegrationTile name="HubSpot" domain="Marketing automation" status="syncing" />
                            <IntegrationTile name="QuickBooks" domain="Revenue · invoicing" status="syncing" />
                        </div>
                        <p className="mt-4 text-xs text-slate-400">
                            <span className="text-cyan-300">CreatorBoostAI sits on top of your existing systems</span> and executes across them.
                        </p>
                    </div>
                </Section>

                {/* B. National / Regional View — sample drill */}
                <Section icon={Globe2} label="National & Regional View">
                    <NationalMap />
                </Section>

                {/* C. AI Opportunity Panel */}
                <Section icon={Brain} label="AI Opportunity Panel">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="preview-ai-panel">
                        <Insight Icon={Target} title="12 high-value leads detected" sub="Closing probability ≥ 78% · combined ARV $186K" />
                        <Insight Icon={DollarSign} title="$320,000 revenue opportunity identified" sub="Cross-sell + renewal window opens in 14 days" accent="emerald" />
                        <Insight Icon={Activity} title="Follow-up gaps found in pipeline" sub="9 stalled deals · last touch > 7 days · auto-recovery available" accent="amber" />
                        <Insight Icon={TrendingUp} title="3 accounts trending toward churn" sub="Engagement down 38% MoM · save-play recommended" accent="amber" />
                        <Insight Icon={Zap} title="11 trigger events fired in last 24h" sub="Auto-tagged to opportunity type · awaiting approval" />
                        <Insight Icon={Sparkles} title="2 AI-drafted proposals ready" sub="Personalized · brand-matched · 1-click send" />
                    </div>
                </Section>

                {/* D. Influencer / Creator View */}
                <Section icon={Mic} label="Creator & Influencer View" badge="Sample data">
                    <div data-testid="preview-influencer">
                        <p className="max-w-2xl text-sm text-slate-300">
                            CreatorBoostAI identifies and executes monetization opportunities for creators and influencers automatically.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Stat label="Audience growth" value="+18.6%" delta="last 30 days" Icon={Users} accent="cyan" />
                            <Stat label="Brand-deal opportunities" value="7 active" delta="$84K total value" Icon={Briefcase} accent="emerald" />
                            <Stat label="Revenue projection" value="$42K / mo" delta="conservative · Q2" Icon={DollarSign} accent="cyan" />
                            <Stat label="Engagement quality" value="A-tier" delta="top 4% creators" Icon={Eye} accent="amber" />
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <SuggestedAction Icon={Megaphone} title="Launch campaign" body="Sample partner brief auto-drafted for current audience profile." />
                            <SuggestedAction Icon={Sparkles} title="Optimize content" body="3 underperforming pieces flagged · re-cut recommendations ready." />
                            <SuggestedAction Icon={Rocket} title="Monetize audience" body="Storefront + paid tier unlock projected $11K incremental MRR." />
                        </div>
                    </div>
                </Section>

                {/* E. Locked Actions */}
                <Section icon={Lock} label="Execution Actions" badge="Locked in preview">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="preview-locked-actions">
                        <LockedAction id="run-campaign" label="Run Campaign" sub="Multichannel auto-launch" />
                        <LockedAction id="execute-followup" label="Execute Follow-Up" sub="Personalized · queued · approved" />
                        <LockedAction id="optimize-revenue" label="Optimize Revenue" sub="Recommended price · package · timing" />
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                        All execution paths unlock the moment your stack is connected. <Link to="/apply/strategy" className="text-cyan-300 hover:text-cyan-200">Book activation →</Link>
                    </p>
                </Section>
            </div>
        </Layout>
    );
}

// ---------- Subcomponents ----------

const Section = ({ icon: Icon, label, badge, children }) => (
    <section className="mt-12">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Icon size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span>
            </div>
            {badge && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{badge}</span>}
        </div>
        <div className="mt-5">{children}</div>
    </section>
);

const ACCENT = {
    cyan: { txt: "text-cyan-300", border: "border-cyan-500/30", bg: "bg-cyan-500/5" },
    emerald: { txt: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
    amber: { txt: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/5" },
};

const Stat = ({ label, value, delta, Icon, accent = "cyan" }) => {
    const a = ACCENT[accent];
    return (
        <div className={`rounded-md border ${a.border} ${a.bg} p-4`}>
            <div className="flex items-center gap-2">
                <Icon size={13} className={a.txt} />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
            </div>
            <p className="font-heading mt-2 text-2xl font-semibold text-white sm:text-3xl">{value}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{delta}</p>
        </div>
    );
};

const IntegrationTile = ({ name, domain, status }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
        <div className="flex items-center justify-between">
            <span className="font-heading text-base font-semibold text-white">{name}</span>
            <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> {status}
            </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{domain}</p>
    </div>
);

const Insight = ({ Icon, title, sub, accent = "cyan" }) => {
    const a = ACCENT[accent];
    return (
        <div className={`rounded-md border ${a.border} ${a.bg} p-4`}>
            <div className="flex items-center gap-2">
                <Icon size={13} className={a.txt} />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Insight</span>
            </div>
            <p className="mt-2 font-heading text-base font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
        </div>
    );
};

const SuggestedAction = ({ Icon, title, body }) => (
    <div className="rounded-md border border-white/10 bg-ink-800 p-4">
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Suggested action</span>
        </div>
        <p className="mt-2 font-heading text-base font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{body}</p>
    </div>
);

const LockedAction = ({ id, label, sub }) => {
    const onClick = () => toast.message("Available after activation", { description: "Connect your stack to unlock execution.", duration: 3000 });
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={`preview-locked-${id}`}
            className="group flex items-start gap-3 rounded-md border border-white/10 bg-ink-800 p-4 text-left transition-all hover:border-cyan-500/40 hover:bg-ink-700/60"
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-ink-900 group-hover:border-cyan-500/40">
                <Lock size={14} className="text-slate-400 group-hover:text-cyan-400" />
            </div>
            <div>
                <p className="font-heading text-base font-semibold text-white">{label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">Available after activation</p>
            </div>
        </button>
    );
};

// ---------- National / Regional drill-down ----------
const REGIONS = [
    { id: "ca", name: "California", revenue: "$612K", leads: 842, cities: [
        { id: "sf", name: "San Francisco", offices: ["Downtown · 14 agents", "SoMa · 9 agents"] },
        { id: "la", name: "Los Angeles", offices: ["Beverly Hills · 22 agents", "Santa Monica · 11 agents"] },
    ]},
    { id: "ny", name: "New York", revenue: "$498K", leads: 671, cities: [
        { id: "nyc", name: "New York City", offices: ["Manhattan · 31 agents", "Brooklyn · 8 agents"] },
        { id: "buf", name: "Buffalo", offices: ["Downtown · 5 agents"] },
    ]},
    { id: "tx", name: "Texas", revenue: "$443K", leads: 590, cities: [
        { id: "aus", name: "Austin", offices: ["South Congress · 12 agents"] },
        { id: "dal", name: "Dallas", offices: ["Uptown · 18 agents"] },
    ]},
    { id: "fl", name: "Florida", revenue: "$291K", leads: 412, cities: [
        { id: "mia", name: "Miami", offices: ["Brickell · 17 agents"] },
        { id: "orl", name: "Orlando", offices: ["Lake Nona · 6 agents"] },
    ]},
];

const NationalMap = () => {
    const [region, setRegion] = useState(REGIONS[0].id);
    const [city, setCity] = useState(null);
    const r = REGIONS.find((x) => x.id === region);
    const c = r?.cities.find((x) => x.id === city);

    return (
        <div className="rounded-md border border-white/10 bg-ink-800 p-5" data-testid="preview-map">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Network size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Drill: Region → City → Office</span>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">interactive · sample data</span>
            </div>

            {/* Regions strip */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REGIONS.map((rg) => (
                    <button
                        key={rg.id}
                        onClick={() => { setRegion(rg.id); setCity(null); }}
                        data-testid={`preview-map-region-${rg.id}`}
                        className={`rounded-sm border p-3 text-left transition-all ${region === rg.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-ink-900 hover:border-white/20"}`}
                    >
                        <div className="flex items-center gap-2">
                            <MapPin size={11} className={region === rg.id ? "text-cyan-400" : "text-slate-400"} />
                            <span className="font-heading text-sm font-semibold text-white">{rg.name}</span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{rg.revenue} · {rg.leads} leads</p>
                    </button>
                ))}
            </div>

            {/* Cities */}
            {r && (
                <div className="mt-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{r.name} · cities</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {r.cities.map((cc) => (
                            <button
                                key={cc.id}
                                onClick={() => setCity(cc.id === city ? null : cc.id)}
                                data-testid={`preview-map-city-${cc.id}`}
                                className={`rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${city === cc.id ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200" : "border-white/10 text-slate-300 hover:border-white/20"}`}
                            >
                                {cc.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Offices */}
            {c && (
                <div className="mt-4 rounded-sm border border-white/10 bg-ink-900 p-4" data-testid="preview-map-offices">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{c.name} · offices</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                        {c.offices.map((o) => (
                            <li key={o} className="flex items-center gap-2">
                                <Building2 size={11} className="text-cyan-400" /> {o}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
