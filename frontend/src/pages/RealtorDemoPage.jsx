import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
    Play, Pause, ArrowRight, ArrowLeft, RotateCcw, Volume2, VolumeX,
    Sparkles, Building2, Users, MessageSquare, CalendarCheck, DollarSign,
    Target, Activity, Send, Copy, Check, ShieldCheck, Home, Phone, Mail,
    TrendingUp, Clock, ChevronRight, Zap
} from "lucide-react";

// ---------- Sample data ----------
const LEADS = [
    {
        id: "L-2041",
        name: "Sarah Miller",
        type: "Seller Lead",
        intent: "High intent",
        location: "East Grand Rapids · Wealthy 49506",
        property: "1847 Lake Dr SE · 4BD / 3BA",
        value: 685000,
        signal: "Listed on Zillow saved searches · weekly visits",
        urgency: 92,
        status: "hot",
    },
    {
        id: "L-2042",
        name: "Marcus Reed",
        type: "Buyer Lead",
        intent: "Needs follow-up",
        location: "Heritage Hill · 49503",
        property: "Searching $325k–$425k · 3BD",
        value: 395000,
        signal: "Pre-approved · 3 unread emails · last open 4d ago",
        urgency: 67,
        status: "warm",
    },
    {
        id: "L-2043",
        name: "Danielle Brooks",
        type: "Property Management",
        intent: "Multi-unit opportunity",
        location: "Eastown · 49506",
        property: "12-unit portfolio · vacancy review",
        value: 2400000,
        signal: "Owner-direct inquiry · referral from broker",
        urgency: 84,
        status: "hot",
    },
    {
        id: "L-2044",
        name: "James Carter",
        type: "Rental Lead",
        intent: "Needs appointment",
        location: "Downtown GR · 49503",
        property: "2BD loft · move-in 30d",
        value: 2150,
        valueLabel: "/mo",
        signal: "Tour request · 2 properties saved",
        urgency: 71,
        status: "warm",
    },
];

const SCENES = [
    {
        title: "New lead received",
        narration:
            "A new real estate lead enters the system. CreatorBoostAI immediately identifies the type of opportunity and places it into the correct revenue path.",
        focus: "lead-intake",
    },
    {
        title: "AI analyzes lead intent",
        narration:
            "The system reviews the lead's intent, timing, urgency, and business value so the realtor does not waste time guessing what to do next.",
        focus: "ai-analysis",
    },
    {
        title: "BodyIQ behavioral signals",
        narration:
            "BodyIQ-AI adds a human intelligence layer by showing behavioral signals, hesitation, urgency, confidence, and follow-up sensitivity in a simple visual format.",
        focus: "bodyiq-overlay",
    },
    {
        title: "Next best action recommended",
        narration:
            "CreatorBoostAI recommends the next best action based on the lead type, timing, and conversion opportunity.",
        focus: "next-action",
    },
    {
        title: "Follow-up message prepared",
        narration:
            "The system prepares a follow-up message that is clear, professional, and designed to move the prospect toward a meeting.",
        focus: "message-draft",
    },
    {
        title: "Authorization requested",
        narration:
            "The business owner stays in control. CreatorBoostAI recommends the action, and the user can authorize it before anything is sent.",
        focus: "authorize",
    },
    {
        title: "Follow-up sent",
        narration:
            "The follow-up is sent, the action is logged, and the opportunity moves forward without the realtor losing time.",
        focus: "sent",
    },
    {
        title: "Property management opportunity detected",
        narration:
            "CreatorBoostAI also supports property management. It can detect rental inquiries, leasing opportunities, multi-unit owners, maintenance-related follow-ups, and investor portfolio opportunities.",
        focus: "property-mgmt",
    },
    {
        title: "Revenue outcome",
        narration:
            "The result is a clear business outcome: a booked appointment, completed follow-up, tracked action, and a revenue opportunity the team can act on.",
        focus: "outcome",
    },
];

// Active lead used as the "in-focus" lead through the scene flow
const ACTIVE = LEADS[0]; // Sarah Miller - seller lead drives the main scenes

