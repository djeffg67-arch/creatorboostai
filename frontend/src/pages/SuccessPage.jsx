import React, { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { Link, useSearchParams } from "react-router-dom";
import {
    CheckCircle2, Mail, Calendar, ArrowRight, Loader2, XCircle,
    Sparkles, BookOpen, Crown, Rocket,
} from "lucide-react";
import { getCheckoutStatus } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 12;

const TRAINING_KEYS = new Set([
    "foundations", "applied", "strategy", "full_training",
]);
const SUBSCRIPTION_PREFIX = "cb_";

const productCopy = (product, info) => {
    if (product?.startsWith(SUBSCRIPTION_PREFIX) || info?.product_key?.startsWith(SUBSCRIPTION_PREFIX)) {
        return {
            kind: "subscription",
            icon: Sparkles,
            title: "Welcome to CreatorBoostAI.",
            tagline: "Your subscription is active.",
            blurb:
                "Your operating layer is live. Set up your stack now and start unifying " +
                "your tools into a single command center.",
            steps: [
                { icon: Mail, label: "Step 01", text: "Check your inbox for the welcome packet and access link." },
                { icon: Rocket, label: "Step 02", text: "Open the portal and complete your 5-minute system map." },
            ],
            cta: { to: "/portal", label: "Open the Portal" },
        };
    }
    if (product === "forensic_library") {
        return {
            kind: "library",
            icon: BookOpen,
            title: "Library access confirmed.",
            tagline: "Forensic Visual Library — lifetime access",
            blurb:
                "Access instructions arrive within 24 hours. As the library expands, " +
                "you'll get every new annotated frame drop included in your lifetime access.",
            steps: [
                { icon: Mail, label: "Step 01", text: "Watch your inbox for credentials." },
                { icon: BookOpen, label: "Step 02", text: "Bookmark the library — you'll keep coming back." },
            ],
            cta: { to: "/forensic-library", label: "Back to the Library" },
        };
    }
    // Training (foundations / applied / strategy / full_training)
    return {
        kind: "training",
        icon: Crown,
        title: "Your seat is locked in.",
        tagline: "Training enrollment confirmed",
        blurb:
            "You are now enrolled. Session details, access instructions, and your " +
            "calendar invite arrive within 24 hours. You'll work through real-world " +
            "signal interpretation, pattern recognition, and strategic execution " +
            "frameworks in live environments.",
        steps: [
            { icon: Mail, label: "Step 01", text: "Check your inbox for the welcome packet and calendar invite." },
            { icon: Calendar, label: "Step 02", text: "Add the session to your calendar and complete 15-minute pre-work." },
        ],
        cta: { to: "/training", label: "View Training Programs" },
    };
};

export default function SuccessPage() {
    const [params] = useSearchParams();
    const sessionId = params.get("session_id");
    const productParam = params.get("product");
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
            if (data.status === "expired") { setState("expired"); return; }
            if (attempt >= MAX_ATTEMPTS) { setState("timeout"); return; }
            setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
        } catch {
            if (attempt >= MAX_ATTEMPTS) { setState("error"); return; }
            setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
        }
    }, [sessionId]);

    useEffect(() => { if (sessionId) poll(0); }, [sessionId, poll]);

    const copy = productCopy(productParam, info);
    const Icon = copy.icon;

    return (
        <Layout>
            <section className="relative overflow-hidden py-24 lg:py-36" data-testid="success-page">
                <img src={PAGE_HERO.thankyou} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-b from-ink-900/85 via-ink-900/90 to-ink-900" />
                <div className="absolute inset-0 ambient-grid" />
                <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 500, height: 500, top: -160, left: "50%", transform: "translateX(-50%)" }} />
                <div className="glow-orb glow-orb--blue" style={{ width: 340, height: 340, bottom: -140, right: -60 }} />

                <div className="relative mx-auto max-w-2xl px-5 text-center lg:px-8">
                    {state === "polling" && (
                        <div data-testid="success-polling" className="fade-in-up">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                                <Loader2 size={26} className="text-cyan-400 animate-spin" />
                            </div>
                            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Verifying Payment</p>
                            <h1 className="font-heading mt-4 text-4xl font-semibold text-white sm:text-5xl">Finalizing your purchase…</h1>
                            <p className="mt-5 text-base text-slate-400">Please wait while we confirm your payment with Stripe.</p>
                        </div>
                    )}

                    {state === "paid" && (
                        <div data-testid="success-paid" className="fade-in-up">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                                <CheckCircle2 size={28} className="text-cyan-400" />
                            </div>
                            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400" data-testid="success-tagline">
                                {copy.tagline}
                            </p>
                            <h1 className="font-heading mt-4 text-balance text-4xl font-semibold text-white sm:text-5xl" data-testid="success-title">
                                {copy.title}
                            </h1>
                            {(info?.product_name || productParam) && (
                                <p className="mt-4 inline-flex items-center gap-2 rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300" data-testid="success-product-line">
                                    <Icon size={12} className="text-cyan-400" />
                                    {info?.product_name || productParam}
                                    {info?.amount_total ? ` · $${(info.amount_total / 100).toFixed(2)} ${info.currency?.toUpperCase()}` : null}
                                </p>
                            )}
                            <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg" data-testid="success-blurb">
                                {copy.blurb}
                                {info?.email ? <> Confirmation sent to <span className="text-cyan-300">{info.email}</span>.</> : null}
                            </p>

                            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="success-onboarding-steps">
                                {copy.steps.map((s, i) => {
                                    const StepIcon = s.icon;
                                    return (
                                        <div key={i} className="rounded-md border border-white/10 bg-ink-700/40 p-5 text-left">
                                            <StepIcon size={16} className="text-cyan-400" />
                                            <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">{s.label}</p>
                                            <p className="mt-1 text-sm text-slate-200">{s.text}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Link
                                    to={copy.cta.to}
                                    data-testid="success-primary-cta"
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400"
                                >
                                    {copy.cta.label} <ArrowRight size={15} />
                                </Link>
                                <Link
                                    to="/"
                                    data-testid="success-home-cta"
                                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-6 py-3.5 text-sm font-medium text-slate-200 transition-all hover:border-white/20 hover:text-white"
                                >
                                    Back to Home
                                </Link>
                            </div>

                            <p className="mt-10 text-xs text-slate-500">
                                Immediate questions? Reply to the confirmation email — we read every message.
                            </p>
                        </div>
                    )}

                    {(state === "expired" || state === "error" || state === "timeout" || state === "no_session") && (
                        <div data-testid="success-failed" className="fade-in-up">
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
                                    ? "Visit the Pricing or Training pages to start a checkout."
                                    : "If your payment went through, you'll still receive a confirmation email. Otherwise please try again."}
                            </p>
                            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Link to="/pricing" className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/10">
                                    See Plans
                                </Link>
                                <Link to="/training" className="inline-flex items-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 transition-all hover:border-white/20 hover:text-white">
                                    Training Programs
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
