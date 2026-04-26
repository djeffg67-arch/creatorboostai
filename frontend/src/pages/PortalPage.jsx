import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { portalLogin, portalBillingSession } from "@/lib/api";
import { toast } from "sonner";
import { Lock, ArrowRight, Check, Sparkles, BookOpen, Mail, CreditCard } from "lucide-react";

const STORAGE_KEY = "bodyiq_portal_user";

export default function PortalPage() {
    const [params] = useSearchParams();
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
    });
    const [form, setForm] = useState({ email: "", token: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // If we just bounced back from Stripe checkout, just show a success/welcome card
        if (params.get("session_id") && !user) {
            // No-op — user fills in the magic-link token from email
        }
    }, [params, user]);

    const login = async (e) => {
        e.preventDefault();
        if (!form.email || !form.token) { toast.error("Email and access token required"); return; }
        setLoading(true);
        try {
            const res = await portalLogin(form);
            const data = {
                email: res.email,
                token: form.token,
                entitlements: res.entitlements,
                subscriptions: res.subscriptions || [],
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            setUser(data);
            toast.success(`Welcome, ${res.email}`);
        } catch (err) {
            toast.error("Invalid email or access token");
        } finally {
            setLoading(false);
        }
    };

    const openBillingPortal = async () => {
        if (!user) return;
        try {
            const res = await portalBillingSession({
                email: user.email,
                token: user.token,
                return_url: window.location.origin,
            });
            if (res?.url) window.open(res.url, "_blank", "noopener");
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not open billing portal");
        }
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setForm({ email: "", token: "" });
    };

    // Just-paid welcome state (came from Stripe with session_id but no login yet)
    const justPaid = !!params.get("session_id") && !user;

    if (justPaid) {
        return (
            <Layout>
                <div className="relative mx-auto max-w-3xl px-4 py-20 lg:py-28" data-testid="portal-welcome">
                    <div className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-8 lg:p-12 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Check size={11} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Payment received · access being prepared</span>
                        </div>
                        <h1 className="font-heading mt-5 text-3xl font-semibold text-white sm:text-4xl">
                            Welcome aboard.
                        </h1>
                        <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
                            We've created your account and just emailed you your <span className="text-cyan-300">access token</span>.
                            Use it below to log in and access your training and platform entitlements.
                        </p>
                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                            <Step n="1" label="Check your inbox" body="The email from jeffrey@creatorboostai.com contains your access token." />
                            <Step n="2" label="Log in below" body="Paste the token + the email you used at checkout." />
                            <Step n="3" label="Get to work" body="Your entitlements unlock immediately." />
                        </div>
                        <div className="mt-8">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Already have your token?</p>
                            <button
                                onClick={() => window.scrollTo({ top: 9999, behavior: "smooth" })}
                                className="mt-2 inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 text-sm"
                            >
                                Log in below <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                    <PortalLoginForm form={form} setForm={setForm} loading={loading} login={login} />
                </div>
            </Layout>
        );
    }

    if (user) {
        return (
            <Layout>
                <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8 lg:py-20" data-testid="portal-dashboard">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Your portal</p>
                            <h1 className="font-heading mt-2 text-3xl font-semibold text-white sm:text-4xl">
                                Welcome, {user.email}.
                            </h1>
                        </div>
                        <button
                            onClick={logout}
                            data-testid="portal-logout"
                            className="rounded-md border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300"
                        >Log out</button>
                    </div>

                    {/* Entitlements */}
                    <section className="mt-10" data-testid="portal-entitlements">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Your access</p>
                        {user.entitlements?.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-400">No entitlements found yet. If you just paid, refresh in a minute.</p>
                        ) : (
                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {user.entitlements?.map((e, i) => (
                                    <div key={i} className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={14} className="text-cyan-400" />
                                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                                                {e.kind === "subscription" ? `Subscription · ${e.tier} · /${e.interval}` : "Lifetime access"}
                                            </span>
                                        </div>
                                        <h3 className="font-heading mt-2 text-lg font-semibold text-white">{e.product_name || e.product_key}</h3>
                                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                            Granted {new Date(e.granted_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Quick links */}
                    <section className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <button
                            type="button"
                            onClick={openBillingPortal}
                            data-testid="portal-manage-subscription"
                            className="flex items-center gap-3 rounded-md border border-cyan-500/40 bg-cyan-500/5 p-4 text-left transition-all hover:border-cyan-500/60 hover:bg-cyan-500/10"
                        >
                            <CreditCard size={14} className="text-cyan-400" />
                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">Manage Subscription</span>
                            <ArrowRight size={12} className="ml-auto text-cyan-400" />
                        </button>
                        <QuickLink href="/training" Icon={BookOpen} label="Training programs" />
                        <QuickLink href="/contact" Icon={Mail} label="Contact support" />
                    </section>
                </div>
            </Layout>
        );
    }

    // Not logged in, no session_id
    return (
        <Layout>
            <div className="mx-auto max-w-3xl px-4 py-20 lg:py-28" data-testid="portal-login">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                    <Lock size={11} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Customer Portal</span>
                </div>
                <h1 className="font-heading mt-5 text-3xl font-semibold text-white sm:text-4xl">
                    Log in with your access token.
                </h1>
                <p className="mt-4 max-w-xl text-sm text-slate-300">
                    Your access token was emailed to you when your purchase was confirmed. If you can't find it,
                    check spam or <Link to="/contact" className="text-cyan-300 hover:text-cyan-200">contact support</Link>.
                </p>
                <PortalLoginForm form={form} setForm={setForm} loading={loading} login={login} />
            </div>
        </Layout>
    );
}

const PortalLoginForm = ({ form, setForm, loading, login }) => (
    <form onSubmit={login} className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 space-y-4" data-testid="portal-login-form">
        <Field label="Email">
            <input
                data-testid="portal-email"
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="you@company.com"
            />
        </Field>
        <Field label="Access token">
            <input
                data-testid="portal-token"
                type="text" required
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="From your confirmation email"
            />
        </Field>
        <button
            type="submit" disabled={loading}
            data-testid="portal-submit"
            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 disabled:opacity-60"
        >
            {loading ? "Logging in…" : "Log in"} <ArrowRight size={15} />
        </button>
    </form>
);

const inputClass = "input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none";

const Field = ({ label, children }) => (
    <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        <div className="mt-2">{children}</div>
    </label>
);

const Step = ({ n, label, body }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400">Step {n}</p>
        <p className="mt-1.5 font-medium text-white text-sm">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{body}</p>
    </div>
);

const QuickLink = ({ href, Icon, label }) => (
    <Link to={href} className="flex items-center gap-3 rounded-md border border-white/10 bg-ink-700/40 p-4 transition-all hover:border-cyan-500/30 hover:text-cyan-300">
        <Icon size={14} className="text-cyan-400" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">{label}</span>
        <ArrowRight size={12} className="ml-auto" />
    </Link>
);
