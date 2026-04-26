import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { listHighTicket, submitApplication } from "@/lib/api";
import { toast } from "sonner";
import {
    Lock, ArrowRight, Check, ShieldCheck, Calendar,
    Phone, Mail, Building2, DollarSign, Users, Layers, MessageSquare,
} from "lucide-react";

const REVENUE_RANGES = [
    "Under $250k",
    "$250k – $1M",
    "$1M – $5M",
    "$5M – $25M",
    "$25M – $100M",
    "$100M+",
];

const TEAM_SIZES = [
    "1 (just me)",
    "2 – 5",
    "6 – 25",
    "26 – 100",
    "100+",
];

// Friendly URL aliases — /apply/strategy and /apply/mastery are the
// public-facing routes; they map to backend program keys.
const PROGRAM_ALIAS = {
    strategy: "accelerator_7k",
    mastery: "mastery_27k",
};

export default function ApplyPage() {
    const { program: rawProgramKey } = useParams();
    const programKey = PROGRAM_ALIAS[rawProgramKey] || rawProgramKey;
    const [program, setProgram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [bookingUrl, setBookingUrl] = useState(null);
    const [form, setForm] = useState({
        name: "", email: "", phone: "", company: "",
        revenue_range: "", team_size: "",
        current_systems: "", biggest_challenge: "",
    });

    useEffect(() => {
        listHighTicket()
            .then((r) => {
                if (r[programKey]) {
                    setProgram({ key: programKey, ...r[programKey] });
                } else {
                    setProgram({ invalid: true });
                }
            })
            .catch(() => setProgram({ invalid: true }))
            .finally(() => setLoading(false));
    }, [programKey]);

    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.phone || !form.biggest_challenge) {
            toast.error("Name, email, phone, and biggest challenge are required");
            return;
        }
        setSubmitting(true);
        try {
            const res = await submitApplication({
                program_key: programKey,
                ...form,
            });
            setBookingUrl(res.booking_url);
            toast.success("Application received");
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not submit. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="mx-auto max-w-3xl px-4 py-24 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Loading…</p>
                </div>
            </Layout>
        );
    }

    if (program?.invalid) {
        return (
            <Layout>
                <div className="mx-auto max-w-3xl px-4 py-24 text-center" data-testid="apply-invalid">
                    <h1 className="font-heading text-3xl font-semibold text-white">Program not found</h1>
                    <p className="mt-3 text-slate-400">This application link is invalid or the program is no longer accepting applications.</p>
                    <Link to="/training" className="mt-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
                        Back to training <ArrowRight size={14} />
                    </Link>
                </div>
            </Layout>
        );
    }

    if (bookingUrl) {
        return (
            <Layout>
                <div className="relative mx-auto max-w-3xl px-4 py-20 lg:py-28" data-testid="apply-success">
                    <div className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-8 lg:p-12 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Check size={11} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Application received</span>
                        </div>
                        <h1 className="font-heading mt-5 text-3xl font-semibold text-white sm:text-4xl">
                            Last step: book your strategy call.
                        </h1>
                        <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                            Your application for <span className="text-cyan-300">{program.name}</span> is in.
                            We close every {program.name} engagement on a strategy call — no auto-charges, no
                            checkout pressure. Pick a time that works and we'll confirm fit live.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a
                                href={bookingUrl}
                                target="_blank" rel="noopener noreferrer"
                                data-testid="apply-booking-link"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                            >
                                <Calendar size={15} /> Book my strategy call
                            </a>
                            <Link
                                to="/training"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/15 px-6 py-4 text-sm font-semibold text-white transition-all hover:border-cyan-500/40 hover:text-cyan-300"
                            >
                                Back to training
                            </Link>
                        </div>
                        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm text-slate-300">
                            <Note label="What happens next" body="A 30-min strategy call to confirm the program is the right fit." />
                            <Note label="If we close" body="You'll receive a Stripe invoice or wire instructions — never an auto-charge." />
                            <Note label="No obligation" body="Application + call are free. Walk away anytime, no pressure." />
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="relative mx-auto max-w-4xl px-4 py-12 lg:px-8 lg:py-20" data-testid="apply-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 420, height: 420, top: -160, right: -80 }} />
                </div>

                {/* Header */}
                <header>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1.5">
                        <Lock size={11} className="text-amber-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Application Required · No Direct Checkout</span>
                    </div>
                    <h1 className="font-heading mt-5 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                        Apply for <span className="text-cyan-400">{program.name}</span>.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                        {program.description} {" "}
                        Submit a short application — once reviewed, you'll be invited to a strategy call.
                        We close manually after the call (Stripe invoice or wire). No auto-charges, ever.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
                        <span className="rounded-sm border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">${program.amount.toLocaleString()} · upon close</span>
                        <span className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Stripe invoice or wire</span>
                        <span className="rounded-sm border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">No auto-charges</span>
                    </div>
                </header>

                {/* Form */}
                <form onSubmit={submit} className="mt-12 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-10 space-y-5" data-testid="apply-form">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Full name *" Icon={Users}>
                            <input data-testid="apply-name" required type="text" value={form.name} onChange={update("name")} className={inputClass} placeholder="Jane Cooper" />
                        </Field>
                        <Field label="Email *" Icon={Mail}>
                            <input data-testid="apply-email" required type="email" value={form.email} onChange={update("email")} className={inputClass} placeholder="jane@cooperteam.com" />
                        </Field>
                        <Field label="Phone *" Icon={Phone}>
                            <input data-testid="apply-phone" required type="tel" value={form.phone} onChange={update("phone")} className={inputClass} placeholder="+1 (555) 555-5555" />
                        </Field>
                        <Field label="Company / agency" Icon={Building2}>
                            <input data-testid="apply-company" type="text" value={form.company} onChange={update("company")} className={inputClass} placeholder="Cooper Realty Group" />
                        </Field>
                        <Field label="Current revenue range" Icon={DollarSign}>
                            <select data-testid="apply-revenue" value={form.revenue_range} onChange={update("revenue_range")} className={inputClass}>
                                <option value="">Select range</option>
                                {REVENUE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </Field>
                        <Field label="Team size" Icon={Users}>
                            <select data-testid="apply-team" value={form.team_size} onChange={update("team_size")} className={inputClass}>
                                <option value="">Select size</option>
                                {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="What systems do you currently use?" Icon={Layers} hint="CRM, AMS, MLS, marketing — be specific.">
                        <input data-testid="apply-systems" type="text" value={form.current_systems} onChange={update("current_systems")} className={inputClass} placeholder="Salesforce, kvCORE, Mailchimp, Yardi…" />
                    </Field>
                    <Field label="Biggest business challenge right now *" Icon={MessageSquare} hint="Be candid — this drives the strategy call.">
                        <textarea data-testid="apply-challenge" required rows={4} value={form.biggest_challenge} onChange={update("biggest_challenge")} className={inputClass} placeholder="Lead follow-up is fragmented across 4 systems and we lose 30%+ of inbound to slow response time…" />
                    </Field>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                            <ShieldCheck size={11} className="text-cyan-400" /> No payment is taken on this page. Application + strategy call only.
                        </p>
                        <button
                            type="submit"
                            disabled={submitting}
                            data-testid="apply-submit"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.55)] disabled:opacity-60"
                        >
                            {submitting ? "Submitting…" : "Submit application"} <ArrowRight size={15} />
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}

const inputClass = "input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none";

const Field = ({ label, Icon, hint, children }) => (
    <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 inline-flex items-center gap-1.5">
            {Icon && <Icon size={11} className="text-cyan-400" />} {label}
        </span>
        <div className="mt-2">{children}</div>
        {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
);

const Note = ({ label, body }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400">{label}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{body}</p>
    </div>
);
