import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { shareDemo } from "@/lib/api";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { toast } from "sonner";
import {
    Play, Pause, Volume2, VolumeX, Check, ArrowRight, Sparkles, Mic,
    Activity, Brain, Zap, Globe2, Send, Copy, QrCode, Cpu, Target,
    Mail, Shield, AlertTriangle, CheckCircle2, X, BarChart3, Layers,
    ShoppingCart, Truck, Wrench, Users, Camera, Fuel, Boxes, Building2,
    Package, ScanLine, MapPin,
} from "lucide-react";

// =================================================================
// 18 scenes · ~12 min auto-played · Supermarket / C-Store / Retail
// SRS · CPS · EOS structured signal framework. No adjectives.
// =================================================================
const SCENES = [
    {
        id: "modern-stack",
        section: "Scene 1 · The Modern Store Stack",
        focus: "modern-stack",
        fallback_ms: 40000,
        narration:
            "This is how modern retail operates today. Enterprise retailers run on dozens of disconnected " +
            "systems. ERP — SAP, Microsoft Dynamics, OneStream. Retail — Oracle Retail, SAP Retail. " +
            "Workforce — UKG, Blue Yonder. Maintenance — ServiceChannel, Accruent. CRM — Salesforce. " +
            "Fleet — Manhattan TMS, Geotab. Each system works. But none of them think together.",
    },
    {
        id: "problem",
        section: "Scene 2 · The Problem",
        focus: "problem",
        fallback_ms: 36000,
        narration:
            "Every day, alerts fire across the stack. Out-of-stock warnings. Labor shortages. Equipment " +
            "failures. Missed sales. These systems generate data. They do not coordinate decisions. And " +
            "they do not understand the most important variable in retail — human behavior.",
    },
    {
        id: "nonverbal",
        section: "Scene 3 · Nonverbal Reality",
        focus: "nonverbal",
        fallback_ms: 36000,
        narration:
            "In retail, decisions are driven largely by nonverbal signals. Customer hesitation at the " +
            "shelf. Product uncertainty in the aisle. Purchase friction at checkout. No legacy system is " +
            "capturing this layer — until now.",
    },
    {
        id: "bodyiq-activate",
        section: "Scene 4 · BodyIQ-AI Activation",
        focus: "bodyiq-activate",
        fallback_ms: 35000,
        narration:
            "BodyIQ-AI activates as the Signal Intelligence Layer. The system defines human behavior " +
            "using anatomical signals. No adjectives. No interpretation. Every output is a structured " +
            "signal cluster anchored to Action Units, scored by intensity, and classified as positive, " +
            "negative, or mixed.",
    },
    {
        id: "objective-mode",
        section: "Scene 5 · Objective Mode",
        focus: "objective-mode",
        fallback_ms: 36000,
        narration:
            "Objective Mode engages. Three structured states form the foundation. SRS — Signal Response " +
            "State. CPS — Cognitive Processing State. EOS — Evaluation Outcome State. Up to ninety-six " +
            "percent non-subjective classification. Up to ninety-eight percent signal-level accuracy. " +
            "Anatomical, measurement-based, and objective.",
    },
    {
        id: "shelf-clusters",
        section: "Scene 6 · In-store Customer at Shelf",
        focus: "shelf-clusters",
        fallback_ms: 45000,
        narration:
            "Camera input from Aisle four, beverage section. A customer approaches the shelf. The signal " +
            "stack fires in real time. SRS dash four one zero seven. Action Unit four. Action Unit seven. " +
            "Hand pause at zero point seven seconds. Intensity zero point six four. Classification mixed. " +
            "CPS dash five two one one. Gaze drift across three SKUs. Dwell time eleven seconds. " +
            "Classification mixed. EOS dash six three zero four. Item replaced. Pivot away. " +
            "Classification negative. Hesitation pattern detected. Not guessed. Measured.",
    },
    {
        id: "real-time-action",
        section: "Scene 7 · Real-time Store Action",
        focus: "real-time-action",
        fallback_ms: 40000,
        narration:
            "CreatorBoostAI converts the cluster into action. Three executions fire in real time. Push " +
            "comparison information to the digital shelf display in front of the customer. Notify the " +
            "associate on duty for Aisle four. Trigger a personalized price incentive through the loyalty " +
            "app. Intelligence becomes execution — in under two seconds.",
    },
    {
        id: "checkout",
        section: "Scene 8 · Checkout Optimization",
        focus: "checkout",
        fallback_ms: 38000,
        narration:
            "A customer reaches the checkout lane. Cluster EOS dash seven one one nine fires. Hand " +
            "withdraw motion. Item removed from belt. Classification negative. The system responds. " +
            "Adjust the upsell prompt. Reduce friction. Recommend the express lane two registers over. " +
            "Even checkout becomes optimized at the signal level.",
    },
    {
        id: "workforce",
        section: "Scene 9 · Workforce Intelligence",
        focus: "workforce",
        fallback_ms: 40000,
        narration:
            "Zoom into the workforce layer. An associate is assisting a customer. The system scores the " +
            "interaction across three structured dimensions. Signal Accuracy — how well the associate " +
            "reads anatomical cues. Response Efficiency — how quickly they act on the signal stack. " +
            "Outcome Impact — the revenue effect of their decisions. Organizations now measure how " +
            "employees respond to human signals — not just what they say.",
    },
    {
        id: "ops-overlay",
        section: "Scene 10 · Store Operations Overlay",
        focus: "ops-overlay",
        fallback_ms: 40000,
        narration:
            "CreatorBoostAI does not replace your systems. It sits on top of them. The dashboard now " +
            "overlays SAP for ERP, Salesforce for CRM, ServiceChannel for maintenance, and Blue Yonder " +
            "for workforce — all in one operational view. The intelligence layer connects them and " +
            "makes them coordinate decisions for the first time.",
    },
    {
        id: "maintenance",
        section: "Scene 11 · Maintenance + Facility",
        focus: "maintenance",
        fallback_ms: 40000,
        narration:
            "A refrigeration unit in the dairy section is flagged in ServiceChannel. The system " +
            "correlates the equipment fault with cluster EOS dash eight two zero four — customers " +
            "approaching the cooler door, then pivoting away. A failing refrigeration unit is now tied " +
            "directly to lost customer engagement. The work order escalates with measurable revenue " +
            "impact attached.",
    },
    {
        id: "supply-chain",
        section: "Scene 12 · Supply Chain + Inventory",
        focus: "supply-chain",
        fallback_ms: 40000,
        narration:
            "An out-of-stock event fires for SKU four nine zero zero one. The signal stack confirms " +
            "negative classification clusters from twelve customers in the last forty minutes. The " +
            "system executes three actions. Auto reorder triggered through SAP Retail. Substitute SKU " +
            "suggested through the loyalty app. Supplier alert dispatched. Inventory is no longer " +
            "static — it is behavior-driven.",
    },
    {
        id: "fleet",
        section: "Scene 13 · Fleet + Delivery",
        focus: "fleet",
        fallback_ms: 36000,
        narration:
            "Truck routes from Manhattan TMS appear on the live map. The system adjusts delivery " +
            "priority based on real-time store demand. Store one one four two — accelerated. Store " +
            "two zero seven three — deprioritized. Even logistics adapts to the signal stack at the " +
            "store level.",
    },
    {
        id: "c-store",
        section: "Scene 14 · C-Store + Fuel",
        focus: "c-store",
        fallback_ms: 42000,
        narration:
            "The view shifts to a convenience store and fuel forecourt. Systems appear — PDI Enterprise, " +
            "NCR POS, FuelQuest. Speed and decision timing are everything in this environment. A " +
            "customer grabs a beverage from the cooler — cluster CPS dash nine four one one fires. " +
            "Hesitation between two SKUs. The system reacts instantly. Suggest the bundle. Adjust the " +
            "pump price. Trigger a forecourt promotion to the customer's loyalty app.",
    },
    {
        id: "ai-camera",
        section: "Scene 15 · AI Camera + Behavior",
        focus: "ai-camera",
        fallback_ms: 36000,
        narration:
            "Ceiling camera systems track movement across the store — paths, dwell time, approach " +
            "vectors. AI cameras provide the input. CreatorBoostAI defines the meaning. Movement plus " +
            "anatomical signals plus structured clusters equals decision-grade intelligence at every " +
            "square foot of retail floor.",
    },
    {
        id: "global-dashboard",
        section: "Scene 16 · Global Enterprise Dashboard",
        focus: "global-dashboard",
        fallback_ms: 42000,
        narration:
            "The view expands to the global enterprise dashboard. United States. Latin America. Europe. " +
            "Asia. Every region with live behavioral KPIs. Two thousand four hundred fifteen active " +
            "stores. One hundred forty-seven thousand structured signal clusters today. Forty-two " +
            "point one million dollars in revenue influenced by the signal stack this quarter. For " +
            "the first time, behavior becomes a measurable enterprise KPI.",
    },
    {
        id: "training-replay",
        section: "Scene 17 · Training Replay",
        focus: "training-replay",
        fallback_ms: 36000,
        narration:
            "Training replay engages. A recorded store interaction plays back, with SRS, CPS, and EOS " +
            "clusters overlaid frame by frame. Associates see exactly which signals fired, when, and " +
            "how they responded. Every interaction becomes measurable, coachable, and standardized " +
            "across the organization.",
    },
    {
        id: "autonomous-closing",
        section: "Scene 18 · Autonomous Mode · Final Positioning",
        focus: "autonomous-closing",
        fallback_ms: 50000,
        narration:
            "The mode toggles to autonomous. CreatorBoostAI executes across pricing, staffing, " +
            "inventory, marketing, and fleet — simultaneously, system-wide. With human approval, or " +
            "fully autonomous. Retail measures transactions. BodyIQ-AI defines human behavior. " +
            "CreatorBoostAI executes on it. This is the first complete retail intelligence execution " +
            "system.",
    },
];

