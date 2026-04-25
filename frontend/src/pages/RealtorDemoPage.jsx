import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Play, Pause, ArrowRight, ArrowLeft, RotateCcw, Volume2, VolumeX,
    Sparkles, Building2, Users, MessageSquare, CalendarCheck, DollarSign,
    Target, Activity, Send, Copy, Check, ShieldCheck, Home, Mail,
    TrendingUp, Zap, SkipForward, Layers, Brain, Cpu, Award, Rocket
} from "lucide-react";

// =================================================================
// Sample data
// =================================================================
const LEADS = [
    { id: "L-2041", name: "Sarah Miller", type: "Seller Lead", intent: "High intent", location: "East Grand Rapids · 49506", property: "1847 Lake Dr SE · 4BD / 3BA", value: 685000, signal: "Listed on Zillow saved searches · weekly visits", urgency: 92, status: "hot" },
    { id: "L-2042", name: "Marcus Reed", type: "Buyer Lead", intent: "Needs follow-up", location: "Heritage Hill · 49503", property: "Searching $325k–$425k · 3BD", value: 395000, signal: "Pre-approved · 3 unread emails", urgency: 67, status: "warm" },
    { id: "L-2043", name: "Danielle Brooks", type: "Property Management", intent: "Multi-unit opportunity", location: "Eastown · 49506", property: "12-unit portfolio · vacancy review", value: 2400000, signal: "Owner-direct inquiry · referral from broker", urgency: 84, status: "hot" },
    { id: "L-2044", name: "James Carter", type: "Rental Lead", intent: "Needs appointment", location: "Downtown GR · 49503", property: "2BD loft · move-in 30d", value: 2150, valueLabel: "/mo", signal: "Tour request · 2 properties saved", urgency: 71, status: "warm" },
];

const ACTIVE = LEADS[0];

const FOLLOWUP_DRAFT = `Hi Sarah,

I noticed you've been tracking listings in East Grand Rapids — and your home on Lake Dr is generating real interest in this market. Comparable 4BD homes off Reeds Lake have been moving in 11–14 days at $680k–$715k.

Would Thursday at 3:00 PM work for a 20-minute walk-through of pricing strategy and timing? I'll bring a tailored CMA with current buyer activity in 49506.

— Jeffrey, BodyIQ Realty`;

// =================================================================
// 15 scenes — each with what + why + how + integration
// =================================================================
const SCENES = [
    {
        id: "intro",
        title: "AI Revenue Execution for Real Estate",
        focus: "header",
        narration:
            "Welcome. This is CreatorBoostAI — an A.I. revenue execution system built for real estate. " +
            "It captures every lead, interprets human behavior, recommends the right move, and converts opportunities into booked meetings and revenue. " +
            "What you're about to see is a real walkthrough of how the system runs your business for you.",
    },
    {
        id: "lead-intake",
        title: "Leads enter the system in real time",
        focus: "leads",
        narration:
            "The system receives every lead the moment it enters — from your website, MLS, social ads, or referrals. " +
            "Each lead is automatically categorized as a buyer, seller, renter, or property management opportunity. " +
            "This matters because most realtors lose deals from leads they never even saw. CreatorBoostAI makes sure no lead is ever missed.",
    },
    {
        id: "ai-analysis",
        title: "AI Analysis — intent, timing, and value",
        focus: "analysis",
        narration:
            "CreatorBoostAI then analyzes intent, timing, and business value within seconds. " +
            "It scores readiness, decision window, urgency, and projected commission. " +
            "Why this matters: instead of guessing which lead to call first, you instantly know which opportunity will move the needle today.",
    },
    {
        id: "bodyiq-overlay",
        title: "BodyIQ-AI — the human intelligence layer",
        focus: "analysis",
        narration:
            "Now the BodyIQ-AI layer activates. " +
            "BodyIQ-AI reads behavioral signals — hesitation, urgency, confidence, and follow-up sensitivity — translated into a structured visual format. " +
            "Why this matters: you're not just reacting to a lead, you're understanding the human behind it. That's the difference between guessing and closing.",
    },
    {
        id: "integration",
        title: "BodyIQ-AI + CreatorBoostAI — Intelligence meets Execution",
        focus: "integration",
        narration:
            "Here is the integration that makes this system unique. " +
            "BodyIQ-AI provides the human intelligence — what the lead is feeling, when they're ready, and how to approach them. " +
            "CreatorBoostAI provides the execution — drafting the message, scheduling, sending, and tracking the result. " +
            "Together they form a complete intelligence-and-execution operating system. One reads people. The other moves the business forward.",
    },
    {
        id: "next-action",
        title: "Recommended Next Best Action",
        focus: "actions",
        narration:
            "Based on the combined signals, the system recommends the next best action. " +
            "It chooses the channel, the timing, and the angle most likely to convert. " +
            "Why this matters: you no longer waste mental energy deciding what to do — the system thinks ten steps ahead of you.",
    },
    {
        id: "message-draft",
        title: "Personalized Follow-up Drafted",
        focus: "analysis",
        narration:
            "The system prepares a follow-up message — personalized, professional, and written in your voice. " +
            "It references local context, comparable sales, and the prospect's behavior. " +
            "Why this matters: generic outreach is invisible. A specific, well-timed message converts.",
    },
    {
        id: "authorize",
        title: "Human-in-the-Loop Control",
        focus: "analysis",
        narration:
            "You stay in control. CreatorBoostAI never sends anything without your authorization. " +
            "You review the draft, approve, and the system executes instantly. " +
            "Why this matters: A.I. automation should give you leverage, not take away your judgment.",
    },
    {
        id: "sent",
        title: "Action Executed and Logged",
        focus: "analysis",
        narration:
            "The follow-up is sent. The action is logged. The conversation begins. " +
            "Delivery, opens, and replies are tracked in real time. " +
            "Why this matters: every touchpoint is captured, so nothing falls through the cracks and you always know where each opportunity stands.",
    },
    {
        id: "property-mgmt",
        title: "Property Management — Beyond Sales",
        focus: "analysis",
        narration:
            "CreatorBoostAI also covers property management. " +
            "It detects rental inquiries, multi-unit owners, leasing follow-ups, maintenance opportunities, and investor portfolio leads. " +
            "Why this matters: most agents leave property management revenue on the table. The system surfaces it automatically and turns it into a second revenue line.",
    },
    {
        id: "pipeline-growth",
        title: "Pipeline Growth — Multiple Leads, Same Time",
        focus: "leads",
        narration:
            "While one lead is being closed, the system is already processing the next four in parallel. " +
            "Buyers, sellers, renters, and investors — all moving forward simultaneously. " +
            "Why this matters: a solo agent now operates with the throughput of a small team, without adding headcount or hours.",
    },
    {
        id: "outcome",
        title: "Revenue Outcome — Real Business Numbers",
        focus: "outcome",
        narration:
            "Here is the result: an active pipeline of two point one million dollars, projected commissions of sixty three thousand dollars, " +
            "a confirmed appointment Thursday at three P.M., and an additional two point four million dollar property management opportunity. " +
            "Why this matters: this is what one day inside the system looks like.",
    },
    {
        id: "benefits",
        title: "System Benefits — Time, Conversion, Scalability",
        focus: "outcome",
        narration:
            "The benefits compound over time. " +
            "Hours of manual follow-up disappear. Conversion rates climb because every message is timed and targeted. " +
            "Automation runs in the background. The system scales as your business grows — without breaking. " +
            "This is leverage you can feel inside the first thirty days.",
    },
    {
        id: "business-impact",
        title: "Business Impact — A New Operating Standard",
        focus: "outcome",
        narration:
            "The bigger picture: this isn't a real estate tool. This is a real estate operating system. " +
            "It runs sales, follow-up, and property management as one unified revenue engine. " +
            "It transforms how an agent, a brokerage, or a property manager operates day to day. " +
            "The agents who adopt this stop competing on hustle and start competing on intelligence.",
    },
    {
        id: "closing",
        title: "Send this demo. Replay it. Or book a walkthrough.",
        focus: "cta",
        narration:
            "That's the system. Send this demo to a customer right now using the email generator below. " +
            "Or book a live walkthrough and we'll show you how to deploy it inside your business. " +
            "If you work with buyers, sellers, renters, or properties, this will make immediate sense. " +
            "Welcome to the new standard.",
    },
];

