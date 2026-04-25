import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import { analyzeLead } from "@/lib/api";
import {
    Play, Pause, ArrowRight, ArrowLeft, RotateCcw, Volume2, VolumeX,
    Sparkles, Building2, Users, MessageSquare, CalendarCheck, DollarSign,
    Target, Activity, Send, Copy, Check, ShieldCheck, Home, Mail,
    TrendingUp, Zap, SkipForward, Layers, Brain, Cpu, Award, Rocket,
    Network, Globe2, Lock, Database, GitBranch, Server, BarChart3,
    Briefcase, MapPin, FileText
} from "lucide-react";

// =================================================================
// Cinematic imagery (Unsplash CDN, optimized)
// =================================================================
const IMG = {
    corporateOffice: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=70",
    conferenceRoom: "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1600&q=70",
    teamWorking: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=70",
    agentClient: "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1600&q=70",
    agentPhone: "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?auto=format&fit=crop&w=1600&q=70",
    propertyExterior: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1600&q=70",
    luxuryHome: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=70",
    citySkyline: "https://images.unsplash.com/photo-1496564203457-11bb12075d90?auto=format&fit=crop&w=1600&q=70",
    openHouse: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=70",
    walkthrough: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=70",
    deskMonitors: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=70",
    handshake: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=70",
};

// Enterprise + Field software brand catalog
const ENTERPRISE_SOFTWARE = [
    { name: "Yardi Systems", short: "Y", domain: "Property Mgmt" },
    { name: "MRI Software", short: "MRI", domain: "Real Estate Ops" },
    { name: "RealPage", short: "RP", domain: "Multifamily" },
    { name: "AppFolio", short: "AF", domain: "Property Mgmt" },
    { name: "Accruent", short: "AC", domain: "Asset Mgmt" },
    { name: "Salesforce", short: "SF", domain: "CRM" },
    { name: "Dynamics 365", short: "D365", domain: "ERP" },
];
const FIELD_SOFTWARE = [
    { name: "Follow Up Boss", short: "FUB", domain: "Lead CRM" },
    { name: "kvCORE", short: "kvC", domain: "Agent Platform" },
    { name: "BoomTown", short: "BT", domain: "Lead Gen" },
    { name: "Dotloop", short: "DL", domain: "Transactions" },
    { name: "SkySlope", short: "SS", domain: "Compliance" },
    { name: "ShowingTime", short: "ST", domain: "Showings" },
    { name: "Zillow Premier", short: "Z", domain: "Listings" },
    { name: "Matterport", short: "MP", domain: "3D Tours" },
];

