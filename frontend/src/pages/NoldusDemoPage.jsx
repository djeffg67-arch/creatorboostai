import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { shareDemo } from "@/lib/api";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { useRefMirror, hardSilence, useDemoCleanup } from "@/lib/demoAudioFix";
import { toast } from "sonner";
import { SCENE_IMG_NOLDUS } from "@/lib/images";
import {
    Play, Pause, Volume2, VolumeX, Check, ArrowRight, Sparkles, Mic,
    Eye, Activity, Brain, Zap, Globe2, Send, Copy, QrCode, Cpu, Target,
    Mail, Shield, AlertTriangle, CheckCircle2, X, BarChart3, Layers,
} from "lucide-react";

// =================================================================
// 14 scenes · ~10 min auto-played · Noldus / Enterprise / Investor cut
// SRS (Signal Response State) · CPS (Cognitive Processing State) ·
// EOS (Evaluation Outcome State) — structured signal language only.
// No adjectives. No subjective labels. Cluster ID + Action Units +
// Intensity + Classification (positive / negative / mixed).
// =================================================================
const SCENES = [
    {
        id: "facereader",
        section: "Scene 1 · The Measurement Floor",
        title: "Measurement at the highest level.",
        focus: "facereader",
        fallback_ms: 45000,
        narration:
            "What you are seeing is one of the most advanced behavioral measurement systems in the world. " +
            "It captures human physiology with frame-level precision. Action Units. Gaze vectors. " +
            "Micro-expressions. Head pose. Lip and brow articulation. Thirty frames per second of " +
            "continuous anatomical data. This is measurement at the highest level — and it is the " +
            "foundation of everything that follows.",
    },
    {
        id: "subjectivity-problem",
        section: "Scene 2 · The Subjectivity Problem",
        title: "Measurement is rigorous. Interpretation has been improvisational.",
        focus: "subjectivity-problem",
        fallback_ms: 40000,
        narration:
            "For decades, behavioral systems have ended at description. A reviewer says the buyer looked " +
            "confused. Another says the candidate seemed nervous. A third says the witness appeared " +
            "evasive. These are adjectives. They are subjective. They cannot be standardized, audited, " +
            "or deployed across an enterprise. Measurement is rigorous. Interpretation has been " +
            "improvisational. That gap is what BodyIQ-AI was built to close.",
    },
    {
        id: "framework-intro",
        section: "Scene 3 · The SRS · CPS · EOS Framework",
        title: "Three structured states. One anatomical signal stack.",
        focus: "framework-intro",
        fallback_ms: 50000,
        narration:
            "BodyIQ-AI introduces three structured signal states. SRS — the Signal Response State — " +
            "captures the body's first measurable reaction to stimulus. CPS — the Cognitive Processing " +
            "State — captures the structured response of the brain working through the input. EOS — the " +
            "Evaluation Outcome State — captures the body's final evaluative resolution. Together, SRS, " +
            "CPS, and EOS form the complete anatomical signal stack. Every output the system produces " +
            "is a Signal Cluster — identified by ID, anchored to specific Action Units, scored by " +
            "intensity, and classified as positive, negative, or mixed. No adjectives. No interpretation. " +
            "Only structured measurement.",
    },
    {
        id: "comparison",
        section: "Scene 4 · Subjective vs Structured",
        title: "Same human. Same frame. Opinion versus anatomical evidence.",
        focus: "comparison",
        fallback_ms: 50000,
        narration:
            "Look at the difference. On the left, the legacy approach. Quote: the buyer seemed unsure. " +
            "Quote: the candidate appeared defensive. Quote: the witness looked uncomfortable. On the " +
            "right, the BodyIQ-AI output for the same moment. Cluster ID SRS dash one one four two. " +
            "Action Units four and seven. Intensity zero point six two. Classification negative. Same " +
            "human. Same frame. One is opinion. The other is anatomical evidence. Enterprises can " +
            "audit the second. Enterprises can deploy the second. Enterprises can scale the second. " +
            "This is the shift from subjective description to structured signal.",
    },
    {
        id: "srs-detect",
        section: "Scene 5 · Live SRS Detection",
        title: "Cluster SRS-1142 · AU 4 · AU 7 · Lip Pressor · Intensity 0.62 · Classification: negative.",
        focus: "srs-detect",
        fallback_ms: 45000,
        narration:
            "The system enters live operation. The first cluster fires. S R S dash one one four two. " +
            "Action Unit four. Action Unit seven. Lip pressor active. Intensity zero point six two. " +
            "Classification negative. This is the body's initial reaction — measurable, time-stamped, " +
            "and objective. No interpretation has occurred yet. The system has simply recorded what " +
            "the anatomy is doing.",
    },
    {
        id: "cps-detect",
        section: "Scene 6 · CPS Cluster",
        title: "Cluster CPS-2073 · AU 1 · AU 2 · Gaze Drift · Intensity 0.71 · Classification: mixed.",
        focus: "cps-detect",
        fallback_ms: 40000,
        narration:
            "A second cluster fires. C P S dash two zero seven three. Inner brow raiser. Outer brow " +
            "raiser. Gaze drift. Intensity zero point seven one. Classification mixed. The brain is " +
            "processing — working through the input rather than responding to it. The system tags " +
            "this state and continues.",
    },
    {
        id: "eos-detect",
        section: "Scene 7 · EOS Cluster",
        title: "Cluster EOS-3408 · AU 15 · AU 17 · Head Tilt · Intensity 0.58 · Classification: negative.",
        focus: "eos-detect",
        fallback_ms: 42000,
        narration:
            "The third cluster resolves. E O S dash three four zero eight. Lip corner depressor. Chin " +
            "raiser. Sustained head tilt. Intensity zero point five eight. Classification negative. " +
            "The body has reached its evaluative outcome. SRS, CPS, and EOS together form a complete " +
            "read of this moment — three structured states, anchored to anatomy, scored by intensity, " +
            "free of subjective language.",
    },
    {
        id: "decision-panel",
        section: "Scene 8 · Decision Engine",
        title: "Signal stack converted into a structured, auditable decision.",
        focus: "decision-panel",
        fallback_ms: 40000,
        narration:
            "BodyIQ-AI converts the signal stack into a structured decision. Recommended action: do " +
            "not proceed to close. Provide clarification. Reduce complexity. The decision is anchored " +
            "to the underlying clusters. Every recommendation is fully traceable, fully auditable, and " +
            "fully reproducible. There is no opinion in the chain. Only signal, cluster, intensity, " +
            "and classification.",
    },
    {
        id: "creatorboost-arrives",
        section: "Scene 9 · CreatorBoostAI · Execution Layer",
        title: "The intelligence layer defines. The execution layer acts.",
        focus: "creatorboost-arrives",
        fallback_ms: 40000,
        narration:
            "Now the execution layer opens. CreatorBoostAI is the live command center where structured " +
            "intelligence becomes operational reality. Pipelines, deals, communications, and follow-ups " +
            "— all linked to the BodyIQ signal stack in real time. The intelligence layer defines. " +
            "The execution layer acts.",
    },
    {
        id: "deal-at-risk",
        section: "Scene 10 · Deal at Risk · Autonomous Action",
        title: "Cluster SRS-1142 linked to live deal · System executes autonomously.",
        focus: "deal-at-risk",
        fallback_ms: 50000,
        narration:
            "An active deal is in the pipeline. Acme Corp. One hundred eighty-four thousand dollars " +
            "annual contract value. The system links cluster S R S dash one one four two directly to " +
            "this deal. Status: at risk. Suggested actions appear instantly. Send clarification email. " +
            "Reduce pricing complexity. Trigger follow-up call within twenty-four hours. The mode " +
            "toggles to autonomous. The system executes immediately. Email sent. Task assigned. CRM " +
            "updated. Audit trail logged. This is the moment intelligence becomes execution.",
    },
    {
        id: "global-dashboard",
        section: "Scene 11 · Global Behavioral Intelligence",
        title: "Behavioral intelligence becomes a measurable enterprise KPI.",
        focus: "global-dashboard",
        fallback_ms: 45000,
        narration:
            "The view expands to the global dashboard. United States. Europe. Asia. Each region with " +
            "live performance metrics. One thousand two hundred forty-eight active behavioral sessions. " +
            "Eighteen thousand four hundred forty-two structured signal clusters. Twelve point four " +
            "million dollars in revenue influenced by the signal stack this quarter. Behavioral " +
            "intelligence becomes a measurable enterprise KPI.",
    },
    {
        id: "rep-grid",
        section: "Scene 12 · Team Intelligence Scoring",
        title: "Signal Accuracy · Response Efficiency · Outcome Impact.",
        focus: "rep-grid",
        fallback_ms: 40000,
        narration:
            "Zoom into the team layer. Each operator scored on three dimensions. Signal Accuracy — " +
            "how well they read the anatomical data. Response Efficiency — how quickly they act on " +
            "the structured output. Outcome Impact — the revenue effect of their decisions. " +
            "Organizations now measure how their teams respond to human signals — not just what " +
            "they say.",
    },
    {
        id: "training-mode",
        section: "Scene 13 · Training Replay System",
        title: "Every cluster, every frame, fully replayable and coachable.",
        focus: "training-mode",
        fallback_ms: 40000,
        narration:
            "Training replay engages. A recorded interaction plays back, with S R S, C P S, and E O S " +
            "clusters overlaid frame-by-frame. Operators see exactly which signals fired, when, and " +
            "how they responded. Every interaction becomes measurable, coachable, and standardized " +
            "across the organization. This is enterprise-grade behavioral training.",
    },
    {
        id: "accuracy-closing",
        section: "Scene 14 · Accuracy + Closing",
        title: "Up to 96% non-subjective classification · Up to 98% signal-level accuracy.",
        focus: "accuracy-closing",
        fallback_ms: 52000,
        narration:
            "Two numbers define this system. Up to ninety-six percent non-subjective classification — " +
            "meaning ninety-six out of every one hundred outputs are structured signals, not adjectives. " +
            "Up to ninety-eight percent signal-level accuracy — meaning the underlying Action Unit " +
            "detection is as precise as the world's leading behavioral measurement systems. Human " +
            "communication is largely driven by nonverbal signals. This system operates directly on " +
            "that layer — anatomical, measurement-based, and objective. Noldus measures. BodyIQ-AI " +
            "defines. CreatorBoostAI executes. Together, this is the first complete Human Intelligence " +
            "Execution System.",
    },
];

