import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import {
    Rocket, FileText, TrendingUp, Banknote, Users, Mail, Sparkles,
    ArrowRight, Play, Pause, RotateCcw, CheckCircle2, MessageSquare, Building2,
    Volume2, VolumeX, Mic,
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
        title: "A targeted lead list — not a Lusha export",
        Icon: Users,
        kicker: "Scene 6 · The Customers",
        body: "ICP locked. Lead-list filter spec generated. Each lead routes through the Exclusive Lead Engine — locked to you, never duplicated, never resold.",
        chip: "ICP defined · 47 prospects assembled · all locked to founder",
        voiceover: "Now the customers. Your ideal customer profile is locked, and a targeted prospect list is generated. Every lead runs through the Exclusive Lead Engine — locked to you, never duplicated, never resold.",
    },
    {
        id: "scene-7",
        title: "Value-first outreach the avatar writes for you",
        Icon: Mail,
        kicker: "Scene 7 · The Outreach",
        body: "5-touch cadence. Day 0 force-reply. Day 1 bump. Day 3 proof point. Day 5 Loom offer. Day 8 polite close. Personalized to each prospect's industry + city.",
        chip: "5 emails drafted per lead · all in voice · ready to send",
        voiceover: "The avatar writes your outreach. A five-touch cadence, personalized to each prospect's industry and city. Day zero, day one, day three, day five, day eight — every email crafted in your voice, ready to send.",
    },
    {
        id: "scene-8",
        title: "Demo or offer page launched",
        Icon: Sparkles,
        kicker: "Scene 8 · The Conversion",
        body: "Soft-gated demo page captures email + company. The intent score auto-bumps. The Hot Leads button surfaces them in the Ops portal in real time.",
        chip: "First demo viewed · soft-gate triggered · prospect score 85",
        voiceover: "Each prospect lands on a soft-gated demo page. Their intent score climbs with every click and open. Hot leads surface in the Ops portal in real time, so you know exactly who to call next.",
    },
    {
        id: "scene-9",
        title: "Replies tracked. Engagement scored. Hot leads pinged.",
        Icon: CheckCircle2,
        kicker: "Scene 9 · The Signal",
        body: "Every reply gets AI-classified into interested / neutral / not-interested. Interested replies auto-create deals + send Calendly. Founder gets SMS within 60 seconds.",
        chip: "1 deal created · $2,800 pipeline · founder notified",
        voiceover: "Every reply is classified by AI — interested, neutral, or not interested. Interested replies automatically create a deal and send a Calendly link, and you receive a text message within sixty seconds. No reply gets missed.",
    },
    {
        id: "scene-10",
        title: "From win → client workspace · automatic",
        Icon: Building2,
        kicker: "Scene 10 · The Delivery",
        body: "Lead flips to won. Client account auto-created. 6-step checklist seeded. Magic link emailed. Delivery AI takes over. Zero manual handoff.",
        chip: "Client onboarded · workspace active · status: in_progress",
        voiceover: "Finally, when a deal closes, a client workspace is created automatically. A six-step delivery checklist is seeded, a magic link is emailed to your client, and Delivery AI takes over. Zero manual handoff. This is CreatorBoostAI — your business, fully operated.",
    },
];

const SCENE_MS = 18000;  // 18s per scene × 10 scenes = 180s (3 min)

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
