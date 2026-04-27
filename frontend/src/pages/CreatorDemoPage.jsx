import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import { shareDemo } from "@/lib/api";
import { DemoConversionCTA } from "@/components/site/DemoConversionCTA";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { useRefMirror, hardSilence, useDemoCleanup } from "@/lib/demoAudioFix";
import {
    Play, Pause, Volume2, VolumeX, Check, ArrowRight, Sparkles,
    Mic, TrendingUp, DollarSign, Users, Brain, Activity, Zap,
    Heart, Eye, MessageSquare, Briefcase, Globe2, Layers, Target,
    BarChart3, ShieldCheck, Cpu, Network, Mail, Send, Copy,
} from "lucide-react";

// =================================================================
// Cinematic imagery (AI-generated brand illustrations, served from /public)
// =================================================================
const IMG = {
    creatorStudio:  "/generated/scene-creator-studio.jpg",
    phoneFilming:   "/generated/scene-creator-phone-filming.jpg",
    podcastMic:     "/generated/scene-creator-podcast-mic.jpg",
    audienceCrowd:  "/generated/scene-creator-audience-crowd.jpg",
    laptopCreator:  "/generated/scene-creator-laptop-creator.jpg",
    socialFeed:     "/generated/scene-creator-social-feed.jpg",
    cityNight:      "/generated/scene-creator-city-night.jpg",
    handshake:      "/generated/scene-creator-handshake.jpg",
};

// Creator-economy stack the system overlays
const CREATOR_STACK = [
    { name: "Instagram", short: "IG", domain: "Reach" },
    { name: "TikTok", short: "TT", domain: "Discovery" },
    { name: "YouTube", short: "YT", domain: "Long-form" },
    { name: "Stripe", short: "ST", domain: "Payments" },
    { name: "Shopify", short: "SH", domain: "Storefront" },
    { name: "Patreon", short: "PT", domain: "Paid Tiers" },
    { name: "Substack", short: "SS", domain: "Newsletter" },
    { name: "Gmail", short: "GM", domain: "Brand Inbox" },
];

