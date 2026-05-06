import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Users, Inbox, Send, Lightbulb, Bot, BarChart3, Crown, LogOut, Plus,
    MessageSquare, Copy, Link2, Mail, Check, Activity, DollarSign, Target,
    ArrowRight, Sparkles, UserPlus, ShieldCheck, ChevronDown, RefreshCcw,
    UserCog, AlertTriangle, PhoneCall, KeyRound, CheckCircle2, XCircle,
    Smartphone, Trash2, Radar, Upload, Play, Pause, Linkedin, Zap, ExternalLink,
    FileText, ThumbsUp, ThumbsDown, X, Calendar, Flame,
} from "lucide-react";
import {
    opsFounderAccess, opsExecutiveAccess, opsEmployeeAcceptInvite, opsMe,
    opsListLeads, opsCreateLead, opsUpdateLeadStatus, opsAddLeadNote, opsAddLeadTask,
    opsReassignLead, opsSendOutreach, opsListOutreach, opsCreateDemoLink,
    opsListDemoLinks, opsPerformance, opsAIChat, opsListEmployees, opsInviteEmployee,
    opsLogout, opsAdminUsersList, opsAdminUsersUpsert, opsAdminUsersDeactivate,
    opsAdminUsersResetAccess, opsAdminLoginAttempts, opsAdminDeliveryStatus,
    opsDemoRevenue,
    opsOutboundDashboard, opsOutboundPause, opsOutboundListProspects,
    opsOutboundAddProspect, opsOutboundUploadProspects, opsOutboundScore,
    opsOutboundScoreAll, opsOutboundLinkedinGenerate, opsOutboundLinkedinMarkSent,
    opsOutboundMarkReplied, opsOutboundDraftsList, opsOutboundDraftApprove,
    opsOutboundDraftReject, opsOutboundRunTick, opsOutboundSeedFromDemos,
    opsOutboundImapPollNow, opsOutboundAutopilotNow, opsOutboundPushHotLeads,
    opsOutboundArchiveInternal, opsOutboundResetDaily, opsOutboundDiagnostics,
    opsOutboundSetDailyLimit,
    opsOutboundQueueStatus, opsOutboundWorkerStatus,
    leadsAddManual, leadsList, leadsUpdateStatus, leadsTouch, leadsRelease,
    leadsStats, leadsImportCsv,
    avatarChat,
    avatarEscalationsList, avatarEscalationsDetail, avatarEscalationsUpdate, avatarEscalationsNote,
    startEngineAnalytics,
    clientList, clientWorkspace, clientSetStatus, clientTaskToggle,
    clientFounderReply, clientResendMagic, clientOnboardFromLead,
    cfoCaseGenerate, darkFunnelLeadEngagement, auditLeadTrail,
} from "@/lib/api";
import { DemoSavesMap } from "@/components/portal/DemoSavesMap";

const STORAGE_KEY = "cb_ops_session";
const LEAD_STATUSES = ["new", "contacted", "qualified", "demo_sent", "proposal", "won", "lost"];

const fmtUSD = (n) => n == null ? "$0" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// Used by Demo Revenue tab + LeadsTab attribution badge.
const DEMO_LABELS = {
    realtor: "Real Estate", insurance: "Insurance", supermarket: "Retail",
    creator: "Influencer", noldus: "Enterprise", general: "General",
};

const roleBadge = {
    founder:   { label: "Founder",   cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
    executive: { label: "Executive", cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
    employee:  { label: "Employee",  cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
};

const statusTone = {
    new:        "border-white/10 bg-ink-900 text-slate-300",
    contacted:  "border-amber-500/30 bg-amber-500/5 text-amber-300",
    qualified:  "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    demo_sent:  "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    proposal:   "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    won:        "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    lost:       "border-rose-500/30 bg-rose-500/5 text-rose-300",
};

// ======================================================================
// LOGIN SCREEN
// ======================================================================
const LoginScreen = ({ onAuth }) => {
    const [params] = useSearchParams();
    const [mode, setMode] = useState("founder");
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);

    // Auto-accept employee invite via ?token=
    useEffect(() => {
        const inv = params.get("invite");
        if (inv) {
            setBusy(true);
            opsEmployeeAcceptInvite(inv)
                .then(onAuth)
                .catch(() => toast.error("Invite expired or already used"))
                .finally(() => setBusy(false));
        }
    }, [params, onAuth]);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!value) { toast.error("Enter your access key"); return; }
        setBusy(true);
        try {
            const data = mode === "founder" ? await opsFounderAccess(value)
                : mode === "executive" ? await opsExecutiveAccess(value)
                : await opsEmployeeAcceptInvite(value);
            onAuth(data);
            toast.success(`Welcome · ${data.role}`);
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Invalid access key");
        } finally { setBusy(false); }
    };

    return (
        <Layout>
            <section className="relative overflow-hidden border-b border-white/5 bg-ink-900" data-testid="ops-login-screen">
                <div className="absolute inset-0 ambient-grid opacity-40" />
                <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <Crown size={12} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Operating Center</span>
                    </div>
                    <h1 className="font-heading mt-6 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                        Sign in to your <span className="text-cyan-300">full operating dashboard.</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm text-slate-300">
                        Leads, outreach, demo links, follow-ups, AI assistant, and performance — all role-scoped.
                        No placeholders. Real tools for real revenue.
                    </p>

                    <div className="mt-8 flex gap-2" data-testid="ops-role-tabs">
                        {[
                            { id: "founder",   Icon: Crown,       label: "Founder" },
                            { id: "executive", Icon: ShieldCheck, label: "Executive" },
                            { id: "employee",  Icon: Users,       label: "Employee" },
                        ].map((t) => (
                            <button key={t.id} onClick={() => setMode(t.id)} data-testid={`tab-${t.id}`}
                                className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${mode === t.id ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}>
                                <t.Icon size={11} /> {t.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="mt-5 max-w-xl space-y-3">
                        <label className="block">
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                {mode === "employee" ? "Invite token (from your email)" : "Access key"}
                            </span>
                            <input value={value} onChange={(e) => setValue(e.target.value)} type="text" required
                                data-testid="ops-login-input"
                                placeholder={mode === "founder" ? "founder master key" : mode === "executive" ? "executive master key" : "invite-token-from-email"}
                                className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none" />
                        </label>
                        <button type="submit" disabled={busy} data-testid="ops-login-submit"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                            {busy ? "Signing in…" : <><ArrowRight size={13} /> Sign In</>}
                        </button>
                    </form>

                    <p className="mt-6 max-w-xl font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Founders → /founder-access &nbsp;·&nbsp; Executives → /executive-access &nbsp;·&nbsp; Employees → link from your invite email
                    </p>
                </div>
            </section>
        </Layout>
    );
};

// ======================================================================
// MAIN DASHBOARD
// ======================================================================
const Sidebar = ({ me, active, onNav, onSignOut }) => {
    const items = [
        { id: "performance", label: "Performance", Icon: BarChart3 },
        { id: "leads",       label: "Leads",       Icon: Inbox },
        { id: "intake",      label: "Lead Intake", Icon: Upload },
        { id: "outreach",    label: "Outreach",    Icon: Send },
        { id: "demos",       label: "Demo Links",  Icon: Lightbulb },
        { id: "clients",     label: "Clients",     Icon: Crown },
        { id: "ai",          label: "AI Assistant",Icon: Bot },
    ];
    if (me.scopes.can_see_all_employees) items.push({ id: "employees", label: "Employees", Icon: Users });
    if (me.scopes.can_see_settings)      items.push({ id: "outbound",  label: "Outbound",  Icon: Radar });
    if (me.scopes.can_see_settings)      items.push({ id: "revenue",   label: "Demo Revenue", Icon: DollarSign });
    if (me.scopes.can_see_settings)      items.push({ id: "admin",     label: "Admin",     Icon: UserCog });
    if (me.scopes.can_see_settings)      items.push({ id: "settings",  label: "Settings",  Icon: ShieldCheck });

    return (
        <aside className="flex w-full flex-shrink-0 flex-col border-b border-white/5 bg-ink-900 lg:w-64 lg:border-b-0 lg:border-r" data-testid="ops-sidebar">
            <div className="border-b border-white/5 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Operating Center</p>
                <h2 className="font-heading mt-1 truncate text-lg font-semibold text-white">{me.name || me.email}</h2>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${roleBadge[me.role]?.cls}`} data-testid="ops-role-badge">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" /> {roleBadge[me.role]?.label}
                </span>
            </div>
            <nav className="flex flex-row overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
                {items.map((it) => (
                    <button key={it.id} onClick={() => onNav(it.id)} data-testid={`nav-${it.id}`}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all lg:whitespace-normal ${active === it.id ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-white/5 hover:text-cyan-200"}`}>
                        <it.Icon size={13} /> {it.label}
                    </button>
                ))}
            </nav>
            <div className="mt-auto border-t border-white/5 p-3">
                <button onClick={onSignOut} data-testid="ops-signout"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-rose-500/40 hover:text-rose-300">
                    <LogOut size={11} /> Sign out
                </button>
            </div>
        </aside>
    );
};

const SectionHeader = ({ title, sub, children }) => (
    <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{sub}</p>
            <h2 className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
        </div>
        {children}
    </div>
);

// ---------- Performance tab ----------
// ======================================================================
// Iter 54 · Startup → Standard upgrade banner
// Trigger logic: hybrid — show when ANY of these are true:
//   (1) sent_today >= 80% of plan daily limit, OR
//   (2) days since onboarding_completed_at >= 7, OR
//   (3) user clicks the global "Scale / Upgrade" trigger (forced=true)
// Hidden when: not on a startup tier, dismissed in this session,
// or never onboarded yet (day-0 trust rule).
// ======================================================================
const STARTUP_TIERS_SET = new Set(["startup_starter", "startup_growth", "startup_pro"]);
const TIER_NEXT_STEP = {
    startup_starter: { label: "Growth Launch ($79)", anchor: "startup-tier-startup_growth" },
    startup_growth:  { label: "Pro Launch ($149)",   anchor: "startup-tier-startup_pro" },
    startup_pro:     { label: "Standard Starter ($97)", anchor: "tier-starter" },
};
const PLAN_DAILY_LIMIT = {
    startup_starter: 10, startup_growth: 25, startup_pro: 50,
};

