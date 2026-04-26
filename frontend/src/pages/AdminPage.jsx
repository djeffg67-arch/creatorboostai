import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import {
    adminLogin,
    adminListLeads,
    adminStats,
    adminExportUrl,
    adminPickerStats,
    adminListSubscriptions,
    adminListTransactions,
} from "@/lib/api";
import { toast } from "sonner";
import {
    LogIn, Download, RefreshCw, Loader2, Users, Mail, Inbox,
    Building2, ShieldCheck, MousePointerClick, CreditCard, Repeat,
} from "lucide-react";

const STORAGE_KEY = "bodyiq_admin_token";

export default function AdminPage() {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
    const [password, setPassword] = useState("");
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState(null);
    const [pickerStats, setPickerStats] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");
    const [dateRange, setDateRange] = useState("all"); // 7d | 30d | all

    const loadData = useCallback(async (t, range = "all") => {
        setLoading(true);
        try {
            const [leadsRes, statsRes, pickerRes, subsRes, txRes] = await Promise.all([
                adminListLeads(t),
                adminStats(t),
                adminPickerStats(t).catch(() => null),
                adminListSubscriptions(t, range).catch(() => []),
                adminListTransactions(t, range).catch(() => []),
            ]);
            setLeads(leadsRes);
            setStats(statsRes);
            setPickerStats(pickerRes);
            setSubscriptions(subsRes || []);
            setTransactions(txRes || []);
        } catch (err) {
            if (err?.response?.status === 401) {
                localStorage.removeItem(STORAGE_KEY);
                setToken("");
                toast.error("Session expired. Log in again.");
            } else {
                toast.error("Failed to load admin data.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) loadData(token, dateRange);
    }, [token, dateRange, loadData]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        try {
            const res = await adminLogin(password);
            localStorage.setItem(STORAGE_KEY, res.token);
            setToken(res.token);
            setPassword("");
            toast.success("Access granted.");
        } catch (err) {
            toast.error("Invalid password");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setToken("");
        setLeads([]);
        setStats(null);
        setPickerStats(null);
        setSubscriptions([]);
        setTransactions([]);
    };

    const filteredLeads = filter === "all" ? leads : leads.filter((l) => l.source === filter);
    const sources = stats ? Object.keys(stats.by_source) : [];

    if (!token) {
        return (
            <Layout>
                <section className="flex min-h-[70vh] items-center justify-center px-5 py-16" data-testid="admin-login-page">
                    <form
                        onSubmit={handleLogin}
                        className="w-full max-w-sm rounded-md border border-white/10 bg-ink-700/40 p-8 backdrop-blur-sm"
                    >
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Restricted</p>
                        <h1 className="font-heading mt-3 text-2xl font-semibold text-white">Admin Console</h1>
                        <p className="mt-2 text-sm text-slate-400">Enter password to view captured leads.</p>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Admin password"
                            data-testid="admin-password"
                            className="mt-6 w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            data-testid="admin-login-submit"
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-3 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                            Enter
                        </button>
                    </form>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            <section className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8" data-testid="admin-dashboard">
                <div className="flex flex-col gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">BodyIQ-AI · Admin Console</p>
                        <h1 className="font-heading mt-2 text-3xl font-semibold text-white">Lead Intelligence</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Date range filter — applies to subscriptions + transactions */}
                        <div className="hidden sm:flex items-center rounded-md border border-white/10 bg-ink-700/40 p-0.5" data-testid="admin-date-range">
                            {["7d", "30d", "all"].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setDateRange(r)}
                                    data-testid={`admin-range-${r}`}
                                    className={`rounded-sm px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${dateRange === r ? "bg-cyan-500 text-ink-900" : "text-slate-300 hover:text-cyan-300"}`}
                                >{r === "all" ? "All-time" : r}</button>
                            ))}
                        </div>
                        <button
                            onClick={() => loadData(token, dateRange)}
                            disabled={loading}
                            data-testid="admin-refresh"
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Refresh
                        </button>
                        <a
                            href={adminExportUrl(token)}
                            data-testid="admin-export"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-ink-900 transition-colors hover:bg-cyan-400"
                        >
                            <Download size={14} /> Export CSV
                        </a>
                        <button
                            onClick={handleLogout}
                            data-testid="admin-logout"
                            className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard icon={Users} label="Total Leads" value={stats?.total ?? "—"} />
                    <StatCard icon={Mail} label="Training" value={stats?.by_source?.training ?? 0} />
                    <StatCard icon={Inbox} label="Demo" value={(stats?.by_source?.demo ?? 0) + (stats?.by_source?.demo_training ?? 0)} />
                </div>

                {/* Picker analytics */}
                {pickerStats && (
                    <div className="mt-4 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4" data-testid="picker-stats">
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-cyan-500/20 pb-3">
                            <div className="flex items-center gap-2">
                                <MousePointerClick size={13} className="text-cyan-400" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Vertical Picker · /demo</span>
                            </div>
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                {pickerStats.last_24h} clicks · 24h · {pickerStats.last_7d} clicks · 7d · {pickerStats.total} all-time
                            </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <PickerStatCard icon={Building2} label="Real Estate" value={pickerStats?.by_vertical?.realtor ?? 0} />
                            <PickerStatCard icon={ShieldCheck} label="Insurance" value={pickerStats?.by_vertical?.insurance ?? 0} />
                            <PickerStatCard icon={MousePointerClick} label="Mortgage" value={pickerStats?.by_vertical?.mortgage ?? 0} />
                            <PickerStatCard icon={MousePointerClick} label="Other" value={pickerStats?.by_vertical?.other ?? 0} />
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="mt-8 flex flex-wrap gap-2" data-testid="admin-filters">
                    <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
                        All · {leads.length}
                    </FilterPill>
                    {sources.map((s) => (
                        <FilterPill key={s} active={filter === s} onClick={() => setFilter(s)}>
                            {s} · {stats.by_source[s]}
                        </FilterPill>
                    ))}
                </div>

                {/* Leads table */}
                <div className="mt-6 overflow-hidden rounded-md border border-white/10">
                    <div className="scrollbar-cyan overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm" data-testid="admin-leads-table">
                            <thead>
                                <tr className="bg-ink-700/60 text-left">
                                    <Th>Email</Th>
                                    <Th>Source</Th>
                                    <Th>Name</Th>
                                    <Th>Message</Th>
                                    <Th>Timestamp</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-500" data-testid="admin-empty">
                                            No leads yet. Once they come in, they'll appear here.
                                        </td>
                                    </tr>
                                )}
                                {filteredLeads.map((l, i) => (
                                    <tr
                                        key={l.id}
                                        data-testid={`admin-lead-row-${i}`}
                                        className="border-t border-white/5 transition-colors hover:bg-ink-700/30"
                                    >
                                        <Td className="font-mono text-xs text-cyan-300">{l.email}</Td>
                                        <Td>
                                            <span className="rounded-sm border border-white/10 bg-ink-800 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                                                {l.source}
                                            </span>
                                        </Td>
                                        <Td className="text-slate-200">{l.name || "—"}</Td>
                                        <Td className="max-w-[320px] truncate text-slate-400">{l.message || "—"}</Td>
                                        <Td className="font-mono text-xs text-slate-500">
                                            {new Date(l.timestamp).toLocaleString()}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Subscriptions */}
                <SectionHeading icon={Repeat} label="Subscriptions" badge={`${subscriptions.length} · ${dateRange}`} />
                <div className="mt-3 overflow-hidden rounded-md border border-white/10" data-testid="admin-subscriptions">
                    <div className="scrollbar-cyan overflow-x-auto">
                        <table className="w-full min-w-[800px] text-sm">
                            <thead>
                                <tr className="bg-ink-700/60 text-left">
                                    <Th>Email</Th>
                                    <Th>Plan</Th>
                                    <Th>Tier</Th>
                                    <Th>Interval</Th>
                                    <Th>Status</Th>
                                    <Th>Started</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No subscriptions in this window.</td></tr>
                                )}
                                {subscriptions.map((s, i) => (
                                    <tr key={s.id || i} data-testid={`admin-sub-row-${i}`} className="border-t border-white/5">
                                        <Td className="font-mono text-xs text-cyan-300">{s.email}</Td>
                                        <Td className="text-slate-200">{s.plan_key}</Td>
                                        <Td className="text-slate-300">{s.tier}</Td>
                                        <Td className="text-slate-300">{s.interval}</Td>
                                        <Td>
                                            <span className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${s.status === "active" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>{s.status || "unknown"}</span>
                                        </Td>
                                        <Td className="font-mono text-xs text-slate-500">{s.started_at ? new Date(s.started_at).toLocaleString() : "—"}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Payment transactions */}
                <SectionHeading icon={CreditCard} label="Payment Transactions" badge={`${transactions.length} · ${dateRange}`} />
                <div className="mt-3 overflow-hidden rounded-md border border-white/10" data-testid="admin-transactions">
                    <div className="scrollbar-cyan overflow-x-auto">
                        <table className="w-full min-w-[800px] text-sm">
                            <thead>
                                <tr className="bg-ink-700/60 text-left">
                                    <Th>Email</Th>
                                    <Th>Product</Th>
                                    <Th>Amount</Th>
                                    <Th>Type</Th>
                                    <Th>Status</Th>
                                    <Th>Created</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No transactions in this window.</td></tr>
                                )}
                                {transactions.map((t, i) => (
                                    <tr key={t.id || i} data-testid={`admin-txn-row-${i}`} className="border-t border-white/5">
                                        <Td className="font-mono text-xs text-cyan-300">{t.email || "—"}</Td>
                                        <Td className="text-slate-200">{t.product_name || t.product_key}</Td>
                                        <Td className="font-mono text-xs text-slate-200">${Number(t.amount || 0).toLocaleString()} {t.currency?.toUpperCase()}</Td>
                                        <Td>
                                            <span className="rounded-sm border border-white/10 bg-ink-800 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">{t.subscription ? "subscription" : "one-time"}</span>
                                        </Td>
                                        <Td>
                                            <span className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${t.payment_status === "paid" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-300"}`}>{t.payment_status || "unpaid"}</span>
                                        </Td>
                                        <Td className="font-mono text-xs text-slate-500">{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </Layout>
    );
}

const StatCard = ({ icon: Icon, label, value }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5">
        <div className="flex items-center gap-2">
            <Icon size={14} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        </div>
        <p className="font-heading mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
);

const PickerStatCard = ({ icon: Icon, label, value }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <div className="flex items-center gap-2">
            <Icon size={12} className="text-cyan-400" />
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        </div>
        <p className="font-heading mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
);

const FilterPill = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
            active
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
        }`}
    >
        {children}
    </button>
);

const Th = ({ children }) => (
    <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{children}</th>
);
const Td = ({ children, className = "" }) => (
    <td className={`px-5 py-3 ${className}`}>{children}</td>
);

const SectionHeading = ({ icon: Icon, label, badge }) => (
    <div className="mt-10 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span>
        </div>
        {badge && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{badge}</span>}
    </div>
);
