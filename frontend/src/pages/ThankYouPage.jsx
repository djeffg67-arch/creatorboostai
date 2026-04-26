import React, { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Mail, Calendar, ArrowRight, Loader2, XCircle } from "lucide-react";
import { getCheckoutStatus } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 10;

export default function ThankYouPage() {
    const [params] = useSearchParams();
    const sessionId = params.get("session_id");
    const [state, setState] = useState(sessionId ? "polling" : "no_session");
    const [info, setInfo] = useState(null);

    const poll = useCallback(async (attempt = 0) => {
        if (!sessionId) return;
        try {
            const data = await getCheckoutStatus(sessionId);
            setInfo(data);
            if (data.payment_status === "paid") {
                setState("paid");
                return;
            }
            if (data.status === "expired") {
                setState("expired");
                return;
            }
            if (attempt >= MAX_ATTEMPTS) {
                setState("timeout");
                return;
            }
            setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
        } catch {
            if (attempt >= MAX_ATTEMPTS) {
                setState("error");
                return;
            }
            setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
        }
    }, [sessionId]);

    useEffect(() => {
        if (sessionId) poll(0);
    }, [sessionId, poll]);

    return (
        <Layout>
            <section className="relative overflow-hidden py-24 lg:py-36" data-testid="thankyou-page">
                <img src={PAGE_HERO.thankyou} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-b from-ink-900/85 via-ink-900/90 to-ink-900" />
                <div className="absolute inset-0 ambient-grid" />
                <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 500, height: 500, top: -160, left: "50%", transform: "translateX(-50%)" }} />
                <div className="glow-orb glow-orb--blue" style={{ width: 340, height: 340, bottom: -140, right: -60 }} />

                <div className="relative mx-auto max-w-2xl px-5 text-center lg:px-8">
                    {state === "polling" && (
                        <div data-testid="thankyou-polling" className="fade-in-up">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                                <Loader2 size={26} className="text-cyan-400 animate-spin" />
                            </div>
                            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Verifying Payment</p>
                            <h1 className="font-heading mt-4 text-4xl font-semibold text-white sm:text-5xl">Finalizing your reservation…</h1>
                            <p className="mt-5 text-base text-slate-400">Please wait while we confirm your payment with Stripe.</p>
                        </div>
                    )}

                    {state === "paid" && (
                        <div data-testid="thankyou-paid" className="fade-in-up">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                                <CheckCircle2 size={28} className="text-cyan-400" />
                            </div>
                            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Reservation Confirmed</p>
                            <h1 className="font-heading mt-4 text-balance text-4xl font-semibold text-white sm:text-5xl">
                                Your seat is locked in.
                            </h1>
                            {info?.product_name && (
                                <p className="mt-4 inline-block rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                                    {info.product_name} · ${(info.amount_total / 100).toFixed(2)} {info.currency?.toUpperCase()}
                                </p>
                            )}
                            <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg">
                                You are now enrolled. Session details, access instructions, and your calendar
                                invite will arrive{info?.email ? <> at <span className="text-cyan-300">{info.email}</span></> : null} within 24 hours.
                            </p>
                            <p className="mt-3 text-sm text-slate-400">
                                You will work through real-world signal interpretation, pattern recognition,
                                and strategic execution frameworks in live environments.
                            </p>

                            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 text-left">
                                    <Mail size={16} className="text-cyan-400" />
                                    <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 01</p>
                                    <p className="mt-1 text-sm text-slate-200">Check your inbox for the welcome packet and calendar invite.</p>
                                </div>
                                <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 text-left">
                                    <Calendar size={16} className="text-cyan-400" />
                                    <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 02</p>
                                    <p className="mt-1 text-sm text-slate-200">Add the session to your calendar and complete 15-minute pre-work.</p>
                                </div>
                            </div>
                            <p className="mt-10 text-xs text-slate-500">
                                Immediate questions? Reply to the confirmation email — we read every message.
                            </p>
                        </div>
                    )}

                    {(state === "expired" || state === "error" || state === "timeout" || state === "no_session") && (
                        <div data-testid="thankyou-failed" className="fade-in-up">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
                                <XCircle size={26} className="text-slate-400" />
                            </div>
                            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                {state === "expired" ? "Session Expired" : state === "no_session" ? "No Session" : "Verification Delayed"}
                            </p>
                            <h1 className="font-heading mt-4 text-4xl font-semibold text-white sm:text-5xl">
                                {state === "no_session" ? "Nothing to confirm." : "We couldn't verify your payment just yet."}
                            </h1>
                            <p className="mt-5 text-base text-slate-400">
                                {state === "no_session"
                                    ? "Visit the Training page to reserve a seat or explore the demo."
                                    : "If your payment went through, you'll still receive a confirmation email. Otherwise please try again."}
                            </p>
                        </div>
                    )}

                    <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            to="/demo"
                            data-testid="thankyou-cta-demo"
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                        >
                            Explore the Demo <ArrowRight size={15} />
                        </Link>
                        <Link
                            to="/"
                            data-testid="thankyou-cta-home"
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-6 py-3 text-sm font-medium text-slate-200 transition-all hover:border-white/20 hover:text-white"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
