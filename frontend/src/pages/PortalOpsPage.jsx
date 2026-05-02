import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Users, Inbox, Send, Lightbulb, Bot, BarChart3, Crown, LogOut, Plus,
    MessageSquare, Copy, Link2, Mail, Check, Activity, DollarSign, Target,
    ArrowRight, Sparkles, UserPlus, ShieldCheck, ChevronDown, RefreshCcw,
    UserCog, AlertTriangle, PhoneCall, KeyRound, CheckCircle2, XCircle,
    Smartphone, Trash2,
} from "lucide-react";
import {
    opsFounderAccess, opsExecutiveAccess, opsEmployeeAcceptInvite, opsMe,
    opsListLeads, opsCreateLead, opsUpdateLeadStatus, opsAddLeadNote, opsAddLeadTask,
    opsReassignLead, opsSendOutreach, opsListOutreach, opsCreateDemoLink,
    opsListDemoLinks, opsPerformance, opsAIChat, opsListEmployees, opsInviteEmployee,
    opsLogout, opsAdminUsersList, opsAdminUsersUpsert, opsAdminUsersDeactivate,
    opsAdminUsersResetAccess, opsAdminLoginAttempts, opsAdminDeliveryStatus,
    opsDemoRevenue,
} from "@/lib/api";

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
        { id: "outreach",    label: "Outreach",    Icon: Send },
        { id: "demos",       label: "Demo Links",  Icon: Lightbulb },
        { id: "ai",          label: "AI Assistant",Icon: Bot },
    ];
    if (me.scopes.can_see_all_employees) items.push({ id: "employees", label: "Employees", Icon: Users });
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
const PerformanceTab = ({ auth, me }) => {
    const [data, setData] = useState(null);
    useEffect(() => { opsPerformance(auth).then(setData).catch(() => {}); }, [auth]);
    if (!data) return <p className="text-slate-400">Loading…</p>;
    const tiles = [
        { Icon: Inbox,      label: "Total leads",     value: data.leads_total, tone: "white" },
        { Icon: Target,     label: "Won",             value: data.leads_won,   tone: "emerald" },
        { Icon: Activity,   label: "Win rate",        value: `${data.win_rate_pct}%`, tone: "cyan" },
        { Icon: DollarSign, label: "Pipeline value",  value: fmtUSD(data.pipeline_value_usd), tone: "white" },
        { Icon: DollarSign, label: "Won value",       value: fmtUSD(data.won_value_usd), tone: "emerald" },
        { Icon: Send,       label: "Outreach sent",   value: data.outreach_sent, tone: "cyan" },
        { Icon: Lightbulb,  label: "Demos sent",      value: data.demos_sent, tone: "cyan" },
    ];
    const toneCls = { white: "border-white/10 bg-ink-700/40", cyan: "border-cyan-500/30 bg-cyan-500/5", emerald: "border-emerald-500/30 bg-emerald-500/5" };
    return (
        <div data-testid="tab-performance" className="space-y-6">
            <SectionHeader sub={me.role === "employee" ? "Your performance" : "Team performance"} title="Operating snapshot" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="performance-tiles">
                {tiles.map((t) => (
                    <div key={t.label} className={`rounded-md border p-4 ${toneCls[t.tone]}`}>
                        <div className="flex items-center gap-2"><t.Icon size={11} className="text-cyan-400" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{t.label}</span></div>
                        <p className="font-heading mt-1 text-2xl font-semibold text-white">{t.value}</p>
                    </div>
                ))}
            </div>
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
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [auth]);

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
                </div>
            )}
        </div>
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

// ---------- AI Assistant tab ----------
const AITab = ({ auth }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const sessionId = useRef(`s-${Date.now()}`);
    const scrollRef = useRef(null);

    const send = async () => {
        const msg = input.trim(); if (!msg || busy) return;
        setMessages((m) => [...m, { role: "user", text: msg }]);
        setInput(""); setBusy(true);
        try {
            const r = await opsAIChat({ ...auth, session_id: sessionId.current, message: msg });
            setMessages((m) => [...m, { role: "assistant", text: r.reply }]);
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "AI error");
        } finally {
            setBusy(false);
            setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 100);
        }
    };
    const suggestions = [
        "Draft a follow-up email after a demo · decision-maker went quiet",
        "Rehearse a 30-second cold opener for a C-store chain CFO",
        "Give me 3 objection-handlers for 'we already have a maintenance platform'",
    ];

    return (
        <div data-testid="tab-ai" className="space-y-4">
            <SectionHeader sub="Claude Sonnet · sales coach" title="AI Assistant" />
            <div className="flex flex-col rounded-md border border-white/10 bg-ink-700/40" style={{ height: "65vh" }}>
                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4" data-testid="ai-messages">
                    {messages.length === 0 && (
                        <div>
                            <p className="text-sm text-slate-400">Try one of these to start:</p>
                            <div className="mt-2 space-y-1">
                                {suggestions.map((s) => (
                                    <button key={s} onClick={() => setInput(s)} className="block w-full rounded-sm border border-white/5 bg-ink-900 p-2 text-left text-xs text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">{s}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`rounded-md border p-3 text-sm ${m.role === "user" ? "border-cyan-500/30 bg-cyan-500/5 text-white" : "border-white/10 bg-ink-900 text-slate-200"}`}>
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{m.role === "user" ? "you" : "assistant"}</p>
                            <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
                        </div>
                    ))}
                    {busy && <p className="text-xs text-slate-400">Thinking…</p>}
                </div>
                <div className="border-t border-white/5 p-3">
                    <div className="flex gap-2">
                        <input value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                            placeholder="Ask the AI… (press Enter to send)" data-testid="ai-input"
                            className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                        <button onClick={send} disabled={busy} data-testid="ai-send"
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
    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [auth]);
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

    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filterOutcome]);

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
            case "outreach":    return <OutreachTab auth={auth} />;
            case "demos":       return <DemosTab auth={auth} />;
            case "ai":          return <AITab auth={auth} />;
            case "employees":   return me.scopes.can_see_all_employees ? <EmployeesTab auth={auth} me={me} /> : null;
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
