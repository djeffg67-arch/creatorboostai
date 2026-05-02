import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { submitEngagementApplication } from "@/lib/api";
import { toast } from "sonner";
import {
    Shield, CheckCircle2, Send, Lock, Clock, ArrowRight, AlertTriangle, Crown, Trophy,
} from "lucide-react";

const REVENUE_BANDS = [
    "Under $10K / month",
    "$10K – $50K / month",
    "$50K – $100K / month",
    "$100K – $500K / month",
    "$500K – $1M / month",
    "Over $1M / month",
];

const ROLE_OPTIONS = [
    "Founder / CEO",
    "C-Suite (COO / CFO / Revenue)",
    "VP / Head of Sales",
    "VP / Head of Marketing",
    "Legal / Counsel",
    "Enterprise / Partnerships",
    "Operations leader",
    "Other",
];

const ENGAGEMENT_TYPES = [
    "Sales / Revenue",
    "Negotiation",
    "Hiring / Team Build",
    "Leadership / Executive Coaching",
    "Legal / Litigation Support",
    "Enterprise / Partnership Deal",
    "Other",
];

const DEAL_SIZES = [
    "Under $50K",
    "$50K – $250K",
    "$250K – $1M",
    "$1M+",
];

export default function EngagementApplyPage() {
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        company: "",
        role: "",
        monthly_revenue: "",
        engagement_type: "",
        deal_size: "",
        use_case: "",
        upload_url: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        if (form.full_name.trim().length < 2) { toast.error("Please enter your full name"); return; }
        if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast.error("Please enter a valid email"); return; }
        if (form.use_case.trim().length < 20) { toast.error("Please describe your use case in more detail (20+ chars)"); return; }
        setSubmitting(true);
        try {
            const res = await submitEngagementApplication({
                ...form,
                source_page: typeof window !== "undefined"
                    ? `${window.location.pathname}${window.location.search || ""}`
                    : undefined,
            });
            setSubmitted(res);
            toast.success("Application received");
        } catch (err) {
            const msg = err?.response?.data?.detail || "Could not submit application. Please try again.";
            toast.error(typeof msg === "string" ? msg : "Submission failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        const calendlyShown = Boolean(submitted?.calendly_shown && submitted?.calendly_url);
        const isHighValue = submitted?.priority === "high" || submitted?.priority === "urgent";
        return (
            <Layout>
                <section className="relative mx-auto max-w-4xl px-4 py-20 lg:px-8">
                    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-900 to-ink-800" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, left: -140 }} />
                        <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -160, right: -120 }} />
                    </div>

                    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-800 p-8 text-center shadow-[0_0_60px_rgba(6,182,212,0.18)] lg:p-10" data-testid="apply-confirmation">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                            <CheckCircle2 size={28} className="text-cyan-300" />
                        </div>
                        {isHighValue && (
                            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300" data-testid="apply-highvalue-badge">
                                <Crown size={11} /> Qualified · {(submitted.priority || "high").toUpperCase()} priority
                            </p>
                        )}
                        {!isHighValue && (
                            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                Priority · {(submitted.priority || "standard").toUpperCase()}
                            </p>
                        )}

                        <h1 className="font-heading mt-4 text-3xl font-semibold text-white sm:text-4xl">
                            Application received.
                        </h1>

                        {calendlyShown ? (
                            <p className="mt-4 text-base leading-relaxed text-slate-300" data-testid="apply-confirm-highvalue-copy">
                                Based on your submission, you qualify to request a strategy review.{" "}
                                <strong className="text-cyan-300">Please book a private call below.</strong>
                            </p>
                        ) : (
                            <p className="mt-4 text-base leading-relaxed text-slate-300" data-testid="apply-confirm-standard-copy">
                                We review all requests manually.{" "}
                                <strong className="text-cyan-300">If aligned, you'll receive a private scheduling link.</strong>
                            </p>
                        )}

                        {calendlyShown && (
                            <div className="mt-8 overflow-hidden rounded-md border border-cyan-500/30 bg-ink-900" data-testid="apply-calendly">
                                <div className="flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5">
                                    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                        <Clock size={11} /> Private strategy review · direct booking
                                    </span>
                                    <a
                                        href={submitted.calendly_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-testid="apply-calendly-open"
                                        className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:text-cyan-200"
                                    >
                                        Open in new tab ↗
                                    </a>
                                </div>
                                <iframe
                                    src={submitted.calendly_url}
                                    title="Book your private strategy review"
                                    data-testid="apply-calendly-iframe"
                                    className="h-[720px] w-full border-0 bg-white"
                                    loading="lazy"
                                />
                            </div>
                        )}

                        {!calendlyShown && (
                            <p className="mt-4 text-sm leading-relaxed text-slate-400">
                                Our team reviews every application within 24 hours.
                            </p>
                        )}

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                to="/"
                                data-testid="apply-confirm-home"
                                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                            >
                                Return home <ArrowRight size={12} />
                            </Link>
                            <Link
                                to="/pricing"
                                data-testid="apply-confirm-pricing"
                                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                            >
                                See subscription tiers
                            </Link>
                        </div>
                        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            Reference · {submitted.application_id}
                        </p>
                    </div>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            <section className="relative mx-auto max-w-5xl px-4 py-16 lg:px-8" data-testid="apply-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-900 to-ink-800" />
                    <div className="absolute inset-0 ambient-grid opacity-50" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -160, left: -140 }} />
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* Intro */}
                    <div className="lg:col-span-5">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Crown size={12} className="text-cyan-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                High-Stakes Engagement
                            </span>
                        </div>
                        <h1 className="font-heading mt-5 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-4xl lg:text-5xl">
                            High-Stakes Engagement <span className="text-cyan-400">Application</span>
                        </h1>
                        <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
                            For decision-critical environments where a single conversation, negotiation, or hire can move millions. Applications are reviewed before acceptance.
                        </p>

                        <ul className="mt-8 space-y-3 text-sm">
                            {[
                                { Icon: Shield,       t: "Reviewed within 24 hours" },
                                { Icon: Lock,         t: "Privileged · NDA-ready" },
                                { Icon: Trophy,       t: "For $10K – $35K+ engagements" },
                                { Icon: AlertTriangle, t: "Only accepted when we're confident we can move the needle" },
                            ].map(({ Icon, t }) => (
                                <li key={t} className="flex items-start gap-3 text-slate-300">
                                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5">
                                        <Icon size={12} className="text-cyan-300" />
                                    </span>
                                    {t}
                                </li>
                            ))}
                        </ul>

                        <div className="mt-10 rounded-sm border border-white/10 bg-ink-700/40 p-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">What happens next</p>
                            <ol className="mt-3 space-y-2 text-sm text-slate-300">
                                <li className="flex gap-3">
                                    <span className="font-mono text-[10px] text-cyan-300">01</span>
                                    <span>We review your situation against current capacity.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-mono text-[10px] text-cyan-300">02</span>
                                    <span>If qualified, a private scheduling link is emailed to you.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-mono text-[10px] text-cyan-300">03</span>
                                    <span>Brief strategy call · scope · outcomes · engagement plan.</span>
                                </li>
                            </ol>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="lg:col-span-7">
                        <form
                            onSubmit={onSubmit}
                            data-testid="apply-form"
                            className="rounded-md border border-white/10 bg-ink-700/40 p-6 sm:p-8"
                        >
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <Field label="Full name" required>
                                    <input
                                        required
                                        value={form.full_name}
                                        onChange={update("full_name")}
                                        data-testid="apply-field-name"
                                        placeholder="Jane Smith"
                                        className={inputCx}
                                    />
                                </Field>
                                <Field label="Email" required>
                                    <input
                                        required
                                        type="email"
                                        value={form.email}
                                        onChange={update("email")}
                                        data-testid="apply-field-email"
                                        placeholder="jane@company.com"
                                        className={inputCx}
                                    />
                                </Field>
                                <Field label="Company or organization">
                                    <input
                                        value={form.company}
                                        onChange={update("company")}
                                        data-testid="apply-field-company"
                                        placeholder="Acme Corp"
                                        className={inputCx}
                                    />
                                </Field>
                                <Field label="Role">
                                    <select
                                        value={form.role}
                                        onChange={update("role")}
                                        data-testid="apply-field-role"
                                        className={inputCx}
                                    >
                                        <option value="">Select your role…</option>
                                        {ROLE_OPTIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                                    </select>
                                </Field>
                                <Field label="Monthly revenue range" full>
                                    <select
                                        value={form.monthly_revenue}
                                        onChange={update("monthly_revenue")}
                                        data-testid="apply-field-revenue"
                                        className={inputCx}
                                    >
                                        <option value="">Select a range…</option>
                                        {REVENUE_BANDS.map((b) => (<option key={b} value={b}>{b}</option>))}
                                    </select>
                                </Field>
                                <Field label="Engagement type">
                                    <select
                                        value={form.engagement_type}
                                        onChange={update("engagement_type")}
                                        data-testid="apply-field-engagement-type"
                                        className={inputCx}
                                    >
                                        <option value="">Select a type…</option>
                                        {ENGAGEMENT_TYPES.map((b) => (<option key={b} value={b}>{b}</option>))}
                                    </select>
                                </Field>
                                <Field label="Estimated deal size / impact">
                                    <select
                                        value={form.deal_size}
                                        onChange={update("deal_size")}
                                        data-testid="apply-field-deal-size"
                                        className={inputCx}
                                    >
                                        <option value="">Select a range…</option>
                                        {DEAL_SIZES.map((b) => (<option key={b} value={b}>{b}</option>))}
                                    </select>
                                </Field>
                                <Field label="Describe your use case or situation" required full>
                                    <textarea
                                        required
                                        rows={6}
                                        minLength={20}
                                        maxLength={4000}
                                        value={form.use_case}
                                        onChange={update("use_case")}
                                        data-testid="apply-field-usecase"
                                        placeholder="What's the high-stakes decision, negotiation, hire, or engagement? What's at risk? What timeline are you working against?"
                                        className={`${inputCx} resize-y`}
                                    />
                                </Field>
                                <Field label="Reference link (optional)" full hint="Paste a link to a video, brief, deck, or doc that gives context. Uploads can also be emailed after submission.">
                                    <input
                                        type="url"
                                        value={form.upload_url}
                                        onChange={update("upload_url")}
                                        data-testid="apply-field-upload"
                                        placeholder="https://…"
                                        className={inputCx}
                                    />
                                </Field>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/5 pt-6">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    data-testid="apply-submit-btn"
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_22px_rgba(6,182,212,0.4)] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900/30 border-t-ink-900" />
                                            Submitting…
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} /> Request Engagement Review <ArrowRight size={13} />
                                        </>
                                    )}
                                </button>
                                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                    <Clock size={11} /> Reviewed within 24 hours
                                </span>
                            </div>

                            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Your information is private · used only to assess fit.
                            </p>
                        </form>
                    </div>
                </div>
            </section>
        </Layout>
    );
}

const inputCx = "w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30";

const Field = ({ label, children, required, full, hint }) => (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
        <span className="mb-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
            {label}{required && <span className="text-cyan-300">*</span>}
        </span>
        {children}
        {hint && <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{hint}</span>}
    </label>
);
