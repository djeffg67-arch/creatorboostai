import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import { shareDemo } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import {
    Sparkles, ArrowRight, Lock, DollarSign, Users, Target, TrendingUp,
    Layers, Globe2, Brain, Zap, Building2, BarChart3, Activity,
    Mic, Eye, Megaphone, Rocket, Briefcase, MapPin, Network, Send, Copy,
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
    const { t } = useTranslation();
    return (
        <Layout>
            <div className="relative mx-auto max-w-[1320px] px-4 py-10 lg:px-8 lg:py-16" data-testid="preview-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <img src={PAGE_HERO.preview} alt="" className="absolute inset-0 h-[55%] w-full object-cover opacity-15" loading="eager" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/85 to-ink-900" />
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, left: -140 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 380, height: 380, bottom: -180, right: -100 }} />
                </div>

                {/* Header */}
                <header className="border-b border-white/5 pb-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{t("preview.kicker")}</span>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="font-heading text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                                {t("preview.headline_1")} <span className="text-cyan-400">{t("preview.headline_2")}</span>
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">{t("preview.sub")}</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300 inline-flex items-center gap-1.5">
                                <Lock size={11} /> {t("common.read_only")}
                            </span>
                            <Link
                                to="/apply/strategy"
                                data-testid="preview-cta-activate"
                                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_18px_rgba(6,182,212,0.35)] hover:bg-cyan-400"
                            >
                                {t("preview.cta_activate")} <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* A. Command Center — sample stats */}
                <Section icon={BarChart3} label={t("preview.section.command_center")}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="preview-command-center">
                        <Stat label={t("preview.stats.revenue")} value="$1.84M" delta={t("preview.stats_delta.mom_up")} Icon={DollarSign} accent="emerald" />
                        <Stat label={t("preview.stats.active_leads")} value="2,317" delta={t("preview.stats_delta.new_today")} Icon={Users} accent="cyan" />
                        <Stat label={t("preview.stats.opportunities")} value="48" delta={t("preview.stats_delta.combined_value")} Icon={Target} accent="amber" />
                        <Stat label={t("preview.stats.forecast")} value="$4.2M" delta={t("preview.stats_delta.next_90")} Icon={TrendingUp} accent="cyan" />
                    </div>
                    <div className="mt-6 rounded-md border border-white/10 bg-ink-800 p-5" data-testid="preview-integrations">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <Layers size={13} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{t("preview.integrations.title")}</span>
                            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{t("preview.integrations.stack_label")}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <IntegrationTile name="Salesforce" domain={t("preview.integrations.salesforce_domain")} status={t("preview.integrations.syncing")} />
                            <IntegrationTile name="HubSpot" domain={t("preview.integrations.hubspot_domain")} status={t("preview.integrations.syncing")} />
                            <IntegrationTile name="QuickBooks" domain={t("preview.integrations.quickbooks_domain")} status={t("preview.integrations.syncing")} />
                        </div>
                        <p className="mt-4 text-xs text-slate-400">
                            <span className="text-cyan-300">{t("preview.integrations.footer")}</span>
                        </p>
                    </div>
                </Section>

                {/* B. National / Regional View — sample drill */}
                <Section icon={Globe2} label={t("preview.section.national_view")}>
                    <NationalMap />
                </Section>

                {/* C. AI Opportunity Panel */}
                <Section icon={Brain} label={t("preview.section.ai_panel")}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="preview-ai-panel">
                        <Insight Icon={Target} title={t("preview.insights.i1.title")} sub={t("preview.insights.i1.sub")} />
                        <Insight Icon={DollarSign} title={t("preview.insights.i2.title")} sub={t("preview.insights.i2.sub")} accent="emerald" />
                        <Insight Icon={Activity} title={t("preview.insights.i3.title")} sub={t("preview.insights.i3.sub")} accent="amber" />
                        <Insight Icon={TrendingUp} title={t("preview.insights.i4.title")} sub={t("preview.insights.i4.sub")} accent="amber" />
                        <Insight Icon={Zap} title={t("preview.insights.i5.title")} sub={t("preview.insights.i5.sub")} />
                        <Insight Icon={Sparkles} title={t("preview.insights.i6.title")} sub={t("preview.insights.i6.sub")} />
                    </div>
                </Section>

                {/* D. Influencer / Creator View */}
                <Section icon={Mic} label={t("preview.section.creator_view")} badge={t("common.sample_data")}>
                    <div data-testid="preview-influencer">
                        <p className="max-w-2xl text-sm text-slate-300">{t("preview.creator.intro")}</p>
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Stat label={t("preview.stats.audience_growth")} value="+18.6%" delta={t("preview.stats_delta.last_30")} Icon={Users} accent="cyan" />
                            <Stat label={t("preview.stats.brand_deals")} value="7" delta={t("preview.stats_delta.deal_value")} Icon={Briefcase} accent="emerald" />
                            <Stat label={t("preview.stats.revenue_proj")} value="$42K" delta={t("preview.stats_delta.q2")} Icon={DollarSign} accent="cyan" />
                            <Stat label={t("preview.stats.engagement")} value="A-tier" delta={t("preview.stats_delta.tier_a")} Icon={Eye} accent="amber" />
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <SuggestedAction Icon={Megaphone} title={t("preview.creator.actions.launch.title")} body={t("preview.creator.actions.launch.body")} />
                            <SuggestedAction Icon={Sparkles} title={t("preview.creator.actions.optimize.title")} body={t("preview.creator.actions.optimize.body")} />
                            <SuggestedAction Icon={Rocket} title={t("preview.creator.actions.monetize.title")} body={t("preview.creator.actions.monetize.body")} />
                        </div>
                    </div>

                    {/* Send to my agent — viral channel for managers/booking agents */}
                    <SendToAgent />
                </Section>

                {/* E. Locked Actions */}
                <Section icon={Lock} label={t("preview.section.execution_actions")} badge={t("preview.locked.label")}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="preview-locked-actions">
                        <LockedAction id="run-campaign" label={t("preview.locked.run_campaign.label")} sub={t("preview.locked.run_campaign.sub")} />
                        <LockedAction id="execute-followup" label={t("preview.locked.execute_followup.label")} sub={t("preview.locked.execute_followup.sub")} />
                        <LockedAction id="optimize-revenue" label={t("preview.locked.optimize_revenue.label")} sub={t("preview.locked.optimize_revenue.sub")} />
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                        {t("preview.locked.footer")} <Link to="/apply/strategy" className="text-cyan-300 hover:text-cyan-200">{t("preview.locked.footer_link")}</Link>
                    </p>
                </Section>
            </div>
        </Layout>
    );
}