const SCENE_GAP_MS = 600;

// =================================================================
// PAGE
// =================================================================
export default function SupermarketDemoPage() {
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
    const totalRuntimeMs = useMemo(() => SCENES.reduce((a, s) => a + (s.fallback_ms || 40000), 0), []);
    const elapsedBeforeScene = useMemo(
        () => SCENES.slice(0, scene).reduce((a, s) => a + (s.fallback_ms || 40000), 0),
        [scene]
    );
    const overallProgress = Math.min(100, Math.round(((elapsedBeforeScene + sceneElapsed) / totalRuntimeMs) * 100));

    const apiBase = useMemo(() => `${process.env.REACT_APP_BACKEND_URL || ""}/api`, []);
    const { personalization, trackEvent } = useDemoTracking({
        demoType: "supermarket",
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
        tickTimer.current = setInterval(() => setSceneElapsed(Date.now() - sceneStart.current), 250);
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
        setStarted(true);
        setScene(0); setDone(false); setPaused(false);
        const cache = await prefetchAll();
        setTimeout(() => speakScene(0, cache), 200);
    };
    const handlePauseResume = () => {
        if (paused) {
            setPaused(false);
            if (audioRef.current?.src) audioRef.current.play().catch(() => {});
            const remaining = Math.max(2000, (current.fallback_ms || 40000) + 1500 - sceneElapsed);
            sceneStart.current = Date.now() - sceneElapsed;
            tickTimer.current = setInterval(() => setSceneElapsed(Date.now() - sceneStart.current), 250);
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
                    <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 bg-white/5" data-testid="supermarket-global-timeline">
                        <div className="h-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 transition-[width] duration-300" style={{ width: `${overallProgress}%` }} />
                    </div>
                    <div className="pointer-events-none fixed left-1/2 top-1.5 z-[60] -translate-x-1/2 rounded-full border border-cyan-500/30 bg-ink-900/85 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-md">
                        {scene + 1}/{total} · {current.section} · {overallProgress}%
                    </div>
                </>
            )}

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="supermarket-demo-page">
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
                        <SceneHeader scene={scene} current={current} total={total} paused={paused} speaking={speaking} muted={muted} onPauseResume={handlePauseResume} onMute={handleMute} />
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <SceneStage scene={current} />
                            </div>
                            <div className="space-y-4 lg:col-span-4">
                                <NarrationPanel
                                    narration={current.narration}
                                    speaking={speaking} muted={muted} paused={paused}
                                    onMute={handleMute}
                                    personalGreeting={scene === 0 && personalization?.name
                                        ? `Hello ${personalization.name}${personalization.company ? ` from ${personalization.company}` : ""} — this retail walkthrough was prepared just for you.`
                                        : null}
                                />
                                <SceneIndex current={scene} total={total} />
                            </div>
                        </div>
                        {(current.focus === "autonomous-closing" || done) && (
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
    <section className="relative" data-testid="supermarket-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Enterprise · Supermarket / C-Store / Retail</span>
        </div>
        {personalization?.greeting && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="supermarket-personalized-greeting">
                {personalization.greeting}
            </p>
        )}
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Retail measures transactions.{" "}
            <span className="text-cyan-400">BodyIQ-AI defines human behavior. CreatorBoostAI executes on it.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            A 12-minute walkthrough of the first complete retail intelligence execution system — sitting on
            top of SAP, Oracle Retail, Salesforce, ServiceChannel, Blue Yonder, Manhattan TMS, PDI, NCR POS,
            and your fleet stack — connecting them with structured signal clusters (SRS · CPS · EOS) that
            drive coordinated decisions in real time. Anatomical. Measurement-based. Objective.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching, progress, personalization }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console</p>
                {personalization?.greeting && (
                    <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200" data-testid="supermarket-start-personalized">
                        {personalization.greeting}
                    </p>
                )}
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the 18-scene Supermarket &amp; C-Store walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 18-scene cinematic walkthrough — narrated by Nova (female · American)
                    — designed for grocery, supermarket, and convenience-store enterprises. Built around the
                    SRS · CPS · EOS structured signal framework. No clicks. Approximately 10 to 13 minutes.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button onClick={onStart} disabled={prefetching} data-testid="start-supermarket-demo-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-7 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] disabled:opacity-60">
                        {prefetching ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900 border-t-transparent" />Prefetching · {progress}%</> : <><Play size={14} fill="currentColor" />Start Demo</>}
                    </button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Auto-plays · ~12 min · Voice: Nova</span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "18 cinematic scenes",
                        "SAP · Oracle · Salesforce · Blue Yonder",
                        "ServiceChannel · Manhattan · UKG",
                        "C-Store · PDI · NCR POS · FuelQuest",
                        "SRS · CPS · EOS structured framework",
                        "AI camera + behavior intelligence",
                        "Up to 96% non-subjective · 98% accuracy",
                        "Autonomous mode + global dashboard",
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
                            "The Modern Store Stack",
                            "The Problem · disconnected systems",
                            "Nonverbal Reality of retail",
                            "BodyIQ-AI · Signal Intelligence Layer",
                            "Objective Mode · 96% / 98%",
                            "Customer at shelf · SRS · CPS · EOS",
                            "Real-time store action",
                            "Checkout optimization",
                            "Workforce intelligence scoring",
                            "Store ops overlay · SAP / SF / SC / BY",
                            "Maintenance + facility correlation",
                            "Supply chain · behavior-driven",
                            "Fleet + delivery prioritization",
                            "C-Store · PDI · NCR · FuelQuest",
                            "AI camera + behavior intelligence",
                            "Global enterprise dashboard",
                            "Training replay system",
                            "Autonomous mode + closing",
                        ].map((b, i) => (
                            <li key={b} className="flex items-start gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                                <span className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-2 py-0.5 text-[9px] text-cyan-300">{String(i + 1).padStart(2, "0")}</span>
                                <span>{b}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    </div>
);

const SceneHeader = ({ scene, current, total, paused, speaking, muted, onPauseResume, onMute }) => (
    <div className="sticky top-0 z-50 -mx-4 mb-2 border-b border-white/10 bg-ink-900/90 px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8" data-testid="scene-header">
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Scene {scene + 1} of {total}</p>
                <p className="truncate font-heading text-base font-semibold text-white sm:text-lg">{current.section}</p>
            </div>
            <div className="flex items-center gap-2">
                <Btn onClick={onPauseResume} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} primary testid="pause-btn" />
                <Btn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Muted" : "On"} testid="mute-btn" />
                {speaking && !muted && !paused && (
                    <span className="hidden items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 sm:inline-flex">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> Live narration
                    </span>
                )}
            </div>
        </div>
    </div>
);

const Btn = ({ onClick, icon: Icon, label, primary, testid }) => (
    <button onClick={onClick} data-testid={testid}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${primary ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900" : "border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"}`}>
        <Icon size={12} /> <span>{label}</span>
    </button>
);

const NarrationPanel = ({ narration, speaking, muted, paused, onMute, personalGreeting }) => (
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
        {personalGreeting && (
            <p className="mt-3 rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-sm leading-relaxed text-cyan-100" data-testid="supermarket-avatar-greeting">
                {personalGreeting}
            </p>
        )}
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
// SCENE STAGES
// =================================================================
const SceneStage = ({ scene }) => {
    switch (scene.focus) {
        case "modern-stack":      return <ModernStackStage />;
        case "problem":           return <ProblemStage />;
        case "nonverbal":         return <NonverbalStage />;
        case "bodyiq-activate":   return <BodyIQActivateStage />;
        case "objective-mode":    return <ObjectiveModeStage />;
        case "shelf-clusters":    return <ShelfClustersStage />;
        case "real-time-action":  return <RealTimeActionStage />;
        case "checkout":          return <CheckoutStage />;
        case "workforce":         return <WorkforceStage />;
        case "ops-overlay":       return <OpsOverlayStage />;
        case "maintenance":       return <MaintenanceStage />;
        case "supply-chain":      return <SupplyChainStage />;
        case "fleet":             return <FleetStage />;
        case "c-store":           return <CStoreStage />;
        case "ai-camera":         return <AICameraStage />;
        case "global-dashboard":  return <GlobalDashboardStage />;
        case "training-replay":   return <TrainingReplayStage />;
        case "autonomous-closing":return <AutonomousClosingStage />;
        default:                  return null;
    }
};

const KV = ({ label, value }) => (
    <div className="rounded-sm border border-white/5 bg-ink-900 px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">{value}</p>
    </div>
);

const KPI = ({ Icon, label, value, trend }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <div className="flex items-center gap-2">
            {Icon && <Icon size={12} className="text-cyan-400" />}
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        </div>
        <p className="mt-1 font-heading text-xl font-semibold text-white">{value}</p>
        {trend && <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{trend}</p>}
    </div>
);

// ---- 1. Modern store stack
const ModernStackStage = () => {
    const groups = [
        { label: "ERP",          items: ["SAP", "Microsoft Dynamics", "OneStream"], Icon: Cpu },
        { label: "Retail",       items: ["Oracle Retail", "SAP Retail"], Icon: ShoppingCart },
        { label: "Workforce",    items: ["UKG", "Blue Yonder"], Icon: Users },
        { label: "Maintenance",  items: ["ServiceChannel", "Accruent"], Icon: Wrench },
        { label: "CRM",          items: ["Salesforce"], Icon: Sparkles },
        { label: "Fleet",        items: ["Manhattan TMS", "Geotab"], Icon: Truck },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-modern-stack">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Layers size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Enterprise Retail · Operating Systems</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Each system works · None think together</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((g, i) => (
                    <div key={g.label} className="rounded-sm border border-white/10 bg-ink-900 p-4 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center gap-2">
                            <g.Icon size={13} className="text-cyan-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{g.label}</span>
                        </div>
                        <ul className="mt-3 space-y-1">
                            {g.items.map((it) => (
                                <li key={it} className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-200">{it}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- 2. Problem
const ProblemStage = () => {
    const alerts = [
        { Icon: Package,        label: "Out-of-stock · 47 SKUs",     tone: "amber" },
        { Icon: Users,          label: "Labor shortage · 3 stores",   tone: "amber" },
        { Icon: Wrench,         label: "Equipment failure · 2 units", tone: "rose" },
        { Icon: BarChart3,      label: "Missed sales · $184K today",  tone: "rose" },
    ];
    return (
        <div className="rounded-md border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-ink-900 p-5 fade-in-up" data-testid="stage-problem">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-amber-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Disconnected Systems · Decisions not coordinated</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Live alerts feed</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {alerts.map((a, i) => (
                    <div key={a.label} className={`rounded-sm border p-4 fade-in-up ${a.tone === "rose" ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5"}`} style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex items-center gap-3">
                            <a.Icon size={16} className={a.tone === "rose" ? "text-rose-300" : "text-amber-300"} />
                            <span className="text-sm text-slate-100">{a.label}</span>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Systems generate data. They do not coordinate decisions. And they do not understand human behavior.
            </p>
        </div>
    );
};

// ---- 3. Nonverbal reality
const NonverbalStage = () => {
    const moments = [
        { label: "Customer browsing · Aisle 4",  detail: "Dwell 11.4s · Approach vector W → E", Icon: ShoppingCart },
        { label: "Employee assisting · Pharmacy", detail: "Eye contact · open posture",         Icon: Users },
        { label: "Checkout hesitation · Lane 3",  detail: "Hand withdraw · gaze drift",         Icon: ScanLine },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-nonverbal">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Brain size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Nonverbal Layer · The Hidden Variable</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">No legacy system captures this</span>
            </div>
            <div className="mt-5 space-y-3">
                {moments.map((m, i) => (
                    <div key={m.label} className="flex items-center gap-3 rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: `${i * 120}ms` }}>
                        <m.Icon size={14} className="text-cyan-300" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{m.label}</p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{m.detail}</p>
                        </div>
                        <span className="rounded-full border border-cyan-500/30 bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">capture</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- 4. BodyIQ activation
const BodyIQActivateStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.18)]" data-testid="stage-bodyiq-activate">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Brain size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">BodyIQ-AI · Signal Intelligence Layer · ACTIVATED</span>
            </div>
            <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PATENT-PENDING</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KV label="Output Format" value="Signal Cluster" />
            <KV label="Anchored To"   value="Action Units" />
            <KV label="Classification" value="+ / − / mixed" />
        </div>
        <p className="mt-5 text-sm leading-relaxed text-slate-300">
            <span className="text-cyan-300">BodyIQ-AI does not describe behavior — it defines it.</span>{" "}
            Every output is a structured signal cluster. No adjectives. No interpretation. Only anatomical
            measurement.
        </p>
    </div>
);

// ---- 5. Objective Mode + 96/98 stats
const ObjectiveModeStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-objective-mode">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Shield size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Objective Mode · ON</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">SRS · CPS · EOS</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {[
                { code: "SRS", title: "Signal Response State",     tag: "First measurable reaction" },
                { code: "CPS", title: "Cognitive Processing State", tag: "Brain working through input" },
                { code: "EOS", title: "Evaluation Outcome State",   tag: "Final evaluative resolution" },
            ].map((s, i) => (
                <div key={s.code} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{s.code}</p>
                    <p className="font-heading mt-2 text-base font-semibold text-white">{s.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{s.tag}</p>
                </div>
            ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Non-subjective Classification</p>
                <p className="font-heading mt-2 text-4xl font-semibold text-white">up to 96%</p>
            </div>
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Signal-level Accuracy</p>
                <p className="font-heading mt-2 text-4xl font-semibold text-white">up to 98%</p>
            </div>
        </div>
    </div>
);

// ---- 6. Shelf clusters
const ShelfClustersStage = () => {
    const clusters = [
        { code: "SRS-4107", aus: "AU 4 + AU 7 · Hand Pause", intensity: 0.64, cls: "mixed" },
        { code: "CPS-5211", aus: "Gaze Drift · 3 SKUs · 11s", intensity: 0.69, cls: "mixed" },
        { code: "EOS-6304", aus: "Item Replaced · Pivot Away", intensity: 0.58, cls: "negative" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.15)]" data-testid="stage-shelf-clusters">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Camera size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Aisle 4 · Beverage Section · Live capture</span>
                </div>
                <span className="rounded-full border border-white/10 bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">SRS · CPS · EOS</span>
            </div>
            <div className="mt-5 space-y-3">
                {clusters.map((c, i) => {
                    const tone = c.cls === "negative" ? "rose" : c.cls === "mixed" ? "amber" : "cyan";
                    const cls = tone === "rose" ? "border-rose-500/40 bg-rose-500/5 text-rose-300" : tone === "amber" ? "border-amber-500/40 bg-amber-500/5 text-amber-300" : "border-cyan-500/40 bg-cyan-500/5 text-cyan-300";
                    return (
                        <div key={c.code} className={`rounded-sm border p-4 fade-in-up ${cls.split(" ")[0]} ${cls.split(" ")[1]}`} style={{ animationDelay: `${i * 150}ms` }}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Cluster ID</span>
                                    <span className="font-heading text-base font-semibold text-white">{c.code}</span>
                                </div>
                                <span className={`rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${cls}`}>{c.cls}</span>
                            </div>
                            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{c.aus} · Intensity {c.intensity.toFixed(2)}</p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-800">
                                <div className={`h-full transition-all duration-500 ${tone === "rose" ? "bg-rose-400/70" : tone === "amber" ? "bg-amber-400/70" : "bg-cyan-400/70"}`} style={{ width: `${c.intensity * 100}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Hesitation pattern detected at the shelf. Anatomical, structured, auditable.
            </p>
        </div>
    );
};

// ---- 7. Real-time action
const RealTimeActionStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up" data-testid="stage-real-time-action">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Zap size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Execution · Live</span>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">&lt; 2s</span>
        </div>
        <div className="mt-5 space-y-3">
            {[
                { Icon: ScanLine, label: "Push comparison info to digital shelf · Aisle 4", status: "Sent" },
                { Icon: Users,    label: "Notify associate on duty · Aisle 4",               status: "Notified" },
                { Icon: Sparkles, label: "Trigger personalized price incentive · loyalty app", status: "Delivered" },
            ].map((a, i) => (
                <div key={a.label} className="flex items-center gap-3 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3.5 fade-in-up" style={{ animationDelay: `${i * 120}ms` }}>
                    <a.Icon size={14} className="text-cyan-300" />
                    <span className="text-sm text-slate-200 flex-1">{a.label}</span>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{a.status}</span>
                </div>
            ))}
        </div>
    </div>
);

// ---- 8. Checkout
const CheckoutStage = () => (
    <div className="rounded-md border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-ink-900 p-5 fade-in-up" data-testid="stage-checkout">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
                <ScanLine size={13} className="text-amber-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Checkout · Lane 3 · Cluster fired</span>
            </div>
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">EOS-7119 · negative</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KV label="Cluster" value="EOS-7119" />
            <KV label="AUs" value="Hand withdraw · gaze drift" />
            <KV label="Intensity" value="0.61" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
                { Icon: Sparkles, label: "Adjust upsell prompt" },
                { Icon: CheckCircle2, label: "Reduce friction at lane" },
                { Icon: ArrowRight,   label: "Recommend express lane 5" },
            ].map((a) => (
                <div key={a.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3">
                    <div className="flex items-center gap-2">
                        <a.Icon size={14} className="text-cyan-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Action</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">{a.label}</p>
                </div>
            ))}
        </div>
    </div>
);

// ---- 9. Workforce
const WorkforceStage = () => {
    const reps = [
        { name: "Maria L.", store: "Store 1142 · NY",  acc: 0.93, eff: 0.88, imp: "$24,800" },
        { name: "James K.", store: "Store 0411 · CA",  acc: 0.81, eff: 0.79, imp: "$11,420" },
        { name: "Priya S.", store: "Store 2073 · TX",  acc: 0.96, eff: 0.92, imp: "$31,640" },
        { name: "Tom R.",   store: "Store 1556 · IL",  acc: 0.74, eff: 0.71, imp: "$6,180" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-workforce">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Users size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Workforce Intelligence · Last 30 days</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">3 dimensions per associate</span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-sm border border-white/5">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-ink-900">
                        <tr>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Associate</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Signal Accuracy</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Response Efficiency</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Outcome Impact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reps.map((r) => (
                            <tr key={r.name} className="border-t border-white/5">
                                <td className="px-3 py-2"><span className="text-white">{r.name}</span><br /><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{r.store}</span></td>
                                <td className="px-3 py-2 font-mono text-cyan-300">{(r.acc * 100).toFixed(0)}%</td>
                                <td className="px-3 py-2 font-mono text-cyan-300">{(r.eff * 100).toFixed(0)}%</td>
                                <td className="px-3 py-2 font-mono text-cyan-300">{r.imp}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- 10. Ops overlay
const OpsOverlayStage = () => {
    const tiles = [
        { label: "SAP · ERP",         status: "Connected · 12 streams",    Icon: Cpu },
        { label: "Salesforce · CRM",  status: "Connected · 4M contacts",   Icon: Sparkles },
        { label: "ServiceChannel",    status: "Connected · 218 work orders open", Icon: Wrench },
        { label: "Blue Yonder",       status: "Connected · 8.2K shifts",   Icon: Users },
        { label: "Oracle Retail",     status: "Connected · 1.4M SKUs",     Icon: ShoppingCart },
        { label: "Manhattan TMS",     status: "Connected · 412 routes",    Icon: Truck },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-ops-overlay">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Layers size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI sits on top · Connects · Coordinates</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">No replacement · No migration</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tiles.map((t, i) => (
                    <div key={t.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center gap-2"><t.Icon size={13} className="text-cyan-300" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{t.label}</span></div>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300">{t.status}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- 11. Maintenance
const MaintenanceStage = () => (
    <div className="rounded-md border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-ink-900 p-5 fade-in-up" data-testid="stage-maintenance">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Wrench size={13} className="text-amber-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">ServiceChannel · Work Order · Auto-correlated</span>
            </div>
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">Cluster EOS-8204</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Equipment Issue</p>
                <p className="font-heading mt-2 text-base font-semibold text-white">Dairy refrigeration unit DR-04 · Store 1142</p>
                <KV label="Status"      value="Failing · cooling -12%" />
                <KV label="Reported"    value="ServiceChannel · 41 min ago" />
            </div>
            <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Behavior Correlation</p>
                <p className="font-heading mt-2 text-base font-semibold text-white">EOS-8204 · negative · 14 customers / 38 min</p>
                <KV label="Pattern"     value="Approach → pivot away · cooler door" />
                <KV label="Revenue at risk" value="$2,180 / hour · est." />
            </div>
        </div>
        <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">Equipment fault is now tied directly to lost engagement.</span> The work order escalates with measurable revenue impact attached.
        </p>
    </div>
);

// ---- 12. Supply chain
const SupplyChainStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-supply-chain">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Boxes size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">SAP Retail · SKU 49001 · Out-of-stock</span>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Inventory · behavior-driven</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
                { Icon: Package,  label: "Auto reorder",       detail: "SAP Retail · vendor SP-204 · 800 units · ETA 36 hr" },
                { Icon: ArrowRight, label: "Substitute SKU",   detail: "Loyalty app · SKU 49014 · 12% loyalty boost" },
                { Icon: Send,     label: "Supplier alert",     detail: "Vendor portal · sent · ack required" },
            ].map((a, i) => (
                <div key={a.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center gap-2"><a.Icon size={13} className="text-cyan-300" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{a.label}</span></div>
                    <p className="mt-2 text-sm text-white">{a.detail}</p>
                </div>
            ))}
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">12 negative-classification clusters in last 40 minutes confirmed customer impact.</p>
    </div>
);

// ---- 13. Fleet
const FleetStage = () => {
    const routes = [
        { id: "RT-1142", label: "Bronx · Queens · Long Island", status: "Accelerated", priority: "high",  eta: "+0:14" },
        { id: "RT-2073", label: "Houston · Galveston",          status: "Deprioritized", priority: "low", eta: "+1:08" },
        { id: "RT-0411", label: "LA · OC · San Diego",          status: "On-time",     priority: "med",  eta: "0:00" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-fleet">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Truck size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Manhattan TMS · Live Routes</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">412 active</span>
            </div>
            <div className="mt-5 space-y-3">
                {routes.map((r, i) => (
                    <div key={r.id} className="grid grid-cols-1 gap-3 rounded-sm border border-white/10 bg-ink-900 p-3 sm:grid-cols-12 fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 sm:col-span-2">{r.id}</span>
                        <span className="text-sm text-slate-200 sm:col-span-5"><MapPin size={11} className="inline mr-1 text-cyan-400" />{r.label}</span>
                        <span className={`font-mono text-[9px] uppercase tracking-[0.22em] sm:col-span-3 ${r.priority === "high" ? "text-cyan-300" : r.priority === "low" ? "text-slate-500" : "text-amber-300"}`}>{r.status}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 sm:col-span-2">ETA {r.eta}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- 14. C-Store
const CStoreStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-c-store">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Fuel size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">C-Store + Forecourt · PDI · NCR · FuelQuest</span>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">CPS-9411 · mixed</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Cooler · Beverage Hesitation</p>
                <p className="font-heading mt-2 text-base font-semibold text-white">2 SKUs · gaze drift · hand pause 0.9s</p>
                <KV label="Cluster" value="CPS-9411 · intensity 0.66" />
            </div>
            <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Real-time Response</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-cyan-400" /> Bundle suggested · cooler beverage + snack</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-cyan-400" /> Pump-side promotion to loyalty app</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-cyan-400" /> Forecourt price tile updated · grade 87</li>
                </ul>
            </div>
        </div>
    </div>
);

// ---- 15. AI Camera
const AICameraStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-ai-camera">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Camera size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">AI Camera Network · Behavior Intelligence</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Cameras provide input · CreatorBoostAI defines meaning</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
                { label: "Active cameras", value: "12,488", trend: "across 2,415 stores" },
                { label: "Tracked motion paths · today", value: "4.6M", trend: "approach + dwell + pivot" },
                { label: "Structured clusters / hour", value: "11,204", trend: "SRS + CPS + EOS" },
            ].map((k) => <KPI key={k.label} {...k} />)}
        </div>
        <p className="mt-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">Movement + anatomical signals + structured clusters = decision-grade intelligence at every square foot.</span>
        </p>
    </div>
);

// ---- 16. Global dashboard
const GlobalDashboardStage = () => {
    const regions = [
        { name: "United States",  stores: 1284, signals: "78,400", revenue: "$24.8M" },
        { name: "Latin America",  stores: 312,  signals: "18,200", revenue: "$5.2M" },
        { name: "Europe",         stores: 488,  signals: "32,100", revenue: "$8.4M" },
        { name: "Asia-Pacific",   stores: 331,  signals: "18,900", revenue: "$3.7M" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-global-dashboard">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Globe2 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Global Enterprise Dashboard</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Behavior · KPI</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KPI Icon={Building2} label="Active stores"          value="2,415"   trend="+12 wk" />
                <KPI Icon={Activity}  label="Clusters today"          value="147,600" trend="SRS+CPS+EOS" />
                <KPI Icon={BarChart3} label="Revenue influenced (Q)" value="$42.1M"  trend="↑ 18% YoY" />
                <KPI Icon={Target}    label="Conversion lift"         value="+11.4%" trend="vs control" />
            </div>
            <div className="mt-5 overflow-hidden rounded-sm border border-white/5">
                <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-ink-900">
                        <tr>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Region</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Stores</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Signal Clusters</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Revenue Influenced (Q)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {regions.map((r) => (
                            <tr key={r.name} className="border-t border-white/5">
                                <td className="px-3 py-2 text-white">{r.name}</td>
                                <td className="px-3 py-2 font-mono text-cyan-300">{r.stores.toLocaleString()}</td>
                                <td className="px-3 py-2 font-mono text-cyan-300">{r.signals}</td>
                                <td className="px-3 py-2 font-mono text-cyan-300">{r.revenue}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- 17. Training replay
const TrainingReplayStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-training-replay">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Training Replay · Recorded Store Interaction</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">02:14 / 14:32</span>
        </div>
        <div className="mt-4 rounded-sm border border-white/10 bg-ink-900 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Timeline · structured clusters overlaid</p>
            <div className="mt-3 space-y-2">
                {[
                    { t: "00:42", sig: "SRS-1108 · AU 12 + AU 6 · 0.54 · positive",   tone: "cyan" },
                    { t: "01:18", sig: "CPS-2073 · AU 1 + AU 2 · 0.71 · mixed",        tone: "amber" },
                    { t: "02:14", sig: "SRS-1142 · AU 4 + AU 7 · 0.62 · negative",     tone: "rose" },
                    { t: "02:39", sig: "Decision · clarify · associate dispatched",   tone: "cyan" },
                    { t: "03:01", sig: "EOS-3401 · AU 12 + AU 25 · 0.69 · positive",   tone: "cyan" },
                ].map((m, i) => (
                    <div key={m.t} className="flex items-center gap-3 rounded-sm border border-white/5 bg-ink-800 p-2.5 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{m.t}</span>
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${m.tone === "rose" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : m.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{m.sig}</span>
                    </div>
                ))}
            </div>
        </div>
        <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">Every interaction becomes measurable, coachable, and standardized across the organization.</span>
        </p>
    </div>
);

// ---- 18. Autonomous + Closing
const AutonomousClosingStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-7 lg:p-12 fade-in-up shadow-[0_0_60px_rgba(6,182,212,0.18)]" data-testid="stage-autonomous-closing">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Cpu size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Autonomous Mode · ON</span>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Assisted ⇄ Autonomous</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {["Pricing", "Staffing", "Inventory", "Marketing", "Fleet"].map((d) => (
                <div key={d} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{d}</p>
                    <p className="font-heading mt-1 text-sm text-white">Executing</p>
                </div>
            ))}
        </div>
        <div className="mt-7 space-y-2.5">
            <p className="font-heading text-xl font-semibold text-white sm:text-2xl"><span className="text-slate-400">Retail</span> measures transactions.</p>
            <p className="font-heading text-xl font-semibold text-white sm:text-2xl"><span className="text-cyan-300">BodyIQ-AI</span> defines human behavior.</p>
            <p className="font-heading text-xl font-semibold text-white sm:text-2xl"><span className="text-cyan-300">CreatorBoostAI</span> executes on it.</p>
        </div>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            This is the first complete <span className="text-cyan-300">retail intelligence execution system</span>.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Non-subjective Classification</p>
                <p className="font-heading mt-1 text-3xl font-semibold text-white">up to 96%</p>
            </div>
            <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Signal-level Accuracy</p>
                <p className="font-heading mt-1 text-3xl font-semibold text-white">up to 98%</p>
            </div>
        </div>
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
            const res = await shareDemo({ recipient_email: email, demo_type: "supermarket", share_target: url });
            trackEvent?.("share_send", { recipient_email: email });
            if (res?.sent) toast.success(`Sent to ${email}.`);
            else toast.message("Share recorded — email service is configured to deliver once Resend keys land.");
            setEmail("");
        } catch {
            toast.error("Could not record share. Please try again.");
        } finally { setBusy(false); }
    };
    const copy = async () => {
        try { await navigator.clipboard.writeText(url); trackEvent?.("share_copy", {}); toast.success("Link copied"); }
        catch { toast.error("Could not copy link"); }
    };

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-ink-700/40 p-6 fade-in-up" data-testid="supermarket-share-module">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Complete</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white sm:text-3xl">Send this to your enterprise team.</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                        Forward the personalized link to retail executives, regional VPs, or your CIO — or
                        scan the QR code on a presentation screen.
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="recipient@company.com" data-testid="supermarket-share-email"
                            className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                        <button onClick={send} disabled={busy} data-testid="supermarket-share-send"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60">
                            <Send size={13} /> {busy ? "Sending…" : "Send Private Link"}
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={copy} data-testid="supermarket-share-copy" className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <Copy size={12} /> Copy Link
                        </button>
                        <button onClick={onReplay} data-testid="supermarket-share-replay" className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <Play size={12} /> Watch Again
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <div className="rounded-sm border border-cyan-500/30 bg-ink-900 p-4 text-center" data-testid="supermarket-share-qr">
                        <div className="flex items-center justify-center gap-2 border-b border-white/5 pb-2">
                            <QrCode size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">QR · Scan to view</span>
                        </div>
                        <img src={qrSrc} alt="QR code" className="mx-auto mt-3 h-40 w-40 rounded-sm" />
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Use on any presentation screen</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
