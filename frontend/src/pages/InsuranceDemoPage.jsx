import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import { shareDemo } from "@/lib/api";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { useRefMirror, hardSilence, useDemoCleanup } from "@/lib/demoAudioFix";
import { DemoConversionCTA } from "@/components/site/DemoConversionCTA";
import {
    Play, Pause, Sparkles, Users, MessageSquare, CalendarCheck, DollarSign,
    Target, Activity, Copy, Check, ShieldCheck, Mail,
    TrendingUp, Zap, Layers, Brain, Cpu, Award, Rocket,
    Network, Globe2, Lock, Database, GitBranch, Server, BarChart3,
    Briefcase, FileText, Volume2, VolumeX, FileCheck, AlertTriangle,
    ClipboardCheck, Wallet, Phone, Send, ArrowRight
} from "lucide-react";

// =================================================================
// Cinematic imagery
// =================================================================
const IMG = {
    agentDesk:       "/generated/scene-insurance-agent-desk.jpg",
    callCenter:      "/generated/scene-insurance-call-center.jpg",
    teamMeeting:     "/generated/scene-insurance-team-meeting.jpg",
    advisorClient:   "/generated/scene-insurance-advisor-client.jpg",
    handshake:       "/generated/scene-insurance-handshake.jpg",
    deskMonitors:    "/generated/scene-insurance-desk-monitors.jpg",
    corporateOffice: "/generated/scene-insurance-corporate-office.jpg",
    laptopWoman:     "/generated/scene-insurance-laptop-woman.jpg",
    documents:       "/generated/scene-insurance-documents.jpg",
    cityNight:       "/generated/scene-insurance-city-night.jpg",
};

// Insurance software stacks
const SALES_PLATFORMS = [
    { name: "Catalyst CRM", short: "CAT", domain: "Sales · Leaderboard · Policy Tracking" },
    { name: "Core by Catalyst", short: "CORE", domain: "Financial Ops · Transparency" },
    { name: "HubSpot", short: "HUB", domain: "Marketing CRM" },
    { name: "Salesforce FSC", short: "SF", domain: "Advanced CRM" },
];
const AGENCY_PLATFORMS = [
    { name: "QQCatalyst", short: "QQ", domain: "Agency Mgmt System" },
    { name: "Applied Epic", short: "AE", domain: "AMS · Carriers" },
    { name: "AMS360", short: "360", domain: "Agency Mgmt" },
    { name: "EZLynx", short: "EZ", domain: "Rating · Mgmt" },
];
const COMMS_PLATFORMS = [
    { name: "Microsoft 365", short: "M365", domain: "Email · Files" },
    { name: "Microsoft Teams", short: "TEAMS", domain: "Collaboration" },
    { name: "Slack", short: "SLK", domain: "Internal Comms" },
    { name: "Zoom", short: "ZM", domain: "Video · Calls" },
];
const COMPLIANCE_PLATFORMS = [
    { name: "Strike Graph", short: "SG", domain: "SOC2 · Compliance" },
    { name: "Vanta", short: "VNT", domain: "Audit · Trust" },
    { name: "AML/KYC Tools", short: "KYC", domain: "Fraud · Identity" },
    { name: "DocuSign", short: "DS", domain: "Signature · Audit" },
];

const ALL_PLATFORMS = [
    ...SALES_PLATFORMS,
    ...AGENCY_PLATFORMS,
    ...COMMS_PLATFORMS,
    ...COMPLIANCE_PLATFORMS,
];

