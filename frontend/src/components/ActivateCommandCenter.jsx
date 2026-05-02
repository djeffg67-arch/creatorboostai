import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, PhoneCall, Rocket, X, Check } from "lucide-react";

/**
 * <ActivateCommandCenter />
 *
 * Universal post-demo conversion overlay. Mounts inside any demo page when
 * the demo finishes (or when the user clicks a CTA). Routes the visitor to
 * /pricing or /contact — never blocks the underlying demo (clicking the X or
 * the backdrop dismisses it so the user can re-watch).
 *
 * Props:
 *   open       — boolean
 *   onClose    — () => void
 *   industry   — display label e.g. "Real Estate", "Insurance", "Retail"
 *   capability — short list of 4 industry-flavored capability bullets
 *   demoOrigin — short slug used for ?demo= query param so /pricing can
 *                attribute conversions back to the demo of origin
 *
 * Test ID surface (data-testid):
 *   activate-command-center, activate-headline, activate-cta-pricing,
 *   activate-cta-start, activate-cta-setup, activate-close
 */
export const ActivateCommandCenter = ({
    open,
    onClose,
    industry = "your business",
    capability = [
        "Lead capture + AI scoring",
        "Follow-up automation",
        "Pipeline + revenue tracking",
        "AI assistant on every workflow",
    ],
    demoOrigin = "demo",
}) => {
    if (!open) return null;
    const pricingHref = `/pricing?from=${encodeURIComponent(demoOrigin)}`;
    const contactHref = `/contact?intent=setup-call&from=${encodeURIComponent(demoOrigin)}`;
    const enterpriseHref = `/contact?intent=enterprise&from=${encodeURIComponent(demoOrigin)}`;

    const track = (kind, metadata = {}) => {
        try {
            const t = typeof window !== "undefined" && window.__demoTracking?.trackEvent;
            if (t) t(kind, { demoOrigin, industry, ...metadata });
        } catch { /* never block navigation on telemetry */ }
    };

    return (
        <div
            data-testid="activate-command-center"
            className="fixed inset-0 z-[120] flex items-end justify-center overflow-y-auto bg-ink-900/80 backdrop-blur-sm sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                className="relative my-6 w-full max-w-3xl border border-cyan-500/30 bg-gradient-to-b from-ink-800 to-ink-900 shadow-[0_0_60px_rgba(6,182,212,0.25)] sm:rounded-md"
                role="dialog"
                aria-modal="true"
            >
                {/* Close */}
                <button
                    type="button"
                    onClick={() => onClose?.()}
                    data-testid="activate-close"
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink-900/80 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300"
                    aria-label="Close"
                >
                    <X size={14} />
                </button>

                <div className="px-5 py-7 sm:px-10 sm:py-10">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5">
                            <Sparkles size={11} className="text-cyan-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                Demo complete · Next step
                            </span>
                        </span>
                    </div>

                    <h2
                        data-testid="activate-headline"
                        className="font-heading mt-5 text-3xl font-semibold leading-[1.05] text-white sm:text-4xl lg:text-5xl"
                    >
                        Activate Your <span className="text-cyan-400">Command Center.</span>
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                        You're about to start using CreatorBoostAI for{" "}
                        <span className="font-semibold text-white">{industry}</span> — lead generation,
                        follow-up automation, AI assistance, revenue tracking, and full business oversight,
                        configured for your sector.
                    </p>

                    {/* Capability stack */}
                    <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {capability.map((c) => (
                            <li
                                key={c}
                                className="flex items-start gap-2 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2.5"
                            >
                                <Check size={14} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                                <span className="text-sm text-slate-200">{c}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Three CTAs */}
                    <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Link
                            to={pricingHref}
                            data-testid="activate-cta-pricing"
                            onClick={() => track("cta_clicked", { target: "pricing_primary" })}
                            className="group inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400"
                        >
                            <Rocket size={14} />
                            Get Access to CreatorBoostAI
                            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            to={pricingHref}
                            data-testid="activate-cta-start"
                            onClick={() => track("cta_clicked", { target: "pricing_start" })}
                            className="group inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3.5 text-sm font-semibold text-cyan-200 transition-all hover:bg-cyan-500 hover:text-ink-900"
                        >
                            <Sparkles size={14} />
                            Start Using the System
                        </Link>
                        <Link
                            to={contactHref}
                            data-testid="activate-cta-setup"
                            onClick={() => track("meeting_booked", { target: "setup_call" })}
                            className="group inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-ink-700/40 px-5 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-cyan-500/40 hover:text-cyan-300"
                        >
                            <PhoneCall size={14} />
                            Book Setup Call
                        </Link>
                    </div>

                    {/* Enterprise request secondary CTA */}
                    <div className="mt-3">
                        <Link
                            to={enterpriseHref}
                            data-testid="activate-cta-enterprise"
                            onClick={() => track("enterprise_request", { target: "enterprise_contact" })}
                            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 transition-colors hover:text-cyan-300"
                        >
                            Enterprise team? Request custom walkthrough →
                        </Link>
                    </div>

                    <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Configured for {industry} · 14-day money-back guarantee · Cancel any time
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ActivateCommandCenter;