// =================================================================
// 11 scenes · ~6.5 min runtime · auto-played
// Audio.ended is the primary trigger; fallback_ms is the cap.
// =================================================================
const SCENES = [
    {
        id: "hook",
        section: "Scene 1 · The Hook",
        title: "You don't have a content problem. You have an operations problem.",
        focus: "hook",
        image: IMG.creatorStudio,
        fallback_ms: 38000,
        narration:
            "You're not just a creator anymore. You're a media company, a sales team, a customer service desk, and a brand agency — all running out of one phone. " +
            "Sponsorships are buried in your inbox. Engagement spikes go un-monetized. Your storefront, your paid tier, and your partnerships live in three different dashboards. " +
            "You don't have a content problem. You have an operations problem.",
    },
    {
        id: "system-overlay",
        section: "Scene 2 · CreatorBoostAI On Top",
        title: "CreatorBoostAI sits on top of every platform you already use.",
        focus: "platforms",
        image: IMG.phoneFilming,
        fallback_ms: 42000,
        narration:
            "CreatorBoostAI is the operating layer for the creator economy. " +
            "Instagram, TikTok, YouTube, Stripe, Shopify, Patreon, Substack, your brand inbox — every platform that runs your business — gets unified into one command center. " +
            "Nothing migrates. Nothing breaks. Your content tools stay exactly where they are. CreatorBoostAI just makes them work together for the first time.",
    },
    {
        id: "audience-intel",
        section: "Scene 3 · Audience Intelligence",
        title: "Audience analytics that surface buyer intent — not just vanity.",
        focus: "audience",
        image: IMG.audienceCrowd,
        fallback_ms: 45000,
        narration:
            "Most analytics tell you who follows you. CreatorBoostAI tells you who is about to buy. " +
            "It reads engagement patterns, watch-time signals, comment sentiment, and saved posts across every platform — and clusters your audience by intent: high-intent buyers, paid-tier candidates, sponsorship influencers, and casual viewers. " +
            "Your content stays creative. Your business gets surgical.",
    },
    {
        id: "bodyiq-overlay",
        section: "Scene 4 · BodyIQ-AI Behavioral Layer",
        title: "BodyIQ-AI reads tone, hesitation, and conviction — frame by frame.",
        focus: "bodyiq",
        image: IMG.podcastMic,
        fallback_ms: 42000,
        narration:
            "This is where BodyIQ-AI quietly takes over. " +
            "On every video you publish, BodyIQ-AI analyzes pacing, vocal energy, eye contact, and on-camera conviction — frame by frame — and scores how persuasive the moment is. " +
            "It tells you which thirty-second window of a fifteen-minute video is converting, which thumbnail expression is winning, and which call-to-action is landing. " +
            "Not body language for entertainment. Behavioral intelligence for revenue.",
    },
    {
        id: "revenue-tracking",
        section: "Scene 5 · Revenue Engine",
        title: "Storefront, paid tiers, sponsorships — one revenue line.",
        focus: "revenue",
        image: IMG.laptopCreator,
        fallback_ms: 48000,
        narration:
            "This is the revenue engine. " +
            "Storefront sales from Shopify. Recurring revenue from your paid tier. Brand-deal payouts. Affiliate commissions. Live event ticketing. Newsletter conversions. " +
            "Every dollar — across every platform — is tracked, attributed, and projected in one dashboard. You finally see exactly where your money is coming from, which content drove it, and what the next thirty days will look like.",
    },
    {
        id: "brand-pipeline",
        section: "Scene 6 · Brand-Deal Automation",
        title: "Brand-deal pipeline auto-built. Auto-pitched. On your behalf.",
        focus: "brand-pipeline",
        image: IMG.socialFeed,
        fallback_ms: 50000,
        narration:
            "Brand deals are where creators leave the most money on the table — because chasing them is a full-time job. " +
            "CreatorBoostAI builds your brand-deal pipeline automatically. It identifies brands aligned to your audience, surfaces the right contact, drafts a personalized pitch in your voice, and sends it on your schedule. " +
            "Replies come back into one unified inbox. Negotiation, contract, and deliverables tracked end-to-end. " +
            "You stop chasing partnerships. Partnerships start arriving.",
    },
    {
        id: "content-engine",
        section: "Scene 7 · Content Performance",
        title: "Every post, scored against revenue — not likes.",
        focus: "content-engine",
        image: IMG.creatorStudio,
        fallback_ms: 38000,
        narration:
            "Every piece of content you publish gets scored on three dimensions: reach, conversion, and retention. " +
            "The system tells you which formats, hooks, and posting windows are actually moving revenue — and quietly recommends the next three pieces of content most likely to compound. " +
            "Your creativity stays yours. The data does the homework.",
    },
    {
        id: "command-center",
        section: "Scene 8 · The Creator Command Center",
        title: "One screen. Whole creator business.",
        focus: "command-center",
        image: IMG.cityNight,
        fallback_ms: 50000,
        narration:
            "This is your command center. " +
            "Total revenue today, this month, this quarter. Audience growth across every platform. Brand-deal pipeline value. BodyIQ-AI conviction scores on your last ten videos. Top-converting content. Pending sponsorship replies. Storefront orders. Paid-tier churn. " +
            "What used to live in eight tabs and three spreadsheets — is now one screen. You open it in the morning and instantly know: what's working, what's breaking, and where the next dollar is coming from.",
    },
    {
        id: "automation-prompt",
        section: "Scene 9 · Autonomous Mode",
        title: "Should the system run this for you?",
        focus: "automation-prompt",
        image: IMG.handshake,
        fallback_ms: 42000,
        narration:
            "Now the most important question. " +
            "Would you like CreatorBoostAI to run these actions automatically — pitching brands, replying to sponsorship inquiries, scheduling content in the windows BodyIQ-AI scored highest, sending follow-ups to high-intent buyers — or would you prefer to review and approve every action before it goes out? " +
            "You choose, by channel and by category. Full autonomy. Full approval. Or anywhere in between. The system always defers to you.",
    },
    {
        id: "scale",
        section: "Scene 10 · Scale Without Hiring",
        title: "Replace the manager, the agent, and the editor — keep the creator.",
        focus: "scale",
        image: IMG.podcastMic,
        fallback_ms: 38000,
        narration:
            "Most creators hit a ceiling not because the audience stops growing — but because the operations stop scaling. " +
            "CreatorBoostAI replaces what most creators eventually pay a manager, an agent, an editor, and a virtual assistant to do — and runs it twenty-four hours a day, across every platform, in your voice. " +
            "You scale your business without scaling your headcount.",
    },
    {
        id: "closing",
        section: "Scene 11 · Closing",
        title: "Most platforms give you data. CreatorBoostAI executes.",
        focus: "cta",
        image: IMG.handshake,
        fallback_ms: 36000,
        narration:
            "This is not another analytics tool. This is not another scheduler. " +
            "This is the operating system for your creator business — combining CreatorBoostAI execution with BodyIQ-AI behavioral intelligence — to increase monetization, automate the manual work, and give you back the time you started creating to have. " +
            "When you're ready, send this demo to your manager or your team, replay any section, or book a live walkthrough where we map the system directly to your stack. " +
            "Most platforms give you data. Some give you insights. CreatorBoostAI executes.",
    },
];

