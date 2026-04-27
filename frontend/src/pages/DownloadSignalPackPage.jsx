import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { getCheckoutStatus } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { Download, ArrowRight, Mail, Loader2, CheckCircle2, Lock } from "lucide-react";

/**
 * Post-purchase landing for the Signal Pack.
 *
 * Flow:
 *   Stripe → /thank-you?session_id=… (existing) confirms payment
 *   Most users will land here directly from the email link in the
 *   confirmation send. This page polls the same /checkout/status
 *   endpoint to verify and exposes the download.
 */
export default function DownloadSignalPackPage() {
    const [params] = useSearchParams();
    const sessionId = params.get("session_id");
    const [status, setStatus] = useState({ loading: !!sessionId, paid: false, txn: null });

    useEffect(() => {
        if (!sessionId) return;
        let cancelled = false;
        const poll = async () => {
            try {
                const r = await getCheckoutStatus(sessionId);
                if (cancelled) return;
                if (r?.payment_status === "paid") {
                    setStatus({ loading: false, paid: true, txn: r });
                } else {
                    setStatus({ loading: true, paid: false, txn: r });
                    setTimeout(poll, 3500);
                }
            } catch {
                if (!cancelled) setStatus({ loading: false, paid: false, txn: null });
            }
        };
        poll();
        return () => { cancelled = true; };
    }, [sessionId]);

    return (
        <Layout>
            <div className="relative" data-testid="download-signal-pack-page">
                {/* HERO */}
                <section className="relative isolate border-b border-white/5 py-20 lg:py-28">
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <img src={PAGE_HERO.thankyou} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/65 via-ink-900/85 to-ink-900" />
                        <div className="absolute inset-0 ambient-grid opacity-30" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -160, left: "50%", transform: "translateX(-50%)" }} />
                    </div>

                    <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
                        {status.loading ? (
                            <Loading />
                        ) : status.paid ? (
                            <Granted txn={status.txn} />
                        ) : (
                            <NotGranted />
                        )}
                    </div>
                </section>

                {/* AUDIT UPSELL — exact copy from spec */}
                <section className="border-b border-white/5 py-16" data-testid="download-audit-upsell">
                    <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
                        <h2 className="font-heading text-3xl font-semibold leading-tight text-white sm:text-4xl">
                            Want to see this <span className="text-cyan-400">inside your own meetings?</span>
                        </h2>
                        <p className="mt-4 text-base text-slate-300">
                            Send us recorded footage. Our analysts return a signal timeline, key clips, missed
                            opportunities, and execution recommendations.
                        </p>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link
                                to="/services/audit"
                                data-testid="download-cta-audit"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400"
                            >
                                Request Signal Intelligence Audit <ArrowRight size={14} />
                            </Link>
                            <Link
                                to="/services/report"
                                data-testid="download-cta-report"
                                className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                            >
                                Or scale to a Full Report
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}

const Loading = () => (
    <div className="flex flex-col items-center" data-testid="download-loading">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
        <h1 className="font-heading mt-6 text-3xl font-semibold text-white sm:text-4xl">Confirming your purchase…</h1>
        <p className="mt-3 text-base text-slate-300">This usually takes a few seconds. Don't refresh the page.</p>
    </div>
);

const Granted = ({ txn }) => {
    const downloadHref = "#"; // Wire to actual signed URL once Stripe Live Keys land + delivery store is configured
    return (
        <div className="flex flex-col items-center" data-testid="download-granted">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                <CheckCircle2 size={26} className="text-cyan-300" />
            </div>
            <h1 className="font-heading mt-6 text-3xl font-semibold text-white sm:text-5xl">
                You're in. <span className="text-cyan-400">Signal Pack Vol. 1.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300">
                Your access is being delivered to <span className="text-cyan-300">{txn?.email || "your email on file"}</span>.
                Click below to start the download — and watch your inbox for a backup link.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                <a
                    href={downloadHref}
                    data-testid="download-pack-btn"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:bg-cyan-400"
                >
                    <Download size={14} /> Download Signal Pack
                </a>
                <Link
                    to="/portal"
                    data-testid="download-portal-link"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                >
                    Open Customer Portal
                </Link>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2">
                <Mail size={13} className="text-cyan-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">Receipt + access sent via email</span>
            </div>
        </div>
    );
};

const NotGranted = () => (
    <div className="flex flex-col items-center" data-testid="download-not-granted">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
            <Lock size={24} className="text-amber-300" />
        </div>
        <h1 className="font-heading mt-6 text-3xl font-semibold text-white sm:text-4xl">No active purchase found.</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300">
            Looks like you arrived here without an active session. If you just bought, please check the email
            we sent — your access link is inside.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link to="/products/signal-pack" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400">
                Buy Signal Pack <ArrowRight size={14} />
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                Need Help?
            </Link>
        </div>
    </div>
);
