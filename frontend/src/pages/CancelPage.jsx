import React from "react";
import { Layout } from "@/components/site/Layout";
import { Link, useSearchParams } from "react-router-dom";
import { XCircle, ArrowRight, MessageSquare } from "lucide-react";
import { PAGE_HERO } from "@/lib/images";

const HUMAN_LABELS = {
    foundations: "Signal Foundations",
    applied: "Applied Signals",
    strategy: "Strategy Program",
    full_training: "Full Training Program",
    forensic_library: "Forensic Visual Library",
    cb_starter_monthly: "CreatorBoostAI Starter",
    cb_starter_annual: "CreatorBoostAI Starter (annual)",
    cb_growth_monthly: "CreatorBoostAI Growth",
    cb_growth_annual: "CreatorBoostAI Growth (annual)",
    cb_pro_monthly: "CreatorBoostAI Pro",
    cb_pro_annual: "CreatorBoostAI Pro (annual)",
};

export default function CancelPage() {
    const [params] = useSearchParams();
    const product = params.get("product");
    const label = product ? (HUMAN_LABELS[product] || product) : null;
    const isSubscription = !!product?.startsWith("cb_");

    return (
        <Layout>
            <section className="relative overflow-hidden py-24 lg:py-36" data-testid="cancel-page">
                <img src={PAGE_HERO.thankyou} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-b from-ink-900/85 via-ink-900/90 to-ink-900" />
                <div className="absolute inset-0 ambient-grid" />

                <div className="relative mx-auto max-w-2xl px-5 text-center lg:px-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
                        <XCircle size={26} className="text-slate-400" />
                    </div>
                    <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Checkout Canceled
                    </p>
                    <h1 className="font-heading mt-4 text-balance text-4xl font-semibold text-white sm:text-5xl" data-testid="cancel-title">
                        No problem — nothing was charged.
                    </h1>
                    {label && (
                        <p className="mt-4 inline-block rounded-sm border border-white/10 bg-ink-700/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400" data-testid="cancel-product">
                            {label}
                        </p>
                    )}
                    <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg">
                        Your payment was canceled and your card was not charged. You can resume
                        anytime — your seat or plan will be there waiting.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            to={isSubscription ? "/pricing" : "/training"}
                            data-testid="cancel-primary-cta"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400"
                        >
                            {isSubscription ? "Back to Pricing" : "Back to Training"} <ArrowRight size={15} />
                        </Link>
                        <Link
                            to="/contact"
                            data-testid="cancel-contact-cta"
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-6 py-3.5 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/10"
                        >
                            <MessageSquare size={15} /> Talk to us
                        </Link>
                    </div>

                    <p className="mt-10 text-xs text-slate-500">
                        Have a question about pricing, programs, or the platform? We respond within 24 hours.
                    </p>
                </div>
            </section>
        </Layout>
    );
}
