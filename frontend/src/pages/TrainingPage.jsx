import React, { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { EmailCapture } from "@/components/site/EmailCapture";
import { Check, ArrowRight, Zap } from "lucide-react";
import { createCheckoutSession, captureLead } from "@/lib/api";
import { toast } from "sonner";

const TRAINING_HERO = "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1920&q=75";
const COACHING_IMG = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=75";
const APPLIED_IMG = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1400&q=75";

const tiers = [
    {
        key: "foundations",
        tag: "Tier I · Foundations",
        name: "Signal Foundations",
        price: 400,
        duration: "2-hour live session",
        summary: "Introduction to signal recognition and basic strategy application.",
        image: COACHING_IMG,
        bullets: [
            "Baseline establishment framework",
            "Three primary signal channels explained",
            "Pattern recognition drills (live)",
            "Strategy formulation worksheet",
            "Recording + session notes",
        ],
        cta: "Reserve spot",
    },
    {
        key: "applied",
        tag: "Tier II · Applied",
        name: "Applied Signals",
        price: 1500,
        duration: "2–3 hour live session",
        summary: "Deeper interpretation, pattern locking, and real-world application.",
        featured: true,
        image: APPLIED_IMG,
        bullets: [
            "Advanced cross-channel fusion",
            "Live negotiation read + debrief",
            "High-stakes scenario library access",
            "1:1 review slot (30 min)",
            "Post-session strategy template pack",
            "Cohort Slack access (30 days)",
        ],
        cta: "Reserve spot",
    },
];

export default function TrainingPage() {
    const [reserving, setReserving] = useState(null);

    const handleReserve = async (tier) => {
        setReserving(tier.key);
        try {
            // Log reservation intent as a lead (best-effort)
            captureLead({
                email: `pending+${Date.now()}@reservation.local`,
                source: "training",
                metadata: { tier: tier.key, price: tier.price, step: "initiated" },
            }).catch(() => null);

            const { url } = await createCheckoutSession({
                product_key: tier.key,
                origin_url: window.location.origin,
            });
            toast.success("Opening secure checkout…");
            window.location.href = url;
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not open checkout. Try again.");
            setReserving(null);
        }
    };

    return (
        <Layout>
            <section className="relative overflow-hidden py-20 lg:py-28" data-testid="training-hero">
                {/* Hero background */}
                <div className="absolute inset-0">
                    <img
                        src={TRAINING_HERO}
                        alt=""
                        loading="eager"
                        className="h-full w-full object-cover opacity-25"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-ink-800/70 via-ink-800/90 to-ink-800" />
                <div className="absolute inset-0 ambient-grid" />
                <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 420, height: 420, top: -120, right: -60 }} />
                <div className="glow-orb glow-orb--blue" style={{ width: 360, height: 360, bottom: -140, left: -80 }} />

                <div className="relative mx-auto max-w-5xl px-5 text-center lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Live Training · 2026 Cohorts</p>
                    <h1 className="font-heading mt-4 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                        Train the read. Sharpen the call.
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Two programs. Both live. Both practitioner-grade. Reserve your seat and run
                        signal reads in real conditions with working operators.
                    </p>
                </div>
            </section>

            <section className="pb-24" data-testid="training-pricing">
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-5 lg:grid-cols-2 lg:px-8">
                    {tiers.map((t) => (
                        <div
                            key={t.key}
                            data-testid={`tier-${t.key}`}
                            className={`relative flex flex-col rounded-md border p-8 lg:p-10 transition-all ${
                                t.featured
                                    ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/5 to-transparent shadow-[0_0_40px_rgba(6,182,212,0.12)]"
                                    : "border-white/10 bg-ink-700/30 hover:border-white/20"
                            }`}
                        >
                            {t.featured && (
                                <span className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/50 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                                    <Zap size={10} /> Most selected
                                </span>
                            )}
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{t.tag}</p>
                            <h2 className="font-heading mt-3 text-3xl font-semibold text-white sm:text-4xl">{t.name}</h2>
                            <p className="mt-2 text-sm text-slate-400">{t.duration}</p>
                            <p className="mt-5 text-sm leading-relaxed text-slate-300">{t.summary}</p>

                            <div className="mt-8 flex items-end gap-1.5 border-b border-white/5 pb-6">
                                <span className="font-heading text-5xl font-semibold text-white">${t.price.toLocaleString()}</span>
                                <span className="mb-1.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">USD · per seat</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-sm text-slate-300">
                                {t.bullets.map((b) => (
                                    <li key={b} className="flex items-start gap-2.5">
                                        <Check size={15} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                data-testid={`reserve-${t.key}`}
                                onClick={() => handleReserve(t)}
                                disabled={reserving === t.key}
                                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-semibold transition-all ${
                                    t.featured
                                        ? "bg-cyan-500 text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.55)]"
                                        : "border border-cyan-500/40 bg-transparent text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                                } disabled:opacity-60`}
                            >
                                {reserving === t.key ? "Redirecting…" : t.cta} <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Low-commit lead capture for on-the-fence buyers */}
                <div className="mx-auto mt-20 max-w-3xl px-5 text-center lg:px-8" data-testid="training-lead-capture">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Not ready to reserve?</p>
                    <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                        Get the full curriculum + next cohort dates.
                    </h3>
                    <div className="mx-auto mt-6 max-w-md">
                        <EmailCapture source="training" ctaLabel="Send me details" testid="training-brochure" />
                    </div>
                </div>
            </section>
        </Layout>
    );
}
