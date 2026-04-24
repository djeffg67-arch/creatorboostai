import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import {
    adminLogin,
    adminListLeads,
    adminStats,
    adminExportUrl,
} from "@/lib/api";
import { toast } from "sonner";
import { LogIn, Download, RefreshCw, Loader2, Users, Mail, Inbox } from "lucide-react";

const STORAGE_KEY = "bodyiq_admin_token";

export default function AdminPage() {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
    const [password, setPassword] = useState("");
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");

    const loadData = useCallback(async (t) => {
        setLoading(true);
        try {
            const [leadsRes, statsRes] = await Promise.all([
                adminListLeads(t),
                adminStats(t),
            ]);
            setLeads(leadsRes);
            setStats(statsRes);
        } catch (err) {
            if (err?.response?.status === 401) {
                localStorage.removeItem(STORAGE_KEY);
                setToken("");
                toast.error("Session expired. Log in again.");
            } else {
                toast.error("Failed to load leads.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) loadData(token);
    }, [token, loadData]);

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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => loadData(token)}
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

                {/* Table */}
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
