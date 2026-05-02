import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { shareDemo } from "@/lib/api";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { useRefMirror, hardSilence, useDemoCleanup } from "@/lib/demoAudioFix";
import { toast } from "sonner";
import { SCENE_IMG_AIRPORT } from "@/lib/images";
import { ActivateCommandCenter } from "@/components/ActivateCommandCenter";
import { SavePauseDialog } from "@/components/SavePauseDialog";
import {
    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Check, ArrowRight,
    Send, Copy, QrCode, Shield, Mic, Plane, Layers, Building2, Store,
    Wrench, Users, FileSignature, TrendingUp, Activity, Gauge, Radar,
    CheckCircle2, AlertTriangle, Clock, DollarSign, Map, MonitorSpeaker,
} from "lucide-react";

// =================================================================
// 9 scenes · ~7–10 min auto-played · SITA-Style Airport Enterprise Demo
//
// Positioning rule (CRITICAL): CreatorBoostAI sits on top of existing
// airport systems — SITA, Sabre, Amadeus, ground-handling schedulers,
// concession POS, maintenance ERPs, vendor contract stores. It never
// replaces them. It connects them, reads them, and adds a revenue +
// lifecycle + operational-intelligence layer.
// =================================================================
const SCENES = [
    {
        id: "terminal",
        section: "Scene 1 · The Terminal Reality",
        title: "One airport. Dozens of systems. Zero unified view.",
        focus: "terminal",
        fallback_ms: 45000,
        narration:
            "Picture a modern international terminal. Passengers move through check-in, security, " +
            "concessions, gates. Ground handlers, baggage, fueling, maintenance crews work behind " +
            "the scenes. Every one of those operations already runs on a system. SITA. Sabre. " +
            "Amadeus. Concession point of sale. Ground-handling schedulers. Maintenance ERPs. " +
            "Vendor contract stores. The airport has paid for all of them. They work. But they " +
            "don't talk to each other. And the data they generate never becomes decisions — " +
            "never becomes revenue.",
    },
    {
        id: "overlay",
        section: "Scene 2 · The Overlay, Not the Replacement",
        title: "CreatorBoostAI sits on top. It does not replace.",
        focus: "overlay",
        fallback_ms: 45000,
        narration:
            "CreatorBoostAI is an intelligence overlay. It connects directly to the systems the " +
            "airport already owns — SITA for passenger and baggage data, Sabre and Amadeus for " +
            "flight and reservation signals, concession point of sale for revenue, ground-handling " +
            "software for crew and equipment, and maintenance platforms for every asset on the " +
            "field. We do not rip anything out. We do not compete with existing vendors. We sit on " +
            "top, read across all of them, and add a layer of revenue, lifecycle, and operational " +
            "intelligence the airport has never had before.",
    },
    {
        id: "command",
        section: "Scene 3 · The Unified Command View",
        title: "Every system. One live screen. Read-only by default.",
        focus: "command",
        fallback_ms: 50000,
        narration:
            "This is the unified command view. On a single screen, airport leadership can see " +
            "passenger throughput by terminal, concession revenue per square foot, gate " +
            "utilization, ground-handling crew status, baggage transit times, maintenance work " +
            "orders, vendor contract status, and lifecycle position of every major asset. The " +
            "data is sourced live from the airport's existing systems — never duplicated, never " +
            "rebuilt. Read-only by default. Write-back is optional, scoped, and fully audit-logged.",
    },
    {
        id: "revenue",
        section: "Scene 4 · Revenue Intelligence",
        title: "Concession, parking, advertising — all attributable per passenger.",
        focus: "revenue",
        fallback_ms: 50000,
        narration:
            "Now we turn to revenue. Airports make money from more than airline fees. Concessions. " +
            "Parking. Ground transport. Advertising. Lounges. Duty-free. Food and beverage. The " +
            "overlay reads every one of those streams, ties them back to passenger volume, dwell " +
            "time, and terminal flow, and surfaces where revenue is under-performing. Shop A " +
            "sells three times more per square foot than shop B — but they have the same footprint. " +
            "Lounge occupancy peaks at sixty-eight percent — capacity is being left on the table. " +
            "Parking utilization drops forty percent on Tuesdays — dynamic pricing window missed. " +
            "These are the decisions the overlay surfaces — without replacing a single existing " +
            "system.",
    },
    {
        id: "operations",
        section: "Scene 5 · Operational Control",
        title: "Gate utilization, crew dispatch, baggage and turnaround, live.",
        focus: "operations",
        fallback_ms: 50000,
        narration:
            "Operations next. Gate utilization is live. Crew dispatch shows every ground-handling " +
            "team and their current assignment. Baggage transit is measured end-to-end. Turnaround " +
            "performance is scored per aircraft, per gate, per carrier. When a delay propagates, the " +
            "overlay shows the cascade before it reaches the ramp. When a ground crew is under-" +
            "utilized, the overlay flags it. When a turnaround consistently runs long at one gate, " +
            "the overlay surfaces it. The decisions are visible. The data was already in the " +
            "airport's systems. The intelligence layer makes it usable.",
    },
    {
        id: "maintenance",
        section: "Scene 6 · Asset & Equipment Lifecycle",
        title: "Every jet bridge, every belt, every HVAC unit — tracked from cradle to retirement.",
        focus: "maintenance",
        fallback_ms: 50000,
        narration:
            "Now we open the lifecycle layer. Every major asset on the field — jet bridges, baggage " +
            "belts, HVAC, lighting, escalators, elevators, de-icing equipment, ground support " +
            "equipment — is registered with install date, warranty position, service history, and " +
            "performance trend. The overlay tracks each asset through four states. Identified. " +
            "Approved. Deployed. Savings verified. When an asset nears end of life, the system " +
            "flags it. When repeated service calls hit the same unit, the system recommends " +
            "replacement. When a warranty is about to expire, the system warns before the airport " +
            "loses coverage. This is lifecycle discipline — applied to an entire airport.",
    },
    {
        id: "vendors",
        section: "Scene 7 · Vendor, Contract, & Warranty Enforcement",
        title: "The contracts you already signed, finally enforced.",
        focus: "vendors",
        fallback_ms: 48000,
        narration:
            "Contracts and vendors. Every service contract the airport has signed — maintenance, " +
            "cleaning, security, ground services, concessions, advertising — is loaded into the " +
            "overlay. Service-level agreements are read in. Invoices are cross-checked against " +
            "performance and warranty coverage. Repairs that should have been covered under " +
            "warranty are flagged before they are paid. Vendors overcharging against market " +
            "benchmark are escalated. Renewal windows are surfaced sixty, ninety, and one hundred " +
            "twenty days in advance. The airport keeps its vendors — but it finally enforces the " +
            "contracts it already signed.",
    },
    {
        id: "passengers",
        section: "Scene 8 · Passenger Signal Layer",
        title: "BodyIQ-AI adds behavioral intelligence to every touchpoint.",
        focus: "passengers",
        fallback_ms: 48000,
        narration:
            "The passenger layer activates. BodyIQ-AI applies airport-grade behavioral signal " +
            "measurement to touchpoints that drive revenue — check-in, retail, food and beverage, " +
            "lounge entry, gate areas, and jet bridge approach. The system reads structured signals: " +
            "friction at a self-service kiosk. Decision hesitation at a concession. Dwell patterns " +
            "that predict purchase. Stress signatures in security lines. The output is never an " +
            "adjective — it is a structured cluster, anchored to anatomy, scored by intensity, " +
            "classified positive, negative, or mixed. Terminal operations use these signals to " +
            "reduce wait times. Concessionaires use them to redesign layout. The airport uses them " +
            "to raise revenue per passenger — measurably.",
    },
    {
        id: "growth",
        section: "Scene 9 · The Airport Growth Engine",
        title: "More revenue. Better operations. Every asset accounted for.",
        focus: "growth",
        fallback_ms: 50000,
        narration:
            "This is the airport growth engine. More revenue — because concessions, parking, " +
            "advertising, and lounges are finally measured and optimized against live passenger " +
            "signal. Better operations — because gates, crews, baggage, and turnaround run on a " +
            "single decision surface instead of nine fragmented dashboards. Every asset accounted " +
            "for — because lifecycle, warranty, vendor, and contract data is continuously " +
            "reconciled, not discovered during an audit. CreatorBoostAI does not replace SITA, " +
            "Sabre, Amadeus, or any of the systems the airport already runs. It sits on top of " +
            "them. It connects them. It turns them into revenue, control, and lifecycle " +
            "intelligence. That is the next step.",
    },
];

