import React from "react";
import { Link } from "react-router-dom";
import { Play, ArrowRight, Sparkles, ShieldCheck, Compass } from "lucide-react";

/**
 * FinalLaunchCTA · Iter 96+
 * --------------------------------------------------------------------
 * Final-fold conversion strip. "Ready to see it in action?" headline +
 * primary launch button + 3 trust micro-points (no card, personalized,
 * see your industry).
 */
export const FinalLaunchCTA = () => {
    return (
        <section
            data-testid="final-launch-cta"
            className="relative isolate overflow-hidden border-b border-white/5 bg-gradient-to-br from-ink-900 via-[#040d18] to-ink-900 py-24 lg:py-28"
        >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(34,211,238,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.4)_1px,transparent_1px)] [background-size:80px_80px]" />
                <div className="absolute left-1/2 top-1/2 h-[700px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.18),rgba(139,92,246,0.10)_40%,transparent_75%)] blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
            </div>

            <div className="mx-auto max-w-[1100px] px-5 text-center lg:px-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 backdrop-blur-md">
                    <Sparkles size={11} className="text-cyan-300" />
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                        Ready to See It in Action?
                    </span>
                </div>
                <h2
                    className="font-heading mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
                    data-testid="final-cta-headline"
                >
                    This is not a demo.
                    <br />
                    <span className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                        This is your future operating system.
                    </span>
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                    Walk into a live, governed, multi-industry command center — built around your business in minutes,
                    not months.
                </p>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        to="/demo"
                        data-testid="final-cta-launch-demo"
                        className="group inline-flex items-center gap-2 rounded-md bg-cyan-500 px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink-900 shadow-[0_0_36px_rgba(34,211,238,0.45)] transition hover:bg-cyan-400 hover:shadow-[0_0_48px_rgba(34,211,238,0.6)]"
                    >
                        <Play size={13} className="fill-current" />
                        Launch Interactive Demo
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        to="/startup-launch"
                        data-testid="final-cta-startup-launch"
                        className="group inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 transition hover:border-cyan-400/70 hover:bg-cyan-500/10 hover:text-cyan-100"
                    >
                        Build My Business
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3" data-testid="final-cta-trust">
                    <li className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        <ShieldCheck size={12} className="text-emerald-400" />
                        No credit card required
                    </li>
                    <li className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        <Sparkles size={12} className="text-cyan-300" />
                        Personalized walkthrough
                    </li>
                    <li className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        <Compass size={12} className="text-violet-300" />
                        See your industry in action
                    </li>
                </ul>
            </div>
        </section>
    );
};

export default FinalLaunchCTA;
