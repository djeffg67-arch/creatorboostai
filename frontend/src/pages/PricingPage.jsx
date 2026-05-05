import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { listSubscriptions, createSubscriptionSession, createLiveCheckoutSession } from "@/lib/api";
import { PAGE_HERO } from "@/lib/images";
import { toast } from "sonner";
import {
    Sparkles, Check, ArrowRight, Zap, Building2, ShieldCheck, Crown, Rocket,
} from "lucide-react";

// Iter 54 · Startup Pricing tiers — early-stage operators
const STARTUP_TIERS = [
    {
        key: "startup_launch_monthly", tier: "startup_starter",
        name: "Starter Launch", price: 29, icon: Rocket,
        tagline: "Brand-new businesses · validate the system",
        bullets: [
            "10 fresh leads / day",
            "10 emails / day",
            "Single-sender outbound",
            "AI scoring + Day 0 email",
            "No follow-ups (upgrade to unlock)",
            "Cancel anytime",
        ],
    },
    {
        key: "startup_growth_monthly", tier: "startup_growth", featured: true,
        name: "Growth Launch", price: 79, icon: Sparkles,
        tagline: "Early-stage operators · ready for cadence",
        bullets: [
            "25 fresh leads / day",
            "25 emails / day",
            "Single-sender outbound",
            "Automated follow-ups (Day 1, 2, 5)",
            "AI reply classifier",
            "Hot-lead detection (read-only)",
        ],
    },
    {
        key: "startup_pro_monthly", tier: "startup_pro",
        name: "Pro Launch", price: 149, icon: ShieldCheck,
        tagline: "Scaling startup · full execution",
        bullets: [
            "50 fresh leads / day",
            "50 emails / day",
            "Multi-sender inbox rotation (3 inboxes)",
            "Automated follow-ups + Loom Day 2",
            "Hot-lead push-button re-engage",
            "Priority queue for replies",
        ],
    },
];

const TIERS = [
    {
        tier: "starter", name: "Starter", icon: Zap,
        tagline: "Solo operators + early teams",
        bullets: [
            "Connects up to 3 systems",
            "Up to 1,000 leads / month",
            "Auto-capture + AI scoring",
            "Email + SMS follow-up automation",
            "1 team seat",
            "Standard support",
        ],
    },
    {
        tier: "growth", name: "Growth", icon: Sparkles, featured: true,
        tagline: "Growing brokerages + agencies",
        bullets: [
            "Connects up to 10 systems",
            "Up to 10,000 leads / month",
            "Full AI scoring + segmentation",
            "Autonomous follow-up (channel-level)",
            "Up to 10 team seats",
            "Priority support · onboarding included",
        ],
    },
    {
        tier: "pro", name: "Pro", icon: ShieldCheck,
        tagline: "Established operators + multi-brand",
        bullets: [
            "Connects unlimited systems",
            "Unlimited leads",
            "Full AI underwriting + risk scoring",
            "Autonomous mode (you choose by team)",
            "Up to 25 team seats",
            "National command center + drill-down",
            "Dedicated success manager",
        ],
    },
    {
        tier: "enterprise", name: "Enterprise", icon: Crown,
        tagline: "Multi-office, multi-region operators",
        bullets: [
            "Everything in Pro",
            "Custom integrations + carrier appetite mapping",
            "SOC 2 + compliance reporting",
            "Dedicated solutions architect",
            "Volume + multi-year pricing",
            "SLA + private onboarding",
        ],
        custom: true,
    },
];