const SCENE_GAP_MS = 600;

// =================================================================
// PAGE
// =================================================================
export default function AirportDemoPage() {
    const [started, setStarted] = useState(false);
    const [scene, setScene] = useState(0);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [audioCache, setAudioCache] = useState({});
    const [prefetching, setPrefetching] = useState(false);
    const [prefetchProgress, setPrefetchProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [overlayDismissed, setOverlayDismissed] = useState(false);
    const [sceneElapsed, setSceneElapsed] = useState(0);
    const [saveOpen, setSaveOpen] = useState(false);

    const audioRef = useRef(null);
    const advanceTimer = useRef(null);
    const maxTimer = useRef(null);
    const tickTimer = useRef(null);
    const sceneStart = useRef(0);
    const pausedRef = useRefMirror(paused);
    const audioCacheRef = useRefMirror(audioCache);
    useDemoCleanup(audioRef, audioCacheRef);

    const current = SCENES[scene];
    const total = SCENES.length;

    const totalRuntimeMs = useMemo(
        () => SCENES.reduce((a, s) => a + (s.fallback_ms || 45000), 0),
        []
    );
    const elapsedBeforeScene = useMemo(
        () => SCENES.slice(0, scene).reduce((a, s) => a + (s.fallback_ms || 45000), 0),
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
    const { personalization, trackEvent, sessionId } = useDemoTracking({
        demoType: "airport",
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
        const maxMs = sc.fallback_ms || 45000;
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
    }, [audioCache, muted, goToNext, pausedRef]);

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
    }, [goToNext, pausedRef]);

    useEffect(() => {
        if (!started) return;
        speakScene(scene);
        return () => clearAllTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started]);

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
            const remaining = Math.max(2000, (current.fallback_ms || 45000) + 1500 - sceneElapsed);
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
    const jumpToScene = (idx) => {
        const bounded = Math.max(0, Math.min(SCENES.length - 1, idx));
        clearAllTimers();
        hardSilence(audioRef);
        setScene(bounded);
        setDone(false);
        setSceneElapsed(0);
        sceneStart.current = Date.now();
        setPaused(false);
        setTimeout(() => speakScene(bounded), 150);
    };
    const handlePrevScene = () => jumpToScene(scene - 1);
    const handleNextScene = () => jumpToScene(scene + 1);
    const openSaveDialog = () => {
        if (!paused) {
            setPaused(true);
            clearAllTimers();
            hardSilence(audioRef);
        }
        setSaveOpen(true);
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
                    <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 bg-white/5" data-testid="airport-global-timeline">
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

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="airport-demo-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <img
                        src={started ? (AIRPORT_BG_MAP[current.focus] || SCENE_IMG_AIRPORT.terminal) : SCENE_IMG_AIRPORT.terminal}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-700"
                        loading="eager"
                        data-testid="airport-scene-bg"
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
                            onPauseResume={openSaveDialog} onMute={handleMute}
                            onPrev={handlePrevScene} onNext={handleNextScene}
                            onJump={jumpToScene} scenes={SCENES}
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

                        {(current.focus === "growth" || done) && (
                            <div className="mt-6"><ShareModule onReplay={handleRestart} trackEvent={trackEvent} /></div>
                        )}
                    </div>
                )}
            </div>

            <ActivateCommandCenter
                open={done && !overlayDismissed}
                onClose={() => setOverlayDismissed(true)}
                industry="Airports & Aviation"
                demoOrigin="airport"
                capability={[
                    "Unified overlay on SITA · Sabre · Amadeus (no replacement)",
                    "Concession, parking, lounge revenue intelligence",
                    "Gate, crew, baggage & turnaround control surface",
                    "Asset lifecycle + warranty + vendor contract enforcement",
                ]}
            />
            <SavePauseDialog
                open={saveOpen}
                onClose={() => setSaveOpen(false)}
                onContinue={() => { setSaveOpen(false); handlePauseResume(); }}
                demoType="airport"
                scene={scene}
                totalScenes={total}
                demoOrigin="airport"
                sessionId={sessionId}
                industry="Airports & Aviation"
            />
        </Layout>
    );
}