// =================================================================
// 13 scenes · ~12-13 min runtime · auto-played, no clicks required
// Each scene has a `fallback_ms` — used when audio is muted or fails.
// Audio.ended is the primary advance trigger; fallback_ms is the cap.
// =================================================================
const SCENES = [
    // Scene 1 — Hook (~45s)
    {
        id: "hook", section: "Scene 1 · The Hook", title: "You don't have a lead problem. You have a system problem.",
        focus: "fragmented-tools", image: IMG.deskMonitors, fallback_ms: 45000,
        narration:
            "Right now, somewhere in your business, a high-intent lead is going cold. Not because your agents aren't good — but because the tools meant to support them are working against them. " +
            "Your CRM, your email platform, your MLS, your marketing tools, your spreadsheets — all of them are running, and none of them are talking to each other. " +
            "You don't have a lead problem. You have a system problem.",
    },
    // Scene 2 — Current Software Reality (~60s)
    {
        id: "current-stack", section: "Scene 2 · Current Software Reality", title: "Your stack already exists.",
        focus: "software-grid-all", image: IMG.conferenceRoom, fallback_ms: 60000,
        narration:
            "Most real estate companies already use a powerful software stack. Customer relationship platforms like Salesforce and Follow Up Boss. Listing systems like the MLS, kvCORE, and Zillow. Property platforms like Yardi, AppFolio, and RealPage. Marketing, email, and transaction tools layered on top. " +
            "These tools are excellent at what they do — but each one operates as its own island, with its own login, its own data, its own version of the truth. " +
            "CreatorBoostAI is not here to replace any of them. CreatorBoostAI is the layer that sits on top.",
    },
    // Scene 3 — CB Introduction (~60s)
    {
        id: "cb-intro", section: "Scene 3 · CreatorBoostAI", title: "CreatorBoostAI sits on top of everything you use.",
        focus: "overlay", image: IMG.citySkyline, fallback_ms: 60000,
        narration:
            "CreatorBoostAI is your operating layer. " +
            "It connects to the systems you already run — your CRM, your MLS, your email, your marketing platforms, your property management software — and unifies them into a single intelligent command center. " +
            "No replacement. No migration. No disruption. The systems your teams already know stay exactly as they are. CreatorBoostAI just makes them work together for the first time.",
    },
    // Scene 4 — Lead Capture (~60s)
    {
        id: "lead-capture", section: "Scene 4 · Lead Capture", title: "Every lead, captured automatically.",
        focus: "lead-funnel", image: IMG.agentPhone, fallback_ms: 60000,
        narration:
            "Leads enter your business from everywhere. Your website. Paid ads. Social. Referrals. Open houses. Listing portals. Inbound calls and texts. " +
            "CreatorBoostAI captures every one of them in real time, automatically logs them, tags them by source and intent, and routes them into the right system — Salesforce, Follow Up Boss, kvCORE, BoomTown — whichever your team already uses. " +
            "No manual entry. No leads lost in an inbox. No deal slipping through a crack.",
    },
    // Scene 5 — AI Qualification (~60s)
    {
        id: "ai-qualify", section: "Scene 5 · AI Qualification", title: "AI scores intent, urgency, and capacity.",
        focus: "dashboard-leads", image: IMG.agentClient, fallback_ms: 60000,
        narration:
            "Once a lead is captured, CreatorBoostAI's AI goes to work. " +
            "It reads the conversation, the form fill, the property history, and the behavior — and produces three scores: intent, urgency, and financial capacity. " +
            "A motivated seller relocating in sixty days surfaces at the top of the queue. A casual browser is nurtured automatically. A pre-approved buyer ready this weekend gets routed to your top-performing agent immediately.",
    },
    // Scene 6 — Follow-Up Automation (~90s)
    {
        id: "follow-up", section: "Scene 6 · Follow-Up Automation", title: "The right message, at the right moment.",
        focus: "follow-up-automation", image: IMG.deskMonitors, fallback_ms: 90000,
        narration:
            "Most leads aren't lost in the first call. They're lost in the follow-up. " +
            "CreatorBoostAI builds a personalized follow-up sequence for every lead — email, text message, and recommended call windows — timed to the lead's actual behavior, not a static drip. " +
            "If a buyer opens your listing email at nine p.m., the system suggests a morning text. If a seller goes quiet for ten days, it triggers a re-engagement message in your voice. " +
            "Every touch is drafted automatically. Your agents review, approve, and send — or, if you choose, the system sends on their behalf. Either way, no lead waits more than a few hours for a thoughtful, personal response.",
    },
    // Scene 7 — Task + Pipeline (~60s)
    {
        id: "task-pipeline", section: "Scene 7 · Tasks & Pipeline", title: "Auto-generated tasks. Live pipeline.",
        focus: "pipeline", image: IMG.teamWorking, fallback_ms: 60000,
        narration:
            "Every qualified lead generates a task list automatically: schedule the showing, send the comps, prepare the listing presentation, draft the offer. Each task is assigned, timestamped, and tracked. " +
            "And every deal moves through a live pipeline — from new lead to appointment to active to under contract to closed — visible to leadership in real time, with revenue forecasts that update every minute.",
    },
    // Scene 8 — Property + Management Integration (~60s)
    {
        id: "property-mgmt", section: "Scene 8 · Property & Management", title: "Listings, rentals, and operations in one view.",
        focus: "dashboard-property", image: IMG.luxuryHome, fallback_ms: 60000,
        narration:
            "CreatorBoostAI extends beyond sales. " +
            "It pulls listings, rental performance, lease renewals, maintenance requests, vacancy risk, and tenant communication from your property management platforms — Yardi, AppFolio, RealPage, MRI — into the same command center your sales team uses. " +
            "Sales, leasing, and operations finally share the same source of truth.",
    },
    // Scene 9 — Revenue Engine (~60s)
    {
        id: "revenue-engine", section: "Scene 9 · Revenue Engine", title: "Deals closing. Commissions tracked. Pipeline forecasted.",
        focus: "dashboard-financial", image: IMG.handshake, fallback_ms: 60000,
        narration:
            "This is where it all converts to revenue. " +
            "Closed deals, commission splits, gross commission income, and net operating income flow into one financial layer. Pipeline forecasting projects the next thirty, sixty, and ninety days based on real deal velocity — not gut feel. " +
            "Leadership sees exactly what's closing, when, and what each agent and asset is contributing to the bottom line.",
    },
    // Scene 10 — System Integration Layer (~90s)
    {
        id: "integration-layer", section: "Scene 10 · Integration Layer", title: "We don't replace. We oversee and optimize.",
        focus: "connect", image: IMG.corporateOffice, fallback_ms: 90000,
        narration:
            "Here's how CreatorBoostAI actually plugs in. " +
            "It connects through standard, secure APIs — the same pattern every modern enterprise integration uses. It connects to your CRM, your MLS, your email platform, your marketing stack, your transaction tools, and your property management software. " +
            "Read-only by default. Encrypted in transit and at rest. Every action logged. Every automated message reviewable before send. " +
            "We don't replace your systems. We oversee, organize, and optimize them — so your existing investments finally start producing the leverage they were supposed to.",
    },
    // Scene 11 — Dashboard Reveal (~90s)
    {
        id: "dashboard-reveal", section: "Scene 11 · The Command Center", title: "One screen. Whole business.",
        focus: "dashboard-executive", image: IMG.conferenceRoom, fallback_ms: 90000,
        narration:
            "This is the command center. " +
            "Total pipeline, projected revenue, active leads scored by intent, every agent's live performance, every property's status, every campaign's return, every task across every team — all in one view, all updating in real time. " +
            "Leadership opens this dashboard in the morning and instantly knows: what's moving, what's stuck, who needs help, and where the next dollar of revenue is coming from. " +
            "What used to take five reports, three meetings, and a Monday morning email — is now one screen.",
    },
    // Scene 12 — Autonomous Option (~60s)
    {
        id: "autonomous", section: "Scene 12 · Autonomous Mode", title: "Approve every move — or let the system act.",
        focus: "autonomous-choice", image: IMG.agentClient, fallback_ms: 60000,
        narration:
            "Now the most important question. " +
            "Would you like CreatorBoostAI to take action automatically — sending follow-ups, booking showings, routing leads, drafting contracts — or would you prefer to review and approve every move before it goes out? " +
            "You choose, by team, by channel, by deal size. Full autonomy, full approval, or anywhere in between. The system always defers to your control.",
    },
    // Scene 13 — Closing (~45s)
    {
        id: "closing", section: "Scene 13 · Closing", title: "This is your business operating system.",
        focus: "cta", image: IMG.handshake, fallback_ms: 45000,
        narration:
            "This is not another tool to add to your stack. " +
            "This is the operating system for your real estate business. The layer that finally makes every system, every agent, every lead, and every property work together — automatically. " +
            "When you're ready, send this demo to your leadership team, replay any section, or book a live walkthrough where we map CreatorBoostAI directly to your stack. Welcome to the new operating standard for real estate.",
    },
];

const SCENE_GAP_MS = 600;

