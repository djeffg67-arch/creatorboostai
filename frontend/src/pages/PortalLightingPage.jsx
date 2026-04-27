import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Lightbulb, Lock, Building2, MapPin, DollarSign, TrendingUp, Activity,
    ShieldCheck, Hammer, Cpu, Check, ArrowRight, BadgeCheck, Calculator,
    Wrench, AlertTriangle,
} from "lucide-react";
import {
    portalLightingProjects, portalLightingApprove, getLightingLifecycle,
} from "@/lib/api";

const STORAGE_KEY = "bodyiq_portal_user";

const fmtUSD = (n) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtUSD2 = (n) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_TONES = {
    identified:        { label: "Identified",        cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
    approved:          { label: "Approved",          cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
    deployed:          { label: "Deployed",          cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
    savings_verified:  { label: "Savings Verified",  cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
};

const StatusBadge = ({ status }) => {
    const t = STATUS_TONES[status] || STATUS_TONES.identified;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] ${t.cls}`} data-testid={`status-badge-${status}`}>
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" /> {t.label}
        </span>
    );
};

// =================================================================
// LOGIN SCREEN
// =================================================================
const LoginScreen = ({ onAuth }) => {
    const [form, setForm] = useState({ email: "", token: "" });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.token) {
            toast.error("Email and access token required");
            return;
        }
        setBusy(true);
        try {
            const data = await portalLightingProjects(form);
            // Persist auth so refresh works
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: form.email, token: form.token })); } catch { /* ignore quota */ }
            onAuth({ email: form.email, token: form.token, data });
            toast.success(`Welcome, ${form.email}`);
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Invalid email or access token");
        } finally { setBusy(false); }
    };

    return (
        <Layout>
            <section className="relative overflow-hidden border-b border-white/5 bg-ink-900" data-testid="lighting-portal-login">
                <div className="absolute inset-0 ambient-grid opacity-40" />
                <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <Lock size={12} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            Authenticated · Lighting Command Center
                        </span>
                    </div>
                    <h1 className="font-heading mt-6 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                        Sign in to your <span className="text-cyan-300">Lighting Upgrade portfolio.</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm text-slate-300">
                        Enter the email + portal token associated with your CreatorBoostAI account. Your
                        Action IDs, financial decision panel, and lifecycle ledger live here.
                    </p>

                    <form onSubmit={submit} className="mt-8 max-w-xl space-y-3">
                        <label className="block">
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Email</span>
                            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                                type="email" required data-testid="portal-lighting-login-email"
                                className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
                        </label>
                        <label className="block">
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Portal token</span>
                            <input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })}
                                type="password" required data-testid="portal-lighting-login-token"
                                className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
                        </label>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button type="submit" disabled={busy} data-testid="portal-lighting-login-submit"
                                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60">
                                <Lock size={13} /> {busy ? "Signing in…" : "Sign In"}
                            </button>
                            <Link to="/portal" className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:text-cyan-200">
                                Forgot your token? → Use main portal
                            </Link>
                        </div>
                    </form>

                    <div className="mt-10 rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">No account yet?</p>
                        <p className="mt-2 text-sm text-amber-100">
                            Generate a real proposal at <Link to="/lighting-upgrade-engine" className="underline">/lighting-upgrade-engine</Link> — your Action ID, portfolio rollup, and lifecycle log will appear here next time you sign in.
                        </p>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

// =================================================================
// FINANCIAL DECISION PANEL
// =================================================================
const DecisionPanel = ({ rollup }) => {
    if (!rollup) return null;
    const tiles = [
        { Icon: Building2,  label: "Action IDs",         value: rollup.total_projects, sub: "Across portfolio" },
        { Icon: DollarSign, label: "Total project cost", value: fmtUSD(rollup.total_project_cost), sub: "Fixtures + estimated install" },
        { Icon: TrendingUp, label: "Annual savings",     value: fmtUSD(rollup.annual_total_savings), sub: "Energy + maintenance" },
        { Icon: Activity,   label: "Annual payment",     value: fmtUSD(rollup.annual_payment), sub: "Subscription tranche only" },
        { Icon: Calculator, label: "Net cash flow",      value: `${rollup.net_annual_cash_flow >= 0 ? "+" : ""}${fmtUSD(rollup.net_annual_cash_flow)}`, sub: "After modeled payments", tone: rollup.net_annual_cash_flow >= 0 ? "cyan" : "rose" },
    ];
    return (
        <section className="border-b border-white/5 bg-ink-900 py-10" data-testid="decision-panel">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Financial Decision Panel · Portfolio rollup</p>
                <h2 className="font-heading mt-2 text-xl font-semibold text-white sm:text-2xl">
                    Approve upgrades by financial impact.
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="decision-panel-tiles">
                    {tiles.map((t) => {
                        const ring = t.tone === "cyan" ? "border-cyan-500/30 bg-cyan-500/5"
                            : t.tone === "rose" ? "border-rose-500/30 bg-rose-500/5"
                            : "border-white/10 bg-ink-700/40";
                        return (
                            <div key={t.label} className={`rounded-md border p-3 ${ring}`}>
                                <div className="flex items-center gap-2"><t.Icon size={11} className="text-cyan-400" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{t.label}</span></div>
                                <p className="font-heading mt-1 text-xl font-semibold text-white sm:text-2xl">{t.value}</p>
                                {t.sub && <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{t.sub}</p>}
                            </div>
                        );
                    })}
                </div>

                {/* Status breakdown bar */}
                <div className="mt-5 rounded-md border border-white/10 bg-ink-700/40 p-4" data-testid="lifecycle-summary">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Lifecycle distribution</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {Object.entries(rollup.by_status || {}).map(([state, count]) => (
                            <div key={state} className="rounded-sm border border-white/5 bg-ink-900 p-2">
                                <div className="flex items-center justify-between"><StatusBadge status={state} /><span className="font-mono text-sm text-white">{count}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// =================================================================
// PROJECT ROW (with Approve action)
// =================================================================
const ProjectRow = ({ project, auth, onChange }) => {
    const [busy, setBusy] = useState(false);
    const [showLifecycle, setShowLifecycle] = useState(false);
    const [lifecycle, setLifecycle] = useState([]);

    const approve = async () => {
        setBusy(true);
        try {
            const updated = await portalLightingApprove({ ...auth, action_id: project.action_id });
            toast.success(`Approved · ${project.action_id}`);
            onChange(updated);
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Could not approve");
        } finally { setBusy(false); }
    };

    const loadLifecycle = async () => {
        if (showLifecycle) { setShowLifecycle(false); return; }
        try {
            const res = await getLightingLifecycle(project.action_id);
            setLifecycle(res.events || []);
            setShowLifecycle(true);
        } catch { toast.error("Could not load lifecycle"); }
    };

    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-4 fade-in-up" data-testid={`project-row-${project.action_id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{project.action_id}</span>
                        <StatusBadge status={project.status} />
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-white">
                        <MapPin size={11} className="mr-1 inline text-cyan-400" />
                        {project.inputs?.location_label}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                        {project.sku?.sku} · {project.sku?.name} · {project.inputs?.fixture_count} fixtures
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {project.status === "identified" && (
                        <button onClick={approve} disabled={busy} data-testid={`approve-btn-${project.action_id}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60">
                            <Check size={11} /> {busy ? "Approving…" : "Approve Upgrade"}
                        </button>
                    )}
                    <button onClick={loadLifecycle} data-testid={`lifecycle-btn-${project.action_id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                        <Cpu size={11} /> {showLifecycle ? "Hide" : "Lifecycle"}
                    </button>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini label="Project cost" value={fmtUSD(project.total_project_cost)} />
                <Mini label="Annual savings" value={fmtUSD(project.annual_total_savings)} tone="cyan" />
                <Mini label={project.deal_structure === "subscription" ? "Monthly payment" : "Deal"}
                       value={project.deal_structure === "subscription" ? fmtUSD2(project.monthly_payment) : "Direct purchase"} />
                <Mini label="Payback" value={`${project.payback_period_years} yrs`} />
            </div>

            {showLifecycle && (
                <div className="mt-4 rounded-sm border border-white/5 bg-ink-900 p-3" data-testid={`lifecycle-${project.action_id}`}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Lifecycle ledger · append-only</p>
                    {lifecycle.length === 0 ? (
                        <p className="mt-2 font-mono text-[10px] text-slate-500">No events recorded.</p>
                    ) : (
                        <ol className="mt-2 space-y-1.5">
                            {lifecycle.map((e, i) => (
                                <li key={i} className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                                    <span className="text-slate-500">{new Date(e.created_at).toLocaleString()}</span>
                                    <span className="text-slate-400">{e.from_state || "—"} →</span>
                                    <span className="text-cyan-300">{e.to_state}</span>
                                    <span className="text-slate-500">· by {e.actor}</span>
                                    {e.note && <span className="text-slate-400">· {e.note}</span>}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}
        </div>
    );
};

const Mini = ({ label, value, tone }) => (
    <div className={`rounded-sm border p-2 ${tone === "cyan" ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/5 bg-ink-900"}`}>
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-0.5 font-heading text-sm font-semibold text-white">{value}</p>
    </div>
);

// =================================================================
// MAIN COMMAND CENTER
// =================================================================
const CommandCenter = ({ auth, data, onSignOut, onRefresh }) => {
    const [filter, setFilter] = useState("all");

    const projects = useMemo(() => {
        const all = data?.projects || [];
        if (filter === "all") return all;
        return all.filter((p) => p.status === filter);
    }, [data, filter]);

    const handleProjectChange = async (updated) => {
        // Re-fetch portfolio so the rollup tiles + status counts stay accurate
        await onRefresh();
    };

    return (
        <Layout>
            <div className="bg-ink-900" data-testid="lighting-portal-page">
                {/* Header strip */}
                <section className="border-b border-white/10 bg-ink-900 py-6" data-testid="lighting-portal-header">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                                CreatorBoostAI · Lighting Command Center
                            </p>
                            <h1 className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">
                                {data?.tenant ? data.tenant : auth.email}
                            </h1>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                Tenant · {data?.tenant || "—"} · {auth.email}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link to="/lighting-upgrade-engine" data-testid="portal-new-proposal-link"
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                <Calculator size={11} /> Run a new proposal
                            </Link>
                            <button onClick={onSignOut} data-testid="portal-lighting-signout"
                                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-rose-500/40 hover:text-rose-300">
                                Sign out
                            </button>
                        </div>
                    </div>
                </section>

                {/* Decision panel */}
                <DecisionPanel rollup={data?.rollup} />

                {/* Architecture neutrality strip — always visible inside the portal */}
                <section className="border-b border-white/5 bg-ink-800/30 py-4" data-testid="portal-neutrality-strip">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 text-xs text-amber-100 sm:px-6 lg:px-8">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><Cpu size={10} /> Intelligence · CreatorBoostAI</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300"><ShieldCheck size={10} /> Supply · Koollite (manufacturer only)</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300"><Hammer size={10} /> Execution · Your existing contractors</span>
                    </div>
                </section>

                {/* Locations + Projects */}
                <section className="bg-ink-900 py-10" data-testid="portal-projects-section">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Action IDs · lifecycle tracker</p>
                                <h2 className="font-heading mt-1 text-xl font-semibold text-white sm:text-2xl">
                                    {projects.length} {projects.length === 1 ? "project" : "projects"} {filter !== "all" ? `· ${filter}` : "in portfolio"}
                                </h2>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {["all", "identified", "approved", "deployed", "savings_verified"].map((f) => (
                                    <button key={f} onClick={() => setFilter(f)} data-testid={`filter-${f}`}
                                        className={`rounded-sm border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${filter === f ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}>
                                        {f.replace("_", " ")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {projects.length === 0 ? (
                            <div className="mt-5 rounded-md border border-white/10 bg-ink-700/40 p-8 text-center" data-testid="portal-empty-state">
                                <Lightbulb size={20} className="mx-auto text-cyan-400" />
                                <h3 className="font-heading mt-3 text-lg font-semibold text-white">No projects yet for this filter</h3>
                                <p className="mt-2 text-sm text-slate-300">
                                    Generate your first proposal — every Action ID is automatically attached to your account.
                                </p>
                                <Link to="/lighting-upgrade-engine" className="mt-4 inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400">
                                    <Calculator size={13} /> Run a Proposal <ArrowRight size={13} />
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-3" data-testid="portal-project-list">
                                {projects.map((p) => (
                                    <ProjectRow key={p.action_id} project={p} auth={auth} onChange={handleProjectChange} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Locations rollup */}
                {data?.locations && data.locations.length > 0 && (
                    <section className="border-t border-white/5 bg-ink-800/30 py-10" data-testid="portal-locations-section">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Locations registry</p>
                            <h2 className="font-heading mt-1 text-xl font-semibold text-white sm:text-2xl">{data.locations.length} stores tracked</h2>
                            <div className="mt-4 overflow-x-auto rounded-md border border-white/10 bg-ink-700/40">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-ink-900">
                                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Location</th>
                                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Sq ft</th>
                                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Fixtures</th>
                                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Current Action ID</th>
                                            <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.locations.map((loc) => (
                                            <tr key={loc.location_label} className="border-b border-white/5">
                                                <td className="px-3 py-2 text-white"><MapPin size={11} className="mr-1 inline text-cyan-400" />{loc.location_label}</td>
                                                <td className="px-3 py-2 font-mono text-slate-300">{loc.sqft?.toLocaleString()}</td>
                                                <td className="px-3 py-2 font-mono text-slate-300">{loc.fixture_count}</td>
                                                <td className="px-3 py-2 font-mono text-[10px] text-cyan-300">{loc.current_action_id}</td>
                                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{loc.updated_at && new Date(loc.updated_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    );
};

// =================================================================
// PAGE
// =================================================================
export default function PortalLightingPage() {
    const [auth, setAuth] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Hydrate from localStorage if a portal user is already signed in
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (stored?.email && stored?.token) {
                portalLightingProjects({ email: stored.email, token: stored.token })
                    .then((d) => { setAuth({ email: stored.email, token: stored.token }); setData(d); })
                    .catch(() => { /* token invalid — show login */ })
                    .finally(() => setLoading(false));
                return;
            }
        } catch { /* ignore parse errors */ }
        setLoading(false);
    }, []);

    const refresh = async () => {
        if (!auth) return;
        try { setData(await portalLightingProjects(auth)); } catch { /* keep current data */ }
    };

    const signOut = () => {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        setAuth(null); setData(null);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex min-h-[40vh] items-center justify-center bg-ink-900">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                </div>
            </Layout>
        );
    }

    if (!auth) return <LoginScreen onAuth={({ email, token, data: d }) => { setAuth({ email, token }); setData(d); }} />;

    return <CommandCenter auth={auth} data={data} onSignOut={signOut} onRefresh={refresh} />;
}
