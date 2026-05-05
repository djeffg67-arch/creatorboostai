import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import {
    Rocket, FileText, TrendingUp, Banknote, Users, Mail, Sparkles,
    ArrowRight, Play, Pause, RotateCcw, CheckCircle2, MessageSquare, Building2,
    Volume2, VolumeX, Mic, Globe, Layout as LayoutIcon, Smartphone, Monitor,
} from "lucide-react";

// 10 scenes · ~18 seconds each · 3 minutes total narration
// Each scene has a dedicated voiceover script tuned for a female narrator.
const SCENES = [
    {
        id: "scene-1",
        title: "Tell the avatar your business idea",
        Icon: MessageSquare,
        kicker: "Scene 1 · The Spark",
        body: "“Tell me what business you want to start. I'll help you build the plan, documents, numbers, leads, outreach, and next steps.”",
        chip: "Founder enters: 'Mobile dog grooming · Austin TX · solo · $80 avg ticket'",
        voiceover: "Welcome to CreatorBoostAI. This is the founder demo. The system begins the moment you describe your business. One sentence is enough — the avatar turns that spark into a full business operating system in minutes.",
    },
    {
        id: "scene-2",
        title: "Structured questions, not endless chat",
        Icon: Users,
        kicker: "Scene 2 · Discovery",
        body: "Industry. Location. Pricing idea. Year-1 goal. Six structured questions in 90 seconds — every input maps to a real output.",
        chip: "ICP captured · pricing band locked · year-1 revenue target set",
        voiceover: "Instead of endless chat, the avatar asks six structured questions: industry, location, pricing, year-one goal, and target customer. Every answer is captured once, then routed downstream into every document, financial model, and lead list you will need.",
    },
    {
        id: "scene-3",
        title: "A real business plan in minutes",
        Icon: FileText,
        kicker: "Scene 3 · The Plan",
        body: "Executive summary, market, competition, GTM, ops, financials. 8 sections. Markdown-clean. Print to PDF or export to DOCX with one click.",
        chip: "8-section plan generated · PDF + DOCX exports unlocked",
        voiceover: "In under two minutes you have a real business plan. Executive summary, market analysis, competition, go-to-market, operations, and financials — eight sections, bank and investor ready. Export to PDF or Word with one click.",
    },
    {
        id: "scene-4",
        title: "12-month financial projections",
        Icon: TrendingUp,
        kicker: "Scene 4 · The Numbers",
        body: "Realistic growth assumptions. Month-by-month revenue, COGS, gross margin, fixed costs, operating profit, cash balance. Built like a real CFO would.",
        chip: "Breakeven month: 7 · year-end cash: $42K · gross margin: 68%",
        voiceover: "Next, twelve months of financial projections. Month-by-month revenue, cost of goods, gross margin, fixed costs, operating profit, and cash balance. The numbers are realistic — built the way a real chief financial officer would build them.",
    },
    {
        id: "scene-5",
        title: "Loan-ready documents",
        Icon: Banknote,
        kicker: "Scene 5 · The Capital",
        body: "1-page executive summary. Use of funds. Repayment plan with DSCR ≥ 1.25. Owner experience. Bank-ready, lender-ready.",
        chip: "Loan summary · DSCR 1.4 · use-of-funds itemized",
        voiceover: "Need capital? The system produces a one-page loan summary with use of funds, debt service coverage, and repayment terms. Bank ready. Lender ready. You walk in prepared.",
    },
    {
        id: "scene-6",
        title: "Your business website, built automatically",
        Icon: Globe,
        kicker: "Scene 6 · The Website",
        body: "Your business doesn't just need a plan — it needs a presence. The avatar builds a complete, industry-tuned website: home, about, services, contact. Copy written. Lead capture wired to your CRM. Mobile + desktop preview. Domain-ready to publish.",
        chip: "Home · About · Services · Contact · Lead capture → CRM · Ready to publish",
        voiceover: "Your business doesn't just need a plan — it needs a presence. CreatorBoostAI now builds your entire business website. Homepage, services, about, and contact pages — all written, designed, and connected to your lead system. Customers can find you, trust you, and take action immediately.",
        kind: "website_builder",
    },
    {
        id: "scene-7",
        title: "A targeted lead list — not a Lusha export",
        Icon: Users,
        kicker: "Scene 7 · The Customers",
        body: "ICP locked. Lead-list filter spec generated. Each lead routes through the Exclusive Lead Engine — locked to you, never duplicated, never resold.",
        chip: "ICP defined · 47 prospects assembled · all locked to founder",
        voiceover: "Now the customers. Your ideal customer profile is locked, and a targeted prospect list is generated. Every lead runs through the Exclusive Lead Engine — locked to you, never duplicated, never resold.",
    },
    {
        id: "scene-8",
        title: "Value-first outreach the avatar writes for you",
        Icon: Mail,
        kicker: "Scene 8 · The Outreach",
        body: "5-touch cadence. Day 0 force-reply. Day 1 bump. Day 3 proof point. Day 5 Loom offer. Day 8 polite close. Personalized to each prospect's industry + city.",
        chip: "5 emails drafted per lead · all in voice · ready to send",
        voiceover: "The avatar writes your outreach. A five-touch cadence, personalized to each prospect's industry and city. Day zero, day one, day three, day five, day eight — every email crafted in your voice, ready to send.",
    },
    {
        id: "scene-9",
        title: "Demo or offer page launched",
        Icon: Sparkles,
        kicker: "Scene 9 · The Conversion",
        body: "Soft-gated demo page captures email + company. The intent score auto-bumps. The Hot Leads button surfaces them in the Ops portal in real time.",
        chip: "First demo viewed · soft-gate triggered · prospect score 85",
        voiceover: "Each prospect lands on a soft-gated demo page. Their intent score climbs with every click and open. Hot leads surface in the Ops portal in real time, so you know exactly who to call next.",
    },
    {
        id: "scene-10",
        title: "Replies tracked. Engagement scored. Hot leads pinged.",
        Icon: CheckCircle2,
        kicker: "Scene 10 · The Signal",
        body: "Every reply gets AI-classified into interested / neutral / not-interested. Interested replies auto-create deals + send Calendly. Founder gets SMS within 60 seconds.",
        chip: "1 deal created · $2,800 pipeline · founder notified",
        voiceover: "Every reply is classified by AI — interested, neutral, or not interested. Interested replies automatically create a deal and send a Calendly link, and you receive a text message within sixty seconds. No reply gets missed.",
    },
    {
        id: "scene-11",
        title: "From win → client workspace · automatic",
        Icon: Building2,
        kicker: "Scene 11 · The Delivery",
        body: "Lead flips to won. Client account auto-created. 6-step checklist seeded. Magic link emailed. Delivery AI takes over. Zero manual handoff.",
        chip: "Client onboarded · workspace active · status: in_progress",
        voiceover: "Finally, when a deal closes, a client workspace is created automatically. A six-step delivery checklist is seeded, a magic link is emailed to your client, and Delivery AI takes over. Zero manual handoff. This is CreatorBoostAI — your business, fully operated.",
    },
];

