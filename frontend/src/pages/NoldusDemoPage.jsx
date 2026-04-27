import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { shareDemo } from "@/lib/api";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { toast } from "sonner";
import {
    Play, Pause, Volume2, VolumeX, Check, ArrowRight, Sparkles, Mic,
    Eye, Activity, Brain, Zap, Globe2, Send, Copy, QrCode, Cpu, Target,
    Mail, Shield, AlertTriangle, CheckCircle2, X, BarChart3, Layers,
} from "lucide-react";

// =================================================================
// 11 scenes · ~6.5 min auto-played · Noldus / Enterprise / Investor cut
// =================================================================
const SCENES = [
    {
        id: "facereader",
        section: "Scene 1 · The Measurement Floor",
        title: "Measurement at the highest level.",
        focus: "facereader",
        fallback_ms: 38000,
        narration:
            "What you are seeing here is one of the most advanced behavioral measurement systems in the world. " +
            "It captures human physiology with precision. Action Units, gaze, micro-expressions, posture. " +
            "This is measurement at the highest level.",
    },
    {
        id: "problem",
        section: "Scene 2 · The Problem",
        title: "Measurement alone does not drive decisions.",
        focus: "problem",
        fallback_ms: 32000,
        narration:
            "But here is the problem. Measurement alone does not drive decisions. " +
            "Most enterprise teams do not struggle with collecting behavioral data. " +
            "They struggle with what to do with it.",
    },
    {
        id: "bodyiq-activate",
        section: "Scene 3 · BodyIQ Signal Intelligence Layer",
        title: "BodyIQ-AI activates. Measurement becomes meaning.",
        focus: "bodyiq-activate",
        fallback_ms: 42000,
        narration:
            "Now the BodyIQ Signal Intelligence Layer activates. " +
            "BodyIQ-AI does not describe behavior. It defines it. " +
            "Every signal is built from objective anatomical measurements — Action Unit four, Action Unit seven, lip compression — " +
            "removing subjectivity and replacing it with structured intelligence. " +
            "The first signal fires: negotiation friction. Confidence point six two.",
    },
    {
        id: "signals-cascade",
        section: "Scene 4 · Signal Cascade",
        title: "Multiple signals firing in sequence — each tied to underlying AUs.",
        focus: "signals-cascade",
        fallback_ms: 38000,
        narration:
            "Watch as additional signals fire in sequence. Cognitive gap detected. " +
            "Evaluative skepticism detected. Each one anchored to a measurable Action Unit signature. " +
            "This is what objective signal intelligence looks like at scale.",
    },
    {
        id: "decision-panel",
        section: "Scene 5 · Decision Engine",
        title: "Behavioral data converted to a real-time decision.",
        focus: "decision-panel",
        fallback_ms: 36000,
        narration:
            "This is where BodyIQ-AI changes everything. " +
            "We convert behavioral data into real-time decision systems. " +
            "Recommended action: do not proceed to close. Provide clarification. Reduce complexity. " +
            "The decision is structured, scored, and ready to act on.",
    },
    {
        id: "creatorboost-arrives",
        section: "Scene 6 · CreatorBoostAI · Execution Layer",
        title: "Now we take it one step further.",
        focus: "creatorboost-arrives",
        fallback_ms: 36000,
        narration:
            "Now we take it one step further. CreatorBoostAI — the Execution Layer — opens into a full enterprise command center. " +
            "Clean, powerful, multi-panel. The intelligence from BodyIQ now connects to the live business environment.",
    },
    {
        id: "deal-at-risk",
        section: "Scene 7 · Deal at Risk · Suggested Actions",
        title: "Deal status: at risk. Reason: negotiation friction. Confidence: 78%.",
        focus: "deal-at-risk",
        fallback_ms: 42000,
        narration:
            "A deal is active in the sales pipeline. The system links the BodyIQ signal directly to the deal. " +
            "Deal status: at risk. Reason: negotiation friction detected. AI confidence: seventy-eight percent. " +
            "Suggested actions appear immediately. Send clarification email. Adjust pricing presentation. " +
            "Trigger follow-up call within twenty-four hours. CreatorBoostAI takes the intelligence from BodyIQ and executes on it.",
    },
    {
        id: "autonomous",
        section: "Scene 8 · Assisted or Autonomous",
        title: "Execute with human approval — or fully automated.",
        focus: "autonomous",
        fallback_ms: 40000,
        narration:
            "This can be done with human approval, or fully automated. " +
            "The mode toggles to autonomous. The system executes immediately. " +
            "An email is generated and sent. A follow-up task is assigned. The CRM is updated and audit-logged. " +
            "This is no longer analysis. This is execution.",
    },
    {
        id: "global-dashboard",
        section: "Scene 9 · Global Behavioral Intelligence",
        title: "Behavioral intelligence becomes a measurable business KPI.",
        focus: "global-dashboard",
        fallback_ms: 40000,
        narration:
            "The view expands to the global dashboard. United States, Europe, Asia — each region with live performance metrics. " +
            "One thousand two hundred forty-eight active behavioral sessions. Eighteen thousand four hundred forty-two signals detected. " +
            "Twelve point four million dollars in revenue influenced. " +
            "For the first time, behavioral intelligence becomes a measurable business KPI.",
    },
    {
        id: "rep-grid",
        section: "Scene 10 · Per-Rep Performance",
        title: "Track not just what teams say — but how they respond.",
        focus: "rep-grid",
        fallback_ms: 36000,
        narration:
            "We zoom into a corporate view. Each rep is scored on three dimensions. " +
            "Signal accuracy. Decision efficiency. Revenue impact. " +
            "Organizations can now track not just what their teams say — but how effectively they respond to human signals.",
    },
    {
        id: "training-mode",
        section: "Scene 11 · Training Mode",
        title: "Every interaction becomes measurable, coachable, repeatable.",
        focus: "training-mode",
        fallback_ms: 36000,
        narration:
            "We enter training mode. A recorded interaction plays back, with signals overlaid in real time on every frame. " +
            "This enables standardized training across the entire enterprise. " +
            "Every interaction becomes measurable, coachable, and repeatable.",
    },
    {
        id: "closing",
        section: "Scene 12 · Closing",
        title: "The first complete Human Intelligence Execution System.",
        focus: "closing",
        fallback_ms: 38000,
        narration:
            "Noldus measures behavior. " +
            "BodyIQ-AI defines it. " +
            "CreatorBoostAI executes on it. " +
            "Together, this becomes the first complete Human Intelligence Execution System. " +
            "This is not an upgrade to your platform. This is the next layer of value your platform enables.",
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
                    body: JSON.stringify({ text: s.narration, voice: "nova" }),
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
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        const sc = SCENES[idx]; if (!sc) return;
        sceneStart.current = Date.now();
        setSceneElapsed(0);
        tickTimer.current = setInterval(() => {
            setSceneElapsed(Date.now() - sceneStart.current);
        }, 250);
        const maxMs = sc.fallback_ms || 40000;
        maxTimer.current = setTimeout(() => { if (!paused) goToNext(); }, maxMs + 1500);

        if (muted) {
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => { if (!paused) goToNext(); }, maxMs);
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
                if (paused) return;
                advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
            };
            window.speechSynthesis.speak(u);
        } else {
            advanceTimer.current = setTimeout(() => { if (!paused) goToNext(); }, maxMs);
        }
    }, [audioCache, muted, paused, goToNext]);

    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        const onEnded = () => {
            setSpeaking(false);
            if (paused) return;
            advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
        };
        const onPlay = () => setSpeaking(true);
        const onPause = () => setSpeaking(false);
        a.addEventListener("ended", onEnded);
        a.addEventListener("play", onPlay);
        a.addEventListener("pause", onPause);
        return () => {
            a.removeEventListener("ended", onEnded);
            a.removeEventListener("play", onPlay);
            a.removeEventListener("pause", onPause);
        };
    }, [paused, goToNext]);

    useEffect(() => {
        if (!started) return;
        speakScene(scene);
        return () => clearAllTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started]);

    useEffect(() => () => {
        clearAllTimers();
        if (audioRef.current) audioRef.current.pause();
        if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
        Object.values(audioCache).forEach(URL.revokeObjectURL);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            audioRef.current?.pause();
            window?.speechSynthesis?.cancel();
        }
    };
    const handleRestart = () => {
        clearAllTimers();
        audioRef.current?.pause();
        setScene(0); setDone(false); setPaused(false);
        setTimeout(() => speakScene(0), 150);
    };
    const handleMute = () => {
        setMuted((p) => {
            const n = !p;
            if (n) audioRef.current?.pause();
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

                        {(current.focus === "closing" || done) && (
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
            A 6-minute walkthrough of the first complete Human Intelligence Execution System — the layer that
            converts FaceReader-grade behavioral measurement into real-time enterprise decisions and automated
            execution.
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
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the 12-scene Noldus walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 12-scene cinematic walkthrough — narrated by Nova (female · American) —
                    designed for Noldus, enterprise partners, and investor conversations. No clicks. No demos
                    that stall. Approximately 6 to 7 minutes.
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
                        Auto-plays · ~6.5 min · Voice: Nova
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "12 cinematic scenes",
                        "Noldus / FaceReader integration story",
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
                            "The problem: data without decisions",
                            "BodyIQ-AI activates — signal cascade",
                            "Decision engine + recommended action",
                            "CreatorBoostAI command center opens",
                            "Deal at risk → suggested actions → autonomous execution",
                            "Global behavioral KPI dashboard",
                            "Per-rep scoring + training mode",
                            "Closing: Human Intelligence Execution System",
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
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Narration · Nova</span>
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
const SceneStage = ({ scene }) => {
    switch (scene.focus) {
        case "facereader":          return <FaceReaderStage active />;
        case "problem":             return <FaceReaderStage dimmed />;
        case "bodyiq-activate":     return <BodyIQActivateStage />;
        case "signals-cascade":     return <SignalsCascadeStage />;
        case "decision-panel":      return <DecisionPanelStage />;
        case "creatorboost-arrives":return <CommandCenterStage initial />;
        case "deal-at-risk":        return <DealAtRiskStage />;
        case "autonomous":          return <AutonomousExecuteStage />;
        case "global-dashboard":    return <GlobalDashboardStage />;
        case "rep-grid":            return <RepGridStage />;
        case "training-mode":       return <TrainingModeStage />;
        case "closing":             return <ClosingStage />;
        default:                    return null;
    }
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

// ---- Stage 3: BodyIQ activation
const BodyIQActivateStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Brain size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">BodyIQ Signal Intelligence Layer · ACTIVATED</span>
            </div>
            <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PATENT-PENDING</span>
        </div>

        <div className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-4 fade-in-up">
            <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Signal Detected</span>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">live</span>
            </div>
            <p className="font-heading mt-2 text-2xl font-semibold text-white">Negotiation Friction</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <KV label="Confidence" value="0.62" />
                <KV label="Source" value="AU 4 + AU 7 + Lip Compression" />
                <KV label="Type" value="Resistance" />
            </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-slate-300">
            <span className="text-cyan-300">BodyIQ-AI does not describe behavior — it defines it.</span>{" "}
            Each signal is built from objective anatomical measurements, removing subjectivity and replacing
            it with structured intelligence.
        </p>
    </div>
);

// ---- Stage 4: Signals cascade
const SignalsCascadeStage = () => {
    const signals = [
        { name: "Negotiation Friction",   confidence: 0.62, source: "AU 4 + AU 7 + Lip Comp.", type: "Resistance",    delay: 0 },
        { name: "Cognitive Gap",          confidence: 0.71, source: "AU 1 + AU 4 + Gaze Drift", type: "Confusion",     delay: 250 },
        { name: "Evaluative Skepticism",  confidence: 0.58, source: "AU 7 + AU 24 + Head Tilt", type: "Skepticism",    delay: 500 },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Activity size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Signal Cascade · Last 4.2s</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Stream · objective</span>
            </div>
            <div className="mt-5 space-y-3">
                {signals.map((s) => (
                    <div key={s.name} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: `${s.delay}ms` }}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{s.type}</span>
                                <span className="font-heading text-base font-semibold text-white">{s.name}</span>
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">conf {s.confidence.toFixed(2)}</span>
                        </div>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{s.source}</p>
                    </div>
                ))}
            </div>
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
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" /> Negotiation friction is rising while comprehension is dropping.</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" /> Evaluative skepticism + cognitive gap → buyer is defending, not deciding.</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" /> Closing now risks loss; clarifying now restores trajectory.</li>
            </ul>
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
                <KV label="Reason at risk" value="Negotiation friction detected" />
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
                    { t: "00:42", sig: "Hidden interest detected",          tone: "cyan"  },
                    { t: "01:18", sig: "Cognitive gap detected",            tone: "amber" },
                    { t: "02:14", sig: "Negotiation friction · escalating", tone: "amber" },
                    { t: "02:39", sig: "Recommended: clarify, do not close", tone: "cyan" },
                    { t: "03:01", sig: "Buyer alignment restored",          tone: "cyan"  },
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

// ---- Stage 12: Closing slate
const ClosingStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-7 lg:p-12 fade-in-up shadow-[0_0_60px_rgba(6,182,212,0.18)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Closing</p>
        <div className="mt-6 space-y-3">
            <p className="font-heading text-2xl font-semibold text-white sm:text-3xl"><span className="text-slate-400">Noldus</span> measures behavior.</p>
            <p className="font-heading text-2xl font-semibold text-white sm:text-3xl"><span className="text-cyan-300">BodyIQ-AI</span> defines it.</p>
            <p className="font-heading text-2xl font-semibold text-white sm:text-3xl"><span className="text-cyan-300">CreatorBoostAI</span> executes on it.</p>
        </div>
        <p className="mt-7 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Together, this becomes the first complete <span className="text-cyan-300">Human Intelligence Execution System</span>.
        </p>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
            This is not an upgrade to your platform. <span className="text-white">This is the next layer of value your platform enables.</span>
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
