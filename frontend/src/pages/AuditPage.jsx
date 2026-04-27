import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { captureLead } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { toast } from "sonner";
import { Send, Loader2, Video, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";

const TIERS = [
    {
        name: "Entry Audit",
        price: "$1,500",
        body: "Single recorded video up to 30 minutes. Signal timeline + 5 clipped key decision moments + execution recommendations.",
    },
    {
        name: "Professional Audit",
        price: "$3,500",
        body: "Up to 90 minutes of footage. Full signal timeline, missed opportunities, structured insight report, and a 30-minute review call.",
        highlight: true,
    },
    {
        name: "Enterprise Audit",
        price: "$7,500+",
        body: "Multi-meeting program. Custom-scoped engagement with team-specific execution playbook and onboarding for your sales / legal team.",
    },
];

const DELIVERABLES = [
    "Signal timeline (frame-accurate)",
    "Clipped key decision moments",
    "Missed opportunities",
    "Structured insight report",
    "Execution recommendations",
];

export default function AuditPage() {
    const [form, setForm] = useState({ name: "", email: "", company: "", role: "", footage_type: "Sales meeting", description: "" });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.name) { toast.error("Name and email required"); return; }
        setBusy(true);
        try {
            await captureLead({
                email: form.email,
                name: form.name,
                source: "audit_request",
                message: `Audit request — ${form.footage_type}\n${form.description}`,
                metadata: { company: form.company, role: form.role, footage_type: form.footage_type, service: "video_signal_audit" },
            });
            toast.success("Request received. Our team replies within 1 business day.");
            setForm({ name: "", email: "", company: "", role: "", footage_type: "Sales meeting", description: "" });
        } catch {
            toast.error("Could not submit. Please try again or email us at hello@bodyiq-ai.com.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Layout>
            <div className="relative" data-testid="audit-page">
                {/* HERO */}
                <section className="relative isolate border-b border-white/5 py-20 lg:py-28">
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <img src={PAGE_HERO.contact} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/85 to-ink-900" />
                        <div className="absolute inset-0 ambient-grid opacity-30" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, right: -120 }} />
                    </div>
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Video size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Service · Video Signal Intelligence Audit</span>
                        </div>
                        <h1 className="font-heading mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                            Send us a recording. <span className="text-cyan-400">We return the decision.</span>
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                            We analyze recorded video — sales meetings, negotiations, presentations, interviews, jury
                            footage. We return a signal timeline, clipped key decision moments, missed opportunities,
                            and an execution playbook.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                            <AlertCircle size={13} className="text-amber-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Video only · we do not analyze phone calls</span>
                        </div>
                    </div>
                </section>

                {/* TIERS */}
                <section className="border-b border-white/5 py-20" data-testid="audit-tiers">
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Engagement tiers</p>
                        <h2 className="font-heading mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                            Scope your audit.
                        </h2>
                        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            {TIERS.map((t) => (
                                <div key={t.name} data-testid={`audit-tier-${t.name.toLowerCase().split(" ")[0]}`} className={`rounded-md border p-7 ${t.highlight ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent" : "border-white/10 bg-ink-700/40"}`}>
                                    <h3 className="font-heading text-xl font-semibold text-white">{t.name}</h3>
                                    <p className="font-heading mt-3 text-3xl font-semibold text-cyan-300">{t.price}</p>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{t.body}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 rounded-md border border-white/10 bg-ink-700/40 p-7">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Every audit includes</p>
                            <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                {DELIVERABLES.map((d) => (
                                    <li key={d} className="flex items-start gap-2 text-sm text-slate-200">
                                        <CheckCircle2 size={13} className="mt-1 flex-shrink-0 text-cyan-400" />
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* REQUEST FORM */}
                <section className="py-20" data-testid="audit-form-section">
                    <div className="mx-auto max-w-3xl px-5 lg:px-8">
                        <h2 className="font-heading text-3xl font-semibold leading-tight text-white sm:text-4xl">Request an audit</h2>
                        <p className="mt-3 text-sm text-slate-300">We reply within 1 business day with a scoping link to securely upload footage.</p>
                        <form onSubmit={submit} className="mt-8 space-y-4 rounded-md border border-white/10 bg-ink-700/40 p-7" data-testid="audit-form">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="audit-name" />
                                <Field label="Work Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required testid="audit-email" />
                                <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} testid="audit-company" />
                                <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} testid="audit-role" />
                            </div>
                            <div>
                                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Footage Type</label>
                                <select
                                    value={form.footage_type}
                                    onChange={(e) => setForm({ ...form, footage_type: e.target.value })}
                                    data-testid="audit-footage-type"
                                    className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                                >
                                    {["Sales meeting", "Negotiation", "Presentation", "Interview", "Jury / trial footage", "Other"].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Brief description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={4}
                                    data-testid="audit-description"
                                    className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                                    placeholder="What's the engagement, what's the outcome you need, and what does the footage cover?"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={busy}
                                data-testid="audit-submit"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                            >
                                {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Request Audit</>}
                            </button>
                        </form>
                        <p className="mt-6 text-sm text-slate-400">
                            Looking for a deeper engagement? See the{" "}
                            <Link to="/services/report" className="text-cyan-300 hover:text-cyan-200">Full Signal Intelligence Report</Link>{" "}
                            ($10K – $35K+) for high-stakes sales or legal cases.
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
