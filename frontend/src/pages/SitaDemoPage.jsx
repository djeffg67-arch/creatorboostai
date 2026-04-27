import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { captureLead } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { toast } from "sonner";
import {
    Plane, ArrowRight, Play, Loader2, CheckCircle2, ShieldCheck, Send,
} from "lucide-react";

/**
 * SITA / Airport Operations demo entry.
 * The full 12-scene cinematic walkthrough is being authored. In the meantime
 * this page delivers the same controlled, trackable, conversion-grade
 * landing layer that the other demos use:
 *
 * - Dynamic personalization via ?name=&company=
 * - Tracked open / heartbeat / completion via useDemoTracking
 * - "Request the SITA Brief" lead capture for booking the live walkthrough
 *
 * As soon as the SITA scenes are authored, swap the `<BriefCTA/>` for the
 * shared cinematic engine and ship — the tracking pipeline already works.
 */
export default function SitaDemoPage() {
    const [params] = useSearchParams();
    const [started, setStarted] = useState(false);
    const [done, setDone] = useState(false);

    // Open a tracked session as soon as the user clicks Start (placeholder demo)
    const { sessionId, personalization, trackEvent } = useDemoTracking({
        demoType: "sita",
        started,
        scene: 0,
        totalScenes: 1,
        watchSeconds: 0,
        overallProgress: started ? (done ? 100 : 50) : 0,
        done,
    });

    return (
        <Layout>
            <div className="relative" data-testid="sita-demo-page">
                <section className="relative isolate border-b border-white/5 py-20 lg:py-28">
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <img src={PAGE_HERO.verticalPicker} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="eager" />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/65 via-ink-900/85 to-ink-900" />
                        <div className="absolute inset-0 ambient-grid opacity-30" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, right: -120 }} />
                    </div>

                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Plane size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Live Demo · SITA / Airport Operations</span>
                        </div>

                        {personalization?.greeting && (
                            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="sita-personalized-greeting">
                                {personalization.greeting}
                            </p>
                        )}

                        <h1 className="font-heading mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                            How Your Operations <span className="text-cyan-400">Run on AI Execution.</span>
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                            CreatorBoostAI™ overlays SITA, Sabre, Amadeus, concession POS, ground-handling
                            scheduling, and your operations command center — and BodyIQ-AI™ adds behavioral
                            intelligence to every passenger touchpoint that drives revenue. This demo is the
                            live operational view of how that runs.
                        </p>

                        {!started && (
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => { setStarted(true); trackEvent("cta_start", { from: "sita-hero" }); }}
                                    data-testid="start-sita-demo-btn"
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-7 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-400"
                                >
                                    <Play size={14} fill="currentColor" /> Open Demo Briefing
                                </button>
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                    Cinematic walkthrough · Q3 release · Booking now
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {started && (
                    <section className="border-b border-white/5 py-16" data-testid="sita-brief-section">
                        <div className="mx-auto max-w-5xl px-5 lg:px-8">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Briefing</p>
                            <h2 className="font-heading mt-3 text-3xl font-semibold text-white sm:text-4xl">What the SITA cut covers.</h2>
                            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                                The full SITA / airport operations walkthrough runs ~7 minutes and shows: live
                                throughput overlays, gate-utilization optimization, dwell-time & concession
                                revenue per square foot, ground-handling crew dispatch, and BodyIQ-AI behavioral
                                signal scoring on the passenger journey from check-in to gate.
                            </p>

                            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {[
                                    "Live SITA / Sabre / Amadeus overlay — read-only by default",
                                    "Throughput, dwell time, and revenue per sq ft per terminal",
                                    "Concession + ground-handling decision engine",
                                    "Passenger BodyIQ-AI signal layer · airport-grade",
                                    "Autonomous-mode toggle · audit-logged execution",
                                    "Per-station and per-shift KPI rollups",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-3 rounded-md border border-white/10 bg-ink-700/40 p-4 text-sm text-slate-200">
                                        <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>

                            <BriefForm
                                personalization={personalization}
                                onSubmitted={() => { setDone(true); trackEvent("cta_brief_submitted", {}); }}
                                trackEvent={trackEvent}
                                sessionId={sessionId}
                            />

                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    to="/demo/noldus"
                                    onClick={() => trackEvent("cta_xsell", { to: "noldus" })}
                                    data-testid="sita-cta-noldus"
                                    className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                                >
                                    Watch the Noldus / Investor cut <ArrowRight size={12} />
                                </Link>
                                <Link
                                    to="/preview"
                                    onClick={() => trackEvent("cta_xsell", { to: "preview" })}
                                    data-testid="sita-cta-preview"
                                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-transparent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                                >
                                    Open Command Center
                                </Link>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    );
}

const BriefForm = ({ personalization, onSubmitted, trackEvent, sessionId }) => {
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({
        name: personalization?.name || "",
        company: personalization?.company || "",
        email: personalization?.recipient_email || "",
        role: "",
    });
    const submit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.name) { toast.error("Name and email required"); return; }
        setBusy(true);
        try {
            await captureLead({
                email: form.email,
                name: form.name,
                source: "demo",
                message: `SITA demo brief request from ${form.role || "—"} at ${form.company || "—"}.`,
                metadata: { service: "sita_demo_brief", session_id: sessionId, ...form },
            });
            toast.success("Brief request received. Our airport-vertical lead replies within 1 business day.");
            trackEvent?.("brief_request_submitted", form);
            onSubmitted?.();
        } catch {
            toast.error("Could not submit. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <form onSubmit={submit} className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-7" data-testid="sita-brief-form">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <ShieldCheck size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Request the live walkthrough</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="sita-name" />
                <Field label="Work Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} testid="sita-email" />
                <Field label="Company / Authority" value={form.company} onChange={(v) => setForm({ ...form, company: v })} testid="sita-company" />
                <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} testid="sita-role" />
            </div>
            <button
                type="submit"
                disabled={busy}
                data-testid="sita-brief-submit"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
            >
                {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Request the SITA Brief</>}
            </button>
        </form>
    );
};

const Field = ({ label, value, onChange, type = "text", testid }) => (
    <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid={testid}
            className="mt-1.5 w-full rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
        />
    </div>
);