// =================================================================
// Page
// =================================================================
export default function RealtorDemoPage() {
    const [started, setStarted] = useState(false);
    const [scene, setScene] = useState(0);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [audioCache, setAudioCache] = useState({});
    const [prefetching, setPrefetching] = useState(false);
    const [prefetchProgress, setPrefetchProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [sceneElapsed, setSceneElapsed] = useState(0); // ms within current scene

    const audioRef = useRef(null);
    const advanceTimer = useRef(null);
    const maxTimer = useRef(null);
    const tickTimer = useRef(null);
    const sceneStart = useRef(0);

    const current = SCENES[scene];
    const total = SCENES.length;

    const totalRuntimeMs = useMemo(
        () => SCENES.reduce((a, s) => a + (s.fallback_ms || 60000), 0),
        []
    );
    const elapsedBeforeScene = useMemo(
        () => SCENES.slice(0, scene).reduce((a, s) => a + (s.fallback_ms || 60000), 0),
        [scene]
    );
    const overallProgress = Math.min(
        100,
        Math.round(((elapsedBeforeScene + sceneElapsed) / totalRuntimeMs) * 100)
    );

    const apiBase = useMemo(() => {
        const base = process.env.REACT_APP_BACKEND_URL || "";
        return `${base}/api`;
    }, []);

    const prefetchAll = useCallback(async () => {
        setPrefetching(true);
        setPrefetchProgress(0);
        const cache = {};
        const CONCURRENCY = 5;
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
            } catch { /* fallback later */ }
            donec += 1;
            setPrefetchProgress(Math.round((donec / SCENES.length) * 100));
        };
        for (let i = 0; i < SCENES.length; i += CONCURRENCY) {
            const chunk = SCENES.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(fetchOne));
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
        setScene(prev => {
            if (prev >= total - 1) { setDone(true); return prev; }
            return prev + 1;
        });
    }, [total]);

    const speakScene = useCallback((idx, cache = audioCache) => {
        clearAllTimers();
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        const sc = SCENES[idx];
        if (!sc) return;
        sceneStart.current = Date.now();
        setSceneElapsed(0);
        // ticker for global progress bar
        tickTimer.current = setInterval(() => {
            setSceneElapsed(Date.now() - sceneStart.current);
        }, 250);
        // hard max fallback — guarantees scene never freezes
        const maxMs = sc.fallback_ms || 60000;
        maxTimer.current = setTimeout(() => {
            if (!paused) goToNext();
        }, maxMs + 1500);

        if (muted) {
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => {
                if (!paused) goToNext();
            }, maxMs);
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
            const female = voices.find(v => /female|samantha|victoria|karen|ava/i.test(v.name)) || voices.find(v => v.lang?.startsWith("en"));
            if (female) u.voice = female;
            u.onstart = () => setSpeaking(true);
            u.onend = () => {
                setSpeaking(false);
                if (paused) return;
                advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
            };
            window.speechSynthesis.speak(u);
        } else {
            // No audio path at all — pure timed advance
            advanceTimer.current = setTimeout(() => {
                if (!paused) goToNext();
            }, maxMs);
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
            // restart ticker and max-timer with remaining time
            const remaining = Math.max(2000, (current.fallback_ms || 60000) + 1500 - sceneElapsed);
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
        setMuted(p => {
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
                <GlobalTimeline
                    overallProgress={overallProgress}
                    scene={scene}
                    total={total}
                    section={current.section}
                />
            )}

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="realtor-demo-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-50" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 480, height: 480, top: -160, left: -120 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -180, right: -100 }} />
                </div>

                <Hero />

                {!started ? (
                    <StartScreen onStart={handleStart} prefetching={prefetching} progress={prefetchProgress} />
                ) : (
                    <div className="mt-6">
                        <SceneHeader
                            scene={scene} current={current} total={total}
                            paused={paused} speaking={speaking} muted={muted}
                            onPauseResume={handlePauseResume} onMute={handleMute}
                        />

                        {/* Cinematic image band */}
                        <CinematicBand image={current.image} title={current.title} section={current.section} />

                        {/* Main scene content */}
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <SceneStage scene={current} />
                            </div>
                            <div className="space-y-4 lg:col-span-4">
                                <AvatarPanel
                                    narration={current.narration}
                                    speaking={speaking} muted={muted} paused={paused}
                                    onMute={handleMute}
                                />
                                <SceneIndex current={scene} total={total} />
                            </div>
                        </div>

                        {/* Cinematic subtitle bar — bottom of viewport */}
                        <SubtitleBar narration={current.narration} muted={muted} />

                        {(current.focus === "cta" || done) && (
                            <div className="mt-6"><ClosingCTA onReplay={handleRestart} /></div>
                        )}
                    </div>
                )}

                <div className="mt-12"><TryYourLead /></div>
                <div className="mt-12"><CustomerEmailSection /></div>
            </div>
        </Layout>
    );
}

