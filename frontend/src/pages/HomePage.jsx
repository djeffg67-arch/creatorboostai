import React from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { EmailCapture } from "@/components/site/EmailCapture";
import { SignalTape } from "@/components/site/SignalTape";
import { FounderBio } from "@/components/site/FounderBio";
import { ArrowRight, Eye, Ear, Activity, Brain, Target, ShieldCheck } from "lucide-react";

// Curated, optimized imagery (Unsplash CDN with width/quality params)
const HERO_BG = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1920&q=75";
const MEETING_IMG = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=75";
const CONVERSATION_IMG = "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=75";
const TRAINING_BG = "https://images.unsplash.com/photo-1579567761406-4684ee0c75b6?auto=format&fit=crop&w=1600&q=75";

const capabilities = [
    { icon: Eye, title: "Visual Signal Read", desc: "Microexpression, gaze vector, posture asymmetry — translated into structured intelligence." },
    { icon: Ear, title: "Auditory Pattern Map", desc: "Cadence, pause density, prosody shifts, and verbal markers decoded in real time." },
    { icon: Activity, title: "Behavioral Drift", desc: "Baseline deviation, arousal trajectory, and micro-commitment tracking." },
    { icon: Brain, title: "Context Recognition", desc: "Scene, relationship, and stakes inferred to calibrate interpretation." },
    { icon: Target, title: "Strategy Output", desc: "Actionable moves ranked by probability, risk, and timing." },
    { icon: ShieldCheck, title: "Proprietary Layer", desc: "Signal definitions remain protected. You see outcomes, not formulas." },
];