const FOLLOWUP_DRAFT = `Hi Sarah,

I noticed you've been tracking listings in East Grand Rapids — and your home on Lake Dr is generating real interest in this market. Comparable 4BD homes off Reeds Lake have been moving in 11–14 days at $680k–$715k.

Would Thursday at 3:00 PM work for a 20-minute walk-through of pricing strategy and timing? I'll bring a tailored CMA with current buyer activity in 49506.

— Jeffrey, BodyIQ Realty`;

// ---------- Page ----------
export default function RealtorDemoPage() {
    const [started, setStarted] = useState(false);
    const [scene, setScene] = useState(0);
    const [authorized, setAuthorized] = useState(false);
    const [muted, setMuted] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const utteranceRef = useRef(null);

    const current = SCENES[scene];
    const totalScenes = SCENES.length;

    // ---------- Voice narration ----------
    const speak = useCallback((text) => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        if (muted) return;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.96;
        u.pitch = 0.95;
        u.volume = 1;
        // Pick a deeper / authoritative voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferred =
            voices.find((v) => /Daniel|Google UK English Male|Microsoft Guy|Microsoft Davis|Alex/i.test(v.name)) ||
            voices.find((v) => v.lang?.startsWith("en")) ||
            voices[0];
        if (preferred) u.voice = preferred;
        u.onstart = () => setSpeaking(true);
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        utteranceRef.current = u;
        window.speechSynthesis.speak(u);
    }, [muted]);

    const stopSpeak = () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setSpeaking(false);
    };

    // Speak narration when scene changes (after demo starts)
    useEffect(() => {
        if (!started) return;
        speak(current.narration);
        return () => stopSpeak();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started, muted]);

    // Cleanup on unmount
    useEffect(() => () => stopSpeak(), []);

    // Force voice list to load (Chrome quirk)
    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }, []);

    const handleStart = () => {
        setStarted(true);
        setScene(0);
        setAuthorized(false);
    };
    const handleNext = () => setScene((s) => Math.min(totalScenes - 1, s + 1));
    const handlePrev = () => setScene((s) => Math.max(0, s - 1));
    const handleReplay = () => speak(current.narration);
    const toggleMute = () => {
        setMuted((m) => {
            const next = !m;
            if (next) stopSpeak();
            return next;
        });
    };

    return (
        <Layout hideFooter>
            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="realtor-demo-page">
                {/* Ambient backdrop */}
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-50" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 480, height: 480, top: -160, left: -120 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -180, right: -100 }} />
                </div>

                <Hero />

                <div className="mt-8">
                    {!started ? (
                        <StartScreen onStart={handleStart} />
                    ) : (
                        <CommandCenter
                            scene={scene}
                            current={current}
                            totalScenes={totalScenes}
                            authorized={authorized}
                            setAuthorized={setAuthorized}
                            onNext={handleNext}
                            onPrev={handlePrev}
                            onReplay={handleReplay}
                            onMute={toggleMute}
                            muted={muted}
                            speaking={speaking}
                            onRestart={handleStart}
                        />
                    )}
                </div>

                <div className="mt-12">
                    <CustomerEmailSection />
                </div>
            </div>
        </Layout>
    );
}

// ---------- Hero ----------
const Hero = () => (
    <section className="relative" data-testid="realtor-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Realtor Demo</span>
        </div>
        <h1 className="font-heading mt-6 text-balance text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            AI Revenue Execution for{" "}
            <span className="text-cyan-400">Real Estate Businesses</span>
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            See how CreatorBoostAI captures leads, analyzes buyer/seller/renter intent, recommends
            the next best action, and helps convert opportunities into booked meetings and revenue.
        </p>
    </section>
);