const SCENE_GAP_MS = 700;

// =================================================================
// Main page
// =================================================================
export default function RealtorDemoPage() {
    const [started, setStarted] = useState(false);
    const [scene, setScene] = useState(0);
    const [authorized, setAuthorized] = useState(false);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [audioCache, setAudioCache] = useState({}); // sceneId -> objectURL
    const [prefetching, setPrefetching] = useState(false);
    const [done, setDone] = useState(false);

    const audioRef = useRef(null);
    const advanceTimer = useRef(null);
    const sceneRefs = useRef({});

    const current = SCENES[scene];
    const total = SCENES.length;

    const apiBase = useMemo(() => {
        const base = process.env.REACT_APP_BACKEND_URL || "";
        return `${base}/api`;
    }, []);

    // ---------- Pre-fetch all scene audio ----------
    const prefetchAll = useCallback(async () => {
        setPrefetching(true);
        const cache = {};
        // Fetch sequentially to avoid hammering TTS provider
        for (const s of SCENES) {
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
            } catch (e) {
                // swallow — fallback to browser TTS for that scene
            }
        }
        setAudioCache(cache);
        setPrefetching(false);
        return cache;
    }, [apiBase]);

    // ---------- Speak current scene ----------
    const speakScene = useCallback((idx, cache = audioCache) => {
        clearTimeout(advanceTimer.current);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        const sc = SCENES[idx];
        if (!sc) return;
        if (muted) {
            // Skip audio; auto-advance after default duration
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => {
                if (idx < total - 1) setScene(idx + 1);
                else { setDone(true); }
            }, 11000);
            return;
        }
        const url = cache[sc.id];
        if (url && audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.muted = false;
            const playPromise = audioRef.current.play();
            if (playPromise) {
                playPromise.then(() => setSpeaking(true)).catch(() => setSpeaking(false));
            }
        } else if (typeof window !== "undefined" && window.speechSynthesis) {
            // Fallback to browser TTS if backend audio unavailable
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(sc.narration);
            u.rate = 0.97;
            const voices = window.speechSynthesis.getVoices();
            const female = voices.find(v => /female|samantha|victoria|karen|moira|tessa|ava/i.test(v.name)) || voices.find(v => v.lang?.startsWith("en"));
            if (female) u.voice = female;
            u.onstart = () => setSpeaking(true);
            u.onend = () => {
                setSpeaking(false);
                if (paused) return;
                advanceTimer.current = setTimeout(() => {
                    setScene(prev => (prev < total - 1 ? prev + 1 : prev));
                }, SCENE_GAP_MS);
            };
            window.speechSynthesis.speak(u);
        }
        // Auto-authorize at the right scene
        if (sc.id === "sent") setAuthorized(true);
    }, [audioCache, muted, paused, total]);

    // ---------- Audio onended → advance ----------
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        const onEnded = () => {
            setSpeaking(false);
            if (paused) return;
            advanceTimer.current = setTimeout(() => {
                setScene(prev => {
                    if (prev >= total - 1) {
                        setDone(true);
                        return prev;
                    }
                    return prev + 1;
                });
            }, SCENE_GAP_MS);
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
    }, [paused, total]);

    // ---------- On scene change ----------
    useEffect(() => {
        if (!started) return;
        speakScene(scene);
        // Scroll focus area into view (mobile + desktop)
        const target = current.focus;
        const node = sceneRefs.current[target];
        if (node) {
            try {
                node.scrollIntoView({ behavior: "smooth", block: "center" });
            } catch { /* ignore */ }
        }
        return () => clearTimeout(advanceTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started]);

    // ---------- Cleanup ----------
    useEffect(() => () => {
        clearTimeout(advanceTimer.current);
        if (audioRef.current) audioRef.current.pause();
        if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
        Object.values(audioCache).forEach(URL.revokeObjectURL);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ---------- Controls ----------
    const handleStart = async () => {
        const cache = await prefetchAll();
        setStarted(true);
        setScene(0);
        setDone(false);
        setAuthorized(false);
        setPaused(false);
        // Play with prefetched cache directly to avoid stale state
        setTimeout(() => speakScene(0, cache), 200);
    };
    const handlePauseResume = () => {
        if (paused) {
            setPaused(false);
            if (audioRef.current && audioRef.current.src) audioRef.current.play().catch(() => {});
        } else {
            setPaused(true);
            clearTimeout(advanceTimer.current);
            if (audioRef.current) audioRef.current.pause();
            if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
        }
    };
    const handleSkip = () => {
        clearTimeout(advanceTimer.current);
        if (audioRef.current) audioRef.current.pause();
        if (scene < total - 1) setScene(scene + 1);
        else setDone(true);
    };
    const handleBack = () => {
        clearTimeout(advanceTimer.current);
        if (audioRef.current) audioRef.current.pause();
        if (scene > 0) setScene(scene - 1);
    };
    const handleReplay = () => speakScene(scene);
    const handleRestart = () => {
        clearTimeout(advanceTimer.current);
        if (audioRef.current) audioRef.current.pause();
        setScene(0);
        setDone(false);
        setPaused(false);
        setTimeout(() => speakScene(0), 150);
    };
    const handleMute = () => {
        setMuted(prev => {
            const next = !prev;
            if (next && audioRef.current) audioRef.current.pause();
            else if (!next) setTimeout(() => speakScene(scene), 100);
            return next;
        });
    };

    // ---------- Render ----------
    const focusKey = current.focus;
    const isDim = (key) => started && focusKey && focusKey !== key && focusKey !== "header";

    return (
        <Layout hideFooter>
            <audio ref={audioRef} className="hidden" preload="auto" />

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="realtor-demo-page">
                {/* Ambient backdrop */}
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-50" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 480, height: 480, top: -160, left: -120 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -180, right: -100 }} />
                </div>

                <Hero
                    refSetter={(n) => (sceneRefs.current.header = n)}
                    active={focusKey === "header"}
                    dim={isDim("header")}
                />

                {!started ? (
                    <StartScreen onStart={handleStart} prefetching={prefetching} />
                ) : (
                    <>
                        {/* Sticky scene header */}
                        <SceneHeader
                            scene={scene}
                            current={current}
                            total={total}
                            paused={paused}
                            speaking={speaking}
                            muted={muted}
                            onPauseResume={handlePauseResume}
                            onBack={handleBack}
                            onSkip={handleSkip}
                            onReplay={handleReplay}
                            onRestart={handleRestart}
                            onMute={handleMute}
                        />

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                            {/* Left — Leads */}
                            <Panel
                                title="Incoming Leads"
                                icon={Users}
                                testid="panel-leads"
                                className="lg:col-span-3"
                                spotlight={focusKey === "leads"}
                                dim={isDim("leads")}
                                refSetter={(n) => (sceneRefs.current.leads = n)}
                            >
                                <div className="space-y-3">
                                    {LEADS.map((l, i) => (
                                        <LeadCard
                                            key={l.id}
                                            lead={l}
                                            active={i === 0}
                                            highlight={focusKey === "leads" && (current.id === "lead-intake" ? i === 0 : true)}
                                            pulse={current.id === "pipeline-growth"}
                                        />
                                    ))}
                                </div>
                            </Panel>

                            {/* Center — Analysis stage */}
                            <Panel
                                title="AI Analysis"
                                icon={Activity}
                                testid="panel-analysis"
                                className="lg:col-span-6"
                                spotlight={focusKey === "analysis"}
                                dim={isDim("analysis")}
                                refSetter={(n) => (sceneRefs.current.analysis = n)}
                            >
                                <CenterStage
                                    sceneId={current.id}
                                    authorized={authorized}
                                    setAuthorized={setAuthorized}
                                />
                            </Panel>

                            {/* Right — Next action + Avatar */}
                            <div className="space-y-4 lg:col-span-3">
                                <Panel
                                    title="Next Action"
                                    icon={Target}
                                    testid="panel-actions"
                                    spotlight={focusKey === "actions"}
                                    dim={isDim("actions")}
                                    compact
                                    refSetter={(n) => (sceneRefs.current.actions = n)}
                                >
                                    <NextActionPanel sceneId={current.id} authorized={authorized} setAuthorized={setAuthorized} />
                                </Panel>
                                <AvatarPanel
                                    narration={current.narration}
                                    speaking={speaking}
                                    muted={muted}
                                    paused={paused}
                                    onReplay={handleReplay}
                                    onMute={handleMute}
                                />
                            </div>
                        </div>

                        {/* Integration scene strip — appears prominently when active */}
                        <div ref={(n) => (sceneRefs.current.integration = n)} className="mt-4">
                            <IntegrationPanel active={focusKey === "integration"} dim={isDim("integration")} />
                        </div>

                        {/* Bottom — Outcome / Benefits */}
                        <div className="mt-4" ref={(n) => (sceneRefs.current.outcome = n)}>
                            <Panel
                                title="Revenue Outcome"
                                icon={DollarSign}
                                testid="panel-outcome"
                                spotlight={focusKey === "outcome"}
                                dim={isDim("outcome")}
                            >
                                <RevenuePanel sceneId={current.id} />
                                {(current.id === "benefits" || current.id === "business-impact") && (
                                    <BenefitsStrip sceneId={current.id} />
                                )}
                            </Panel>
                        </div>

                        {/* Closing CTA */}
                        {(focusKey === "cta" || done) && (
                            <div className="mt-6" ref={(n) => (sceneRefs.current.cta = n)}>
                                <ClosingCTA onReplay={handleRestart} />
                            </div>
                        )}
                    </>
                )}

                <div className="mt-12">
                    <CustomerEmailSection />
                </div>
            </div>
        </Layout>
    );
}

// =================================================================
// Sub-components
// =================================================================
const Hero = ({ refSetter, active, dim }) => (
    <section
        ref={refSetter}
        className={`relative transition-opacity duration-500 ${dim ? "opacity-40" : "opacity-100"}`}
        data-testid="realtor-hero"
    >
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Realtor Demo</span>
        </div>
        <h1 className={`font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl ${active ? "fade-in-up" : ""}`}>
            AI Revenue Execution for{" "}
            <span className="text-cyan-400">Real Estate Businesses</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            See how CreatorBoostAI captures leads, analyzes buyer/seller/renter intent, recommends
            the next best action, and helps convert opportunities into booked meetings and revenue.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12" data-testid="start-screen">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Console</p>
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the live walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 15-scene walkthrough — narrated by an A.I. voice — showing how
                    CreatorBoostAI moves a real estate lead from intake through analysis, BodyIQ
                    behavioral interpretation, integration, authorized follow-up, property management
                    expansion, and revenue outcome. Roughly six to seven minutes. No clicks required.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                        onClick={onStart}
                        disabled={prefetching}
                        data-testid="start-demo-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-7 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] disabled:opacity-60"
                    >
                        {prefetching ? (
                            <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900/30 border-t-ink-900" />
                                Loading audio…
                            </>
                        ) : (
                            <>
                                <Play size={16} fill="currentColor" /> Start Demo
                            </>
                        )}
                    </button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Auto-plays · ~6–7 min · Voice: Nova
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "15 cinematic scenes",
                        "Auto-narrated (OpenAI Nova voice)",
                        "BodyIQ × CreatorBoostAI integration",
                        "Property management coverage",
                    ].map((b) => (
                        <li key={b} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <Check size={13} className="text-cyan-400" /> {b}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="lg:col-span-5">
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Pre-loaded leads · Grand Rapids 49503 / 49506</p>
                    <ul className="mt-4 space-y-3">
                        {LEADS.map((l) => (
                            <li key={l.id} className="flex items-start gap-3">
                                <StatusDot status={l.status} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{l.name}</p>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{l.type} · {l.intent}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </div>
);

const SceneHeader = ({ scene, current, total, paused, speaking, muted, onPauseResume, onBack, onSkip, onReplay, onRestart, onMute }) => (
    <div className="sticky top-[72px] z-20 mt-6 flex flex-col gap-3 rounded-md border border-white/10 bg-ink-900/85 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                    Scene {String(scene + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                {speaking && !muted && (
                    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> NARRATING
                    </span>
                )}
                {paused && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PAUSED</span>
                )}
            </div>
            <h2 className="font-heading mt-1 truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{current.title}</h2>
        </div>

        {/* Progress + controls */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 lg:min-w-[260px]">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                        className="h-1 rounded-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${((scene + 1) / total) * 100}%`, boxShadow: "0 0 10px rgba(6,182,212,0.6)" }}
                    />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {Math.round(((scene + 1) / total) * 100)}%
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <ControlBtn onClick={onBack} icon={ArrowLeft} label="Back" testid="demo-prev" />
                <ControlBtn
                    onClick={onPauseResume}
                    icon={paused ? Play : Pause}
                    label={paused ? "Resume" : "Pause"}
                    testid="demo-pause"
                    primary
                />
                <ControlBtn onClick={onSkip} icon={SkipForward} label="Skip" testid="demo-next" />
                <ControlBtn onClick={onReplay} icon={RotateCcw} label="Replay" testid="demo-replay" />
                <ControlBtn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Unmute" : "Mute"} testid="demo-mute" />
                <ControlBtn onClick={onRestart} icon={Sparkles} label="Restart" testid="demo-restart" />
            </div>
        </div>
    </div>
);

const ControlBtn = ({ onClick, icon: Icon, label, testid, primary }) => (
    <button
        onClick={onClick}
        data-testid={testid}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${
            primary
                ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                : "border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
        }`}
    >
        <Icon size={12} /> <span className="hidden sm:inline">{label}</span>
    </button>
);

// ----- Panel wrapper with spotlight + dim
const Panel = ({ title, icon: Icon, testid, children, className = "", compact = false, spotlight = false, dim = false, refSetter }) => (
    <div
        ref={refSetter}
        data-testid={testid}
        className={`relative rounded-md border bg-ink-700/40 backdrop-blur-sm transition-all duration-500 ${compact ? "p-4" : "p-5"} ${className} ${
            spotlight
                ? "border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                : "border-white/10"
        } ${dim ? "opacity-40" : "opacity-100"}`}
    >
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Icon size={13} className={spotlight ? "text-cyan-300" : "text-cyan-400"} />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{title}</span>
            {spotlight && <span className="ml-auto pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />}
        </div>
        <div className="mt-4">{children}</div>
    </div>
);

const StatusDot = ({ status }) => {
    const cls = status === "hot" ? "bg-red-400" : status === "warm" ? "bg-amber-400" : "bg-cyan-400";
    return <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${cls}`} style={{ boxShadow: "0 0 8px currentColor" }} />;
};

const LeadCard = ({ lead, active, highlight, pulse }) => {
    const formatVal = lead.value > 10000 ? `$${(lead.value / 1000).toFixed(0)}k` : `$${lead.value.toLocaleString()}${lead.valueLabel || ""}`;
    return (
        <div
            data-testid={`lead-card-${lead.id}`}
            className={`rounded-sm border p-3 transition-all duration-500 ${
                highlight
                    ? "border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                    : active
                    ? "border-cyan-500/30 bg-ink-800"
                    : "border-white/5 bg-ink-800/60"
            } ${pulse ? "animate-pulse" : ""}`}
        >
            <div className="flex items-start gap-2">
                <StatusDot status={lead.status} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                    <p className="font-mono mt-0.5 text-[9px] uppercase tracking-[0.18em] text-cyan-400">{lead.type}</p>
                    <p className="mt-1 text-xs text-slate-400 truncate">{lead.location}</p>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{lead.intent}</span>
                        <span className="font-heading text-sm font-semibold text-white">{formatVal}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ---------- Center stage ----------
const CenterStage = ({ sceneId, authorized, setAuthorized }) => {
    if (sceneId === "intro") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Sparkles} text="Initializing intelligence system" />
                <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">CreatorBoostAI · Online</p>
                    <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Real Estate Operating System</h3>
                    <p className="mt-3 text-sm text-slate-300">15-scene live walkthrough · narrated · ~6–7 minutes</p>
                </div>
            </div>
        );
    }
    if (sceneId === "lead-intake" || sceneId === "pipeline-growth") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={sceneId === "pipeline-growth" ? Layers : Sparkles} text={sceneId === "pipeline-growth" ? "Multi-lead processing in parallel" : `New lead detected: ${ACTIVE.name}`} />
                <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{ACTIVE.type}</p>
                            <h3 className="font-heading mt-1 text-2xl font-semibold text-white">{ACTIVE.name}</h3>
                            <p className="mt-1 text-sm text-slate-400">{ACTIVE.location}</p>
                        </div>
                        <span className="rounded-sm border border-red-500/40 bg-red-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-red-300">
                            HOT · {ACTIVE.urgency}%
                        </span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <Detail label="Property" value={ACTIVE.property} />
                        <Detail label="Est. Value" value={`$${ACTIVE.value.toLocaleString()}`} />
                        <Detail label="Source Signal" value={ACTIVE.signal} className="col-span-2" />
                    </div>
                </div>
            </div>
        );
    }
    if (sceneId === "ai-analysis") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Activity} text="Multi-channel intent analysis in progress" />
                <div className="space-y-3">
                    {[
                        { label: "Intent", value: 92, note: "Active seller · ready to list" },
                        { label: "Timing", value: 88, note: "30–45 day decision window" },
                        { label: "Urgency", value: 81, note: "Comparable inventory tightening" },
                        { label: "Business Value", value: 96, note: "$685k listing · $20.5k commission" },
                    ].map((s) => <SignalBar key={s.label} {...s} />)}
                </div>
            </div>
        );
    }
    if (sceneId === "bodyiq-overlay") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Brain} text="BodyIQ-AI behavioral signal layer activated" accent="violet" />
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "Hesitation", value: 24, note: "Low — clear seller intent" },
                        { label: "Urgency", value: 86, note: "High — market timing" },
                        { label: "Confidence", value: 79, note: "Strong — research-driven" },
                        { label: "Follow-up Sensitivity", value: 91, note: "High — responds to specifics" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-sm border border-violet-500/30 bg-violet-500/5 p-3">
                            <div className="flex justify-between">
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300">{s.label}</span>
                                <span className="font-mono text-[10px] text-cyan-300">{s.value}%</span>
                            </div>
                            <div className="mt-1.5 h-1 w-full rounded-full bg-white/5">
                                <div className="h-1 rounded-full bg-gradient-to-r from-cyan-500 to-violet-400" style={{ width: `${s.value}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-slate-300">{s.note}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (sceneId === "next-action") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Target} text="Next best action determined" />
                <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">RECOMMENDED ACTION</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white">Send personalized listing-strategy outreach</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        Based on Sarah's high seller intent, 30–45 day window, and behavioral profile, the highest-conversion action is a targeted message offering a 20-minute pricing consultation — referencing 49506 comparable sales velocity.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <MicroStat label="Conversion lift" value="+34%" />
                        <MicroStat label="Send window" value="Now" />
                        <MicroStat label="Channel" value="Email" />
                    </div>
                </div>
            </div>
        );
    }
    if (sceneId === "message-draft") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={MessageSquare} text="Draft prepared · pending authorization" />
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Draft · Email</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">To: sarah.miller@protonmail.com</span>
                    </div>
                    <p className="mt-3 font-mono text-xs text-slate-300">
                        Subject: <span className="text-white">Lake Dr · pricing strategy for 49506</span>
                    </p>
                    <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">{FOLLOWUP_DRAFT}</pre>
                </div>
            </div>
        );
    }
    if (sceneId === "authorize") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={ShieldCheck} text="Awaiting your authorization" accent="amber" />
                <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">CONTROL CHECKPOINT</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white">Authorize follow-up to Sarah Miller?</h3>
                    <p className="mt-2 text-sm text-slate-300">
                        You stay in control. Nothing is sent until you authorize. Review the draft and approve.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            onClick={() => { setAuthorized(true); toast.success("Authorized · message queued"); }}
                            disabled={authorized}
                            data-testid="authorize-btn"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60"
                        >
                            <Check size={15} /> {authorized ? "Authorized" : "Authorize & Send"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    if (sceneId === "sent") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Send} text="Follow-up sent · action logged" accent="cyan" />
                <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                            <Check size={18} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="font-heading text-xl font-semibold text-white">Delivered to Sarah Miller</h3>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">11:42 AM · sarah.miller@protonmail.com</p>
                        </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MicroStat label="Sent" value="1" /> <MicroStat label="Delivered" value="✓" /> <MicroStat label="Logged" value="CRM" /> <MicroStat label="Status" value="Tracking" />
                    </div>
                    <div className="mt-5 rounded-sm border border-white/10 bg-ink-800 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Live Activity Feed</p>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                            <li>• 11:42 AM — Email delivered</li>
                            <li>• 11:43 AM — Opened</li>
                            <li>• 11:44 AM — Replied · "Thursday 3 PM works"</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
    if (sceneId === "property-mgmt") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Building2} text="Property management opportunity detected" accent="violet" />
                <div className="rounded-sm border border-violet-500/30 bg-violet-500/5 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">EXPANSION SIGNAL</p>
                    <h3 className="font-heading mt-2 text-xl font-semibold text-white">Danielle Brooks · Multi-unit portfolio review</h3>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MicroStat label="Units" value="12" /><MicroStat label="Vacancy" value="2" /><MicroStat label="Renewals 90d" value="4" /><MicroStat label="Portfolio NOI" value="$184k" />
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Tag label="Rental inquiry" icon={Home} /><Tag label="Leasing follow-up" icon={CalendarCheck} /><Tag label="Maintenance opportunity" icon={Activity} /><Tag label="Investor portfolio" icon={TrendingUp} />
                    </div>
                </div>
            </div>
        );
    }
    if (sceneId === "outcome" || sceneId === "benefits" || sceneId === "business-impact") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={CalendarCheck} text="Revenue outcome confirmed" accent="cyan" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OutcomeCard icon={CalendarCheck} label="Booked Appointment" primary="Thursday · 3:00 PM" secondary="Listing strategy walk-through · Sarah Miller" />
                    <OutcomeCard icon={DollarSign} label="Estimated Deal Value" primary="$685,000" secondary="~$20,550 projected commission" />
                    <OutcomeCard icon={Check} label="Follow-up Completed" primary="1 / 1" secondary="Email delivered · opened · replied" />
                    <OutcomeCard icon={TrendingUp} label="Revenue Opportunity" primary="$2.4M expansion" secondary="Property management portfolio · Danielle Brooks" />
                </div>
            </div>
        );
    }
    if (sceneId === "integration") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Cpu} text="Intelligence × Execution · Unified" accent="cyan" />
                <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">SCROLL DOWN — INTEGRATION DETAIL</p>
                    <h3 className="font-heading mt-3 text-2xl font-semibold text-white">BodyIQ-AI + CreatorBoostAI</h3>
                    <p className="mt-3 text-sm text-slate-300">
                        One reads the human. The other runs the business. Together they form the operating system.
                    </p>
                </div>
            </div>
        );
    }
    if (sceneId === "closing") {
        return (
            <div className="space-y-4 fade-in-up" key={sceneId}>
                <Banner icon={Rocket} text="System ready · close the loop" accent="cyan" />
                <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
                    <h3 className="font-heading text-2xl font-semibold text-white sm:text-3xl">This is the new standard.</h3>
                    <p className="mt-3 text-sm text-slate-300">Send this demo. Replay it. Or book a walkthrough below.</p>
                </div>
            </div>
        );
    }
    return null;
};

