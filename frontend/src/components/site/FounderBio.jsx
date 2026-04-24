import React from "react";

export const FounderBio = ({ variant = "default" }) => {
    const isCompact = variant === "compact";
    return (
        <section
            data-testid="founder-bio"
            className="relative overflow-hidden border-y border-white/5 bg-ink-900/60"
        >
            {/* subtle ambient lights */}
            <div className="pointer-events-none absolute inset-0">
                <div className="glow-orb glow-orb--cyan" style={{ width: 360, height: 360, top: -140, left: -100, opacity: 0.25 }} />
                <div className="glow-orb glow-orb--blue" style={{ width: 320, height: 320, bottom: -140, right: -80, opacity: 0.22 }} />
            </div>

            <div className={`relative mx-auto max-w-7xl px-5 lg:px-8 ${isCompact ? "py-12 lg:py-14" : "py-16 lg:py-20"}`}>
                <div className="flex items-center gap-2 pb-6">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        System Architect · Founder
                    </span>
                    <span className="ml-2 hidden h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent sm:block" />
                </div>

                <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12 md:gap-10">
                    {/* Portrait placeholder */}
                    <div className="md:col-span-3 lg:col-span-2">
                        <div
                            className="relative aspect-square w-32 overflow-hidden rounded-md border border-white/10 bg-ink-800 md:w-full md:max-w-[180px]"
                            data-testid="founder-portrait"
                        >
                            {/* Monogram placeholder — swap with real image by replacing this block */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-ink-800 to-blue-500/10" />
                            <div className="absolute inset-0 ambient-grid opacity-40" />
                            <div className="relative flex h-full w-full items-center justify-center">
                                <span className="font-heading text-4xl font-semibold tracking-tight text-white/90 md:text-5xl">
                                    JG
                                </span>
                            </div>
                            <div className="absolute bottom-2 left-2 rounded-sm border border-cyan-500/30 bg-ink-900/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400 backdrop-blur">
                                Founder
                            </div>
                            {/* Active scan */}
                            <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent animate-scan-line" />
                        </div>
                    </div>

                    {/* Text */}
                    <div className="md:col-span-9 lg:col-span-10">
                        <h2 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                            Jeffrey Garcia
                        </h2>

                        <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                            <p>
                                Jeffrey Garcia is the creator of BodyIQ-AI, a human signal intelligence
                                system designed to interpret visual, auditory, and behavioral patterns
                                in real-world interactions.
                            </p>
                            <p>
                                His work focuses on identifying micro-level signals that most people
                                overlook and translating them into structured decision frameworks. The
                                system was developed through direct observation, pattern recognition,
                                and real-world application across high-stakes environments.
                            </p>
                            <p>
                                BodyIQ-AI is built to provide consistent interpretation of human
                                behavior and deliver actionable strategy outputs in situations where
                                timing, perception, and response determine outcomes.
                            </p>
                        </div>

                        {/* Credibility markers */}
                        <div className="mt-7 grid grid-cols-3 gap-5 border-t border-white/5 pt-5 sm:max-w-xl">
                            <div>
                                <p className="font-heading text-xl font-semibold text-white sm:text-2xl">12+</p>
                                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                    Signal Channels
                                </p>
                            </div>
                            <div>
                                <p className="font-heading text-xl font-semibold text-white sm:text-2xl">Field</p>
                                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                    Application
                                </p>
                            </div>
                            <div>
                                <p className="font-heading text-xl font-semibold text-white sm:text-2xl">Live</p>
                                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                    Cohorts
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
