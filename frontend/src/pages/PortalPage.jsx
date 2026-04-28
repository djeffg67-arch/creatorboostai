import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { portalLogin, portalBillingSession, portalSignalPackDownload, portalResendMagicLink } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { toast } from "sonner";
import { Lock, ArrowRight, Check, Sparkles, BookOpen, Mail, CreditCard, Download, Clock, Send } from "lucide-react";

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
                    <ResendMagicLink defaultEmail={form.email} />
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
                                    <EntitlementCard key={i} entitlement={e} user={user} />
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
            <div className="relative mx-auto max-w-3xl px-4 py-20 lg:py-28" data-testid="portal-login">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <img src={PAGE_HERO.portal} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="eager" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/80 via-ink-900/85 to-ink-900" />
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 360, height: 360, top: -120, right: -80 }} />
                </div>
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
                <ResendMagicLink defaultEmail={form.email} />
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

const ResendMagicLink = ({ defaultEmail = "" }) => {
    const [email, setEmail] = useState(defaultEmail);
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (defaultEmail) setEmail(defaultEmail);
    }, [defaultEmail]);

    const submit = async (ev) => {
        ev.preventDefault();
        if (!email) return;
        setLoading(true);
        try {
            const r = await portalResendMagicLink({
                email,
                origin_url: window.location.origin,
            });
            toast.success(r?.message || "If that email has an account, a fresh link is on the way.");
            setSent(true);
        } catch {
            // Keep response generic — never disclose existence / errors.
            toast.success("If that email has an account, a fresh link is on the way.");
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="mt-6 rounded-md border border-white/10 bg-ink-700/30 p-5"
            data-testid="portal-resend-magic-link"
        >
            <div className="flex items-center gap-2">
                <Send size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    Lost your access email?
                </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
                Enter the email you used at checkout — we'll send you a fresh portal magic link.
            </p>
            {sent ? (
                <div
                    className="mt-3 flex items-start gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-cyan-200"
                    data-testid="portal-resend-sent"
                >
                    <Check size={14} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                    <span>
                        If that email has an account with us, a fresh access link is on the way.
                        Check your inbox (and spam) in the next minute.
                    </span>
                </div>
            ) : (
                <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        placeholder="you@company.com"
                        data-testid="portal-resend-email"
                        className="input-glow flex-1 rounded-md border border-white/10 bg-ink-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loading || !email}
                        data-testid="portal-resend-submit"
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-500 hover:text-ink-900 disabled:opacity-60"
                    >
                        <Send size={12} /> {loading ? "Sending…" : "Resend link"}
                    </button>
                </form>
            )}
        </div>
    );
};

const EntitlementCard = ({ entitlement: e, user }) => {
    const [action, setAction] = useState({ loading: false, url: null, pending: false, note: null });
    const isSignalPack = (e.product_key || "").startsWith("signal_pack_");
    const isForensic = e.product_key === "forensic_library";
    const isTraining = ["foundations", "applied", "strategy", "full_training"].includes(e.product_key);

    const fetchSignalPack = async () => {
        if (!isSignalPack) return;
        setAction({ loading: true, url: null, pending: false, note: null });
        try {
            const r = await portalSignalPackDownload({ email: user.email, token: user.token });
            setAction({
                loading: false,
                url: r?.download_url || null,
                pending: !!r?.pending,
                note: r?.note || null,
            });
            if (r?.download_url) {
                window.open(r.download_url, "_blank", "noopener");
            }
        } catch {
            toast.error("Download unavailable. Please contact support.");
            setAction({ loading: false, url: null, pending: false, note: null });
        }
    };

    return (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5" data-testid={`portal-entitlement-${e.product_key}`}>
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

            <div className="mt-4 flex flex-wrap gap-2">
                {isSignalPack && (
                    <button
                        type="button"
                        onClick={fetchSignalPack}
                        disabled={action.loading}
                        data-testid={`entitlement-download-${e.product_key}`}
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                    >
                        {action.pending ? <Clock size={12} /> : <Download size={12} />}
                        {action.loading ? "Preparing…" : action.pending ? "Delivery pending" : "Download pack"}
                    </button>
                )}
                {isForensic && (
                    <Link
                        to="/forensic-library"
                        data-testid="entitlement-forensic-open"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400"
                    >
                        Open library <ArrowRight size={11} />
                    </Link>
                )}
                {isTraining && (
                    <Link
                        to="/training"
                        data-testid="entitlement-training-open"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-ink-900 hover:bg-cyan-400"
                    >
                        Training details <ArrowRight size={11} />
                    </Link>
                )}
                {e.kind === "subscription" && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                        <Check size={10} /> Active
                    </span>
                )}
            </div>
            {action.note && (
                <p className="mt-3 text-xs text-amber-200/90">{action.note}</p>
            )}
        </div>
    );
};