// =================================================================
// 14 scenes · ~12 min runtime · Catalyst-style enterprise insurance demo
// =================================================================
const SCENES = [
    // Scene 1 — Hook (~45s)
    {
        id: "hook", section: "Scene 1 · The Hook", title: "You don't have a sales problem. You have a system fragmentation problem.",
        focus: "fragmented-agents", image: IMG.agentDesk, fallback_ms: 45000,
        narration:
            "Right now, somewhere in your agency, an underwriter is waiting on data trapped in another system. A producer is chasing a quote that was already sent. A compliance officer is reconstructing an audit trail from screenshots and spreadsheets. " +
            "Your team is good. Your products are competitive. But your tools are fragmented — and fragmentation is killing your conversion, your margin, and your audit readiness. " +
            "You don't have a sales problem. You have a system fragmentation problem.",
    },
    // Scene 2 — Current Software Stack (~90s)
    {
        id: "stack", section: "Scene 2 · Current Software Stack", title: "Your stack already exists.",
        focus: "stack-grid", image: IMG.teamMeeting, fallback_ms: 90000,
        narration:
            "Insurance companies already operate across a sophisticated stack. " +
            "Catalyst CRM runs your sales floor — pipeline, leaderboard, and policy tracking. Core by Catalyst handles your financial operations and books with full transparency. " +
            "Microsoft 365 and Teams power your communications and document sharing. Strike Graph keeps you SOC 2 ready and compliance-tight. HubSpot or Salesforce drives your marketing and advanced CRM workflows. And QQCatalyst, Applied Epic, AMS360, or EZLynx run your agency management — policies, carriers, and renewals. " +
            "Insurance companies already operate across multiple systems. The question isn't which tools to add. It's how to make the tools you already have actually work together.",
    },
    // Scene 3 — CB Positioning (~60s)
    {
        id: "cb-positioning", section: "Scene 3 · CreatorBoostAI Positioning", title: "It sits on top. It oversees. It connects. It executes.",
        focus: "overlay", image: IMG.cityNight, fallback_ms: 60000,
        narration:
            "CreatorBoostAI does not replace your systems. " +
            "It sits on top of Catalyst CRM, Core, your AMS, your compliance stack, your communications, and your marketing platforms. It oversees every workflow. It connects the data between them. And — when you authorize it — it executes across them. " +
            "No migration. No replacement. Your team keeps the tools they know. CreatorBoostAI is the layer that finally makes them act like one operating system.",
    },
    // Scene 4 — Lead Flow (~60s)
    {
        id: "lead-flow", section: "Scene 4 · Lead Flow", title: "Every lead. Every channel. Captured, tagged, scored.",
        focus: "lead-funnel", image: IMG.callCenter, fallback_ms: 60000,
        narration:
            "Leads enter your agency from every direction. Paid ads. Referral partners. Website forms. Inbound calls. Carrier appointments. Existing client cross-sell. " +
            "CreatorBoostAI captures each one in real time, automatically tags it by line of business, source, and producer assignment, and scores it for priority — auto, home, life, commercial, group benefits — before it ever lands in your CRM. " +
            "No lead enters cold. No lead waits in someone's inbox. No referral source goes untracked.",
    },
    // Scene 5 — AI Risk + Underwriting (~60s)
    {
        id: "risk-underwriting", section: "Scene 5 · AI Risk & Underwriting", title: "AI evaluates before your team wastes time.",
        focus: "risk-underwriting", image: IMG.advisorClient, fallback_ms: 60000,
        narration:
            "Once a lead is scored, the AI underwriting layer goes to work. " +
            "It evaluates risk profile against carrier appetite. It matches the prospect to the right product line and the right carrier. It flags red flags — coverage gaps, financial concerns, prior loss history — before your producer ever picks up the phone. " +
            "AI evaluates before your team wastes time. Producers spend their hours on the deals most likely to bind, not chasing leads that never had a chance.",
    },
    // Scene 6 — Follow-Up + Sales Automation (~90s)
    {
        id: "followup", section: "Scene 6 · Follow-Up & Sales Automation", title: "The right message, at the right moment.",
        focus: "followup-timeline", image: IMG.deskMonitors, fallback_ms: 90000,
        narration:
            "Most policies aren't lost in the quote. They're lost in the follow-up. " +
            "CreatorBoostAI builds a personalized follow-up sequence for every prospect — email, text message, scheduled calls — timed to the prospect's actual behavior and the carrier's quote validity window. " +
            "If a quote opens at nine p.m., the system suggests a morning text. If a renewal goes quiet two weeks before expiration, it triggers an escalation in your producer's voice. " +
            "Every message is drafted by the AI. Your team reviews and approves — or, if you authorize it, the system sends on its own. Either way, no quote sits idle. No renewal slips through.",
    },
    // Scene 7 — Policy + Client Management (~60s)
    {
        id: "policy-mgmt", section: "Scene 7 · Policy & Client Management", title: "Every policy tracked across every system.",
        focus: "policy-lifecycle", image: IMG.documents, fallback_ms: 60000,
        narration:
            "From quote to bind to renewal to claim, CreatorBoostAI tracks every policy across its full lifecycle — pulling status from your AMS, your CRM, your carrier portals, and your document repository into a single view. " +
            "Version control on every endorsement. Renewal flags ninety, sixty, and thirty days out. Cross-sell triggers when life events appear in the data. Every policy tracked, across every system, with one source of truth.",
    },
    // Scene 8 — Commission + Payroll (~90s)
    {
        id: "commission", section: "Scene 8 · Commission & Payroll Engine", title: "No spreadsheets. No disputes. Full transparency.",
        focus: "commission-engine", image: IMG.laptopWoman, fallback_ms: 90000,
        narration:
            "Commissions are where most agencies bleed time and trust. " +
            "CreatorBoostAI calculates commissions automatically — by carrier schedule, by product line, by producer split, by override hierarchy. Every dollar is traced from policy to paycheck with a full audit trail. " +
            "Producers see live earnings. Leadership sees forecasted payouts thirty, sixty, ninety days out. Finance closes the books in hours, not weeks. " +
            "No spreadsheets. No disputes. Full transparency, top to bottom.",
    },
    // Scene 9 — Compliance + Audit (~90s)
    {
        id: "compliance", section: "Scene 9 · Compliance & Audit", title: "Always audit-ready. Always compliant.",
        focus: "compliance-panel", image: IMG.corporateOffice, fallback_ms: 90000,
        narration:
            "Insurance is a regulated industry. CreatorBoostAI treats compliance as a first-class citizen, not an afterthought. " +
            "Every action is logged with timestamp, user, and source system. AML and KYC checks run automatically against every new client. SOC 2, state DOI, and carrier audit trails are produced on demand. Document retention, e-signature chain of custody, and policy version history are all preserved and searchable. " +
            "Always audit-ready. Always compliant. Strike Graph, Vanta, and your internal audit team see the same source of truth your producers do.",
    },
    // Scene 10 — Integration Layer (~90s)
    {
        id: "integration", section: "Scene 10 · Integration Layer", title: "We don't replace your stack. We unify and control it.",
        focus: "connect", image: IMG.corporateOffice, fallback_ms: 90000,
        narration:
            "Here's how it actually plugs in. " +
            "CreatorBoostAI connects through standard, secure APIs — to Catalyst CRM, Core, your AMS, your carrier portals, your compliance tools, and your communications stack. Read-only by default. Encrypted in transit and at rest. Every action audited and reviewable. " +
            "We don't replace your stack. We unify it, control it, and finally let it produce the leverage it was supposed to produce on day one.",
    },
    // Scene 11 — Execution Engine (~75s) — proprietary positioning layer
    {
        id: "execution-engine", section: "Scene 11 · The Execution Engine", title: "Not a CRM. Not a marketing tool. An execution layer.",
        focus: "execution-engine", image: IMG.corporateOffice, fallback_ms: 75000,
        narration:
            "Now here's what actually makes this different. " +
            "CreatorBoostAI runs on proprietary, patent-pending execution systems. It is not a CRM. It is not a marketing tool. It is an execution layer that runs across the systems you already operate — Catalyst CRM, Core financial operations, your policy management and AMS platforms, your payroll and commission systems, and your compliance stack. " +
            "It analyzes every connected system in real time. It identifies revenue opportunities and operational inefficiencies the moment they appear. And — when you authorize it — it executes actions across those systems automatically. " +
            "This is a category shift. Most platforms give you data. Some give you insights. CreatorBoostAI executes.",
    },
    // Scene 12 — Revenue Multiplier (~60s)
    {
        id: "revenue-multiplier", section: "Scene 12 · Revenue Multiplier", title: "Same team. More output. More revenue.",
        focus: "revenue-multiplier", image: IMG.handshake, fallback_ms: 60000,
        narration:
            "What does this actually produce? " +
            "Faster quote turnaround. Higher bind rate. More policies per producer per month. Cleaner renewals. Better cross-sell penetration. Lower acquisition cost. " +
            "Same team. More output. More revenue — without adding headcount, without ripping out tools, without disrupting the agency's day-to-day rhythm.",
    },
    // Scene 13 — National + Regional Command Center (~90s)
    {
        id: "national-cc", section: "Scene 13 · National & Regional Command", title: "Your nationwide command center.",
        focus: "national-cc", image: IMG.cityNight, fallback_ms: 90000,
        narration:
            "This is your nationwide command center. " +
            "Every region, every office, every agent — visible in real time, on one map. Revenue heat-mapped state by state. Policies sold per region. Conversion rates side by side. Compliance alerts pinpointed to the office that triggered them. Commission payouts traced to the agent who earned them. " +
            "Drill from the United States, into a state, into an office, into an individual agent. Identify underperforming regions instantly. Reallocate marketing budget to the markets that are converting. Coach the offices that are slipping. Increase output without increasing headcount. " +
            "You're no longer managing agents. You're managing an entire national operation — from one system.",
    },
    // Scene 14 — Command Center Dashboard (~90s)
    {
        id: "command-center", section: "Scene 14 · Command Center", title: "One screen. Full control.",
        focus: "command-dashboard", image: IMG.teamMeeting, fallback_ms: 90000,
        narration:
            "This is the command center. " +
            "Active leads scored by line of business. Policies in flight, by stage, by producer, by carrier. Commission run-rate. Renewal pipeline. Compliance status across every audit framework. Revenue projection by week, month, and quarter. " +
            "Leadership opens this dashboard in the morning and instantly knows: what's binding, what's stuck, who needs help, and where the next dollar of revenue is coming from. " +
            "One screen. Full control over the entire agency.",
    },
    // Scene 15 — Autonomous Mode (~60s)
    {
        id: "autonomous", section: "Scene 15 · Autonomous Mode", title: "Execute automatically — or wait for approval.",
        focus: "autonomous-choice", image: IMG.advisorClient, fallback_ms: 60000,
        narration:
            "The most important question. " +
            "Would you like CreatorBoostAI to execute automatically — sending follow-ups, advancing renewals, drafting policy documents, routing leads — or would you prefer the system to draft every action and wait for producer or compliance approval before it goes out? " +
            "You choose, by team, by line of business, by deal size. Fully autonomous, fully assisted, or anywhere in between. The system always defers to your control.",
    },
    // Scene 16 — Enterprise Close (~45s)
    {
        id: "closing", section: "Scene 16 · Enterprise Close", title: "Most platforms give you data. CreatorBoostAI executes.",
        focus: "cta", image: IMG.handshake, fallback_ms: 45000,
        narration:
            "This is not another tool to bolt onto your stack. " +
            "This is the insurance operating system — a proprietary, patent-pending execution layer that makes your CRM, your AMS, your compliance, your communications, and your commissions finally work as one. " +
            "When you're ready, send this demo to your leadership team, or book a live walkthrough where we map CreatorBoostAI directly to your Catalyst, Applied Epic, AMS360, or EZLynx stack. " +
            "Most platforms give you data. Some give you insights. CreatorBoostAI executes.",
    },
];

const SCENE_GAP_MS = 600;