// ---------- Subcomponents ----------

// ---------- Send-to-my-agent share form (preview link) ----------
const SendToAgent = () => {
    const { t } = useTranslation();
    const [form, setForm] = useState({ name: "", email: "", message: "" });
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const handle = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const previewLink = typeof window !== "undefined" ? `${window.location.origin}/preview` : "/preview";

    const send = async () => {
        if (!form.name || !form.email) { toast.error(t("preview.send_to_agent.missing")); return; }
        setSending(true); setResult(null);
        try {
            const res = await shareDemo({
                recipient_email: form.email,
                sender_name: form.name,
                message: form.message || undefined,
                demo_type: "realtor",
                share_target: "preview",
                origin_url: typeof window !== "undefined" ? window.location.origin : undefined,
            });
            if (res.sent) {
                setResult({ ok: true, msg: t("preview.send_to_agent.sent_msg", { email: form.email }) });
                toast.success(t("preview.send_to_agent.sent_ok"));
            } else {
                setResult({ ok: false, msg: res.reason || t("preview.send_to_agent.could_not_send") });
                toast.error(t("preview.send_to_agent.could_not_send"));
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : t("contact.error");
            setResult({ ok: false, msg });
            toast.error(msg);
        } finally { setSending(false); }
    };

    const copyLink = async () => {
        try { await navigator.clipboard.writeText(previewLink); toast.success(t("common.copied")); }
        catch { toast.error(t("contact.error")); }
    };

    return (
        <div
            data-testid="preview-send-to-agent"
            className="mt-8 rounded-md border border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 to-transparent p-5 sm:p-6"
        >
            <div className="flex items-center gap-2">
                <Send size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{t("preview.send_to_agent.kicker")}</span>
            </div>
            <h3 className="font-heading mt-2 text-xl font-semibold text-white sm:text-2xl">{t("preview.send_to_agent.headline")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">{t("preview.send_to_agent.sub")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-3">
                    <input data-testid="agent-share-name" type="text" value={form.name} onChange={handle("name")} placeholder={t("preview.send_to_agent.name_ph")} className="w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" />
                    <input data-testid="agent-share-email" type="email" value={form.email} onChange={handle("email")} placeholder={t("preview.send_to_agent.email_ph")} className="w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" />
                    <textarea data-testid="agent-share-message" rows={2} value={form.message} onChange={handle("message")} placeholder={t("preview.send_to_agent.message_ph")} className="w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" />
                    <div className="flex flex-wrap gap-2">
                        <button data-testid="agent-share-send" onClick={send} disabled={sending} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 disabled:opacity-60">
                            {sending ? t("common.loading") : <><Send size={14} /> {t("preview.send_to_agent.send")}</>}
                        </button>
                        <button data-testid="agent-share-copy-link" onClick={copyLink} className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-4 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                            <Copy size={13} /> {t("preview.send_to_agent.copy_link")}
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-5">
                    {result ? (
                        <div data-testid={result.ok ? "agent-share-success" : "agent-share-error"} className={`rounded-md border p-4 ${result.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${result.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                                <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${result.ok ? "text-emerald-300" : "text-red-300"}`}>
                                    {result.ok ? t("preview.send_to_agent.sent_ok") : t("preview.send_to_agent.send_failed")}
                                </span>
                            </div>
                            <p className="mt-1.5 text-sm text-slate-200">{result.msg}</p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-white/10 bg-ink-800 p-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{t("preview.send_to_agent.preview_link")}</p>
                            <p className="mt-2 break-all font-mono text-xs text-cyan-300">{previewLink}</p>
                            <p className="mt-3 text-xs text-slate-500">{t("preview.send_to_agent.no_signup")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


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
    const { t } = useTranslation();
    const onClick = () => toast.message(t("preview.locked.available"), { description: t("common.live") + " · " + label, duration: 3000 });
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
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">{t("preview.locked.available")}</p>
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