const SCENE_GAP_MS = 600;

// =================================================================
// Page
// =================================================================
export default function CreatorDemoPage() {
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

    const apiBase = useMemo(() => {
        const base = process.env.REACT_APP_BACKEND_URL || "";
        return `${base}/api`;
    }, []);

    // Demo-delivery tracking — opens session on Start, heartbeats progress.
    const { personalization, trackEvent } = useDemoTracking({
        demoType: "creator",
        started, scene, totalScenes: total,
        watchSeconds: Math.round((Date.now() - sceneStart.current) / 1000) + Math.round(elapsedBeforeScene / 1000),
        overallProgress, done,
    });

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
            } catch { /* fallback to speechSynthesis */ }
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
        const maxMs = sc.fallback_ms || 45000;
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
            // Female American voice preference
            const female = voices.find(v => /samantha|victoria|ava|allison|en-us.*female/i.test(v.name + " " + v.lang))
                || voices.find(v => v.lang === "en-US")
                || voices.find(v => v.lang?.startsWith("en"));
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
        // Open scene 0 immediately so the personalized greeting + first
        // visual are visible at click-time. Audio prefetch streams in the
        // background; speakScene fires once cache is ready.
        setStarted(true);
        setScene(0); setDone(false); setPaused(false);
        const cache = await prefetchAll();
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

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="creator-demo-page">
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
                                <NarrationPanel
                                    narration={current.narration}
                                    speaking={speaking} muted={muted} paused={paused}
                                    onMute={handleMute}
                                />
                                <SceneIndex current={scene} total={total} />
                            </div>
                        </div>

                        {(current.focus === "cta" || done) && (
                            <div className="mt-6"><ClosingCTA onReplay={handleRestart} trackEvent={trackEvent} /></div>
                        )}
                    </div>
                )}

                <DemoConversionCTA
                    autoScroll={done}
                    autoRedirect={false}
                    demoType="creator"
                />
            </div>
        </Layout>
    );
}