const UpgradeBanner = ({ me, dash, forced, onDismiss, onForce }) => {
    const tier = me?.plan_tier;
    const onStartupTier = STARTUP_TIERS_SET.has(tier);
    if (!onStartupTier) return null;
    const dismissed = (() => {
        try { return sessionStorage.getItem("cb_upgrade_banner_dismissed") === "1"; }
        catch { return false; }
    })();
    if (dismissed && !forced) return null;

    // Trigger 1 — usage threshold (sent_today vs plan daily limit)
    const a = dash?.automation || {};
    const cap = PLAN_DAILY_LIMIT[tier] || a.daily_limit || 0;
    const usagePct = cap > 0 ? Math.round(100 * (a.sent_today || 0) / cap) : 0;
    const usageHit = usagePct >= 80;

    // Trigger 2 — 7+ days on plan (uses onboarding_completed_at as proxy)
    const ts = me?.onboarding_completed_at;
    let dayHit = false;
    if (ts) {
        const days = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
        dayHit = days >= 7;
    }

    if (!usageHit && !dayHit && !forced) return null;

    const next = TIER_NEXT_STEP[tier] || { label: "Standard plans", anchor: "pricing-tiers" };
    const reason = forced
        ? "You requested a scale check"
        : usageHit
        ? `You've used ${usagePct}% of your daily limit today`
        : `You've been on ${tier.replace("startup_", "")} for 7+ days`;

    return (
        <div
            data-testid="upgrade-banner"
            className="rounded-md border border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 p-4 sm:p-5"
        >
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[240px]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                        Ready to scale? · Upgrade your engine
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                        {reason} — your next step is{" "}
                        <span className="font-semibold text-white">{next.label}</span>{" "}
                        for follow-ups, multi-sender rotation, and bigger lead caps.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={`/pricing#${next.anchor}`}
                        data-testid="upgrade-banner-cta"
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-emerald-300"
                    >
                        See upgrade <ArrowRight size={12} />
                    </a>
                    {!forced && (
                        <button
                            data-testid="upgrade-banner-dismiss"
                            onClick={() => {
                                try { sessionStorage.setItem("cb_upgrade_banner_dismissed", "1"); } catch { /* noop */ }
                                onDismiss && onDismiss();
                            }}
                            className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 hover:border-white/20 hover:text-slate-200"
                        >
                            Not now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Iter 54 · Founder-only Start Engine analytics card
const StartEngineAnalyticsCard = ({ auth }) => {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);
    useEffect(() => {
        startEngineAnalytics(auth)
            .then(setData)
            .catch((e) => setErr(e?.response?.data?.detail || "Could not load activation analytics"));
        // eslint-disable-next-line
    }, [auth]);

    if (err) return null;
    if (!data) {
        return (
            <div className="rounded-md border border-white/10 bg-ink-700/30 p-4 text-xs text-slate-400" data-testid="start-engine-analytics-loading">
                Loading activation analytics…
            </div>
        );
    }
    const dist = data.path_distribution_pct || {};
    return (
        <div
            className="rounded-md border border-emerald-400/30 bg-emerald-500/5 p-5"
            data-testid="start-engine-analytics-card"
        >
            <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-emerald-300" />
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Start Engine activation</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Onboarded" value={`${data.users_completed_onboarding}/${data.users_total_gated}`} sub={`${data.completion_rate_pct}%`} />
                <Stat label="Generated leads" value={data.users_who_generated_leads} sub={`${data.lead_generation_rate_pct}%`} />
                <Stat label="Autopilot dispatched" value={`${data.autopilot_dispatched_rate_pct}%`} sub="of path-leads" />
                <Stat label="Time to first reply" value={data.avg_time_to_first_reply_min != null ? `${data.avg_time_to_first_reply_min}m` : "—"} sub="avg" />
            </div>
            <div className="mt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Path distribution</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    {["leads", "import", "explore"].map((p) => (
                        <div key={p} className="rounded-sm border border-white/5 bg-ink-900 p-2.5" data-testid={`start-engine-path-${p}`}>
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{p}</p>
                            <p className="mt-0.5 font-heading text-base font-semibold text-white">
                                {(data.per_path?.[p]?.users) || 0}
                            </p>
                            <p className="font-mono text-[9px] text-emerald-300">{dist[p] || 0}%</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-sm border border-white/5 bg-ink-900 p-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">First email sent</p>
                    <p className="mt-0.5 font-heading text-base font-semibold text-white">{data.users_who_received_first_email}</p>
                </div>
                <div className="rounded-sm border border-white/5 bg-ink-900 p-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">First reply received</p>
                    <p className="mt-0.5 font-heading text-base font-semibold text-white">{data.users_who_received_first_reply}</p>
                </div>
            </div>
        </div>
    );
};

const Stat = ({ label, value, sub }) => (
    <div className="rounded-sm border border-white/5 bg-ink-900 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-0.5 font-heading text-lg font-semibold text-white">{value}</p>
        {sub && <p className="font-mono text-[9px] text-emerald-300">{sub}</p>}
    </div>
);

const PerformanceTab = ({ auth, me }) => {
    const [data, setData] = useState(null);
    const [autopilotBusy, setAutopilotBusy] = useState(false);

    const refresh = () => opsPerformance(auth).then(setData).catch(() => {});
    useEffect(() => {
        refresh();
        // Auto-refresh every 30s so the panel stays live
        const iv = setInterval(refresh, 30000);
        return () => clearInterval(iv);
        // eslint-disable-next-line
    }, [auth]);

    const startAutomation = async () => {
        setAutopilotBusy(true);
        try {
            await opsOutboundAutopilotNow(auth);
            toast.success("Automation cycle started — refreshing in 60s…");
            setTimeout(refresh, 60000);
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Start failed");
        } finally { setAutopilotBusy(false); }
    };

    if (!data) return <p className="text-slate-400">Loading…</p>;

    const tiles = [
        { Icon: Inbox,      label: "Total leads",     value: data.leads_total, tone: "white" },
        { Icon: Target,     label: "Won",             value: data.leads_won,   tone: "emerald" },
        { Icon: Activity,   label: "Win rate",        value: `${data.win_rate_pct}%`, tone: "cyan" },
        { Icon: DollarSign, label: "Pipeline value",  value: fmtUSD(data.pipeline_value_usd), tone: "white" },
        { Icon: DollarSign, label: "Won value",       value: fmtUSD(data.won_value_usd), tone: "emerald" },
        { Icon: Send,       label: "Outreach sent",   value: data.outreach_sent, tone: "cyan" },
        { Icon: Lightbulb,  label: "Demos sent",      value: data.demos_sent, tone: "cyan" },
        { Icon: UserPlus,   label: "Inbound demo leads", value: data.inbound_demo_leads ?? 0, tone: "emerald" },
        { Icon: Activity,   label: "Demo conversion",    value: `${data.demo_conversion_rate ?? 0}%`, tone: "cyan" },
        // Iter 50 · revenue engine KPIs
        { Icon: Zap,        label: "Hot leads",          value: data.hot_leads_count ?? 0, tone: "rose" },
        { Icon: Activity,   label: "Active sending rate",value: `${data.active_sending_rate ?? 0}/day`, tone: "cyan" },
        { Icon: Calendar,   label: "Booked calls",       value: data.booked_calls ?? 0, tone: "emerald" },
    ];
    const toneCls = {
        white:   "border-white/10 bg-ink-700/40",
        cyan:    "border-cyan-500/30 bg-cyan-500/5",
        emerald: "border-emerald-500/30 bg-emerald-500/5",
        rose:    "border-rose-500/40 bg-rose-500/10",
    };

    const a = data.automation || {};
    const isFounder = me.role === "founder" || me.scopes?.can_see_settings;
    const runStatus = a.last_autopilot_run?.status || "never";
    const runStatusTone = runStatus === "running"
        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 animate-pulse"
        : runStatus === "completed"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : runStatus === "failed"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
        : "border-white/10 bg-ink-900 text-slate-400";
    const spamTone = a.spam_risk === "high"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
        : a.spam_risk === "medium"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

    const formatRel = (iso) => {
        if (!iso) return "never";
        const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
        return `${Math.round(mins / 1440)}d ago`;
    };

    return (
        <div data-testid="tab-performance" className="space-y-6">
            <SectionHeader sub={me.role === "employee" ? "Your performance" : "Team performance"} title="Operating snapshot">
                {isFounder && (
                    <button
                        onClick={startAutomation}
                        disabled={autopilotBusy || a.engine_paused}
                        data-testid="perf-start-automation"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                        title="Run one full autopilot cycle: seed → score → send → poll replies"
                    >
                        <Zap size={11} /> {autopilotBusy ? "Starting…" : "Start automation now"}
                    </button>
                )}
            </SectionHeader>

            {/* Iter 54 · Startup → Standard upgrade banner (hybrid trigger) */}
            <UpgradeBanner me={me} dash={data} />

            {/* Iter 54 · Founder-only Start Engine activation analytics */}
            {isFounder && <StartEngineAnalyticsCard auth={auth} />}

            {/* ═══ AUTOMATION STATUS PANEL ═══ */}
            {isFounder && (
                <div
                    className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5"
                    data-testid="automation-status-panel"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Automation status</p>
                            <h3 className="font-heading mt-1 text-lg font-semibold text-white">
                                {a.engine_paused ? "Outbound engine paused" : "Outbound engine running"}
                            </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${runStatusTone}`} data-testid="automation-run-status">
                                <Activity size={10} /> Last cycle · {runStatus}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${spamTone}`} data-testid="automation-spam-status">
                                <ShieldCheck size={10} /> Spam risk · {a.spam_risk || "low"}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-sm border border-white/5 bg-ink-900 p-3" data-testid="automation-last-lead">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Last lead found</p>
                            {a.last_lead ? (
                                <>
                                    <p className="mt-0.5 truncate text-sm font-semibold text-white">{a.last_lead.business_name}</p>
                                    <p className="font-mono text-[9px] text-cyan-300">{a.last_lead.source || "—"} · {formatRel(a.last_lead.created_at)}</p>
                                </>
                            ) : <p className="mt-0.5 font-mono text-[10px] text-slate-400">never</p>}
                        </div>

                        <div className="rounded-sm border border-white/5 bg-ink-900 p-3" data-testid="automation-last-email">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Last email sent</p>
                            {a.last_email_sent ? (
                                <>
                                    <p className="mt-0.5 truncate text-sm font-semibold text-white">{a.last_email_sent.business_name || a.last_email_sent.email}</p>
                                    <p className="font-mono text-[9px] text-cyan-300">
                                        {a.last_email_sent.simulated && "[sim] "}
                                        {formatRel(a.last_email_sent.at)}
                                    </p>
                                </>
                            ) : <p className="mt-0.5 font-mono text-[10px] text-slate-400">never</p>}
                        </div>

                        <div className="rounded-sm border border-white/5 bg-ink-900 p-3" data-testid="automation-last-demo">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Last demo sent</p>
                            {a.last_demo_sent ? (
                                <>
                                    <p className="mt-0.5 truncate text-sm font-semibold text-white">{a.last_demo_sent.business_name}</p>
                                    <p className="font-mono text-[9px] text-cyan-300">{a.last_demo_sent.demo_label || a.last_demo_sent.target_segment || "—"} · {formatRel(a.last_demo_sent.demo_sent_at)}</p>
                                </>
                            ) : <p className="mt-0.5 font-mono text-[10px] text-slate-400">never</p>}
                        </div>

                        <div className="rounded-sm border border-white/5 bg-ink-900 p-3" data-testid="automation-next-run">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Daily limit</p>
                            <p className="mt-0.5 text-sm font-semibold text-white">{a.sent_today} / {a.daily_limit}</p>
                            <p className="font-mono text-[9px] text-cyan-300">Sent today</p>
                        </div>
                    </div>

                    {a.recent_errors && a.recent_errors.length > 0 && (
                        <div className="mt-4 rounded-sm border border-rose-500/30 bg-rose-500/5 p-3" data-testid="automation-errors">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">Recent errors / skips</p>
                            <ul className="mt-1 space-y-0.5">
                                {a.recent_errors.map((e, i) => (
                                    <li key={i} className="font-mono text-[10px] text-rose-200">
                                        · {e.type} · {formatRel(e.created_at)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="performance-tiles">
                {tiles.map((t) => (
                    <div key={t.label} className={`rounded-md border p-4 ${toneCls[t.tone]}`}>
                        <div className="flex items-center gap-2"><t.Icon size={11} className="text-cyan-400" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{t.label}</span></div>
                        <p className="font-heading mt-1 text-2xl font-semibold text-white">{t.value}</p>
                    </div>
                ))}
            </div>

            {/* Blended CRM + engine breakdown */}
            {isFounder && (
                <div className="grid grid-cols-2 gap-3 text-xs" data-testid="perf-source-breakdown">
                    <div className="rounded-sm border border-white/5 bg-ink-900 p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Manual CRM leads</p>
                        <p className="mt-0.5 font-heading text-lg font-semibold text-white">{data.crm_leads_total}</p>
                    </div>
                    <div className="rounded-sm border border-white/5 bg-ink-900 p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Outbound engine prospects</p>
                        <p className="mt-0.5 font-heading text-lg font-semibold text-white">{data.outbound_prospects_total}</p>
                    </div>
                </div>
            )}

            <div className="rounded-md border border-white/10 bg-ink-700/40 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Leads by status</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    {LEAD_STATUSES.map((s) => (
                        <div key={s} className="rounded-sm border border-white/5 bg-ink-900 p-3">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{s}</p>
                            <p className="font-heading mt-1 text-lg font-semibold text-white">{data.leads_by_status[s] || 0}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ---------- Leads tab ----------
const LeadsTab = ({ auth, me }) => {
    const [leads, setLeads] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [demoFilter, setDemoFilter] = useState(false); // Filter: closed from demo only
    const refresh = () => opsListLeads(auth).then((d) => setLeads(d.leads || [])).catch(() => {});
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [auth]); // eslint-disable-line react-hooks/exhaustive-deps

    const visibleLeads = demoFilter
        ? leads.filter((l) => Boolean(l.closed_source_demo))
        : leads;
    const demoClosedCount = leads.filter((l) => Boolean(l.closed_source_demo)).length;

    return (
        <div data-testid="tab-leads" className="space-y-5">
            <SectionHeader sub={me.scopes.can_see_all_leads ? "All leads" : "Your assigned leads"} title={`${visibleLeads.length} leads`}>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setDemoFilter((p) => !p)}
                        data-testid="leads-filter-demo-closed"
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${demoFilter ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border border-white/10 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"}`}
                    >
                        <DollarSign size={11} />
                        Closed from demo
                        <span className={`ml-1 rounded-sm px-1.5 py-0.5 text-[9px] ${demoFilter ? "bg-emerald-500/20 text-emerald-200" : "bg-ink-900 text-slate-400"}`}>{demoClosedCount}</span>
                    </button>
                    <button onClick={() => setShowForm((p) => !p)} data-testid="leads-add-btn" className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400">
                        <Plus size={11} /> Add lead
                    </button>
                </div>
            </SectionHeader>
            {showForm && <LeadForm auth={auth} me={me} onCreated={() => { setShowForm(false); refresh(); }} />}
            <div className="space-y-2">
                {visibleLeads.length === 0 ? (
                    <p className="rounded-md border border-white/10 bg-ink-700/40 p-6 text-center text-sm text-slate-400" data-testid="leads-empty">
                        {demoFilter ? "No demo-attributed wins yet. Share a demo and track conversions." : "No leads yet. Add your first one above."}
                    </p>
                ) : visibleLeads.map((l) => <LeadCard key={l.lead_id} lead={l} auth={auth} me={me} onChange={refresh} />)}
            </div>
        </div>
    );
};

const LeadForm = ({ auth, me, onCreated }) => {
    const [f, setF] = useState({ contact_name: "", contact_email: "", contact_phone: "", company: "", source: "", value_usd: "", notes: "" });
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        if (!f.contact_name) { toast.error("Name is required"); return; }
        setBusy(true);
        try {
            await opsCreateLead({ ...auth, ...f, value_usd: f.value_usd ? Number(f.value_usd) : null });
            toast.success("Lead added");
            onCreated?.();
        } catch { toast.error("Could not add lead"); }
        finally { setBusy(false); }
    };
    return (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="lead-create-form">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[["contact_name","Name *"],["contact_email","Email"],["contact_phone","Phone"],["company","Company"],["source","Source"],["value_usd","Est. value ($)"]].map(([k, label]) => (
                    <input key={k} placeholder={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
                        data-testid={`lead-field-${k}`}
                        className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                ))}
            </div>
            <textarea placeholder="First note (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}
                data-testid="lead-field-notes"
                className="mt-2 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" rows={2} />
            <div className="mt-2 flex justify-end">
                <button onClick={submit} disabled={busy} data-testid="lead-submit" className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                    <Plus size={11} /> {busy ? "Saving…" : "Save lead"}
                </button>
            </div>
        </div>
    );
};

// ---------- Iter 61 · CFO Business Case Panel (founder lead drawer) ----------
const INDUSTRY_OPTIONS = [
    { v: "", label: "Auto-detect" },
    { v: "koollite_energy", label: "Koollite Energy / Lighting" },
    { v: "real_estate", label: "Real Estate" },
    { v: "general_business", label: "General / Insurance / Other" },
];

const CfoCasePanel = ({ lead, auth }) => {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [industry, setIndustry] = useState("");
    const [extraNotes, setExtraNotes] = useState("");
    const [output, setOutput] = useState(null);
    const [err, setErr] = useState(null);

    const generate = async () => {
        setBusy(true); setErr(null); setOutput(null);
        try {
            const inputs = {};
            if (lead.value_usd) inputs.deal_value = `$${Number(lead.value_usd).toLocaleString()}`;
            if (lead.company) inputs.business = lead.company;
            if (lead.source) inputs.source = lead.source;
            if (extraNotes.trim()) inputs.context = extraNotes.trim();
            const res = await cfoCaseGenerate({
                lead_id: lead.lead_id,
                industry: industry || lead.industry || lead.source || undefined,
                inputs,
                auth_email: auth.email,
                auth_token: auth.token,
            });
            setOutput(res);
            toast.success(`CFO case ready · ${res.industry}`);
        } catch (e) {
            setErr(e?.response?.data?.detail || e?.message || "generate failed");
            toast.error("CFO case failed");
        } finally { setBusy(false); }
    };

    const copyMd = async () => {
        try { await navigator.clipboard.writeText(output?.markdown || ""); toast.success("Copied markdown"); }
        catch { toast.error("Copy failed"); }
    };

    return (
        <div data-testid={`cfo-panel-${lead.lead_id}`}
             className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
            <button onClick={() => setOpen((p) => !p)}
                data-testid={`cfo-toggle-${lead.lead_id}`}
                className="flex w-full items-center justify-between text-left">
                <div className="flex items-center gap-2">
                    <FileText size={12} className="text-emerald-400" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">CFO Business Case</p>
                </div>
                <ChevronDown size={11} className={`text-emerald-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="mt-3 space-y-2" data-testid={`cfo-body-${lead.lead_id}`}>
                    <div className="flex flex-wrap gap-2">
                        <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                            data-testid={`cfo-industry-${lead.lead_id}`}
                            className="rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none">
                            {INDUSTRY_OPTIONS.map((o) => (<option key={o.v} value={o.v}>{o.label}</option>))}
                        </select>
                        <button onClick={generate} disabled={busy}
                            data-testid={`cfo-generate-${lead.lead_id}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500 hover:text-ink-900 disabled:opacity-60">
                            {busy ? <RefreshCcw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                            {busy ? "Generating…" : "Generate CFO case"}
                        </button>
                    </div>
                    <input value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)}
                        placeholder="Optional context (kWh, sqft, asking price, claims ratio, etc.)"
                        data-testid={`cfo-notes-${lead.lead_id}`}
                        className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none" />
                    {err && <p data-testid={`cfo-error-${lead.lead_id}`} className="font-mono text-[10px] text-rose-300">{err}</p>}
                    {output && (
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
                                <span className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">{output.industry}</span>
                                <span>{output.chars} chars</span>
                                <span data-testid={`cfo-decision-${lead.lead_id}`}>decision · {String(output.decision_id || "").slice(0, 8)}</span>
                                <button onClick={copyMd} data-testid={`cfo-copy-${lead.lead_id}`}
                                    className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                                    <Copy size={10} /> Copy markdown
                                </button>
                            </div>
                            <pre data-testid={`cfo-output-${lead.lead_id}`}
                                className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border border-white/5 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
{output.markdown}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ---------- Iter 61 · Engagement + Signal panel (founder lead drawer) ----------
const EngagementPanel = ({ lead, auth }) => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState(null);
    const [trail, setTrail] = useState([]);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setBusy(true);
        try {
            const [eng, aud] = await Promise.allSettled([
                darkFunnelLeadEngagement({ email: auth.email, token: auth.token, lead_id: lead.lead_id }),
                auditLeadTrail({ email: auth.email, token: auth.token, lead_id: lead.lead_id, limit: 20 }),
            ]);
            if (eng.status === "fulfilled") setData(eng.value);
            else setData({ lead: null, tracked_links: [] });
            if (aud.status === "fulfilled") setTrail(aud.value.trail || []);
            else setTrail([]);
        } finally { setBusy(false); }
    };

    useEffect(() => { if (open && !data) load(); /* eslint-disable-next-line */ }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const score = data?.lead?.signal_score ?? 0;
    const scoreTone = score >= 80 ? "text-rose-300 border-rose-500/40 bg-rose-500/10"
        : score >= 50 ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
        : "text-cyan-300 border-cyan-500/40 bg-cyan-500/10";

    return (
        <div data-testid={`engagement-panel-${lead.lead_id}`}
             className="rounded-md border border-cyan-500/20 bg-cyan-500/[0.03] p-3">
            <button onClick={() => setOpen((p) => !p)}
                data-testid={`engagement-toggle-${lead.lead_id}`}
                className="flex w-full items-center justify-between text-left">
                <div className="flex items-center gap-2">
                    <Activity size={12} className="text-cyan-300" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Engagement & Audit Trail</p>
                </div>
                <ChevronDown size={11} className={`text-cyan-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="mt-3 space-y-3" data-testid={`engagement-body-${lead.lead_id}`}>
                    <div className="flex flex-wrap items-center gap-2">
                        <span data-testid={`engagement-score-${lead.lead_id}`}
                              className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${scoreTone}`}>
                            Signal {score}/100
                        </span>
                        {data?.lead?.signal_alerts_fired?.engagement_spike && (
                            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">
                                <Flame size={10} className="mr-1 inline" /> Spike
                            </span>
                        )}
                        {data?.lead?.reengagement_sent_at && (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">
                                Re-engage sent
                            </span>
                        )}
                        <button onClick={load} disabled={busy}
                            data-testid={`engagement-refresh-${lead.lead_id}`}
                            className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <RefreshCcw size={10} className={busy ? "animate-spin" : ""} /> Refresh
                        </button>
                    </div>

                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Recent signal history</p>
                        <div className="mt-1 max-h-32 space-y-1 overflow-y-auto" data-testid={`engagement-history-${lead.lead_id}`}>
                            {(data?.lead?.signal_history || []).slice().reverse().map((h, i) => (
                                <div key={i} className="flex items-center justify-between rounded-sm border border-white/5 bg-ink-900 px-2 py-1 text-xs text-slate-300">
                                    <span><span className="font-mono text-[10px] text-cyan-300">{h.kind}</span> · {h.reason || "—"}</span>
                                    <span className="font-mono text-[10px] text-emerald-300">+{h.delta}</span>
                                </div>
                            ))}
                            {(!data?.lead?.signal_history || data.lead.signal_history.length === 0) && (
                                <p className="font-mono text-[10px] text-slate-500">No engagement signals yet.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Tracked links ({data?.tracked_links?.length || 0})</p>
                        <div className="mt-1 space-y-1">
                            {(data?.tracked_links || []).map((l, i) => (
                                <div key={i} className="rounded-sm border border-white/5 bg-ink-900 px-2 py-1 text-xs text-slate-300">
                                    <div className="flex items-center justify-between">
                                        <span className="truncate font-mono text-[10px] text-slate-400">{l.kind} → {l.dest_url}</span>
                                        <span className="font-mono text-[10px] text-emerald-300">{l.clicks || 0} click{(l.clicks || 0) === 1 ? "" : "s"}</span>
                                    </div>
                                </div>
                            ))}
                            {(!data?.tracked_links || data.tracked_links.length === 0) && (
                                <p className="font-mono text-[10px] text-slate-500">No tracked links minted yet.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Sovereign audit trail ({trail.length})</p>
                        <div className="mt-1 max-h-48 space-y-1 overflow-y-auto" data-testid={`audit-trail-${lead.lead_id}`}>
                            {trail.map((d) => (
                                <div key={d.decision_id} className="rounded-sm border border-white/5 bg-ink-900 px-2 py-1.5 text-[11px] text-slate-300">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{d.agent_id} · {d.action}</span>
                                        {typeof d.confidence === "number" && (
                                            <span className="font-mono text-[9px] text-emerald-300">{d.confidence}%</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 leading-snug text-slate-300">{d.reasoning_summary}</p>
                                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                                        {new Date(d.timestamp).toLocaleString()} · sources: {(d.data_sources || []).join(", ") || "—"}
                                    </p>
                                </div>
                            ))}
                            {trail.length === 0 && (
                                <p className="font-mono text-[10px] text-slate-500">No audit decisions logged yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LeadCard = ({ lead, auth, me, onChange }) => {
    const [expanded, setExpanded] = useState(false);
    const [note, setNote] = useState("");
    const [task, setTask] = useState("");
    const updateStatus = async (status) => {
        try { await opsUpdateLeadStatus({ ...auth, lead_id: lead.lead_id, status }); toast.success(`Status → ${status}`); onChange?.(); }
        catch { toast.error("Could not update"); }
    };
    const addNote = async () => {
        if (!note.trim()) return;
        try { await opsAddLeadNote({ ...auth, lead_id: lead.lead_id, note }); setNote(""); toast.success("Note added"); onChange?.(); }
        catch { toast.error("Could not add note"); }
    };
    const addTask = async () => {
        if (!task.trim()) return;
        try { await opsAddLeadTask({ ...auth, lead_id: lead.lead_id, task }); setTask(""); toast.success("Task added"); onChange?.(); }
        catch { toast.error("Could not add task"); }
    };
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-4" data-testid={`lead-card-${lead.lead_id}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{lead.lead_id}</span>
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${statusTone[lead.status]}`}>{lead.status}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">{lead.name}{lead.company && <> · <span className="text-slate-300">{lead.company}</span></>}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                        {lead.email || "—"} · {lead.phone || "no phone"} · assigned {lead.assigned_to_email}
                    </p>
                    {/* Demo attribution badge — shown once a webhook has closed the lead from a demo. */}
                    {lead.closed_source_demo && (
                        <div
                            data-testid={`lead-demo-attribution-${lead.lead_id}`}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300"
                        >
                            <DollarSign size={10} />
                            Closed from {DEMO_LABELS[lead.closed_source_demo] || lead.closed_source_demo}
                            {lead.closed_amount ? ` · ${fmtUSD(lead.closed_amount)}` : ""}
                            {lead.closed_plan_key ? ` · ${lead.closed_plan_key}` : ""}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {lead.value_usd && <span className="font-mono text-[10px] text-emerald-300">{fmtUSD(lead.value_usd)}</span>}
                    <button onClick={() => setExpanded((p) => !p)} data-testid={`lead-expand-${lead.lead_id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                        <ChevronDown size={11} /> {expanded ? "Hide" : "Details"}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="mt-3 space-y-3 border-t border-white/5 pt-3" data-testid={`lead-details-${lead.lead_id}`}>
                    <div className="flex flex-wrap gap-1">
                        {LEAD_STATUSES.map((s) => (
                            <button key={s} onClick={() => updateStatus(s)}
                                data-testid={`lead-status-${lead.lead_id}-${s}`}
                                className={`rounded-sm border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] ${lead.status === s ? statusTone[s] : "border-white/10 text-slate-400 hover:border-cyan-500/30"}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Notes ({lead.notes?.length || 0})</p>
                        <div className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                            {(lead.notes || []).map((n, i) => (
                                <div key={i} className="rounded-sm border border-white/5 bg-ink-900 p-2 text-xs text-slate-300">
                                    <p>{n.text}</p>
                                    <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500">— {n.by} · {n.at && new Date(n.at).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…"
                                data-testid={`lead-note-input-${lead.lead_id}`}
                                className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                            <button onClick={addNote} data-testid={`lead-note-submit-${lead.lead_id}`} className="rounded-md border border-cyan-500/40 bg-cyan-500/5 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">Save</button>
                        </div>
                    </div>
                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Tasks ({lead.tasks?.length || 0})</p>
                        <div className="mt-1 space-y-1">
                            {(lead.tasks || []).map((t, i) => (
                                <div key={i} className="rounded-sm border border-white/5 bg-ink-900 px-2 py-1 text-xs text-slate-300">
                                    <Check size={10} className="mr-1 inline text-cyan-400" /> {t.task}
                                    {t.due_at && <span className="ml-1 font-mono text-[8px] uppercase text-slate-500">due {t.due_at}</span>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task…"
                                data-testid={`lead-task-input-${lead.lead_id}`}
                                className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                            <button onClick={addTask} data-testid={`lead-task-submit-${lead.lead_id}`} className="rounded-md border border-cyan-500/40 bg-cyan-500/5 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">Save</button>
                        </div>
                    </div>
                    <CfoCasePanel lead={lead} auth={auth} />
                    <EngagementPanel lead={lead} auth={auth} />
                </div>
            )}
        </div>
    );
};

// ---------- Lead Intake tab (Iter 51 · Universal Lead Intake) ----------
const LEAD_PIPELINE = ["new", "contacted", "responded", "meeting_set", "closed"];
const LEAD_PIPELINE_LABELS = {
    new: "New",
    contacted: "Contacted",
    responded: "Responded",
    meeting_set: "Meeting set",
    closed: "Closed",
};
const SOURCE_OPTIONS = ["LinkedIn", "Lusha", "Hunter", "Snov", "manual", "demo_capture"];

const LeadIntakeTab = ({ auth, me }) => {
    const [stats, setStats] = useState(null);
    const [leads, setLeads] = useState([]);
    const [filters, setFilters] = useState({ source: "", industry: "", status: "" });
    const [showAdd, setShowAdd] = useState(false);
    const isAdmin = me.role === "founder" || me.role === "executive" || me.role === "president";

    const refresh = async () => {
        try {
            const [s, l] = await Promise.all([
                leadsStats(auth),
                leadsList({ ...auth, source: filters.source || undefined, industry: filters.industry || undefined, status: filters.status || undefined, limit: 200 }),
            ]);
            setStats(s);
            setLeads(l.leads || []);
        } catch (e) { /* no-op */ }
    };
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [auth, filters]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div data-testid="tab-intake" className="space-y-6">
            <SectionHeader
                sub={isAdmin ? "Universal Lead Intake · all leads" : "Your assigned leads"}
                title={`${stats?.total ?? 0} leads in your registry`}
            >
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowAdd((p) => !p)} data-testid="intake-add-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400">
                        <Plus size={11} /> Add Lead
                    </button>
                </div>
            </SectionHeader>

            {/* Pipeline counters */}
            {stats && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="intake-pipeline">
                    {LEAD_PIPELINE.map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilters((p) => ({ ...p, status: p.status === s ? "" : s }))}
                            data-testid={`intake-pipeline-${s}`}
                            className={`rounded-md border px-4 py-3 text-left transition-all ${filters.status === s ? "border-cyan-500/60 bg-cyan-500/10" : "border-white/10 bg-ink-700/40 hover:border-cyan-500/40"}`}
                        >
                            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{LEAD_PIPELINE_LABELS[s]}</p>
                            <p className="mt-1 font-heading text-xl font-semibold text-white">{stats.by_status[s] ?? 0}</p>
                        </button>
                    ))}
                </div>
            )}

            {/* Import Center + Manual Entry */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <CsvImportCard auth={auth} onDone={refresh} />
                {showAdd && <ManualAddCard auth={auth} onDone={() => { setShowAdd(false); refresh(); }} />}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-ink-700/30 p-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Filters:</span>
                <select
                    value={filters.source}
                    onChange={(e) => setFilters((p) => ({ ...p, source: e.target.value }))}
                    data-testid="intake-filter-source"
                    className="rounded-md border border-white/10 bg-ink-900 px-3 py-1.5 text-xs text-slate-200"
                >
                    <option value="">All sources</option>
                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                    type="text"
                    value={filters.industry}
                    onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value }))}
                    placeholder="Industry contains…"
                    data-testid="intake-filter-industry"
                    className="rounded-md border border-white/10 bg-ink-900 px-3 py-1.5 text-xs text-slate-200"
                />
                {(filters.source || filters.industry || filters.status) && (
                    <button onClick={() => setFilters({ source: "", industry: "", status: "" })}
                        data-testid="intake-filter-clear"
                        className="text-xs text-slate-400 underline-offset-2 hover:underline">Clear</button>
                )}
            </div>

            {/* Lead table */}
            <div className="overflow-hidden rounded-md border border-white/10 bg-ink-700/30" data-testid="intake-table">
                {leads.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-400">No leads yet. Upload a CSV or click <span className="text-cyan-300">Add Lead</span> above.</p>
                ) : (
                    <table className="w-full min-w-[800px] text-left text-sm">
                        <thead className="border-b border-white/10 bg-ink-900">
                            <tr className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">
                                <th className="px-3 py-2">Name / Company</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Source</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((l) => <LeadRow key={l.lead_id} lead={l} auth={auth} onChange={refresh} />)}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const CsvImportCard = ({ auth, onDone }) => {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [source, setSource] = useState("LinkedIn");
    const [last, setLast] = useState(null);
    const onFile = async (file) => {
        if (!file) return;
        setBusy(true); setLast(null);
        try {
            const r = await leadsImportCsv({ ...auth, source, file });
            setLast(r);
            const dupOther = r.duplicates_owned_by_other || 0;
            if (r.added > 0) toast.success(`${r.added} added · ${r.duplicates_owned_by_self} dup (yours) · ${dupOther} owned-by-other`);
            else if (dupOther > 0) toast.error(`All ${dupOther} already owned by other users`);
            else toast.message("No new leads added");
            onDone?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "CSV import failed");
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };
    return (
        <div className="rounded-md border border-dashed border-white/15 bg-ink-700/30 p-4" data-testid="intake-csv-card">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CSV Import</p>
            <p className="mt-1 text-xs text-slate-400">Drop a CSV from LinkedIn Sales Nav, Lusha, Hunter, or Snov. Headers auto-mapped.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <select value={source} onChange={(e) => setSource(e.target.value)}
                    data-testid="intake-csv-source"
                    className="rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-200">
                    {["LinkedIn", "Lusha", "Hunter", "Snov", "manual"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
                    data-testid="intake-csv-input"
                    onChange={(e) => onFile(e.target.files?.[0])} />
                <button onClick={() => inputRef.current?.click()} disabled={busy}
                    data-testid="intake-csv-btn"
                    className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-60">
                    <Upload size={11} /> {busy ? "Importing…" : "Upload CSV"}
                </button>
            </div>
            {last && (
                <div className="mt-3 space-y-1 rounded-md border border-white/5 bg-ink-900/50 p-3 text-xs text-slate-300" data-testid="intake-csv-result">
                    <p>Parsed: <span className="font-mono text-white">{last.total_parsed}</span> · Added: <span className="font-mono text-emerald-300">{last.added}</span></p>
                    <p>Duplicates yours: <span className="font-mono text-slate-400">{last.duplicates_owned_by_self}</span> · Owned by others: <span className="font-mono text-amber-300">{last.duplicates_owned_by_other}</span></p>
                    {last.duplicate_examples_other?.length > 0 && (
                        <details className="mt-2 text-[11px]">
                            <summary className="cursor-pointer text-amber-300">Owned-by-other examples</summary>
                            <ul className="mt-1 space-y-0.5 text-slate-400">
                                {last.duplicate_examples_other.map((d, i) => <li key={i}>{d.email || d.company} — owner: {d.owned_by}</li>)}
                            </ul>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
};

const ManualAddCard = ({ auth, onDone }) => {
    const [f, setF] = useState({
        first_name: "", last_name: "", email: "", phone: "", company: "",
        title: "", industry: "", location: "", linkedin_url: "", source: "manual",
    });
    const [busy, setBusy] = useState(false);
    const [paste, setPaste] = useState("");
    const submit = async () => {
        setBusy(true);
        try {
            const r = await leadsAddManual({ ...auth, lead: f });
            toast[r.is_new ? "success" : (r.owned_by_other ? "error" : "message")](r.message);
            if (r.is_new) {
                setF({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", industry: "", location: "", linkedin_url: "", source: f.source });
                onDone?.();
            }
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Add failed");
        } finally { setBusy(false); }
    };
    const parsePaste = () => {
        if (!paste.trim()) return;
        const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
        const out = { ...f };
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.includes("@") && !out.email) { out.email = line.match(/[^\s,;]+@[^\s,;]+/)?.[0] || line; continue; }
            if (lower.includes("linkedin.com")) { out.linkedin_url = line.match(/https?:\/\/[^\s,;]+/)?.[0] || line; continue; }
            if (/[\d\-\(\)\s]{7,}/.test(line) && !out.phone) { out.phone = line; continue; }
            if (!out.name && /^[A-Z][a-z]+\s[A-Z][a-z]+/.test(line)) {
                const [first, ...rest] = line.split(/\s+/);
                out.first_name = first; out.last_name = rest.join(" ");
                continue;
            }
            if (!out.company && /(LLC|Inc|Corp|Group|Ltd)/i.test(line)) { out.company = line; continue; }
            if (!out.title) { out.title = line; }
        }
        setF(out);
    };
    return (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="intake-manual-card">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Manual Entry</p>
            <p className="mt-1 text-xs text-slate-400">Paste from Lusha/LinkedIn or fill by hand.</p>
            <textarea
                placeholder="Paste anything from Lusha (name, email, title, phone, LinkedIn URL — one per line)"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                onBlur={parsePaste}
                rows={3}
                data-testid="intake-manual-paste"
                className="mt-3 w-full rounded-md border border-white/10 bg-ink-900 p-2 text-xs text-slate-200 placeholder:text-slate-500"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                    ["first_name", "First name"], ["last_name", "Last name"],
                    ["email", "Email"], ["phone", "Phone"],
                    ["company", "Company"], ["title", "Title"],
                    ["industry", "Industry"], ["location", "Location"],
                ].map(([k, label]) => (
                    <input key={k} placeholder={label} value={f[k]}
                        onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))}
                        data-testid={`intake-manual-${k}`}
                        className="rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500" />
                ))}
                <input placeholder="LinkedIn URL" value={f.linkedin_url} onChange={(e) => setF((p) => ({ ...p, linkedin_url: e.target.value }))}
                    data-testid="intake-manual-linkedin"
                    className="col-span-2 rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500" />
                <select value={f.source} onChange={(e) => setF((p) => ({ ...p, source: e.target.value }))}
                    data-testid="intake-manual-source"
                    className="rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-200">
                    {["LinkedIn", "Lusha", "Hunter", "Snov", "manual"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={submit} disabled={busy} data-testid="intake-manual-submit"
                    className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                    {busy ? "Adding…" : "Add lead"}
                </button>
            </div>
        </div>
    );
};

const LeadRow = ({ lead, auth, onChange }) => {
    const [busy, setBusy] = useState(false);
    const move = async (status) => {
        setBusy(true);
        try {
            await leadsUpdateStatus({ ...auth, lead_id: lead.lead_id, status });
            toast.success(`Moved to ${LEAD_PIPELINE_LABELS[status]}`);
            onChange?.();
        } catch { toast.error("Status update failed"); }
        finally { setBusy(false); }
    };
    const copyEmail = async () => {
        if (!lead.email) return;
        await navigator.clipboard.writeText(lead.email);
        toast.success("Email copied");
        await leadsTouch({ ...auth, lead_id: lead.lead_id, type_: "email_copied" }).catch(() => {});
    };
    const openLinkedin = async () => {
        if (!lead.linkedin_url) return;
        window.open(lead.linkedin_url, "_blank", "noopener");
        await leadsTouch({ ...auth, lead_id: lead.lead_id, type_: "linkedin_opened" }).catch(() => {});
    };
    return (
        <tr className="border-b border-white/5 hover:bg-ink-900/30" data-testid={`intake-row-${lead.lead_id}`}>
            <td className="px-3 py-2">
                <p className="font-medium text-white">{lead.name || "—"}</p>
                <p className="text-xs text-slate-400">{lead.company || "—"} · {lead.title || ""}</p>
            </td>
            <td className="px-3 py-2 text-xs text-slate-300">
                {lead.email || <span className="text-slate-500">—</span>}
                {lead.linkedin_url && <span className="ml-1 text-slate-500">·</span>}
                {lead.linkedin_url && <Linkedin size={11} className="ml-1 inline text-cyan-300" />}
            </td>
            <td className="px-3 py-2"><span className="rounded-sm bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300">{lead.source}</span></td>
            <td className="px-3 py-2">
                <select value={lead.status} disabled={busy}
                    onChange={(e) => move(e.target.value)}
                    data-testid={`intake-row-status-${lead.lead_id}`}
                    className="rounded-md border border-white/10 bg-ink-900 px-2 py-1 text-xs text-slate-200">
                    {LEAD_PIPELINE.map((s) => <option key={s} value={s}>{LEAD_PIPELINE_LABELS[s]}</option>)}
                    {!LEAD_PIPELINE.includes(lead.status) && <option value={lead.status}>{lead.status}</option>}
                </select>
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                    {lead.email && (
                        <button onClick={copyEmail} title="Copy email"
                            data-testid={`intake-row-copyemail-${lead.lead_id}`}
                            className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <FileText size={11} />
                        </button>
                    )}
                    {lead.linkedin_url && (
                        <button onClick={openLinkedin} title="Open LinkedIn"
                            data-testid={`intake-row-linkedin-${lead.lead_id}`}
                            className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <Linkedin size={11} />
                        </button>
                    )}
                    <button onClick={() => move("contacted")} disabled={busy || lead.status !== "new"} title="Mark contacted"
                        data-testid={`intake-row-contacted-${lead.lead_id}`}
                        className="rounded-md border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40">
                        <Send size={11} />
                    </button>
                </div>
            </td>
        </tr>
    );
};



// ---------- Outreach tab ----------
const OutreachTab = ({ auth }) => {
    const [log, setLog] = useState([]);
    const [f, setF] = useState({ to_email: "", subject: "", body: "", lead_id: "" });
    const [busy, setBusy] = useState(false);
    useEffect(() => { opsListOutreach(auth).then((d) => setLog(d.outreach || [])).catch(() => {}); }, [auth]);
    const send = async () => {
        if (!f.to_email || !f.subject || !f.body) { toast.error("To, subject, body required"); return; }
        setBusy(true);
        try {
            const r = await opsSendOutreach({ ...auth, ...f, lead_id: f.lead_id || null });
            toast.success(r.delivery?.status === "sent" ? "Email sent" : "Queued (no RESEND_API_KEY — logged)");
            setF({ to_email: "", subject: "", body: "", lead_id: "" });
            opsListOutreach(auth).then((d) => setLog(d.outreach || []));
        } catch { toast.error("Could not send"); }
        finally { setBusy(false); }
    };
    return (
        <div data-testid="tab-outreach" className="space-y-5">
            <SectionHeader sub="Outbound" title="Outreach composer" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-ink-700/40 p-4 space-y-2" data-testid="outreach-form">
                    <input value={f.to_email} onChange={(e) => setF({ ...f, to_email: e.target.value })} placeholder="to@company.com" type="email"
                        data-testid="outreach-to" className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                    <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Subject"
                        data-testid="outreach-subject" className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                    <input value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })} placeholder="Link to lead_id (optional)"
                        data-testid="outreach-lead-id" className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500" />
                    <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={8} placeholder="Body…"
                        data-testid="outreach-body" className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                    <button onClick={send} disabled={busy} data-testid="outreach-send"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                        <Send size={11} /> {busy ? "Sending…" : "Send"}
                    </button>
                </div>
                <div className="rounded-md border border-white/10 bg-ink-700/40 p-4" data-testid="outreach-log">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Recent outreach ({log.length})</p>
                    <div className="mt-2 max-h-[500px] space-y-2 overflow-y-auto">
                        {log.map((o) => (
                            <div key={o.outreach_id} className="rounded-sm border border-white/5 bg-ink-900 p-2 text-xs">
                                <p className="font-mono text-[10px] text-cyan-300">{o.outreach_id} → {o.to_email}</p>
                                <p className="text-slate-200">{o.subject}</p>
                                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{o.delivery?.status} · {o.sent_at && new Date(o.sent_at).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ---------- Demo Links tab ----------
const DemosTab = ({ auth }) => {
    const [links, setLinks] = useState([]);
    const [f, setF] = useState({ demo_type: "supermarket", recipient_name: "", recipient_email: "", company: "", lead_id: "" });
    useEffect(() => { opsListDemoLinks(auth).then((d) => setLinks(d.demo_links || [])).catch(() => {}); }, [auth]);
    const create = async () => {
        try {
            const r = await opsCreateDemoLink({ ...auth, ...f, lead_id: f.lead_id || null });
            toast.success(`Link created · ${r.share_id}`);
            opsListDemoLinks(auth).then((d) => setLinks(d.demo_links || []));
        } catch { toast.error("Could not create link"); }
    };
    const copy = async (url) => {
        try { await navigator.clipboard.writeText(`${window.location.origin}${url}`); toast.success("Copied"); }
        catch { toast.error("Copy failed"); }
    };
    return (
        <div data-testid="tab-demos" className="space-y-5">
            <SectionHeader sub="Shareable assets" title="Demo link generator" />
            <div className="rounded-md border border-white/10 bg-ink-700/40 p-4 space-y-2" data-testid="demo-form">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <select value={f.demo_type} onChange={(e) => setF({ ...f, demo_type: e.target.value })}
                        data-testid="demo-type" className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white">
                        {["realtor", "insurance", "creator", "noldus", "supermarket"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input value={f.recipient_name} onChange={(e) => setF({ ...f, recipient_name: e.target.value })} placeholder="Recipient name"
                        data-testid="demo-name" className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                    <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Company"
                        data-testid="demo-company" className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                    <input value={f.recipient_email} onChange={(e) => setF({ ...f, recipient_email: e.target.value })} placeholder="recipient@co.com"
                        data-testid="demo-email" className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                    <input value={f.lead_id} onChange={(e) => setF({ ...f, lead_id: e.target.value })} placeholder="LEAD-XXXXXXXX (optional)"
                        data-testid="demo-lead-id" className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500" />
                    <button onClick={create} data-testid="demo-create" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400">
                        <Link2 size={11} /> Create link
                    </button>
                </div>
            </div>
            <div className="space-y-2" data-testid="demo-links-list">
                {links.map((l) => (
                    <div key={l.share_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-ink-700/40 p-3">
                        <div className="min-w-0 flex-1">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{l.share_id}</span>
                            <p className="truncate text-sm text-white">{l.recipient_name || "—"} ({l.company || "—"}) · {l.demo_type}</p>
                            <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{l.demo_url}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">{l.clicks || 0} clicks</span>
                            <button onClick={() => copy(l.demo_url)} data-testid={`demo-copy-${l.share_id}`} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                                <Copy size={10} /> Copy
                            </button>
                        </div>
                    </div>
                ))}
                {links.length === 0 && <p className="rounded-md border border-white/10 bg-ink-700/40 p-6 text-center text-sm text-slate-400">No demo links yet.</p>}
            </div>
        </div>
    );
};

// ---------- AI Assistant tab (Iter 52 · uses Avatar brain with actions) ----------
const AITab = ({ auth, me }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const sessionId = useRef(`s-${Date.now()}`);
    const scrollRef = useRef(null);
    const navigate = useNavigate();

    const handleAction = (a) => {
        switch (a.type) {
            case "route_to_demo":
                if (a.route) { toast.success(`Opening ${a.demo} demo`); window.open(a.route, "_blank", "noopener"); }
                break;
            case "open_pricing":
                window.open(a.route || "/pricing", "_blank", "noopener"); break;
            case "open_calendly":
                if (a.url) window.open(a.url, "_blank", "noopener"); break;
            case "escalate_to_founder":
                toast.message("Escalation logged for founder follow-up"); break;
            default: break;
        }
    };

    const send = async (textOverride) => {
        const msg = (textOverride ?? input).trim(); if (!msg || busy) return;
        const newMsgs = [...messages, { role: "user", text: msg }];
        setMessages(newMsgs);
        setInput(""); setBusy(true);
        try {
            const r = await avatarChat({
                session_id: sessionId.current,
                user_email: auth.email,
                history: newMsgs.map((m) => ({ role: m.role, content: m.text })),
                surface: "portal",
            });
            if (r.session_id) sessionId.current = r.session_id;
            setMessages((m) => [...m, { role: "assistant", text: r.reply, model: r.model, role_tag: r.role }]);
            (r.actions || []).forEach(handleAction);
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "AI error");
        } finally {
            setBusy(false);
            setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 100);
        }
    };
    const suggestions = [
        "Draft a force-reply email for an airport CFO",
        "How does the Exclusive Lead Engine compare to Apollo?",
        "Give me 3 objection-handlers for 'we already have a maintenance platform'",
        "Walk me through the supermarket demo",
    ];

    return (
        <div data-testid="tab-ai" className="space-y-4">
            <SectionHeader sub="Claude · multi-agent · with actions" title="AI Assistant" />
            <div className="flex flex-col rounded-md border border-white/10 bg-ink-700/40" style={{ height: "65vh" }}>
                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4" data-testid="ai-messages">
                    {messages.length === 0 && (
                        <div>
                            <p className="text-sm text-slate-400">Try one of these to start:</p>
                            <div className="mt-2 space-y-1">
                                {suggestions.map((s) => (
                                    <button key={s} onClick={() => send(s)} className="block w-full rounded-sm border border-white/5 bg-ink-900 p-2 text-left text-xs text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">{s}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`rounded-md border p-3 text-sm ${m.role === "user" ? "border-cyan-500/30 bg-cyan-500/5 text-white" : "border-white/10 bg-ink-900 text-slate-200"}`}>
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                {m.role === "user" ? "you" : `assistant${m.role_tag ? " · " + m.role_tag : ""}${m.model ? " · " + (m.model.includes("haiku") ? "fast" : "deep") : ""}`}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
                        </div>
                    ))}
                    {busy && <p className="text-xs text-slate-400">Thinking…</p>}
                </div>
                <div className="border-t border-white/5 p-3">
                    <div className="flex gap-2">
                        <input value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                            placeholder="Ask the avatar… (press Enter to send)" data-testid="ai-input"
                            className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                        <button onClick={() => send()} disabled={busy} data-testid="ai-send"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                            <Send size={11} /> Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ---------- Employees tab (executive + founder only) ----------
const EmployeesTab = ({ auth, me }) => {
    const [list, setList] = useState([]);
    const [invite, setInvite] = useState({ invitee_email: "", invitee_name: "" });
    const [last, setLast] = useState(null);
    const refresh = () => opsListEmployees(auth).then((d) => setList(d.employees || [])).catch(() => {});
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [auth]); // eslint-disable-line react-hooks/exhaustive-deps
    const send = async () => {
        if (!invite.invitee_email) { toast.error("Email required"); return; }
        try {
            const r = await opsInviteEmployee({ ...auth, ...invite });
            setLast(r); setInvite({ invitee_email: "", invitee_name: "" });
            toast.success("Invite created");
            refresh();
        } catch {
            toast.error("Could not create invite");
        }
    };
    return (
        <div data-testid="tab-employees" className="space-y-5">
            <SectionHeader sub="Team" title={`${list.length} members`} />
            {me.scopes.can_invite_employees && (
                <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="employee-invite-form">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Invite a new employee</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input value={invite.invitee_email} onChange={(e) => setInvite({ ...invite, invitee_email: e.target.value })} placeholder="new-hire@yourco.com" type="email" data-testid="invite-email"
                            className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                        <input value={invite.invitee_name} onChange={(e) => setInvite({ ...invite, invitee_name: e.target.value })} placeholder="Name (optional)" data-testid="invite-name"
                            className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
                        <button onClick={send} data-testid="invite-send" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400">
                            <UserPlus size={11} /> Send invite
                        </button>
                    </div>
                    {last && (
                        <div className="mt-3 rounded-sm border border-cyan-500/30 bg-ink-900 p-3" data-testid="invite-result">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Invite link (also emailed if RESEND_API_KEY set)</p>
                            <p className="mt-1 break-all font-mono text-xs text-cyan-200">{window.location.origin}/employee-access?token={last.invite_token}</p>
                            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/employee-access?token=${last.invite_token}`).then(() => toast.success("Copied"))}
                                className="mt-2 inline-flex items-center gap-1 rounded-md border border-cyan-500/30 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">
                                <Copy size={10} /> Copy link
                            </button>
                        </div>
                    )}
                </div>
            )}
            <div className="overflow-x-auto rounded-md border border-white/10 bg-ink-700/40" data-testid="employees-table">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-ink-900">
                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Name</th>
                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Email</th>
                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Role</th>
                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Leads</th>
                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Won</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((e) => (
                            <tr key={e.email} className="border-b border-white/5">
                                <td className="px-3 py-2 text-white">{e.name || e.email.split("@")[0]}</td>
                                <td className="px-3 py-2 font-mono text-[10px] text-slate-300">{e.email}</td>
                                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${roleBadge[e.role]?.cls}`}>{e.role}</span></td>
                                <td className="px-3 py-2 font-mono text-slate-300">{e.leads_assigned}</td>
                                <td className="px-3 py-2 font-mono text-emerald-300">{e.leads_won}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---------- Demo Revenue tab (founder only) ----------
const RANGE_OPTIONS = [
    { id: "today", label: "Today" },
    { id: "7d",    label: "Last 7 days" },
    { id: "30d",   label: "Last 30 days" },
    { id: "all",   label: "All time" },
];

const SORT_OPTIONS = [
    { id: "subscriptions",       label: "Most subscriptions", key: "subscriptions" },
    { id: "revenue",             label: "Most revenue",       key: "revenue" },
    { id: "enterprise_requests", label: "Most enterprise requests", key: "enterprise_requests" },
    { id: "conversion_rate",     label: "Highest conversion rate",  key: "conversion_rate" },
];

const kindTone = {
    demo_viewed:          "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    demo_completed:       "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    demo_saved:           "border-white/10 bg-ink-800 text-slate-300",
    demo_resumed:         "border-white/10 bg-ink-800 text-slate-300",
    cta_click:            "border-amber-500/30 bg-amber-500/5 text-amber-300",
    cta_clicked:          "border-amber-500/30 bg-amber-500/5 text-amber-300",
    meeting_booked:       "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    enterprise_request:   "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    subscription_started: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    purchase_completed:   "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    share_click:          "border-white/10 bg-ink-800 text-slate-300",
    share_send:           "border-white/10 bg-ink-800 text-slate-300",
};

// ======================================================================
// OUTBOUND TAB — Autonomous Outbound Sales Engine command center
// ======================================================================
const SEGMENT_LABELS = {
    realtor: "Realtors", insurance_agent: "Insurance", creator_influencer: "Creators",
    contractor_service: "Contractors", retail_chain: "Retail", airport_enterprise: "Airports",
    sales_team_agency: "Sales Teams", c_store: "C-Stores", supermarket_grocery: "Grocery",
};

const OUTBOUND_STATUS_TONE = {
    new:              "border-white/10 bg-ink-900 text-slate-300",
    scored:           "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    contacted:        "border-amber-500/30 bg-amber-500/5 text-amber-300",
    replied:          "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    replied_positive: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    not_interested:   "border-rose-500/30 bg-rose-500/5 text-rose-300",
    unsubscribed:     "border-rose-500/30 bg-rose-500/5 text-rose-300",
    cold:             "border-slate-500/30 bg-slate-500/5 text-slate-400",
};

const RISK_TONE = {
    low:    "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    high:   "border-rose-500/50 bg-rose-500/10 text-rose-300 animate-pulse",
};

const OutboundKPIStrip = ({ dash, prospects, sourceView }) => {
    if (!dash) return null;
    const k = dash.kpi || {};
    const state = dash.state || {};
    const limit = state.daily_limit ?? 10;

    // When a source filter is active, recompute all counters from the
    // already-loaded prospects array so the founder sees the filtered view.
    let filtered;
    if (sourceView === "real") {
        filtered = (prospects || []).filter((p) => p.source !== "internal_seed" && p.source !== "internal_archived");
    } else if (sourceView === "internal") {
        filtered = (prospects || []).filter((p) => p.source === "internal_seed");
    } else {
        filtered = null; // 'all' uses dash.kpi as-is
    }

    let total, scored, contacted, replied, positive, unsubs, replyRate;
    if (filtered) {
        total = filtered.length;
        scored = filtered.filter((p) => p.lead_score != null).length;
        contacted = filtered.filter((p) => (p.emails_sent || 0) > 0).length;
        replied = filtered.filter((p) => p.replied_at).length;
        positive = filtered.filter((p) => p.status === "replied_positive").length;
        unsubs = filtered.filter((p) => p.unsubscribed).length;
        // Bound reply_rate to <=100 — replies can outnumber contacts when
        // a manually-marked-replied prospect has emails_sent=0.
        replyRate = contacted ? Math.min(100, Math.round((replied / contacted) * 100)) : 0;
    } else {
        total = k.total_prospects ?? 0;
        scored = k.scored ?? 0;
        contacted = k.contacted ?? 0;
        replied = k.replied ?? 0;
        positive = k.positive ?? 0;
        unsubs = k.unsubscribed ?? 0;
        replyRate = Math.round((k.reply_rate || 0) * 100);
    }

    const sentToday = dash.sent_today ?? 0;
    const pct = Math.min(100, Math.round((sentToday / Math.max(1, limit)) * 100));
    const tiles = [
        { label: "Total prospects", value: total,    Icon: Users, tone: "white" },
        { label: "Scored",          value: scored,   Icon: Sparkles, tone: "cyan" },
        { label: "Contacted",       value: contacted,Icon: Mail, tone: "cyan" },
        { label: "Replied",         value: replied,  Icon: MessageSquare, tone: "white" },
        { label: "Positive",        value: positive, Icon: ThumbsUp, tone: "emerald" },
        { label: "Unsubs",          value: unsubs,   Icon: XCircle, tone: "rose" },
        { label: "Reply rate",      value: `${replyRate}%`, Icon: Activity, tone: "cyan" },
        { label: `Sent today (${sentToday}/${limit})`, value: `${pct}%`, Icon: Send, tone: "emerald" },
    ];
    const toneCls = {
        white:   "border-white/10 bg-ink-700/40",
        cyan:    "border-cyan-500/30 bg-cyan-500/5",
        emerald: "border-emerald-500/30 bg-emerald-500/5",
        rose:    "border-rose-500/30 bg-rose-500/5",
    };
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8" data-testid="outbound-kpi-strip">
            {tiles.map((t) => (
                <div key={t.label} className={`rounded-md border p-3 ${toneCls[t.tone]}`}>
                    <div className="flex items-center gap-2">
                        <t.Icon size={10} className="text-cyan-400" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 truncate">{t.label}</span>
                    </div>
                    <p className="font-heading mt-1 text-xl font-semibold text-white">{t.value}</p>
                </div>
            ))}
        </div>
    );
};

const DeliverabilityPanel = ({ dash, onTogglePause, busy }) => {
    if (!dash) return null;
    const d = dash.deliverability || {};
    const state = dash.state || {};
    const risk = (d.risk || "low").toLowerCase();
    const riskCls = RISK_TONE[risk] || RISK_TONE.low;
    const paused = Boolean(state.paused);
    return (
        <div
            className={`rounded-md border p-5 ${risk === "high" ? "border-rose-500/40 bg-rose-500/5" : "border-white/10 bg-ink-700/40"}`}
            data-testid="outbound-deliverability-panel"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Deliverability · last 7 days</p>
                    <div className="mt-2 flex items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${riskCls}`}
                            data-testid="outbound-risk-pill"
                        >
                            <AlertTriangle size={10} />
                            RISK · {risk}
                        </span>
                        {paused && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300" data-testid="outbound-paused-pill">
                                <Pause size={10} /> Paused
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={onTogglePause}
                    disabled={busy}
                    data-testid="outbound-pause-toggle"
                    className={`inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${paused ? "bg-emerald-500 text-ink-900 hover:bg-emerald-400" : "border border-rose-500/40 text-rose-300 hover:bg-rose-500/10"} disabled:opacity-60`}
                >
                    {paused ? <><Play size={11} /> Resume engine</> : <><Pause size={11} /> Pause engine</>}
                </button>
            </div>
            {risk === "high" && (
                <div className="mt-4 rounded-sm border border-rose-500/40 bg-rose-500/10 p-3" data-testid="outbound-risk-alert">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-200">
                        ⚠ High risk — outbound may auto-pause. Investigate bounce/complaint sources before resuming.
                    </p>
                </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                    ["Sent",         d.sent ?? 0],
                    ["Bounced",      d.bounced ?? 0],
                    ["Complained",   d.complained ?? 0],
                    ["Bounce rate",  `${Math.round((d.bounce_rate || 0) * 1000) / 10}%`],
                    ["Complaint rate", `${Math.round((d.complaint_rate || 0) * 10000) / 100}%`],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-sm border border-white/5 bg-ink-900 p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
                        <p className="font-heading mt-1 text-lg font-semibold text-white">{value}</p>
                    </div>
                ))}
            </div>
            {state.pause_reason && (
                <p className="mt-3 font-mono text-[10px] text-amber-300" data-testid="outbound-pause-reason">
                    Pause reason: {state.pause_reason}
                </p>
            )}
        </div>
    );
};

const AddProspectForm = ({ auth, onAdded }) => {
    const [f, setF] = useState({ business_name: "", contact_name: "", email: "", industry: "", website: "", location: "", linkedin_url: "", notes: "" });
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        if (!f.business_name || !f.email) { toast.error("Business name and email are required"); return; }
        setBusy(true);
        try {
            await opsOutboundAddProspect({ auth_email: auth.email, auth_token: auth.token, ...f });
            toast.success("Prospect added");
            setF({ business_name: "", contact_name: "", email: "", industry: "", website: "", location: "", linkedin_url: "", notes: "" });
            onAdded?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Could not add prospect");
        } finally { setBusy(false); }
    };
    return (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="outbound-add-form">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Add prospect</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                    ["business_name", "Business name *"],
                    ["contact_name",  "Contact name"],
                    ["email",         "Email *"],
                    ["industry",      "Industry"],
                    ["website",       "Website"],
                    ["location",      "Location"],
                    ["linkedin_url",  "LinkedIn URL"],
                ].map(([k, label]) => (
                    <input
                        key={k}
                        placeholder={label}
                        value={f[k]}
                        onChange={(e) => setF({ ...f, [k]: e.target.value })}
                        data-testid={`outbound-add-${k}`}
                        className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                    />
                ))}
            </div>
            <textarea
                placeholder="Notes"
                value={f.notes}
                onChange={(e) => setF({ ...f, notes: e.target.value })}
                data-testid="outbound-add-notes"
                rows={2}
                className="mt-2 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
                <button
                    onClick={submit}
                    disabled={busy}
                    data-testid="outbound-add-submit"
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                >
                    <Plus size={11} /> {busy ? "Adding…" : "Add prospect"}
                </button>
            </div>
        </div>
    );
};

const CsvUploadBox = ({ auth, onUploaded }) => {
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);
    const onFile = async (file) => {
        if (!file) return;
        setBusy(true);
        try {
            const r = await opsOutboundUploadProspects(auth.email, auth.token, file);
            toast.success(`Imported ${r.added} · skipped ${r.skipped}`);
            onUploaded?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Upload failed");
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };
    return (
        <div className="rounded-md border border-dashed border-white/15 bg-ink-700/30 p-4" data-testid="outbound-csv-upload">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CSV Upload</p>
                    <p className="mt-1 text-xs text-slate-400">
                        Columns supported: <span className="font-mono text-slate-300">business_name, contact_name, email, industry, website, location, linkedin_url, notes</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        data-testid="outbound-csv-input"
                        onChange={(e) => onFile(e.target.files?.[0])}
                    />
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={busy}
                        data-testid="outbound-csv-btn"
                        className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-60"
                    >
                        <Upload size={11} /> {busy ? "Uploading…" : "Upload CSV"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LinkedinModal = ({ prospect, auth, onClose, onChange }) => {
    const [busy, setBusy] = useState(false);
    const [connect, setConnect] = useState(prospect?.linkedin_connect_body || "");
    const [followup, setFollowup] = useState(prospect?.linkedin_followup_body || "");

    useEffect(() => {
        setConnect(prospect?.linkedin_connect_body || "");
        setFollowup(prospect?.linkedin_followup_body || "");
    }, [prospect]);

    const generate = async () => {
        setBusy(true);
        try {
            const r = await opsOutboundLinkedinGenerate({ ...auth, prospect_id: prospect.id });
            setConnect(r.connect_body || "");
            setFollowup(r.followup_body || "");
            toast.success("LinkedIn messages generated");
            onChange?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "AI generation failed");
        } finally { setBusy(false); }
    };

    const copyText = async (text, label) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied`);
        } catch { toast.error("Copy failed"); }
    };

    const markSent = async (which) => {
        try {
            await opsOutboundLinkedinMarkSent({ ...auth, prospect_id: prospect.id }, which);
            toast.success(`Marked ${which} as sent`);
            onChange?.();
        } catch { toast.error("Could not mark sent"); }
    };

    if (!prospect) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 p-4 backdrop-blur-sm"
            data-testid="outbound-linkedin-modal"
            onClick={onClose}
        >
            <div
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-cyan-500/30 bg-ink-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">LinkedIn Assist · Manual Send</p>
                        <h3 className="font-heading mt-1 text-xl font-semibold text-white">{prospect.business_name}</h3>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{prospect.contact_name || "—"} · {prospect.email}</p>
                    </div>
                    <button onClick={onClose} data-testid="outbound-linkedin-close" className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                        onClick={generate}
                        disabled={busy}
                        data-testid="outbound-linkedin-generate"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                    >
                        <Sparkles size={11} /> {busy ? "Generating…" : (connect ? "Regenerate with AI" : "Generate with AI")}
                    </button>
                    {prospect.linkedin_url && (
                        <a
                            href={prospect.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            data-testid="outbound-linkedin-open-profile"
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/10"
                        >
                            <ExternalLink size={11} /> Open LinkedIn profile
                        </a>
                    )}
                </div>

                {/* Connection message */}
                <div className="mt-5 rounded-md border border-white/10 bg-ink-700/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Connection request (≤300 chars)</p>
                        {prospect.linkedin_connect_sent_at && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                                <Check size={9} /> Sent
                            </span>
                        )}
                    </div>
                    <textarea
                        value={connect}
                        onChange={(e) => setConnect(e.target.value)}
                        rows={4}
                        data-testid="outbound-linkedin-connect-body"
                        placeholder="Generate with AI above, or paste your own."
                        className="mt-2 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => copyText(connect, "Connect message")}
                            disabled={!connect}
                            data-testid="outbound-linkedin-copy-connect"
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-40"
                        >
                            <Copy size={11} /> Copy
                        </button>
                        <button
                            onClick={() => markSent("connect")}
                            data-testid="outbound-linkedin-mark-connect-sent"
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500/10"
                        >
                            <Check size={11} /> Mark as sent
                        </button>
                    </div>
                </div>

                {/* Follow-up message */}
                <div className="mt-4 rounded-md border border-white/10 bg-ink-700/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Follow-up after accept (≤600 chars)</p>
                        {prospect.linkedin_followup_sent_at && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                                <Check size={9} /> Sent
                            </span>
                        )}
                    </div>
                    <textarea
                        value={followup}
                        onChange={(e) => setFollowup(e.target.value)}
                        rows={5}
                        data-testid="outbound-linkedin-followup-body"
                        placeholder="Generate with AI above, or paste your own."
                        className="mt-2 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => copyText(followup, "Follow-up message")}
                            disabled={!followup}
                            data-testid="outbound-linkedin-copy-followup"
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-40"
                        >
                            <Copy size={11} /> Copy
                        </button>
                        <button
                            onClick={() => markSent("followup")}
                            data-testid="outbound-linkedin-mark-followup-sent"
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500/10"
                        >
                            <Check size={11} /> Mark as sent
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProspectRow = ({ p, auth, onChange, onLinkedin }) => {
    const [busy, setBusy] = useState(false);
    const score = async () => {
        setBusy(true);
        try {
            await opsOutboundScore({ ...auth, prospect_id: p.id });
            toast.success("AI scored prospect");
            onChange?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Scoring failed");
        } finally { setBusy(false); }
    };
    const markReplied = async (positive) => {
        const body = window.prompt(`Reply body (optional) — marking as ${positive === true ? "positive" : positive === false ? "not interested" : "replied"}:`, "");
        if (body === null) return;
        setBusy(true);
        try {
            await opsOutboundMarkReplied({ ...auth, prospect_id: p.id, reply_body: body, positive });
            toast.success("Reply recorded");
            onChange?.();
        } catch { toast.error("Could not mark replied"); }
        finally { setBusy(false); }
    };

    const scoreBadge = p.lead_score == null
        ? "border-white/10 bg-ink-900 text-slate-400"
        : p.lead_score >= 80 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : p.lead_score >= 60 ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
        : p.lead_score >= 40 ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-rose-500/40 bg-rose-500/10 text-rose-300";

    return (
        <tr className="border-t border-white/5 hover:bg-white/5" data-testid={`outbound-prospect-row-${p.id}`}>
            <td className="px-3 py-2">
                <p className="text-sm font-semibold text-white">{p.business_name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">{p.contact_name || "—"}</p>
                    {p.source_demo && (
                        <span
                            className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.22em] text-emerald-300"
                            data-testid={`outbound-row-demo-tag-${p.id}`}
                            title="Seeded from demo viewer"
                        >
                            demo · {p.source_demo}
                        </span>
                    )}
                    {p.not_before_at && new Date(p.not_before_at) > new Date() && (
                        <span
                            className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.22em] text-amber-300"
                            title={`Outreach delayed until ${p.not_before_at}`}
                        >
                            scheduled
                        </span>
                    )}
                </div>
            </td>
            <td className="px-3 py-2 text-xs text-slate-300">{p.email}</td>
            <td className="px-3 py-2">
                {p.target_segment ? (
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                        {SEGMENT_LABELS[p.target_segment] || p.target_segment}
                    </span>
                ) : <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">—</span>}
            </td>
            <td className="px-3 py-2">
                <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-mono text-[10px] ${scoreBadge}`}>
                    {p.lead_score ?? "—"}
                </span>
            </td>
            <td className="px-3 py-2">
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${OUTBOUND_STATUS_TONE[p.status] || OUTBOUND_STATUS_TONE.new}`}>
                    {p.status}
                </span>
            </td>
            <td className="px-3 py-2 text-center font-mono text-xs text-slate-300">{p.emails_sent || 0}</td>
            <td className="px-3 py-2">
                <div className="flex flex-wrap items-center justify-end gap-1">
                    <button
                        onClick={score}
                        disabled={busy}
                        title="AI Score"
                        data-testid={`outbound-row-score-${p.id}`}
                        className="rounded-md border border-white/10 p-1.5 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-40"
                    >
                        <Sparkles size={12} />
                    </button>
                    {/* Inline LinkedIn quick-actions — shown only when messages have been generated */}
                    {p.linkedin_connect_body && (
                        <button
                            onClick={async () => {
                                try { await navigator.clipboard.writeText(p.linkedin_connect_body); toast.success("Connect copied"); }
                                catch { toast.error("Copy failed"); }
                            }}
                            title="Copy connect message"
                            data-testid={`outbound-row-copy-connect-${p.id}`}
                            className="rounded-md border border-white/10 p-1.5 text-cyan-300 hover:border-cyan-500/40 hover:bg-cyan-500/10"
                        >
                            <Copy size={12} />
                        </button>
                    )}
                    {p.linkedin_url && (
                        <a
                            href={p.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open LinkedIn profile"
                            data-testid={`outbound-row-open-li-${p.id}`}
                            className="rounded-md border border-white/10 p-1.5 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                        >
                            <ExternalLink size={12} />
                        </a>
                    )}
                    <button
                        onClick={() => onLinkedin?.(p)}
                        title="LinkedIn Assist (generate / edit / mark sent)"
                        data-testid={`outbound-row-linkedin-${p.id}`}
                        className="rounded-md border border-white/10 p-1.5 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                    >
                        <Linkedin size={12} />
                    </button>
                    <button
                        onClick={() => markReplied(true)}
                        disabled={busy}
                        title="Mark replied · positive"
                        data-testid={`outbound-row-reply-positive-${p.id}`}
                        className="rounded-md border border-white/10 p-1.5 text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                        <ThumbsUp size={12} />
                    </button>
                    <button
                        onClick={() => markReplied(false)}
                        disabled={busy}
                        title="Mark not interested"
                        data-testid={`outbound-row-reply-negative-${p.id}`}
                        className="rounded-md border border-white/10 p-1.5 text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 disabled:opacity-40"
                    >
                        <ThumbsDown size={12} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

const DraftCard = ({ draft, auth, onChange }) => {
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(false);
    const [body, setBody] = useState(draft.body);
    const approve = async () => {
        setBusy(true);
        try {
            await opsOutboundDraftApprove({ ...auth, draft_id: draft.id, edited_body: editing ? body : undefined });
            toast.success("Draft sent");
            onChange?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Send failed");
        } finally { setBusy(false); }
    };
    const reject = async () => {
        setBusy(true);
        try {
            await opsOutboundDraftReject({ ...auth, draft_id: draft.id });
            toast.success("Draft rejected");
            onChange?.();
        } catch { toast.error("Could not reject"); }
        finally { setBusy(false); }
    };
    return (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid={`outbound-draft-${draft.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Reply draft · pending approval</p>
                    <p className="mt-1 text-sm font-semibold text-white">{draft.business_name}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">{draft.prospect_email}</p>
                </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-cyan-200">Subject: <span className="font-mono text-slate-200">{draft.subject}</span></p>
            {editing ? (
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    data-testid={`outbound-draft-body-${draft.id}`}
                    className="mt-2 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                />
            ) : (
                <pre className="mt-2 whitespace-pre-wrap rounded-md border border-white/5 bg-ink-900 p-3 font-mono text-xs text-slate-200" data-testid={`outbound-draft-preview-${draft.id}`}>
                    {body}
                </pre>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                    onClick={() => setEditing((p) => !p)}
                    data-testid={`outbound-draft-edit-${draft.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                >
                    <FileText size={11} /> {editing ? "Preview" : "Edit"}
                </button>
                <button
                    onClick={reject}
                    disabled={busy}
                    data-testid={`outbound-draft-reject-${draft.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-rose-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                >
                    <XCircle size={11} /> Reject
                </button>
                <button
                    onClick={approve}
                    disabled={busy}
                    data-testid={`outbound-draft-approve-${draft.id}`}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-emerald-400 disabled:opacity-60"
                >
                    <CheckCircle2 size={11} /> Approve & send
                </button>
            </div>
        </div>
    );
};

const DiagnosticsPanel = ({ auth, dash, onChange }) => {
    const [diag, setDiag] = useState(null);
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);

    const refreshDiag = async () => {
        try {
            const r = await opsOutboundDiagnostics(auth);
            setDiag(r);
        } catch { /* ignore */ }
    };

    const archiveInternal = async () => {
        if (!window.confirm("Archive ALL internal seed prospects? They will be moved to source='internal_archived' and added to the suppression list. KPIs reset to real-source-only.")) return;
        setBusy(true);
        try {
            const r = await opsOutboundArchiveInternal(auth);
            toast.success(`Archived ${r.archived} internal seeds`);
            await refreshDiag();
            onChange?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Archive failed");
        } finally { setBusy(false); }
    };

    const resetDaily = async () => {
        if (!window.confirm("Reset today's send counter? This deletes today's 'sent' event records so the daily 50/day cap resets — testing only, will skew reply-rate stats.")) return;
        setBusy(true);
        try {
            const r = await opsOutboundResetDaily(auth);
            toast.success(`Reset · ${r.deleted} sent records cleared`);
            await refreshDiag();
            onChange?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Reset failed");
        } finally { setBusy(false); }
    };

    const setMode = async (limit, label) => {
        if (!window.confirm(`Switch to ${label} (daily cap = ${limit})?`)) return;
        setBusy(true);
        try {
            await opsOutboundSetDailyLimit({ ...auth, limit });
            toast.success(`${label} active · daily cap ${limit}`);
            await refreshDiag();
            onChange?.();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Mode change failed");
        } finally { setBusy(false); }
    };

    useEffect(() => { if (open) refreshDiag(); /* eslint-disable-next-line */ }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4" data-testid="outbound-diagnostics-panel">
            <button
                onClick={() => setOpen((v) => !v)}
                data-testid="outbound-diagnostics-toggle"
                className="flex w-full items-center justify-between text-left"
            >
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Diagnostics & admin</p>
                    <p className="mt-1 text-xs text-slate-400">
                        See exactly why a cycle returned 0/0/0, archive internal test seeds, or reset today's send counter for verification runs.
                    </p>
                </div>
                <ChevronDown size={14} className={`text-amber-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="mt-4 space-y-3" data-testid="outbound-diagnostics-body">
                    {diag ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="outbound-diagnostics-tiles">
                            {[
                                ["Daily limit",     diag.daily_limit],
                                ["Sent today",      diag.sent_today],
                                ["Remaining today", diag.remaining_today],
                                ["Eligible to send",diag.eligible_for_initial_send],
                                ["Unscored",        diag.unscored_prospects],
                                ["Internal seeds",  `${diag.internal_seed_count} / ${diag.internal_cap}`],
                                ["Archived",        diag.internal_archived_count],
                                ["Engine",          diag.paused ? "PAUSED" : "running"],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-sm border border-white/5 bg-ink-900 p-2">
                                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
                                    <p className="font-heading mt-0.5 text-sm font-semibold text-white">{value}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400" data-testid="outbound-diagnostics-loading">Loading diagnostics…</p>
                    )}
                    {diag?.blockers?.length > 0 && (
                        <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-2" data-testid="outbound-blockers">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">Active blockers</p>
                            <p className="mt-0.5 font-mono text-xs text-amber-200">{diag.blockers.join(" · ")}</p>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setMode(10, "Low Credit Mode")}
                            disabled={busy}
                            data-testid="outbound-mode-low"
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
                            title="10 leads/run · 5 emails/click · 10/day cap · score ≥70 to send"
                        >
                            <Sparkles size={11} /> Low credit mode (10/day)
                        </button>
                        <button
                            onClick={() => setMode(50, "Standard Mode")}
                            disabled={busy}
                            data-testid="outbound-mode-standard"
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-60"
                            title="Scale up — 50/day cap"
                        >
                            <Zap size={11} /> Standard (50/day)
                        </button>
                        <button
                            onClick={archiveInternal}
                            disabled={busy}
                            data-testid="outbound-archive-internal"
                            className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 hover:bg-amber-500/10 disabled:opacity-60"
                        >
                            <Trash2 size={11} /> Archive internal seeds
                        </button>
                        <button
                            onClick={resetDaily}
                            disabled={busy}
                            data-testid="outbound-reset-daily"
                            className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 hover:bg-amber-500/10 disabled:opacity-60"
                        >
                            <RefreshCcw size={11} /> Reset daily counter
                        </button>
                        <button
                            onClick={refreshDiag}
                            disabled={busy}
                            data-testid="outbound-diagnostics-refresh"
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 p-2 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-60"
                        >
                            <RefreshCcw size={11} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SourcesStatusRow = ({ dash }) => {
    if (!dash) return null;
    const sources = dash.sources_configured || {};
    const last = dash.last_autopilot_run;
    const items = [
        { id: "apollo",     label: "Apollo.io",     desc: "B2B sourcing" },
        { id: "outscraper", label: "Outscraper",    desc: "Google Maps" },
        { id: "clay",       label: "Clay",          desc: "Enrichment / orchestration" },
        { id: "instantly",  label: "Instantly.ai",  desc: "Sender (Phase B)" },
        { id: "smartlead",  label: "Smartlead",     desc: "Sender (Phase B)" },
    ];
    const lastRunAt = last?.started_at;
    let lastRunRel = "never";
    if (lastRunAt) {
        const elapsedMs = Date.now() - new Date(lastRunAt).getTime();
        const mins = Math.round(elapsedMs / 60000);
        lastRunRel = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
    }
    return (
        <div
            className="rounded-md border border-white/10 bg-ink-700/30 p-4"
            data-testid="outbound-sources-row"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Lead sources · daily autopilot</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                        Last cycle: <span className="text-slate-200" data-testid="outbound-last-autopilot">{lastRunRel}</span>
                        {last && (
                            <> · seeded {last.seeded?.added || 0} · scored {last.scored || 0} · sent {last.sent_this_cycle || 0}</>
                        )}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {items.map((it) => {
                    const ok = !!sources[it.id];
                    return (
                        <span
                            key={it.id}
                            data-testid={`outbound-source-${it.id}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] ${ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-ink-900 text-slate-500"}`}
                            title={it.desc}
                        >
                            {ok ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                            {it.label}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

// ─────────── Iter 68 · System Signal Light ───────────
// At-a-glance traffic light for the outbound engine. Reads dashboard.system_status.
// Levels: green (Operational) · yellow (Degraded / Paused) · red (Stalled).
const SystemSignalLight = ({ status, state }) => {
    const [expanded, setExpanded] = React.useState(false);
    const level = status?.level || "red";
    const label = status?.label || (state?.paused ? "Paused" : "Unknown");
    const summary = status?.summary || (state?.paused ? "Engine paused by operator." : "No telemetry yet.");
    const workers = status?.workers || [];
    const reasons = status?.reasons || [];
    const optionalInactive = status?.optional_inactive || [];

    const TONE = {
        green:  { dot: "bg-emerald-400", glow: "shadow-[0_0_24px_rgba(16,185,129,0.55)]",
                  border: "border-emerald-500/40", bg: "bg-emerald-500/[0.06]",
                  label: "text-emerald-300", icon: "text-emerald-400" },
        yellow: { dot: "bg-amber-400",   glow: "shadow-[0_0_24px_rgba(251,191,36,0.55)]",
                  border: "border-amber-500/40", bg: "bg-amber-500/[0.06]",
                  label: "text-amber-300", icon: "text-amber-400" },
        red:    { dot: "bg-rose-400",    glow: "shadow-[0_0_24px_rgba(244,63,94,0.55)]",
                  border: "border-rose-500/40", bg: "bg-rose-500/[0.06]",
                  label: "text-rose-300", icon: "text-rose-400" },
    }[level] || {
        dot: "bg-slate-400", glow: "", border: "border-slate-500/30", bg: "bg-slate-500/5",
        label: "text-slate-300", icon: "text-slate-400",
    };

    return (
        <div data-testid="system-signal-light"
             data-signal-level={level}
             className={`rounded-md border ${TONE.border} ${TONE.bg} px-4 py-3.5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className={`relative inline-flex h-3 w-3 flex-shrink-0 items-center justify-center`}>
                        {level === "green" && (
                            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${TONE.dot} opacity-60`} />
                        )}
                        <span className={`relative inline-flex h-3 w-3 rounded-full ${TONE.dot} ${TONE.glow}`} />
                    </span>
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                            Engine Signal
                        </p>
                        <p className={`font-heading text-lg font-semibold ${TONE.label}`} data-testid="signal-label">
                            {label}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <p className="font-mono text-[11px] text-slate-400" data-testid="signal-summary">
                        {summary}
                    </p>
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        data-testid="signal-toggle"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300"
                    >
                        {expanded ? "Hide" : "Workers"} <ChevronDown size={10} className={expanded ? "rotate-180" : ""} />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="mt-3 border-t border-white/5 pt-3" data-testid="signal-workers">
                    {/* Active worker rows */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {workers.length === 0 && (
                            <p className="font-mono text-[10px] text-slate-500" data-testid="signal-no-workers">
                                No worker heartbeats yet — boot up will register on first tick.
                            </p>
                        )}
                        {workers.map((w) => (
                            <div key={w.worker} data-testid={`worker-${w.worker}`}
                                 className={`rounded-md border px-3 py-2 ${
                                     w.is_stale ? "border-rose-500/30 bg-rose-500/5"
                                                : "border-white/10 bg-white/[0.03]"
                                 }`}>
                                <div className="flex items-center justify-between">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                                        {w.worker}
                                    </p>
                                    <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] ${
                                        w.is_stale ? "text-rose-300" : "text-emerald-300"
                                    }`}>
                                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                                            w.is_stale ? "bg-rose-400" : "bg-emerald-400"
                                        }`} />
                                        {w.is_stale ? "stale" : "fresh"}
                                    </span>
                                </div>
                                <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                                    {w.ticks_total} ticks · {w.errors_total} errors ·
                                    last {w.seconds_since_tick != null ? `${w.seconds_since_tick}s ago` : "—"}
                                </p>
                                {w.last_error && (
                                    <p className="mt-1 truncate font-mono text-[9px] text-rose-300" title={w.last_error}>
                                        {w.last_error}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Optional / intentionally inactive workers */}
                    {optionalInactive.length > 0 && (
                        <div className="mt-3 rounded-md border border-white/5 bg-white/[0.02] p-2.5">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                Optional · not running
                            </p>
                            <ul className="mt-1 space-y-0.5">
                                {optionalInactive.map((w) => (
                                    <li key={w.worker} className="font-mono text-[10px] text-slate-400">
                                        <span className="text-slate-300">{w.worker}</span> — {w.reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Reasons */}
                    {reasons.length > 0 && (
                        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                            <span className="text-slate-400">Signal reasons:</span> {reasons.join(" · ")}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────── Iter 68b · Operator View · the 7-point engine status ───────────
// Single block answering: Is alive? What's it doing? Leads waiting? Sent? Failed?
// Stuck? Last worker run? Next scheduled action?
const OperatorView = ({ auth, dash }) => {
    const [queue, setQueue] = React.useState(null);
    const [refreshing, setRefreshing] = React.useState(false);
    const [auto, setAuto] = React.useState(true);

    const refresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            const q = await opsOutboundQueueStatus(auth);
            setQueue(q);
        } catch { /* signal-light already shows engine health; this section just shows queue */ }
        finally { setRefreshing(false); }
    }, [auth]);

    React.useEffect(() => { refresh(); }, [refresh]);

    // Auto-refresh every 30s while user is on the tab
    React.useEffect(() => {
        if (!auto) return;
        const id = setInterval(refresh, 30000);
        return () => clearInterval(id);
    }, [auto, refresh]);

    const sys = dash?.system_status;
    const warmup = dash?.warmup;
    const last = dash?.last_autopilot_run;
    const lastRunAgo = last?.started_at ? Math.max(0, Math.floor((Date.now() - new Date(last.started_at).getTime()) / 60000)) : null;
    const nextScheduled = (() => {
        if (sys?.workers?.length) {
            const sched = sys.workers.find((w) => w.worker === "scheduler_loop");
            if (sched && sched.seconds_since_tick != null) {
                const ttl = Math.max(0, (sched.interval_sec || 300) - sched.seconds_since_tick);
                return ttl <= 60 ? "any moment" : `~${Math.round(ttl / 60)} min`;
            }
        }
        return "—";
    })();

    const Card = ({ label, value, tone = "slate", testid, hint }) => (
        <div data-testid={testid}
             className={`rounded-md border px-3 py-2.5 ${
                 tone === "rose"    ? "border-rose-500/30 bg-rose-500/5" :
                 tone === "amber"   ? "border-amber-500/30 bg-amber-500/5" :
                 tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/5" :
                 tone === "cyan"    ? "border-cyan-500/30 bg-cyan-500/5" :
                                       "border-white/10 bg-white/[0.03]"
             }`}>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className={`font-heading mt-0.5 text-2xl font-semibold tabular-nums ${
                 tone === "rose"    ? "text-rose-300" :
                 tone === "amber"   ? "text-amber-300" :
                 tone === "emerald" ? "text-emerald-300" :
                 tone === "cyan"    ? "text-cyan-300" :
                                       "text-white"
            }`}>{value}</p>
            {hint && <p className="mt-0.5 font-mono text-[9px] text-slate-500">{hint}</p>}
        </div>
    );

    return (
        <div data-testid="operator-view"
             className="rounded-md border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.04] to-emerald-500/[0.02] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Activity size={13} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Operator View · what the engine is doing right now
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAuto((a) => !a)}
                        data-testid="operator-auto-toggle"
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] ${
                            auto ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                 : "border-white/10 bg-ink-700/40 text-slate-400"
                        }`}>
                        {auto ? "● Auto-refresh 30s" : "○ Manual"}
                    </button>
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        data-testid="operator-refresh"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300 disabled:opacity-60">
                        <RefreshCcw size={10} className={refreshing ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {/* The 7-point answer grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {/* 1. Is the engine alive? */}
                <Card
                    testid="operator-alive"
                    label="1 · Engine alive?"
                    value={sys?.label || "—"}
                    tone={sys?.level === "green" ? "emerald" : sys?.level === "yellow" ? "amber" : "rose"}
                    hint={sys?.summary?.slice(0, 60)}
                />
                {/* 2. What is it doing right now? */}
                <Card
                    testid="operator-doing"
                    label="2 · Doing right now"
                    value={
                        queue?.in_flight_sends?.count > 0
                            ? `Sending ${queue.in_flight_sends.count}`
                            : queue?.scoring_backlog?.count > 0
                                ? `Scoring ${queue.scoring_backlog.count}`
                                : queue?.send_eligible_now?.count > 0
                                    ? "Idle · ready"
                                    : "Idle"
                    }
                    tone={queue?.in_flight_sends?.count > 0 ? "cyan" : "slate"}
                    hint={dash?.state?.paused ? "Engine paused" : `Cap ${warmup?.effective_cap || dash?.state?.daily_limit || "—"}/day`}
                />
                {/* 3. Leads waiting */}
                <Card
                    testid="operator-waiting"
                    label="3 · Leads waiting"
                    value={(queue?.scoring_backlog?.count || 0) + (queue?.send_eligible_now?.count || 0)}
                    tone={(queue?.send_eligible_now?.count || 0) > 0 ? "cyan" : "slate"}
                    hint={`${queue?.scoring_backlog?.count || 0} unscored · ${queue?.send_eligible_now?.count || 0} ready`}
                />
                {/* 4. Emails sent today */}
                <Card
                    testid="operator-sent"
                    label="4 · Sent today"
                    value={dash?.sent_today ?? 0}
                    tone="emerald"
                    hint={`${dash?.deliverability?.bounce_rate != null ? Math.round(dash.deliverability.bounce_rate * 100) : 0}% bounce`}
                />
                {/* 5. Stuck */}
                <Card
                    testid="operator-stuck"
                    label="5 · Stuck (>7d)"
                    value={queue?.stalled_no_progress?.count || 0}
                    tone={(queue?.stalled_no_progress?.count || 0) > 0 ? "amber" : "slate"}
                    hint={queue?.stalled_no_progress?.count > 0 ? "Will be marked cold soon" : "—"}
                />
                {/* 6. Failed */}
                <Card
                    testid="operator-failed"
                    label="6 · Failed (errors)"
                    value={sys?.total_errors || 0}
                    tone={sys?.total_errors > 0 ? "rose" : "slate"}
                    hint={sys?.error_rate != null ? `${Math.round((sys.error_rate || 0) * 100)}% error rate` : "—"}
                />
                {/* 7. Last worker run */}
                <Card
                    testid="operator-last-run"
                    label="7 · Last cycle"
                    value={lastRunAgo != null ? (lastRunAgo === 0 ? "just now" : `${lastRunAgo} min ago`) : "—"}
                    tone="slate"
                    hint={last?.status || "—"}
                />
                {/* Extra: Next scheduled */}
                <Card
                    testid="operator-next"
                    label="Next scheduled"
                    value={nextScheduled}
                    tone="cyan"
                    hint="scheduler_loop tick"
                />
            </div>

            {/* Hot leads + recent sends + recent replies — execution evidence */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {/* Hot leads */}
                <div data-testid="operator-hot-leads-block"
                     className="rounded-md border border-rose-500/20 bg-rose-500/[0.05] p-3">
                    <div className="flex items-center gap-1.5">
                        <Flame size={11} className="text-rose-300" />
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">Hot leads</p>
                        <span className="ml-auto font-mono text-[10px] text-rose-300">
                            {queue?.hot_leads?.count || 0}
                        </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                        {(queue?.hot_leads?.sample || []).length === 0 ? (
                            <li className="font-mono text-[10px] text-slate-500">No positive replies yet.</li>
                        ) : (
                            queue.hot_leads.sample.map((p) => (
                                <li key={p.id} className="truncate font-mono text-[10px] text-slate-200">
                                    <span className="text-rose-300">→</span> {p.business_name || p.email}
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Recent sends */}
                <div data-testid="operator-recent-sends"
                     className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                    <div className="flex items-center gap-1.5">
                        <Send size={11} className="text-emerald-300" />
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Last 5 sends</p>
                    </div>
                    <ul className="mt-2 space-y-1">
                        {(queue?.recent_sends || []).length === 0 ? (
                            <li className="font-mono text-[10px] text-slate-500">No sends in last 60 min.</li>
                        ) : (
                            queue.recent_sends.map((e, i) => (
                                <li key={i} className="truncate font-mono text-[10px] text-slate-200">
                                    <span className="text-emerald-300">{e.kind || "sent"}</span> · {e.email}
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Recent replies */}
                <div data-testid="operator-recent-replies"
                     className="rounded-md border border-cyan-500/20 bg-cyan-500/[0.04] p-3">
                    <div className="flex items-center gap-1.5">
                        <Inbox size={11} className="text-cyan-300" />
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Last 5 replies</p>
                    </div>
                    <ul className="mt-2 space-y-1">
                        {(queue?.recent_replies || []).length === 0 ? (
                            <li className="font-mono text-[10px] text-slate-500">No replies captured yet.</li>
                        ) : (
                            queue.recent_replies.map((p) => (
                                <li key={p.id} className="truncate font-mono text-[10px] text-slate-200">
                                    <span className={`${p.reply_category === "Interested" ? "text-emerald-300" : p.reply_category === "Not Interested" ? "text-rose-300" : "text-cyan-300"}`}>
                                        {p.reply_category || "?"}
                                    </span> · {p.business_name || p.email}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const OutboundTab = ({ auth }) => {
    const [dash, setDash] = useState(null);
    const [prospects, setProspects] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [busy, setBusy] = useState(false);
    const [view, setView] = useState("prospects"); // prospects | drafts
    const [filter, setFilter] = useState("all");
    const [liProspect, setLiProspect] = useState(null);
    const [sourceView, setSourceView] = useState("all"); // all | real | internal

    const refresh = async () => {
        try {
            const [d, p, dr] = await Promise.all([
                opsOutboundDashboard(auth),
                opsOutboundListProspects(auth),
                opsOutboundDraftsList(auth),
            ]);
            setDash(d);
            setProspects(p.items || []);
            setDrafts(dr.items || []);
        } catch (e) {
            const det = e?.response?.data?.detail;
            toast.error(typeof det === "string" ? det : "Could not load outbound data");
        }
    };
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [auth.email]); // eslint-disable-line react-hooks/exhaustive-deps

    const togglePause = async () => {
        const paused = !(dash?.state?.paused);
        setBusy(true);
        try {
            await opsOutboundPause({ ...auth, paused, reason: paused ? "manual_pause_by_founder" : null });
            toast.success(paused ? "Outbound paused" : "Outbound resumed");
            refresh();
        } catch { toast.error("Could not toggle pause"); }
        finally { setBusy(false); }
    };

    const scoreAll = async () => {
        setBusy(true);
        try {
            const r = await opsOutboundScoreAll(auth);
            toast.success(`Scored ${r.scored} prospects`);
            refresh();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Score-all failed");
        } finally { setBusy(false); }
    };

    const seedFromDemos = async () => {
        setBusy(true);
        try {
            const r = await opsOutboundSeedFromDemos(auth);
            toast.success(`Seeded ${r.added} demo viewers · skipped ${r.skipped}`);
            refresh();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Seed failed");
        } finally { setBusy(false); }
    };

    const imapPoll = async () => {
        setBusy(true);
        try {
            const r = await opsOutboundImapPollNow(auth);
            if (r.ok) toast.success(`IMAP scan · ${r.scanned} new · ${r.matched} matched`);
            else toast.message(`IMAP ${r.reason || "not configured"}`);
            if (r.matched) refresh();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "IMAP poll failed");
        } finally { setBusy(false); }
    };

    const pushHotLeads = async () => {
        if (!window.confirm("Push re-engage email to all opens/clicks/demo-viewers who haven't replied?")) return;
        setBusy(true);
        try {
            const r = await opsOutboundPushHotLeads(auth);
            toast.success(`Hot leads pushed · ${r.sent}/${r.candidates} re-engaged`);
            refresh();
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Push hot leads failed");
        } finally { setBusy(false); }
    };

    const runTick = async () => {
        setBusy(true);
        try {
            const r = await opsOutboundAutopilotNow(auth);
            if (r.status === "running") {
                toast.success("Autopilot started — refreshing dashboard in 60s…");
                // Poll dashboard every 15s until last_autopilot_run.status flips to completed
                let polls = 0;
                const interval = setInterval(async () => {
                    polls += 1;
                    try {
                        const fresh = await opsOutboundDashboard(auth);
                        const last = fresh?.last_autopilot_run;
                        if (last && last.status === "completed") {
                            clearInterval(interval);
                            const seeded = last.seeded?.added || 0;
                            const scored = last.scored || 0;
                            const sent = last.sent_this_cycle || 0;
                            const reasons = (last.reasons || []).join(" · ");
                            const head = `Autopilot complete · seeded ${seeded} · scored ${scored} · sent ${sent}`;
                            if (seeded === 0 && scored === 0 && sent === 0 && reasons) {
                                toast.message(`${head}  →  ${reasons}`);
                            } else {
                                toast.success(head);
                            }
                            refresh();
                        } else if (last && last.status === "failed") {
                            clearInterval(interval);
                            toast.error(`Autopilot failed: ${last.error || "unknown"}`);
                            refresh();
                        } else if (polls >= 30) { // 30 × 15s = 7.5 min cap
                            clearInterval(interval);
                            toast.message("Autopilot still running — check Last cycle later");
                            refresh();
                        }
                    } catch (_e) {
                        // ignore poll error; will retry
                    }
                }, 15000);
            } else {
                // Fallback shape (old sync response)
                const seeded = r.seeded?.added || 0;
                const scored = r.scored || 0;
                const sent = r.sent_this_cycle || 0;
                toast.success(`Autopilot complete · seeded ${seeded} · scored ${scored} · sent ${sent}`);
                refresh();
            }
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Autopilot cycle failed");
        } finally { setBusy(false); }
    };

    const filtered = useMemo(() => {
        let base = prospects;
        if (sourceView === "real") {
            base = prospects.filter((p) => p.source !== "internal_seed" && p.source !== "internal_archived");
        } else if (sourceView === "internal") {
            base = prospects.filter((p) => p.source === "internal_seed");
        }
        if (filter === "all") return base;
        if (filter === "unscored") return base.filter((p) => p.lead_score == null);
        if (filter === "high") return base.filter((p) => (p.lead_score || 0) >= 70);
        return base.filter((p) => p.status === filter);
    }, [prospects, filter, sourceView]);

    const filterBtns = [
        ["all",              "All"],
        ["unscored",         "Unscored"],
        ["scored",           "Scored"],
        ["high",             "High fit (70+)"],
        ["contacted",        "Contacted"],
        ["replied_positive", "Positive"],
        ["not_interested",   "Not interested"],
    ];

    return (
        <div data-testid="tab-outbound" className="space-y-6">
            <SystemSignalLight status={dash?.system_status} state={dash?.state} />
            <OperatorView auth={auth} dash={dash} />
            <SectionHeader sub="Autonomous Outbound Sales Engine" title="Outbound command center">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={seedFromDemos}
                        disabled={busy}
                        data-testid="outbound-seed-from-demos"
                        className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
                        title="Auto-import demo viewers who submitted email but didn't convert"
                    >
                        <Users size={11} /> Seed from demo viewers
                    </button>
                    <button
                        onClick={scoreAll}
                        disabled={busy}
                        data-testid="outbound-score-all"
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-60"
                    >
                        <Sparkles size={11} /> Score unscored
                    </button>
                    <button
                        onClick={imapPoll}
                        disabled={busy}
                        data-testid="outbound-imap-poll"
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-60"
                        title="Manually scan IMAP inbox for replies"
                    >
                        <Inbox size={11} /> Scan replies
                    </button>
                    <button
                        onClick={pushHotLeads}
                        disabled={busy}
                        data-testid="outbound-push-hot-leads"
                        className="inline-flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300 hover:border-rose-400 hover:bg-rose-500/20 disabled:opacity-60"
                        title="Re-engage prospects who opened/clicked/viewed but haven't replied"
                    >
                        <Flame size={11} /> Push Hot Leads
                    </button>
                    <button
                        onClick={runTick}
                        disabled={busy}
                        data-testid="outbound-run-tick"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                        title="Run full autopilot cycle: seed → score → send → poll replies → finalize cold"
                    >
                        <Zap size={11} /> Run autopilot now
                    </button>
                    <button
                        onClick={refresh}
                        disabled={busy}
                        data-testid="outbound-refresh"
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 p-2 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-60"
                        title="Refresh"
                    >
                        <RefreshCcw size={12} />
                    </button>
                </div>
            </SectionHeader>

            {!dash ? (
                <p className="text-slate-400" data-testid="outbound-loading">Loading outbound engine…</p>
            ) : (
                <>
                    <OutboundKPIStrip dash={dash} prospects={prospects} sourceView={sourceView} />
                    {/* KPI Source Toggle — Real prospects vs Internal seeds */}
                    <div className="flex flex-wrap items-center gap-2" data-testid="outbound-source-toggle">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">View:</span>
                        {[
                            ["all",      "All sources"],
                            ["real",     "Real prospects"],
                            ["internal", "Internal seeds (test)"],
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => setSourceView(id)}
                                data-testid={`outbound-source-toggle-${id}`}
                                className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${sourceView === id ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <DeliverabilityPanel dash={dash} onTogglePause={togglePause} busy={busy} />
                    <SourcesStatusRow dash={dash} />
                    <DiagnosticsPanel auth={auth} dash={dash} onChange={refresh} />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <AddProspectForm auth={auth} onAdded={refresh} />
                        <CsvUploadBox auth={auth} onUploaded={refresh} />
                    </div>

                    {/* View switcher */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2" data-testid="outbound-view-switch">
                        <button
                            onClick={() => setView("prospects")}
                            data-testid="outbound-view-prospects"
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${view === "prospects" ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}
                        >
                            <Users size={11} /> Prospects ({prospects.length})
                        </button>
                        <button
                            onClick={() => setView("drafts")}
                            data-testid="outbound-view-drafts"
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${view === "drafts" ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}
                        >
                            <FileText size={11} /> Reply drafts ({drafts.length})
                        </button>
                    </div>

                    {view === "prospects" && (
                        <>
                            <div className="flex flex-wrap items-center gap-2" data-testid="outbound-filters">
                                {filterBtns.map(([id, label]) => (
                                    <button
                                        key={id}
                                        onClick={() => setFilter(id)}
                                        data-testid={`outbound-filter-${id}`}
                                        className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${filter === id ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {filtered.length === 0 ? (
                                <p className="rounded-md border border-white/10 bg-ink-700/40 p-6 text-center text-sm text-slate-400" data-testid="outbound-prospects-empty">
                                    No prospects match this filter. Add one above or upload a CSV.
                                </p>
                            ) : (
                                <div className="overflow-x-auto rounded-md border border-white/10 bg-ink-700/40" data-testid="outbound-prospects-table">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-ink-900/60">
                                                {["Business", "Email", "Segment", "Score", "Status", "Emails", "Actions"].map((h, i) => (
                                                    <th key={h} className={`px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400 ${i === 5 ? "text-center" : ""} ${i === 6 ? "text-right" : ""}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((p) => (
                                                <ProspectRow
                                                    key={p.id}
                                                    p={p}
                                                    auth={auth}
                                                    onChange={refresh}
                                                    onLinkedin={setLiProspect}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {view === "drafts" && (
                        <div className="space-y-3" data-testid="outbound-drafts-list">
                            {drafts.length === 0 ? (
                                <p className="rounded-md border border-white/10 bg-ink-700/40 p-6 text-center text-sm text-slate-400" data-testid="outbound-drafts-empty">
                                    No pending reply drafts. When a prospect replies positively, the AI will draft a response here for your approval.
                                </p>
                            ) : (
                                drafts.map((d) => <DraftCard key={d.id} draft={d} auth={auth} onChange={refresh} />)
                            )}
                        </div>
                    )}
                </>
            )}

            {liProspect && (
                <LinkedinModal
                    prospect={liProspect}
                    auth={auth}
                    onClose={() => setLiProspect(null)}
                    onChange={refresh}
                />
            )}
        </div>
    );
};


const DemoRevenueTab = ({ auth }) => {
    const [range, setRange] = useState("30d");
    const [sortBy, setSortBy] = useState("revenue");
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setBusy(true);
        opsDemoRevenue({ ...auth, range })
            .then((d) => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setBusy(false); });
        return () => { cancelled = true; };
    }, [auth, range]);

    const rows = data?.rows || [];
    const sortKey = SORT_OPTIONS.find((o) => o.id === sortBy)?.key || "revenue";
    const sortedRows = [...rows].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    const top = data?.top?.[
        sortBy === "subscriptions"       ? "by_subscriptions"
      : sortBy === "revenue"             ? "by_revenue"
      : sortBy === "enterprise_requests" ? "by_enterprise_requests"
      : "by_conversion_rate"
    ] || [];
    const summary = data?.summary || {};

    return (
        <div data-testid="tab-revenue" className="space-y-6">
            <SectionHeader sub="Demo-to-Revenue" title="Demo Revenue Performance">
                <div className="flex flex-wrap items-center gap-2" data-testid="revenue-filters">
                    {RANGE_OPTIONS.map((o) => (
                        <button
                            key={o.id}
                            data-testid={`revenue-range-${o.id}`}
                            onClick={() => setRange(o.id)}
                            className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-all ${range === o.id ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border border-white/10 bg-ink-800 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-200"}`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </SectionHeader>

            {/* Summary tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7" data-testid="revenue-summary">
                <SummaryTile label="Views"              value={summary.total_views ?? 0} />
                <SummaryTile label="Hot leads"          value={summary.total_hot_leads ?? 0} tone="cyan" />
                <SummaryTile label="Meetings"           value={summary.total_meetings ?? 0} tone="cyan" />
                <SummaryTile label="Enterprise reqs"    value={summary.total_enterprise_requests ?? 0} tone="cyan" />
                <SummaryTile label="Subscriptions"      value={summary.total_subscriptions ?? 0} tone="emerald" />
                <SummaryTile label="Revenue"            value={fmtUSD(summary.total_revenue)} tone="emerald" />
                <SummaryTile label="MRR"                value={fmtUSD(summary.total_mrr)} tone="emerald" />
            </div>

            {/* Section 1 — Per-demo table */}
            <div className="rounded-md border border-white/10 bg-ink-700/40 p-4" data-testid="revenue-table-section">
                {busy && <p className="text-xs text-slate-400" data-testid="revenue-loading">Loading…</p>}
                {!busy && rows.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400" data-testid="revenue-empty">
                        No demo activity in this range yet. Share a demo link to start seeing revenue attribution here.
                    </p>
                )}
                {!busy && rows.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[880px] text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                    <th className="py-2 pr-3">Demo</th>
                                    <th className="py-2 pr-3">Industry</th>
                                    <th className="py-2 pr-3 text-right">Views</th>
                                    <th className="py-2 pr-3 text-right">Hot leads</th>
                                    <th className="py-2 pr-3 text-right">Meetings</th>
                                    <th className="py-2 pr-3 text-right">Subs</th>
                                    <th className="py-2 pr-3 text-right">Revenue</th>
                                    <th className="py-2 pr-3 text-right">MRR</th>
                                    <th className="py-2 pr-3 text-right">Conv %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((r) => (
                                    <tr key={r.demo_key}
                                        data-testid={`revenue-row-${r.demo_key}`}
                                        className="border-b border-white/5 text-slate-200 hover:bg-cyan-500/5">
                                        <td className="py-2.5 pr-3 font-semibold text-white">{r.demo_name}</td>
                                        <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-400">{r.industry}</td>
                                        <td className="py-2.5 pr-3 text-right">{r.views.toLocaleString()}</td>
                                        <td className="py-2.5 pr-3 text-right">{r.hot_leads.toLocaleString()}</td>
                                        <td className="py-2.5 pr-3 text-right">{r.meetings_booked.toLocaleString()}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold text-emerald-300">{r.subscriptions.toLocaleString()}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold text-emerald-300">{fmtUSD(r.revenue)}</td>
                                        <td className="py-2.5 pr-3 text-right text-emerald-300">{fmtUSD(r.mrr)}</td>
                                        <td className="py-2.5 pr-3 text-right font-mono text-[11px] text-cyan-300">{r.conversion_rate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Section 2 — Top revenue demos with sort */}
            <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="revenue-top-section">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-heading text-lg font-semibold text-white">Top revenue demos</p>
                    <div className="flex flex-wrap gap-2">
                        {SORT_OPTIONS.map((o) => (
                            <button
                                key={o.id}
                                data-testid={`revenue-sort-${o.id}`}
                                onClick={() => setSortBy(o.id)}
                                className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-all ${sortBy === o.id ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border border-white/10 bg-ink-900 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-200"}`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>
                <ul className="mt-4 space-y-2">
                    {top.length === 0 && (
                        <li className="text-xs text-slate-400" data-testid="revenue-top-empty">No data in this range.</li>
                    )}
                    {top.map((r, i) => (
                        <li key={r.demo_key}
                            data-testid={`revenue-top-row-${i}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-ink-900 px-3 py-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="font-mono text-[11px] text-cyan-300">#{i + 1}</span>
                                <span className="font-semibold text-white truncate">{r.demo_name}</span>
                                <span className="font-mono text-[10px] text-slate-400">{r.industry}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-300">
                                <span>Subs <span className="text-emerald-300">{r.subscriptions}</span></span>
                                <span>Rev <span className="text-emerald-300">{fmtUSD(r.revenue)}</span></span>
                                <span>Ent <span className="text-cyan-300">{r.enterprise_requests}</span></span>
                                <span>Conv <span className="text-cyan-300">{r.conversion_rate}%</span></span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Section 3 — Activity feed */}
            <DemoSavesMap auth={auth} range={range} />

            <div className="rounded-md border border-white/10 bg-ink-700/40 p-4" data-testid="revenue-activity-section">
                <p className="font-heading text-lg font-semibold text-white">Activity feed</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Most recent 60 events · {RANGE_OPTIONS.find((o) => o.id === range)?.label}
                </p>
                <ul className="mt-4 space-y-1.5 max-h-[480px] overflow-y-auto pr-2 scrollbar-cyan" data-testid="revenue-activity-list">
                    {(data?.activity || []).length === 0 && (
                        <li className="text-xs text-slate-400" data-testid="revenue-activity-empty">
                            No recorded activity in this range.
                        </li>
                    )}
                    {(data?.activity || []).map((ev, i) => (
                        <li key={i}
                            data-testid={`revenue-activity-${i}`}
                            className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-ink-900 px-3 py-2">
                            <span className={`rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${kindTone[ev.kind] || "border-white/10 bg-ink-800 text-slate-300"}`}>
                                {ev.kind}
                            </span>
                            <span className="font-mono text-[11px] text-cyan-300">{ev.demo || "direct"}</span>
                            <span className="text-sm text-slate-200 truncate">{ev.who || "Anonymous"}</span>
                            {ev.meta?.amount != null && (
                                <span className="ml-auto font-mono text-[11px] text-emerald-300">{fmtUSD(ev.meta.amount)}</span>
                            )}
                            <span className={`${ev.meta?.amount != null ? "" : "ml-auto"} font-mono text-[10px] text-slate-500`}>
                                {ev.at ? new Date(ev.at).toLocaleString() : ""}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const SummaryTile = ({ label, value, tone = "white" }) => {
    const toneCls = {
        white:   "border-white/10 bg-ink-700/40",
        cyan:    "border-cyan-500/30 bg-cyan-500/5",
        emerald: "border-emerald-500/30 bg-emerald-500/5",
    };
    return (
        <div className={`rounded-md border p-3 ${toneCls[tone] || toneCls.white}`}>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className="font-heading mt-1 text-xl font-semibold text-white sm:text-2xl">{value}</p>
        </div>
    );
};


// ---------- Avatar Escalations Triage (Iter 53) ----------
const ESCALATION_STATUSES = [
    { id: "open",       label: "Open",       cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200" },
    { id: "contacted",  label: "Contacted",  cls: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
    { id: "won",        label: "Won",        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
    { id: "lost",       label: "Lost",       cls: "border-rose-500/40 bg-rose-500/10 text-rose-200" },
];

const EscalationsPanel = ({ auth }) => {
    const [filter, setFilter] = useState("open");
    const [data, setData] = useState({ escalations: [], counts: {} });
    const [busyId, setBusyId] = useState(null);
    const [openId, setOpenId] = useState(null);
    const [detail, setDetail] = useState(null);

    const refresh = async () => {
        try { setData(await avatarEscalationsList({ ...auth, status: filter, limit: 200 })); }
        catch { /* silent */ }
    };
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filter, auth]); // eslint-disable-line react-hooks/exhaustive-deps

    const openDetail = async (id) => {
        setOpenId(id); setDetail(null);
        try { setDetail(await avatarEscalationsDetail({ ...auth, escalation_id: id })); }
        catch { toast.error("Could not load detail"); }
    };

    const update = async (id, status, note) => {
        setBusyId(id);
        try {
            const r = await avatarEscalationsUpdate({ ...auth, escalation_id: id, status, note });
            toast.success(`Marked ${status}`);
            refresh();
            if (openId === id) setDetail((p) => p ? { ...p, escalation: r.escalation } : p);
        } catch (e) {
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Update failed");
        } finally { setBusyId(null); }
    };

    const counts = data.counts || {};
    const fmt = (iso) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

    return (
        <section className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="admin-escalations-panel">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Avatar escalations · lightweight pipeline</p>
                    <p className="mt-1 text-xs text-slate-400">Every "Talk to founder" tap from the homepage avatar lands here. Triage, note, win/lose.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span><span className="text-emerald-300">{counts.won || 0}</span> won</span>
                    <span>·</span>
                    <span><span className="text-rose-300">{counts.lost || 0}</span> lost</span>
                </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
                {[
                    { id: "open",      label: `Open (${counts.pipeline_open ?? 0})` },
                    { id: "contacted", label: `Contacted (${counts.contacted ?? 0})` },
                    { id: "closed",    label: `Closed (${(counts.won ?? 0) + (counts.lost ?? 0)})` },
                    { id: "all",       label: `All (${counts.all ?? 0})` },
                ].map((p) => (
                    <button
                        key={p.id}
                        data-testid={`admin-esc-filter-${p.id}`}
                        onClick={() => setFilter(p.id)}
                        className={`rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${
                            filter === p.id ? "border-cyan-400 bg-cyan-500/20 text-cyan-100" : "border-white/10 bg-ink-900 text-slate-400 hover:border-cyan-500/30"
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
                <button onClick={refresh} data-testid="admin-esc-refresh"
                    className="ml-auto rounded-md border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300">
                    Refresh
                </button>
            </div>

            {data.escalations.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 bg-ink-900/40 p-6 text-center text-xs text-slate-400" data-testid="admin-esc-empty">
                    No escalations in this bucket. The avatar logs one every time a user clicks "Talk to founder" or asks a question it can't confidently answer.
                </p>
            ) : (
                <div className="space-y-2" data-testid="admin-esc-list">
                    {data.escalations.map((e) => {
                        const statusCfg = ESCALATION_STATUSES.find((s) => s.id === e.status) || ESCALATION_STATUSES[0];
                        return (
                            <div key={e.id} className="rounded-md border border-white/10 bg-ink-900/60 p-3" data-testid={`admin-esc-${e.id}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${statusCfg.cls}`}>{statusCfg.label}</span>
                                            <p className="text-sm font-medium text-white">{e.name || e.email || "anonymous"}</p>
                                            {e.company && <p className="text-xs text-slate-400">· {e.company}</p>}
                                            {e.sector && <span className="rounded-sm bg-ink-700 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{e.sector}</span>}
                                        </div>
                                        {e.email && <p className="mt-1 text-xs text-slate-400">{e.email}</p>}
                                        <p className="mt-1 text-xs text-slate-300"><span className="text-slate-500">Asked:</span> {(e.last_message || e.reason || "—").slice(0, 220)}</p>
                                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                                            {fmt(e.created_at)}
                                            {e.demo_viewed && <span className="ml-2">· demo: {e.demo_viewed}</span>}
                                            {e.surface && <span className="ml-2">· src: {e.surface}</span>}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button onClick={() => openDetail(e.id)} data-testid={`admin-esc-detail-${e.id}`}
                                            className="rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                                            Detail
                                        </button>
                                        {e.status !== "contacted" && e.status !== "won" && e.status !== "lost" && (
                                            <button onClick={() => update(e.id, "contacted")} disabled={busyId === e.id}
                                                data-testid={`admin-esc-contacted-${e.id}`}
                                                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">
                                                Mark contacted
                                            </button>
                                        )}
                                        {e.status !== "won" && e.status !== "lost" && (
                                            <>
                                                <button onClick={() => update(e.id, "won")} disabled={busyId === e.id}
                                                    data-testid={`admin-esc-won-${e.id}`}
                                                    className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50">
                                                    Won
                                                </button>
                                                <button onClick={() => update(e.id, "lost")} disabled={busyId === e.id}
                                                    data-testid={`admin-esc-lost-${e.id}`}
                                                    className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-500/20 disabled:opacity-50">
                                                    Lost
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {openId && <EscalationDetailDrawer detail={detail} auth={auth} onClose={() => { setOpenId(null); setDetail(null); }} onUpdate={update} />}
        </section>
    );
};

const EscalationDetailDrawer = ({ detail, auth, onClose, onUpdate }) => {
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const e = detail?.escalation;
    const transcript = detail?.transcript || [];
    const addNote = async () => {
        if (!note.trim() || !e) return;
        setBusy(true);
        try {
            await avatarEscalationsNote({ ...auth, escalation_id: e.id, note });
            toast.success("Note added");
            setNote("");
        } catch { toast.error("Could not save note"); }
        finally { setBusy(false); }
    };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-cyan-500/30 bg-ink-900 p-5"
                onClick={(e) => e.stopPropagation()} data-testid="admin-esc-drawer">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Escalation</p>
                        <p className="mt-1 text-lg font-medium text-white">{e?.name || e?.email || "anonymous"}</p>
                        {e?.company && <p className="text-xs text-slate-400">{e.company}</p>}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-300" data-testid="admin-esc-drawer-close"><X size={16} /></button>
                </div>

                {!detail ? (
                    <p className="mt-6 text-center text-xs text-slate-400">Loading…</p>
                ) : (
                    <>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div><p className="text-slate-500">Status</p><p className="text-slate-200">{e.status}</p></div>
                            <div><p className="text-slate-500">Sector</p><p className="text-slate-200">{e.sector || "—"}</p></div>
                            <div><p className="text-slate-500">Email</p><p className="break-all text-slate-200">{e.email || "—"}</p></div>
                            <div><p className="text-slate-500">Demo viewed</p><p className="text-slate-200">{e.demo_viewed || "—"}</p></div>
                            <div><p className="text-slate-500">Surface</p><p className="text-slate-200">{e.surface || "—"}</p></div>
                            <div><p className="text-slate-500">Created</p><p className="text-slate-200">{e.created_at ? new Date(e.created_at).toLocaleString() : "—"}</p></div>
                        </div>

                        <div className="mt-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Conversation transcript</p>
                            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-md border border-white/10 bg-ink-700/40 p-3" data-testid="admin-esc-drawer-transcript">
                                {transcript.length === 0 ? (
                                    <p className="text-xs text-slate-500">No prior turns recorded.</p>
                                ) : transcript.map((t, i) => (
                                    <div key={i} className="space-y-1">
                                        <p className="text-xs"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">user</span><br />{t.user}</p>
                                        {t.assistant && <p className="text-xs text-cyan-200"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">avatar · {t.role}</span><br />{t.assistant}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {e.notes?.length > 0 && (
                            <div className="mt-4">
                                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Notes</p>
                                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                    {e.notes.map((n, i) => (
                                        <li key={i} className="rounded-md border border-white/5 bg-ink-700/40 p-2">
                                            <p>{n.text}</p>
                                            <p className="mt-1 font-mono text-[9px] text-slate-500">{n.by} · {new Date(n.at).toLocaleString()}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                            <input value={note} onChange={(ev) => setNote(ev.target.value)}
                                placeholder="Add a note (no status change)…"
                                data-testid="admin-esc-drawer-note-input"
                                className="flex-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500" />
                            <button onClick={addNote} disabled={busy || !note.trim()}
                                data-testid="admin-esc-drawer-note-save"
                                className="rounded-md bg-cyan-500 px-3 py-2 text-[11px] font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-50">
                                Add note
                            </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                            <button onClick={() => onUpdate(e.id, "contacted")} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20" data-testid="admin-esc-drawer-contacted">Mark contacted</button>
                            <button onClick={() => onUpdate(e.id, "won")} className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20" data-testid="admin-esc-drawer-won">Won</button>
                            <button onClick={() => onUpdate(e.id, "lost")} className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20" data-testid="admin-esc-drawer-lost">Lost</button>
                            {e.email && (
                                <a href={`mailto:${e.email}`} className="ml-auto rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                                    Email {e.email.split("@")[0]}
                                </a>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


// ---------- Admin tab (founder only) ----------
const AdminTab = ({ auth }) => {
    const [users, setUsers] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [totals, setTotals] = useState({});
    const [delivery, setDelivery] = useState(null);
    const [form, setForm] = useState({
        target_email: "", target_name: "", target_phone: "",
        target_role: "employee", active: true,
    });
    const [filterOutcome, setFilterOutcome] = useState("");
    const [busy, setBusy] = useState(false);

    const refresh = async () => {
        try {
            const [u, a, d] = await Promise.all([
                opsAdminUsersList(auth),
                opsAdminLoginAttempts({ ...auth, limit: 100, outcome: filterOutcome || undefined }),
                opsAdminDeliveryStatus(auth),
            ]);
            setUsers(u.users || []);
            setAttempts(a.attempts || []);
            setTotals(a.totals || {});
            setDelivery(d || null);
        } catch (err) {
            toast.error("Failed to load admin data");
        }
    };

    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filterOutcome]); // eslint-disable-line react-hooks/exhaustive-deps

    const upsert = async (e) => {
        e.preventDefault();
        if (!form.target_email || !form.target_role) {
            toast.error("Email and role required"); return;
        }
        setBusy(true);
        try {
            await opsAdminUsersUpsert({ ...auth, ...form });
            toast.success(`User ${form.target_email} saved as ${form.target_role}`);
            setForm({ target_email: "", target_name: "", target_phone: "", target_role: "employee", active: true });
            refresh();
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Could not save user");
        } finally { setBusy(false); }
    };

    const deactivate = async (email) => {
        if (!window.confirm(`Deactivate ${email}? They'll be unable to sign in.`)) return;
        try { await opsAdminUsersDeactivate({ ...auth, target_email: email }); toast.success("Deactivated"); refresh(); }
        catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Could not deactivate");
        }
    };

    const resetAccess = async (email) => {
        if (!window.confirm(`Reset ${email}'s access? All trusted devices + magic links are invalidated — they must re-verify via OTP.`)) return;
        try { await opsAdminUsersResetAccess({ ...auth, target_email: email }); toast.success("Access reset · user must re-verify"); refresh(); }
        catch { toast.error("Could not reset access"); }
    };

    return (
        <div data-testid="tab-admin" className="space-y-6">
            <SectionHeader sub="Founder controls" title="Admin · Users & Login Audit" />

            {/* Avatar Escalations triage (Iter 53) */}
            <EscalationsPanel auth={auth} />

            {/* Delivery status row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="admin-delivery-status">
                {["email", "sms"].map((ch) => {
                    const d = delivery?.[ch];
                    const ok = !!d?.configured;
                    return (
                        <div key={ch} className={`rounded-md border p-3 ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                            <div className="flex items-center gap-2">
                                {ok ? <CheckCircle2 size={14} className="text-emerald-300" /> : <AlertTriangle size={14} className="text-amber-300" />}
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
                                    <span className={ok ? "text-emerald-300" : "text-amber-300"}>{ch.toUpperCase()}</span>
                                    <span className="ml-2 text-slate-400">· {d?.provider || "—"}</span>
                                </p>
                            </div>
                            <p className="mt-1 break-all text-xs text-slate-300">
                                {ch === "email"
                                    ? (d?.sender || "No sender configured")
                                    : (d?.from_number || "No Twilio number configured")}
                            </p>
                            <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.22em] ${ok ? "text-emerald-300" : "text-amber-300"}`}>
                                {ok ? "Live delivery ready" : "Not configured — add keys to .env"}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Upsert form */}
            <form onSubmit={upsert} className="rounded-md border border-white/10 bg-ink-700/40 p-4 space-y-3" data-testid="admin-upsert-form">
                <div className="flex items-center gap-2">
                    <UserPlus size={14} className="text-cyan-400" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Add or update approved user</p>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input type="email" required value={form.target_email}
                        onChange={(e) => setForm({ ...form, target_email: e.target.value })}
                        placeholder="user@company.com" data-testid="admin-email"
                        className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                    <input type="text" value={form.target_name}
                        onChange={(e) => setForm({ ...form, target_name: e.target.value })}
                        placeholder="Full name" data-testid="admin-name"
                        className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                    <input type="tel" value={form.target_phone}
                        onChange={(e) => setForm({ ...form, target_phone: e.target.value })}
                        placeholder="+16162145861 (optional, for SMS)" data-testid="admin-phone"
                        className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                    <select value={form.target_role}
                        onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                        data-testid="admin-role"
                        className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
                        <option value="employee">Employee</option>
                        <option value="executive">Executive</option>
                        <option value="founder">Founder</option>
                    </select>
                </div>
                <button type="submit" disabled={busy} data-testid="admin-submit"
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                    {busy ? <RefreshCcw size={12} className="animate-spin" /> : <Plus size={12} />}
                    Save user
                </button>
            </form>

            {/* Users table */}
            <div className="overflow-x-auto rounded-md border border-white/10 bg-ink-700/40" data-testid="admin-users-table">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5 bg-ink-900/60 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                            <th className="px-3 py-2">Email / Name</th>
                            <th className="px-3 py-2">Role</th>
                            <th className="px-3 py-2">Phone</th>
                            <th className="px-3 py-2">Active</th>
                            <th className="px-3 py-2">Devices</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.email} className="border-b border-white/5 text-slate-200" data-testid={`admin-user-${u.email}`}>
                                <td className="px-3 py-2">
                                    <div className="font-semibold text-white">{u.name || u.email.split("@")[0]}</div>
                                    <div className="font-mono text-xs text-slate-400">{u.email}</div>
                                </td>
                                <td className="px-3 py-2">
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${roleBadge[u.role]?.cls}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{u.phone || "—"}</td>
                                <td className="px-3 py-2">
                                    {u.active === false
                                        ? <span className="inline-flex items-center gap-1 text-rose-300"><XCircle size={12} /> No</span>
                                        : <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={12} /> Yes</span>}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs text-slate-400">{u.trusted_device_count || 0}</td>
                                <td className="px-3 py-2">
                                    <div className="flex flex-wrap justify-end gap-1">
                                        <button onClick={() => resetAccess(u.email)}
                                            data-testid={`admin-reset-${u.email}`}
                                            className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-500 hover:text-ink-900">
                                            <KeyRound size={10} /> Reset
                                        </button>
                                        {u.active !== false && u.role !== "founder" && (
                                            <button onClick={() => deactivate(u.email)}
                                                data-testid={`admin-deactivate-${u.email}`}
                                                className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-500 hover:text-ink-900">
                                                <Trash2 size={10} /> Deactivate
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">No approved users yet — add one above.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Login attempts audit log */}
            <div className="rounded-md border border-white/10 bg-ink-700/40 p-4 space-y-3" data-testid="admin-attempts-panel">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-cyan-400" />
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Recent login attempts</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}
                            data-testid="admin-outcome-filter"
                            className="rounded-md border border-white/10 bg-ink-900 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                            <option value="">All outcomes</option>
                            <option value="verified">Verified (success)</option>
                            <option value="sent">Sent</option>
                            <option value="delivery_failed">Delivery failed</option>
                            <option value="invalid_code">Invalid code</option>
                            <option value="expired">Expired</option>
                            <option value="rate_limited">Rate limited</option>
                            <option value="user_not_found">Unknown email</option>
                        </select>
                        <button onClick={refresh} data-testid="admin-refresh"
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-900 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <RefreshCcw size={10} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {["total", "verified", "delivery_failed", "invalid_code"].map((k) => (
                        <div key={k} className="rounded-md border border-white/10 bg-ink-900 p-2 text-center">
                            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{k.replace("_", " ")}</div>
                            <div className="mt-1 text-lg font-semibold text-white">{totals[k] || 0}</div>
                        </div>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5 bg-ink-900/60 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                <th className="px-3 py-2">When</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Role</th>
                                <th className="px-3 py-2">Channel</th>
                                <th className="px-3 py-2">Outcome</th>
                                <th className="px-3 py-2">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attempts.map((a, i) => (
                                <tr key={a.id || i} className="border-b border-white/5 text-slate-200">
                                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{a.email}</td>
                                    <td className="px-3 py-2 text-xs">{a.role || "—"}</td>
                                    <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                                        {a.channel === "sms" ? <Smartphone size={10} className="mr-1 inline" /> : <Mail size={10} className="mr-1 inline" />}
                                        {a.channel}
                                    </td>
                                    <td className="px-3 py-2">
                                        <OutcomeBadge outcome={a.outcome} />
                                    </td>
                                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{a.detail || (a.provider_id ? `id=${a.provider_id}` : "")}</td>
                                </tr>
                            ))}
                            {attempts.length === 0 && (
                                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">No login attempts logged yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const OutcomeBadge = ({ outcome }) => {
    const tone = {
        verified: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        sent: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
        trusted_device: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
        delivery_failed: "border-amber-500/40 bg-amber-500/10 text-amber-300",
        invalid_code: "border-rose-500/40 bg-rose-500/10 text-rose-300",
        expired: "border-rose-500/30 bg-rose-500/5 text-rose-200",
        rate_limited: "border-amber-500/30 bg-amber-500/5 text-amber-200",
        user_not_found: "border-white/10 bg-ink-900 text-slate-400",
        role_mismatch: "border-white/10 bg-ink-900 text-slate-400",
        inactive: "border-white/10 bg-ink-900 text-slate-400",
    }[outcome] || "border-white/10 bg-ink-900 text-slate-400";
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${tone}`}>
            {outcome}
        </span>
    );
};

// ======================================================================
// Iter 55 · Clients Tab — full client lifecycle inside Ops Portal
// ======================================================================
const CLIENT_STATUS_TONES = {
    onboarding: "border-cyan-400/40 bg-cyan-500/10 text-cyan-300",
    in_progress: "border-amber-400/40 bg-amber-500/10 text-amber-300",
    review: "border-violet-400/40 bg-violet-500/10 text-violet-300",
    completed: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    inactive: "border-rose-400/40 bg-rose-500/10 text-rose-300",
};

const ClientsTab = ({ auth, me }) => {
    const [data, setData] = useState({ clients: [], counts: {} });
    const [filter, setFilter] = useState("all");
    const [openId, setOpenId] = useState(null);
    const [busy, setBusy] = useState(false);

    const refresh = () => {
        clientList({ ...auth, status: filter === "all" ? undefined : filter })
            .then(setData)
            .catch((e) => toast.error(e?.response?.data?.detail || "Could not load clients"));
    };
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

    const onboardManual = async () => {
        const lead_id = window.prompt("Paste the ops_leads.lead_id of the won deal to onboard:");
        if (!lead_id) return;
        setBusy(true);
        try {
            const r = await clientOnboardFromLead({ ...auth, lead_id });
            toast.success(`Onboarded ${r.client.business_name}`);
            refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Could not onboard client");
        } finally { setBusy(false); }
    };

    return (
        <div data-testid="tab-clients" className="space-y-5">
            <SectionHeader sub="Client lifecycle" title="Clients">
                <button
                    onClick={onboardManual}
                    disabled={busy}
                    data-testid="clients-manual-onboard"
                    className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-500/20"
                >
                    <Plus size={11} /> Onboard from lead
                </button>
            </SectionHeader>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2" data-testid="clients-filter-pills">
                {["all", "onboarding", "in_progress", "review", "completed", "inactive"].map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        data-testid={`client-filter-${s}`}
                        className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                            filter === s
                                ? "border-cyan-400 bg-cyan-500/15 text-cyan-200"
                                : "border-white/10 bg-ink-700/40 text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        {s.replace("_", " ")} ({data.counts?.[s] ?? 0})
                    </button>
                ))}
                <button
                    onClick={refresh}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 hover:text-slate-200"
                    data-testid="clients-refresh"
                >
                    <RefreshCcw size={11} /> Refresh
                </button>
            </div>

            {/* Client list */}
            <div className="space-y-2" data-testid="clients-list">
                {data.clients.length === 0 && (
                    <p className="rounded-md border border-white/10 bg-ink-700/30 p-6 text-center text-sm text-slate-400">
                        No clients yet. Close a lead as won (manual or via Stripe) and they'll auto-appear here.
                    </p>
                )}
                {data.clients.map((c) => (
                    <div
                        key={c.client_id}
                        data-testid={`client-row-${c.client_id}`}
                        className="rounded-md border border-white/10 bg-ink-700/30 p-4 hover:border-cyan-500/30"
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1">
                                <p className="font-heading text-base font-semibold text-white">{c.business_name}</p>
                                <p className="text-xs text-slate-400">
                                    {c.contact_name} · {c.contact_email} ·{" "}
                                    <span className="font-mono text-[10px] text-slate-500">owner: {c.owner_user_id}</span>
                                </p>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${CLIENT_STATUS_TONES[c.status] || ""}`}>
                                {c.status?.replace("_", " ")}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                {c.tasks_done}/{c.tasks_done + c.tasks_open} tasks · {c.uploads_count} files
                            </span>
                            <button
                                onClick={() => setOpenId(c.client_id)}
                                data-testid={`client-open-${c.client_id}`}
                                className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-500/20"
                            >
                                Open
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {openId && <ClientDrawer auth={auth} me={me} client_id={openId} onClose={() => { setOpenId(null); refresh(); }} />}
        </div>
    );
};

const ClientDrawer = ({ auth, client_id, onClose }) => {
    const [data, setData] = useState(null);
    const [reply, setReply] = useState("");
    const [busy, setBusy] = useState(false);

    const refresh = () => clientWorkspace({ ...auth, client_id }).then(setData).catch(() => {});
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [client_id]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleTask = async (task_key, currentDone) => {
        await clientTaskToggle({ ...auth, client_id, task_key, done: !currentDone });
        refresh();
    };

    const setStatus = async (status) => {
        await clientSetStatus({ ...auth, client_id, status });
        refresh();
    };

    const sendReply = async () => {
        if (!reply.trim()) return;
        setBusy(true);
        try {
            await clientFounderReply({ ...auth, client_id, body: reply });
            setReply("");
            refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Could not send");
        } finally { setBusy(false); }
    };

    const resendMagic = async () => {
        try {
            await clientResendMagic({ ...auth, client_id });
            toast.success("Magic link re-sent");
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Could not resend");
        }
    };

    if (!data) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4" onClick={onClose}>
                <div className="rounded-md border border-white/10 bg-ink-800 p-8 text-slate-400">Loading…</div>
            </div>
        );
    }
    const { client, tasks, messages, uploads, magic_link } = data;

    return (
        <div className="fixed inset-0 z-[60] flex items-stretch justify-end bg-ink-900/80 p-0 sm:p-4" data-testid="client-drawer" onClick={onClose}>
            <div className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto rounded-md border border-white/10 bg-ink-800 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-heading text-xl font-semibold text-white">{client.business_name}</h3>
                        <p className="text-xs text-slate-400">{client.contact_name} · {client.contact_email}</p>
                        <p className="mt-1 break-all font-mono text-[10px] text-slate-500">Magic link: {magic_link}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 hover:text-rose-300" data-testid="client-drawer-close">
                        Close
                    </button>
                </div>

                {/* Status switcher */}
                <div className="mt-4 flex flex-wrap gap-2" data-testid="client-status-switcher">
                    {["onboarding", "in_progress", "review", "completed", "inactive"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            data-testid={`client-set-status-${s}`}
                            className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                                client.status === s
                                    ? CLIENT_STATUS_TONES[s]
                                    : "border-white/10 bg-ink-700/40 text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            {s.replace("_", " ")}
                        </button>
                    ))}
                    <button onClick={resendMagic} className="ml-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500/20" data-testid="client-resend-magic">
                        Resend magic link
                    </button>
                </div>

                {/* Tasks checklist */}
                <div className="mt-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Deliverables</p>
                    <ul className="mt-2 space-y-1.5" data-testid="client-tasks">
                        {tasks.map((t) => (
                            <li key={t.id} className="flex items-center gap-3 rounded-sm border border-white/5 bg-ink-900 p-2.5">
                                <button
                                    onClick={() => toggleTask(t.key, t.status === "done")}
                                    data-testid={`client-task-${t.key}`}
                                    className="flex items-center gap-2 text-left"
                                >
                                    {t.status === "done" ? <CheckCircle2 size={16} className="text-emerald-300" /> : <X size={16} className="text-slate-500" />}
                                    <span className={`text-sm ${t.status === "done" ? "text-emerald-200 line-through" : "text-white"}`}>{t.title}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Uploads */}
                <div className="mt-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Uploads ({uploads.length})</p>
                    <ul className="mt-2 space-y-1.5">
                        {uploads.length === 0 && <li className="text-xs text-slate-500">No files yet.</li>}
                        {uploads.map((u) => (
                            <li key={u.id} className="flex items-center gap-2 rounded-sm border border-white/5 bg-ink-900 p-2.5 text-xs text-slate-300">
                                <FileText size={13} className="text-cyan-300" />
                                <span className="flex-1 truncate">{u.filename}</span>
                                <span className="font-mono text-[9px] text-slate-500">{Math.round((u.size_bytes || 0) / 1024)} KB</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Messages */}
                <div className="mt-5 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Messages ({messages.length})</p>
                    <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-sm border border-white/5 bg-ink-900 p-3" data-testid="client-messages">
                        {messages.map((m) => (
                            <div key={m.id} className={`max-w-[85%] rounded-md p-2 ${m.author === "client" ? "border border-cyan-500/30 bg-cyan-500/5" : "ml-auto border border-white/10 bg-ink-700/40"}`}>
                                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">{m.author_name}</p>
                                <p className="mt-1 whitespace-pre-line text-xs text-slate-200">{m.body}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                        <input
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                            placeholder="Reply to client…"
                            data-testid="client-reply-input"
                            className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                        <button onClick={sendReply} disabled={busy || !reply.trim()} data-testid="client-reply-send" className="inline-flex items-center gap-1 rounded-md bg-cyan-500 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                            <Send size={11} /> Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ---------- Settings tab (founder only) ----------
const SettingsTab = ({ auth, me }) => (
    <div data-testid="tab-settings" className="space-y-5">
        <SectionHeader sub="Founder controls" title="Settings" />
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Founder access link</p>
            <p className="mt-2 break-all font-mono text-xs text-amber-100">{window.location.origin}/founder-access</p>
            <p className="mt-1 text-xs text-amber-100">Configure `FOUNDER_KEY` in /app/backend/.env · rotate by updating the env var and restarting backend.</p>
        </div>
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Executive access link (Erin Flanigan)</p>
            <p className="mt-2 break-all font-mono text-xs text-cyan-100">{window.location.origin}/executive-access</p>
            <p className="mt-1 text-xs text-cyan-100">Configure `EXECUTIVE_KEY` in /app/backend/.env · share the key with Erin once.</p>
        </div>
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Your signed-in session</p>
            <p className="mt-1 font-mono text-xs text-slate-300">{me.email} · {me.role}</p>
        </div>
    </div>
);

// ======================================================================
// TOP-LEVEL PAGE
// ======================================================================
export default function PortalOpsPage() {
    const [auth, setAuth] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return s?.email && s?.token ? s : null; }
        catch { return null; }
    });
    const [me, setMe] = useState(null);
    const [active, setActive] = useState("performance");
    const [loading, setLoading] = useState(!!auth);

    useEffect(() => {
        if (!auth) { setMe(null); setLoading(false); return; }
        opsMe(auth)
            .then((m) => setMe(m))
            .catch(() => { setAuth(null); localStorage.removeItem(STORAGE_KEY); })
            .finally(() => setLoading(false));
    }, [auth]);

    const onAuth = (data) => {
        const a = { email: data.email, token: data.token };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); } catch { /* noop */ }
        setAuth(a);
    };
    const onSignOut = async () => {
        // Rotate server-side token first so the session dies on every device
        try { if (auth) await opsLogout({ ...auth, everywhere: true }); } catch { /* ignore */ }
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
        try { localStorage.removeItem("cb_ops_device_id"); } catch { /* noop */ }
        setAuth(null); setMe(null);
        toast.success("Signed out · sessions cleared on all devices");
    };

    const Tab = useMemo(() => {
        if (!me) return null;
        switch (active) {
            case "performance": return <PerformanceTab auth={auth} me={me} />;
            case "leads":       return <LeadsTab auth={auth} me={me} />;
            case "intake":      return <LeadIntakeTab auth={auth} me={me} />;
            case "outreach":    return <OutreachTab auth={auth} />;
            case "demos":       return <DemosTab auth={auth} />;
            case "clients":     return <ClientsTab auth={auth} me={me} />;
            case "ai":          return <AITab auth={auth} me={me} />;
            case "employees":   return me.scopes.can_see_all_employees ? <EmployeesTab auth={auth} me={me} /> : null;
            case "outbound":    return me.scopes.can_see_settings ? <OutboundTab auth={auth} /> : null;
            case "revenue":     return me.scopes.can_see_settings ? <DemoRevenueTab auth={auth} /> : null;
            case "admin":       return me.scopes.can_see_settings ? <AdminTab auth={auth} /> : null;
            case "settings":    return me.scopes.can_see_settings ? <SettingsTab auth={auth} me={me} /> : null;
            default:            return null;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, auth, me]);

    if (loading) {
        return (
            <Layout>
                <div className="flex min-h-[40vh] items-center justify-center bg-ink-900">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                </div>
            </Layout>
        );
    }
    if (!auth || !me) return <LoginScreen onAuth={onAuth} />;

    return (
        <Layout>
            <div className="min-h-screen bg-ink-900" data-testid="portal-ops-page">
                <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
                    <Sidebar me={me} active={active} onNav={setActive} onSignOut={onSignOut} />
                    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
                        {Tab}
                    </main>
                </div>
            </div>
        </Layout>
    );
}
