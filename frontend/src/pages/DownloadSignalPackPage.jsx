import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { getCheckoutStatus, portalSignalPackDownload } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { Download, ArrowRight, Mail, Loader2, CheckCircle2, Lock, Clock } from "lucide-react";

const PORTAL_KEY = "bodyiq_portal_user";

/**
 * Post-purchase landing for the Signal Pack.
 *
 * Two entry paths supported:
 *  1. From Stripe success redirect: `?session_id=...` — poll /checkout/status until paid.
 *  2. From a logged-in portal session (localStorage `bodyiq_portal_user`) — call the
 *     entitlement-gated /portal/signal-pack-download endpoint to get the actual download URL.
 *
 * If neither path grants access, show the audit upsell.
 */
export default function DownloadSignalPackPage() {
    const [params] = useSearchParams();
    const sessionId = params.get("session_id");

    const [state, setState] = useState({
        loading: true,
        paid: false,
        txn: null,
        delivery: null,
        tier: null,
    });

    useEffect(() => {
        let cancelled = false;

        const tryDownloadFromSession = async () => {
            try {
                const stored = JSON.parse(localStorage.getItem(PORTAL_KEY) || "null");
                if (!stored?.email || !stored?.token) return null;
                const r = await portalSignalPackDownload({ email: stored.email, token: stored.token });
                return r;
            } catch {
                return null;
            }
        };

        const run = async () => {
            // Try the logged-in portal session first — it works without a session_id.
            const delivery = await tryDownloadFromSession();
            if (cancelled) return;
            if (delivery?.entitled) {
                setState({ loading: false, paid: true, txn: null, delivery, tier: delivery.tier });
                return;
            }
            if (!sessionId) {
                setState({ loading: false, paid: false, txn: null, delivery: null, tier: null });
                return;
            }
            // Fall back to polling Stripe checkout status.
            const poll = async () => {
                try {
                    const r = await getCheckoutStatus(sessionId);
                    if (cancelled) return;
                    if (r?.payment_status === "paid") {
                        // After payment lands, try the entitlement endpoint once more
                        // (the webhook may have created the user).
                        const afterPaid = await tryDownloadFromSession();
                        setState({
                            loading: false,
                            paid: true,
                            txn: r,
                            delivery: afterPaid?.entitled ? afterPaid : null,
                            tier: afterPaid?.tier || null,
                        });
                    } else {
                        setState({ loading: true, paid: false, txn: r, delivery: null, tier: null });
                        setTimeout(poll, 3500);
                    }
                } catch {
                    if (!cancelled) setState({ loading: false, paid: false, txn: null, delivery: null, tier: null });
                }
            };
            poll();
        };
        run();
        return () => { cancelled = true; };
    }, [sessionId]);

    return (
        <Layout>
            <div className="relative" data-testid="download-signal-pack-page">
                <section className="relative isolate border-b border-white/5 py-20 lg:py-28">
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <img src={PAGE_HERO.thankyou} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/65 via-ink-900/85 to-ink-900" />
                        <div className="absolute inset-0 ambient-grid opacity-30" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -160, left: "50%", transform: "translateX(-50%)" }} />
                    </div>

                    <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
                        {state.loading ? (
                            <Loading />
                        ) : state.paid ? (
                            <Granted txn={state.txn} delivery={state.delivery} tier={state.tier} />
                        ) : (
                            <NotGranted />
                        )}
                    </div>
                </section>

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
        <h1 className="font-heading mt-6 text-3xl font-semibold text-white sm:text-4xl">Confirming your access…</h1>
        <p className="mt-3 text-base text-slate-300">This usually takes a few seconds. Don't refresh the page.</p>
    </div>
);

const Granted = ({ txn, delivery, tier }) => {
    const hasDirectUrl = !!delivery?.download_url;
    const pending = !!delivery?.pending;
    const label = delivery?.label || "Signal Pack Vol. 1";
    const tierBadge = tier ? tier.replace("signal_pack_", "").toUpperCase() : null;
    return (
        <div className="flex flex-col items-center" data-testid="download-granted">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                <CheckCircle2 size={26} className="text-cyan-300" />
            </div>
            <h1 className="font-heading mt-6 text-3xl font-semibold text-white sm:text-5xl">
                You're in. <span className="text-cyan-400">{label}.</span>
            </h1>
            {tierBadge && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400" data-testid="download-tier">
                    License · {tierBadge}
                </p>
            )}
            <p className="mt-4 max-w-2xl text-base text-slate-300">
                Your access is attached to{" "}
                <span className="text-cyan-300">{txn?.email || delivery?.email || "your account on file"}</span>.
                {hasDirectUrl
                    ? " Click below to download now — we've also emailed you a backup link."
                    : " We've emailed a confirmation and will deliver the download link within 24 hours."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                {hasDirectUrl ? (
                    <a
                        href={delivery.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="download-pack-btn"
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:bg-cyan-400"
                    >
                        <Download size={14} /> Download Signal Pack
                    </a>
                ) : (
                    <div
                        data-testid="download-pack-pending"
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-6 py-3.5 text-sm font-semibold text-amber-200"
                    >
                        <Clock size={14} /> {pending ? "Download prep in progress" : "Link coming via email"}
                    </div>
                )}
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
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                    Receipt + access sent via email
                </span>
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
            <Link to="/portal" data-testid="download-portal-manual-login" className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                Log in to portal
            </Link>
        </div>
    </div>
);