// =================================================================
// Hero + start screen
// =================================================================
const Hero = () => (
    <section className="relative" data-testid="realtor-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Enterprise Realtor Demo</span>
        </div>
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            One command center for your{" "}
            <span className="text-cyan-400">entire real estate operation.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            CreatorBoostAI sits on top of the systems you already run — Yardi, Salesforce, Follow Up Boss,
            kvCORE, and the rest — and unifies them into a single executive command center. No replacement,
            no migration, no disruption.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching, progress }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console</p>
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the 13-scene walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 13-scene cinematic walkthrough — narrated by Nova, an executive A.I. voice —
                    showing how CreatorBoostAI sits on top of the systems you already use and turns them into a
                    single command center. No clicks required. Sit back and watch.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                        onClick={onStart} disabled={prefetching} data-testid="start-demo-btn"
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
                        Auto-plays · ~12 min · Voice: Nova
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "13 cinematic scenes",
                        "100% auto-play · no clicks",
                        "Sits on top — never replaces",
                        "Subtitles + voice toggle",
                    ].map((b) => (
                        <li key={b} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <Check size={13} className="text-cyan-400" /> {b}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="lg:col-span-5">
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Connects with your existing stack</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[...ENTERPRISE_SOFTWARE, ...FIELD_SOFTWARE].slice(0, 12).map((s) => (
                            <div key={s.name} className="flex flex-col items-center justify-center rounded-sm border border-white/10 bg-ink-900 px-2 py-3">
                                <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                                <span className="mt-1 text-center text-[9px] text-slate-400 leading-tight">{s.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const SceneHeader = ({ scene, current, total, paused, speaking, muted, onPauseResume, onMute }) => (
    <div className="sticky top-[72px] z-20 mt-2 flex flex-col gap-3 rounded-md border border-white/10 bg-ink-900/85 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400" data-testid="scene-indicator">
                    Scene {scene + 1} of {total}
                </span>
                <span className="rounded-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">{current.section}</span>
                {speaking && !muted && <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> NARRATING</span>}
                {paused && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PAUSED</span>}
            </div>
            <h2 className="font-heading mt-1 truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{current.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={onPauseResume} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} primary testid="control-pause" />
            <Btn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Voice On" : "Voice Off"} testid="control-mute" />
        </div>
    </div>
);
const Btn = ({ onClick, icon: Icon, label, primary, testid }) => (
    <button onClick={onClick} data-testid={testid}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${primary ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900" : "border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"}`}>
        <Icon size={12} /> <span>{label}</span>
    </button>
);

// Fixed top-of-viewport global timeline (above navbar)
const GlobalTimeline = ({ overallProgress, scene, total, section }) => (
    <>
        {/* Thin progress bar at very top — above navbar */}
        <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 bg-white/5" data-testid="global-timeline">
            <div
                className="h-0.5 bg-cyan-500 transition-all duration-300 ease-linear"
                style={{ width: `${overallProgress}%`, boxShadow: "0 0 10px rgba(6,182,212,0.7)" }}
            />
        </div>
        {/* Compact scene meta strip below navbar */}
        <div className="sticky top-[72px] z-30 border-b border-white/10 bg-ink-900/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-1.5 lg:px-8">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400">
                    Scene {scene + 1} / {total}
                </span>
                <span className="hidden truncate font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400 sm:inline">
                    · {section}
                </span>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{overallProgress}%</span>
            </div>
        </div>
    </>
);

// Cinematic subtitle bar — bottom of viewport during demo
const SubtitleBar = ({ narration, muted }) => (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-20 sm:pb-16 lg:pb-10" data-testid="subtitle-bar">
        <div className="mx-auto max-w-4xl rounded-md border border-white/10 bg-ink-900/85 px-4 py-3 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] lg:px-6 lg:py-4">
            <div className="flex items-start gap-3">
                <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400">
                    {muted ? "CC" : "Nova"}
                </span>
                <p
                    className="text-sm leading-relaxed text-white sm:text-base lg:text-lg fade-in-up"
                    key={narration}
                >
                    {narration}
                </p>
            </div>
        </div>
    </div>
);

// =================================================================
// Cinematic image band
// =================================================================
const CinematicBand = ({ image, title, section }) => (
    <div className="relative mt-4 h-44 overflow-hidden rounded-md border border-white/10 bg-ink-800 sm:h-52 lg:h-60" data-testid="cinematic-band">
        <img src={image} alt="" loading="eager" className="h-full w-full object-cover opacity-50 animate-ken-burns" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/60 to-ink-900/20" />
        <div className="absolute inset-0 ambient-grid opacity-50" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-6 lg:px-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{section}</p>
            <h3 className="font-heading mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl max-w-xl">{title}</h3>
        </div>
        <span className="scan-sweep" />
    </div>
);

// =================================================================
// Scene stage — routes to the right visual content
// =================================================================
const SceneStage = ({ scene }) => {
    const f = scene.focus;
    if (f === "fragmented-tools") return <FragmentedTools />;
    if (f === "software-grid-all") return <SoftwareGridAll />;
    if (f === "overlay") return <SoftwareOverlay />;
    if (f === "lead-funnel") return <LeadCaptureFunnel />;
    if (f === "follow-up-automation") return <FollowUpAutomation />;
    if (f === "pipeline") return <PipelinePanel />;
    if (f === "autonomous-choice") return <AutonomousChoice />;
    if (f === "connect") return <ConnectionDiagram />;
    if (f === "dashboard-leads") return <DashboardMockup kind="leads" />;
    if (f === "dashboard-property") return <DashboardMockup kind="property" />;
    if (f === "dashboard-financial") return <DashboardMockup kind="financial" />;
    if (f === "dashboard-executive") return <DashboardMockup kind="executive" />;
    if (f === "cta") return <NarrativePanel scene={scene} />;
    return <NarrativePanel scene={scene} />;
};

const NarrativePanel = ({ scene }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-8 fade-in-up" key={scene.id}>
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sparkles size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Narrative</span>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
                <p className="font-heading text-2xl font-semibold leading-tight text-white sm:text-3xl">{scene.title}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{scene.narration}</p>
            </div>
            <div className="relative overflow-hidden rounded-sm border border-white/10 bg-ink-800">
                <img src={scene.image} alt="" loading="lazy" className="h-full w-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
            </div>
        </div>
    </div>
);

const SoftwareGrid = ({ kind }) => {
    const list = kind === "field" ? FIELD_SOFTWARE : ENTERPRISE_SOFTWARE;
    const label = kind === "field" ? "Field Operations Stack" : "Enterprise Real Estate Stack";
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="software-grid">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Layers size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((s, i) => (
                    <div key={s.name} className="relative rounded-sm border border-white/10 bg-ink-800 p-4 transition-all hover:border-cyan-500/40 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5 font-mono text-xs font-semibold text-cyan-300">{s.short}</div>
                        <p className="mt-3 text-sm font-semibold text-white">{s.name}</p>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{s.domain}</p>
                    </div>
                ))}
            </div>
            <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">CreatorBoostAI connects to all of these via secure API · read-only · no replacement</p>
        </div>
    );
};

const SoftwareOverlay = () => (
    <div className="relative rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 fade-in-up" data-testid="software-overlay">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Network size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Unified Overlay</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {[...ENTERPRISE_SOFTWARE, ...FIELD_SOFTWARE].map((s, i) => (
                <div key={s.name} className="relative flex flex-col items-center justify-center rounded-sm border border-white/10 bg-ink-900 p-2 fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                </div>
            ))}
        </div>
        <div className="mt-6 flex items-center justify-center">
            <div className="flex h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <span className="px-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">↓ unify ↓</span>
            <div className="flex h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>
        <div className="mt-6 rounded-sm border border-cyan-500/40 bg-ink-900 p-5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">CreatorBoostAI · Command Center</p>
            <p className="font-heading mt-2 text-xl font-semibold text-white">One view. Whole company.</p>
        </div>
    </div>
);

// =================================================================
// Phase-2 scene visuals
// =================================================================

// Scene 1 — fragmented tools (CRM, Email, MLS, Spreadsheets) all running in parallel
const FragmentedTools = () => {
    const tools = [
        { Icon: Users, name: "CRM", note: "Salesforce / FUB", count: "4,128 leads" },
        { Icon: Mail, name: "Email", note: "Outlook · Gmail · Mailchimp", count: "324 unread" },
        { Icon: Home, name: "MLS", note: "Listings · Showings", count: "1,284 listings" },
        { Icon: FileText, name: "Spreadsheets", note: "Tracking · Reporting", count: "62 sheets" },
        { Icon: MessageSquare, name: "SMS / Chat", note: "Direct + portal", count: "184 threads" },
        { Icon: Briefcase, name: "Marketing", note: "Ads · Social", count: "12 campaigns" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="fragmented-tools">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Layers size={13} className="text-amber-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Disconnected Tools — Today's Reality</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tools.map((t, i) => (
                    <div key={t.name} className="relative rounded-sm border border-white/10 bg-ink-800 p-4 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-amber-500/30 bg-amber-500/5">
                                <t.Icon size={14} className="text-amber-400" />
                            </div>
                            <span className="text-sm font-semibold text-white">{t.name}</span>
                        </div>
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{t.note}</p>
                        <p className="mt-2 font-heading text-base font-semibold text-amber-300">{t.count}</p>
                        <span className="mt-2 inline-block rounded-sm border border-amber-500/30 bg-amber-500/5 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-amber-300">isolated</span>
                    </div>
                ))}
            </div>
            <p className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">No system talks to another. Leads slip. Decisions slow. Revenue leaks.</p>
        </div>
    );
};

// Scene 2 — full unified software stack visualization (enterprise + field)
const SoftwareGridAll = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="software-grid-all">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Layers size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Your Existing Real Estate Stack</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{ENTERPRISE_SOFTWARE.length + FIELD_SOFTWARE.length} platforms</span>
        </div>
        <div className="mt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Enterprise</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {ENTERPRISE_SOFTWARE.map((s, i) => (
                    <div key={s.name} className="rounded-sm border border-white/10 bg-ink-800 p-2 text-center fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                        <p className="mt-1 truncate text-[9px] text-slate-400">{s.name}</p>
                    </div>
                ))}
            </div>
        </div>
        <div className="mt-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Field</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {FIELD_SOFTWARE.map((s, i) => (
                    <div key={s.name} className="rounded-sm border border-white/10 bg-ink-800 p-2 text-center fade-in-up" style={{ animationDelay: `${(i + 7) * 50}ms` }}>
                        <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                        <p className="mt-1 truncate text-[9px] text-slate-400">{s.name}</p>
                    </div>
                ))}
            </div>
        </div>
        <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">CreatorBoostAI connects to all — read-only · API-native · no replacement</p>
    </div>
);

