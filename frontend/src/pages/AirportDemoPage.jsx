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
    Wrench, Users, FileSignature, TrendingUp, TrendingDown, Activity, Gauge,
    Radar, CheckCircle2, AlertTriangle, Clock, DollarSign, MonitorSpeaker,
    ClipboardList, PiggyBank, Crown, Trophy, Handshake, LineChart, Bell,
    Calendar, FileCheck2, BadgeCheck, Hammer, AlertCircle,
} from "lucide-react";
import { KoolliteDualPathStrip } from "@/components/koollite/KoolliteDualPath";
import { ExecutiveAvatar } from "@/components/avatar/ExecutiveAvatar";

// =================================================================
// 9 FULL SCENES · ~9–10 min auto-played · SITA-Style Airport Enterprise Demo
//
// Positioning rule (CRITICAL): CreatorBoostAI sits ON TOP of existing
// airport systems (SITA · Sabre · Amadeus · concession POS · ground-
// handling schedulers · maintenance ERPs · vendor contract stores).
// It NEVER replaces them. It connects them, reads across them, and
// makes them more profitable.
//
// Scene order (user spec):
//  1. Airport overview / problem
//  2. Revenue leakage visibility
//  3. Command center (AI overlay on existing systems)
//  4. Operations intelligence
//  5. Maintenance + service tracking
//  6. Equipment lifecycle + end-of-life detection
//  7. Vendor performance + contract visibility
//  8. Passenger + revenue optimization
//  9. Growth + contract wins + future state
//
// Every scene includes: avatar narration · on-screen UI simulation ·
// quantified business outcome (money gained · control improved ·
// contracts won).
// =================================================================
const SCENES = [
    {
        id: "problem",
        section: "Scene 1 · The Airport Problem",
        title: "A modern airport. Dozens of systems. No unified control.",
        focus: "problem",
        fallback_ms: 62000,
        narration:
            "Picture a modern international airport. Seventy-two gates. Three terminals. " +
            "Fourteen million passengers a year. One hundred forty concessionaires. Eighteen " +
            "ground-handling vendors. Three thousand two hundred tracked assets on the field. " +
            "Every one of those operations already runs on a system. SITA for passenger and " +
            "baggage data. Sabre and Amadeus for reservations and inventory. Concession point-" +
            "of-sale for retail revenue. Ground-handling schedulers for crews and equipment. " +
            "Maintenance ERPs for jet bridges, HVAC, belts, elevators. Vendor contract stores " +
            "for cleaning, security, catering, advertising. The airport has paid for all of " +
            "them. They work. But they don't talk to each other. And the data they produce " +
            "never becomes decisions. Revenue leaks out every day. Contracts go unenforced. " +
            "Equipment fails past its useful life. No one has a single screen where it all " +
            "comes together. That is the problem CreatorBoostAI was built to solve.",
    },
    {
        id: "leakage",
        section: "Scene 2 · Revenue Leakage, Made Visible",
        title: "Every dollar the airport is losing — surfaced in one view.",
        focus: "leakage",
        fallback_ms: 66000,
        narration:
            "Before we show you the solution, let's show you what the solution is worth. " +
            "The overlay reads every revenue stream the airport already owns and finds the " +
            "money leaking out. Concession leakage. Shop A earns one thousand two hundred " +
            "eighty-four dollars per square foot. Shop B, same footprint, same traffic, earns " +
            "four hundred twelve. The gap is worth two point six million a year. Parking " +
            "leakage. Structure B runs forty percent under capacity on Tuesdays — dynamic " +
            "pricing window missed, nine hundred sixty thousand a year left on the table. " +
            "Lounge leakage. International concourse lounge caps at sixty-eight percent " +
            "occupancy during peak — one point one million in subscription and day-pass " +
            "revenue unrealized. Advertising leakage. Digital displays run thirty-eight " +
            "percent unsold inventory during red-eye windows — six hundred forty thousand " +
            "in direct revenue gone. Add duty-free under-attribution, unsold gate advertising, " +
            "and unmonetized dwell time, and the airport is leaking over six point four " +
            "million dollars every single year — measurable, recoverable, and never once " +
            "surfaced on any existing dashboard.",
    },
    {
        id: "command",
        section: "Scene 3 · The Command Center",
        title: "The overlay appears. Every system, one live screen.",
        focus: "command",
        fallback_ms: 60000,
        narration:
            "This is the CreatorBoostAI command center. It sits on top of every system the " +
            "airport already runs. SITA. Sabre. Amadeus. Concession point-of-sale. Ground-" +
            "handling schedulers. Maintenance ERPs. Vendor contract stores. We do not rip " +
            "anything out. We do not compete with the vendors the airport has already chosen. " +
            "We sit on top. Read-only by default. Write-back is scoped, optional, and fully " +
            "audit-logged. On a single screen, airport leadership sees passenger throughput " +
            "by terminal. Concession revenue per square foot. Gate utilization. Crew status. " +
            "Baggage transit time. Open work orders. Contracts expiring within ninety days. " +
            "Assets on-field. Every number live, every number sourced from a system the " +
            "airport already paid for. This is not a replacement. This is control — finally " +
            "unified, finally visible, finally actionable.",
    },
    {
        id: "operations",
        section: "Scene 4 · Operations Intelligence",
        title: "Gates, crews, baggage, turnaround — decided live, not reviewed later.",
        focus: "operations",
        fallback_ms: 64000,
        narration:
            "Operations next. Every gate is scored for utilization. Every crew is tracked " +
            "for dispatch state. Every bag is measured end-to-end for transit time. Every " +
            "turnaround is graded — aircraft by aircraft, gate by gate, carrier by carrier. " +
            "When a turnaround consistently runs long at gate C-04, the overlay flags it " +
            "before the airline does. When crew at gate A-07 sits idle for four minutes " +
            "between rotations, the overlay flags it before the shift report is filed. " +
            "When a baggage belt transit time climbs out of tolerance, the overlay flags " +
            "it before passengers reach the carousel. And when a single aircraft delay " +
            "starts to propagate — through ground handling, through gate assignment, " +
            "through connecting flights — the overlay shows the cascade before it reaches " +
            "the ramp. The outcome is measurable. Average turnaround dropped six minutes. " +
            "Baggage transit median dropped two point one minutes. Delay cascades caught " +
            "early, seventeen of the last eighteen. The data was already in the systems. " +
            "The intelligence layer made it usable.",
    },
    {
        id: "service",
        section: "Scene 5 · Maintenance & Service Tracking",
        title: "Every work order. Every service call. Every history, in one ledger.",
        focus: "service",
        fallback_ms: 66000,
        narration:
            "Now we open the maintenance layer. Every work order the airport generates — " +
            "preventive, corrective, emergency — is captured. Every service call from every " +
            "vendor is logged against the asset that was serviced. Every technician visit " +
            "is time-stamped, parts are itemized, and labor hours are reconciled against " +
            "the contract. Consider jet bridge B-twelve. Twelve service calls in the last " +
            "ninety days. Three different vendors. Total invoice, forty-two thousand dollars. " +
            "The overlay shows the pattern: the same hydraulic issue recurring every fourteen " +
            "to twenty-one days. The fix? Replace the manifold — one part, one install, " +
            "four thousand two hundred dollars. Payback, less than sixty days. Without this " +
            "ledger, the airport would keep paying thirty-eight thousand a year forever. " +
            "Maintenance ERPs are great at logging what happened. They are not built to " +
            "surface patterns, cross-reference warranty coverage, or compare vendor pricing. " +
            "The overlay does all three, continuously.",
    },
    {
        id: "lifecycle",
        section: "Scene 6 · Equipment Lifecycle & End-of-Life Alerts",
        title: "Every asset — cradle to retirement — continuously scored.",
        focus: "lifecycle",
        fallback_ms: 64000,
        narration:
            "Every major asset on the field is registered in the lifecycle ledger. Install " +
            "date. Manufacturer. Warranty terms. Service history. Performance trend. Expected " +
            "useful life. Each asset moves through four states. Identified. Approved. " +
            "Deployed. Savings verified. Today on this airport, four hundred twenty-eight " +
            "assets are identified as upgrade candidates. One hundred twenty-four are " +
            "approved and queued. One thousand one hundred forty-two are deployed and in " +
            "service. One hundred forty-eight have completed a full upgrade cycle and are " +
            "in the savings-verified state. More importantly — the system generates " +
            "end-of-life alerts. HVAC rooftop unit RT-one, Pier D. Thirteen years old. " +
            "Manufacturer declared end-of-life. Failure probability in next twelve months, " +
            "sixty-four percent. Action: capital plan, Q3 replacement window. Escalator A-3. " +
            "Vibration trend crossing threshold. Bearing replacement recommended before " +
            "unplanned downtime. De-icing rig 4 completed its upgrade last year and is " +
            "already running one hundred eighty-four thousand dollars under its historical " +
            "energy spend. The airport no longer discovers end-of-life during a failure. " +
            "The overlay tells it first.",
    },
    {
        id: "vendors",
        section: "Scene 7 · Vendor Performance & Contract Visibility",
        title: "The contracts the airport already signed — finally enforced.",
        focus: "vendors",
        fallback_ms: 62000,
        narration:
            "Contracts and vendors. Every service agreement the airport has signed — " +
            "ground handling, terminal cleaning, security, catering, advertising, concession " +
            "master agreements, parking operators — is loaded into the overlay. Service-" +
            "level agreements are read in, line by line. Invoices are cross-checked against " +
            "performance, against warranty coverage, and against market benchmark rates. " +
            "Consider what the overlay has caught this quarter. GroundOps International, " +
            "two service calls invoiced at full rate — both covered under an active " +
            "manufacturer warranty. Flagged before pay. Value recovered, twenty-eight " +
            "thousand dollars. FilterPro, invoicing eighteen percent above the regional " +
            "market benchmark. Escalated to procurement. Annualized savings if renegotiated, " +
            "one hundred forty-eight thousand. Lounge Hospitality Partners, missing the " +
            "ninety-eight percent uptime SLA for the fourth consecutive month. Penalty " +
            "clause triggered for the first time in three years, seventy-two thousand in " +
            "service credits. Renewal windows surface at sixty, ninety, and one hundred " +
            "twenty days — no more last-minute auto-renewals. The vendors stay. The " +
            "accountability is new.",
    },
    {
        id: "passengers",
        section: "Scene 8 · Passenger Signal & Revenue Optimization",
        title: "BodyIQ-AI turns every passenger touchpoint into measurable revenue.",
        focus: "passengers",
        fallback_ms: 62000,
        narration:
            "The passenger layer activates. BodyIQ-AI — our behavioral intelligence engine — " +
            "applies airport-grade signal measurement to every touchpoint that drives " +
            "revenue. Check-in. Security. Retail. Food and beverage. Lounge entry. Gate " +
            "dwell. The system reads structured signals, never adjectives. Friction at a " +
            "self-service kiosk. Decision hesitation at a duty-free display. Dwell patterns " +
            "that predict purchase. Stress signatures in a security line. Each signal is " +
            "a cluster — anchored to anatomy, scored by intensity, classified positive, " +
            "mixed, or negative. Every cluster connects to an action the airport can take. " +
            "Friction at the kiosk — dispatch staff assist, reducing abandonment eleven " +
            "percent. Hesitation at duty-free — push a targeted offer, lifting conversion " +
            "four point two points. Security stress spike — open an additional lane, " +
            "trimming median wait twenty-three percent. Dwell-attributed purchase modeling " +
            "adds one dollar and forty-two cents to revenue per passenger. On fourteen " +
            "million passengers a year, that is nineteen point eight million dollars of new " +
            "annual revenue — surfaced, attributed, and auditable.",
    },
    {
        id: "growth",
        section: "Scene 9 · Growth · Contract Wins · Future State",
        title: "More revenue. Better operations. New contracts won.",
        focus: "growth",
        fallback_ms: 62000,
        narration:
            "Let's close with outcomes. Year one with CreatorBoostAI. Six point four million " +
            "in recoverable revenue leakage, surfaced and addressed. One point eight four " +
            "million in wrongly paid repairs, recovered under warranty enforcement. " +
            "Nineteen point eight million in new passenger-layer revenue. Average turnaround " +
            "down six minutes. Delay cascades caught early ninety-four percent of the time. " +
            "But there is a second story. Contract wins. Because the airport can now prove " +
            "performance, quantify capacity, and surface under-served demand — the airport " +
            "wins new contracts. A new catering master agreement, three point two million " +
            "annually. Two new retail concession deals, four point one million combined. " +
            "An extended ground-services contract, seven point six million over three years. " +
            "An airline lounge partnership backed by verified occupancy data, two point " +
            "eight million annually. The future state is simple. More revenue. Better " +
            "operations. Every asset accounted for. New contracts won on the strength of " +
            "data the airport already owned — but had never been able to use. CreatorBoostAI " +
            "does not replace SITA, Sabre, Amadeus, or any system the airport already runs. " +
            "It sits on top of them. And it makes them more profitable.",
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
        () => SCENES.reduce((a, s) => a + (s.fallback_ms || 62000), 0),
        []
    );
    const elapsedBeforeScene = useMemo(
        () => SCENES.slice(0, scene).reduce((a, s) => a + (s.fallback_ms || 62000), 0),
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
        const maxMs = sc.fallback_ms || 62000;
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
            const remaining = Math.max(2000, (current.fallback_ms || 62000) + 1500 - sceneElapsed);
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
                                <div className="flex justify-center">
                                    <ExecutiveAvatar
                                        variant="demo-cinematic"
                                        registry="airport"
                                        sceneId={current?.id}
                                        sceneIndex={scene}
                                        sceneCount={total}
                                        sceneLabel={current?.section?.replace(/^Scene \d+ · /, "")}
                                        paused={paused}
                                        speaking={speaking}
                                        chipAccent="cyan"
                                        testId="airport-demo-avatar"
                                    />
                                </div>
                                <NarrationPanel
                                    narration={current.narration}
                                    speaking={speaking} muted={muted} paused={paused}
                                    onMute={handleMute}
                                />
                                <BusinessOutcomePanel focus={current.focus} />
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
                    "Revenue leakage recovery + passenger-layer revenue lift",
                    "Gate, crew, baggage & turnaround control surface",
                    "Asset lifecycle · EOL alerts · vendor & contract enforcement",
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
            <span className="text-cyan-300">SITA, Sabre, Amadeus, concession POS, ground-handling schedulers, maintenance ERPs, vendor contracts</span>{" "}
            — and makes them more profitable. We don't replace. We connect, we surface leakage, and we turn operational data into recoverable revenue.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching, progress, personalization }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console · Enterprise</p>
                {personalization?.greeting && (
                    <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200" data-testid="airport-start-personalized">
                        {personalization.greeting}
                    </p>
                )}
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                    Run the 9-scene Airport Enterprise walkthrough.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated nine-scene cinematic walkthrough — narrated by a clear,
                    professional female voice — for airport authorities, aviation operators,
                    ground-handling partners, and enterprise leadership. Every scene quantifies
                    the business outcome: money recovered, control improved, contracts won.
                    Approximately 9 to 10 minutes.
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
                        Auto-plays · ~9–10 min · Voice: Sage (female · American)
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "9 full cinematic scenes",
                        "Sits on top of SITA · Sabre · Amadeus",
                        "Revenue leakage · lifecycle · vendor enforcement",
                        "Each scene quantifies the business outcome",
                    ].map((b) => (
                        <li key={b} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <Check size={13} className="text-cyan-400" /> {b}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="lg:col-span-5">
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">The story arc · 9 scenes</p>
                    <ol className="mt-4 space-y-2 text-sm">
                        {SCENES.map((s, i) => (
                            <li key={s.id} className="flex items-start gap-2 text-slate-300">
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5 font-mono text-[9px] text-cyan-300">{i + 1}</span>
                                <span>{s.section.replace(/^Scene \d+ · /, "")}</span>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Every scene ends with a quantified outcome — money, control, or contracts.
                    </p>
                </div>
            </div>
        </div>
    </div>
);

// =================================================================
// SCENE HEADER · NARRATION · INDEX · BUSINESS OUTCOME
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
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Narration · Sage (female · clear)</span>
            </div>
            <button onClick={onMute} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 hover:text-cyan-300">
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />} <span>{muted ? "Off" : "On"}</span>
            </button>
        </div>
        <div className="mt-3 max-h-[22rem] overflow-y-auto pr-1">
            <p className={`text-sm leading-relaxed text-slate-200 transition-opacity ${speaking && !muted && !paused ? "opacity-100" : "opacity-80"}`}>{narration}</p>
        </div>
    </div>
);

// ---- Per-scene quantified business outcome panel ---------------------
const BUSINESS_OUTCOMES = {
    problem: {
        kicker: "Scope of the problem",
        tiles: [
            { Icon: Layers,        value: "8",        label: "Fragmented systems" },
            { Icon: DollarSign,    value: "$6.4M",    label: "Annual revenue leaking" },
            { Icon: AlertTriangle, value: "0",        label: "Unified decisions today" },
        ],
    },
    leakage: {
        kicker: "Recoverable revenue",
        tiles: [
            { Icon: PiggyBank,  value: "$6.4M",    label: "Leakage surfaced · annual" },
            { Icon: TrendingUp, value: "$2.6M",    label: "Concessions re-merchandised" },
            { Icon: TrendingUp, value: "$1.1M",    label: "Lounge capacity monetized" },
        ],
    },
    command: {
        kicker: "Control unified",
        tiles: [
            { Icon: Gauge,      value: "1 screen", label: "Instead of 9 dashboards" },
            { Icon: Shield,     value: "Read-only", label: "Default · write-back scoped" },
            { Icon: CheckCircle2, value: "100%",   label: "Audit-logged actions" },
        ],
    },
    operations: {
        kicker: "Operational lift",
        tiles: [
            { Icon: Clock,      value: "−6 min",   label: "Avg turnaround" },
            { Icon: TrendingDown, value: "−2.1 min", label: "Baggage transit median" },
            { Icon: BadgeCheck, value: "17 / 18",  label: "Delay cascades caught early" },
        ],
    },
    service: {
        kicker: "Service cost recovered",
        tiles: [
            { Icon: Wrench,       value: "$38K/yr", label: "Jet bridge B-12 · avoided" },
            { Icon: ClipboardList, value: "1,842",  label: "Work orders · on ledger" },
            { Icon: DollarSign,   value: "62 days", label: "Payback · replace manifold" },
        ],
    },
    lifecycle: {
        kicker: "Lifecycle control",
        tiles: [
            { Icon: Bell,          value: "47",       label: "EOL alerts · this quarter" },
            { Icon: Hammer,        value: "124",      label: "Upgrades approved · queued" },
            { Icon: DollarSign,    value: "$184K",    label: "De-icing · energy saved YoY" },
        ],
    },
    vendors: {
        kicker: "Vendors held accountable",
        tiles: [
            { Icon: FileCheck2,   value: "$248K",     label: "Recovered · warranty + rate" },
            { Icon: AlertCircle,  value: "$72K",      label: "SLA penalty · triggered" },
            { Icon: Calendar,     value: "60/90/120", label: "Renewal windows surfaced" },
        ],
    },
    passengers: {
        kicker: "Passenger-layer revenue",
        tiles: [
            { Icon: DollarSign,    value: "+$1.42",   label: "Revenue per passenger" },
            { Icon: TrendingUp,    value: "$19.8M",   label: "Annual · 14M pax" },
            { Icon: TrendingDown,  value: "−23%",     label: "Security median wait" },
        ],
    },
    growth: {
        kicker: "Year-one outcomes",
        tiles: [
            { Icon: DollarSign,    value: "$28M+",    label: "Revenue + recovery · Yr1" },
            { Icon: Handshake,     value: "4 wins",   label: "New contracts closed" },
            { Icon: Trophy,        value: "$17.7M",   label: "New contract value · Yr1" },
        ],
    },
};

const BusinessOutcomePanel = ({ focus }) => {
    const o = BUSINESS_OUTCOMES[focus];
    if (!o) return null;
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-700/40 p-4" data-testid="airport-business-outcome">
            <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2.5">
                <TrendingUp size={13} className="text-cyan-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{o.kicker}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
                {o.tiles.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-sm border border-white/10 bg-ink-900 p-2.5">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10">
                            <t.Icon size={13} className="text-cyan-300" />
                        </span>
                        <div className="min-w-0">
                            <p className="font-heading text-sm font-semibold text-cyan-300 sm:text-base">{t.value}</p>
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{t.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SceneIndex = ({ current, total }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Scene Index</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{current + 1} / {total}</span>
        </div>
        <ul className="mt-3 space-y-1.5 max-h-60 overflow-y-auto pr-1">
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
    problem:    SCENE_IMG_AIRPORT.terminal,
    leakage:    SCENE_IMG_AIRPORT.revenue,
    command:    SCENE_IMG_AIRPORT.command,
    operations: SCENE_IMG_AIRPORT.operations,
    service:    SCENE_IMG_AIRPORT.maintenance,
    lifecycle:  SCENE_IMG_AIRPORT.maintenance,
    vendors:    SCENE_IMG_AIRPORT.vendors,
    passengers: SCENE_IMG_AIRPORT.passengers,
    growth:     SCENE_IMG_AIRPORT.growth,
};

const AIRPORT_STAGE_BADGES = {
    problem:    "Scene 1 · The Airport Problem",
    leakage:    "Scene 2 · Revenue Leakage",
    command:    "Scene 3 · The Command Center",
    operations: "Scene 4 · Operations Intelligence",
    service:    "Scene 5 · Maintenance & Service",
    lifecycle:  "Scene 6 · Lifecycle & End-of-Life",
    vendors:    "Scene 7 · Vendor & Contract",
    passengers: "Scene 8 · Passenger · Revenue",
    growth:     "Scene 9 · Growth · Contracts · Future",
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
        case "problem":    return <ProblemStage />;
        case "leakage":    return <LeakageStage />;
        case "command":    return <CommandStage />;
        case "operations": return <OperationsStage />;
        case "service":    return <ServiceTrackingStage />;
        case "lifecycle":  return <LifecycleStage />;
        case "vendors":    return <VendorsStage />;
        case "passengers": return <PassengerSignalStage />;
        case "growth":     return <GrowthStage />;
        default:           return null;
    }
};

// =================================================================
// SCENE 1 · Airport Problem — fragmented systems, no unified view
// =================================================================
const ProblemStage = () => {
    const systems = [
        { name: "SITA",              label: "Passenger · Baggage",   vol: "14.2M pax/yr" },
        { name: "Sabre",             label: "Flight · Reservation",  vol: "420K bookings/yr" },
        { name: "Amadeus",           label: "Booking · Inventory",   vol: "380K records/mo" },
        { name: "Concession POS",    label: "Retail · F&B",          vol: "$148M GMV/yr" },
        { name: "Ground Handling",   label: "Crew · Equipment",      vol: "128 crews" },
        { name: "Maintenance ERP",   label: "Jet bridges · HVAC",    vol: "3,200 assets" },
        { name: "Vendor Contracts",  label: "SLAs · Invoices",       vol: "$42M ARR" },
        { name: "Parking & Ground Tx", label: "Revenue · Capacity",   vol: "$24M ARR" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-problem">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Layers size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Airport Systems Inventory · today</span>
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
                        <p className="mt-2 font-mono text-[10px] text-cyan-300">{s.vol}</p>
                    </div>
                ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ImpactTile Icon={AlertTriangle} tone="amber" value="$6.4M" label="Revenue leaking · annual" />
                <ImpactTile Icon={AlertTriangle} tone="amber" value="0"     label="Unified decision surface" />
                <ImpactTile Icon={AlertTriangle} tone="amber" value="Manual" label="Contract enforcement today" />
            </div>
            <p className="mt-4 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Every system works on its own. None of them talk. Decisions live in spreadsheets.
            </p>
        </div>
    );
};

// =================================================================
// SCENE 2 · Revenue Leakage, Made Visible
// =================================================================
const LeakageStage = () => {
    const leaks = [
        { stream: "Concessions · T2 Retail Row",   gap: "$2.6M / yr", why: "$412 vs $1,284 per sqft · same traffic",    tone: "amber" },
        { stream: "Parking · Structure B",         gap: "$960K / yr", why: "40% under-capacity Tuesdays · static pricing", tone: "amber" },
        { stream: "Lounge · Intl Concourse",       gap: "$1.1M / yr", why: "peak occupancy capped at 68% · capacity left", tone: "amber" },
        { stream: "Digital Ads · Red-eye window",  gap: "$640K / yr", why: "38% unsold · inventory not dynamically priced", tone: "amber" },
        { stream: "Duty-free · dwell attribution", gap: "$720K / yr", why: "no conversion modeling on dwell time",      tone: "amber" },
        { stream: "Gate advertising · Pier C",     gap: "$380K / yr", why: "6 gates unsold · manual rate card",         tone: "amber" },
    ];
    const total = "$6.4M";
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-leakage">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-amber-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Revenue Leakage · made visible</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Sourced from existing POS · SITA · parking systems</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Leakage stream</th>
                            <th className="px-4 py-3">Annual gap</th>
                            <th className="px-4 py-3">Root cause · surfaced</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaks.map((l, i) => (
                            <tr key={l.stream} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{l.stream}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-amber-300">{l.gap}</td>
                                <td className="px-4 py-3 text-[12px] text-slate-300">{l.why}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Total surfaced leakage · annualized</p>
                    <p className="font-heading text-3xl font-semibold text-cyan-300 sm:text-4xl">{total}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    Every dollar above already existed in the airport's own systems. No new sensors.
                    No new ERPs. The overlay reads across what the airport already runs — and surfaces
                    the money.
                </p>
            </div>
        </div>
    );
};

// =================================================================
// SCENE 3 · Command Center
// =================================================================
const CommandStage = () => {
    const tiles = [
        { Icon: Users,          label: "Passengers · live",          value: "42,184", sub: "on-terminal" },
        { Icon: Store,          label: "Concession $/sq ft",          value: "$1,284", sub: "rolling 24h" },
        { Icon: Gauge,          label: "Gate utilization",            value: "87.4%", sub: "peak window" },
        { Icon: MonitorSpeaker, label: "Crews on deck",               value: "128",   sub: "45 shifts" },
        { Icon: Clock,          label: "Turnaround · avg",            value: "38 min", sub: "−6 min vs Q" },
        { Icon: Wrench,         label: "Open work orders",            value: "47",    sub: "4 critical" },
        { Icon: FileSignature,  label: "Contracts expiring ≤90d",     value: "12",    sub: "$4.2M ARR" },
        { Icon: Activity,       label: "Assets · on-field",           value: "3,200", sub: "tracked" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-command">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Activity size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Unified Command · overlay on existing systems</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> LIVE · READ-ONLY
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

            <div className="mt-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="flex items-center gap-2">
                    <Layers size={12} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Sits on top of</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {["SITA", "Sabre", "Amadeus", "Concession POS", "Ground Handling", "Maintenance ERP", "Vendor Contracts", "Parking & Tx"].map((s) => (
                        <span key={s} className="rounded-sm border border-white/10 bg-ink-900 px-3 py-2 font-mono text-[10px] font-semibold text-slate-200">{s}</span>
                    ))}
                </div>
                <p className="mt-3 text-sm text-slate-200">
                    <span className="font-semibold text-cyan-300">We do not replace.</span> We read, connect, surface — and make the systems the airport already runs more profitable.
                </p>
            </div>
        </div>
    );
};

// =================================================================
// SCENE 4 · Operations Intelligence
// =================================================================
const OperationsStage = () => {
    const gates = [
        { g: "Gate B12",  use: "94%", turn: "34 min", crew: "ready",    tone: "cyan"  },
        { g: "Gate C04",  use: "72%", turn: "46 min", crew: "short",    tone: "amber" },
        { g: "Gate D18",  use: "88%", turn: "39 min", crew: "ready",    tone: "cyan"  },
        { g: "Gate A07",  use: "61%", turn: "52 min", crew: "idle ×4",  tone: "amber" },
        { g: "Gate E22",  use: "91%", turn: "36 min", crew: "ready",    tone: "cyan"  },
    ];
    const cascade = [
        { t: "09:02", e: "Delay signal · Flt 284 · inbound",      tone: "amber" },
        { t: "09:04", e: "Gate reassign · B12 → B14 · auto",       tone: "cyan"  },
        { t: "09:06", e: "Crew re-dispatch · team 7 → gate B14",   tone: "cyan"  },
        { t: "09:09", e: "Connecting pax · 42 re-protected",       tone: "cyan"  },
        { t: "09:11", e: "Cascade contained · no ramp impact",     tone: "cyan"  },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-operations">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Gauge size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Gate · Crew · Turnaround · live</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Source: ground-handling schedulers</span>
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

            <div className="mt-5 rounded-sm border border-white/10 bg-ink-900 p-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <LineChart size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Delay cascade · contained · 09:02 → 09:11</span>
                </div>
                <div className="mt-3 space-y-2">
                    {cascade.map((c, i) => (
                        <div key={c.t} className="flex items-center gap-3 rounded-sm border border-white/5 bg-ink-800 p-2.5 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{c.t}</span>
                            <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${c.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{c.e}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ImpactTile Icon={Clock}         value="−6 min"   label="Avg turnaround" tone="cyan" />
                <ImpactTile Icon={TrendingDown}  value="−2.1 min" label="Baggage transit median" tone="cyan" />
                <ImpactTile Icon={BadgeCheck}    value="17 / 18"  label="Cascades contained" tone="cyan" />
            </div>
        </div>
    );
};

// =================================================================
// SCENE 5 · Maintenance & Service Tracking
// =================================================================
const ServiceTrackingStage = () => {
    const serviceLog = [
        { id: "WO-48221", asset: "Jet bridge B-12", vendor: "RampTech",   date: "2026-01-14", issue: "Hydraulic pressure low",     hrs: "2.4", cost: "$3,120", tone: "amber" },
        { id: "WO-48374", asset: "Jet bridge B-12", vendor: "RampTech",   date: "2026-01-31", issue: "Hydraulic pressure low",     hrs: "2.1", cost: "$3,400", tone: "amber" },
        { id: "WO-48502", asset: "Jet bridge B-12", vendor: "RampTech",   date: "2026-02-17", issue: "Hydraulic pressure low",     hrs: "2.6", cost: "$3,580", tone: "amber" },
        { id: "WO-48611", asset: "Baggage belt C-2", vendor: "BeltCo",    date: "2026-02-22", issue: "Roller replacement",         hrs: "1.8", cost: "$1,240", tone: "cyan"  },
        { id: "WO-48702", asset: "HVAC · RT-1",      vendor: "AirFlow Inc", date: "2026-02-28", issue: "Coil inspection",          hrs: "3.2", cost: "$2,840", tone: "cyan"  },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-service">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <ClipboardList size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Work Order Ledger · last 90 days</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Sourced from maintenance ERPs · cross-referenced</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-3 py-3">WO</th>
                            <th className="px-3 py-3">Asset</th>
                            <th className="px-3 py-3">Vendor</th>
                            <th className="px-3 py-3">Date</th>
                            <th className="px-3 py-3">Issue</th>
                            <th className="px-3 py-3">Hrs</th>
                            <th className="px-3 py-3">Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {serviceLog.map((w, i) => (
                            <tr key={w.id} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-3 py-3 font-mono text-[11px] text-slate-300">{w.id}</td>
                                <td className="px-3 py-3 font-semibold text-white">{w.asset}</td>
                                <td className="px-3 py-3 font-mono text-[11px] text-slate-300">{w.vendor}</td>
                                <td className="px-3 py-3 font-mono text-[10px] text-slate-500">{w.date}</td>
                                <td className="px-3 py-3 text-[12px] text-slate-200">
                                    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${w.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{w.issue}</span>
                                </td>
                                <td className="px-3 py-3 font-mono text-[11px] text-slate-300">{w.hrs}</td>
                                <td className="px-3 py-3 font-mono text-[11px] text-cyan-300">{w.cost}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-4 lg:col-span-2">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-amber-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Pattern surfaced · jet bridge B-12</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">
                        Three hydraulic pressure calls in 33 days from the same vendor. Recurring every
                        14–21 days. The maintenance ERP logged each call individually — the pattern was
                        invisible until now. Root cause: manifold reaching end of service life.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Keep paying</p>
                            <p className="font-heading mt-1 text-lg font-semibold text-amber-300">$38K / yr</p>
                            <p className="font-mono text-[9px] text-slate-500">12+ recurring calls</p>
                        </div>
                        <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-3">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Replace manifold</p>
                            <p className="font-heading mt-1 text-lg font-semibold text-cyan-300">$4,200</p>
                            <p className="font-mono text-[9px] text-cyan-300">Payback &lt; 60 days</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Service ledger · scope</p>
                    <div className="mt-3 space-y-2">
                        <KV label="Total work orders · 90d"    value="1,842" />
                        <KV label="Vendors · tracked"           value="18" />
                        <KV label="Assets with service history" value="3,200" />
                        <KV label="Recurrence patterns flagged" value="47" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// SCENE 6 · Equipment Lifecycle & End-of-Life Alerts
// =================================================================
const LifecycleStage = () => {
    const states = [
        { key: "Identified",        count: 428,  tone: "amber" },
        { key: "Approved",          count: 124,  tone: "cyan"  },
        { key: "Deployed",          count: 1142, tone: "cyan"  },
        { key: "Savings verified",  count: 148,  tone: "cyan"  },
    ];
    const eolAlerts = [
        { id: "HVAC-RT1",  name: "HVAC · RT-1 · Pier D",    age: "13 yrs", status: "Manufacturer EOL",         risk: "64% fail · 12mo", action: "Capital plan · Q3 swap",   tone: "amber" },
        { id: "ESC-A3",    name: "Escalator · A-3",          age: "8 yrs",  status: "Vibration trend out of tolerance", risk: "Unplanned stop · risk",    action: "Bearing replacement",      tone: "amber" },
        { id: "BB-C2",     name: "Baggage belt · C-2",       age: "11 yrs", status: "3 service calls / 90d",     risk: "Cost trend +34% YoY",     action: "Upgrade vs repair",        tone: "amber" },
        { id: "LGT-T2",    name: "Lighting · T2 retail row",  age: "9 yrs",  status: "T8 → LED · opportunity",    risk: "62% energy cut available", action: "Phase 1 · ROI 22mo",        tone: "cyan"  },
        { id: "GSE-DI-4",  name: "De-icing rig · 4",          age: "2 yrs (post-upgrade)", status: "Running 184K under spend", risk: "Savings verified · on-track", action: "Continue monitoring",      tone: "cyan"  },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-lifecycle">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Activity size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Lifecycle Ledger · cradle to retirement</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Identified → Approved → Deployed → Savings verified</span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
                {states.map((s, i) => (
                    <div key={s.key} className={`rounded-sm border p-2.5 text-center fade-in-up ${s.tone === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/30 bg-cyan-500/5"}`} style={{ animationDelay: `${i * 60}ms` }}>
                        <p className={`font-mono text-[9px] uppercase tracking-[0.22em] ${s.tone === "amber" ? "text-amber-300" : "text-cyan-300"}`}>{s.key}</p>
                        <p className="font-heading mt-1 text-base font-semibold text-white">{s.count.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className="mt-5 rounded-sm border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2">
                    <Bell size={12} className="text-amber-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">End-of-Life Alerts · this quarter</span>
                </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-3 py-3">Asset</th>
                            <th className="px-3 py-3">Age</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Risk</th>
                            <th className="px-3 py-3">Recommended action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eolAlerts.map((a, i) => (
                            <tr key={a.id} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-3 py-3 font-semibold text-white">{a.name} <span className="font-mono text-[10px] text-slate-500">· {a.id}</span></td>
                                <td className="px-3 py-3 font-mono text-[10px] text-slate-300">{a.age}</td>
                                <td className="px-3 py-3">
                                    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${a.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"}`}>
                                        {a.status}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-[11px] text-slate-300">{a.risk}</td>
                                <td className="px-3 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">→ {a.action}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ImpactTile Icon={Bell}       value="47"    label="EOL alerts · this quarter" tone="amber" />
                <ImpactTile Icon={Hammer}     value="124"   label="Upgrades approved · queued" tone="cyan" />
                <ImpactTile Icon={DollarSign} value="$184K" label="De-icing · saved YoY" tone="cyan" />
            </div>

            {/* Koollite Dual-Path strip — surfaces the LGT-T2 lighting opportunity above */}
            <div className="mt-5" data-testid="airport-koollite-dualpath-wrap">
                <KoolliteDualPathStrip
                    accent="cyan"
                    testid="airport-koollite-dualpath"
                />
            </div>
        </div>
    );
};

// =================================================================
// SCENE 7 · Vendor Performance & Contract Visibility
// =================================================================
const VendorsStage = () => {
    const rows = [
        { v: "GroundOps Intl",    sla: "99.2%", inv: "$4.28M / yr", rec: "$28K",  flag: "2 calls covered by warranty · flagged before pay",   tone: "amber" },
        { v: "FilterPro",         sla: "97.8%", inv: "$820K / yr",  rec: "$148K", flag: "+18% vs market benchmark · renegotiate queued",       tone: "amber" },
        { v: "Lounge Hospitality", sla: "96.1%", inv: "$1.80M / yr", rec: "$72K",  flag: "SLA breach · 4th month · penalty clause triggered",   tone: "amber" },
        { v: "TermClean Co.",     sla: "98.4%", inv: "$1.12M / yr", rec: "—",     flag: "Renewal in 84d · renegotiation window open",          tone: "amber" },
        { v: "RampSec Partners",  sla: "99.6%", inv: "$2.42M / yr", rec: "—",     flag: "Within SLA · on track",                               tone: "cyan"  },
    ];
    const renewals = [
        { window: "60 days",  count: 4,  value: "$1.8M ARR" },
        { window: "90 days",  count: 8,  value: "$2.4M ARR" },
        { window: "120 days", count: 14, value: "$4.2M ARR" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-vendors">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <FileSignature size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Vendor Performance · Contract Visibility · Warranty Enforcement</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">SLAs · invoices · market benchmarks · live</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-3 py-3">Vendor</th>
                            <th className="px-3 py-3">SLA</th>
                            <th className="px-3 py-3">Invoice</th>
                            <th className="px-3 py-3">Recovered</th>
                            <th className="px-3 py-3">Enforcement signal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.v} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                                <td className="px-3 py-3 font-semibold text-white">{r.v}</td>
                                <td className="px-3 py-3 font-mono text-[12px] text-cyan-300">{r.sla}</td>
                                <td className="px-3 py-3 font-mono text-[11px] text-slate-300">{r.inv}</td>
                                <td className="px-3 py-3 font-mono text-[11px] text-cyan-300">{r.rec}</td>
                                <td className="px-3 py-3">
                                    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${r.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"}`}>
                                        {r.flag}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {renewals.map((w) => (
                    <div key={w.window} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-cyan-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Renewal window · {w.window}</span>
                        </div>
                        <p className="font-heading mt-2 text-2xl font-semibold text-white">{w.count}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{w.value}</p>
                    </div>
                ))}
            </div>

            <p className="mt-4 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-amber-300">$1.84M</span> in repairs paid last year that should have been covered under active warranties — now flagged <em>before</em> payment. Vendors stay. Accountability is new.
            </p>
        </div>
    );
};

// =================================================================
// SCENE 8 · Passenger Signal & Revenue Optimization
// =================================================================
const PassengerSignalStage = () => {
    const clusters = [
        { code: "FRX-1102", loc: "Self-service kiosk · T2", au: "AU 4 + AU 7", intensity: 0.64, cls: "negative", action: "Friction → dispatch staff assist", lift: "−11% abandonment" },
        { code: "DEC-2208", loc: "Duty-free · Concourse A", au: "AU 1 + AU 2", intensity: 0.72, cls: "mixed",    action: "Hesitation → targeted offer",      lift: "+4.2 pt conv"    },
        { code: "DWL-3102", loc: "F&B · Pier D",             au: "dwell 84s",   intensity: 0.58, cls: "positive", action: "Dwell → purchase predicted",       lift: "+$0.48 ARPU"     },
        { code: "STR-4018", loc: "Security · Lane 6",        au: "AU 4 + jaw",  intensity: 0.67, cls: "negative", action: "Stress spike → open lane",         lift: "−23% median wait" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-passengers">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Radar size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">BodyIQ-AI · Passenger Signal Clusters</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Structured · airport-grade · auditable</span>
            </div>
            <div className="mt-4 space-y-2">
                {clusters.map((c, i) => (
                    <div key={c.code} className="grid grid-cols-1 gap-2 rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up lg:grid-cols-8" style={{ animationDelay: `${i * 70}ms` }}>
                        <span className="font-mono text-[11px] font-semibold text-cyan-300 lg:col-span-1">{c.code}</span>
                        <span className="font-mono text-[10px] text-slate-300 lg:col-span-2">{c.loc}</span>
                        <span className="font-mono text-[10px] text-slate-400 lg:col-span-1">{c.au}</span>
                        <span className="font-mono text-[10px] text-slate-300 lg:col-span-1">int {c.intensity.toFixed(2)} · <span className={c.cls === "negative" || c.cls === "mixed" ? "text-amber-300" : "text-cyan-300"}>{c.cls}</span></span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 lg:col-span-2">→ {c.action}</span>
                        <span className="font-mono text-[10px] text-cyan-300 lg:col-span-1">{c.lift}</span>
                    </div>
                ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ImpactTile Icon={DollarSign}    value="+$1.42"  label="Revenue per passenger" tone="cyan" />
                <ImpactTile Icon={TrendingUp}    value="$19.8M"  label="Annual · 14M pax"      tone="cyan" />
                <ImpactTile Icon={TrendingDown}  value="−23%"    label="Security median wait"  tone="cyan" />
            </div>
        </div>
    );
};

// =================================================================
// SCENE 9 · Growth · Contract Wins · Future State
// =================================================================
const GrowthStage = () => {
    const contracts = [
        { Icon: Handshake, name: "Premium catering master agreement",    value: "$3.2M / yr",         why: "Proven passenger-flow + dwell data",    tone: "cyan" },
        { Icon: Store,     name: "2 new retail concessions · T2 Pier B",  value: "$4.1M / yr combined", why: "Dwell-attributed revenue model",       tone: "cyan" },
        { Icon: Plane,     name: "Extended ground-services contract",      value: "$7.6M / 3yr",        why: "Measured SLA performance + efficiency", tone: "cyan" },
        { Icon: Crown,     name: "Airline lounge partnership",             value: "$2.8M / yr",         why: "Verified occupancy data · audited",    tone: "cyan" },
    ];
    const yr1 = [
        { label: "Revenue leakage recovered", value: "$6.4M" },
        { label: "Warranty-enforced repairs recovered", value: "$1.84M" },
        { label: "New passenger-layer revenue", value: "$19.8M" },
        { label: "New contract value · year one", value: "$17.7M" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-6 lg:p-10 fade-in-up shadow-[0_0_60px_rgba(6,182,212,0.18)]" data-testid="stage-growth">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Airport Growth Engine · Year-one outcomes</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {yr1.map((k, i) => (
                    <div key={k.label} className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{k.label}</p>
                        <p className="font-heading mt-2 text-3xl font-semibold text-white">{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="mt-7">
                <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">New contracts won · because the data was finally usable</p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {contracts.map((c, i) => (
                        <div key={c.name} className="rounded-sm border border-cyan-500/30 bg-ink-900 p-4 fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
                            <div className="flex items-start gap-3">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10">
                                    <c.Icon size={14} className="text-cyan-300" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-white">{c.name}</p>
                                    <p className="mt-1 font-heading text-xl font-semibold text-cyan-300">{c.value}</p>
                                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{c.why}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-7 rounded-sm border border-white/10 bg-ink-900 p-5">
                <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Future state · system positioning</p>
                </div>
                <p className="font-heading mt-3 text-xl font-semibold leading-snug text-white sm:text-2xl">
                    Sits on top of SITA · Sabre · Amadeus · concessions · ground handling · maintenance · vendors — and makes them more profitable.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    CreatorBoostAI does not replace the systems your airport already runs. It connects
                    them, surfaces the money inside them, and turns the data the airport already owns
                    into revenue, operational control, and new contract wins.
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
};

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
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white">For your aviation authority, your ops team, your enterprise partners.</h3>
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
const KV = ({ label, value }) => (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
    </div>
);

const ImpactTile = ({ Icon, value, label, tone = "cyan" }) => (
    <div className={`rounded-sm border p-3 ${tone === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/30 bg-cyan-500/5"}`}>
        <div className="flex items-center gap-2">
            <Icon size={12} className={tone === "amber" ? "text-amber-300" : "text-cyan-300"} />
            <p className={`font-mono text-[9px] uppercase tracking-[0.22em] ${tone === "amber" ? "text-amber-300" : "text-cyan-300"}`}>{label}</p>
        </div>
        <p className={`font-heading mt-2 text-2xl font-semibold ${tone === "amber" ? "text-amber-300" : "text-cyan-300"}`}>{value}</p>
    </div>
);