// =================================================================
// Hero + start screen
// =================================================================
const Hero = ({ personalization }) => (
    <section className="relative" data-testid="creator-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Influencer & Creator Demo</span>
        </div>
        {personalization?.greeting && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="creator-personalized-greeting">
                {personalization.greeting}
            </p>
        )}
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Run your entire creator business with{" "}
            <span className="text-cyan-400">one operating system.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            CreatorBoostAI™ overlays Instagram, TikTok, YouTube, Stripe, Shopify, Patreon, and your brand inbox —
            and BodyIQ-AI™ adds frame-by-frame behavioral intelligence on every video — to monetize the audience
            you already have.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching, progress, personalization }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console</p>
                {personalization?.greeting && (
                    <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200" data-testid="creator-start-personalized">
                        {personalization.greeting}
                    </p>
                )}
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the 11-scene walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 11-scene cinematic walkthrough — narrated by a female American voice — showing how
                    CreatorBoostAI plus BodyIQ-AI overlay your platforms and turn audience into revenue. No clicks
                    required. Sit back and watch.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                        onClick={onStart} disabled={prefetching} data-testid="start-creator-demo-btn"
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
                        Auto-plays · ~6.5 min · Voice: Sage (female · American)
                    </span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "11 cinematic scenes",
                        "100% auto-play · no clicks",
                        "BodyIQ-AI behavioral overlays",
                        "Brand-deal automation prompt",
                    ].map((b) => (
                        <li key={b} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <Check size={13} className="text-cyan-400" /> {b}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="lg:col-span-5">
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Overlays your creator stack</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {CREATOR_STACK.map((s) => (
                            <div key={s.name} className="flex flex-col items-center justify-center rounded-sm border border-white/10 bg-ink-900 px-2 py-3">
                                <span className="font-mono text-[10px] font-semibold text-cyan-300">{s.short}</span>
                                <span className="mt-1 text-center text-[9px] text-slate-400 leading-tight">{s.name}</span>
                                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500 mt-0.5">{s.domain}</span>
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
            <Btn onClick={onPauseResume} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} primary testid="creator-control-pause" />
            <Btn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Voice On" : "Voice Off"} testid="creator-control-mute" />
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
        <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 bg-white/5" data-testid="creator-global-timeline">
            <div
                className="h-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 transition-[width] duration-300"
                style={{ width: `${overallProgress}%` }}
            />
        </div>
        <div className="pointer-events-none fixed left-1/2 top-1.5 z-[60] -translate-x-1/2 rounded-full border border-cyan-500/30 bg-ink-900/85 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-md">
            {scene + 1}/{total} · {section} · {overallProgress}%
        </div>
    </>
);

const CinematicBand = ({ image, title, section }) => (
    <div className="relative mt-4 overflow-hidden rounded-md border border-white/10" data-testid="creator-cinematic-band">
        <div className="aspect-[21/9] sm:aspect-[24/7]">
            <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{section}</p>
            <h3 className="font-heading mt-1 text-xl font-semibold text-white sm:text-2xl lg:text-3xl">{title}</h3>
        </div>
    </div>
);

const NarrationPanel = ({ narration, speaking, muted, paused, onMute }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Mic size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Narration · Sage</span>
            </div>
            <button
                onClick={onMute}
                className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 hover:text-cyan-300"
            >
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                <span>{muted ? "Off" : "On"}</span>
            </button>
        </div>
        <div className="mt-3 max-h-[26rem] overflow-y-auto pr-1">
            <p className={`text-sm leading-relaxed text-slate-200 transition-opacity ${speaking && !muted && !paused ? "opacity-100" : "opacity-80"}`}>
                {narration}
            </p>
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
// SceneStage — visual mock per focus type
// =================================================================
const SceneStage = ({ scene }) => {
    switch (scene.focus) {
        case "hook":
            return <HookStage />;
        case "platforms":
            return <PlatformsStage />;
        case "audience":
            return <AudienceStage />;
        case "bodyiq":
            return <BodyIQStage />;
        case "revenue":
            return <RevenueStage />;
        case "brand-pipeline":
            return <BrandPipelineStage />;
        case "content-engine":
            return <ContentEngineStage />;
        case "command-center":
            return <CommandCenterStage />;
        case "automation-prompt":
            return <AutomationPromptStage />;
        case "scale":
            return <ScaleStage />;
        case "cta":
            return <CTAStage />;
        default:
            return null;
    }
};

// ---------- Stage 1 — Hook (chaos panel) ----------
const HookStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">The Reality</p>
        <h3 className="font-heading mt-2 text-xl font-semibold text-white">Eight tabs. Three spreadsheets. One creator.</h3>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
                { label: "Brand DMs", value: "47 unread", bad: true },
                { label: "Storefront", value: "$0 revenue tab", bad: true },
                { label: "Sponsorship", value: "Lost in inbox", bad: true },
                { label: "Engagement spike", value: "Un-monetized", bad: true },
                { label: "Paid tier churn", value: "Untracked", bad: true },
                { label: "Affiliate links", value: "12 platforms", bad: true },
                { label: "Posting schedule", value: "Manual", bad: true },
                { label: "Brand pitches", value: "Drafting…", bad: true },
            ].map((c) => (
                <div key={c.label} className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">{c.label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{c.value}</p>
                </div>
            ))}
        </div>
        <p className="mt-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
            → CreatorBoostAI consolidates all of this into one operating system.
        </p>
    </div>
);

// ---------- Stage 2 — Platforms ----------
const PlatformsStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Network size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Native Overlays · Read-only by default</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">+ custom integrations</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CREATOR_STACK.map((s, i) => (
                <div
                    key={s.name}
                    className="rounded-sm border border-white/10 bg-ink-900 p-3 text-center fade-in-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                >
                    <span className="font-mono text-xs font-semibold text-cyan-300">{s.short}</span>
                    <p className="mt-1 text-sm font-semibold text-white">{s.name}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{s.domain}</p>
                </div>
            ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Capability Icon={Layers} label="Oversee" body="Every creator platform in one operational view." />
            <Capability Icon={Sparkles} label="Connect" body="Bidirectional sync — content, audience, money." />
            <Capability Icon={Zap} label="Execute" body="Recommended actions fire automatically." />
        </div>
    </div>
);

