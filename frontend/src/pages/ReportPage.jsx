import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { captureLead } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { toast } from "sonner";
import { Send, Loader2, FileText, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

const DELIVERABLES = [
    "Full video breakdown — frame-accurate, timestamped",
    "Decision mapping — every shift, every signal",
    "Resistance and alignment identification",
    "Insight + execution strategy",
    "High-stakes analysis — sales or legal",
    "Executive summary delivered for stakeholders",
];

const USE_CASES = [
    { title: "High-stakes sales", body: "Pre-board, pre-close, and pre-renewal video — find the moment a deal flipped before it closed." },
    { title: "Trial strategy", body: "Pre-trial video review or recorded depositions — bias detection, juror reaction patterns, witness signal analysis." },
    { title: "Investor or partner negotiation", body: "Term sheet meetings, board pitches, partner negotiations — surface alignment gaps before they cost capital." },
    { title: "Hiring & exec interviews", body: "Senior hires worth $250K+. Decision intelligence on conviction, hesitation, and risk signals." },
];

export default function ReportPage() {
    const [form, setForm] = useState({ name: "", email: "", company: "", role: "", category: "High-stakes sales", description: "" });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.name || !form.description) { toast.error("Name, email, and a brief description required"); return; }
        setBusy(true);
        try {
            await captureLead({
                email: form.email,
                name: form.name,
                source: "report_request",
                message: `Full Signal Intelligence Report — ${form.category}\n${form.description}`,
                metadata: { company: form.company, role: form.role, category: form.category, service: "full_signal_intelligence_report" },
            });
            toast.success("Request received. Our analyst team will reach out within 1 business day.");
            setForm({ name: "", email: "", company: "", role: "", category: "High-stakes sales", description: "" });
        } catch {
            toast.error("Could not submit. Please try again or email hello@bodyiq-ai.com.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Layout>
            <div className="relative" data-testid="report-page">
                {/* HERO */}
                <section className="relative isolate border-b border-white/5 py-20 lg:py-28">
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <img src={PAGE_HERO.preview} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/65 via-ink-900/85 to-ink-900" />
                        <div className="absolute inset-0 ambient-grid opacity-30" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, left: -120 }} />
                    </div>
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <FileText size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Engagement · Full Signal Intelligence Report</span>
                        </div>
                        <h1 className="font-heading mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                            High-stakes engagements. <span className="text-cyan-400">Decision-grade analysis.</span>
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                            For decisions where being right matters more than being fast. End-to-end video breakdown,
                            decision mapping, resistance and alignment identification, and an execution strategy
                            built for the engagement.
                        </p>
                        <p className="mt-5 font-heading text-2xl font-semibold text-cyan-300 sm:text-3xl">$10,000 – $35,000+</p>
                    </div>
                </section>

                {/* DELIVERABLES + USE CASES */}
                <section className="border-b border-white/5 py-20">
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">What you receive</p>
                                <h2 className="font-heading mt-3 text-3xl font-semibold text-white">Deliverables</h2>
                                <ul className="mt-6 space-y-3">
                                    {DELIVERABLES.map((d) => (
                                        <li key={d} className="flex items-start gap-3 text-sm text-slate-200">
                                            <CheckCircle2 size={14} className="mt-1 flex-shrink-0 text-cyan-400" />
                                            <span>{d}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-8 inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2">
                                    <ShieldCheck size={13} className="text-cyan-300" />
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">NDA on every engagement</span>
                                </div>
                            </div>
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">When this is the right call</p>
                                <h2 className="font-heading mt-3 text-3xl font-semibold text-white">Use cases</h2>
                                <div className="mt-6 space-y-3">
                                    {USE_CASES.map((u) => (
                                        <div key={u.title} className="rounded-md border border-white/10 bg-ink-700/40 p-5">
                                            <p className="font-heading text-base font-semibold text-white">{u.title}</p>
                                            <p className="mt-1.5 text-sm text-slate-300">{u.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* REQUEST FORM */}
                <section className="py-20">
                    <div className="mx-auto max-w-3xl px-5 lg:px-8">
                        <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">Request a Full Report</h2>
                        <p className="mt-3 text-sm text-slate-300">All engagements begin with a confidential intake call. We reply within 1 business day.</p>
                        <form onSubmit={submit} className="mt-8 space-y-4 rounded-md border border-white/10 bg-ink-700/40 p-7" data-testid="report-form">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="report-name" />
                                <Field label="Work Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required testid="report-email" />
                                <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} testid="report-company" />
                                <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} testid="report-role" />
                            </div>
                            <div>
                                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Engagement Type</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    data-testid="report-category"
                                    className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                                >
                                    {["High-stakes sales", "Trial strategy", "Investor / partner negotiation", "Hiring / exec interview", "Other"].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Describe the engagement *</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={5}
                                    required
                                    data-testid="report-description"
                                    className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                                    placeholder="The decision at stake, the footage available, the timeline, and the outcome you need."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={busy}
                                data-testid="report-submit"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                            >
                                {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Request Engagement</>}
                            </button>
                        </form>
                        <p className="mt-6 text-sm text-slate-400">
                            Smaller scope?{" "}
                            <Link to="/services/audit" className="text-cyan-300 hover:text-cyan-200">Video Signal Intelligence Audit</Link>{" "}
                            starts at $1,500. Or{" "}
                            <Link to="/products/signal-pack" className="text-cyan-300 hover:text-cyan-200">buy the Signal Pack</Link>{" "}
                            for instant access.
                        </p>
                    </div>
                </section>
            </div>
        </Layout>
    );
}

const Field = ({ label, value, onChange, type = "text", required, testid }) => (
    <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}{required && " *"}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            data-testid={testid}
            className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
        />
    </div>
);
