import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { captureLead } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { toast } from "sonner";
import { Send, Loader2, Scale, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

const PILLARS = [
    "Juror reaction breakdown",
    "Bias detection patterns",
    "Resistance signals",
    "Decision-shift identification",
    "Section analysis (opening, testimony, cross, closing)",
];

const SECTIONS = [
    { phase: "Opening", body: "Foundational alignment vs early resistance — frame-by-frame juror response to your case theory." },
    { phase: "Testimony", body: "Witness conviction scoring, juror engagement decay points, and credibility signal mapping." },
    { phase: "Cross-examination", body: "Pressure points, defensive vs collaborative juror posture, decision shifts during impeachment." },
    { phase: "Closing", body: "Conviction lift vs hesitation, final-decision signal mapping, and post-deliberation prediction." },
];

export default function JuryPage() {
    const [form, setForm] = useState({ name: "", firm: "", email: "", role: "", case_type: "Civil", description: "" });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.name) { toast.error("Name and email required"); return; }
        setBusy(true);
        try {
            await captureLead({
                email: form.email,
                name: form.name,
                source: "jury_request",
                message: `Jury Signal Intelligence — ${form.case_type}\n${form.description}`,
                metadata: { firm: form.firm, role: form.role, case_type: form.case_type, service: "jury_signal_intelligence" },
            });
            toast.success("Confidential request received. Our trial-strategy lead reaches out within 1 business day.");
            setForm({ name: "", firm: "", email: "", role: "", case_type: "Civil", description: "" });
        } catch {
            toast.error("Could not submit. Please try again or email hello@bodyiq-ai.com.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Layout>
            <div className="relative" data-testid="jury-page">
                {/* HERO */}
                <section className="relative isolate border-b border-white/5 py-20 lg:py-28">
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <img src={PAGE_HERO.press} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/85 to-ink-900" />
                        <div className="absolute inset-0 ambient-grid opacity-30" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, right: -120 }} />
                    </div>
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Scale size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Legal · Trial Strategy</span>
                        </div>
                        <h1 className="font-heading mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                            Jury Signal Intelligence.
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                            Structured signal analysis of juror behavior using observable patterns and measurable
                            indicators — across opening, testimony, cross-examination, and closing.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                            <AlertCircle size={13} className="text-amber-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Confidential · NDA-first · privileged engagement</span>
                        </div>
                    </div>
                </section>

                {/* PILLARS + SECTIONS */}
                <section className="border-b border-white/5 py-20">
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">What we measure</p>
                                <h2 className="font-heading mt-3 text-3xl font-semibold text-white">Signal pillars</h2>
                                <ul className="mt-6 space-y-3">
                                    {PILLARS.map((p) => (
                                        <li key={p} className="flex items-start gap-3 text-sm text-slate-200">
                                            <CheckCircle2 size={14} className="mt-1 flex-shrink-0 text-cyan-400" />
                                            <span>{p}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Section analysis</p>
                                <h2 className="font-heading mt-3 text-3xl font-semibold text-white">Phase by phase</h2>
                                <div className="mt-6 space-y-3">
                                    {SECTIONS.map((s) => (
                                        <div key={s.phase} className="rounded-md border border-white/10 bg-ink-700/40 p-5">
                                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{s.phase}</p>
                                            <p className="mt-2 text-sm text-slate-300">{s.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* REQUEST */}
                <section className="py-20">
                    <div className="mx-auto max-w-3xl px-5 lg:px-8">
                        <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">Confidential intake</h2>
                        <p className="mt-3 text-sm text-slate-300">All jury engagements are NDA-first. We reply within 1 business day to a privileged contact only.</p>
                        <form onSubmit={submit} className="mt-8 space-y-4 rounded-md border border-white/10 bg-ink-700/40 p-7" data-testid="jury-form">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="jury-name" />
                                <Field label="Firm" value={form.firm} onChange={(v) => setForm({ ...form, firm: v })} testid="jury-firm" />
                                <Field label="Privileged Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required testid="jury-email" />
                                <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} testid="jury-role" />
                            </div>
                            <div>
                                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Case Type</label>
                                <select
                                    value={form.case_type}
                                    onChange={(e) => setForm({ ...form, case_type: e.target.value })}
                                    data-testid="jury-case-type"
                                    className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                                >
                                    {["Civil", "Criminal", "Class action", "Patent / IP", "Other"].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Engagement summary</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={5}
                                    data-testid="jury-description"
                                    className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                                    placeholder="Trial timeline, footage available, sections needing analysis, and decision points where signal intelligence would matter most."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={busy}
                                data-testid="jury-submit"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                            >
                                {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Request Privileged Engagement</>}
                            </button>
                        </form>
                        <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2">
                            <ShieldCheck size={13} className="text-cyan-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Privileged · NDA-protected</span>
                        </div>
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
