import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
    Calendar, ArrowRight, Sparkles, BookOpen, LayoutDashboard, Send,
} from "lucide-react";

/**
 * Post-demo conversion block. Renders directly under the final scene of both
 * /demo/realtor and /demo/insurance. Replaces the prior "dead-end" with a
 * primary "Book a Live Demo" CTA + 4 secondary CTAs.
 *
 * Soft auto-scroll: when `autoScroll` flips to true (demo final scene ended),
 * the section gently scrolls into view. Optional `autoRedirect` (8s) bounces
 * to /apply/strategy if the user has not interacted.
 *
 * Design strictly inherits the existing dark navy / cyan / mono-kicker system.
 */
export const DemoConversionCTA = ({
    autoScroll = false,
    autoRedirect = false,
    redirectMs = 8000,
    onShareClick,
    demoType = "realtor",
}) => {
    const ref = useRef(null);
    const interactedRef = useRef(false);

    // Soft auto-scroll into view when the demo finishes
    useEffect(() => {
        if (autoScroll && ref.current) {
            // Small delay so the closing scene's fade-out completes first
            const t = setTimeout(() => {
                ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 600);
            return () => clearTimeout(t);
        }
    }, [autoScroll]);

    // Optional auto-redirect (low-cost finishing touch). Cancels on any user
    // interaction (pointer, keyboard, scroll within the block).
    useEffect(() => {
        if (!autoRedirect || !autoScroll) return;
        const cancel = () => { interactedRef.current = true; };
        window.addEventListener("pointerdown", cancel, { once: true });
        window.addEventListener("keydown", cancel, { once: true });
        const node = ref.current;
        node?.addEventListener("wheel", cancel, { once: true });
        const t = setTimeout(() => {
            if (!interactedRef.current) {
                window.location.assign("/apply/strategy");
            }
        }, redirectMs);
        return () => {
            clearTimeout(t);
            window.removeEventListener("pointerdown", cancel);
            window.removeEventListener("keydown", cancel);
            node?.removeEventListener("wheel", cancel);
        };
    }, [autoRedirect, autoScroll, redirectMs]);

    return (
        <section
            ref={ref}
            data-testid="demo-conversion-cta"
            className="relative mx-auto mt-16 max-w-6xl rounded-md border border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 to-transparent p-6 sm:p-10 lg:p-14 shadow-[0_0_60px_rgba(6,182,212,0.12)]"
        >
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-md">
                <div className="glow-orb glow-orb--cyan" style={{ width: 380, height: 380, top: -160, left: -120, opacity: 0.35 }} />
                <div className="glow-orb glow-orb--blue" style={{ width: 320, height: 320, bottom: -160, right: -100, opacity: 0.25 }} />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    Ready when you are · Take the next step
                </span>
            </div>

            <h2 className="font-heading mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl">
                You've seen the system.{" "}
                <span className="text-cyan-400">Let's wire it into your business.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Book a live walkthrough with our team, explore pricing, or share this demo with the
                decision-makers on your side. CreatorBoostAI sits on top of what you already run — onboarding starts in days.
            </p>

            {/* Primary CTA */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                    to="/apply/strategy"
                    data-testid="conversion-primary-book"
                    className="group inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-7 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_45px_rgba(6,182,212,0.6)]"
                >
                    <Calendar size={16} />
                    Book a Live Demo
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:ml-2">
                    30-min strategy call · no auto-charges
                </p>
            </div>

            {/* Secondary CTAs */}
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SecondaryCTA
                    to="/pricing"
                    Icon={Sparkles}
                    label="View Pricing"
                    sub="Starter · Pro · Enterprise"
                    testid="conversion-secondary-pricing"
                />
                <SecondaryCTA
                    to="/training"
                    Icon={BookOpen}
                    label="Start Training"
                    sub="$400 · $1,500 cohorts live"
                    testid="conversion-secondary-training"
                />
                <SecondaryCTA
                    to="/portal"
                    Icon={LayoutDashboard}
                    label="Open Command Center"
                    sub="Customer portal preview"
                    testid="conversion-secondary-portal"
                />
                <button
                    type="button"
                    onClick={onShareClick}
                    data-testid="conversion-secondary-share"
                    className="group flex flex-col items-start gap-1 rounded-md border border-white/10 bg-ink-900 p-4 text-left transition-all hover:border-cyan-500/50 hover:bg-ink-800"
                >
                    <div className="flex items-center gap-2">
                        <Send size={13} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400 group-hover:text-cyan-300">
                            Email This Demo
                        </span>
                    </div>
                    <span className="font-heading text-base font-semibold text-white">
                        Send to a client
                    </span>
                    <span className="text-[11px] text-slate-400">
                        Personalized email + tracked link
                    </span>
                </button>
            </div>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500" data-testid="conversion-demo-tag">
                Demo · {demoType === "insurance" ? "Insurance" : "Real Estate"} vertical
            </p>
        </section>
    );
};

const SecondaryCTA = ({ to, Icon, label, sub, testid }) => (
    <Link
        to={to}
        data-testid={testid}
        className="group flex flex-col items-start gap-1 rounded-md border border-white/10 bg-ink-900 p-4 transition-all hover:border-cyan-500/50 hover:bg-ink-800"
    >
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400 group-hover:text-cyan-300">
                {label}
            </span>
        </div>
        <span className="font-heading text-base font-semibold text-white">{label}</span>
        <span className="text-[11px] text-slate-400">{sub}</span>
    </Link>
);

export default DemoConversionCTA;
