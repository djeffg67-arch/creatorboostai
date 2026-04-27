import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { createCheckoutSession } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { toast } from "sonner";
import {
    Package, ArrowRight, CheckCircle2, Lock, Download, FileVideo,
    Sparkles, Loader2, Brain, Eye,
} from "lucide-react";

const TIERS = [
    {
        key: "signal_pack_standard",
        name: "Standard",
        price: "$299",
        kicker: "Single Operator",
        bullets: [
            "15–25 labeled signal video clips",
            "Structured signal definitions",
            "Decision moments — friction, readiness, hidden close, confusion, skepticism",
            "Execution actions for each signal",
            "What You Missed breakdown",
            "Lifetime access · single operator",
        ],
        cta: "Get Standard Access",
    },
    {
        key: "signal_pack_pro",
        name: "Professional",
        price: "$499",
        kicker: "Sales / Legal Pro",
        bullets: [
            "Everything in Standard",
            "Extended labeled clip set with edge cases",
            "Insight breakdowns + execution playbooks",
            "Quarterly Vol. 1 update access",
            "Lifetime access · single operator",
        ],
        cta: "Get Professional Access",
        highlight: true,
        badge: "Most popular",
    },
    {
        key: "signal_pack_enterprise",
        name: "Enterprise License",
        price: "$1,500+",
        kicker: "Team / Org",
        bullets: [
            "Everything in Professional",
            "Internal team license — up to 25 seats",
            "Onboarding session with our analyst",
            "Optional white-label embedding",
            "Priority Audit credit ($500 toward an audit)",
        ],
        cta: "Buy Enterprise License",
    },
];

const INCLUDED = [
    { Icon: FileVideo, label: "15–25 signal video clips" },
    { Icon: Brain,     label: "Labeled decision moments" },
    { Icon: Sparkles,  label: "Structured signal definitions" },
    { Icon: Eye,       label: "Execution actions per signal" },
    { Icon: Lock,      label: "Lifetime access · instant download" },
];

export default function SignalPackPage() {
    const [busy, setBusy] = useState(null);

    const buy = async (productKey) => {
        setBusy(productKey);
        try {
            const origin = window.location.origin;
            const res = await createCheckoutSession({ product_key: productKey, origin_url: origin });
            if (res?.url) {
                window.location.href = res.url;
                return;
            }
            toast.error("Checkout did not return a URL. Please try again.");
        } catch (e) {
            const detail = e?.response?.data?.detail;
            if (e?.response?.status === 503) {
                toast.error("Checkout is launching shortly — Stripe Live Keys go in any moment. Please try again or contact us.");
            } else {
                toast.error(detail || "Checkout failed. Please try again.");
            }
        } finally {
            setBusy(null);
        }
    };

    return (
        <Layout>
            <div className="relative" data-testid="signal-pack-page">
                {/* HERO */}
                <section className="relative isolate border-b border-white/5 py-20 lg:py-28">
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <img src={PAGE_HERO.preview} alt="" className="absolute inset-0 h-[70%] w-full object-cover opacity-15" loading="eager" />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/85 to-ink-900" />
                        <div className="absolute inset-0 ambient-grid opacity-30" />
                        <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, left: -120 }} />
                    </div>
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Package size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Signal Intelligence Packs · Vol. 1</span>
                        </div>
                        <h1 className="font-heading mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                            BodyIQ-AI Signal Pack — <span className="text-cyan-400">Closing Intelligence.</span>
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                            15–25 labeled signal video clips. Structured decision moments — friction, readiness,
                            hidden close, confusion, skepticism. Execution actions for every signal. Plus a
                            <em> What You Missed </em> breakdown most professionals never see.
                        </p>

                        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {INCLUDED.map((b) => (
                                <div key={b.label} className="flex items-center gap-2 rounded-sm border border-white/10 bg-ink-700/40 px-3 py-2.5">
                                    <b.Icon size={13} className="text-cyan-400" />
                                    <span className="text-xs text-slate-300">{b.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PRICING TIERS */}
                <section className="border-b border-white/5 py-20" data-testid="signal-pack-tiers">
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Choose your access</p>
                        <h2 className="font-heading mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                            Three tiers. <span className="text-cyan-400">Instant access.</span>
                        </h2>

                        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            {TIERS.map((t) => (
                                <div
                                    key={t.key}
                                    data-testid={`signal-pack-tier-${t.key}`}
                                    className={`relative flex flex-col rounded-md border p-7 transition-all ${
                                        t.highlight
                                            ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-[0_0_40px_rgba(6,182,212,0.18)]"
                                            : "border-white/10 bg-ink-700/40"
                                    }`}
                                >
                                    {t.badge && (
                                        <span className="absolute -top-3 left-7 rounded-full border border-cyan-500/40 bg-ink-800 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                                            {t.badge}
                                        </span>
                                    )}
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{t.kicker}</p>
                                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white">{t.name}</h3>
                                    <p className="font-heading mt-3 text-3xl font-semibold text-cyan-300">{t.price}</p>
                                    <ul className="mt-5 flex-1 space-y-2.5">
                                        {t.bullets.map((b) => (
                                            <li key={b} className="flex items-start gap-2 text-sm text-slate-300">
                                                <CheckCircle2 size={13} className="mt-1 flex-shrink-0 text-cyan-400" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => buy(t.key)}
                                        disabled={busy === t.key}
                                        data-testid={`buy-${t.key}`}
                                        className={`mt-7 inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-all ${
                                            t.highlight
                                                ? "bg-cyan-500 text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:bg-cyan-400"
                                                : "border border-cyan-500/40 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                                        } disabled:opacity-60`}
                                    >
                                        {busy === t.key ? (
                                            <><Loader2 size={14} className="animate-spin" /> Redirecting…</>
                                        ) : (
                                            <>{t.cta} <ArrowRight size={14} /></>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <p className="mt-8 max-w-3xl rounded-md border border-white/10 bg-ink-700/40 p-4 text-sm text-slate-300">
                            Secure checkout via Stripe. After payment you'll receive an email with your access link
                            and be redirected to your private download page.
                        </p>
                    </div>
                </section>

                {/* UPSELL — audit on your own footage */}
                <section className="py-16" data-testid="signal-pack-audit-cta">
                    <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
                        <h2 className="font-heading text-3xl font-semibold leading-tight text-white sm:text-4xl">
                            Want to see this <span className="text-cyan-400">inside your own meetings?</span>
                        </h2>
                        <p className="mt-4 text-base text-slate-300">
                            Send us a recording. Our analysts return a signal timeline, key clips, missed opportunities, and
                            execution recommendations.
                        </p>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link
                                to="/services/audit"
                                data-testid="cta-request-audit"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400"
                            >
                                Request Signal Intelligence Audit <ArrowRight size={14} />
                            </Link>
                            <Link
                                to="/services/report"
                                data-testid="cta-full-report"
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
