import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { PAGE_HERO } from "@/lib/images";
import {
    Plane, ArrowRight, Play, Pause, RotateCcw, Volume2, VolumeX, Mic,
    Radar, Workflow, Users, Package, Wrench, FileCheck2, BarChart3,
    Award, Lock, ShieldCheck, ChevronRight,
} from "lucide-react";
import {
    useAgenticEngine, ActionLedger, ReasoningStream, RevenueSavingsCounter,
    ExecutionControlPanel, SovereignVault, PortfolioCommandCenter,
} from "@/components/agentic/AgenticExecutionCore";

// =============================================================================
// SITA Aviation Execution Demo · 10 scenes · Detected → Reasoned → Executed → Measured
// CreatorBoostAI is the EXECUTION LAYER on top of SITA infrastructure.
// =============================================================================
const SCENES = [
    {
        id: "open",
        kicker: "Scene 1 · Aviation Execution Layer",
        title: "From Predictive Insight → Automated Outcomes",
        Icon: Plane,
        narration:
            "SITA already connects the global aviation ecosystem — from passenger identity to baggage to flight operations. The question is no longer visibility. The question is how much value is captured from that visibility. CreatorBoostAI is the execution layer that converts SITA's infrastructure into measurable revenue, faster execution, and higher contract win rates.",
        body: "SITA runs the infrastructure. CreatorBoostAI runs the execution.",
        chips: ["AODB", "Smart Path", "WorldTracer", "Mission Watch", "OptiFlight", "Maestro DCS"],
        actions: [{
            id: "CB-AIR-20480",
            trigger: "SITA infrastructure feeds connected · 11 source systems online",
            reasoning: "Establish execution overlay across passenger, baggage, ops, flight, maintenance domains",
            action: "Aviation execution session initialized · audit trail opened",
            impact_usd: 0, impact_label: "Session start", status: "executed",
        }],
    },
    {
        id: "ingestion",
        kicker: "Scene 2 · SITA Data Ingestion",
        title: "Connected Systems Panel",
        Icon: Workflow,
        narration:
            "Eleven SITA systems connect into one execution overlay — Airport Management, Operations Manager AODB, Smart Path, Flex, Maestro DCS, WorldTracer, Bag Manager, Mission Watch, OptiFlight, Safety Cube, AeroCost Manager. SITA connects the aviation ecosystem. CreatorBoostAI turns that data into execution.",
        body: "11 SITA systems feed the execution overlay. No replacement. No rip-and-replace.",
        chips: ["Airport Mgmt", "AODB", "Smart Path", "Flex", "Maestro DCS", "WorldTracer", "Bag Manager", "Mission Watch", "OptiFlight", "Safety Cube", "AeroCost"],
        actions: [{
            id: "CB-AIR-20481",
            trigger: "Heterogeneous SITA data streams · API + non-API",
            reasoning: "Unified schema synthesized · legacy departure-control bridge engaged",
            action: "Execution overlay established across 11 SITA systems",
            impact_usd: 0, impact_label: "Integration", status: "executed",
        }],
    },
    {
        id: "decision",
        kicker: "Scene 3 · Real-Time Decision Engine",
        title: "Action ID created → assigned → resolved",
        Icon: Radar,
        narration:
            "The Operations Manager flags a gate conflict. Detected. Reasoned against passenger flow, downstream connections, and crew availability. Executed: gate B12 reassigned to C7 · crew and passenger notifications dispatched · downstream gates rebalanced. Measured: 14 minutes recovered. Eight thousand two hundred dollars saved.",
        body: "Gate conflict resolved end-to-end in under 90 seconds. Every step Action-ID tracked.",
        chips: ["Gate B12 → C7", "Crew notified", "Pax SMS dispatched", "Downstream rebalanced"],
        actions: [{
            id: "CB-AIR-20491",
            trigger: "Gate conflict detected · SITA Operations Manager event T-22min",
            reasoning: "Reassignment cost vs delay-cascade impact · 6 alternatives ranked · C7 optimal",
            action: "Gate reassigned · crew notified · 312 passengers messaged",
            impact_usd: 8200, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "smart-path",
        kicker: "Scene 4 · Passenger Revenue Engine",
        title: "Smart Path identity → CB monetizes the journey",
        Icon: Users,
        narration:
            "Smart Path verifies a passenger. Detected: 47-minute dwell window · gold-tier loyalty match. Reasoned: lounge upgrade has 32 percent take-rate at this dwell window. Executed: lounge offer pushed to mobile, retail offer triggered, parking upsell queued. Measured: revenue uplift captured per passenger.",
        body: "SITA verifies identity. CreatorBoostAI monetizes the journey.",
        chips: ["Identity verified", "Dwell 47 min", "Lounge offer", "Retail offer", "Parking upsell"],
        actions: [{
            id: "CB-AIR-20502",
            trigger: "Passenger verified via Smart Path · dwell window 47 min predicted",
            reasoning: "Lounge upgrade take-rate 32% · retail offer 18% · parking upsell 11%",
            action: "Personalized offers pushed to mobile · loyalty triggered",
            impact_usd: 184, impact_label: "Revenue", status: "executed",
        }],
    },
    {
        id: "baggage",
        kicker: "Scene 5 · Baggage + Customer Experience",
        title: "WorldTracer + Bag Manager · auto-recovery",
        Icon: Package,
        narration:
            "WorldTracer flags a delayed bag on connection 4471. Detected. Reasoned against connection schedule and passenger compensation policy. Executed: bag rerouted, customer notified with recovery ETA, compensation voucher pre-filed, ground crew dispatched at the destination. Measured: hours of customer-service recovery cost avoided.",
        body: "Detection → routing decision → customer notification → compensation — all in one pass.",
        chips: ["Bag rerouted", "Pax notified", "Compensation pre-filed", "Crew dispatched"],
        actions: [{
            id: "CB-AIR-20517",
            trigger: "Delayed bag detected · WorldTracer event · connection 4471",
            reasoning: "Reroute via 18:22 flight · compensation policy auto-applied · CSAT preserved",
            action: "Bag rerouted · pax messaged · voucher filed · ground crew alerted",
            impact_usd: 2400, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "flight-ops",
        kicker: "Scene 6 · Flight Optimization",
        title: "Mission Watch + OptiFlight · weather + fuel",
        Icon: Radar,
        narration:
            "Mission Watch detects a developing weather front along the planned route. Reasoned against fuel burn, sector winds, and on-time-performance impact. Executed: alternate routing recommended, OptiFlight fuel plan updated, dispatch notified. Measured: fuel saved · arrival window protected · downstream connections preserved.",
        body: "Weather detected → alternate routing → fuel plan updated → dispatch notified.",
        chips: ["Alternate route", "Fuel plan updated", "Dispatch notified", "Downstream protected"],
        actions: [{
            id: "CB-AIR-20528",
            trigger: "Weather front · Mission Watch alert · 41-min route impact",
            reasoning: "OptiFlight rerun · 4 routing options · option 3 minimizes fuel + delay",
            action: "Routing change submitted to dispatch · crew notified",
            impact_usd: 6300, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "maintenance",
        kicker: "Scene 7 · Maintenance + Equipment Execution",
        title: "Kiosks · scanners · gate equipment",
        Icon: Wrench,
        narration:
            "Detected: kiosk K-22 throughput dropped 38 percent in 12 minutes · scanner B-7 latency rising. Reasoned against passenger flow at the affected terminal · downtime cost modeled. Executed: technician dispatched · backup units activated · queue rebalanced via signage. Measured: downtime minutes avoided · throughput restored.",
        body: "Equipment failure detected before passengers feel it. Throughput restored automatically.",
        chips: ["K-22 dispatched", "Backup activated", "Queue rebalanced", "Throughput restored"],
        actions: [{
            id: "CB-AIR-20536",
            trigger: "Kiosk K-22 throughput −38% · scanner B-7 latency +110ms",
            reasoning: "Cost-of-downtime modeled · backup-unit ROI positive within 14 min",
            action: "Technician dispatched · backup activated · digital signage updated",
            impact_usd: 1900, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "sales-engine",
        kicker: "Scene 8 · Sales + Contract Engine",
        title: "SITA no longer sells systems · it sells outcomes",
        Icon: Award,
        narration:
            "A new airport opportunity surfaces — 14 million annual passengers, regional hub. Detected from public infrastructure data. Reasoned: customized modernization plan generated, ROI tied to passenger flow, monetization scenarios projected. Executed: proposal package, pitch deck, and outreach sequence drafted in minutes. Measured: win-rate uplift of 10 to 25 percent on equivalent deals.",
        body: "SITA walks into every airport meeting with a fully generated, airport-specific modernization + ROI package.",
        chips: ["Proposal generated", "ROI modeled", "Pitch deck drafted", "Outreach prepared"],
        actions: [{
            id: "CB-AIR-20544",
            trigger: "Airport modernization opportunity · 14M annual pax",
            reasoning: "Custom ROI · revenue + ops uplift modeled · proposal templated",
            action: "Proposal + ROI + pitch deck + outreach assembled · sales team alerted",
            impact_usd: 0, impact_label: "Win-rate", status: "executed",
        }],
    },
    {
        id: "audit-trail",
        kicker: "Scene 9 · Aviation-Grade Audit Trail",
        title: "Every decision · explainable + tamper-resistant",
        Icon: FileCheck2,
        narration:
            "In aviation, execution must be accountable. Every CreatorBoostAI decision creates a tamper-resistant Action ID record — capturing the reason, the data sources, the alternatives considered, the action taken, and the outcome. Aligned with operational and compliance standards. Open the Sovereign Vault to inspect any decision.",
        body: "Action ID Ledger · timestamp · decision logic · resolution · compliance tag.",
        chips: ["ICAO operational flow", "Tamper-resistant", "Decision rationale", "Compliance-aligned"],
        actions: [{
            id: "CB-AIR-20551",
            trigger: "Compliance officer requests rationale · Action ID 20491",
            reasoning: "Sovereign Vault retrieves · data sources · alternatives · final logic",
            action: "Rationale package surfaced · 6 alternatives shown · audit log preserved",
            impact_usd: 0, impact_label: "Compliance", status: "executed",
        }],
    },
    {
        id: "close",
        kicker: "Scene 10 · Portfolio Command Center",
        title: "SITA + CreatorBoostAI · execution at every airport",
        Icon: BarChart3,
        narration:
            "SITA already owns the infrastructure layer of global aviation. CreatorBoostAI ensures that infrastructure produces measurable outcomes — revenue, efficiency, growth, and contract wins. The Portfolio Command Center lets SITA roll out execution-layer upgrades across every airport, with vendor coordination, proposal generation, and task scheduling — in one click.",
        body: "Click Execute Portfolio Upgrade to roll out CreatorBoostAI execution across the airport portfolio.",
        chips: ["Multi-airport rollout", "Vendor coordination", "Proposal generation", "Task scheduling"],
        actions: [{
            id: "CB-AIR-20999",
            trigger: "Portfolio upgrade requested · operator role verified",
            reasoning: "Self-funding model active · warranty enforced · execution overlay ready",
            action: "Portfolio rollout sequenced across airport network",
            impact_usd: 0, impact_label: "Execution", status: "executing",
        }],
    },
];

const SCENE_MS = 22000;  // 22s per scene × 10 = 220s ≈ 3:40

// ─────────────── TTS Voice picker (English female) ───────────────
const FEMALE_HINTS = [
    "samantha","karen","victoria","moira","tessa","serena","nova",
    "allison","ava","susan","fiona","kate","kathy","vicki",
    "google uk english female","google us english female",
    "microsoft zira","microsoft aria","microsoft jenny","female",
];

const pickVoice = (voices) => {
    if (!voices || !voices.length) return null;
    const en = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
    const pool = en.length ? en : voices;
    for (const h of FEMALE_HINTS) {
        const m = pool.find((v) => (v.name || "").toLowerCase().includes(h));
        if (m) return m;
    }
    return pool[0];
};

export default function SitaDemoPage() {
    const [started, setStarted] = useState(false);
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [supportsTTS, setSupportsTTS] = useState(true);
    const voiceRef = useRef(null);
    const advanceTimerRef = useRef(null);

    const engine = useAgenticEngine({ initialMode: "auto" });

    useDemoTracking({
        demoType: "sita",
        started, scene: idx, totalScenes: SCENES.length,
        overallProgress: started ? Math.round(((idx + 1) / SCENES.length) * 100) : 0,
        done: idx >= SCENES.length - 1,
    });

    // Voice loader
    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            setSupportsTTS(false); return;
        }
        const load = () => {
            const v = pickVoice(window.speechSynthesis.getVoices());
            if (v) voiceRef.current = v;
        };
        load();
        window.speechSynthesis.addEventListener("voiceschanged", load);
        return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }, []);

    const stopSpeech = useCallback(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }, []);

    const speakScene = useCallback((sceneIdx) => {
        if (!supportsTTS || muted) return;
        stopSpeech();
        const sc = SCENES[sceneIdx];
        if (!sc) return;
        const u = new window.SpeechSynthesisUtterance(sc.narration);
        u.rate = 1.0; u.pitch = 1.05; u.volume = 1.0;
        if (voiceRef.current) u.voice = voiceRef.current;
        try { window.speechSynthesis.speak(u); } catch { /* noop */ }
    }, [supportsTTS, muted, stopSpeech]);

    const startDemo = useCallback(() => {
        if (supportsTTS) {
            try {
                const warm = new window.SpeechSynthesisUtterance(" ");
                warm.volume = 0;
                window.speechSynthesis.speak(warm);
            } catch { /* noop */ }
        }
        setStarted(true); setPlaying(true); setIdx(0); engine.reset();
        setTimeout(() => speakScene(0), 150);
    }, [speakScene, supportsTTS, engine]);

    // Scene auto-advance
    useEffect(() => {
        if (!started || !playing) return;
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = setTimeout(() => {
            setIdx((i) => (i + 1 < SCENES.length ? i + 1 : i));
        }, SCENE_MS);
        return () => clearTimeout(advanceTimerRef.current);
    }, [started, playing, idx]);

    // Speak + fire actions when scene changes
    useEffect(() => {
        if (!started) return;
        stopSpeech();
        if (playing && !muted) speakScene(idx);
        const acts = (SCENES[idx] && SCENES[idx].actions) || [];
        acts.forEach((a, i) => setTimeout(() => engine.fire(a), 250 + i * 800));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, started]);

    useEffect(() => () => stopSpeech(), [stopSpeech]);

    const togglePlay = () => {
        if (!started) { startDemo(); return; }
        setPlaying((p) => {
            const next = !p;
            if (!next) stopSpeech();
            else speakScene(idx);
            return next;
        });
    };

    const replay = () => {
        stopSpeech(); engine.reset();
        setIdx(0); setPlaying(true);
        if (!started) setStarted(true);
        setTimeout(() => speakScene(0), 150);
    };

    const toggleMute = () => {
        setMuted((m) => {
            const next = !m;
            if (next) stopSpeech();
            else if (started && playing) speakScene(idx);
            return next;
        });
    };

    const goToScene = (i) => {
        setIdx(i); setPlaying(false); stopSpeech();
        if (started && !muted) setTimeout(() => speakScene(i), 100);
    };

    const scene = SCENES[idx];
    const SceneIcon = scene.Icon;
    const progress = Math.round(((idx + 1) / SCENES.length) * 100);

    return (
        <Layout>
            <div className="relative min-h-[90vh] bg-ink-900 text-slate-100" data-testid="sita-demo-page">
                <div className="absolute inset-0 -z-10 overflow-hidden">
                    <img src={PAGE_HERO.verticalPicker} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_60%)]" />
                </div>

                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/5 px-3 py-1.5">
                            <Plane size={11} className="text-cyan-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Aviation Execution Layer</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleMute} disabled={!supportsTTS} data-testid="sita-mute"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300 disabled:opacity-50">
                                {muted ? <><VolumeX size={11}/> Unmute</> : <><Volume2 size={11}/> Mute</>}
                            </button>
                            <button onClick={togglePlay} data-testid="sita-toggle-play"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                                {playing ? <><Pause size={11}/> Pause</> : <><Play size={11}/> Play</>}
                            </button>
                            <button onClick={replay} data-testid="sita-replay"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                                <RotateCcw size={11}/> Replay
                            </button>
                            <SovereignVault testId="sita-vault" />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
                        <span data-testid="sita-narration-status"
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${
                                  !supportsTTS ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
                                  : !started ? "border-white/10 bg-ink-700/40 text-slate-400"
                                  : muted ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
                                  : playing ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                  : "border-cyan-500/30 bg-cyan-500/5 text-cyan-300"
                              }`}>
                            <Mic size={10} />
                            {!supportsTTS ? "Voice not supported"
                             : !started ? "Voice ready · click Start"
                             : muted ? "Narration muted"
                             : playing ? "Narrating" : "Paused"}
                        </span>
                    </div>

                    <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-ink-700/50">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5" data-testid="sita-pager">
                        {SCENES.map((_, i) => (
                            <button key={i} onClick={() => goToScene(i)} data-testid={`sita-scene-${i}`}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? "bg-emerald-400/70" : "bg-white/10 hover:bg-white/20"}`}
                                aria-label={`Scene ${i + 1}`} />
                        ))}
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className="space-y-4 lg:col-span-8">
                            <div className="relative min-h-[360px] rounded-md border border-cyan-500/25 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 p-5 sm:p-7" data-testid="sita-active-scene">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10">
                                        <SceneIcon size={20} className="text-cyan-300" />
                                    </div>
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{scene.kicker}</p>
                                        <h2 className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">{scene.title}</h2>
                                    </div>
                                </div>
                                <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-lg">{scene.body}</p>
                                <div className="mt-5 flex flex-wrap gap-1.5">
                                    {scene.chips.map((c) => (
                                        <span key={c} className="rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{c}</span>
                                    ))}
                                </div>

                                {!started && (
                                    <div data-testid="sita-start-overlay"
                                         className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-ink-900/85 backdrop-blur-sm">
                                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/5 px-3 py-1">
                                            <Mic size={11} className="text-cyan-300" />
                                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Female narration · 10 scenes · ~4 min</span>
                                        </div>
                                        <h3 className="font-heading text-center text-2xl font-semibold text-white sm:text-3xl">From insight to execution.</h3>
                                        <p className="mt-2 max-w-md text-center text-sm text-slate-300">CreatorBoostAI as the execution layer on top of SITA infrastructure.</p>
                                        <button onClick={startDemo} data-testid="sita-start-with-voice"
                                            className="mt-5 inline-flex items-center gap-2 rounded-md bg-cyan-400 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:bg-cyan-300">
                                            <Play size={14}/> Start Demo With Voice
                                        </button>
                                    </div>
                                )}
                            </div>

                            {scene.id === "close" && (
                                <PortfolioCommandCenter totals={engine.totals} testId="sita-portfolio" />
                            )}
                            <RevenueSavingsCounter totals={engine.totals} testId="sita-counter" />
                        </div>

                        <div className="space-y-4 lg:col-span-4">
                            <ActionLedger ledger={engine.ledger} testId="sita-ledger" />
                            <ReasoningStream stream={engine.stream} testId="sita-stream" />
                            <ExecutionControlPanel mode={engine.mode} setMode={engine.setMode} role="Aviation Operator" testId="sita-control" />
                            <div className="flex items-center justify-between rounded-md border border-white/5 bg-ink-700/30 px-3 py-2">
                                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                    <Lock size={9} className="mr-1 inline text-emerald-300" /> Aviation-grade audit trail
                                </p>
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                                    <ShieldCheck size={9} className="mr-1 inline" /> ICAO-aligned
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 text-center sm:p-10">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">From technology provider · to performance partner</p>
                        <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Bring the execution layer to every airport in your portfolio.</h3>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Link to="/contact" data-testid="sita-cta-request"
                                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-cyan-300">
                                Request the live walkthrough <ArrowRight size={15}/>
                            </Link>
                            <Link to="/demo/airport" data-testid="sita-cta-airport"
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-ink-900 px-5 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                See airport-side demo <ChevronRight size={15}/>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