export default function HomePage() {
    return (
        <Layout>
            {/* Hero */}
            <section className="relative overflow-hidden" data-testid="hero-section">
                <div className="absolute inset-0 animate-ken-burns">
                    <div
                        className="h-full w-full bg-cover bg-center opacity-30"
                        style={{ backgroundImage: `url(${HERO_BG})` }}
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-ink-800/60 via-ink-800/85 to-ink-800" />
                <div className="absolute inset-0 ambient-grid" />
                {/* Ambient glow orbs */}
                <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 520, height: 520, top: -120, right: -80 }} />
                <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -140, left: -100, animationDelay: "2s" }} />
                <div className="glow-orb glow-orb--violet" style={{ width: 300, height: 300, top: "40%", left: "45%", opacity: 0.18 }} />

                <div className="relative mx-auto grid min-h-[88vh] max-w-7xl grid-cols-1 items-center gap-12 px-5 py-24 lg:grid-cols-12 lg:px-8 lg:py-32">
                    <div className="lg:col-span-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 fade-in-up">
                            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Intelligence System · Live</span>
                        </div>

                        <h1 className="font-heading mt-6 text-balance text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-7xl fade-in-up" style={{ animationDelay: "80ms" }}>
                            Read the room.{" "}
                            <span className="text-cyan-400">Decide with intent.</span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg fade-in-up" style={{ animationDelay: "160ms" }}>
                            BodyIQ-AI is an intelligence platform that interprets human signals —
                            visual, auditory, and behavioral — and converts them into strategic
                            recommendations for high-stakes interactions.
                        </p>

                        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap fade-in-up" style={{ animationDelay: "240ms" }}>
                            <Link
                                to="/demo"
                                data-testid="hero-cta-demo"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.55)]"
                            >
                                Experience the Demo <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/preview"
                                data-testid="hero-cta-command-center"
                                className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                            >
                                View Command Center
                            </Link>
                            <Link
                                to="/demo/realtor"
                                data-testid="hero-cta-realtor-demo"
                                className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                            >
                                View Realtor Demo
                            </Link>
                            <Link
                                to="/training"
                                data-testid="hero-cta-training"
                                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition-all hover:border-cyan-500/50 hover:text-cyan-400"
                            >
                                View Training
                            </Link>
                        </div>

                        <div className="mt-14 grid grid-cols-3 gap-6 border-t border-white/5 pt-8 fade-in-up" style={{ animationDelay: "320ms" }}>
                            <div>
                                <p className="font-heading text-2xl font-semibold text-white">12+</p>
                                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Signal Channels</p>
                            </div>
                            <div>
                                <p className="font-heading text-2xl font-semibold text-white">&lt;800ms</p>
                                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Interpretation Latency</p>
                            </div>
                            <div>
                                <p className="font-heading text-2xl font-semibold text-white">Live</p>
                                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Training Cohorts</p>
                            </div>
                        </div>
                    </div>

                    {/* Right console panel */}
                    <div className="hidden lg:col-span-4 lg:block fade-in-up" style={{ animationDelay: "400ms" }}>
                        <div className="relative rounded-md border border-white/10 bg-ink-700/50 p-5 backdrop-blur-xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Signal Console</span>
                                <span className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400">
                                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> LIVE
                                </span>
                            </div>
                            <div className="mt-4 space-y-3">
                                {[
                                    { label: "Visual", v: 82, color: "bg-cyan-500" },
                                    { label: "Auditory", v: 64, color: "bg-cyan-500" },
                                    { label: "Behavioral", v: 91, color: "bg-cyan-500" },
                                    { label: "Context", v: 58, color: "bg-cyan-500" },
                                ].map((s) => (
                                    <div key={s.label}>
                                        <div className="flex justify-between">
                                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{s.label}</span>
                                            <span className="font-mono text-[11px] text-cyan-300">{s.v}%</span>
                                        </div>
                                        <div className="mt-1.5 h-1 w-full rounded-full bg-white/5">
                                            <div className={`h-1 rounded-full ${s.color}`} style={{ width: `${s.v}%`, boxShadow: "0 0 10px rgba(6,182,212,0.5)" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-3">
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Strategy</p>
                                <p className="mt-1.5 text-sm text-slate-200">Anchor on stated concern. Withhold concession. Wait 4s.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Signal Tape — live analysis strip */}
            <section className="relative" data-testid="signal-tape-section">
                <div className="mx-auto max-w-7xl px-5 pt-10 pb-2 lg:px-8">
                    <div className="flex items-center justify-between pb-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                            Live Signal Tape · Auto-Annotated Frames
                        </p>
                        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> Streaming
                        </span>
                    </div>
                </div>
                <SignalTape />
            </section>

            {/* Founder authority strip */}
            <FounderBio />

            {/* What it does */}
            <section className="relative py-24 lg:py-32" data-testid="what-it-does">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
                        <div className="lg:col-span-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">01 / The System</p>
                            <h2 className="font-heading mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                                A structured read of every interaction.
                            </h2>
                            <p className="mt-5 text-base leading-relaxed text-slate-400">
                                BodyIQ-AI fuses channels most humans process unconsciously into a single,
                                interpretable output. You keep full situational awareness — we give you the
                                scaffolding, the pattern, and the next move.
                            </p>

                            {/* Paired image with overlay */}
                            <div className="relative mt-10 overflow-hidden rounded-md border border-white/10">
                                <img
                                    src={MEETING_IMG}
                                    alt="Professional meeting"
                                    loading="lazy"
                                    className="h-72 w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4 rounded-sm border border-cyan-500/30 bg-ink-900/75 p-3 backdrop-blur">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Live Frame · B-07</p>
                                    <p className="mt-1 text-xs text-slate-200">Postural convergence detected · receptivity window opening</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-7">
                            <div className="grid grid-cols-1 gap-px rounded-md border border-white/5 bg-white/5 sm:grid-cols-2">
                                {capabilities.map((c) => (
                                    <div key={c.title} className="bg-ink-800 p-7 transition-colors hover:bg-ink-700/50">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5">
                                            <c.icon size={18} className="text-cyan-400" />
                                        </div>
                                        <h3 className="font-heading mt-5 text-lg font-semibold text-white">{c.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Scenario strip */}
            <section className="relative py-20" data-testid="scenario-strip">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="relative overflow-hidden rounded-md border border-white/10 bg-ink-700/30">
                        <img
                            src={CONVERSATION_IMG}
                            alt="Strategic conversation"
                            loading="lazy"
                            className="h-[420px] w-full object-cover opacity-70"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/70 to-transparent" />
                        <div className="absolute inset-y-0 left-0 flex w-full items-center px-8 lg:w-2/3 lg:px-14">
                            <div className="max-w-xl">
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Field Application</p>
                                <h3 className="font-heading mt-3 text-3xl font-semibold text-white sm:text-4xl">
                                    Every meeting leaves a signal trail.
                                </h3>
                                <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                                    Whether you're negotiating capital, resolving conflict, or reading an
                                    interview room — the signals are already there. BodyIQ-AI gives you the
                                    framework to read them consistently.
                                </p>
                            </div>
                        </div>
                        {/* Decorative waveform */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 waveform opacity-60" />
                    </div>
                </div>
            </section>

            {/* Training teaser */}
            <section className="relative overflow-hidden py-24 lg:py-32" data-testid="training-teaser">
                <div className="absolute inset-0 opacity-25">
                    <img src={TRAINING_BG} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-ink-800 via-ink-800/70 to-ink-800" />

                <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 lg:grid-cols-12 lg:px-8">
                    <div className="lg:col-span-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">02 / Training</p>
                        <h2 className="font-heading mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                            Live cohorts. Operational depth.
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-slate-400">
                            Two tiers engineered for practitioners who need to read signals in live
                            conditions — from boardrooms to negotiations to field work.
                        </p>
                        <Link
                            to="/training"
                            data-testid="training-teaser-cta"
                            className="mt-8 inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                        >
                            View programs <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="grid gap-5 lg:col-span-7 lg:grid-cols-2">
                        {[
                            { name: "Signal Foundations", price: "$400", duration: "2-hour live session", tag: "Tier I" },
                            { name: "Applied Signals", price: "$1,500", duration: "2–3 hour live session", tag: "Tier II" },
                        ].map((t) => (
                            <div key={t.name} className="group relative flex flex-col rounded-md border border-white/10 bg-ink-700/40 p-7 backdrop-blur-sm transition-all hover:border-cyan-500/40">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{t.tag}</span>
                                <h3 className="font-heading mt-3 text-2xl font-semibold text-white">{t.name}</h3>
                                <p className="mt-2 text-sm text-slate-400">{t.duration}</p>
                                <p className="font-heading mt-6 text-4xl font-semibold text-white">{t.price}</p>
                                <Link
                                    to="/training"
                                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 transition-all group-hover:gap-2.5"
                                >
                                    Reserve spot <ArrowRight size={14} />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Email capture */}
            <section className="py-24 lg:py-32" data-testid="newsletter-section">
                <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">03 / Signal Intake</p>
                    <h2 className="font-heading mt-4 text-3xl font-semibold text-white sm:text-4xl">
                        Be the first to read the next edition.
                    </h2>
                    <p className="mt-4 text-base text-slate-400">
                        Occasional field notes, cohort drops, and case studies. Zero noise.
                    </p>
                    <div className="mx-auto mt-8 max-w-md">
                        <EmailCapture source="newsletter" ctaLabel="Join" testid="home-newsletter" />
                    </div>
                </div>
            </section>
        </Layout>
    );
}