const SCENE_MS = 16500;  // 16.5s × 11 scenes ≈ 181s (~3 min)

// ─────────────── Voice picker (prefers English female voices) ───────────────
const FEMALE_VOICE_HINTS = [
    "samantha", "karen", "victoria", "moira", "tessa", "serena", "nova",
    "allison", "ava", "susan", "fiona", "kate", "kathy", "vicki",
    "google uk english female", "google us english female",
    "microsoft zira", "microsoft aria", "microsoft jenny", "microsoft michelle",
    "microsoft jane", "microsoft sonia", "microsoft libby", "microsoft emma",
    "female",
];

const pickFemaleVoice = (voices) => {
    if (!voices || voices.length === 0) return null;
    const en = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
    const pool = en.length > 0 ? en : voices;
    for (const hint of FEMALE_VOICE_HINTS) {
        const match = pool.find((v) => (v.name || "").toLowerCase().includes(hint));
        if (match) return match;
    }
    return pool[0] || null;
};


// ─────────────── Website Builder Panel (scene 6 visualization) ───────────────
const BUILD_STEPS = [
    "Generating homepage…",
    "Drafting service pages…",
    "Optimizing messaging for your industry…",
    "Wiring lead capture form to CRM…",
    "Building mobile + desktop layouts…",
    "Preparing for domain deployment…",
];