// ---------- Start screen ----------
const StartScreen = ({ onStart }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-8 lg:p-12" data-testid="start-screen">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Console</p>
                <h2 className="font-heading mt-4 text-3xl font-semibold text-white sm:text-4xl">Run the live walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
                    A guided 9-scene flow showing how CreatorBoostAI moves a real estate lead from
                    intake → behavioral analysis → next best action → authorized follow-up → booked
                    appointment → property-management opportunity → revenue outcome.
                </p>
                <div className="mt-7">
                    <button
                        onClick={onStart}
                        data-testid="start-demo-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-7 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                    >
                        <Play size={16} fill="currentColor" /> Start Demo
                    </button>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "9 cinematic scenes",
                        "Voice narration (browser TTS)",
                        "Realistic Grand Rapids data",
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
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Pre-loaded leads · 49503 / 49506</p>
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

// ---------- Command center ----------
const CommandCenter = ({
    scene, current, totalScenes, authorized, setAuthorized,
    onNext, onPrev, onReplay, onMute, muted, speaking, onRestart,
}) => {
    return (
        <div className="space-y-4" data-testid="command-center">
            {/* Scene header */}
            <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-ink-700/40 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        Scene {String(scene + 1).padStart(2, "0")} / {String(totalScenes).padStart(2, "0")}
                    </p>
                    <h2 className="font-heading mt-1 text-xl font-semibold text-white sm:text-2xl">{current.title}</h2>
                </div>
                {/* Progress */}
                <div className="flex flex-1 items-center gap-3 lg:max-w-md">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                            className="h-1 rounded-full bg-cyan-500 transition-all duration-500"
                            style={{ width: `${((scene + 1) / totalScenes) * 100}%`, boxShadow: "0 0 10px rgba(6,182,212,0.6)" }}
                        />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {Math.round(((scene + 1) / totalScenes) * 100)}%
                    </span>
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Left — Incoming Leads */}
                <Panel title="Incoming Leads" icon={Users} testid="panel-leads" className="lg:col-span-3">
                    <div className="space-y-3">
                        {LEADS.map((l, i) => (
                            <LeadCard key={l.id} lead={l} active={i === 0} highlight={current.focus === "lead-intake" && i === 0} />
                        ))}
                    </div>
                </Panel>

                {/* Center — AI Analysis */}
                <Panel title="AI Analysis" icon={Activity} testid="panel-analysis" className="lg:col-span-6">
                    <CenterStage scene={current.focus} authorized={authorized} setAuthorized={setAuthorized} />
                </Panel>

                {/* Right — Recommended Actions + Avatar */}
                <div className="space-y-4 lg:col-span-3">
                    <Panel title="Next Action" icon={Target} testid="panel-actions" compact>
                        <NextActionPanel scene={current.focus} authorized={authorized} setAuthorized={setAuthorized} />
                    </Panel>
                    <AvatarPanel
                        narration={current.narration}
                        speaking={speaking}
                        muted={muted}
                        onReplay={onReplay}
                        onMute={onMute}
                    />
                </div>
            </div>

            {/* Bottom — Revenue Outcome */}
            <Panel title="Revenue Outcome" icon={DollarSign} testid="panel-outcome">
                <RevenuePanel scene={current.focus} />
            </Panel>

            {/* Transport */}
            <div className="flex flex-col items-center justify-between gap-3 rounded-md border border-white/10 bg-ink-700/40 p-4 sm:flex-row" data-testid="demo-transport">
                <button
                    onClick={onPrev}
                    disabled={scene === 0}
                    data-testid="demo-prev"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-200 transition-all hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-1.5">
                    {SCENES.map((_, i) => (
                        <span
                            key={i}
                            className={`h-1.5 w-6 rounded-full transition-all ${
                                i === scene ? "bg-cyan-400" : i < scene ? "bg-cyan-500/40" : "bg-white/10"
                            }`}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRestart}
                        data-testid="demo-restart"
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300"
                    >
                        <RotateCcw size={13} /> Restart
                    </button>
                    <button
                        onClick={onNext}
                        disabled={scene === totalScenes - 1}
                        data-testid="demo-next"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Next <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ---------- Panel wrapper ----------
const Panel = ({ title, icon: Icon, testid, children, className = "", compact = false }) => (
    <div
        data-testid={testid}
        className={`rounded-md border border-white/10 bg-ink-700/40 backdrop-blur-sm ${compact ? "p-4" : "p-5"} ${className}`}
    >
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{title}</span>
        </div>
        <div className="mt-4">{children}</div>
    </div>
);

const StatusDot = ({ status }) => {
    const cls = status === "hot" ? "bg-red-400" : status === "warm" ? "bg-amber-400" : "bg-cyan-400";
    return <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${cls}`} style={{ boxShadow: "0 0 8px currentColor" }} />;
};

const LeadCard = ({ lead, active, highlight }) => {
    const formatVal = lead.value > 10000 ? `$${(lead.value / 1000).toFixed(0)}k` : `$${lead.value.toLocaleString()}${lead.valueLabel || ""}`;
    return (
        <div
            data-testid={`lead-card-${lead.id}`}
            className={`rounded-sm border p-3 transition-all ${
                highlight
                    ? "border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                    : active
                    ? "border-cyan-500/30 bg-ink-800"
                    : "border-white/5 bg-ink-800/60"
            }`}
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
const CenterStage = ({ scene, authorized, setAuthorized }) => {
    if (scene === "lead-intake") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
                <Banner icon={Sparkles} text={`New lead detected: ${ACTIVE.name}`} />
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

    if (scene === "ai-analysis") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
                <Banner icon={Activity} text="Multi-channel intent analysis in progress" />
                <div className="space-y-3">
                    {[
                        { label: "Intent", value: 92, note: "Active seller · ready to list" },
                        { label: "Timing", value: 88, note: "30–45 day decision window" },
                        { label: "Urgency", value: 81, note: "Comparable inventory tightening" },
                        { label: "Business Value", value: 96, note: "$685k listing · $20.5k commission" },
                    ].map((s) => (
                        <SignalBar key={s.label} {...s} />
                    ))}
                </div>
            </div>
        );
    }

    if (scene === "bodyiq-overlay") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
                <Banner icon={Sparkles} text="BodyIQ behavioral signal layer activated" accent="violet" />
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

    if (scene === "next-action") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
                <Banner icon={Target} text="Next best action determined" />
                <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">RECOMMENDED ACTION</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white">
                        Send personalized listing-strategy outreach
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        Based on Sarah's high seller intent, 30–45 day window, and behavioral profile,
                        the highest-conversion action is a targeted message offering a 20-minute pricing
                        consultation — referencing 49506 comparable sales velocity.
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

    if (scene === "message-draft") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
                <Banner icon={MessageSquare} text="Draft prepared · pending authorization" />
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Draft · Email</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">To: sarah.miller@protonmail.com</span>
                    </div>
                    <p className="mt-3 font-mono text-xs text-slate-300">
                        Subject: <span className="text-white">Lake Dr · pricing strategy for 49506</span>
                    </p>
                    <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
                        {FOLLOWUP_DRAFT}
                    </pre>
                </div>
            </div>
        );
    }

    if (scene === "authorize") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
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
                        <button
                            disabled={authorized}
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 hover:border-white/20 disabled:opacity-50"
                        >
                            Edit draft
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (scene === "sent") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
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
                        <MicroStat label="Sent" value="1" />
                        <MicroStat label="Delivered" value="✓" />
                        <MicroStat label="Logged" value="CRM" />
                        <MicroStat label="Status" value="Tracking" />
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

    if (scene === "property-mgmt") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
                <Banner icon={Building2} text="Property management opportunity detected" accent="violet" />
                <div className="rounded-sm border border-violet-500/30 bg-violet-500/5 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">EXPANSION SIGNAL</p>
                    <h3 className="font-heading mt-2 text-xl font-semibold text-white">
                        Danielle Brooks · Multi-unit portfolio review
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        CreatorBoostAI also detects property management opportunities, including rental
                        inquiries, multi-unit owners, leasing follow-ups, maintenance-related
                        opportunities, and investor portfolio leads.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MicroStat label="Units" value="12" />
                        <MicroStat label="Vacancy" value="2" />
                        <MicroStat label="Renewals 90d" value="4" />
                        <MicroStat label="Portfolio NOI" value="$184k" />
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Tag label="Rental inquiry" icon={Home} />
                        <Tag label="Leasing follow-up" icon={CalendarCheck} />
                        <Tag label="Maintenance opportunity" icon={Activity} />
                        <Tag label="Investor portfolio" icon={TrendingUp} />
                    </div>
                </div>
            </div>
        );
    }

    if (scene === "outcome") {
        return (
            <div className="space-y-4 fade-in-up" key={scene}>
                <Banner icon={CalendarCheck} text="Revenue outcome confirmed" accent="cyan" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OutcomeCard
                        icon={CalendarCheck}
                        label="Booked Appointment"
                        primary="Thursday · 3:00 PM"
                        secondary="Listing strategy walk-through · Sarah Miller"
                    />
                    <OutcomeCard
                        icon={DollarSign}
                        label="Estimated Deal Value"
                        primary="$685,000"
                        secondary="Listing comp · ~$20,550 projected commission"
                    />
                    <OutcomeCard
                        icon={Check}
                        label="Follow-up Completed"
                        primary="1 / 1"
                        secondary="Email delivered · opened · replied"
                    />
                    <OutcomeCard
                        icon={TrendingUp}
                        label="Revenue Opportunity Created"
                        primary="$2.4M expansion"
                        secondary="Property management portfolio · Danielle Brooks"
                    />
                </div>
            </div>
        );
    }

    return null;
};

// ---------- Right rail panels ----------
const NextActionPanel = ({ scene, authorized, setAuthorized }) => {
    const actions = {
        "lead-intake": ["Triage", "Categorize", "Score"],
        "ai-analysis": ["Analyze intent", "Score timing", "Estimate value"],
        "bodyiq-overlay": ["Map signals", "Detect hesitation", "Predict response"],
        "next-action": ["Recommend channel", "Time send", "Personalize copy"],
        "message-draft": ["Draft message", "Localize content", "Match tone"],
        "authorize": ["Awaiting approval"],
        "sent": ["Track delivery", "Monitor reply", "Log to CRM"],
        "property-mgmt": ["Detect portfolio", "Score renewal risk", "Surface revenue gaps"],
        "outcome": ["Confirm booking", "Capture commission", "Open expansion"],
    };
    const list = actions[scene] || [];
    return (
        <ul className="space-y-2">
            {list.map((a, i) => (
                <li key={a} className="flex items-center gap-2 rounded-sm border border-white/5 bg-ink-800 px-3 py-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-500/30 font-mono text-[9px] text-cyan-400">{i + 1}</span>
                    <span className="text-sm text-slate-200">{a}</span>
                </li>
            ))}
            {scene === "authorize" && !authorized && (
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

const AvatarPanel = ({ narration, speaking, muted, onReplay, onMute }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4 backdrop-blur-sm" data-testid="avatar-panel">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sparkles size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">CreatorBoostAI Assistant</span>
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
                    {speaking ? "Narrating…" : muted ? "Muted" : "Explaining demo"}
                </p>
            </div>
        </div>
        <p className="mt-4 max-h-48 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-200 scrollbar-cyan" data-testid="narration-text" key={narration}>
            <span className="fade-in-up inline-block">{narration}</span>
        </p>
        <div className="mt-4 flex items-center gap-2">
            <button
                onClick={onReplay}
                data-testid="narration-replay"
                className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
            >
                <Play size={11} /> Replay
            </button>
            <button
                onClick={onMute}
                data-testid="narration-mute"
                className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-cyan-500/30 hover:text-cyan-300"
            >
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                {muted ? "Unmute" : "Mute"}
            </button>
        </div>
    </div>
);

// ---------- Bottom: revenue ----------
const RevenuePanel = ({ scene }) => {
    const showFull = ["sent", "property-mgmt", "outcome"].includes(scene);
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RevenueStat icon={DollarSign} label="Active Pipeline" value="$2.1M" delta="+$685k" highlight={showFull} />
            <RevenueStat icon={TrendingUp} label="Projected Commission" value="$63,420" delta="+$20,550" highlight={showFull} />
            <RevenueStat icon={CalendarCheck} label="Booked Today" value={showFull ? "1" : "0"} delta="3:00 PM Thu" highlight={showFull} />
            <RevenueStat icon={Building2} label="PM Portfolio Pending" value={showFull ? "$2.4M" : "—"} delta="12 units" highlight={showFull && scene !== "sent"} />
        </div>
    );
};

// ---------- Small components ----------
const Banner = ({ icon: Icon, text, accent = "cyan" }) => {
    const colorMap = {
        cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
        violet: "border-violet-500/30 bg-violet-500/5 text-violet-300",
        amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    };
    return (
        <div className={`flex items-center gap-2.5 rounded-sm border px-3 py-2 ${colorMap[accent]}`}>
            <Icon size={14} />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]">{text}</span>
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
        <div className="flex items-center gap-2">
            <Icon size={14} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span>
        </div>
        <p className="font-heading mt-3 text-2xl font-semibold text-white">{primary}</p>
        <p className="mt-1 text-xs text-slate-400">{secondary}</p>
    </div>
);

const RevenueStat = ({ icon: Icon, label, value, delta, highlight }) => (
    <div className={`rounded-sm border p-4 transition-all ${highlight ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-ink-800"}`}>
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        </div>
        <p className="font-heading mt-3 text-2xl font-semibold text-white">{value}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{delta}</p>
    </div>
);

// ---------- Customer Email Generator ----------
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
        if (!form.name || !form.email) {
            toast.error("Customer name and email are required");
            return;
        }
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
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error("Copy failed — select and copy manually");
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(demoLink);
            toast.success("Demo link copied");
        } catch {
            toast.error("Copy failed");
        }
    };

    return (
        <section className="rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-8" data-testid="email-generator">
            <div className="flex items-center gap-2">
                <Mail size={14} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Send This Demo to a Customer</span>
            </div>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Generate a personalized outreach email.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Fill in the customer details and we'll generate a ready-to-send email with the demo link. Connect a backend mail provider (Resend / SendGrid / Gmail API) later to send directly.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Form */}
                <div className="lg:col-span-5 space-y-4">
                    <Field label="Customer name *">
                        <input type="text" value={form.name} onChange={handle("name")} data-testid="email-customer-name"
                            className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                            placeholder="Sarah Miller" />
                    </Field>
                    <Field label="Customer email *">
                        <input type="email" value={form.email} onChange={handle("email")} data-testid="email-customer-email"
                            className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                            placeholder="sarah@millerrealty.com" />
                    </Field>
                    <Field label="Company name">
                        <input type="text" value={form.company} onChange={handle("company")} data-testid="email-company"
                            className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                            placeholder="Miller Realty Group" />
                    </Field>
                    <Field label="Industry type">
                        <select value={form.industry} onChange={handle("industry")} data-testid="email-industry"
                            className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none">
                            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                        </select>
                    </Field>
                    <Field label="Personal note (optional)">
                        <textarea rows={3} value={form.note} onChange={handle("note")} data-testid="email-note"
                            className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                            placeholder="Adds a personal line at the end of the email." />
                    </Field>
                    <button onClick={generate} data-testid="generate-email-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400">
                        <Sparkles size={14} /> Generate Demo Email
                    </button>
                </div>

                {/* Preview */}
                <div className="lg:col-span-7">
                    <div className="rounded-md border border-white/10 bg-ink-800 p-5" data-testid="email-preview">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Email preview</span>
                            {generated && (
                                <button onClick={copyEmail} data-testid="copy-email-btn"
                                    className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                    {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy email"}
                                </button>
                            )}
                        </div>
                        {generated ? (
                            <div className="mt-4 space-y-3">
                                <p className="font-mono text-[11px] text-slate-400">To: <span className="text-white">{generated.to}</span></p>
                                <p className="font-mono text-[11px] text-slate-400">Subject: <span className="text-white">{generated.subject}</span></p>
                                <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200 scrollbar-cyan">
                                    {generated.body}
                                </pre>
                            </div>
                        ) : (
                            <div className="flex h-72 items-center justify-center text-center">
                                <p className="max-w-xs text-sm text-slate-500">
                                    Fill in the customer details and click <span className="text-cyan-300">Generate Demo Email</span>. Your personalized outreach copy will appear here.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 rounded-sm border border-white/10 bg-ink-800 p-4" data-testid="shareable-link">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Shareable demo link</p>
                        <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                            <code className="flex-1 truncate rounded-sm border border-white/10 bg-ink-900 px-3 py-2 font-mono text-xs text-cyan-300">
                                {demoLink}
                            </code>
                            <button onClick={copyLink} data-testid="copy-link-btn"
                                className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-cyan-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                <Copy size={11} /> Copy link
                            </button>
                        </div>
                        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                            Connect email backend later using SendGrid, Resend, Gmail API, or platform-supported email service.
                        </p>
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