const NextActionPanel = ({ sceneId, authorized, setAuthorized }) => {
    const actions = {
        "intro": ["Initialize", "Calibrate", "Stream-on"],
        "lead-intake": ["Triage", "Categorize", "Score"],
        "ai-analysis": ["Analyze intent", "Score timing", "Estimate value"],
        "bodyiq-overlay": ["Map signals", "Detect hesitation", "Predict response"],
        "integration": ["Fuse signals", "Plan move", "Sync execution"],
        "next-action": ["Recommend channel", "Time send", "Personalize copy"],
        "message-draft": ["Draft message", "Localize content", "Match tone"],
        "authorize": ["Awaiting approval"],
        "sent": ["Track delivery", "Monitor reply", "Log to CRM"],
        "property-mgmt": ["Detect portfolio", "Score renewal risk", "Surface revenue gaps"],
        "pipeline-growth": ["Process parallel", "Maintain priority", "Update pipeline"],
        "outcome": ["Confirm booking", "Capture commission", "Open expansion"],
        "benefits": ["Save hours", "Lift conversion", "Scale revenue"],
        "business-impact": ["New standard", "Compete on intel", "Operate as OS"],
        "closing": ["Send demo", "Replay", "Book walkthrough"],
    };
    const list = actions[sceneId] || [];
    return (
        <ul className="space-y-2">
            {list.map((a, i) => (
                <li key={a} className="flex items-center gap-2 rounded-sm border border-white/5 bg-ink-800 px-3 py-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-500/30 font-mono text-[9px] text-cyan-400">{i + 1}</span>
                    <span className="text-sm text-slate-200">{a}</span>
                </li>
            ))}
            {sceneId === "authorize" && !authorized && (
                <button
                    onClick={() => { setAuthorized(true); toast.success("Authorized"); }}
                    className="mt-1 w-full rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                >
                    Quick authorize
                </button>
            )}
        </ul>
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
                {speaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                    </span>
                )}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-white">CreatorBoostAI Assistant</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                    {paused ? "Paused" : speaking ? "Narrating…" : muted ? "Muted" : "Explaining demo"}
                </p>
            </div>
        </div>
        <p className="mt-4 max-h-56 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-200 scrollbar-cyan" data-testid="narration-text" key={narration}>
            <span className="fade-in-up inline-block">{narration}</span>
        </p>
        <div className="mt-4 flex items-center gap-2">
            <button onClick={onReplay} data-testid="narration-replay"
                className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900">
                <Play size={11} /> Replay
            </button>
            <button onClick={onMute} data-testid="narration-mute"
                className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-cyan-500/30 hover:text-cyan-300">
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />} {muted ? "Unmute" : "Mute"}
            </button>
        </div>
    </div>
);