const WebsiteBuilderPanel = ({ active, sceneIdx }) => {
    const [stepIdx, setStepIdx] = useState(0);
    const [showSite, setShowSite] = useState(false);
    const [viewport, setViewport] = useState("desktop");
    const timerRef = useRef(null);

    // Reset whenever we enter / re-enter this scene.
    useEffect(() => {
        setStepIdx(0);
        setShowSite(false);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [sceneIdx]);

    // Advance the build steps while the scene is active.
    useEffect(() => {
        if (!active) return;
        if (stepIdx >= BUILD_STEPS.length) { setShowSite(true); return; }
        timerRef.current = setTimeout(() => setStepIdx((i) => i + 1), 1400);
        return () => clearTimeout(timerRef.current);
    }, [active, stepIdx]);

    return (
        <div className="mt-8 grid gap-6 lg:grid-cols-2" data-testid="website-builder-panel">
            {/* Build log */}
            <div className="rounded-md border border-cyan-500/20 bg-ink-900/60 p-4">
                <div className="flex items-center gap-2">
                    <Globe size={13} className="text-cyan-300" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Build log</p>
                </div>
                <div className="mt-3 space-y-1.5" data-testid="website-builder-steps">
                    {BUILD_STEPS.map((s, i) => {
                        const done = i < stepIdx;
                        const current = i === stepIdx;
                        return (
                            <div key={s}
                                 data-testid={`website-build-step-${i}`}
                                 className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 font-mono text-[11px] ${
                                     done ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                                     : current ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                                     : "border-white/5 bg-ink-700/30 text-slate-500"
                                 }`}>
                                {done ? <CheckCircle2 size={11} className="text-emerald-300" />
                                    : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                                    : <span className="h-2 w-2 rounded-full bg-white/10" />}
                                <span>{s}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mini website preview */}
            <div className="rounded-md border border-emerald-500/20 bg-ink-900/60 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LayoutIcon size={13} className="text-emerald-300" />
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Preview</p>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setViewport("mobile")}
                            data-testid="website-preview-mobile"
                            className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${viewport === "mobile" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-slate-400 hover:text-emerald-300"}`}>
                            <Smartphone size={10} /> Mobile
                        </button>
                        <button onClick={() => setViewport("desktop")}
                            data-testid="website-preview-desktop"
                            className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${viewport === "desktop" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-slate-400 hover:text-emerald-300"}`}>
                            <Monitor size={10} /> Desktop
                        </button>
                    </div>
                </div>
                <div className={`mt-3 overflow-hidden rounded-md border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 transition-all duration-500 ${viewport === "mobile" ? "mx-auto max-w-[260px]" : "w-full"}`}
                     data-testid="website-preview-frame">
                    {!showSite ? (
                        <div className="flex h-[280px] items-center justify-center">
                            <div className="text-center">
                                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Composing layout…</p>
                            </div>
                        </div>
                    ) : (
                        <div data-testid="website-preview-rendered" className="h-[280px] overflow-hidden">
                            <div className="flex items-center gap-1.5 border-b border-white/10 bg-black/30 px-2 py-1.5">
                                <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                                <span className="ml-2 truncate font-mono text-[9px] text-slate-400">austindoggrooming.com</span>
                            </div>
                            <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2">
                                <span className="font-heading text-[11px] font-semibold text-white">Austin Dog Grooming</span>
                                <div className="flex gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-400">
                                    <span>Home</span><span>Services</span><span>About</span><span>Contact</span>
                                </div>
                            </div>
                            <div className="px-3 py-4">
                                <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-emerald-300">Mobile · Austin TX</p>
                                <p className="mt-1 font-heading text-[14px] font-semibold leading-tight text-white">
                                    Stress-free dog grooming<br />delivered to your door.
                                </p>
                                <p className="mt-1.5 text-[10px] leading-snug text-slate-300">
                                    Van-based grooming for busy Austin dog parents. $80 flat · same-week booking.
                                </p>
                                <div className="mt-2 flex gap-1.5">
                                    <span className="rounded-sm bg-emerald-400 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-ink-900">Book a van</span>
                                    <span className="rounded-sm border border-cyan-500/40 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-300">Get a quote</span>
                                </div>
                            </div>
                            <div className="mx-3 mb-3 rounded-sm border border-emerald-500/30 bg-emerald-500/5 px-2 py-2">
                                <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-emerald-300">Lead capture → CRM</p>
                                <div className="mt-1 grid grid-cols-2 gap-1">
                                    <span className="rounded-sm bg-white/5 px-1.5 py-1 text-[8px] text-slate-400">Name</span>
                                    <span className="rounded-sm bg-white/5 px-1.5 py-1 text-[8px] text-slate-400">Phone</span>
                                </div>
                                <span className="mt-1 block rounded-sm bg-emerald-400 px-1.5 py-1 text-center font-mono text-[8px] uppercase tracking-[0.18em] text-ink-900">Request a quote</span>
                            </div>
                        </div>
                    )}
                </div>
                <p className="mt-2 font-mono text-[10px] text-slate-400">
                    {showSite ? "Domain-ready · lead capture wired to your CRM" : "Rendering your site…"}
                </p>
            </div>
        </div>
    );
};


export default function StartupDemoPage() {
    const [started, setStarted] = useState(false);
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [voiceReady, setVoiceReady] = useState(false);
    const [supportsTTS, setSupportsTTS] = useState(true);
    const voiceRef = useRef(null);
    const utteranceRef = useRef(null);
    const advanceTimerRef = useRef(null);

    // Load voices once. Chrome fires an async `voiceschanged` event — handle both.
    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            setSupportsTTS(false);
            return;
        }
        const load = () => {
            const voices = window.speechSynthesis.getVoices();
            const picked = pickFemaleVoice(voices);
            if (picked) {
                voiceRef.current = picked;
                setVoiceReady(true);
            }
        };
        load();
        window.speechSynthesis.addEventListener("voiceschanged", load);
        return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }, []);

    // Stop any ongoing speech when the component unmounts or scene/play state changes.
    const stopSpeech = useCallback(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
        utteranceRef.current = null;
    }, []);

    // Speak the current scene's voiceover (if unmuted + playing + started).
    const speakScene = useCallback((sceneIdx) => {
        if (!supportsTTS) return;
        stopSpeech();
        if (muted) return;
        const scene = SCENES[sceneIdx];
        if (!scene) return;
        const u = new window.SpeechSynthesisUtterance(scene.voiceover);
        u.rate = 1.0;
        u.pitch = 1.05;
        u.volume = 1.0;
        if (voiceRef.current) u.voice = voiceRef.current;
        // Re-pick voice if not set yet (race with voiceschanged)
        if (!u.voice) {
            const latest = window.speechSynthesis.getVoices();
            const picked = pickFemaleVoice(latest);
            if (picked) { u.voice = picked; voiceRef.current = picked; }
        }
        utteranceRef.current = u;
        try { window.speechSynthesis.speak(u); } catch { /* noop */ }
    }, [muted, supportsTTS, stopSpeech]);

    // Start the demo after first user click — unlocks browser audio permissions.
    const startDemo = useCallback(() => {
        if (supportsTTS) {
            // Play a silent utterance first to unlock iOS Safari + some Chrome configs.
            try {
                const warm = new window.SpeechSynthesisUtterance(" ");
                warm.volume = 0;
                window.speechSynthesis.speak(warm);
            } catch { /* noop */ }
        }
        setStarted(true);
        setPlaying(true);
        setIdx(0);
        // Speak immediately for scene 0 — small delay lets voices list settle.
        setTimeout(() => speakScene(0), 150);
    }, [speakScene, supportsTTS]);

    // Advance timer — only runs when started + playing.
    useEffect(() => {
        if (!started || !playing) return;
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = setTimeout(() => {
            setIdx((i) => (i + 1 < SCENES.length ? i + 1 : i));
        }, SCENE_MS);
        return () => clearTimeout(advanceTimerRef.current);
    }, [started, playing, idx]);

    // Whenever scene index changes (and we are started + playing + unmuted),
    // stop the prior utterance and speak the new one.
    useEffect(() => {
        if (!started) return;
        stopSpeech();
        if (playing && !muted) speakScene(idx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, started]);

    // Cleanup speech on unmount.
    useEffect(() => () => stopSpeech(), [stopSpeech]);

    const handleTogglePlay = () => {
        if (!started) { startDemo(); return; }
        setPlaying((p) => {
            const next = !p;
            if (!next) stopSpeech();
            else speakScene(idx);
            return next;
        });
    };

    const handleReplay = () => {
        stopSpeech();
        setIdx(0);
        setPlaying(true);
        if (!started) setStarted(true);
        setTimeout(() => speakScene(0), 150);
    };

    const handleToggleMute = () => {
        setMuted((m) => {
            const next = !m;
            if (next) stopSpeech();
            else if (started && playing) speakScene(idx);
            return next;
        });
    };

    const goToScene = (i) => {
        setIdx(i);
        setPlaying(false);
        stopSpeech();
        // If already started, speak the new scene once.
        if (started && !muted) setTimeout(() => speakScene(i), 100);
    };

    const scene = SCENES[idx];
    const progress = Math.round((100 * (idx + 1)) / SCENES.length);

    return (
        <Layout>
            <div className="relative min-h-[90vh] bg-ink-900 text-slate-100" data-testid="startup-demo-page">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_60%)]" />
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.08),transparent_55%)]" />

                <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:py-16">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-3 py-1.5">
                            <Rocket size={11} className="text-emerald-300" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">CreatorBoostAI · Founder Demo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleToggleMute}
                                disabled={!supportsTTS}
                                data-testid="demo-toggle-mute"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300 disabled:opacity-50"
                                title={muted ? "Unmute narration" : "Mute narration"}
                            >
                                {muted ? <><VolumeX size={11} /> Unmute</> : <><Volume2 size={11} /> Mute</>}
                            </button>
                            <button
                                onClick={handleTogglePlay}
                                data-testid="demo-toggle-play"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300"
                            >
                                {playing ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Play</>}
                            </button>
                            <button
                                onClick={handleReplay}
                                data-testid="demo-replay"
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300"
                            >
                                <RotateCcw size={11} /> Replay
                            </button>
                        </div>
                    </div>

                    {/* Narration status strip */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
                        <span data-testid="demo-narration-status"
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${
                                  !supportsTTS ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
                                  : !started ? "border-white/10 bg-ink-700/40 text-slate-400"
                                  : muted ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
                                  : playing ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                  : "border-cyan-500/30 bg-cyan-500/5 text-cyan-300"
                              }`}>
                            <Mic size={10} />
                            {!supportsTTS ? "Voice not supported in this browser"
                             : !started ? "Voice ready — press Start Demo With Voice"
                             : muted ? "Narration muted"
                             : playing ? "Narrating"
                             : "Paused"}
                        </span>
                        {voiceReady && voiceRef.current && (
                            <span data-testid="demo-voice-name" className="text-slate-500">
                                voice · {voiceRef.current.name}
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-ink-700/50">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5" data-testid="demo-scene-pager">
                        {SCENES.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goToScene(i)}
                                data-testid={`demo-scene-${i}`}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? "bg-emerald-400/70" : "bg-white/10 hover:bg-white/20"}`}
                                aria-label={`Scene ${i + 1}`}
                            />
                        ))}
                    </div>

                    {/* Active scene */}
                    <div className="relative mt-12 min-h-[360px] rounded-md border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-6 sm:p-10" data-testid="demo-active-scene">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/10">
                                <scene.Icon size={20} className="text-emerald-300" />
                            </div>
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">{scene.kicker}</p>
                                <h2 className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">
                                    {scene.title}
                                </h2>
                            </div>
                        </div>
                        <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-lg">
                            {scene.body}
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-ink-900 px-4 py-2.5 font-mono text-[11px] text-cyan-300">
                            <Sparkles size={12} /> {scene.chip}
                        </div>

                        {/* Website Builder live visualization (Scene 6) */}
                        {scene.kind === "website_builder" && (
                            <WebsiteBuilderPanel active={started && playing} sceneIdx={idx} />
                        )}

                        {/* Start-with-voice overlay — visible until user's first click. */}
                        {!started && (
                            <div
                                data-testid="demo-start-overlay"
                                className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-ink-900/85 backdrop-blur-sm"
                            >
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-3 py-1">
                                    <Mic size={11} className="text-emerald-300" />
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Female voice narration · 3 min</span>
                                </div>
                                <h3 className="font-heading text-center text-2xl font-semibold text-white sm:text-3xl">
                                    Ready for the founder walkthrough?
                                </h3>
                                <p className="mt-2 max-w-md text-center text-sm text-slate-300">
                                    Click below to start the 3-minute narrated demo. Browsers require a click before playing audio — this unlocks it.
                                </p>
                                <button
                                    onClick={startDemo}
                                    data-testid="demo-start-with-voice"
                                    className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:bg-emerald-300"
                                >
                                    <Play size={14} /> Start Demo With Voice
                                </button>
                                {!supportsTTS && (
                                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                                        Narration not supported in this browser — visual demo only.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CTA */}
                    <div className="mt-12 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 text-center sm:p-10">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Stop watching · start building</p>
                        <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                            Build your business plan + first lead list in under 10 minutes.
                        </h3>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Link
                                to="/portal/builder"
                                data-testid="startup-demo-cta-builder"
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-emerald-300"
                            >
                                Open Business Builder <ArrowRight size={15} />
                            </Link>
                            <Link
                                to="/pricing"
                                data-testid="startup-demo-cta-pricing"
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-ink-900 px-5 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                            >
                                See Startup Pricing
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