const SCENE_GAP_MS = 600;

// =================================================================
// PAGE
// =================================================================
export default function NoldusDemoPage() {
    const [started, setStarted] = useState(false);
    const [scene, setScene] = useState(0);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [audioCache, setAudioCache] = useState({});
    const [prefetching, setPrefetching] = useState(false);
    const [prefetchProgress, setPrefetchProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [sceneElapsed, setSceneElapsed] = useState(0);

    const audioRef = useRef(null);
    const advanceTimer = useRef(null);
    const maxTimer = useRef(null);
    const tickTimer = useRef(null);
    const sceneStart = useRef(0);
    const pausedRef = useRefMirror(paused);
    const mutedRef = useRefMirror(muted);
    const audioCacheRef = useRefMirror(audioCache);
    useDemoCleanup(audioRef, audioCacheRef);

    const current = SCENES[scene];
    const total = SCENES.length;

    const totalRuntimeMs = useMemo(
        () => SCENES.reduce((a, s) => a + (s.fallback_ms || 40000), 0),
        []
    );
    const elapsedBeforeScene = useMemo(
        () => SCENES.slice(0, scene).reduce((a, s) => a + (s.fallback_ms || 40000), 0),
        [scene]
    );
    const overallProgress = Math.min(
        100,
        Math.round(((elapsedBeforeScene + sceneElapsed) / totalRuntimeMs) * 100)
    );

    const apiBase = useMemo(
        () => `${process.env.REACT_APP_BACKEND_URL || ""}/api`,
        []
    );

    // Demo-delivery tracking (founder dashboard, half-view notifications)
    const { personalization, trackEvent } = useDemoTracking({
        demoType: "noldus",
        started, scene, totalScenes: total,
        watchSeconds: Math.round((elapsedBeforeScene + sceneElapsed) / 1000),
        overallProgress, done,
    });

    const prefetchAll = useCallback(async () => {
        setPrefetching(true);
        setPrefetchProgress(0);
        const cache = {};
        let donec = 0;
        const fetchOne = async (s) => {
            try {
                const res = await fetch(`${apiBase}/tts/speak`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: s.narration, voice: "sage" }),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    cache[s.id] = URL.createObjectURL(blob);
                }
            } catch { /* fallback to speechSynthesis */ }
            donec += 1;
            setPrefetchProgress(Math.round((donec / SCENES.length) * 100));
        };
        const CONCURRENCY = 5;
        for (let i = 0; i < SCENES.length; i += CONCURRENCY) {
            await Promise.all(SCENES.slice(i, i + CONCURRENCY).map(fetchOne));
        }
        setAudioCache(cache);
        setPrefetching(false);
        return cache;
    }, [apiBase]);

    const clearAllTimers = () => {
        clearTimeout(advanceTimer.current);
        clearTimeout(maxTimer.current);
        clearInterval(tickTimer.current);
    };

    const goToNext = useCallback(() => {
        clearAllTimers();
        setScene((p) => {
            if (p >= total - 1) { setDone(true); return p; }
            return p + 1;
        });
    }, [total]);

    const speakScene = useCallback((idx, cache = audioCache) => {
        clearAllTimers();
        if (audioRef.current) { hardSilence(audioRef); }
        const sc = SCENES[idx]; if (!sc) return;
        sceneStart.current = Date.now();
        setSceneElapsed(0);
        tickTimer.current = setInterval(() => {
            setSceneElapsed(Date.now() - sceneStart.current);
        }, 250);
        const maxMs = sc.fallback_ms || 40000;
        maxTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs + 1500);

        if (muted) {
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs);
            return;
        }
        const url = cache[sc.id];
        if (url && audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.muted = false;
            audioRef.current.play().then(() => setSpeaking(true)).catch(() => setSpeaking(false));
        } else if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(sc.narration);
            u.rate = 0.97;
            const voices = window.speechSynthesis.getVoices();
            const female = voices.find((v) => /samantha|victoria|ava|allison|en-us.*female/i.test(v.name + " " + v.lang))
                || voices.find((v) => v.lang === "en-US")
                || voices.find((v) => v.lang?.startsWith("en"));
            if (female) u.voice = female;
            u.onstart = () => setSpeaking(true);
            u.onend = () => {
                setSpeaking(false);
                if (pausedRef.current) return;
                advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
            };
            window.speechSynthesis.speak(u);
        } else {
            advanceTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs);
        }
    }, [audioCache, muted, paused, goToNext]);

    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        const onEnded = () => {
            setSpeaking(false);
            if (pausedRef.current) return;
            advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
        };
        const onPlay = () => setSpeaking(true);
        const onPause = () => setSpeaking(false);
        const onError = () => {
            setSpeaking(false);
            if (pausedRef.current) return;
            advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
        };
        a.addEventListener("ended", onEnded);
        a.addEventListener("play", onPlay);
        a.addEventListener("pause", onPause);
        a.addEventListener("error", onError);
        return () => {
            a.removeEventListener("ended", onEnded);
            a.removeEventListener("play", onPlay);
            a.removeEventListener("pause", onPause);
            a.removeEventListener("error", onError);
        };
    }, [paused, goToNext]);

    useEffect(() => {
        if (!started) return;
        speakScene(scene);
        return () => clearAllTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started]);

    // (page-hide / before-unload / visibility / unmount cleanup is handled by useDemoCleanup hook above)

    const handleStart = async () => {
        const cache = await prefetchAll();
        setStarted(true);
        setScene(0); setDone(false); setPaused(false);
        setTimeout(() => speakScene(0, cache), 200);
    };
    const handlePauseResume = () => {
        if (paused) {
            setPaused(false);
            if (audioRef.current?.src) audioRef.current.play().catch(() => {});
            const remaining = Math.max(2000, (current.fallback_ms || 40000) + 1500 - sceneElapsed);
            sceneStart.current = Date.now() - sceneElapsed;
            tickTimer.current = setInterval(() => {
                setSceneElapsed(Date.now() - sceneStart.current);
            }, 250);
            maxTimer.current = setTimeout(() => goToNext(), remaining);
        } else {
            setPaused(true);
            clearAllTimers();
            hardSilence(audioRef);
        }
    };
    const handleRestart = () => {
        clearAllTimers();
        hardSilence(audioRef);
        setScene(0); setDone(false); setPaused(false);
        setTimeout(() => speakScene(0), 150);
    };
    const handleMute = () => {
        setMuted((p) => {
            const n = !p;
            if (n) hardSilence(audioRef);
            else setTimeout(() => speakScene(scene), 100);
            return n;
        });
    };

    return (
        <Layout hideFooter>
            <audio ref={audioRef} className="hidden" preload="auto" playsInline />

            {started && (
                <>
                    <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 bg-white/5" data-testid="noldus-global-timeline">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 transition-[width] duration-300"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                    <div className="pointer-events-none fixed left-1/2 top-1.5 z-[60] -translate-x-1/2 rounded-full border border-cyan-500/30 bg-ink-900/85 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-md">
                        {scene + 1}/{total} · {current.section} · {overallProgress}%
                    </div>
                </>
            )}

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="noldus-demo-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <img
                        src={started ? (NOLDUS_BG_MAP[current.focus] || SCENE_IMG_NOLDUS.hero) : SCENE_IMG_NOLDUS.hero}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-700"
                        loading="eager"
                        data-testid="noldus-scene-bg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/85 to-ink-900" />
                    <div className="absolute inset-0 ambient-grid opacity-50" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 480, height: 480, top: -160, left: -120 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -180, right: -100 }} />
                </div>

                <Hero personalization={personalization} />

                {!started ? (
                    <StartScreen onStart={handleStart} prefetching={prefetching} progress={prefetchProgress} personalization={personalization} />
                ) : (
                    <div className="mt-6">
                        <SceneHeader
                            scene={scene} current={current} total={total}
                            paused={paused} speaking={speaking} muted={muted}
                            onPauseResume={handlePauseResume} onMute={handleMute}
                        />

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <SceneStage scene={current} />
                            </div>
                            <div className="space-y-4 lg:col-span-4">
                                <NarrationPanel
                                    narration={current.narration}
                                    speaking={speaking} muted={muted} paused={paused}
                                    onMute={handleMute}
                                />
                                <SceneIndex current={scene} total={total} />
                            </div>
                        </div>

                        {(current.focus === "accuracy-closing" || current.focus === "closing" || done) && (
                            <div className="mt-6"><ShareModule onReplay={handleRestart} trackEvent={trackEvent} /></div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

// =================================================================
// HERO + START
// =================================================================
const Hero = ({ personalization }) => (
    <section className="relative" data-testid="noldus-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Enterprise · Noldus / Investor Cut</span>
        </div>
        {personalization?.greeting && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="noldus-personalized-greeting">
                {personalization.greeting}
            </p>
        )}
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Noldus measures behavior.{" "}
            <span className="text-cyan-400">BodyIQ-AI defines it. CreatorBoostAI executes on it.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            A 10-minute walkthrough of the first complete Human Intelligence Execution System — the layer
            that converts FaceReader-grade behavioral measurement into structured signal clusters
            (SRS · CPS · EOS), real-time enterprise decisions, and automated execution. Anatomical.
            Measurement-based. Objective.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching, progress, personalization }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console</p>
                {personalization?.greeting && (
                    <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200" data-testid="noldus-start-personalized">
                        {personalization.greeting}
                    </p>
                )}
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the 14-scene Noldus walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 14-scene cinematic walkthrough — narrated by Sage (female · American) —
                    designed for Noldus, enterprise partners, and investor conversations. Built around the
                    SRS · CPS · EOS structured signal framework. No clicks. No demos that stall.
                    Approximately 9 to 10 minutes.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                        onClick={onStart}
                        disabled={prefetching}
                        data-testid="start-noldus-demo-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-7 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] disabled:opacity-60"
                    >
                        {prefetching ? (
                            <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900/30 border-t-ink-900" />
                                Loading audio… {progress}%
                            </>
                        ) : (
                            <><Play size={16} fill="currentColor" /> Start Demo</>
                        )}
                    </button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Auto-plays · ~10 min · Voice: Sage
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "14 cinematic scenes",
                        "SRS · CPS · EOS structured framework",
                        "BodyIQ-AI · Intelligence Layer",
                        "CreatorBoostAI · Execution Layer",
                    ].map((b) => (
                        <li key={b} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <Check size={13} className="text-cyan-400" /> {b}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="lg:col-span-5">
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">The story arc</p>
                    <ol className="mt-4 space-y-2 text-sm">
                        {[
                            "Measurement at the highest level (Noldus / FaceReader)",
                            "The subjectivity problem — why adjectives don't scale",
                            "SRS · CPS · EOS — the structured signal framework",
                            "Subjective vs Structured — side-by-side comparison",
                            "Live SRS cluster · AU 4 + AU 7 · negative",
                            "Live CPS cluster · AU 1 + AU 2 · mixed",
                            "Live EOS cluster · AU 15 + AU 17 · negative",
                            "Decision engine · structured & auditable",
                            "CreatorBoostAI command center opens",
                            "Deal at risk → autonomous execution",
                            "Global behavioral KPI dashboard",
                            "Team intelligence scoring · training replay",
                            "Up to 96% non-subjective · 98% signal-level accuracy",
                        ].map((b, i) => (
                            <li key={b} className="flex items-start gap-2 text-slate-300">
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5 font-mono text-[9px] text-cyan-300">{i + 1}</span>
                                <span>{b}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    </div>
);

// =================================================================
// SCENE HEADER + NARRATION + INDEX (shared chrome)
// =================================================================
const SceneHeader = ({ scene, current, total, paused, speaking, muted, onPauseResume, onMute }) => (
    <div className="sticky top-[72px] z-20 mt-2 flex flex-col gap-3 rounded-md border border-white/10 bg-ink-900/85 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400" data-testid="noldus-scene-indicator">
                    Scene {scene + 1} of {total}
                </span>
                <span className="rounded-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">{current.section}</span>
                {speaking && !muted && <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> NARRATING</span>}
                {paused && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PAUSED</span>}
            </div>
            <h2 className="font-heading mt-1 truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{current.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={onPauseResume} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} primary testid="noldus-control-pause" />
            <Btn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Voice On" : "Voice Off"} testid="noldus-control-mute" />
        </div>
    </div>
);
const Btn = ({ onClick, icon: Icon, label, primary, testid }) => (
    <button onClick={onClick} data-testid={testid}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${primary ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900" : "border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"}`}>
        <Icon size={12} /> <span>{label}</span>
    </button>
);

const NarrationPanel = ({ narration, speaking, muted, paused, onMute }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Mic size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Narration · Sage</span>
            </div>
            <button onClick={onMute} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 hover:text-cyan-300">
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />} <span>{muted ? "Off" : "On"}</span>
            </button>
        </div>
        <div className="mt-3 max-h-[26rem] overflow-y-auto pr-1">
            <p className={`text-sm leading-relaxed text-slate-200 transition-opacity ${speaking && !muted && !paused ? "opacity-100" : "opacity-80"}`}>{narration}</p>
        </div>
    </div>
);

const SceneIndex = ({ current, total }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Scene Index</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{current + 1} / {total}</span>
        </div>
        <ul className="mt-3 space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {SCENES.map((s, i) => (
                <li key={s.id} className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${i === current ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : i < current ? "border-white/5 text-slate-500" : "border-white/5 text-slate-300"}`}>
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border border-white/10 text-[9px]">{i + 1}</span>
                    <span className="truncate">{s.section.replace(/^Scene \d+ · /, "")}</span>
                    {i < current && <Check size={10} className="ml-auto text-cyan-400/80" />}
                </li>
            ))}
        </ul>
    </div>
);

// =================================================================
// SCENE STAGES — one per narrative beat
// =================================================================
// Maps Noldus scene focus → backdrop image + small badge for the StageImage strip
const NOLDUS_BG_MAP = {
    "facereader":            SCENE_IMG_NOLDUS.facereader,
    "subjectivity-problem":  SCENE_IMG_NOLDUS.subjectivity,
    "framework-intro":       SCENE_IMG_NOLDUS.framework,
    "comparison":            SCENE_IMG_NOLDUS.comparison,
    "srs-detect":            SCENE_IMG_NOLDUS.cluster,
    "cps-detect":            SCENE_IMG_NOLDUS.cluster,
    "eos-detect":            SCENE_IMG_NOLDUS.cluster,
    "decision-panel":        SCENE_IMG_NOLDUS.decision,
    "creatorboost-arrives":  SCENE_IMG_NOLDUS.commandCenter,
    "deal-at-risk":          SCENE_IMG_NOLDUS.dealRisk,
    "global-dashboard":      SCENE_IMG_NOLDUS.globalDashboard,
    "rep-grid":              SCENE_IMG_NOLDUS.repGrid,
    "training-mode":         SCENE_IMG_NOLDUS.training,
    "accuracy-closing":      SCENE_IMG_NOLDUS.closing,
    "closing":               SCENE_IMG_NOLDUS.closing,
};

const NOLDUS_STAGE_BADGES = {
    "facereader":            "FaceReader · Live Capture",
    "subjectivity-problem":  "The Subjectivity Problem",
    "framework-intro":       "SRS · CPS · EOS Framework",
    "comparison":            "Subjective vs Structured",
    "srs-detect":            "Live SRS Cluster",
    "cps-detect":            "Live CPS Cluster",
    "eos-detect":            "Live EOS Cluster",
    "decision-panel":        "Decision Engine",
    "creatorboost-arrives":  "CreatorBoostAI Command Center",
    "deal-at-risk":          "Deal at Risk · Autonomous",
    "global-dashboard":      "Global Behavioral Dashboard",
    "rep-grid":              "Team Intelligence Scoring",
    "training-mode":         "Training Replay System",
    "accuracy-closing":      "Up to 96% / 98% Accuracy",
};

const NoldusStageImage = ({ src, alt, badge }) => (
    <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md border border-cyan-500/20 sm:h-40 lg:h-48" data-testid="noldus-stage-image">
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/30 to-transparent" />
        {badge && (
            <span className="absolute bottom-2 left-2 rounded-full border border-cyan-500/40 bg-ink-900/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-md">
                {badge}
            </span>
        )}
    </div>
);

const InnerSceneStage = ({ scene }) => {
    switch (scene.focus) {
        case "facereader":            return <FaceReaderStage active />;
        case "subjectivity-problem":  return <SubjectivityProblemStage />;
        case "framework-intro":       return <FrameworkIntroStage />;
        case "comparison":            return <ComparisonStage />;
        case "srs-detect":            return <ClusterDetectStage state="SRS" />;
        case "cps-detect":            return <ClusterDetectStage state="CPS" />;
        case "eos-detect":            return <ClusterDetectStage state="EOS" />;
        case "decision-panel":        return <DecisionPanelStage />;
        case "creatorboost-arrives":  return <CommandCenterStage initial />;
        case "deal-at-risk":          return <DealAtRiskStage />;
        case "global-dashboard":      return <GlobalDashboardStage />;
        case "rep-grid":               return <RepGridStage />;
        case "training-mode":         return <TrainingModeStage />;
        case "accuracy-closing":      return <AccuracyClosingStage />;
        // Backward compat (old keys, still rendered if referenced)
        case "problem":               return <SubjectivityProblemStage />;
        case "bodyiq-activate":       return <ClusterDetectStage state="SRS" />;
        case "signals-cascade":       return <ClusterDetectStage state="CPS" />;
        case "autonomous":            return <DealAtRiskStage />;
        case "closing":               return <AccuracyClosingStage />;
        default:                      return null;
    }
};

const SceneStage = ({ scene }) => {
    const img = NOLDUS_BG_MAP[scene.focus];
    const badge = NOLDUS_STAGE_BADGES[scene.focus];
    return (
        <div className="space-y-0">
            {img && <NoldusStageImage src={img} alt={badge || scene.section} badge={badge} />}
            <InnerSceneStage scene={scene} />
        </div>
    );
};

// ---- Stage 1+2: FaceReader-style live capture
const FaceReaderStage = ({ active, dimmed }) => {
    const aus = [
        { code: "AU 1", label: "Inner Brow Raiser", value: 0.42 },
        { code: "AU 4", label: "Brow Lowerer",      value: 0.71 },
        { code: "AU 6", label: "Cheek Raiser",      value: 0.18 },
        { code: "AU 7", label: "Lid Tightener",     value: 0.63 },
        { code: "AU 12", label: "Lip Corner Pull",  value: 0.09 },
        { code: "AU 15", label: "Lip Corner Depr.", value: 0.34 },
        { code: "AU 17", label: "Chin Raiser",      value: 0.27 },
        { code: "AU 24", label: "Lip Pressor",      value: 0.55 },
    ];
    return (
        <div className={`rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up transition-opacity ${dimmed ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Eye size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">FaceReader · Live Capture · 30 fps</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> {active ? "STREAMING" : "STREAMING"}
                </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Action Units */}
                <div className="lg:col-span-2 rounded-sm border border-white/10 bg-ink-900 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Action Units · raw</p>
                    <div className="mt-3 space-y-2">
                        {aus.map((a, i) => (
                            <div key={a.code} className="fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                                    <span className="text-cyan-300">{a.code}</span>
                                    <span className="text-slate-400">{a.label}</span>
                                    <span className="text-slate-300">{a.value.toFixed(2)}</span>
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-800">
                                    <div className="h-full bg-cyan-400/70 transition-all duration-500" style={{ width: `${a.value * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Gaze + head pose */}
                <div className="space-y-3">
                    <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Gaze · X / Y</p>
                        <p className="font-heading mt-2 text-xl font-semibold text-cyan-300">−0.18 · 0.06</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">slight left · stable</p>
                    </div>
                    <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Head Pose</p>
                        <p className="font-heading mt-2 text-xl font-semibold text-cyan-300">−4.2°</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">pitch · neutral roll</p>
                    </div>
                    <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Frame Rate</p>
                        <p className="font-heading mt-2 text-xl font-semibold text-cyan-300">29.97 fps</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">capture stable</p>
                    </div>
                </div>
            </div>
            {dimmed && (
                <p className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                    Measurement is precise — but no decisions are being made.
                </p>
            )}
        </div>
    );
};

// ---- Stage 2: Subjectivity Problem (legacy quotes overlay on dimmed face capture)
const SubjectivityProblemStage = () => {
    const quotes = [
        { who: "Reviewer A", text: "“The buyer looked confused.”" },
        { who: "Reviewer B", text: "“The candidate seemed nervous.”" },
        { who: "Reviewer C", text: "“The witness appeared evasive.”" },
        { who: "Reviewer D", text: "“He seemed defensive in the meeting.”" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-amber-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Legacy Behavioral Output · Subjective</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Cannot be standardized · cannot be audited</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {quotes.map((q, i) => (
                    <div key={q.who} className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4 fade-in-up" style={{ animationDelay: `${i * 120}ms` }}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">{q.who}</p>
                        <p className="mt-2 font-heading text-base text-slate-100">{q.text}</p>
                        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">No cluster · No AU anchor · No intensity · No classification</p>
                    </div>
                ))}
            </div>
            <p className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Measurement is rigorous. Interpretation has been improvisational. That gap is what BodyIQ-AI was built to close.
            </p>
        </div>
    );
};

// ---- Stage 3: SRS / CPS / EOS framework intro (three structured states)
const FrameworkIntroStage = () => {
    const states = [
        {
            code: "SRS",
            title: "Signal Response State",
            tag: "First measurable reaction to stimulus",
            anchors: ["AU 4 · Brow Lowerer", "AU 7 · Lid Tightener", "Lip Pressor"],
            tone: "cyan",
            Icon: Activity,
        },
        {
            code: "CPS",
            title: "Cognitive Processing State",
            tag: "Brain working through the input",
            anchors: ["AU 1 · Inner Brow Raiser", "AU 2 · Outer Brow Raiser", "Gaze Drift"],
            tone: "amber",
            Icon: Brain,
        },
        {
            code: "EOS",
            title: "Evaluation Outcome State",
            tag: "Final evaluative resolution",
            anchors: ["AU 15 · Lip Corner Depressor", "AU 17 · Chin Raiser", "Sustained Head Tilt"],
            tone: "cyan",
            Icon: Target,
        },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Brain size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">BodyIQ Signal Intelligence Layer · Framework</span>
                </div>
                <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PATENT-PENDING</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {states.map((s, i) => (
                    <div key={s.code} className={`rounded-sm border p-4 fade-in-up ${s.tone === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/30 bg-cyan-500/5"}`} style={{ animationDelay: `${i * 200}ms` }}>
                        <div className="flex items-center gap-2">
                            <s.Icon size={13} className={s.tone === "amber" ? "text-amber-300" : "text-cyan-300"} />
                            <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${s.tone === "amber" ? "text-amber-300" : "text-cyan-300"}`}>{s.code}</span>
                        </div>
                        <p className="font-heading mt-2 text-lg font-semibold text-white">{s.title}</p>
                        <p className="mt-1 text-xs text-slate-300">{s.tag}</p>
                        <ul className="mt-3 space-y-1">
                            {s.anchors.map((a) => (
                                <li key={a} className="flex items-start gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                                    <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" />{a}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <KV label="Output Format" value="Signal Cluster" />
                <KV label="Anchored To" value="Action Units" />
                <KV label="Scored By" value="Intensity" />
                <KV label="Classification" value="+ / − / mixed" />
            </div>
        </div>
    );
};

// ---- Stage 4: Subjective vs Structured comparison (split panel)
const ComparisonStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Layers size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Same human · Same frame · Two different outputs</span>
            </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* LEFT: legacy subjective */}
            <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-4 fade-in-up">
                <div className="flex items-center gap-2">
                    <X size={13} className="text-amber-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Legacy · Subjective</span>
                </div>
                <ul className="mt-3 space-y-2">
                    {[
                        "“The buyer seemed unsure.”",
                        "“The candidate appeared defensive.”",
                        "“The witness looked uncomfortable.”",
                    ].map((q) => (
                        <li key={q} className="rounded-sm border border-amber-500/20 bg-ink-900/40 p-3 text-sm text-slate-200">{q}</li>
                    ))}
                </ul>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Opinion · cannot be audited</p>
            </div>
            {/* RIGHT: BodyIQ structured */}
            <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: "200ms" }}>
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-cyan-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">BodyIQ-AI · Structured</span>
                </div>
                <div className="mt-3 rounded-sm border border-cyan-500/30 bg-ink-900/40 p-3 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                        <span className="text-cyan-300">Cluster ID</span>
                        <span className="text-white">SRS-1142</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                        <span className="text-cyan-300">Action Units</span>
                        <span className="text-white">AU 4 + AU 7</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                        <span className="text-cyan-300">Intensity</span>
                        <span className="text-white">0.62</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                        <span className="text-cyan-300">Classification</span>
                        <span className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-cyan-300">negative</span>
                    </div>
                </div>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Anatomical evidence · auditable · deployable</p>
            </div>
        </div>
    </div>
);

// ---- Stages 5/6/7: SRS / CPS / EOS cluster detection (parameterized)
const CLUSTER_DEFS = {
    SRS: {
        title: "Signal Response State",
        clusterId: "SRS-1142",
        Icon: Activity,
        aus: [
            { code: "AU 4", label: "Brow Lowerer", value: 0.71 },
            { code: "AU 7", label: "Lid Tightener", value: 0.63 },
            { code: "AU 24", label: "Lip Pressor", value: 0.55 },
        ],
        intensity: 0.62,
        classification: "negative",
        descriptor: "First measurable reaction to stimulus",
    },
    CPS: {
        title: "Cognitive Processing State",
        clusterId: "CPS-2073",
        Icon: Brain,
        aus: [
            { code: "AU 1", label: "Inner Brow Raiser", value: 0.66 },
            { code: "AU 2", label: "Outer Brow Raiser", value: 0.58 },
            { code: "Gaze", label: "Drift Vector", value: 0.74 },
        ],
        intensity: 0.71,
        classification: "mixed",
        descriptor: "Brain working through the input",
    },
    EOS: {
        title: "Evaluation Outcome State",
        clusterId: "EOS-3408",
        Icon: Target,
        aus: [
            { code: "AU 15", label: "Lip Corner Depressor", value: 0.61 },
            { code: "AU 17", label: "Chin Raiser", value: 0.49 },
            { code: "Head", label: "Sustained Tilt", value: 0.57 },
        ],
        intensity: 0.58,
        classification: "negative",
        descriptor: "Final evaluative resolution",
    },
};

const ClusterDetectStage = ({ state }) => {
    const def = CLUSTER_DEFS[state] || CLUSTER_DEFS.SRS;
    const tone =
        def.classification === "positive" ? "cyan"
        : def.classification === "mixed" ? "amber"
        : "rose";
    const toneClasses =
        tone === "rose" ? "border-rose-500/40 bg-rose-500/5 text-rose-300"
        : tone === "amber" ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
        : "border-cyan-500/40 bg-cyan-500/5 text-cyan-300";
    return (
        <div className={`rounded-md border ${toneClasses.split(" ")[0]} bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.15)]`} data-testid={`cluster-stage-${state.toLowerCase()}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                    <def.Icon size={13} className={tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : "text-cyan-300"} />
                    <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : "text-cyan-300"}`}>
                        {state} · {def.title}
                    </span>
                </div>
                <span className="rounded-full border border-white/10 bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">live capture</span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Cluster header */}
                <div className={`rounded-sm border ${toneClasses.split(" ")[0]} ${toneClasses.split(" ")[1]} p-4`}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">Cluster ID</p>
                    <p className="font-heading mt-1 text-2xl font-semibold text-white">{def.clusterId}</p>
                    <p className="mt-2 text-xs text-slate-300">{def.descriptor}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Classification</span>
                        <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${toneClasses}`}>
                            {def.classification}
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            <span>Intensity</span>
                            <span className="text-white">{def.intensity.toFixed(2)}</span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-800">
                            <div className={`h-full ${tone === "rose" ? "bg-rose-400/70" : tone === "amber" ? "bg-amber-400/70" : "bg-cyan-400/70"} transition-all duration-700`} style={{ width: `${def.intensity * 100}%` }} />
                        </div>
                    </div>
                </div>

                {/* AU breakdown */}
                <div className="lg:col-span-2 rounded-sm border border-white/10 bg-ink-900 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Action Unit anchors</p>
                    <div className="mt-3 space-y-2">
                        {def.aus.map((a, i) => (
                            <div key={a.code} className="fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                                    <span className="text-cyan-300">{a.code}</span>
                                    <span className="text-slate-400">{a.label}</span>
                                    <span className="text-slate-200">{a.value.toFixed(2)}</span>
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-800">
                                    <div className={`h-full ${tone === "rose" ? "bg-rose-400/70" : tone === "amber" ? "bg-amber-400/70" : "bg-cyan-400/70"} transition-all duration-500`} style={{ width: `${a.value * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Anatomical · measurement-based · objective. No interpretation has been applied.
            </p>
        </div>
    );
};

// ---- Stage 5: Decision panel
const DecisionPanelStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.18)]">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Target size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Decision Engine · Recommended Action</span>
            </div>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">DO NOT CLOSE</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Recommend Icon={X}            label="Do not proceed to close" tone="amber" />
            <Recommend Icon={CheckCircle2} label="Provide clarification"   tone="cyan" />
            <Recommend Icon={Layers}       label="Reduce complexity"       tone="cyan" />
        </div>
        <div className="mt-5 rounded-sm border border-white/10 bg-ink-900 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Rationale · derived from signal stack</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" /> SRS-1142 intensity 0.62 · classification negative — body's first response is resistant.</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" /> CPS-2073 intensity 0.71 · classification mixed — cognitive processing has not resolved.</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" /> EOS-3408 intensity 0.58 · classification negative — evaluative outcome trending against close.</li>
            </ul>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Decision is structured, anchored to clusters, and fully auditable.</p>
        </div>
    </div>
);
const Recommend = ({ Icon, label, tone }) => (
    <div className={`rounded-sm border p-4 ${tone === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/30 bg-cyan-500/5"}`}>
        <div className="flex items-center gap-2">
            <Icon size={13} className={tone === "amber" ? "text-amber-300" : "text-cyan-300"} />
            <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${tone === "amber" ? "text-amber-300" : "text-cyan-300"}`}>Action</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">{label}</p>
    </div>
);

// ---- Stage 6: CreatorBoost initial command center
const CommandCenterStage = ({ initial }) => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.12)]">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Cpu size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Execution Layer · LIVE</span>
            </div>
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> connected</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KPI label="Active Pipelines" value="48" trend="+6" />
            <KPI label="Open Deals" value="$6.2M" trend="93 deals" />
            <KPI label="Auto Actions / 24h" value="412" trend="approval rate 94%" />
            <KPI label="BodyIQ Signals" value="18,442" trend="+12% MoM" />
        </div>
        <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
            {initial && <span className="font-semibold text-cyan-300">Command center opens. </span>}
            The intelligence from BodyIQ now connects to the live business environment — every signal is a
            candidate for an action.
        </p>
    </div>
);

// ---- Stage 7: Deal at risk
const DealAtRiskStage = () => (
    <div className="rounded-md border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-ink-900 p-5 fade-in-up shadow-[0_0_50px_rgba(245,158,11,0.18)]">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Deal Status · AT RISK</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">AI Confidence 78%</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1 rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Active Deal</p>
                <p className="font-heading mt-2 text-lg font-semibold text-white">Acme Corp · Q3 Renewal</p>
                <KV label="Value" value="$184,000 ARR" />
                <KV label="Stage" value="Negotiation · 2nd round" />
                <KV label="Reason at risk" value="Cluster SRS-1142 · classification negative" />
            </div>
            <div className="lg:col-span-2 rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Suggested Actions</p>
                <ul className="mt-3 space-y-2.5">
                    {[
                        { Icon: Mail,  label: "Send clarification email" },
                        { Icon: Layers,label: "Adjust pricing presentation" },
                        { Icon: Activity,label: "Trigger follow-up call within 24 hours" },
                    ].map((a, i) => (
                        <li key={a.label} className="flex items-center gap-3 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                            <a.Icon size={14} className="text-cyan-300" />
                            <span className="text-sm text-slate-200">{a.label}</span>
                            <span className="ml-auto rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Queued</span>
                        </li>
                    ))}
                </ul>
                <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:bg-cyan-400">
                    <Zap size={14} /> Execute Actions
                </button>
            </div>
        </div>
    </div>
);

// ---- Stage 8: Autonomous execution
const AutonomousExecuteStage = () => {
    const log = [
        { Icon: Mail,        label: "Clarification email generated · sent",     state: "done" },
        { Icon: CheckCircle2,label: "Follow-up task assigned · 24h SLA",        state: "done" },
        { Icon: Layers,      label: "CRM updated · stage adjusted · audit log", state: "done" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.18)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Zap size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Mode · AUTONOMOUS</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-ink-900 p-0.5">
                    <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Assisted</span>
                    <span className="rounded-full bg-cyan-500 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-900">Autonomous</span>
                </div>
            </div>
            <div className="mt-4 space-y-2.5">
                {log.map((l, i) => (
                    <div key={l.label} className="flex items-center gap-3 rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 200}ms` }}>
                        <l.Icon size={14} className="text-cyan-300" />
                        <span className="text-sm text-slate-200">{l.label}</span>
                        <span className="ml-auto rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">EXECUTED</span>
                    </div>
                ))}
            </div>
            <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">This is no longer analysis.</span> This is execution.
            </p>
        </div>
    );
};

// ---- Stage 9: Global dashboard
const GlobalDashboardStage = () => {
    const regions = [
        { name: "United States", sessions: 624, signals: 9120, revenue: "$6.4M" },
        { name: "Europe",        sessions: 412, signals: 6310, revenue: "$3.8M" },
        { name: "Asia",          sessions: 212, signals: 3012, revenue: "$2.2M" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Globe2 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Global Behavioral Intelligence Dashboard</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">LIVE</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <KPI label="Active Sessions" value="1,248" trend="across 3 regions" />
                <KPI label="Signals Detected" value="18,442" trend="last 24h" />
                <KPI label="Revenue Influenced" value="$12.4M" trend="MTD attributed" />
            </div>
            <div className="mt-5 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Region</th>
                            <th className="px-4 py-3">Active Sessions</th>
                            <th className="px-4 py-3">Signals</th>
                            <th className="px-4 py-3">Revenue Influenced</th>
                        </tr>
                    </thead>
                    <tbody>
                        {regions.map((r, i) => (
                            <tr key={r.name} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{r.name}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-slate-300">{r.sessions}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{r.signals.toLocaleString()}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{r.revenue}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- Stage 10: Per-rep grid
const RepGridStage = () => {
    const reps = [
        { name: "L. Park",     sigAcc: "94%", decEff: "A",  rev: "$1.2M" },
        { name: "M. Castillo", sigAcc: "91%", decEff: "A−", rev: "$948K" },
        { name: "S. Doherty",  sigAcc: "88%", decEff: "B+", rev: "$812K" },
        { name: "R. Iyer",     sigAcc: "82%", decEff: "B",  rev: "$640K" },
        { name: "T. Nguyen",   sigAcc: "76%", decEff: "B−", rev: "$520K" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Per-Rep Performance · Behavioral KPIs</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">last 90 days</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Rep</th>
                            <th className="px-4 py-3">Signal Accuracy</th>
                            <th className="px-4 py-3">Decision Efficiency</th>
                            <th className="px-4 py-3">Revenue Impact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reps.map((r, i) => (
                            <tr key={r.name} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{r.name}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{r.sigAcc}</td>
                                <td className="px-4 py-3"><span className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">{r.decEff}</span></td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{r.rev}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- Stage 11: Training mode
const TrainingModeStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Training Mode · Recorded Interaction Replay</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">02:14 / 14:32</span>
        </div>
        <div className="mt-4 rounded-sm border border-white/10 bg-ink-900 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Timeline · signals overlaid</p>
            <div className="mt-3 space-y-2">
                {[
                    { t: "00:42", sig: "SRS-1108 · AU 12 + AU 6 · 0.54 · positive",   tone: "cyan"  },
                    { t: "01:18", sig: "CPS-2073 · AU 1 + AU 2 · 0.71 · mixed",        tone: "amber" },
                    { t: "02:14", sig: "SRS-1142 · AU 4 + AU 7 · 0.62 · negative",     tone: "amber" },
                    { t: "02:39", sig: "Decision · clarify · do not close",            tone: "cyan"  },
                    { t: "03:01", sig: "EOS-3401 · AU 12 + AU 25 · 0.69 · positive",   tone: "cyan"  },
                ].map((m, i) => (
                    <div key={m.t} className="flex items-center gap-3 rounded-sm border border-white/5 bg-ink-800 p-2.5 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{m.t}</span>
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${m.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{m.sig}</span>
                    </div>
                ))}
            </div>
        </div>
        <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">Every interaction becomes measurable, coachable, and repeatable.</span>
        </p>
    </div>
);

// ---- Stage 14: Accuracy + Closing slate
const AccuracyClosingStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-7 lg:p-12 fade-in-up shadow-[0_0_60px_rgba(6,182,212,0.18)]" data-testid="accuracy-closing-stage">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Accuracy · Closing</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Non-subjective Classification</p>
                <p className="font-heading mt-3 text-5xl font-semibold text-white">up to 96%</p>
                <p className="mt-3 text-xs text-slate-300">96 of every 100 system outputs are structured signal clusters — not adjectives or interpretations.</p>
            </div>
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Signal-level Accuracy</p>
                <p className="font-heading mt-3 text-5xl font-semibold text-white">up to 98%</p>
                <p className="mt-3 text-xs text-slate-300">Underlying Action Unit detection is as precise as the world's leading behavioral measurement systems.</p>
            </div>
        </div>
        <p className="mt-7 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Human communication is largely driven by nonverbal signals. This system operates directly on
            that layer — <span className="text-cyan-300">anatomical, measurement-based, and objective.</span>
        </p>
        <div className="mt-7 space-y-2.5">
            <p className="font-heading text-2xl font-semibold text-white sm:text-3xl"><span className="text-slate-400">Noldus</span> measures.</p>
            <p className="font-heading text-2xl font-semibold text-white sm:text-3xl"><span className="text-cyan-300">BodyIQ-AI</span> defines.</p>
            <p className="font-heading text-2xl font-semibold text-white sm:text-3xl"><span className="text-cyan-300">CreatorBoostAI</span> executes.</p>
        </div>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Together, this is the first complete <span className="text-cyan-300">Human Intelligence Execution System</span>.
        </p>
    </div>
);

// =================================================================
// SHARE + QR
// =================================================================
const ShareModule = ({ onReplay, trackEvent }) => {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const url = typeof window !== "undefined" ? window.location.href : "";
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&bgcolor=0F172A&color=22D3EE&data=${encodeURIComponent(url)}`;

    const send = async () => {
        if (!email) { toast.error("Enter a recipient email"); return; }
        setBusy(true);
        try {
            const res = await shareDemo({ recipient_email: email, demo_type: "noldus", share_target: url });
            trackEvent?.("share_send", { recipient_email: email });
            if (res?.sent) toast.success(`Sent to ${email}.`);
            else toast.message("Share recorded — email service is configured to deliver once Resend keys land.");
            setEmail("");
        } catch {
            toast.error("Could not record share. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            trackEvent?.("share_copy", {});
            toast.success("Link copied to clipboard");
        } catch {
            toast.error("Could not copy link");
        }
    };

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-ink-700/40 p-6 fade-in-up" data-testid="noldus-share-module">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Share this demo</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white">For your team, your investors, your trade-show booth.</h3>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="recipient@enterprise.com"
                            data-testid="noldus-share-email"
                            className="flex-1 rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                        />
                        <button
                            onClick={send}
                            disabled={busy}
                            data-testid="noldus-share-send"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                        >
                            <Send size={14} /> {busy ? "Sending…" : "Send Private Link"}
                        </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            onClick={copy}
                            data-testid="noldus-share-copy"
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                        >
                            <Copy size={12} /> Copy link
                        </button>
                        <button
                            onClick={onReplay}
                            data-testid="noldus-replay"
                            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                        >
                            <Play size={11} /> Replay
                        </button>
                        <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                            <Shield size={11} /> Private link · trackable
                        </span>
                    </div>
                </div>
                <div className="lg:col-span-5">
                    <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <QrCode size={13} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">QR · Trade-Show Ready</span>
                        </div>
                        <div className="mt-3 flex items-center justify-center rounded-sm bg-ink-800 p-3" data-testid="noldus-qr">
                            <img src={qrSrc} alt="QR code linking to this demo" className="h-44 w-44" loading="lazy" />
                        </div>
                        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500 text-center">
                            Point any camera at this code to open the demo
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// shared atoms
// =================================================================
const KV = ({ label, value }) => (
    <div className="mt-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
    </div>
);
const KPI = ({ label, value, trend }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="font-heading mt-1 text-lg font-semibold text-cyan-300 sm:text-xl">{value}</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{trend}</p>
    </div>
);