// Scene 4 — lead capture funnel
const LeadCaptureFunnel = () => {
    const sources = [
        { name: "Website", count: "847", trend: "+12%" },
        { name: "Paid Ads", count: "612", trend: "+8%" },
        { name: "Referrals", count: "318", trend: "+24%" },
        { name: "Open Houses", count: "194", trend: "+6%" },
        { name: "Listing Portals", count: "521", trend: "+15%" },
        { name: "Social", count: "287", trend: "+19%" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="lead-funnel">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Target size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Lead Capture · Live Sources</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sources.map((s, i) => (
                    <div key={s.name} className="rounded-sm border border-white/10 bg-ink-800 p-3 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">{s.name}</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{s.trend}</span>
                        </div>
                        <p className="mt-2 font-heading text-2xl font-semibold text-cyan-300">{s.count}</p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">leads / 30d</p>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex items-center justify-center">
                <div className="flex h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                <span className="px-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">↓ auto-tag · auto-route ↓</span>
                <div className="flex h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            </div>
            <div className="mt-4 rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-heading text-sm font-semibold text-white">Auto-routed to your CRM</span>
                    <div className="flex items-center gap-2">
                        {["Salesforce", "FUB", "kvCORE", "BoomTown"].map((c) => (
                            <span key={c} className="rounded-sm border border-cyan-500/30 bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300">{c}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Scene 6 — follow-up automation timeline
const FollowUpAutomation = () => {
    const steps = [
        { time: "00:02", channel: "Email", note: "Welcome + matching listings (auto-drafted)" },
        { time: "06:30", channel: "SMS", note: "Personal text — agent voice" },
        { time: "Day 1", channel: "Call", note: "Call window suggested · 9–11am" },
        { time: "Day 3", channel: "Email", note: "Listing drop · matched to criteria" },
        { time: "Day 7", channel: "SMS", note: "Re-engage if no response" },
        { time: "Day 14", channel: "Call", note: "Agent escalation · scored hot" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="follow-up-automation">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Zap size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Personalized Follow-Up Sequence</span>
            </div>
            <ul className="mt-5 space-y-2">
                {steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-sm border border-white/10 bg-ink-800 p-3 fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
                        <span className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{s.time}</span>
                        <span className="rounded-sm border border-white/10 bg-ink-900 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">{s.channel}</span>
                        <span className="flex-1 text-sm text-slate-200">{s.note}</span>
                        <Check size={13} className="mt-1 text-cyan-400" />
                    </li>
                ))}
            </ul>
            <p className="mt-4 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Drafted automatically · agent reviews + approves · or full autonomous send
            </p>
        </div>
    );
};

// Scene 7 — task + pipeline panel
const PipelinePanel = () => {
    const stages = [
        { stage: "New Lead", count: 184, value: "$0" },
        { stage: "Appointment", count: 96, value: "$24.6M" },
        { stage: "Active Listing", count: 62, value: "$48.2M" },
        { stage: "Under Contract", count: 38, value: "$32.4M" },
        { stage: "Closed", count: 21, value: "$18.7M" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="pipeline-panel">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <TrendingUp size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Live Pipeline · Auto-Generated Tasks</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {stages.map((s, i) => (
                    <div key={s.stage} className="rounded-sm border border-white/10 bg-ink-800 p-3 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{s.stage}</p>
                        <p className="mt-2 font-heading text-2xl font-semibold text-cyan-300">{s.count}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-300">{s.value}</p>
                    </div>
                ))}
            </div>
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-800 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Auto-tasks generated this hour</p>
                <ul className="mt-3 divide-y divide-white/5">
                    {[
                        ["Schedule showing · 1847 Lake Dr SE", "S. Miller", "now"],
                        ["Send comps · 412 Cherry St", "M. Reed", "1h"],
                        ["Draft listing presentation · Eastown 12-unit", "D. Brooks", "2h"],
                        ["Prepare offer · downtown loft", "J. Carter", "4h"],
                    ].map(([task, agent, due], i) => (
                        <li key={i} className="flex items-center justify-between py-2">
                            <span className="text-sm text-slate-200">{task}</span>
                            <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
                                <span className="text-slate-400">{agent}</span>
                                <span className="text-cyan-300">· due {due}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// Scene 12 — autonomous mode choice
const AutonomousChoice = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="autonomous-choice">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Brain size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Avatar Asks</span>
        </div>
        <p className="mt-5 font-heading text-xl leading-snug text-white sm:text-2xl">
            "Would you like me to take action automatically — or wait for your approval?"
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-5">
                <div className="flex items-center gap-2">
                    <Rocket size={14} className="text-cyan-400" />
                    <span className="font-heading text-base font-semibold text-white">Autonomous</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">CreatorBoostAI sends follow-ups, books showings, and routes leads on its own — within the rules you set.</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Faster response time</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Always-on coverage</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Full audit trail</li>
                </ul>
            </div>
            <div className="rounded-sm border border-white/15 bg-ink-800 p-5">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-cyan-400" />
                    <span className="font-heading text-base font-semibold text-white">Approval Mode</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">Every outbound message and action is drafted by the AI and queued for your team to approve before it's sent.</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Full human control</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Brand voice review</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Compliance-friendly</li>
                </ul>
            </div>
        </div>
        <p className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
            Mix and match — by team, by channel, by deal size
        </p>
    </div>
);

// Dashboard mockups — different KPIs per type
const DASHBOARD_DATA = {
    executive: {
        kpis: [{ l: "Total Pipeline", v: "$184.2M", d: "+8.4%" }, { l: "Forecast Q", v: "$42.6M", d: "Above plan" }, { l: "Active Listings", v: "1,284", d: "+62" }, { l: "Occupancy", v: "94.6%", d: "+1.2 pts" }],
        list: [{ l: "Brokerage MoM revenue", v: "+12%", t: "up" }, { l: "Open transactions", v: "327", t: "neutral" }, { l: "At-risk renewals", v: "18", t: "warn" }, { l: "Avg DOM", v: "21d", t: "up" }],
    },
    leads: {
        kpis: [{ l: "Active Leads", v: "4,128", d: "+312 wk" }, { l: "Hot · 80%+", v: "287", d: "Action now" }, { l: "Stale", v: "104", d: "Re-engage" }, { l: "Conversion", v: "11.4%", d: "+1.8 pts" }],
        list: [{ l: "S. Miller · Seller", v: "92%", t: "up" }, { l: "M. Reed · Buyer", v: "67%", t: "neutral" }, { l: "D. Brooks · PM", v: "84%", t: "up" }, { l: "J. Carter · Rental", v: "71%", t: "neutral" }],
    },
    agents: {
        kpis: [{ l: "Active Agents", v: "168", d: "On platform" }, { l: "Avg Resp", v: "3m 12s", d: "−47s" }, { l: "Top Closers", v: "12", d: "≥6 deals/mo" }, { l: "Coaching Flags", v: "7", d: "Below baseline" }],
        list: [{ l: "Lopez, A. · 9 deals", v: "$4.2M GCI", t: "up" }, { l: "Patel, R. · 7 deals", v: "$3.1M GCI", t: "up" }, { l: "Chen, M. · 4 deals", v: "$1.6M GCI", t: "neutral" }, { l: "Smith, K. · 1 deal", v: "$0.4M GCI", t: "warn" }],
    },
    property: {
        kpis: [{ l: "Listings", v: "1,284", d: "Across markets" }, { l: "Avg DOM", v: "21d", d: "−4d" }, { l: "Showing demand", v: "+18%", d: "WoW" }, { l: "Vacancy risk", v: "32 units", d: "30d window" }],
        list: [{ l: "1847 Lake Dr SE · 49506", v: "$685k · Hot", t: "up" }, { l: "412 Cherry St · 49503", v: "$395k · Warm", t: "neutral" }, { l: "Eastown 12-unit", v: "Renewal risk", t: "warn" }, { l: "Downtown loft 2BD", v: "$2,150/mo", t: "neutral" }],
    },
    marketing: {
        kpis: [{ l: "MQLs", v: "2,847", d: "+19%" }, { l: "CAC", v: "$184", d: "−$22" }, { l: "Best channel", v: "Referral", t: "up" }, { l: "ROI", v: "6.4×", d: "Blended" }],
        list: [{ l: "Paid Search", v: "$72/MQL", t: "up" }, { l: "Social", v: "$96/MQL", t: "neutral" }, { l: "Email Nurture", v: "$31/MQL", t: "up" }, { l: "Listing Portals", v: "$210/MQL", t: "warn" }],
    },
    operations: {
        kpis: [{ l: "Open Txns", v: "327", d: "Across teams" }, { l: "Compliance", v: "98.4%", d: "Clean" }, { l: "Cycle time", v: "27d", d: "−3d" }, { l: "Exceptions", v: "9", d: "Need review" }],
        list: [{ l: "Dotloop · contracts", v: "184 active", t: "up" }, { l: "SkySlope · audits", v: "12 open", t: "neutral" }, { l: "ShowingTime · today", v: "342 booked", t: "up" }, { l: "TC backlog", v: "6", t: "warn" }],
    },
    financial: {
        kpis: [{ l: "GCI YTD", v: "$48.2M", d: "+11%" }, { l: "NOI", v: "$12.4M", d: "Portfolio" }, { l: "Forecast EBITDA", v: "$18.6M", d: "Q ending" }, { l: "Run-rate", v: "+7.2%", d: "vs prior Q" }],
        list: [{ l: "Yardi · Property NOI", v: "$8.4M", t: "up" }, { l: "Dynamics · OpEx", v: "$3.1M", t: "neutral" }, { l: "MRI · Lease Rev", v: "$5.7M", t: "up" }, { l: "Salesforce · Pipeline", v: "$184M", t: "up" }],
    },
};
const DashboardMockup = ({ kind }) => {
    const data = DASHBOARD_DATA[kind] || DASHBOARD_DATA.executive;
    const labelMap = { executive: "Executive Overview", leads: "Lead Intelligence", agents: "Agent Performance", property: "Property Intelligence", marketing: "Marketing Performance", operations: "Operations", financial: "Financial Performance" };
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid={`dashboard-${kind}`} key={kind}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{labelMap[kind]}</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> LIVE</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.kpis.map((k) => (
                    <div key={k.l} className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{k.l}</p>
                        <p className="font-heading mt-2 text-xl font-semibold text-white">{k.v}</p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{k.d}</p>
                    </div>
                ))}
            </div>
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-800 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Live activity</p>
                <ul className="mt-2 divide-y divide-white/5">
                    {data.list.map((row) => (
                        <li key={row.l} className="flex items-center justify-between py-2">
                            <span className="text-sm text-slate-200">{row.l}</span>
                            <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${row.t === "up" ? "text-cyan-300" : row.t === "warn" ? "text-amber-300" : "text-slate-400"}`}>{row.v}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const NetworkMap = () => {
    const cities = [
        { name: "Grand Rapids, MI", x: 38, y: 42, listings: 312 },
        { name: "Chicago, IL", x: 32, y: 50, listings: 484 },
        { name: "Detroit, MI", x: 45, y: 42, listings: 218 },
        { name: "Indianapolis, IN", x: 38, y: 58, listings: 196 },
        { name: "Cleveland, OH", x: 52, y: 46, listings: 174 },
        { name: "Columbus, OH", x: 50, y: 54, listings: 156 },
        { name: "Minneapolis, MN", x: 26, y: 32, listings: 248 },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="network-map">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Globe2 size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Network · Multi-Region View</span>
            </div>
            <div className="relative mt-4 h-72 overflow-hidden rounded-sm border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900">
                <div className="absolute inset-0 ambient-grid opacity-60" />
                {cities.map((c) => (
                    <div key={c.name} className="absolute" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                        <span className="absolute -inset-3 animate-ping rounded-full bg-cyan-400/20" />
                        <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 12px rgba(6,182,212,0.8)" }} />
                        <span className="absolute left-4 top-1 whitespace-nowrap rounded-sm border border-white/10 bg-ink-900/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300 backdrop-blur">
                            {c.name} · {c.listings}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
                <MicroStat label="Markets" value="7" />
                <MicroStat label="Listings" value={cities.reduce((a, c) => a + c.listings, 0).toLocaleString()} />
                <MicroStat label="Agent activity" value="Live" />
            </div>
        </div>
    );
};

const ConnectionDiagram = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="connection-diagram">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <GitBranch size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">How CB Connects</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <Server size={16} className="text-cyan-400" />
                <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 01 · Connect</p>
                <p className="mt-1 text-sm text-slate-200">Standard API connections to your existing platforms.</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <Database size={16} className="text-cyan-400" />
                <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 02 · Read</p>
                <p className="mt-1 text-sm text-slate-200">Read-only access to operational data. No system intrusion.</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <Cpu size={16} className="text-cyan-400" />
                <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 03 · Organize</p>
                <p className="mt-1 text-sm text-slate-200">Normalize, correlate, and present in your command center.</p>
            </div>
        </div>
        <div className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-4 text-center">
            <p className="font-heading text-lg font-semibold text-white">Your systems stay exactly as they are.</p>
        </div>
    </div>
);

const SecurityPanel = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="security-panel">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <ShieldCheck size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Security & Control</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
                { Icon: Lock, label: "Encryption", note: "TLS in transit · AES at rest" },
                { Icon: Users, label: "Role-based", note: "Leadership · Brokerage · Agent · Finance" },
                { Icon: FileText, label: "Audit Trail", note: "Every action logged + timestamped" },
                { Icon: Check, label: "Approval Gate", note: "Outreach requires authorization" },
            ].map((b) => (
                <div key={b.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4">
                    <b.Icon size={14} className="text-cyan-400" />
                    <p className="font-heading mt-2 text-sm font-semibold text-white">{b.label}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 leading-snug">{b.note}</p>
                </div>
            ))}
        </div>
    </div>
);

const SceneIndex = ({ current, total }) => {
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Layers size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Section Index</span>
            </div>
            <ul className="mt-3 max-h-72 overflow-y-auto pr-1 scrollbar-cyan space-y-1.5">
                {SCENES.map((s, i) => (
                    <li key={s.id} className={`flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-[11px] transition-all ${i === current ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200" : i < current ? "border-white/5 bg-ink-900 text-slate-400" : "border-white/5 bg-ink-900 text-slate-500"}`}>
                        <span className="font-mono text-[9px]">{String(i + 1).padStart(2, "0")}</span>
                        <span className="truncate">{s.section}</span>
                    </li>
                ))}
            </ul>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{current + 1} / {total}</p>
        </div>
    );
};

const AvatarPanel = ({ narration, speaking, muted, paused, onMute }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4 backdrop-blur-sm" data-testid="avatar-panel">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sparkles size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">CreatorBoostAI Assistant · Nova</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 ${speaking ? "animate-pulse" : ""}`} style={{ filter: speaking ? "blur(2px)" : "none" }} />
                <div className="relative flex h-full w-full items-center justify-center rounded-full border border-cyan-400/40 bg-ink-900">
                    <span className="font-heading text-xs font-semibold text-cyan-300">CBA</span>
                </div>
                {speaking && (<span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" /></span>)}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-white">CreatorBoostAI Assistant</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{paused ? "Paused" : speaking ? "Narrating…" : muted ? "Muted" : "Explaining demo"}</p>
            </div>
        </div>
        <p className="mt-4 max-h-64 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-200 scrollbar-cyan" key={narration}>
            <span className="fade-in-up inline-block">{narration}</span>
        </p>
        <div className="mt-4 flex items-center gap-2">
            <button onClick={onMute} data-testid="avatar-mute" className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">{muted ? <VolumeX size={11} /> : <Volume2 size={11} />} {muted ? "Voice On" : "Voice Off"}</button>
        </div>
    </div>
);

const MicroStat = ({ label, value }) => (
    <div className="rounded-sm border border-white/10 bg-ink-800 px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-1 font-heading text-base font-semibold text-white">{value}</p>
    </div>
);

const ClosingCTA = ({ onReplay }) => {
    const scrollToEmail = () => {
        const node = document.querySelector('[data-testid="email-generator"]');
        if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (
        <div data-testid="closing-cta" className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-6 lg:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Complete</p>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Take the next step.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Send this walkthrough to leadership, replay the demo, or book a live walkthrough where we map CreatorBoostAI directly to your stack.</p>
            <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={scrollToEmail} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400"><Mail size={15} /> Send this demo to a customer</button>
                <button onClick={onReplay} className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-transparent px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/10"><RotateCcw size={15} /> Replay Demo</button>
                <a href="/contact" className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-white transition-all hover:border-cyan-500/40 hover:text-cyan-300"><CalendarCheck size={15} /> Book a walkthrough</a>
            </div>
        </div>
    );
};

// =================================================================
// Try With Your Own Lead (live AI)
// =================================================================
const SAMPLE_LEAD = "Hi, I have a 4-bedroom home in East Grand Rapids worth around $700k. We're relocating to Florida in May and want to time the spring market right. I check Zillow weekly.";

const TryYourLead = () => {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const run = async () => {
        const desc = text.trim();
        if (desc.length < 10) { toast.error("Add a bit more detail (min 10 characters)"); return; }
        setLoading(true); setError(null); setResult(null);
        try { const data = await analyzeLead(desc); setResult(data); }
        catch (err) { const msg = err?.response?.data?.detail; setError(typeof msg === "string" ? msg : "Could not analyze. Try again."); }
        finally { setLoading(false); }
    };
    const useSample = () => setText(SAMPLE_LEAD);
    const copyMessage = async () => { if (!result) return; try { await navigator.clipboard.writeText(result.personalized_message); toast.success("Message copied"); } catch { toast.error("Copy failed"); } };
    const typeLabel = (t) => ({ buyer: "Buyer Lead", seller: "Seller Lead", renter: "Rental Lead", property_management: "Property Management", investor: "Investor Lead" }[t] || t);

    return (
        <section className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 lg:p-8" data-testid="try-your-lead">
            <div className="flex items-center gap-2"><Sparkles size={14} className="text-cyan-400" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Try With Your Own Lead</span></div>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Run live AI analysis on your own lead.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Paste a real lead description — what they said, what they want, what they're considering. CreatorBoostAI will analyze it and produce the next best action and a personalized outreach message in seconds.</p>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-3">
                    <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Hi, I'm interested in a 3-bedroom rental in Heritage Hill. Pre-approved up to $2,400/mo. Need to move in by April 1…" data-testid="lead-input" className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" />
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={run} disabled={loading} data-testid="lead-analyze-btn" className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 disabled:opacity-60">{loading ? (<><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900/30 border-t-ink-900" />Analyzing…</>) : (<><Brain size={14} /> Analyze Lead</>)}</button>
                        <button onClick={useSample} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"><Sparkles size={11} /> Use sample</button>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Powered by GPT · Emergent Universal Key</p>
                </div>
                <div className="lg:col-span-7">
                    <div className="rounded-md border border-white/10 bg-ink-800 p-5 min-h-[300px]">
                        {error && <div className="rounded-sm border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">{error}</div>}
                        {!result && !error && !loading && (<div className="flex h-64 items-center justify-center text-center"><p className="max-w-xs text-sm text-slate-500">Drop in a lead and click <span className="text-cyan-300">Analyze Lead</span>.</p></div>)}
                        {loading && (<div className="flex h-64 items-center justify-center"><p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Analyzing intent + drafting outreach…</p></div>)}
                        {result && (
                            <div className="space-y-5 fade-in-up">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{typeLabel(result.lead_type)}</span>
                                    <span className="rounded-sm border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">Intent · {result.intent_score}%</span>
                                    <span className="rounded-sm border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">Urgency · {result.urgency}%</span>
                                </div>
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Key Signals</p>
                                    <ul className="mt-2 space-y-1.5 text-sm text-slate-200">{result.key_signals.map((s, i) => (<li key={i} className="flex items-start gap-2"><Check size={13} className="mt-0.5 flex-shrink-0 text-cyan-400" /><span>{s}</span></li>))}</ul>
                                </div>
                                <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-3"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Recommended Action</p><p className="mt-1 text-sm text-white">{result.recommended_action}</p></div>
                                <div>
                                    <div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Personalized Outreach</p><button onClick={copyMessage} className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"><Copy size={11} /> Copy</button></div>
                                    <pre className="mt-2 whitespace-pre-wrap rounded-sm border border-white/10 bg-ink-900 p-4 font-sans text-sm leading-relaxed text-slate-200">{result.personalized_message}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

// =================================================================
// Customer email generator
// =================================================================
const INDUSTRIES = ["Realtor / Agent", "Brokerage", "Property Management", "Leasing Team", "Investor / Portfolio Owner"];
const CustomerEmailSection = () => {
    const [form, setForm] = useState({ name: "", email: "", company: "", industry: INDUSTRIES[0], note: "" });
    const [generated, setGenerated] = useState(null);
    const [copied, setCopied] = useState(false);
    const handle = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const demoLink = useMemo(() => { if (typeof window === "undefined") return "https://www.bodyiq-ai.com/demo/realtor"; return `${window.location.origin}/demo/realtor`; }, []);
    const generate = () => {
        if (!form.name || !form.email) { toast.error("Customer name and email are required"); return; }
        const subject = `See how CreatorBoostAI can help your ${form.industry.toLowerCase()} business convert more leads`;
        const body = `Hi ${form.name},\n\nI wanted to send you a quick demo of CreatorBoostAI for real estate businesses.\n\nThis demo shows how the system helps capture leads, analyze intent, recommend next steps, prepare follow-ups, support property management opportunities, and create measurable revenue outcomes.\n\nIt is designed for realtors, brokerages, property managers, leasing teams, and real estate businesses that want a smarter way to turn opportunities into appointments and revenue.\n\nYou can view the demo here:\n${demoLink}${form.note ? `\n\n${form.note}` : ""}\n\nBest,\nJeffrey`;
        setGenerated({ subject, body, to: form.email }); setCopied(false); toast.success("Email generated");
    };
    const copyEmail = async () => { if (!generated) return; const text = `To: ${generated.to}\nSubject: ${generated.subject}\n\n${generated.body}`; try { await navigator.clipboard.writeText(text); setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 2500); } catch { toast.error("Copy failed"); } };
    const copyLink = async () => { try { await navigator.clipboard.writeText(demoLink); toast.success("Demo link copied"); } catch { toast.error("Copy failed"); } };

    return (
        <section className="rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-8" data-testid="email-generator">
            <div className="flex items-center gap-2"><Mail size={14} className="text-cyan-400" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Send This Demo to a Customer</span></div>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Generate a personalized outreach email.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Fill in the customer details and we'll generate a ready-to-send email with the demo link.</p>
            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-4">
                    <Field label="Customer name *"><input type="text" value={form.name} onChange={handle("name")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Sarah Miller" /></Field>
                    <Field label="Customer email *"><input type="email" value={form.email} onChange={handle("email")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="sarah@millerrealty.com" /></Field>
                    <Field label="Company name"><input type="text" value={form.company} onChange={handle("company")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Miller Realty Group" /></Field>
                    <Field label="Industry type"><select value={form.industry} onChange={handle("industry")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none">{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></Field>
                    <Field label="Personal note (optional)"><textarea rows={3} value={form.note} onChange={handle("note")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Adds a personal line at the end." /></Field>
                    <button onClick={generate} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400"><Sparkles size={14} /> Generate Demo Email</button>
                </div>
                <div className="lg:col-span-7">
                    <div className="rounded-md border border-white/10 bg-ink-800 p-5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3"><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Email preview</span>{generated && (<button onClick={copyEmail} className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">{copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy email"}</button>)}</div>
                        {generated ? (<div className="mt-4 space-y-3"><p className="font-mono text-[11px] text-slate-400">To: <span className="text-white">{generated.to}</span></p><p className="font-mono text-[11px] text-slate-400">Subject: <span className="text-white">{generated.subject}</span></p><pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200 scrollbar-cyan">{generated.body}</pre></div>) : (<div className="flex h-72 items-center justify-center text-center"><p className="max-w-xs text-sm text-slate-500">Fill in the customer details and click <span className="text-cyan-300">Generate Demo Email</span>.</p></div>)}
                    </div>
                    <div className="mt-4 rounded-sm border border-white/10 bg-ink-800 p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Shareable demo link</p>
                        <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"><code className="flex-1 truncate rounded-sm border border-white/10 bg-ink-900 px-3 py-2 font-mono text-xs text-cyan-300">{demoLink}</code><button onClick={copyLink} className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-cyan-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"><Copy size={11} /> Copy link</button></div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Field = ({ label, children }) => (<label className="block"><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span><div className="mt-2">{children}</div></label>);
