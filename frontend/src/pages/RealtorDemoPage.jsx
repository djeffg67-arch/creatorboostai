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
// 22 scenes · ~12 min runtime · 13-section structure
// =================================================================
const SCENES = [
    // SECTION 0 — Intro
    {
        id: "intro", section: "Introduction", title: "A command center for real estate.",
        focus: "header", image: IMG.corporateOffice,
        narration:
            "Welcome. Over the next twelve minutes, you'll see how CreatorBoostAI operates as a unified command center across your entire real estate company. " +
            "This is not a new tool to add to your stack. It is the layer that connects everything you already use — and gives leadership one place to see, decide, and execute across the whole business.",
    },
    // SECTION 1 — Enterprise Reality
    {
        id: "enterprise-software", section: "Enterprise Reality", title: "Your enterprise systems run today.",
        focus: "software", image: IMG.conferenceRoom, softwareList: "enterprise",
        narration:
            "Large real estate companies already rely on powerful enterprise platforms. " +
            "Yardi, MRI, RealPage, AppFolio, Accruent, Salesforce, and Microsoft Dynamics are running operations, accounting, asset management, and customer relationships at scale. " +
            "These platforms are excellent at what they do — but each one operates as its own island.",
    },
    {
        id: "enterprise-teams", section: "Enterprise Reality", title: "People work inside those systems all day.",
        focus: "humans", image: IMG.teamWorking,
        narration:
            "Inside corporate offices, asset managers, accountants, marketing, and operations teams spend most of their day moving between dashboards. " +
            "Each system has its own login, its own data structure, its own view of the business. The work gets done — but no one sees the whole picture in real time.",
    },
    // SECTION 2 — Field Operations
    {
        id: "field-software", section: "Field Operations", title: "Field tools built for speed.",
        focus: "software", image: IMG.agentPhone, softwareList: "field",
        narration:
            "Out in the field, agents and brokers operate on a completely different stack. " +
            "Follow Up Boss, kvCORE, BoomTown, Dotloop, SkySlope, ShowingTime, Zillow Premier, and Matterport handle leads, listings, showings, transactions, and tours — built for speed and the realities of mobile work.",
    },
    {
        id: "field-agents", section: "Field Operations", title: "Agents move fast — and disconnected.",
        focus: "humans", image: IMG.agentClient,
        narration:
            "Agents are showing homes, taking calls, walking properties, sending contracts, and closing deals — all on their phones and tablets. " +
            "It's effective on the deal level, but the leadership team back at headquarters has almost no real-time visibility into what's actually happening across the field.",
    },
    // SECTION 3 — The Problem
    {
        id: "problem", section: "The Problem", title: "Fragmentation slows the entire company.",
        focus: "fragmentation", image: IMG.deskMonitors,
        narration:
            "This is the core problem. Corporate systems and field systems are running in parallel, never speaking to each other. " +
            "Data sits in silos. Decisions take longer than they should. Opportunities are missed because no single person can see the full picture across leads, listings, agents, properties, and revenue at the same time.",
    },
    // SECTION 4 — Introduction to CB
    {
        id: "cb-intro", section: "Introducing CB", title: "CreatorBoostAI sits on top.",
        focus: "intro-cb", image: IMG.citySkyline,
        narration:
            "This is where CreatorBoostAI begins. " +
            "CreatorBoostAI is a command center that sits on top of your existing systems. No replacement. No migration. No disruption to the workflows your teams already know. Your systems stay exactly as they are.",
    },
    // SECTION 5 — Software Overlay
    {
        id: "overlay", section: "Software Overlay", title: "Every system, unified into one view.",
        focus: "overlay", image: IMG.corporateOffice,
        narration:
            "CreatorBoostAI connects to all of them — Yardi, MRI, RealPage, AppFolio, Salesforce, Dynamics, Follow Up Boss, kvCORE, BoomTown, Dotloop, SkySlope, ShowingTime, Zillow, and Matterport. " +
            "It reads, organizes, and presents the relevant data from every platform inside a single command center built for leadership.",
    },
    // SECTION 6 — Dashboards
    {
        id: "dash-executive", section: "Dashboards", title: "Executive Overview", focus: "dashboard", image: IMG.conferenceRoom, dashboard: "executive",
        narration:
            "The Executive Overview is the first view leadership opens each day. " +
            "Total pipeline, projected revenue, transactions in progress, occupancy, agent productivity, and risk flags — the entire company at a glance, refreshed in real time.",
    },
    {
        id: "dash-leads", section: "Dashboards", title: "Lead Intelligence", focus: "dashboard", image: IMG.agentPhone, dashboard: "leads",
        narration:
            "Lead Intelligence consolidates every lead source in your network — corporate, brokerage, and field. " +
            "It scores intent, surfaces high-probability opportunities, identifies leads going cold, and points your top agents at the deals most likely to close this week.",
    },
    {
        id: "dash-agents", section: "Dashboards", title: "Agent Performance", focus: "dashboard", image: IMG.handshake, dashboard: "agents",
        narration:
            "Agent Performance gives you a live read across your entire team. " +
            "Active deals, conversion rates, response time, lead-to-appointment ratio, and revenue per agent — so brokerage leaders can coach, recognize, and reallocate without waiting for monthly reports.",
    },
    {
        id: "dash-property", section: "Dashboards", title: "Property Intelligence", focus: "dashboard", image: IMG.luxuryHome, dashboard: "property",
        narration:
            "Property Intelligence ties together listings, showings, market activity, and rental performance. " +
            "Days on market, showing demand, comparable trends, lease renewals, and vacancy risk — all aligned with the property data already in Yardi, MRI, RealPage, or AppFolio.",
    },
    {
        id: "dash-marketing", section: "Dashboards", title: "Marketing Performance", focus: "dashboard", image: IMG.deskMonitors, dashboard: "marketing",
        narration:
            "The Marketing dashboard tracks campaign attribution across every channel — paid search, social, email, listing portals, and referral. " +
            "Cost per qualified lead, channel ROI, and conversion velocity feed directly into pipeline so marketing decisions are tied to real revenue, not vanity metrics.",
    },
    {
        id: "dash-operations", section: "Dashboards", title: "Operations", focus: "dashboard", image: IMG.teamWorking, dashboard: "operations",
        narration:
            "Operations gives you transaction throughput, compliance status, contract velocity, and exception flags pulled from Dotloop, SkySlope, and the rest of your stack. " +
            "It's the day-to-day cockpit for managing brokers, transaction coordinators, and back-office teams.",
    },
    {
        id: "dash-financial", section: "Dashboards", title: "Financial Performance", focus: "dashboard", image: IMG.corporateOffice, dashboard: "financial",
        narration:
            "Financial Performance brings together commissions, NOI, occupancy revenue, expense run-rate, and forecasted EBITDA — pulling from Yardi, MRI, Dynamics, and your accounting stack into one executive view.",
    },
    // SECTION 7 — Human visuals (handled throughout via image overlays)
    // SECTION 8 — Network Scale
    {
        id: "network", section: "Network Scale", title: "Every region, every market, in one map.",
        focus: "network", image: IMG.citySkyline,
        narration:
            "For multi-city and multi-region operations, CreatorBoostAI provides a network-scale view. " +
            "Listings, agent activity, transaction volume, and revenue heat-mapped across every market you serve — so leadership can see where the business is winning, where it's stalling, and where to invest next.",
    },
    // SECTION 9 — How CB Connects
    {
        id: "how-it-connects", section: "How CB Connects", title: "API-native. Read-only. Non-intrusive.",
        focus: "connect", image: IMG.deskMonitors,
        narration:
            "Here's how it actually works. " +
            "CreatorBoostAI connects through standard, secure APIs — the same way most enterprise integrations operate. It reads data, organizes it, and presents it. " +
            "It does not enter your internal systems. It does not change your existing workflows. Your systems stay exactly as they are.",
    },
    // SECTION 10 — Security
    {
        id: "security", section: "Security", title: "Security and control by design.",
        focus: "security", image: IMG.conferenceRoom,
        narration:
            "Every connection is encrypted in transit and at rest. " +
            "Permissions are role-based — leadership, brokerage, agent, and finance each see only what they're authorized to see. Every action is logged with a full audit trail. Automated outreach requires human approval before execution. " +
            "Nothing happens inside your business that you didn't sanction.",
    },
    // SECTION 11 — Execution + Results
    {
        id: "execution", section: "Execution", title: "From visibility to revenue execution.",
        focus: "execution", image: IMG.openHouse,
        narration:
            "Visibility is the start. Execution is the result. " +
            "Once CreatorBoostAI sees the full picture, it surfaces the highest-probability opportunities, drafts the right outreach, queues the right showings, and routes work to the agents most likely to convert. " +
            "Pipeline grows. Conversion rates climb. Deal cycles compress.",
    },
    // SECTION 12 — Full System View
    {
        id: "full-system", section: "Full System View", title: "One command center. Whole company.",
        focus: "full", image: IMG.handshake,
        narration:
            "Put it all together: dashboards for every function, every system feeding live data, every agent and asset visible, every market accounted for. " +
            "Real people, real offices, real activity — finally connected. CreatorBoostAI gives leadership one place to oversee, coordinate, and grow the entire operation.",
    },
    // SECTION 13 — Final Message
    {
        id: "final-message", section: "Final Message", title: "Not another tool. The command layer.",
        focus: "final", image: IMG.citySkyline,
        narration:
            "CreatorBoostAI is not another tool. " +
            "It is the command layer that allows real estate companies to oversee, coordinate, and grow their entire business — without replacing the systems they already use. " +
            "Your systems stay exactly as they are. CreatorBoostAI brings them together into one command center.",
    },
    // Closing CTA
    {
        id: "closing", section: "Take the next step", title: "Send this demo. Replay it. Or book a walkthrough.",
        focus: "cta", image: IMG.handshake,
        narration:
            "That's the system. " +
            "Send this walkthrough to leadership using the email generator below. Replay any section. Or book a live walkthrough where we map CreatorBoostAI directly to your stack — Yardi, Salesforce, Follow Up Boss, kvCORE, or whatever you already run. " +
            "Welcome to the new operating standard for real estate.",
    },
];

