import React, { useState, useMemo } from "react";
import { Layout } from "@/components/site/Layout";
import { EmailCapture } from "@/components/site/EmailCapture";
import { useParams, useNavigate } from "react-router-dom";
import {
    Play, Pause, ChevronRight, ChevronLeft, Eye, Ear, Activity,
    Brain, Target, Sparkles, Lock
} from "lucide-react";

const SCENE_IMAGE = "https://images.unsplash.com/photo-1758518730083-4c12527b6742?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxidXNpbmVzcyUyMG1lZXRpbmclMjBuZWdvdGlhdGlvbnxlbnwwfHx8fDE3NzcwNTkwNDd8MA&ixlib=rb-4.1.0&q=85";
const SCENE_TRAINING = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=75";

// Scenario scripts — variant lets us swap via /demo/training
const scenarios = {
    default: {
        title: "Scenario · High-Stakes Negotiation",
        subtitle: "Two-person exchange · capital raise · 4m 12s",
        steps: [
            {
                t: "Baseline Established",
                narr: "Subject enters composed. Breathing cadence regular. Vocabulary anchored in shared terminology. We set a baseline before any deviation can be meaningful.",
                signals: { visual: 42, auditory: 38, behavioral: 35, context: 60 },
                patterns: ["Neutral arousal", "Open posture", "Baseline cadence"],
                strategy: "Hold. Mirror cadence. Ask the opening framing question.",
                focus: "Baseline",
            },
            {
                t: "Micro-deviation Detected",
                narr: "Left-side shoulder tension increases on the word 'timeline'. Gaze down-and-left. A 340ms pause precedes their response. Interpretation: internal discomfort with schedule assumptions.",
                signals: { visual: 71, auditory: 66, behavioral: 58, context: 68 },
                patterns: ["Asymmetric tension", "Aversion gaze", "Response lag"],
                strategy: "Anchor on stated concern. Do not offer concession. Wait 4s.",
                focus: "Timeline",
            },
            {
                t: "Pattern Lock",
                narr: "Three consecutive deflections on the same topic. Pitch raised 8%. Hand returns to face. Pattern consistent with commitment hesitation — not rejection. Window is open.",
                signals: { visual: 84, auditory: 79, behavioral: 81, context: 74 },
                patterns: ["Deflection cluster", "Pitch elevation", "Face contact"],
                strategy: "Re-anchor on value, not price. Offer narrow scope reduction.",
                focus: "Commitment",
            },
            {
                t: "Leverage Window",
                narr: "Forward lean. Breathing synchronizes with yours. Verbal cues shift from 'but' to 'and'. This is a 12–18 second high-receptivity window.",
                signals: { visual: 90, auditory: 85, behavioral: 92, context: 81 },
                patterns: ["Postural convergence", "Language pivot", "Receptivity spike"],
                strategy: "Introduce the terminal ask. Short sentence. No qualifier.",
                focus: "Close",
            },
            {
                t: "Outcome",
                narr: "Verbal commitment registered with matching behavioral alignment. Signal congruence above threshold. Outcome classified as stable agreement.",
                signals: { visual: 88, auditory: 82, behavioral: 90, context: 86 },
                patterns: ["Congruence", "Stable baseline", "Micro-nod sequence"],
                strategy: "Confirm terms verbally. End with silent hold for 3s.",
                focus: "Lock",
            },
        ],
    },
    training: {
        title: "Scenario · Field Training Exercise",
        subtitle: "Coaching walkthrough · supervised live read · 3m 40s",
        steps: [
            {
                t: "Exercise Briefing",
                narr: "Instructor sets baseline conditions. Trainee begins read-in. First objective: identify three verifiable baseline markers within 20 seconds.",
                signals: { visual: 35, auditory: 40, behavioral: 30, context: 55 },
                patterns: ["Calibration", "Observation start", "Marker search"],
                strategy: "Stay silent. Log markers. Do not interpret yet.",
                focus: "Observe",
            },
            {
                t: "Marker Identification",
                narr: "Trainee logs shoulder set, vocal cadence range, and gaze vector. Supervisor confirms two out of three. Reinforce on gaze specificity.",
                signals: { visual: 62, auditory: 55, behavioral: 48, context: 60 },
                patterns: ["Shoulder set", "Cadence range", "Gaze vector"],
                strategy: "Refine gaze vector logging. Capture angle, not direction.",
                focus: "Markers",
            },
            {
                t: "Live Deviation Drill",
                narr: "Controlled stimulus introduced. Trainee must name the channel, the direction, and the magnitude of the first deviation within 5 seconds.",
                signals: { visual: 75, auditory: 68, behavioral: 72, context: 70 },
                patterns: ["Channel ID", "Direction read", "Magnitude call"],
                strategy: "Commit to one channel first. Then cross-validate.",
                focus: "Deviation",
            },
            {
                t: "Strategy Formation",
                narr: "Trainee converts reads into a single-sentence strategic recommendation. Evaluation: is the move actionable, reversible, and low-risk?",
                signals: { visual: 80, auditory: 76, behavioral: 78, context: 79 },
                patterns: ["Actionability", "Reversibility", "Risk profile"],
                strategy: "Write the move in under 10 words. Any more is drift.",
                focus: "Output",
            },
            {
                t: "Debrief",
                narr: "Review recorded reads. Highlight one correct call, one missed signal, and one overclaim. This structure drives next-session improvement.",
                signals: { visual: 70, auditory: 70, behavioral: 70, context: 82 },
                patterns: ["Correct call", "Miss", "Overclaim"],
                strategy: "Keep debrief to 4 minutes. Longer dilutes learning.",
                focus: "Debrief",
            },
        ],
    },
};