// =================================================================
// Page
// =================================================================
export default function InsuranceDemoPage() {
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

    // Demo-delivery tracking (founder dashboard, half-view notifications)
    const { personalization, trackEvent } = useDemoTracking({
        demoType: "insurance",
        started, scene, totalScenes: total,
        watchSeconds: Math.round((elapsedBeforeScene + sceneElapsed) / 1000),
        overallProgress, done,
    });
    if (typeof window !== "undefined") {
        window.__demoTracking = { trackEvent, personalization };
    }

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
                    body: JSON.stringify({ text: s.narration, voice: "sage" }),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    cache[s.id] = URL.createObjectURL(blob);
                }
            } catch { /* fallback */ }
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
        if (audioRef.current) { hardSilence(audioRef); }
        const sc = SCENES[idx];
        if (!sc) return;
        sceneStart.current = Date.now();
        setSceneElapsed(0);
        tickTimer.current = setInterval(() => {
            setSceneElapsed(Date.now() - sceneStart.current);
        }, 250);
        const maxMs = sc.fallback_ms || 60000;
        maxTimer.current = setTimeout(() => {
            if (!pausedRef.current) goToNext();
        }, maxMs + 1500);

        if (muted) {
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => {
                if (!pausedRef.current) goToNext();
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
                if (pausedRef.current) return;
                advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
            };
            window.speechSynthesis.speak(u);
        } else {
            advanceTimer.current = setTimeout(() => {
                if (!pausedRef.current) goToNext();
            }, maxMs);
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
        // Optional QA deep-link: ?scene=N (1-indexed) jumps to that scene on start
        const params = new URLSearchParams(window.location.search);
        const sceneParam = parseInt(params.get("scene") || "1", 10);
        const startIdx = Math.max(0, Math.min(SCENES.length - 1, sceneParam - 1));
        // Open scene 0 immediately so the personalized avatar greeting + first
        // visual are visible at click-time. Audio prefetch streams in the
        // background; speakScene fires once cache is ready.
        setStarted(true);
        setScene(startIdx); setDone(false); setPaused(false);
        const cache = await prefetchAll();
        setTimeout(() => speakScene(startIdx, cache), 200);
    };
    const handlePauseResume = () => {
        if (paused) {
            setPaused(false);
            if (audioRef.current?.src) audioRef.current.play().catch(() => {});
            const remaining = Math.max(2000, (current.fallback_ms || 60000) + 1500 - sceneElapsed);
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
        setMuted(p => {
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
                <GlobalTimeline
                    overallProgress={overallProgress}
                    scene={scene}
                    total={total}
                    section={current.section}
                />
            )}

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="insurance-demo-page">
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
                        <CinematicBand image={current.image} title={current.title} section={current.section} />
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <SceneStage scene={current} />
                            </div>
                            <div className="space-y-4 lg:col-span-4">
                                <AvatarPanel
                                    narration={current.narration}
                                    speaking={speaking} muted={muted} paused={paused}
                                    onMute={handleMute}
                                    personalGreeting={scene === 0 && personalization?.name
                                        ? `Hello ${personalization.name}${personalization.company ? ` from ${personalization.company}` : ""} — this walkthrough was prepared just for you.`
                                        : null}
                                />
                                <SceneIndex current={scene} total={total} />
                            </div>
                        </div>

                        {(current.focus === "cta" || done) && (
                            <div className="mt-6"><ClosingCTA onReplay={handleRestart} /></div>
                        )}
                    </div>
                )}

                {/* Post-demo conversion block (auto-scroll on demo end) */}
                <DemoConversionCTA
                    autoScroll={done}
                    autoRedirect={false}
                    demoType="insurance"
                    onShareClick={() => {
                        const node = document.querySelector('[data-testid="insurance-email-generator"]');
                        if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                />

                <div className="mt-12"><DemoEmailSection /></div>
            </div>
        </Layout>
    );
}

// =================================================================
// Hero + start screen
// =================================================================
const Hero = ({ personalization }) => (
    <section className="relative" data-testid="insurance-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Insurance Demo</span>
        </div>
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            One operating system for{" "}
            <span className="text-cyan-400">your entire insurance agency.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            CreatorBoostAI sits on top of the systems you already run — Catalyst CRM, Core, QQCatalyst, Applied Epic,
            AMS360, EZLynx, Microsoft 365, Strike Graph, HubSpot, Salesforce — and unifies them into one executive
            command center. No replacement, no migration, no disruption.
        </p>
        {personalization?.greeting && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="insurance-personalized-greeting">
                {personalization.greeting}
            </p>
        )}
    </section>
);