// ---------- Integration scene panel ----------
const IntegrationPanel = ({ active, dim }) => (
    <div
        data-testid="integration-panel"
        className={`relative grid grid-cols-1 gap-4 rounded-md border bg-ink-700/40 p-5 transition-all duration-500 lg:grid-cols-2 ${
            active
                ? "border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                : "border-white/10"
        } ${dim ? "opacity-40" : "opacity-100"}`}
    >
        <div className="rounded-sm border border-violet-500/30 bg-violet-500/5 p-5">
            <div className="flex items-center gap-2">
                <Brain size={14} className="text-violet-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">BodyIQ-AI · Human Intelligence</span>
            </div>
            <h3 className="font-heading mt-3 text-xl font-semibold text-white">Reads the human</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                <li>• Behavior signals · hesitation, urgency, confidence</li>
                <li>• Intent + emotional readiness</li>
                <li>• Follow-up sensitivity + tone calibration</li>
            </ul>
        </div>
        {/* Connector */}
        <div className="hidden lg:flex absolute inset-y-0 left-1/2 items-center -translate-x-1/2">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full border ${active ? "border-cyan-500/60 bg-cyan-500/15" : "border-cyan-500/30 bg-ink-900"} font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300`}>
                ⟷
            </span>
        </div>
        <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-5">
            <div className="flex items-center gap-2">
                <Zap size={14} className="text-cyan-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Execution</span>
            </div>
            <h3 className="font-heading mt-3 text-xl font-semibold text-white">Runs the business</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                <li>• Drafts personalized messages</li>
                <li>• Schedules + sends with authorization</li>
                <li>• Tracks delivery, reply, and revenue</li>
            </ul>
        </div>
        <div className="lg:col-span-2 mt-2 rounded-sm border border-white/10 bg-ink-900 p-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Together · Intelligence + Execution = Real Estate Operating System</p>
        </div>
    </div>
);

// ---------- Bottom revenue & benefits ----------
const RevenuePanel = ({ sceneId }) => {
    const showFull = ["sent", "property-mgmt", "outcome", "benefits", "business-impact", "closing", "pipeline-growth"].includes(sceneId);
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RevenueStat icon={DollarSign} label="Active Pipeline" value="$2.1M" delta="+$685k" highlight={showFull} />
            <RevenueStat icon={TrendingUp} label="Projected Commission" value="$63,420" delta="+$20,550" highlight={showFull} />
            <RevenueStat icon={CalendarCheck} label="Booked Today" value={showFull ? "1" : "0"} delta="3:00 PM Thu" highlight={showFull} />
            <RevenueStat icon={Building2} label="PM Portfolio Pending" value={showFull ? "$2.4M" : "—"} delta="12 units" highlight={showFull} />
        </div>
    );
};

const BenefitsStrip = ({ sceneId }) => (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="benefits-strip">
        {[
            { Icon: TrendingUp, label: "Time saved", value: "12+ hrs/wk", note: "Manual follow-up replaced" },
            { Icon: Target, label: "Conversion lift", value: "+34%", note: "Timed, targeted touches" },
            { Icon: Cpu, label: "Automation depth", value: "End-to-end", note: "Intake → outcome" },
            { Icon: Award, label: "Scalability", value: "Solo → team", note: "No added headcount" },
        ].map((b) => (
            <div key={b.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="flex items-center gap-2">
                    <b.Icon size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{b.label}</span>
                </div>
                <p className="font-heading mt-3 text-xl font-semibold text-white">{b.value}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{b.note}</p>
            </div>
        ))}
    </div>
);

// ---------- Closing CTA ----------
const ClosingCTA = ({ onReplay }) => {
    const scrollToEmail = () => {
        const node = document.querySelector('[data-testid="email-generator"]');
        if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (
        <div data-testid="closing-cta" className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-6 lg:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Complete</p>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Take the next step.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Send this walkthrough to a customer, replay the demo, or book a live walkthrough where we deploy the system inside your business.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={scrollToEmail} data-testid="cta-send"
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400">
                    <Mail size={15} /> Send this demo to a customer
                </button>
                <button onClick={onReplay} data-testid="cta-replay"
                    className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-transparent px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/10">
                    <RotateCcw size={15} /> Replay Demo
                </button>
                <a href="/contact" data-testid="cta-book"
                    className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-white transition-all hover:border-cyan-500/40 hover:text-cyan-300">
                    <CalendarCheck size={15} /> Book a walkthrough
                </a>
            </div>
        </div>
    );
};

// ---------- Reused tiny components ----------
const Banner = ({ icon: Icon, text, accent = "cyan" }) => {
    const colorMap = {
        cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
        violet: "border-violet-500/30 bg-violet-500/5 text-violet-300",
        amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    };
    return (
        <div className={`flex items-center gap-2.5 rounded-sm border px-3 py-2 ${colorMap[accent]}`}>
            <Icon size={14} /><span className="font-mono text-[10px] uppercase tracking-[0.22em]">{text}</span>
        </div>
    );
};
const Detail = ({ label, value, className = "" }) => (
    <div className={className}>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-1 text-sm text-white">{value}</p>
    </div>
);
const SignalBar = ({ label, value, note }) => (
    <div>
        <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">{label}</span>
            <span className="font-mono text-[11px] text-cyan-300">{value}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5">
            <div className="h-1.5 rounded-full bg-cyan-500 transition-all duration-700" style={{ width: `${value}%`, boxShadow: "0 0 10px rgba(6,182,212,0.5)" }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{note}</p>
    </div>
);
const MicroStat = ({ label, value }) => (
    <div className="rounded-sm border border-white/10 bg-ink-800 px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-1 font-heading text-base font-semibold text-white">{value}</p>
    </div>
);
const Tag = ({ label, icon: Icon }) => (
    <span className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-ink-800 px-3 py-2 text-xs text-slate-200">
        <Icon size={12} className="text-violet-300" /> {label}
    </span>
);
const OutcomeCard = ({ icon: Icon, label, primary, secondary }) => (
    <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2"><Icon size={14} className="text-cyan-400" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span></div>
        <p className="font-heading mt-3 text-2xl font-semibold text-white">{primary}</p>
        <p className="mt-1 text-xs text-slate-400">{secondary}</p>
    </div>
);
const RevenueStat = ({ icon: Icon, label, value, delta, highlight }) => (
    <div className={`rounded-sm border p-4 transition-all ${highlight ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-ink-800"}`}>
        <div className="flex items-center gap-2"><Icon size={13} className="text-cyan-400" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span></div>
        <p className="font-heading mt-3 text-2xl font-semibold text-white">{value}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{delta}</p>
    </div>
);

// ---------- Customer email generator (unchanged from prior) ----------
const INDUSTRIES = ["Realtor / Agent", "Brokerage", "Property Management", "Leasing Team", "Investor / Portfolio Owner"];

const CustomerEmailSection = () => {
    const [form, setForm] = useState({ name: "", email: "", company: "", industry: INDUSTRIES[0], note: "" });
    const [generated, setGenerated] = useState(null);
    const [copied, setCopied] = useState(false);
    const handle = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const demoLink = useMemo(() => {
        if (typeof window === "undefined") return "https://www.bodyiq-ai.com/demo/realtor";
        return `${window.location.origin}/demo/realtor`;
    }, []);
    const generate = () => {
        if (!form.name || !form.email) { toast.error("Customer name and email are required"); return; }
        const subject = `See how CreatorBoostAI can help your ${form.industry.toLowerCase()} business convert more leads`;
        const body = `Hi ${form.name},

I wanted to send you a quick demo of CreatorBoostAI for real estate businesses.

This demo shows how the system helps capture leads, analyze intent, recommend next steps, prepare follow-ups, support property management opportunities, and create measurable revenue outcomes.

It is designed for realtors, brokerages, property managers, leasing teams, and real estate businesses that want a smarter way to turn opportunities into appointments and revenue.

You can view the demo here:
${demoLink}${form.note ? `\n\n${form.note}` : ""}

Best,
Jeffrey`;
        setGenerated({ subject, body, to: form.email });
        setCopied(false);
        toast.success("Email generated");
    };
    const copyEmail = async () => {
        if (!generated) return;
        const text = `To: ${generated.to}\nSubject: ${generated.subject}\n\n${generated.body}`;
        try { await navigator.clipboard.writeText(text); setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 2500); }
        catch { toast.error("Copy failed"); }
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(demoLink); toast.success("Demo link copied"); }
        catch { toast.error("Copy failed"); }
    };

    return (
        <section className="rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-8" data-testid="email-generator">
            <div className="flex items-center gap-2"><Mail size={14} className="text-cyan-400" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Send This Demo to a Customer</span></div>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Generate a personalized outreach email.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Fill in the customer details and we'll generate a ready-to-send email with the demo link.</p>
            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-4">
                    <Field label="Customer name *"><input type="text" value={form.name} onChange={handle("name")} data-testid="email-customer-name" className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Sarah Miller" /></Field>
                    <Field label="Customer email *"><input type="email" value={form.email} onChange={handle("email")} data-testid="email-customer-email" className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="sarah@millerrealty.com" /></Field>
                    <Field label="Company name"><input type="text" value={form.company} onChange={handle("company")} data-testid="email-company" className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Miller Realty Group" /></Field>
                    <Field label="Industry type"><select value={form.industry} onChange={handle("industry")} data-testid="email-industry" className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none">{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></Field>
                    <Field label="Personal note (optional)"><textarea rows={3} value={form.note} onChange={handle("note")} data-testid="email-note" className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Adds a personal line at the end." /></Field>
                    <button onClick={generate} data-testid="generate-email-btn" className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400"><Sparkles size={14} /> Generate Demo Email</button>
                </div>
                <div className="lg:col-span-7">
                    <div className="rounded-md border border-white/10 bg-ink-800 p-5" data-testid="email-preview">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Email preview</span>
                            {generated && (<button onClick={copyEmail} data-testid="copy-email-btn" className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">{copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy email"}</button>)}
                        </div>
                        {generated ? (
                            <div className="mt-4 space-y-3">
                                <p className="font-mono text-[11px] text-slate-400">To: <span className="text-white">{generated.to}</span></p>
                                <p className="font-mono text-[11px] text-slate-400">Subject: <span className="text-white">{generated.subject}</span></p>
                                <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200 scrollbar-cyan">{generated.body}</pre>
                            </div>
                        ) : (
                            <div className="flex h-72 items-center justify-center text-center"><p className="max-w-xs text-sm text-slate-500">Fill in the customer details and click <span className="text-cyan-300">Generate Demo Email</span>.</p></div>
                        )}
                    </div>
                    <div className="mt-4 rounded-sm border border-white/10 bg-ink-800 p-4" data-testid="shareable-link">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Shareable demo link</p>
                        <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                            <code className="flex-1 truncate rounded-sm border border-white/10 bg-ink-900 px-3 py-2 font-mono text-xs text-cyan-300">{demoLink}</code>
                            <button onClick={copyLink} data-testid="copy-link-btn" className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-cyan-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"><Copy size={11} /> Copy link</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Field = ({ label, children }) => (
    <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        <div className="mt-2">{children}</div>
    </label>
);