// =================================================================
// HERO + START
// =================================================================
const Hero = ({ personalization }) => (
    <section className="relative" data-testid="airport-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <Plane size={12} className="text-cyan-300" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Enterprise · Airports & Aviation · SITA-style overlay
            </span>
        </div>
        {personalization?.greeting && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="airport-personalized-greeting">
                {personalization.greeting}
            </p>
        )}
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            More revenue. Better operations.{" "}
            <span className="text-cyan-400">Every asset, accounted for.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            CreatorBoostAI sits on top of the systems your airport already runs —{" "}
            <span className="text-cyan-300">SITA, Sabre, Amadeus, concession POS, ground-handling schedulers, maintenance ERPs</span>{" "}
            — and adds a revenue, lifecycle, and operational intelligence layer. We don't replace. We connect.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching, progress, personalization }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console</p>
                {personalization?.greeting && (
                    <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200" data-testid="airport-start-personalized">
                        {personalization.greeting}
                    </p>
                )}
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                    Run the 9-scene Airport walkthrough.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 9-scene cinematic walkthrough — narrated by Sage (female · American) —
                    for airport authorities, aviation operators, ground-handling partners, and enterprise
                    leadership teams. Revenue. Operations. Lifecycle. All layered on top of the systems
                    you already own. Approximately 7 to 10 minutes.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                        onClick={onStart}
                        disabled={prefetching}
                        data-testid="start-airport-demo-btn"
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
                    <Link
                        to="/contact?intent=enterprise&source_demo=airport"
                        data-testid="airport-hero-cta-enterprise"
                        className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                    >
                        Request airport brief <ArrowRight size={12} />
                    </Link>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Auto-plays · ~7–10 min · Voice: Sage
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "9 cinematic scenes",
                        "Sits on top of SITA · Sabre · Amadeus",
                        "Revenue · Operations · Lifecycle intelligence",
                        "BodyIQ-AI passenger signal layer",
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
                        {SCENES.map((s, i) => (
                            <li key={s.id} className="flex items-start gap-2 text-slate-300">
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5 font-mono text-[9px] text-cyan-300">{i + 1}</span>
                                <span>{s.section.replace(/^Scene \d+ · /, "")}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    </div>
);

// =================================================================
// SCENE HEADER + NARRATION + INDEX
// =================================================================
const SceneHeader = ({ scene, current, total, paused, speaking, muted, onPauseResume, onMute, onPrev, onNext, onJump, scenes }) => (
    <div className="sticky top-[72px] z-20 mt-2 flex flex-col gap-3 rounded-md border border-white/10 bg-ink-900/85 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400" data-testid="airport-scene-indicator">
                    Scene {scene + 1} of {total}
                </span>
                <span className="rounded-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">{current.section}</span>
                {speaking && !muted && <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> NARRATING</span>}
                {paused && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PAUSED</span>}
            </div>
            <h2 className="font-heading mt-1 truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{current.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={onPrev} icon={SkipBack} label="Prev scene" testid="airport-control-prev" disabled={scene <= 0} />
            <Btn onClick={onPauseResume} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} primary testid="airport-control-pause" />
            <Btn onClick={onNext} icon={SkipForward} label="Next scene" testid="airport-control-next" disabled={scene >= total - 1} />
            <Btn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Voice On" : "Voice Off"} testid="airport-control-mute" />
            <select data-testid="airport-control-jump" value={scene} onChange={(e) => onJump(Number(e.target.value))} aria-label="Jump to scene" className="rounded-md border border-white/10 bg-ink-900 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200 focus:border-cyan-500/50 focus:outline-none">
                {scenes.map((s, i) => (<option key={i} value={i}>{String(i + 1).padStart(2, "0")} · {s.section}</option>))}
            </select>
        </div>
    </div>
);

const Btn = ({ onClick, icon: Icon, label, primary, testid, disabled }) => (
    <button onClick={onClick} data-testid={testid} disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all disabled:cursor-not-allowed disabled:opacity-40 ${primary ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900" : "border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"}`}>
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
// SCENE STAGES
// =================================================================
const AIRPORT_BG_MAP = {
    terminal:    SCENE_IMG_AIRPORT.terminal,
    overlay:     SCENE_IMG_AIRPORT.command,
    command:     SCENE_IMG_AIRPORT.command,
    revenue:     SCENE_IMG_AIRPORT.revenue,
    operations:  SCENE_IMG_AIRPORT.operations,
    maintenance: SCENE_IMG_AIRPORT.maintenance,
    vendors:     SCENE_IMG_AIRPORT.vendors,
    passengers:  SCENE_IMG_AIRPORT.passengers,
    growth:      SCENE_IMG_AIRPORT.growth,
};

const AIRPORT_STAGE_BADGES = {
    terminal:    "Terminal Reality · Fragmented Systems",
    overlay:     "Overlay, Not Replacement",
    command:     "Unified Command View",
    revenue:     "Revenue Intelligence · Per Passenger",
    operations:  "Operational Control · Live",
    maintenance: "Asset Lifecycle · 4-State",
    vendors:     "Vendor & Contract Enforcement",
    passengers:  "BodyIQ-AI Passenger Signal",
    growth:      "Airport Growth Engine",
};

const AirportStageImage = ({ src, alt, badge }) => (
    <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md border border-cyan-500/20 sm:h-40 lg:h-48" data-testid="airport-stage-image">
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/30 to-transparent" />
        {badge && (
            <span className="absolute bottom-2 left-2 rounded-full border border-cyan-500/40 bg-ink-900/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-md">
                {badge}
            </span>
        )}
    </div>
);

const SceneStage = ({ scene }) => {
    const img = AIRPORT_BG_MAP[scene.focus];
    const badge = AIRPORT_STAGE_BADGES[scene.focus];
    return (
        <div className="space-y-0">
            {img && <AirportStageImage src={img} alt={badge || scene.section} badge={badge} />}
            <InnerSceneStage scene={scene} />
        </div>
    );
};

const InnerSceneStage = ({ scene }) => {
    switch (scene.focus) {
        case "terminal":    return <TerminalStage />;
        case "overlay":     return <OverlayStage />;
        case "command":     return <CommandStage />;
        case "revenue":     return <RevenueStage />;
        case "operations":  return <OperationsStage />;
        case "maintenance": return <MaintenanceStage />;
        case "vendors":     return <VendorsStage />;
        case "passengers":  return <PassengerSignalStage />;
        case "growth":      return <GrowthStage />;
        default:            return null;
    }
};

// ---- Scene 1: Terminal reality — 8 fragmented systems
const TerminalStage = () => {
    const systems = [
        { name: "SITA",              label: "Passenger · Baggage", status: "active" },
        { name: "Sabre",             label: "Flight · Reservation", status: "active" },
        { name: "Amadeus",           label: "Booking · Inventory",  status: "active" },
        { name: "Concession POS",    label: "Retail · F&B",         status: "active" },
        { name: "Ground Handling",   label: "Crew · Equipment",     status: "active" },
        { name: "Maintenance ERP",   label: "Jet bridges · HVAC",   status: "active" },
        { name: "Vendor Contracts",  label: "SLAs · Invoices",      status: "active" },
        { name: "Parking & Ground Tx", label: "Revenue · Capacity", status: "active" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-terminal">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Layers size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Terminal Systems Inventory · today</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">No unified view</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {systems.map((s, i) => (
                    <div key={s.name} className="rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-semibold text-white">{s.name}</span>
                            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        </div>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{s.label}</p>
                    </div>
                ))}
            </div>
            <p className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Each system works. None of them talk. Decisions live in spreadsheets.
            </p>
        </div>
    );
};

// ---- Scene 2: Overlay, not replacement
const OverlayStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-overlay">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Radar size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI Overlay</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Read-only by default · write-back scoped</span>
        </div>

        <div className="mt-4 rounded-sm border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Intelligence Layer · CreatorBoostAI</p>
            <p className="font-heading mt-2 text-lg font-semibold text-white sm:text-xl">Revenue · Operations · Lifecycle — unified</p>
        </div>

        <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">reads · does not replace</span>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {["SITA", "Sabre", "Amadeus", "Concession POS", "Ground Handling", "Maintenance ERP", "Vendor Contracts", "Parking & Tx"].map((s, i) => (
                    <div key={s} className="rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                        <span className="font-mono text-[10px] font-semibold text-slate-200">{s}</span>
                    </div>
                ))}
            </div>
        </div>

        <p className="mt-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">We sit on top. We connect. We do not replace anything your airport already runs.</span>
        </p>
    </div>
);