export default function PricingPage() {
    const [billing, setBilling] = useState("month"); // month | year
    const [plans, setPlans] = useState({});
    const [loading, setLoading] = useState(true);
    const [redirecting, setRedirecting] = useState(null);

    useEffect(() => {
        listSubscriptions()
            .then(setPlans)
            .catch(() => toast.error("Could not load pricing"))
            .finally(() => setLoading(false));
    }, []);

    // Live Stripe Price IDs (Iter 38 · monthly subscriptions · verified live)
    const LIVE_MONTHLY_PRICE_IDS = {
        starter: "price_1TSprFQgMVyWwTDfAZzOxX5T",
        growth:  "price_1TSptIQgMVyWwTDfqevpx5cL",
        pro:     "price_1TSpuQQgMVyWwTDf59EndVq5",
    };

    const subscribe = async (tier) => {
        // Monthly → live Price ID flow (Jeffrey's active Stripe products)
        const livePriceId = billing === "month" ? LIVE_MONTHLY_PRICE_IDS[tier] : null;
        if (livePriceId) {
            setRedirecting(`live_${tier}_monthly`);
            try {
                const { url } = await createLiveCheckoutSession({
                    priceId: livePriceId,
                    successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&product=live_${tier}_monthly`,
                    cancelUrl: `${window.location.origin}/pricing?canceled=${tier}`,
                    plan_type: "subscription",
                });
                toast.success("Opening secure checkout…");
                window.location.href = url;
                return;
            } catch (err) {
                const detail = err?.response?.data?.detail;
                toast.error(typeof detail === "string" ? detail : "Could not open checkout");
                setRedirecting(null);
                return;
            }
        }

        // Annual (or anything else) → legacy plan_key flow
        const planKey = `cb_${tier}_annual`;
        if (!plans[planKey]) { toast.error("Plan unavailable"); return; }
        setRedirecting(planKey);
        try {
            const { url } = await createSubscriptionSession({
                plan_key: planKey,
                origin_url: window.location.origin,
            });
            toast.success("Opening secure checkout…");
            window.location.href = url;
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not open checkout");
            setRedirecting(null);
        }
    };

    const LIVE_MONTHLY_PRICES = { starter: 97, growth: 297, pro: 597 };
    const priceFor = (tier) => {
        if (billing === "month" && LIVE_MONTHLY_PRICES[tier] != null) {
            return { amount: LIVE_MONTHLY_PRICES[tier], interval: "month" };
        }
        const planKey = `cb_${tier}_${billing === "year" ? "annual" : "monthly"}`;
        return plans[planKey];
    };

    // Iter 54 · Startup tier checkout — uses plan_key flow (Stripe Price IDs from .env)
    const subscribeStartup = async (planKey) => {
        setRedirecting(planKey);
        try {
            const { url } = await createSubscriptionSession({
                plan_key: planKey,
                origin_url: window.location.origin,
            });
            toast.success("Opening secure checkout…");
            window.location.href = url;
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not open checkout");
            setRedirecting(null);
        }
    };

    return (
        <Layout>
            <div className="relative mx-auto max-w-[1280px] px-4 py-12 lg:px-8 lg:py-20" data-testid="pricing-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <img src={PAGE_HERO.pricing} alt="" className="absolute inset-0 h-[55%] w-full object-cover opacity-15" loading="eager" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/85 to-ink-900" />
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -180, left: -120 }} />
                </div>

                <header className="text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <Sparkles size={11} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Subscription Pricing</span>
                    </div>
                    <h1 className="font-heading mx-auto mt-6 max-w-3xl text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                        One execution layer.{" "}
                        <span className="text-cyan-400">Four plans.</span>
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                        CreatorBoostAI sits on top of every system you already run. Pick a plan and start
                        unifying your stack in days, not quarters. Cancel any time.
                    </p>
                    {/* Billing toggle */}
                    <div className="mx-auto mt-8 inline-flex rounded-md border border-white/10 bg-ink-800 p-1" data-testid="billing-toggle">
                        <button
                            data-testid="billing-month"
                            onClick={() => setBilling("month")}
                            className={`rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] transition-all ${billing === "month" ? "bg-cyan-500 text-ink-900" : "text-slate-300 hover:text-cyan-300"}`}
                        >Monthly</button>
                        <button
                            data-testid="billing-year"
                            onClick={() => setBilling("year")}
                            className={`rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] transition-all ${billing === "year" ? "bg-cyan-500 text-ink-900" : "text-slate-300 hover:text-cyan-300"}`}
                        >Annual <span className="ml-1 text-[9px]">save 2 mo</span></button>
                    </div>
                </header>

                {/* Iter 54 · For New Businesses — startup tiers */}
                <section className="mt-12" data-testid="pricing-startup-section">
                    <div className="mb-6 flex items-center gap-3">
                        <Rocket size={16} className="text-emerald-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                            For New Businesses · Validate fast · Cancel anytime
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3" data-testid="pricing-startup-tiers">
                        {STARTUP_TIERS.map((t) => (
                            <div
                                key={t.key}
                                data-testid={`startup-tier-${t.tier}`}
                                className={`relative flex flex-col rounded-md border p-6 transition-all ${
                                    t.featured
                                        ? "border-emerald-400/50 bg-gradient-to-b from-emerald-400/10 to-transparent shadow-[0_0_30px_rgba(16,185,129,0.18)]"
                                        : "border-white/10 bg-ink-700/30 hover:border-emerald-400/30"
                                }`}
                            >
                                {t.featured && (
                                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-sm border border-emerald-400/50 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                                        <Sparkles size={10} /> Most picked
                                    </span>
                                )}
                                <div className="flex items-center gap-2">
                                    <t.icon size={16} className="text-emerald-300" />
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">{t.name}</span>
                                </div>
                                <p className="mt-2 text-sm text-slate-400">{t.tagline}</p>
                                <div className="mt-6 flex items-end gap-1.5 border-b border-white/5 pb-6">
                                    <span className="font-heading text-5xl font-semibold text-white">${t.price}</span>
                                    <span className="mb-1.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">USD · /mo</span>
                                </div>
                                <ul className="mt-6 space-y-2.5 text-sm text-slate-300 flex-1">
                                    {t.bullets.map((b) => (
                                        <li key={b} className="flex items-start gap-2.5">
                                            <Check size={14} className="mt-0.5 flex-shrink-0 text-emerald-300" />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    data-testid={`subscribe-${t.tier}`}
                                    onClick={() => subscribeStartup(t.key)}
                                    disabled={loading || redirecting}
                                    className={`mt-8 inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                                        t.featured
                                            ? "bg-emerald-400 text-ink-900 shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:bg-emerald-300"
                                            : "border border-emerald-400/40 bg-transparent text-emerald-300 hover:bg-emerald-400 hover:text-ink-900"
                                    }`}
                                >
                                    {redirecting === t.key ? "Redirecting…" : `Get ${t.name}`} <ArrowRight size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-center text-xs text-slate-500">
                        Outgrow it? Upgrade to a Standard tier in one click — your leads, history, and senders move with you.
                    </p>
                </section>

                <div className="mt-16 flex items-center justify-center gap-3">
                    <span className="h-px w-16 bg-white/10" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">For Established Operators</span>
                    <span className="h-px w-16 bg-white/10" />
                </div>

                {/* Tiers */}
                <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" data-testid="pricing-tiers">
                    {TIERS.map((t) => {
                        const plan = !t.custom ? priceFor(t.tier) : null;
                        return (
                            <div
                                key={t.tier}
                                data-testid={`tier-${t.tier}`}
                                className={`relative flex flex-col rounded-md border p-6 lg:p-8 transition-all ${
                                    t.featured
                                        ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-[0_0_40px_rgba(6,182,212,0.15)]"
                                        : "border-white/10 bg-ink-700/30 hover:border-white/20"
                                }`}
                            >
                                {t.featured && (
                                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/50 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                                        <Zap size={10} /> Most selected
                                    </span>
                                )}
                                <div className="flex items-center gap-2">
                                    <t.icon size={16} className="text-cyan-400" />
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{t.name}</span>
                                </div>
                                <p className="mt-2 text-sm text-slate-400">{t.tagline}</p>

                                {/* Price */}
                                <div className="mt-6 flex items-end gap-1.5 border-b border-white/5 pb-6 min-h-[80px]">
                                    {t.custom ? (
                                        <span className="font-heading text-3xl font-semibold text-white">Custom</span>
                                    ) : (
                                        <>
                                            <span className="font-heading text-5xl font-semibold text-white">${plan ? plan.amount.toLocaleString() : "—"}</span>
                                            <span className="mb-1.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">USD · /{billing}</span>
                                        </>
                                    )}
                                </div>

                                <ul className="mt-6 space-y-2.5 text-sm text-slate-300 flex-1">
                                    {t.bullets.map((b) => (
                                        <li key={b} className="flex items-start gap-2.5">
                                            <Check size={14} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                {t.custom ? (
                                    <Link
                                        to="/contact"
                                        data-testid={`subscribe-${t.tier}`}
                                        className="mt-8 inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-transparent px-6 py-3.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                                    >
                                        Talk to sales <ArrowRight size={15} />
                                    </Link>
                                ) : (
                                    <button
                                        data-testid={`subscribe-${t.tier}`}
                                        onClick={() => subscribe(t.tier)}
                                        disabled={loading || redirecting}
                                        className={`mt-8 inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                                            t.featured
                                                ? "bg-cyan-500 text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.55)]"
                                                : "border border-cyan-500/40 bg-transparent text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                                        }`}
                                    >
                                        {redirecting?.includes(t.tier) ? "Redirecting…" : `Get ${t.name}`} <ArrowRight size={15} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </section>

                {/* Trust strip */}
                <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="pricing-trust">
                    <Trust icon={ShieldCheck} title="Sits on top — never replaces" body="Your CRM, AMS, and tools stay exactly as they are." />
                    <Trust icon={Building2} title="Stripe billing · cancel anytime" body="Secure subscriptions through Stripe. PayPal coming soon." />
                    <Trust icon={Sparkles} title="Patent-pending execution layer" body="Proprietary architecture. No long-term contract required." />
                </section>

                {/* FAQ-style closing */}
                <section className="mt-16 rounded-md border border-white/10 bg-ink-700/30 p-6 lg:p-8 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Looking for high-touch training?</p>
                    <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                        BodyIQ-AI live programs.
                    </h3>
                    <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
                        Live cohorts at $400 / $1,500. Elite 1:1 programs at $7K / $27K (application + strategy call required).
                    </p>
                    <Link
                        to="/training"
                        className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-200"
                    >
                        See training programs <ArrowRight size={12} />
                    </Link>
                </section>
            </div>
        </Layout>
    );
}

const Trust = ({ icon: Icon, title, body }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5">
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Trust</span>
        </div>
        <p className="font-heading mt-2 text-base font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{body}</p>
    </div>
);