const SCENE_GAP_MS = 700;
const FALLBACK_DURATION_MS = 18000;

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

    const audioRef = useRef(null);
    const advanceTimer = useRef(null);

    const current = SCENES[scene];
    const total = SCENES.length;

    const apiBase = useMemo(() => {
        const base = process.env.REACT_APP_BACKEND_URL || "";
        return `${base}/api`;
    }, []);

    const prefetchAll = useCallback(async () => {
        setPrefetching(true);
        setPrefetchProgress(0);
        const cache = {};
        const CONCURRENCY = 5;
        let done = 0;
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
            done += 1;
            setPrefetchProgress(Math.round((done / SCENES.length) * 100));
        };
        for (let i = 0; i < SCENES.length; i += CONCURRENCY) {
            const chunk = SCENES.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(fetchOne));
        }
        setAudioCache(cache);
        setPrefetching(false);
        return cache;
    }, [apiBase]);

    const speakScene = useCallback((idx, cache = audioCache) => {
        clearTimeout(advanceTimer.current);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        const sc = SCENES[idx];
        if (!sc) return;
        if (muted) {
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => {
                setScene(prev => (prev < total - 1 ? prev + 1 : (setDone(true), prev)));
            }, FALLBACK_DURATION_MS);
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
                advanceTimer.current = setTimeout(() => setScene(prev => (prev < total - 1 ? prev + 1 : prev)), SCENE_GAP_MS);
            };
            window.speechSynthesis.speak(u);
        }
    }, [audioCache, muted, paused, total]);

    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        const onEnded = () => {
            setSpeaking(false);
            if (paused) return;
            advanceTimer.current = setTimeout(() => {
                setScene(prev => { if (prev >= total - 1) { setDone(true); return prev; } return prev + 1; });
            }, SCENE_GAP_MS);
        };
        a.addEventListener("ended", onEnded);
        a.addEventListener("play", () => setSpeaking(true));
        a.addEventListener("pause", () => setSpeaking(false));
        return () => a.removeEventListener("ended", onEnded);
    }, [paused, total]);

    useEffect(() => {
        if (!started) return;
        speakScene(scene);
        return () => clearTimeout(advanceTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started]);

    useEffect(() => () => {
        clearTimeout(advanceTimer.current);
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
        if (paused) { setPaused(false); if (audioRef.current?.src) audioRef.current.play().catch(() => {}); }
        else { setPaused(true); clearTimeout(advanceTimer.current); audioRef.current?.pause(); window?.speechSynthesis?.cancel(); }
    };
    const handleSkip = () => { clearTimeout(advanceTimer.current); audioRef.current?.pause(); if (scene < total - 1) setScene(scene + 1); else setDone(true); };
    const handleBack = () => { clearTimeout(advanceTimer.current); audioRef.current?.pause(); if (scene > 0) setScene(scene - 1); };
    const handleReplay = () => speakScene(scene);
    const handleRestart = () => { clearTimeout(advanceTimer.current); audioRef.current?.pause(); setScene(0); setDone(false); setPaused(false); setTimeout(() => speakScene(0), 150); };
    const handleMute = () => { setMuted(p => { const n = !p; if (n) audioRef.current?.pause(); else setTimeout(() => speakScene(scene), 100); return n; }); };

    return (
        <Layout hideFooter>
            <audio ref={audioRef} className="hidden" preload="auto" />

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
                            onPauseResume={handlePauseResume} onBack={handleBack} onSkip={handleSkip}
                            onReplay={handleReplay} onRestart={handleRestart} onMute={handleMute}
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
                                    onReplay={handleReplay} onMute={handleMute}
                                />
                                <SceneIndex current={scene} total={total} />
                            </div>
                        </div>

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
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Enterprise Demo Console</p>
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the 12-minute walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 22-section enterprise walkthrough — narrated by an executive A.I. voice —
                    showing how CreatorBoostAI unifies your existing enterprise and field software into one
                    command center, with full security, audit, and human-in-the-loop control.
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
                        Auto-plays · ~10–14 min · Voice: Nova
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "22 cinematic scenes",
                        "Sits on top — no replacement",
                        "Enterprise + field software unified",
                        "API-native · read-only · audited",
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

const SceneHeader = ({ scene, current, total, paused, speaking, muted, onPauseResume, onBack, onSkip, onReplay, onRestart, onMute }) => (
    <div className="sticky top-[72px] z-20 mt-2 flex flex-col gap-3 rounded-md border border-white/10 bg-ink-900/85 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                    Scene {String(scene + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                <span className="rounded-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">{current.section}</span>
                {speaking && !muted && <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> NARRATING</span>}
                {paused && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PAUSED</span>}
            </div>
            <h2 className="font-heading mt-1 truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{current.title}</h2>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 lg:min-w-[260px]">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-1 rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${((scene + 1) / total) * 100}%`, boxShadow: "0 0 10px rgba(6,182,212,0.6)" }} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{Math.round(((scene + 1) / total) * 100)}%</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Btn onClick={onBack} icon={ArrowLeft} label="Back" />
                <Btn onClick={onPauseResume} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} primary />
                <Btn onClick={onSkip} icon={SkipForward} label="Skip" />
                <Btn onClick={onReplay} icon={RotateCcw} label="Replay" />
                <Btn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Unmute" : "Mute"} />
                <Btn onClick={onRestart} icon={Sparkles} label="Restart" />
            </div>
        </div>
    </div>
);
const Btn = ({ onClick, icon: Icon, label, primary }) => (
    <button onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${primary ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900" : "border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"}`}>
        <Icon size={12} /> <span className="hidden sm:inline">{label}</span>
    </button>
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
    if (f === "software") return <SoftwareGrid kind={scene.softwareList} />;
    if (f === "humans" || f === "header" || f === "intro-cb" || f === "fragmentation" || f === "execution" || f === "final" || f === "full") return <NarrativePanel scene={scene} />;
    if (f === "overlay") return <SoftwareOverlay />;
    if (f === "dashboard") return <DashboardMockup kind={scene.dashboard} />;
    if (f === "network") return <NetworkMap />;
    if (f === "connect") return <ConnectionDiagram />;
    if (f === "security") return <SecurityPanel />;
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

const AvatarPanel = ({ narration, speaking, muted, paused, onReplay, onMute }) => (
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
            <button onClick={onReplay} className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"><Play size={11} /> Replay</button>
            <button onClick={onMute} className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">{muted ? <VolumeX size={11} /> : <Volume2 size={11} />} {muted ? "Unmute" : "Mute"}</button>
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