// ---- Scene 3: Unified command view
const CommandStage = () => {
    const tiles = [
        { Icon: Users,       label: "Passengers · live",       value: "42,184", sub: "on-terminal" },
        { Icon: Store,       label: "Concession $/sq ft",       value: "$1,284", sub: "rolling 24h" },
        { Icon: Gauge,       label: "Gate utilization",          value: "87.4%", sub: "peak window" },
        { Icon: MonitorSpeaker, label: "Crews on deck",          value: "128",    sub: "45 shifts" },
        { Icon: Clock,       label: "Turnaround · avg",          value: "38 min", sub: "−6 min vs Q" },
        { Icon: Wrench,      label: "Open work orders",          value: "47",     sub: "4 critical" },
        { Icon: FileSignature, label: "Contracts expiring ≤90d", value: "12",     sub: "$4.2M ARR" },
        { Icon: Activity,    label: "Assets · on-field",         value: "1,842",  sub: "tracked" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-command">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Activity size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Unified Command · read-only</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> LIVE
                </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((t, i) => (
                    <div key={t.label} className="rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-center gap-2">
                            <t.Icon size={12} className="text-cyan-400" />
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{t.label}</span>
                        </div>
                        <p className="font-heading mt-2 text-xl font-semibold text-cyan-300">{t.value}</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{t.sub}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- Scene 4: Revenue intelligence
const RevenueStage = () => {
    const streams = [
        { name: "Concessions · T2 Retail Row", rev: "$2.84M",  vs: "+18% vs plan",  status: "under-performing peer",  tone: "amber" },
        { name: "Parking · Structure B",        rev: "$918K",   vs: "−12% Tuesdays",  status: "dynamic pricing gap",   tone: "amber" },
        { name: "Lounge · Intl Concourse",      rev: "$1.42M",  vs: "occupancy 68%",  status: "capacity on table",     tone: "amber" },
        { name: "F&B · Pier D",                 rev: "$3.11M",  vs: "+24% QoQ",       status: "layout optimized",      tone: "cyan"  },
        { name: "Advertising · digital",        rev: "$640K",   vs: "+8% YoY",        status: "rate card due",         tone: "amber" },
        { name: "Duty-free · Concourse A",      rev: "$4.26M",  vs: "+6% YoY",        status: "dwell-attributed",      tone: "cyan"  },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-revenue">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Revenue Intelligence · per passenger</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Last 30 days</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Stream</th>
                            <th className="px-4 py-3">Revenue</th>
                            <th className="px-4 py-3">Signal</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {streams.map((s, i) => (
                            <tr key={s.name} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{s.rev}</td>
                                <td className="px-4 py-3 font-mono text-[10px] text-slate-300">{s.vs}</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${s.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"}`}>
                                        {s.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI label="Revenue per passenger" value="$18.42" trend="+$1.80 trailing 90d" />
                <KPI label="Recoverable gap" value="$6.4M" trend="annualized · surfaced" />
                <KPI label="Streams monitored" value="24 / 24" trend="no new integrations required" />
            </div>
        </div>
    );
};

// ---- Scene 5: Operational control
const OperationsStage = () => {
    const gates = [
        { g: "Gate B12",  use: "94%", turn: "34 min", crew: "ready",    tone: "cyan"  },
        { g: "Gate C04",  use: "72%", turn: "46 min", crew: "short",    tone: "amber" },
        { g: "Gate D18",  use: "88%", turn: "39 min", crew: "ready",    tone: "cyan"  },
        { g: "Gate A07",  use: "61%", turn: "52 min", crew: "idle ×4",  tone: "amber" },
        { g: "Gate E22",  use: "91%", turn: "36 min", crew: "ready",    tone: "cyan"  },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-operations">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Gauge size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Gate · Crew · Turnaround · live</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Sourced from ground-handling schedulers</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
                {gates.map((g, i) => (
                    <div key={g.g} className="rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{g.g}</p>
                        <p className="font-heading mt-1 text-xl font-semibold text-cyan-300">{g.use}</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">turn {g.turn}</p>
                        <span className={`mt-2 inline-block rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${g.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{g.crew}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI label="Avg turnaround" value="38 min" trend="−6 min vs Q" />
                <KPI label="Baggage transit · median" value="12.4 min" trend="−2.1 min" />
                <KPI label="Delay cascades · caught early" value="17 / 18" trend="before ramp impact" />
            </div>
        </div>
    );
};

// ---- Scene 6: Maintenance & lifecycle
const MaintenanceStage = () => {
    const assets = [
        { id: "JB-B12",   name: "Jet bridge · B12",   state: "Deployed",        pos: "year 6 of 15",  flag: "healthy",           tone: "cyan"  },
        { id: "BB-C2",    name: "Baggage belt · C2",   state: "Deployed",        pos: "year 11 of 15", flag: "3 calls / 90d · REPLACE", tone: "amber" },
        { id: "HVAC-RT1", name: "HVAC · RT-1 (Pier D)", state: "Approved",      pos: "13yr · EOL",    flag: "capital plan · Q3", tone: "amber" },
        { id: "ESC-A3",   name: "Escalator · A3",      state: "Identified",      pos: "year 8 of 12",  flag: "vibration trend",    tone: "amber" },
        { id: "GSE-DI-4", name: "De-icing rig · 4",    state: "Savings verified", pos: "yr 1 post-upgrade", flag: "$184K energy saved", tone: "cyan" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-maintenance">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Wrench size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Asset Lifecycle · 4-state</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Identified → Approved → Deployed → Savings verified</span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
                {["Identified", "Approved", "Deployed", "Savings verified"].map((s, i) => (
                    <div key={s} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-2.5 text-center fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{s}</p>
                        <p className="font-heading mt-1 text-base font-semibold text-white">{[428, 124, 1142, 148][i]}</p>
                    </div>
                ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Asset</th>
                            <th className="px-4 py-3">State</th>
                            <th className="px-4 py-3">Position</th>
                            <th className="px-4 py-3">Signal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((a, i) => (
                            <tr key={a.id} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{a.name} <span className="font-mono text-[10px] text-slate-500">· {a.id}</span></td>
                                <td className="px-4 py-3"><span className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">{a.state}</span></td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{a.pos}</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${a.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"}`}>
                                        {a.flag}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- Scene 7: Vendors & contracts
const VendorsStage = () => {
    const rows = [
        { v: "GroundOps Intl", sla: "99.2%", inv: "$4.28M / yr", flag: "2 service calls covered under warranty · flagged before pay", tone: "amber" },
        { v: "TermClean Co.",  sla: "98.4%", inv: "$1.12M / yr", flag: "renewal in 84d · renegotiate window", tone: "amber" },
        { v: "FilterPro",      sla: "97.8%", inv: "$820K / yr",  flag: "rate +18% vs market · ESCALATE", tone: "amber" },
        { v: "RampSec Partners", sla: "99.6%", inv: "$2.42M / yr", flag: "within SLA · renewal in 214d", tone: "cyan" },
        { v: "Lounge Hosp.",   sla: "96.1%", inv: "$1.80M / yr", flag: "underperforming occupancy target", tone: "amber" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-vendors">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <FileSignature size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Vendor · Contract · Warranty Enforcement</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">60/90/120-day renewal windows · live</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Vendor</th>
                            <th className="px-4 py-3">SLA</th>
                            <th className="px-4 py-3">Invoice</th>
                            <th className="px-4 py-3">Enforcement signal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.v} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{r.v}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{r.sla}</td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{r.inv}</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${r.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"}`}>
                                        {r.flag}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-amber-300">$1.84M</span> in repairs paid last year that should have been covered under active warranties — now flagged before payment.
            </div>
        </div>
    );
};

// ---- Scene 8: Passenger signal layer (BodyIQ-AI)
const PassengerSignalStage = () => {
    const clusters = [
        { code: "FRX-1102", loc: "Self-service kiosk · T2", au: "AU 4 + AU 7", intensity: 0.64, cls: "negative", action: "friction → staff assist" },
        { code: "DEC-2208", loc: "Duty-free · Concourse A",  au: "AU 1 + AU 2", intensity: 0.72, cls: "mixed",    action: "decision hesitation → offer" },
        { code: "DWL-3102", loc: "F&B · Pier D",              au: "dwell 84s",   intensity: 0.58, cls: "positive", action: "purchase predicted" },
        { code: "STR-4018", loc: "Security · Lane 6",         au: "AU 4 + jaw",  intensity: 0.67, cls: "negative", action: "stress spike → open lane" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-passengers">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Radar size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">BodyIQ-AI · Passenger Signal Clusters</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Structured · airport-grade</span>
            </div>
            <div className="mt-4 space-y-2">
                {clusters.map((c, i) => (
                    <div key={c.code} className="grid grid-cols-1 gap-2 rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up lg:grid-cols-6" style={{ animationDelay: `${i * 70}ms` }}>
                        <span className="font-mono text-[11px] font-semibold text-cyan-300 lg:col-span-1">{c.code}</span>
                        <span className="font-mono text-[10px] text-slate-300 lg:col-span-2">{c.loc}</span>
                        <span className="font-mono text-[10px] text-slate-400 lg:col-span-1">{c.au}</span>
                        <span className="font-mono text-[10px] text-slate-300 lg:col-span-1">int {c.intensity.toFixed(2)} · <span className={c.cls === "negative" ? "text-amber-300" : c.cls === "mixed" ? "text-amber-300" : "text-cyan-300"}>{c.cls}</span></span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 lg:col-span-1">→ {c.action}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI label="Revenue per passenger" value="+$1.42" trend="signal-attributed lift" />
                <KPI label="Wait-time reduction" value="−23%" trend="security + check-in" />
                <KPI label="Concession conversion" value="+11.8%" trend="dwell-optimized layout" />
            </div>
        </div>
    );
};

// ---- Scene 9: The airport growth engine (closing)
const GrowthStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-7 lg:p-12 fade-in-up shadow-[0_0_60px_rgba(6,182,212,0.18)]" data-testid="stage-growth">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Airport Growth Engine · Closing</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-5">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">More revenue</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    Concessions, parking, advertising, and lounges measured against live passenger signal —
                    not last quarter's report.
                </p>
            </div>
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-5">
                <div className="flex items-center gap-2">
                    <Gauge size={14} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Better operations</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    One decision surface across gates, crews, baggage, and turnaround. Fragmentation ends.
                </p>
            </div>
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-5">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Every asset accounted for</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    Lifecycle, warranty, vendor, and contract data reconciled continuously — not at audit time.
                </p>
            </div>
        </div>

        <div className="mt-7 rounded-sm border border-white/10 bg-ink-900 p-5">
            <div className="flex items-center gap-2">
                <Building2 size={13} className="text-cyan-300" />
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">System positioning</p>
            </div>
            <p className="font-heading mt-3 text-xl font-semibold leading-snug text-white sm:text-2xl">
                Sits on top of SITA · Sabre · Amadeus · concessions · ground handling · maintenance · vendors.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
                CreatorBoostAI does not replace your existing systems. It connects them, reads across them,
                and turns them into revenue, control, and lifecycle intelligence.
            </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
                to="/contact?intent=enterprise&source_demo=airport"
                data-testid="airport-closing-cta-enterprise"
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:bg-cyan-400"
            >
                <Send size={14} /> Request the airport brief
                <ArrowRight size={13} />
            </Link>
            <Link
                to="/contact?intent=setup-call&source_demo=airport"
                data-testid="airport-closing-cta-setup"
                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
            >
                Book a setup call <ArrowRight size={12} />
            </Link>
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
            const res = await shareDemo({ recipient_email: email, demo_type: "airport", share_target: url });
            trackEvent?.("share_send", { recipient_email: email });
            if (res?.sent) toast.success(`Sent to ${email}.`);
            else toast.message("Share recorded — email will deliver once Resend keys land.");
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
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-ink-700/40 p-6 fade-in-up" data-testid="airport-share-module">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Share this demo</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white">For your aviation authority, your operations team, your enterprise partners.</h3>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="recipient@airport.com"
                            data-testid="airport-share-email"
                            className="flex-1 rounded-sm border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                        />
                        <button
                            onClick={send}
                            disabled={busy}
                            data-testid="airport-share-send"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                        >
                            <Send size={14} /> {busy ? "Sending…" : "Send Private Link"}
                        </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            onClick={copy}
                            data-testid="airport-share-copy"
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                        >
                            <Copy size={12} /> Copy link
                        </button>
                        <button
                            onClick={onReplay}
                            data-testid="airport-replay"
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
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">QR · Boardroom Ready</span>
                        </div>
                        <div className="mt-3 flex items-center justify-center rounded-sm bg-ink-800 p-3" data-testid="airport-qr">
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
const KPI = ({ label, value, trend }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="font-heading mt-1 text-lg font-semibold text-cyan-300 sm:text-xl">{value}</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{trend}</p>
    </div>
);