const Capability = ({ Icon, label, body }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
);

// ---------- Stage 3 — Audience Intelligence ----------
const AudienceStage = () => {
    const segments = [
        { label: "High-Intent Buyers", pct: 18, count: "84,200", color: "bg-cyan-400" },
        { label: "Paid-Tier Candidates", pct: 24, count: "112,400", color: "bg-cyan-500" },
        { label: "Sponsorship Influencers", pct: 9, count: "42,180", color: "bg-blue-400" },
        { label: "Casual Viewers", pct: 49, count: "229,840", color: "bg-slate-600" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Users size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Audience · 468,620 unified across 4 platforms</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> LIVE</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CKPI label="Total Audience" value="468.6K" trend="+4.2% MoM" />
                <CKPI label="Engagement Rate" value="6.4%" trend="top 8% peers" />
                <CKPI label="Watch Time" value="2.1M hr" trend="+18% MoM" />
                <CKPI label="Buyer Intent Score" value="A+" trend="14 of 20 viral" />
            </div>
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Audience Clusters · by Intent</p>
                <div className="mt-4 space-y-3">
                    {segments.map((s, i) => (
                        <div key={s.label} className="fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <span>{s.label}</span>
                                <span className="font-mono text-[10px] text-cyan-300">{s.count} · {s.pct}%</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-800">
                                <div className={`h-full ${s.color} transition-all duration-1000`} style={{ width: `${s.pct}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ---------- Stage 4 — BodyIQ-AI overlay ----------
const BodyIQStage = () => {
    const frames = [
        { t: "0:00–0:30", score: 62, note: "Soft hook · low conviction" },
        { t: "0:30–1:15", score: 88, note: "Story break · peak engagement" },
        { t: "1:15–2:40", score: 71, note: "Steady · slight pacing dip" },
        { t: "2:40–3:20", score: 94, note: "Closing CTA · highest conversion" },
        { t: "3:20–4:00", score: 58, note: "Outro · viewer drop" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.12)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Brain size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">BodyIQ-AI · Behavioral Frame Analysis</span>
                </div>
                <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">PATENT-PENDING</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CKPI label="Pacing" value="0.97x" trend="optimal" />
                <CKPI label="Vocal Energy" value="84/100" trend="confident" />
                <CKPI label="Eye Contact" value="71%" trend="lift +9%" />
                <CKPI label="Conviction" value="A−" trend="closer to A" />
            </div>
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Frame-by-frame conviction score · 4-min video</p>
                <div className="mt-3 space-y-2.5">
                    {frames.map((f, i) => (
                        <div key={f.t} className="fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{f.t}</span>
                                <span className="text-cyan-300">{f.note}</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-800">
                                <div
                                    className={`h-full transition-all duration-1000 ${f.score >= 85 ? "bg-cyan-300" : f.score >= 70 ? "bg-cyan-500" : "bg-amber-500/70"}`}
                                    style={{ width: `${f.score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">Recommendation:</span> Pin the 2:40–3:20 closing as the next reel hook.
                Predicted lift: <span className="font-mono text-cyan-300">+34% CTR · +18% saves</span>.
            </p>
        </div>
    );
};

// ---------- Stage 5 — Revenue ----------
const RevenueStage = () => {
    const sources = [
        { label: "Storefront (Shopify)", value: "$48,210", pct: 31 },
        { label: "Paid Tier (Patreon + Substack)", value: "$36,840", pct: 24 },
        { label: "Brand Deals", value: "$42,500", pct: 27 },
        { label: "Affiliate", value: "$14,180", pct: 9 },
        { label: "Live Events", value: "$8,900", pct: 6 },
        { label: "Newsletter", value: "$4,620", pct: 3 },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Revenue Engine · 30-day rollup</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">All sources · all platforms</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CKPI label="MRR (Total)" value="$155.3K" trend="+22% MoM" />
                <CKPI label="ARR Run-rate" value="$1.86M" trend="projected" />
                <CKPI label="Avg Deal Size" value="$8.4K" trend="brand deals" />
                <CKPI label="LTV / Buyer" value="$214" trend="storefront" />
            </div>
            <div className="mt-5 rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Revenue mix · attribution by source</p>
                <div className="mt-4 space-y-2.5">
                    {sources.map((s, i) => (
                        <div key={s.label} className="fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <span>{s.label}</span>
                                <span className="font-mono text-[10px] text-cyan-300">{s.value} · {s.pct}%</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-800">
                                <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-1000" style={{ width: `${s.pct}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ---------- Stage 6 — Brand pipeline ----------
const BrandPipelineStage = () => {
    const deals = [
        { brand: "Glossier", stage: "Pitched", value: "$24K", status: "auto-sent" },
        { brand: "Nike Run Club", stage: "Reply received", value: "$48K", status: "review" },
        { brand: "Bumble", stage: "Negotiation", value: "$36K", status: "round 2" },
        { brand: "Adobe Express", stage: "Contract", value: "$18K", status: "sig pending" },
        { brand: "DoorDash", stage: "Live", value: "$22K", status: "deliver wk 2" },
        { brand: "Liquid IV", stage: "Paid", value: "$14K", status: "complete" },
    ];
    const STAGE_TINT = {
        "Pitched": "bg-blue-500/10 text-blue-300 border-blue-500/30",
        "Reply received": "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        "Negotiation": "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        "Contract": "bg-amber-500/10 text-amber-300 border-amber-500/30",
        "Live": "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        "Paid": "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    };
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Briefcase size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Brand-Deal Pipeline · auto-built · auto-pitched</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">$162K open</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CKPI label="Pipeline Value" value="$162K" trend="open deals" />
                <CKPI label="Pitches Sent (30d)" value="48" trend="auto-drafted" />
                <CKPI label="Reply Rate" value="34%" trend="+11pt vs human" />
                <CKPI label="Avg Deal Size" value="$26K" trend="up YoY" />
            </div>
            <div className="mt-5 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Brand</th>
                            <th className="px-4 py-3">Stage</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deals.map((d, i) => (
                            <tr key={d.brand} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{d.brand}</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${STAGE_TINT[d.stage]}`}>{d.stage}</span>
                                </td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{d.value}</td>
                                <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{d.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---------- Stage 7 — Content engine ----------
const ContentEngineStage = () => {
    const content = [
        { title: "How I run my business in 2 hr/day", reach: "1.4M", conv: "$8.2K", retention: "92%", score: "A" },
        { title: "Behind the brand deal — Glossier", reach: "820K", conv: "$3.6K", retention: "78%", score: "A−" },
        { title: "Storefront restock vlog", reach: "640K", conv: "$12.4K", retention: "84%", score: "A+" },
        { title: "Q&A with my paid tier", reach: "210K", conv: "$5.8K", retention: "88%", score: "A" },
        { title: "Day in the life · creator stack", reach: "1.1M", conv: "$2.1K", retention: "62%", score: "B+" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Content Performance · scored against revenue</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Top 5 · last 30d</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-ink-900">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="px-4 py-3">Content</th>
                            <th className="px-4 py-3">Reach</th>
                            <th className="px-4 py-3">Revenue</th>
                            <th className="px-4 py-3">Retention</th>
                            <th className="px-4 py-3">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {content.map((c, i) => (
                            <tr key={c.title} className="border-b border-white/5 last:border-0 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                                <td className="px-4 py-3 font-semibold text-white">{c.title}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-slate-300">{c.reach}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-cyan-300">{c.conv}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-slate-300">{c.retention}</td>
                                <td className="px-4 py-3"><span className="rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">{c.score}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">Next-3 recommendations:</span>
                {" "}1) Restock vlog 2 (highest revenue retention) · 2) Brand-deal teardown reel · 3) Paid-tier Q&A — schedule Tue 6:30pm CT (BodyIQ peak window).
            </p>
        </div>
    );
};

// ---------- Stage 8 — Command Center ----------
const CommandCenterStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.12)]">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Cpu size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Creator Command Center · LIVE</span>
            </div>
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> all platforms</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CKPI label="Today's Revenue" value="$6,210" trend="+18% vs avg" />
            <CKPI label="MTD Revenue" value="$155.3K" trend="+22% MoM" />
            <CKPI label="Audience" value="468.6K" trend="+4.2% MoM" />
            <CKPI label="Brand Pipeline" value="$162K" trend="open" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Tile Icon={Heart} label="Engagement" body="6.4% avg · top 8% of peers" />
            <Tile Icon={Eye} label="Watch Time" body="2.1M hr · +18% MoM" />
            <Tile Icon={MessageSquare} label="Inbox" body="47 brand DMs · 12 high-priority" />
            <Tile Icon={Activity} label="BodyIQ" body="A− conviction · last 10 videos" />
            <Tile Icon={TrendingUp} label="Storefront" body="$48K MTD · 11 SKUs" />
            <Tile Icon={Globe2} label="Paid Tier" body="2,140 members · 1.8% churn" />
        </div>
    </div>
);
const Tile = ({ Icon, label, body }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span>
        </div>
        <p className="mt-2 text-sm text-slate-200">{body}</p>
    </div>
);

// ---------- Stage 9 — Automation prompt ----------
const AutomationPromptStage = () => {
    const [choice, setChoice] = useState("auto");
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up shadow-[0_0_50px_rgba(6,182,212,0.18)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Zap size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Autonomous Mode · Choose Your Comfort Level</span>
                </div>
                <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">YOU ALWAYS CONTROL</span>
            </div>
            <p className="mt-4 text-sm text-slate-200">
                Should CreatorBoostAI run these actions automatically?
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {[
                    { id: "auto", title: "Full Autonomy", body: "System pitches brands, replies, schedules content, and follows up — all in your voice. You're notified, not asked.", tag: "Hands-off" },
                    { id: "review", title: "Review & Approve", body: "Every drafted action sits in your queue. One tap to approve. Nothing sends without you.", tag: "Default" },
                    { id: "mix", title: "Mixed by Channel", body: "Brand outreach: auto. Creative replies: review. Storefront: auto. Tune any time.", tag: "Most popular" },
                ].map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setChoice(opt.id)}
                        data-testid={`creator-automation-option-${opt.id}`}
                        className={`text-left rounded-sm border p-4 transition-all hover:-translate-y-0.5 ${choice === opt.id ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(6,182,212,0.3)]" : "border-white/10 bg-ink-900 hover:border-cyan-500/40"}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-heading text-base font-semibold text-white">{opt.title}</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{opt.tag}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{opt.body}</p>
                        {choice === opt.id && (
                            <div className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                                <Check size={12} /> Selected
                            </div>
                        )}
                    </button>
                ))}
            </div>
            <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">Switch any time.</span> The system always defers to you — by channel, by category, by deal size.
            </p>
        </div>
    );
};

// ---------- Stage 10 — Scale ----------
const ScaleStage = () => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Target size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Scale Without Hiring</span>
            </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">What you'd usually pay for</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {[
                        "Manager · $5K–$10K/mo",
                        "Brand agency · 15–20% of deals",
                        "Editor · $3K–$8K/mo",
                        "Virtual assistant · $1.5K–$4K/mo",
                        "Analytics tool stack · $400+/mo",
                    ].map((s) => (
                        <li key={s} className="flex items-start gap-2 text-slate-300">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400/70" />
                            <span>{s}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">What CreatorBoostAI replaces</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {[
                        "Brand-deal pipeline · automated end-to-end",
                        "Content scheduling · BodyIQ-AI windows",
                        "Inbox triage · in your voice",
                        "Revenue + audience analytics · unified",
                        "Sponsorship contract tracking · live",
                    ].map((s) => (
                        <li key={s} className="flex items-start gap-2 text-slate-200">
                            <Check size={13} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                            <span>{s}</span>
                        </li>
                    ))}
                </ul>
                <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/10 p-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    Scale your business — not your headcount.
                </p>
            </div>
        </div>
    </div>
);

// ---------- Stage 11 — CTA ----------
const CTAStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-6 lg:p-8 fade-in-up shadow-[0_0_60px_rgba(6,182,212,0.18)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Closing</p>
        <h3 className="font-heading mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
            Most platforms give you data. <span className="text-cyan-300">CreatorBoostAI executes.</span>
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
            CreatorBoostAI™ + BodyIQ-AI™ — the operating system for your creator business.
            Increase monetization. Replace manual work. Get your time back.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Sig icon={ShieldCheck} label="Proprietary" body="Patent-pending execution layer" />
            <Sig icon={Cpu} label="Behavioral" body="BodyIQ-AI scoring on every video" />
            <Sig icon={Zap} label="Autonomous" body="Runs 24/7 in your voice" />
        </div>
    </div>
);
const Sig = ({ icon: Icon, label, body }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span>
        </div>
        <p className="mt-2 text-sm text-slate-200">{body}</p>
    </div>
);

// =================================================================
// Shared sub-components
// =================================================================
const CKPI = ({ label, value, trend }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="font-heading mt-1 text-lg font-semibold text-cyan-300 sm:text-xl">{value}</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{trend}</p>
    </div>
);

const ClosingCTA = ({ onReplay, trackEvent }) => {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(null);
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/demo/creator` : "/demo/creator";

    const send = async () => {
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email"); return; }
        setBusy(true);
        try {
            const res = await shareDemo({ recipient_email: email, demo_type: "creator", share_target: shareUrl });
            setSent({ ok: true, msg: res?.delivered ? "Sent!" : "Queued (no email key in dev)" });
            trackEvent?.("cta_share", { from: "creator-end", email });
            toast.success("Demo sent");
            setEmail("");
        } catch {
            setSent({ ok: false, msg: "Could not send" });
            toast.error("Could not send demo");
        } finally { setBusy(false); }
    };

    const copy = async () => {
        try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); trackEvent?.("cta_copy_link", { from: "creator-end" }); }
        catch { toast.error("Copy failed"); }
    };

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-ink-700/40 p-6 fade-in-up" data-testid="creator-share-module">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Demo complete · Send it to your team</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white sm:text-3xl">Pass this demo to a manager, agent, or fellow creator.</h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                        Every share is tracked. Help your team see how CreatorBoostAI runs the entire creator business as one operating system.
                    </p>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="lg:col-span-2 flex flex-wrap items-center gap-2">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="recipient@company.com"
                        data-testid="creator-share-email"
                        className="min-w-[220px] flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                    <button onClick={send} disabled={busy} data-testid="creator-share-send"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 disabled:opacity-60">
                        {busy ? "Sending…" : <><Send size={13} /> Send Demo</>}
                    </button>
                    <button onClick={copy} data-testid="creator-share-copy"
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                        <Copy size={11} /> Copy link
                    </button>
                    <button onClick={() => { trackEvent?.("cta_replay", { from: "creator-end" }); onReplay(); }}
                        data-testid="creator-replay-btn"
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                        <Play size={11} /> Replay
                    </button>
                </div>
                <div className="rounded-sm border border-cyan-500/30 bg-ink-900 p-3 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Or scan to share</p>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareUrl)}&size=150x150&bgcolor=0a0e14&color=22d3ee`}
                        alt="Demo QR code"
                        className="mx-auto mt-2 h-24 w-24 rounded-sm border border-white/5" data-testid="creator-share-qr" />
                </div>
            </div>

            {sent && (
                <p className={`mt-3 font-mono text-[10px] uppercase tracking-[0.22em] ${sent.ok ? "text-cyan-300" : "text-rose-300"}`} data-testid="creator-share-result">
                    {sent.msg}
                </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Ready to apply?</span>
                <a href="/apply/strategy"
                    onClick={() => trackEvent?.("cta_apply", { from: "creator-end" })}
                    data-testid="creator-apply-btn"
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-cyan-400">
                    Request Access <ArrowRight size={11} />
                </a>
            </div>
        </div>
    );
};