const channelMeta = [
    { key: "visual", label: "Visual", icon: Eye },
    { key: "auditory", label: "Auditory", icon: Ear },
    { key: "behavioral", label: "Behavioral", icon: Activity },
    { key: "context", label: "Context", icon: Brain },
];

export default function DemoPage() {
    const { variant } = useParams();
    const scenario = useMemo(() => scenarios[variant === "training" ? "training" : "default"], [variant]);
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(false);
    const navigate = useNavigate();

    const current = scenario.steps[step];

    // Auto-advance when playing
    React.useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => {
            setStep((s) => {
                if (s >= scenario.steps.length - 1) {
                    setPlaying(false);
                    return s;
                }
                return s + 1;
            });
        }, 4500);
        return () => clearInterval(id);
    }, [playing, scenario.steps.length]);

    return (
        <Layout hideFooter>
            <section className="relative mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8" data-testid="demo-page">
                {/* Ambient background layer */}
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-60" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 480, height: 480, top: -160, left: -140 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -180, right: -100, animationDelay: "3s" }} />
                </div>
                {/* Header bar */}
                <div className="flex flex-col gap-3 border-b border-white/5 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">BodyIQ-AI · Demo Console</p>
                        <h1 className="font-heading mt-2 text-2xl font-semibold text-white sm:text-3xl">{scenario.title}</h1>
                        <p className="mt-1 text-sm text-slate-400">{scenario.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            data-testid="demo-variant-default"
                            onClick={() => { navigate("/demo"); setStep(0); }}
                            className={`rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${!variant ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-slate-400 hover:text-white"}`}
                        >Negotiation</button>
                        <button
                            data-testid="demo-variant-training"
                            onClick={() => { navigate("/demo/training"); setStep(0); }}
                            className={`rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${variant === "training" ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-slate-400 hover:text-white"}`}
                        >Training</button>
                    </div>
                </div>

                {/* Grid */}
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* Main scene */}
                    <div className="lg:col-span-8" data-testid="demo-scene">
                        <div className="relative overflow-hidden rounded-md border border-white/10 bg-ink-700/30 scanlines">
                            <div className="relative aspect-[16/9]">
                                <img src={variant === "training" ? SCENE_TRAINING : SCENE_IMAGE} alt="scenario" className="h-full w-full object-cover opacity-80" />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/20 to-transparent" />

                                {/* HUD corners */}
                                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-sm border border-cyan-500/40 bg-ink-900/70 px-2.5 py-1 backdrop-blur">
                                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Analyzing</span>
                                </div>
                                <div className="absolute right-3 top-3 rounded-sm border border-white/15 bg-ink-900/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 backdrop-blur">
                                    Frame {String(step + 1).padStart(2, "0")} / {String(scenario.steps.length).padStart(2, "0")}
                                </div>

                                {/* Focus overlay */}
                                <div key={step} className="absolute bottom-4 left-4 right-4 fade-in-up">
                                    <div className="rounded-sm border border-cyan-500/30 bg-ink-900/80 p-4 backdrop-blur">
                                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Focus</p>
                                        <p className="font-heading mt-1 text-lg font-semibold text-white">{current.focus}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Transport */}
                            <div className="flex items-center justify-between border-t border-white/5 bg-ink-800 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        data-testid="demo-prev"
                                        disabled={step === 0}
                                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                                        className="rounded-sm border border-white/10 p-2 text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-40"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        data-testid="demo-play-toggle"
                                        onClick={() => setPlaying((p) => !p)}
                                        className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-2 text-cyan-300 transition-colors hover:bg-cyan-500/20"
                                    >
                                        {playing ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                    <button
                                        data-testid="demo-next"
                                        disabled={step === scenario.steps.length - 1}
                                        onClick={() => setStep((s) => Math.min(scenario.steps.length - 1, s + 1))}
                                        className="rounded-sm border border-white/10 p-2 text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-40"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="h-1 w-full rounded-full bg-white/5">
                                        <div
                                            className="h-1 rounded-full bg-cyan-500 transition-all duration-500"
                                            style={{ width: `${((step + 1) / scenario.steps.length) * 100}%`, boxShadow: "0 0 10px rgba(6,182,212,0.6)" }}
                                        />
                                    </div>
                                </div>
                                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                    {current.t}
                                </span>
                            </div>
                        </div>

                        {/* Narration panel */}
                        <div className="mt-4 rounded-md border border-white/10 bg-ink-700/40 p-5" data-testid="demo-narration">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                <Sparkles size={14} className="text-cyan-400" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Guided Narration</span>
                            </div>
                            <p key={step} className="fade-in-up mt-4 text-base leading-relaxed text-slate-200">
                                {current.narr}
                            </p>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-4 lg:col-span-4">
                        {/* Signals */}
                        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5" data-testid="demo-signals">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Signal Interpretation</span>
                                <Lock size={12} className="text-slate-500" />
                            </div>
                            <div className="mt-4 space-y-4">
                                {channelMeta.map((c) => {
                                    const v = current.signals[c.key];
                                    return (
                                        <div key={c.key}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <c.icon size={13} className="text-cyan-400" />
                                                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">{c.label}</span>
                                                </div>
                                                <span className="font-mono text-[11px] text-cyan-300">{v}%</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5">
                                                <div
                                                    className="h-1.5 rounded-full bg-cyan-500 transition-all duration-700 ease-out"
                                                    style={{ width: `${v}%`, boxShadow: "0 0 10px rgba(6,182,212,0.5)" }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                * Proprietary definitions abstracted. Output only.
                            </p>
                        </div>

                        {/* Patterns */}
                        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5" data-testid="demo-patterns">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Pattern Recognition</span>
                            <div key={step} className="fade-in-up mt-4 flex flex-wrap gap-2">
                                {current.patterns.map((p) => (
                                    <span
                                        key={p}
                                        className="rounded-sm border border-white/10 bg-ink-800 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300"
                                    >
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Strategy */}
                        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5" data-testid="demo-strategy">
                            <div className="flex items-center gap-2">
                                <Target size={14} className="text-cyan-400" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Strategy Recommendation</span>
                            </div>
                            <p key={step} className="fade-in-up font-heading mt-3 text-xl font-semibold leading-snug text-white">
                                {current.strategy}
                            </p>
                        </div>

                        {/* Email capture */}
                        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5" data-testid="demo-email-capture">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Full Demo Access</p>
                            <p className="mt-2 text-sm text-slate-300">
                                Drop your email. We'll send extended scenarios and cohort briefings.
                            </p>
                            <div className="mt-3">
                                <EmailCapture
                                    source={variant === "training" ? "demo_training" : "demo"}
                                    ctaLabel="Send"
                                    variant="stacked"
                                    testid="demo-lead"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step timeline */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5" data-testid="demo-timeline">
                    {scenario.steps.map((s, i) => (
                        <button
                            key={s.t}
                            data-testid={`demo-step-${i}`}
                            onClick={() => setStep(i)}
                            className={`rounded-sm border p-3 text-left transition-all ${
                                i === step
                                    ? "border-cyan-500/50 bg-cyan-500/10"
                                    : "border-white/10 bg-ink-700/30 hover:border-white/20"
                            }`}
                        >
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">0{i + 1}</p>
                            <p className="mt-1 text-xs font-medium text-white">{s.t}</p>
                        </button>
                    ))}
                </div>
            </section>
        </Layout>
    );
}