const StartScreen = ({ onStart, prefetching, progress, personalization }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console</p>
                {personalization?.greeting && (
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="insurance-start-personalized">
                        {personalization.greeting}
                    </p>
                )}
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                    {personalization?.name
                        ? <>This walkthrough was prepared for <span className="text-cyan-400">{personalization.name}</span>.</>
                        : "Run the 16-scene insurance walkthrough."}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 16-scene cinematic walkthrough — narrated by Sage, an executive A.I. voice —
                    showing how CreatorBoostAI sits on top of your CRM, AMS, compliance, and communications stack
                    and turns them into a single insurance operating system. No clicks required.
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
                        Auto-plays · ~12 min · Voice: Sage
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "16 cinematic scenes",
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
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Connects with your insurance stack</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {ALL_PLATFORMS.slice(0, 12).map((s) => (
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

const GlobalTimeline = ({ overallProgress, scene, total, section }) => (
    <>
        <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 bg-white/5" data-testid="global-timeline">
            <div
                className="h-0.5 bg-cyan-500 transition-all duration-300 ease-linear"
                style={{ width: `${overallProgress}%`, boxShadow: "0 0 10px rgba(6,182,212,0.7)" }}
            />
        </div>
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

const SubtitleBar = ({ narration, muted }) => (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-20 sm:pb-16 lg:pb-10" data-testid="subtitle-bar">
        <div className="mx-auto max-w-4xl rounded-md border border-white/10 bg-ink-900/85 px-4 py-3 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] lg:px-6 lg:py-4">
            <div className="flex items-start gap-3">
                <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400">
                    {muted ? "CC" : "Sage"}
                </span>
                <p className="text-sm leading-relaxed text-white sm:text-base lg:text-lg fade-in-up" key={narration}>
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
    <div className="relative mt-4 h-44 overflow-hidden rounded-md border border-white/10 bg-ink-800 sm:h-52 lg:h-60">
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
// Scene stage routing
// =================================================================
const SceneStage = ({ scene }) => {
    const f = scene.focus;
    if (f === "fragmented-agents") return <FragmentedAgents />;
    if (f === "stack-grid") return <InsuranceStackGrid />;
    if (f === "overlay") return <SoftwareOverlay />;
    if (f === "lead-funnel") return <InsuranceLeadFunnel />;
    if (f === "risk-underwriting") return <RiskUnderwritingPanel />;
    if (f === "followup-timeline") return <FollowUpTimeline />;
    if (f === "policy-lifecycle") return <PolicyLifecyclePanel />;
    if (f === "commission-engine") return <CommissionEnginePanel />;
    if (f === "compliance-panel") return <CompliancePanel />;
    if (f === "connect") return <ConnectionDiagram />;
    if (f === "revenue-multiplier") return <RevenueMultiplierPanel />;
    if (f === "national-cc") return <NationalCommandCenter />;
    if (f === "execution-engine") return <ExecutionEngine kind="insurance" />;
    if (f === "command-dashboard") return <CommandCenterDashboard />;
    if (f === "autonomous-choice") return <AutonomousChoice />;
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

// Scene 1 — fragmented insurance agent desk
const FragmentedAgents = () => {
    const tools = [
        { Icon: Users, name: "CRM", note: "Catalyst · HubSpot", count: "2,847 leads" },
        { Icon: FileText, name: "AMS", note: "QQCatalyst · Applied Epic", count: "8,124 policies" },
        { Icon: Mail, name: "Email", note: "Outlook · Teams", count: "412 unread" },
        { Icon: ShieldCheck, name: "Compliance", note: "Strike Graph · KYC", count: "62 audits" },
        { Icon: Phone, name: "Call Center", note: "Dialers · Recordings", count: "184 calls/day" },
        { Icon: ClipboardCheck, name: "Spreadsheets", note: "Commissions · Reports", count: "94 sheets" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="fragmented-agents">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <AlertTriangle size={13} className="text-amber-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Fragmented Agency Stack — Today's Reality</span>
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
                        <span className="mt-2 inline-block rounded-sm border border-amber-500/30 bg-amber-500/5 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-amber-300">disconnected</span>
                    </div>
                ))}
            </div>
            <p className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">No system talks to another. Quotes go cold. Audits scramble. Producers waste hours.</p>
        </div>
    );
};

// Scene 2 — full insurance software stack
const InsuranceStackGrid = () => {
    const sections = [
        { label: "Sales / CRM", list: SALES_PLATFORMS },
        { label: "Agency Management (AMS)", list: AGENCY_PLATFORMS },
        { label: "Communications", list: COMMS_PLATFORMS },
        { label: "Compliance / Audit", list: COMPLIANCE_PLATFORMS },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="stack-grid">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Layers size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Your Insurance Operating Stack</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{ALL_PLATFORMS.length} platforms</span>
            </div>
            <div className="mt-4 space-y-4">
                {sections.map((sec, sx) => (
                    <div key={sec.label}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{sec.label}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {sec.list.map((s, i) => (
                                <div key={s.name} className="rounded-sm border border-white/10 bg-ink-800 p-3 fade-in-up" style={{ animationDelay: `${(sx * 4 + i) * 50}ms` }}>
                                    <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                                    <p className="mt-1 truncate text-xs font-semibold text-white">{s.name}</p>
                                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{s.domain}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">CreatorBoostAI connects to all — read-only · API-native · no replacement</p>
        </div>
    );
};

// Scene 3 — software overlay
const SoftwareOverlay = () => (
    <div className="relative rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 fade-in-up" data-testid="software-overlay">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Network size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Unified Overlay</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {ALL_PLATFORMS.map((s, i) => (
                <div key={s.name} className="relative flex flex-col items-center justify-center rounded-sm border border-white/10 bg-ink-900 p-2 fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                </div>
            ))}
        </div>
        <div className="mt-6 flex items-center justify-center">
            <div className="flex h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <span className="px-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">↓ oversee · connect · execute ↓</span>
            <div className="flex h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>
        <div className="mt-6 rounded-sm border border-cyan-500/40 bg-ink-900 p-5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">CreatorBoostAI · Insurance Command Center</p>
            <p className="font-heading mt-2 text-xl font-semibold text-white">One operating system. Whole agency.</p>
        </div>
    </div>
);

// Scene 4 — insurance lead funnel
const InsuranceLeadFunnel = () => {
    const sources = [
        { name: "Paid Ads", count: "612", trend: "+18%" },
        { name: "Referral Partners", count: "428", trend: "+24%" },
        { name: "Website Forms", count: "318", trend: "+9%" },
        { name: "Inbound Calls", count: "287", trend: "+11%" },
        { name: "Carrier Appointments", count: "194", trend: "+6%" },
        { name: "Cross-Sell", count: "256", trend: "+22%" },
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
                <span className="px-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">↓ auto-tag · auto-score · auto-assign ↓</span>
                <div className="flex h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            </div>
            <div className="mt-4 rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-heading text-sm font-semibold text-white">Auto-routed to your CRM + AMS</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {["Catalyst", "QQCatalyst", "Applied Epic", "Salesforce"].map((c) => (
                            <span key={c} className="rounded-sm border border-cyan-500/30 bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300">{c}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Scene 5 — Risk + Underwriting
const RiskUnderwritingPanel = () => {
    const profiles = [
        { client: "S. Whitfield · Auto + Home", risk: 18, capacity: "$1.2M", carrier: "Carrier A · Match", status: "BIND-READY", t: "up" },
        { client: "M. Rodriguez · Commercial GL", risk: 41, capacity: "$5.8M", carrier: "Carrier C · Review", status: "REFER", t: "neutral" },
        { client: "J. Park · Life · 250K Term", risk: 12, capacity: "Pre-approved", carrier: "Carrier B · Match", status: "FAST-TRACK", t: "up" },
        { client: "R. Doyle · Group Health", risk: 67, capacity: "Underwriting needed", carrier: "Multiple · Quote", status: "FLAG", t: "warn" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="risk-underwriting">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Brain size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">AI Underwriting · Risk + Match</span>
            </div>
            <ul className="mt-5 divide-y divide-white/5">
                {profiles.map((p, i) => (
                    <li key={i} className="py-3 fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-white">{p.client}</span>
                            <span className={`rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${p.t === "up" ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : p.t === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 bg-ink-900 text-slate-300"}`}>{p.status}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                            <span className="font-mono text-slate-400">Risk · <span className={p.risk < 30 ? "text-cyan-300" : p.risk < 50 ? "text-slate-200" : "text-amber-300"}>{p.risk}/100</span></span>
                            <span className="font-mono text-slate-400">Capacity · <span className="text-slate-200">{p.capacity}</span></span>
                            <span className="font-mono text-slate-400">Carrier · <span className="text-slate-200">{p.carrier}</span></span>
                        </div>
                    </li>
                ))}
            </ul>
            <p className="mt-4 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                AI scores risk + matches carrier appetite before producer touches the file
            </p>
        </div>
    );
};

// Scene 6 — follow-up timeline
const FollowUpTimeline = () => {
    const steps = [
        { time: "00:02", channel: "Email", note: "Quote delivered + carrier highlights" },
        { time: "06:30", channel: "SMS", note: "Personal text — producer voice" },
        { time: "Day 1", channel: "Call", note: "Producer call window · 9–11am" },
        { time: "Day 3", channel: "Email", note: "Coverage comparison + carrier docs" },
        { time: "Day 7", channel: "SMS", note: "Re-engage — quote validity reminder" },
        { time: "Day 14", channel: "Call", note: "Producer escalation · binding window" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="followup-timeline">
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
                Drafted automatically · producer reviews + approves · or full autonomous send
            </p>
        </div>
    );
};

// Scene 7 — policy lifecycle
const PolicyLifecyclePanel = () => {
    const stages = [
        { stage: "Quoted", count: 184, value: "$0" },
        { stage: "Bound", count: 96, value: "$24.6M" },
        { stage: "In-Force", count: 8124, value: "$1.42B" },
        { stage: "Renewal · 90d", count: 312, value: "$48.2M" },
        { stage: "Claims", count: 41, value: "$3.2M" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="policy-lifecycle">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <FileCheck size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Policy Lifecycle · Live Across Stack</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {stages.map((s, i) => (
                    <div key={s.stage} className="rounded-sm border border-white/10 bg-ink-800 p-3 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{s.stage}</p>
                        <p className="mt-2 font-heading text-2xl font-semibold text-cyan-300">{s.count.toLocaleString()}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-300">{s.value}</p>
                    </div>
                ))}
            </div>
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-800 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Renewal queue · next 30 days</p>
                <ul className="mt-3 divide-y divide-white/5">
                    {[
                        ["Whitfield Auto + Home · 45 days", "v.4 endorsement", "auto-renew"],
                        ["Rodriguez Commercial GL · 22 days", "v.7 · price change", "review"],
                        ["Park Term Life · 9 days", "v.1 · clean", "auto-renew"],
                        ["Doyle Group Health · 4 days", "v.12 · carrier change", "escalate"],
                    ].map(([policy, version, action], i) => (
                        <li key={i} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-200">{policy}</span>
                            <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
                                <span className="text-slate-400">{version}</span>
                                <span className={action === "escalate" ? "text-amber-300" : "text-cyan-300"}>· {action}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// Scene 8 — commission engine
const CommissionEnginePanel = () => {
    const reps = [
        { name: "Lopez, A.", policies: 47, gci: "$184,200", forecast: "$240k", t: "up" },
        { name: "Patel, R.", policies: 38, gci: "$142,100", forecast: "$190k", t: "up" },
        { name: "Chen, M.", policies: 24, gci: "$84,600", forecast: "$118k", t: "neutral" },
        { name: "Smith, K.", policies: 12, gci: "$38,400", forecast: "$52k", t: "warn" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="commission-engine">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Wallet size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Commission Engine · Producer Performance</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KPI label="GCI YTD" value="$2.84M" trend="+14%" />
                <KPI label="Avg Commission %" value="11.6%" trend="Steady" />
                <KPI label="Forecast Q" value="$1.12M" trend="On track" />
                <KPI label="Disputes Open" value="0" trend="100% reconciled" />
            </div>
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-800 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Live producer ledger</p>
                <ul className="mt-3 divide-y divide-white/5">
                    {reps.map((r, i) => (
                        <li key={i} className="grid grid-cols-4 items-center gap-2 py-2 text-sm">
                            <span className="font-medium text-white">{r.name}</span>
                            <span className="font-mono text-[10px] text-slate-300">{r.policies} pol</span>
                            <span className="font-mono text-[11px] text-cyan-300">{r.gci}</span>
                            <span className={`text-right font-mono text-[10px] uppercase tracking-[0.18em] ${r.t === "up" ? "text-cyan-300" : r.t === "warn" ? "text-amber-300" : "text-slate-400"}`}>fcst {r.forecast}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <p className="mt-4 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Auto-calculated by carrier schedule · split · override · reconciled to Core / AMS
            </p>
        </div>
    );
};
const KPI = ({ label, value, trend }) => (
    <div className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="font-heading mt-2 text-xl font-semibold text-white">{value}</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{trend}</p>
    </div>
);

// Scene 9 — compliance + audit
const CompliancePanel = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="compliance-panel">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <ShieldCheck size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Compliance & Audit Readiness</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
                { Icon: Lock, label: "SOC 2 · Type II", note: "Strike Graph synced", status: "READY" },
                { Icon: ClipboardCheck, label: "AML / KYC", note: "Auto-checked on bind", status: "100%" },
                { Icon: FileText, label: "Audit Trail", note: "Every action logged", status: "12yr retention" },
                { Icon: Users, label: "Role-Based", note: "Producer · Compliance · Finance", status: "RBAC" },
            ].map((b, i) => (
                <div key={b.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                    <b.Icon size={14} className="text-cyan-400" />
                    <p className="font-heading mt-2 text-sm font-semibold text-white">{b.label}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 leading-snug">{b.note}</p>
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{b.status}</p>
                </div>
            ))}
        </div>
        <div className="mt-5 rounded-sm border border-white/10 bg-ink-800 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Recent audit events</p>
            <ul className="mt-3 divide-y divide-white/5">
                {[
                    ["Policy v.7 endorsement signed", "DocuSign · A. Lopez", "12:42:18 EST"],
                    ["KYC re-check · S. Whitfield", "Auto · clean", "11:18:04 EST"],
                    ["SOC 2 evidence pulled", "Strike Graph · Q4 control", "10:02:51 EST"],
                    ["Commission ledger reconciled", "Core · 4,128 entries", "08:30:00 EST"],
                ].map(([evt, src, ts], i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-slate-200">{evt}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">{src} · {ts}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

// Scene 10 — connection diagram
const ConnectionDiagram = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="connection-diagram">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <GitBranch size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">How CB Connects · Insurance Stack</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <Server size={16} className="text-cyan-400" />
                <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 01 · Connect</p>
                <p className="mt-1 text-sm text-slate-200">Standard API connections to Catalyst, AMS, carriers, compliance.</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <Database size={16} className="text-cyan-400" />
                <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 02 · Sync</p>
                <p className="mt-1 text-sm text-slate-200">Read-only by default. Encrypted in transit + at rest. Every event audited.</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <Cpu size={16} className="text-cyan-400" />
                <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 03 · Execute</p>
                <p className="mt-1 text-sm text-slate-200">Orchestrate workflows across systems — with human approval or full autonomy.</p>
            </div>
        </div>
        <div className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-4 text-center">
            <p className="font-heading text-lg font-semibold text-white">Your stack stays exactly as it is.</p>
        </div>
    </div>
);

// Scene 11 — revenue multiplier
const RevenueMultiplierPanel = () => {
    const metrics = [
        { label: "Quote Turnaround", before: "3.4 days", after: "6 hrs", delta: "-92%" },
        { label: "Bind Rate", before: "21%", after: "34%", delta: "+62%" },
        { label: "Policies / Producer / Mo", before: "8.4", after: "13.7", delta: "+63%" },
        { label: "Renewal Retention", before: "84%", after: "94%", delta: "+10 pts" },
        { label: "Cross-Sell Penetration", before: "12%", after: "28%", delta: "+133%" },
        { label: "Avg Commission / Policy", before: "$184", after: "$246", delta: "+34%" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="revenue-multiplier">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <TrendingUp size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Same Team. More Output. More Revenue.</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((m, i) => (
                    <div key={m.label} className="rounded-sm border border-white/10 bg-ink-800 p-4 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{m.label}</p>
                        <div className="mt-2 flex items-end gap-2">
                            <span className="font-heading text-2xl font-semibold text-cyan-300">{m.after}</span>
                            <span className="pb-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{m.delta}</span>
                        </div>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">was {m.before}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// =================================================================
// Scene 11 — The Execution Engine (proprietary positioning layer)
// =================================================================
const EXECUTION_SYSTEMS_INSURANCE = [
    { name: "Catalyst CRM", short: "CAT", domain: "CRM" },
    { name: "Core", short: "CORE", domain: "Financial Ops" },
    { name: "QQCatalyst", short: "QQ", domain: "AMS" },
    { name: "Applied Epic", short: "AE", domain: "AMS" },
    { name: "Payroll", short: "PAY", domain: "Comp / Payroll" },
    { name: "Policy Mgmt", short: "POL", domain: "Lifecycle" },
    { name: "Strike Graph", short: "SG", domain: "Compliance" },
    { name: "M365", short: "M365", domain: "Comms" },
];

const ExecutionEngine = () => {
    const systems = EXECUTION_SYSTEMS_INSURANCE;

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.15)]" data-testid="execution-engine">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Cpu size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CB Core · Execution Engine</span>
                </div>
                <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PATENT-PENDING</span>
            </div>

            <div className="relative mt-6 mx-auto max-w-3xl aspect-square sm:aspect-[16/10]">
                <div className="absolute inset-[12%] rounded-full border border-cyan-500/15" />
                <div className="absolute inset-[24%] rounded-full border border-cyan-500/25" />
                <div className="absolute inset-[36%] rounded-full border border-cyan-500/40" />

                {systems.map((s, i) => {
                    const angle = (i / systems.length) * 2 * Math.PI - Math.PI / 2;
                    const r = 44;
                    const x = 50 + r * Math.cos(angle);
                    const y = 50 + r * Math.sin(angle);
                    return (
                        <div
                            key={s.name}
                            className="absolute -translate-x-1/2 -translate-y-1/2 fade-in-up"
                            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 80}ms` }}
                        >
                            <div
                                className="pointer-events-none absolute left-1/2 top-1/2 h-px origin-left bg-gradient-to-r from-cyan-400/60 to-cyan-400/0 animate-pulse"
                                style={{
                                    width: `${r}%`,
                                    transform: `translate(0,0) rotate(${angle * 180 / Math.PI + 180}deg)`,
                                    transformOrigin: "left center",
                                    animationDelay: `${i * 200}ms`,
                                }}
                            />
                            <div className="relative z-10 rounded-md border border-cyan-500/40 bg-ink-900 px-3 py-2 text-center shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:scale-110 transition-all">
                                <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                                <p className="mt-0.5 text-[9px] text-slate-300 leading-tight">{s.name}</p>
                                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500">{s.domain}</p>
                            </div>
                        </div>
                    );
                })}

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-cyan-400 blur-2xl opacity-50 animate-pulse" />
                        <div className="absolute inset-[-20px] rounded-full border border-cyan-400/40 animate-pulse" />
                        <div className="relative z-10 flex h-28 w-28 sm:h-32 sm:w-32 flex-col items-center justify-center rounded-full border-2 border-cyan-400/60 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 shadow-[0_0_40px_rgba(6,182,212,0.7)]">
                            <Sparkles size={18} className="text-white" />
                            <span className="font-heading mt-1 text-xs font-semibold text-white">CB CORE</span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-cyan-100">EXECUTION</span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-cyan-100">ENGINE</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                    { Icon: Brain, label: "Analyzes", note: "Every connected system in real time" },
                    { Icon: Target, label: "Identifies", note: "Revenue opportunities + inefficiencies" },
                    { Icon: Zap, label: "Executes", note: "Actions across all systems · live" },
                ].map((p, i) => (
                    <div key={p.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4 fade-in-up" style={{ animationDelay: `${(systems.length + i) * 80}ms` }}>
                        <div className="flex items-center gap-2">
                            <p.Icon size={14} className="text-cyan-400" />
                            <span className="font-heading text-base font-semibold text-white">{p.label}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-200">{p.note}</p>
                    </div>
                ))}
            </div>

            <div className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Category Positioning</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-sm border border-amber-500/40 bg-amber-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 line-through">Not a CRM</span>
                    <span className="rounded-sm border border-amber-500/40 bg-amber-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 line-through">Not a marketing tool</span>
                    <span className="rounded-sm border border-amber-500/40 bg-amber-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 line-through">Not another AMS</span>
                    <span className="rounded-sm border border-cyan-400/60 bg-cyan-500/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200 font-semibold">→ AN EXECUTION LAYER</span>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={13} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Defensibility</span>
                    </div>
                    <p className="mt-2 text-sm text-white">Proprietary, patent-pending execution systems. Unique architecture, audited, encrypted, and built for enterprise insurance scale.</p>
                </div>
                <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-4 flex flex-col justify-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">The Signature Line</p>
                    <p className="mt-2 text-base font-semibold text-white leading-snug">
                        Most platforms give you data.<br />
                        Some give you insights.<br />
                        <span className="text-cyan-300">CreatorBoostAI executes.</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

// Scene 12 — National + Regional Command Center
const NationalCommandCenter = () => {
    // Stylized US map: 4 macro regions with state-level cells, color-coded by performance
    // Performance tiers: hot (cyan-bright), strong (cyan), neutral (slate), weak (amber)
    const regions = [
        {
            name: "WEST", revenue: "$72.4M", policies: 2840, conv: "11.8%", flag: "0", states: [
                { ab: "WA", v: "$8.4M", t: "hot" }, { ab: "OR", v: "$3.2M", t: "strong" },
                { ab: "CA", v: "$28.6M", t: "hot" }, { ab: "NV", v: "$2.1M", t: "neutral" },
                { ab: "AZ", v: "$6.8M", t: "strong" }, { ab: "ID", v: "$1.4M", t: "neutral" },
                { ab: "MT", v: "$0.9M", t: "neutral" }, { ab: "WY", v: "$0.7M", t: "weak" },
                { ab: "UT", v: "$3.6M", t: "strong" }, { ab: "CO", v: "$8.2M", t: "hot" },
                { ab: "NM", v: "$2.8M", t: "neutral" }, { ab: "AK", v: "$0.6M", t: "weak" },
                { ab: "HI", v: "$1.1M", t: "neutral" },
            ]
        },
        {
            name: "MIDWEST", revenue: "$58.2M", policies: 2148, conv: "10.4%", flag: "1", states: [
                { ab: "ND", v: "$0.8M", t: "weak" }, { ab: "SD", v: "$0.9M", t: "weak" },
                { ab: "NE", v: "$2.1M", t: "neutral" }, { ab: "KS", v: "$3.4M", t: "strong" },
                { ab: "MN", v: "$8.6M", t: "hot" }, { ab: "IA", v: "$3.8M", t: "strong" },
                { ab: "MO", v: "$6.2M", t: "strong" }, { ab: "WI", v: "$5.4M", t: "strong" },
                { ab: "IL", v: "$14.2M", t: "hot" }, { ab: "IN", v: "$4.8M", t: "strong" },
                { ab: "MI", v: "$10.4M", t: "hot" }, { ab: "OH", v: "$11.2M", t: "hot" },
            ]
        },
        {
            name: "SOUTH", revenue: "$84.7M", policies: 3142, conv: "12.6%", flag: "0", states: [
                { ab: "TX", v: "$26.4M", t: "hot" }, { ab: "OK", v: "$2.8M", t: "neutral" },
                { ab: "AR", v: "$1.9M", t: "neutral" }, { ab: "LA", v: "$3.2M", t: "strong" },
                { ab: "MS", v: "$1.6M", t: "neutral" }, { ab: "AL", v: "$3.4M", t: "strong" },
                { ab: "TN", v: "$6.2M", t: "strong" }, { ab: "KY", v: "$3.1M", t: "neutral" },
                { ab: "GA", v: "$9.8M", t: "hot" }, { ab: "FL", v: "$18.4M", t: "hot" },
                { ab: "SC", v: "$3.4M", t: "strong" }, { ab: "NC", v: "$8.4M", t: "hot" },
                { ab: "VA", v: "$5.8M", t: "strong" }, { ab: "WV", v: "$0.8M", t: "weak" },
            ]
        },
        {
            name: "NORTHEAST", revenue: "$68.9M", policies: 2362, conv: "13.4%", flag: "2", states: [
                { ab: "PA", v: "$12.4M", t: "hot" }, { ab: "NY", v: "$24.6M", t: "hot" },
                { ab: "NJ", v: "$10.2M", t: "hot" }, { ab: "CT", v: "$4.8M", t: "strong" },
                { ab: "RI", v: "$1.4M", t: "neutral" }, { ab: "MA", v: "$8.6M", t: "hot" },
                { ab: "VT", v: "$0.9M", t: "weak" }, { ab: "NH", v: "$1.6M", t: "neutral" },
                { ab: "ME", v: "$1.4M", t: "neutral" }, { ab: "DE", v: "$1.2M", t: "neutral" },
                { ab: "MD", v: "$1.8M", t: "neutral" },
            ]
        },
    ];

    // Auto-rotating tour drilldown (used when no manual selection)
    const tour = [
        {
            level: "NATIONAL", title: "United States · All Operations",
            kpis: [["Revenue", "$284.2M"], ["Policies", "10,492"], ["Avg Conv.", "12.0%"], ["Compliance", "100%"]],
            note: "All 50 states active. 312 offices. 2,847 producers.",
        },
        {
            level: "STATE", title: "Texas · TX · Drill-down",
            kpis: [["Revenue", "$26.4M"], ["Policies", "1,084"], ["Conversion", "13.2%"], ["Offices", "18"]],
            note: "Top-performing state. Houston metro driving 41% of TX volume.",
        },
        {
            level: "OFFICE", title: "Houston Galleria · Office #4-12",
            kpis: [["Revenue", "$8.6M"], ["Policies", "342"], ["Conversion", "14.8%"], ["Producers", "12"]],
            note: "Producer A. Lopez leads office at $1.84M GCI YTD.",
        },
        {
            level: "AGENT", title: "Lopez, A. · Senior Producer",
            kpis: [["GCI YTD", "$1.84M"], ["Policies", "47"], ["Bind Rate", "38%"], ["Renewal Ret.", "97%"]],
            note: "Top performer · auto + commercial GL · 4-year tenure",
        },
    ];

    // State full-name lookup for nicer drill titles
    const STATE_NAMES = {
        WA: "Washington", OR: "Oregon", CA: "California", NV: "Nevada", AZ: "Arizona", ID: "Idaho",
        MT: "Montana", WY: "Wyoming", UT: "Utah", CO: "Colorado", NM: "New Mexico", AK: "Alaska",
        HI: "Hawaii", ND: "North Dakota", SD: "South Dakota", NE: "Nebraska", KS: "Kansas",
        MN: "Minnesota", IA: "Iowa", MO: "Missouri", WI: "Wisconsin", IL: "Illinois", IN: "Indiana",
        MI: "Michigan", OH: "Ohio", TX: "Texas", OK: "Oklahoma", AR: "Arkansas", LA: "Louisiana",
        MS: "Mississippi", AL: "Alabama", TN: "Tennessee", KY: "Kentucky", GA: "Georgia",
        FL: "Florida", SC: "South Carolina", NC: "North Carolina", VA: "Virginia", WV: "West Virginia",
        PA: "Pennsylvania", NY: "New York", NJ: "New Jersey", CT: "Connecticut", RI: "Rhode Island",
        MA: "Massachusetts", VT: "Vermont", NH: "New Hampshire", ME: "Maine", DE: "Delaware", MD: "Maryland",
    };

    // Click-to-drill state machine
    const [autoIdx, setAutoIdx] = React.useState(0);
    const [pickedState, setPickedState] = React.useState(null); // {ab, v, t, region}
    const [manualLevel, setManualLevel] = React.useState(0); // 0 nation, 1 state, 2 office, 3 agent
    const isManual = pickedState !== null;

    React.useEffect(() => {
        if (isManual) return; // freeze auto-rotate while user is drilling
        const t = setInterval(() => setAutoIdx(p => (p + 1) % tour.length), 8000);
        return () => clearInterval(t);
    }, [tour.length, isManual]);

    // Build drill content for the manually picked state (tier-aware)
    const buildManualDrill = () => {
        if (!pickedState) return tour[autoIdx];
        const fullName = STATE_NAMES[pickedState.ab] || pickedState.ab;
        const tier = pickedState.t;
        const tierLabel = tier === "hot" ? "TOP-PERFORMING" : tier === "strong" ? "STRONG" : tier === "weak" ? "UNDERPERFORMING — coach + reallocate" : "STEADY";
        // derive plausible numbers from revenue $ value
        const num = parseFloat(pickedState.v.replace(/[$M]/g, "")) || 1;
        const policies = Math.round(num * 42);
        const offices = Math.max(1, Math.round(num / 1.5));
        const conv = tier === "hot" ? "13.4%" : tier === "strong" ? "12.1%" : tier === "weak" ? "9.2%" : "11.0%";

        if (manualLevel === 1) {
            return {
                level: "STATE",
                title: `${fullName} · ${pickedState.ab} · Drill-down`,
                kpis: [["Revenue", pickedState.v], ["Policies", policies.toLocaleString()], ["Conversion", conv], ["Offices", offices]],
                note: `${tierLabel}. ${pickedState.region} region.`,
            };
        }
        if (manualLevel === 2) {
            const officeRev = (num / 3).toFixed(1) + "M";
            const officePol = Math.round(num * 14);
            return {
                level: "OFFICE",
                title: `${fullName} Metro · Office #${pickedState.ab}-01`,
                kpis: [["Revenue", `$${officeRev}`], ["Policies", officePol.toLocaleString()], ["Conversion", conv], ["Producers", Math.max(4, Math.round(num))]],
                note: `Lead office for ${fullName}. Top producer leading at $1.2M+ GCI YTD.`,
            };
        }
        if (manualLevel === 3) {
            return {
                level: "AGENT",
                title: `Top Producer · ${fullName}`,
                kpis: [["GCI YTD", `$${(num / 4).toFixed(2)}M`], ["Policies", Math.round(num * 5)], ["Bind Rate", tier === "hot" ? "36%" : "29%"], ["Renewal Ret.", tier === "hot" ? "96%" : "91%"]],
                note: `Leading ${fullName} producer · personal lines + commercial split`,
            };
        }
        return tour[0]; // nation
    };

    const drill = isManual ? buildManualDrill() : tour[autoIdx];

    const handleStateClick = (regionName, state) => {
        setPickedState({ ...state, region: regionName });
        setManualLevel(1);
    };
    const drillToOffice = () => setManualLevel(2);
    const drillToAgent = () => setManualLevel(3);
    const backToNation = () => { setPickedState(null); setManualLevel(0); setAutoIdx(0); };

    const tierColor = (t) =>
        t === "hot" ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)]" :
        t === "strong" ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" :
        t === "weak" ? "border-amber-500/40 bg-amber-500/10 text-amber-300" :
        "border-white/10 bg-ink-800 text-slate-300";

    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="national-cc">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Globe2 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">National Command Center · 50 States</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> LIVE</span>
            </div>

            {/* Top-level KPIs */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KPI label="Total Revenue" value="$284.2M" trend="+14% YoY" />
                <KPI label="Policies In-Force" value="10,492" trend="+412 mo" />
                <KPI label="Avg Conversion" value="12.0%" trend="+1.8 pts" />
                <KPI label="Compliance Alerts" value="3" trend="2 NE · 1 MW" />
            </div>

            {/* Heatmap-style regional grid */}
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-800 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                        Revenue heatmap · {isManual ? "click any state to drill" : "click to drill (auto-rotating)"}
                    </p>
                    <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-cyan-400/60 bg-cyan-400/20" /> Hot</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-cyan-500/40 bg-cyan-500/10" /> Strong</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-white/10 bg-ink-800" /> Neutral</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-amber-500/40 bg-amber-500/10" /> Weak</span>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
                    {regions.map((r) => (
                        <div key={r.name} className="rounded-sm border border-white/10 bg-ink-900 p-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{r.name}</span>
                                <span className="font-heading text-sm font-semibold text-white">{r.revenue}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
                                <span>{r.policies.toLocaleString()} pol</span>
                                <span>conv {r.conv}</span>
                                {r.flag !== "0" && <span className="text-amber-300">⚠ {r.flag} flag{r.flag !== "1" ? "s" : ""}</span>}
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-1">
                                {r.states.map((s) => {
                                    const selected = pickedState?.ab === s.ab;
                                    return (
                                        <button
                                            key={s.ab}
                                            type="button"
                                            onClick={() => handleStateClick(r.name, s)}
                                            data-testid={`state-pill-${s.ab}`}
                                            className={`group relative rounded-sm border px-1.5 py-1 text-center transition-all cursor-pointer hover:scale-110 hover:z-10 ${tierColor(s.t)} ${selected ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-ink-900" : ""}`}
                                            title={`${STATE_NAMES[s.ab] || s.ab} · ${s.v} · click to drill`}
                                        >
                                            <span className="font-mono text-[9px] font-semibold">{s.ab}</span>
                                            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-sm border border-white/10 bg-ink-900 px-2 py-0.5 font-mono text-[9px] text-cyan-300 group-hover:block">{s.v}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Drill focus panel — auto-rotating OR manually drilled */}
            <div className="mt-4 rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-4" data-testid="drill-panel">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-cyan-500/20 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">DRILL · {drill.level}</span>
                        <span className="font-heading text-sm font-semibold text-white">{drill.title}</span>
                    </div>
                    {!isManual ? (
                        <div className="flex items-center gap-1">
                            {tour.map((_, i) => (
                                <span key={i} className={`h-1 w-6 rounded-full transition-all ${i === autoIdx ? "bg-cyan-400" : "bg-white/10"}`} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            {manualLevel < 2 && (
                                <button onClick={drillToOffice} data-testid="drill-office-btn" className="inline-flex items-center gap-1 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                    <Briefcase size={10} /> Office
                                </button>
                            )}
                            {manualLevel === 2 && (
                                <button onClick={drillToAgent} data-testid="drill-agent-btn" className="inline-flex items-center gap-1 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                    <Users size={10} /> Agent
                                </button>
                            )}
                            <button onClick={backToNation} data-testid="drill-back-btn" className="inline-flex items-center gap-1 rounded-sm border border-white/15 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                                <Globe2 size={10} /> Nation
                            </button>
                        </div>
                    )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 fade-in-up" key={`${drill.level}-${drill.title}`}>
                    {drill.kpis.map(([l, v]) => (
                        <div key={l} className="rounded-sm border border-white/10 bg-ink-900 p-2">
                            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{l}</p>
                            <p className="font-heading mt-1 text-base font-semibold text-cyan-300">{v}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">{drill.note}</p>
                {/* Breadcrumb when manual */}
                {isManual && (
                    <div className="mt-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em]">
                        <button onClick={backToNation} className="text-cyan-300 hover:text-cyan-200">Nation</button>
                        <span className="text-slate-600">›</span>
                        <button onClick={() => setManualLevel(1)} className={manualLevel >= 1 ? "text-cyan-300 hover:text-cyan-200" : "text-slate-500"}>{pickedState?.ab}</button>
                        {manualLevel >= 2 && <><span className="text-slate-600">›</span><button onClick={() => setManualLevel(2)} className="text-cyan-300 hover:text-cyan-200">Office</button></>}
                        {manualLevel >= 3 && <><span className="text-slate-600">›</span><span className="text-cyan-300">Agent</span></>}
                    </div>
                )}
            </div>

            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                Nation → State → Office → Agent · drill any layer · reallocate resources from one screen
            </p>
        </div>
    );
};

// Scene 12 — command center dashboard
const CommandCenterDashboard = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="command-dashboard">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <BarChart3 size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Insurance Command Center</span>
            </div>
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> LIVE</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Active Leads" value="2,847" trend="+312 wk" />
            <KPI label="In-Force Policies" value="8,124" trend="+62" />
            <KPI label="GCI Run-Rate" value="$2.84M" trend="+14%" />
            <KPI label="Compliance" value="100%" trend="SOC 2 + AML" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Pipeline by line of business</p>
                <ul className="mt-3 divide-y divide-white/5">
                    {[
                        ["Personal Auto + Home", "$8.4M · 1,284 quotes", "up"],
                        ["Commercial GL", "$12.6M · 318 quotes", "up"],
                        ["Life · Term + Whole", "$4.2M · 612 quotes", "neutral"],
                        ["Group Health", "$6.8M · 184 quotes", "warn"],
                    ].map(([k, v, t], i) => (
                        <li key={i} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-200">{k}</span>
                            <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${t === "up" ? "text-cyan-300" : t === "warn" ? "text-amber-300" : "text-slate-400"}`}>{v}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="rounded-sm border border-white/10 bg-ink-800 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Renewals · next 90 days</p>
                <ul className="mt-3 divide-y divide-white/5">
                    {[
                        ["30 days", "184 policies · $4.2M", "up"],
                        ["60 days", "312 policies · $7.8M", "up"],
                        ["90 days", "428 policies · $11.4M", "neutral"],
                        ["At-risk · escalate", "18 policies · $1.6M", "warn"],
                    ].map(([k, v, t], i) => (
                        <li key={i} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-200">{k}</span>
                            <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${t === "up" ? "text-cyan-300" : t === "warn" ? "text-amber-300" : "text-slate-400"}`}>{v}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
);

// Scene 13 — autonomous choice
const AutonomousChoice = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-6 fade-in-up" data-testid="autonomous-choice">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Brain size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Avatar Asks</span>
        </div>
        <p className="mt-5 font-heading text-xl leading-snug text-white sm:text-2xl">
            "Would you like me to execute automatically — or wait for your approval?"
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 p-5">
                <div className="flex items-center gap-2">
                    <Rocket size={14} className="text-cyan-400" />
                    <span className="font-heading text-base font-semibold text-white">Fully Autonomous</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">CreatorBoostAI sends follow-ups, advances renewals, drafts policy documents, and routes leads on its own — within the rules you set.</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Faster bind rate</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Always-on follow-up</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Full audit trail</li>
                </ul>
            </div>
            <div className="rounded-sm border border-white/15 bg-ink-800 p-5">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-cyan-400" />
                    <span className="font-heading text-base font-semibold text-white">Assisted Mode</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">Every outbound action is drafted by the AI and queued for producer or compliance approval before send.</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Full human control</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Brand + voice review</li>
                    <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 text-cyan-400" /> Carrier-friendly</li>
                </ul>
            </div>
        </div>
        <p className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
            Mix and match — by team, by line of business, by deal size
        </p>
    </div>
);

// =================================================================
// Sidebar bits + closing
// =================================================================
const SceneIndex = ({ current, total }) => (
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

const AvatarPanel = ({ narration, speaking, muted, paused, onMute, personalGreeting }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4 backdrop-blur-sm" data-testid="avatar-panel">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sparkles size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">CreatorBoostAI Assistant · Sage</span>
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
        {personalGreeting && (
            <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-sm leading-relaxed text-cyan-100" data-testid="avatar-personal-greeting">
                {personalGreeting}
            </p>
        )}
        <p className="mt-4 max-h-64 overflow-y-auto pr-1 text-base font-medium leading-relaxed text-white scrollbar-cyan" key={narration}>
            <span className="fade-in-up inline-block">{narration}</span>
        </p>
        <div className="mt-4 flex items-center gap-2">
            <button onClick={onMute} className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">{muted ? <VolumeX size={11} /> : <Volume2 size={11} />} {muted ? "Voice On" : "Voice Off"}</button>
        </div>
    </div>
);

const ClosingCTA = ({ onReplay }) => {
    const scrollToEmail = () => {
        const node = document.querySelector('[data-testid="insurance-email-generator"]');
        if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (
        <div data-testid="closing-cta" className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-6 lg:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Complete</p>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">This is your insurance operating system.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Send this walkthrough to your leadership team, replay the demo, or book a live walkthrough where we map CreatorBoostAI directly to your Catalyst, Applied Epic, AMS360, or EZLynx stack.</p>
            <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={scrollToEmail} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400"><Mail size={15} /> Send this demo</button>
                <button onClick={onReplay} className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-transparent px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/10"><Play size={15} /> Replay Demo</button>
                <a href="/contact" className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-white transition-all hover:border-cyan-500/40 hover:text-cyan-300"><CalendarCheck size={15} /> Book a walkthrough</a>
            </div>
        </div>
    );
};

// =================================================================
// Insurance demo email generator
// =================================================================
const INDUSTRIES = ["Insurance Agent / Broker", "Agency Principal", "Underwriter", "Compliance / Risk", "Carrier · Distribution"];
const DemoEmailSection = () => {
    const [form, setForm] = useState({ name: "", email: "", company: "", industry: INDUSTRIES[0], note: "" });
    const [generated, setGenerated] = useState(null);
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    const handle = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const demoLink = useMemo(() => {
        if (typeof window === "undefined") return "https://www.bodyiq-ai.com/demo/insurance";
        return `${window.location.origin}/demo/insurance`;
    }, []);
    const buildPreview = () => {
        const subject = `See how CreatorBoostAI unifies your ${form.industry.toLowerCase()} stack`;
        const body = `Hi ${form.name},\n\nI wanted to send you a quick demo of CreatorBoostAI for insurance operations.\n\nThis demo shows how the system sits on top of Catalyst CRM, your AMS, your compliance stack, and your communications platforms — capturing leads, scoring risk, automating follow-up, tracking policy lifecycle, calculating commissions, and producing audit-ready compliance trails.\n\nIt is designed for agencies, brokerages, MGAs, and carriers that want to multiply revenue without ripping out the systems they already run.\n\nYou can view the demo here:\n${demoLink}${form.note ? `\n\n${form.note}` : ""}\n\nBest,\nJeffrey`;
        return { subject, body, to: form.email };
    };
    const sendDemo = async () => {
        if (!form.name || !form.email) { toast.error("Customer name and email are required"); return; }
        setGenerated(buildPreview());
        setSending(true); setSendResult(null);
        try {
            const res = await shareDemo({
                recipient_email: form.email,
                recipient_name: form.name || undefined,
                sender_name: "Jeffrey Garcia",
                company: form.company || undefined,
                message: form.note || undefined,
                demo_type: "insurance",
                origin_url: typeof window !== "undefined" ? window.location.origin : undefined,
            });
            if (res.sent) {
                setSendResult({ ok: true, msg: `Demo email sent to ${form.email}.` });
                toast.success("Demo email sent");
            } else {
                setSendResult({ ok: false, msg: res.reason || "Email service unavailable. Use Copy link as a fallback." });
                toast.error("Email could not be sent. Copy link instead.");
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : "Network error. Try again.";
            setSendResult({ ok: false, msg });
            toast.error(msg);
        } finally { setSending(false); }
    };
    const copyEmail = async () => {
        if (!generated) return;
        const text = `To: ${generated.to}\nSubject: ${generated.subject}\n\n${generated.body}`;
        try { await navigator.clipboard.writeText(text); setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 2500); }
        catch { toast.error("Copy failed"); }
    };
    const copyLink = async () => { try { await navigator.clipboard.writeText(demoLink); toast.success("Demo link copied"); } catch { toast.error("Copy failed"); } };

    return (
        <section className="rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-8" data-testid="insurance-email-generator">
            <div className="flex items-center gap-2"><Mail size={14} className="text-cyan-400" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Send This Demo to a Customer</span></div>
            <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">Personalized email · sent in one click.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Fill in the customer details and we'll send the demo directly via Resend. Or copy the shareable link below.</p>
            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-4">
                    <Field label="Customer name *"><input data-testid="ins-share-name" type="text" value={form.name} onChange={handle("name")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Sarah Whitfield" /></Field>
                    <Field label="Customer email *"><input data-testid="ins-share-email" type="email" value={form.email} onChange={handle("email")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="sarah@whitfieldinsurance.com" /></Field>
                    <Field label="Agency / company"><input data-testid="ins-share-company" type="text" value={form.company} onChange={handle("company")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Whitfield Insurance Group" /></Field>
                    <Field label="Role"><select value={form.industry} onChange={handle("industry")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none">{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></Field>
                    <Field label="Personal note (optional)"><textarea data-testid="ins-share-note" rows={3} value={form.note} onChange={handle("note")} className="input-glow w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Adds a personal line at the end." /></Field>
                    <div className="flex flex-wrap gap-3">
                        <button data-testid="ins-share-send" onClick={sendDemo} disabled={sending} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 disabled:opacity-60">{sending ? "Sending…" : <><Send size={14} /> Send Demo</>}</button>
                        <button data-testid="ins-share-copy-link" onClick={copyLink} className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 px-4 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"><Copy size={13} /> Copy link</button>
                    </div>
                </div>
                <div className="lg:col-span-7">
                    {sendResult && (
                        <div data-testid={sendResult.ok ? "ins-share-success" : "ins-share-error"} className={`mb-4 rounded-md border p-4 ${sendResult.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
                            <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${sendResult.ok ? "bg-emerald-400" : "bg-red-400"}`} /><span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${sendResult.ok ? "text-emerald-300" : "text-red-300"}`}>{sendResult.ok ? "Sent · check inbox" : "Send failed"}</span></div>
                            <p className="mt-1.5 text-sm text-slate-200">{sendResult.msg}</p>
                        </div>
                    )}
                    <div className="rounded-md border border-white/10 bg-ink-800 p-5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3"><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Email preview</span>{generated && (<button onClick={copyEmail} className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">{copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy email"}</button>)}</div>
                        {generated ? (<div className="mt-4 space-y-3"><p className="font-mono text-[11px] text-slate-400">To: <span className="text-white">{generated.to}</span></p><p className="font-mono text-[11px] text-slate-400">Subject: <span className="text-white">{generated.subject}</span></p><pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200 scrollbar-cyan">{generated.body}</pre></div>) : (<div className="flex h-72 items-center justify-center text-center"><p className="max-w-xs text-sm text-slate-500">Fill in the customer details and click <span className="text-cyan-300">Send Demo</span>.</p></div>)}
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
