import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Play, Pause, Volume2, VolumeX, RotateCcw, ArrowRight, ArrowLeft,
    Sparkles, MessageCircle, ChevronRight, Activity, Layers, Building2,
} from "lucide-react";
import { INDUSTRY_CHIPS } from "@/lib/hookDemos";

// Voice picker — same female-leaning logic used in StartupDemoPage.jsx
const FEMALE_VOICE_HINTS = [
    "samantha", "victoria", "tessa", "karen", "moira", "fiona",
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
        const m = pool.find((v) => (v.name || "").toLowerCase().includes(hint));
        if (m) return m;
    }
    return pool[0] || null;
};

const ACCENT_MAP = {
    cyan:    { ring: "ring-cyan-400/50",    text: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/40",    glow: "shadow-[0_0_30px_rgba(6,182,212,0.35)]" },
    emerald: { ring: "ring-emerald-400/50", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40", glow: "shadow-[0_0_30px_rgba(16,185,129,0.35)]" },
};

/* ──────────────── Player ──────────────── */
export default function HookDemoPlayer({ demo }) {
    const navigate = useNavigate();
    const accent = ACCENT_MAP[demo?.accent || "cyan"];

    const [started, setStarted] = useState(false);
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [supportsTTS, setSupportsTTS] = useState(true);
    const [actionsVisible, setActionsVisible] = useState([]);   // current frame's revealed action IDs
    const voiceRef = useRef(null);
    const utterRef = useRef(null);
    const advanceTimerRef = useRef(null);
    const actionTimersRef = useRef([]);

    const frames = demo?.frames || [];
    const frame = frames[idx] || null;
    const totalMs = useMemo(() => frames.reduce((s, f) => s + (f.durationMs || 8000), 0), [frames]);

    // Init voices.
    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            setSupportsTTS(false);
            return;
        }
        const load = () => {
            const v = window.speechSynthesis.getVoices();
            const picked = pickFemaleVoice(v);
            if (picked) voiceRef.current = picked;
        };
        load();
        window.speechSynthesis.addEventListener("voiceschanged", load);
        return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }, []);

    const stopSpeech = useCallback(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
        utterRef.current = null;
    }, []);

    const speak = useCallback((text) => {
        if (!supportsTTS || muted || !text) return;
        stopSpeech();
        try {
            const u = new window.SpeechSynthesisUtterance(text);
            u.rate = 1.02;
            u.pitch = 1.05;
            u.volume = 1.0;
            if (voiceRef.current) u.voice = voiceRef.current;
            else {
                const picked = pickFemaleVoice(window.speechSynthesis.getVoices());
                if (picked) { u.voice = picked; voiceRef.current = picked; }
            }
            utterRef.current = u;
            window.speechSynthesis.speak(u);
        } catch { /* noop */ }
    }, [muted, supportsTTS, stopSpeech]);

    // Reveal action chips in sequence within the current frame.
    const stageActions = useCallback((f) => {
        actionTimersRef.current.forEach((t) => clearTimeout(t));
        actionTimersRef.current = [];
        setActionsVisible([]);
        const acts = f?.actions || [];
        if (acts.length === 0) return;
        // Spread reveals across ~70% of frame duration.
        const span = Math.max((f.durationMs || 8000) * 0.7, 1200);
        const step = Math.max(span / acts.length, 600);
        acts.forEach((a, i) => {
            const t = setTimeout(() => setActionsVisible((prev) => [...prev, a]), step * (i + 1));
            actionTimersRef.current.push(t);
        });
    }, []);

    // Advance timer per frame. Final frame holds.
    useEffect(() => {
        if (!started || !playing || !frame) return;
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        if (frame.isFinal) return;
        advanceTimerRef.current = setTimeout(() => {
            setIdx((i) => (i + 1 < frames.length ? i + 1 : i));
        }, frame.durationMs || 8000);
        return () => clearTimeout(advanceTimerRef.current);
    }, [started, playing, idx, frame, frames.length]);

    // When frame changes, narrate + stage action reveals.
    useEffect(() => {
        if (!started || !frame) return;
        if (playing && !muted) speak(frame.voiceover);
        stageActions(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, started]);

    useEffect(() => () => {
        stopSpeech();
        actionTimersRef.current.forEach((t) => clearTimeout(t));
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    }, [stopSpeech]);

    const start = () => {
        // Warm utterance to unlock iOS Safari + some Chrome configs.
        if (supportsTTS) {
            try {
                const warm = new window.SpeechSynthesisUtterance(" ");
                warm.volume = 0;
                window.speechSynthesis.speak(warm);
            } catch { /* noop */ }
        }
        setStarted(true);
        setPlaying(true);
        setIdx(0);
        setTimeout(() => speak(frames[0]?.voiceover), 150);
        stageActions(frames[0]);
    };

    const togglePlay = () => {
        if (!started) { start(); return; }
        setPlaying((p) => {
            const next = !p;
            if (!next) stopSpeech();
            else if (frame) speak(frame.voiceover);
            return next;
        });
    };

    const replay = () => {
        stopSpeech();
        setIdx(0);
        setStarted(true);
        setPlaying(true);
        setTimeout(() => speak(frames[0]?.voiceover), 100);
        stageActions(frames[0]);
    };

    const toggleMute = () => {
        setMuted((m) => {
            const next = !m;
            if (next) stopSpeech();
            else if (started && playing && frame) speak(frame.voiceover);
            return next;
        });
    };

    const goToFrame = (i) => {
        if (i < 0 || i >= frames.length) return;
        stopSpeech();
        setIdx(i);
        if (started && playing && !muted) setTimeout(() => speak(frames[i].voiceover), 80);
        stageActions(frames[i]);
    };

    if (!demo || !frame) {
        return (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-6 text-rose-300" data-testid="hook-player-error">
                Hook demo not available.
            </div>
        );
    }

    const progressPct = started
        ? Math.round(100 * (frames.slice(0, idx).reduce((s, f) => s + (f.durationMs || 8000), 0) + (frame.durationMs || 8000) / 2) / totalMs)
        : 0;

    return (
        <div className={`relative overflow-hidden rounded-xl border ${accent.border} bg-ink-900 ${accent.glow}`} data-testid="hook-demo-player">
            {/* Backdrop sheen + grain */}
            <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.05),_transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 -z-0 opacity-[0.04]"
                 style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")" }} />

            {/* Header chrome */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-5 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 animate-pulse rounded-full ${frame.phase === "PAIN" ? "bg-rose-400" : frame.phase === "FINAL" ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accent.text}`} data-testid="hook-phase-label">
                        {frame.phase || "FRAME"} · {String(idx + 1).padStart(2, "0")}/{String(frames.length).padStart(2, "0")}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={toggleMute} disabled={!supportsTTS}
                        data-testid="hook-toggle-mute"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300 disabled:opacity-50">
                        {muted ? <><VolumeX size={11} /> Unmute</> : <><Volume2 size={11} /> Mute</>}
                    </button>
                    <button onClick={togglePlay}
                        data-testid="hook-toggle-play"
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] ${started && playing ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : `${accent.border} ${accent.bg} ${accent.text}`}`}>
                        {!started ? <><Play size={11} fill="currentColor" /> Start</> : playing ? <><Pause size={11} /> Pause</> : <><Play size={11} fill="currentColor" /> Play</>}
                    </button>
                    {started && (
                        <button onClick={replay}
                            data-testid="hook-replay"
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300">
                            <RotateCcw size={11} /> Replay
                        </button>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-0.5 w-full bg-white/5">
                <div
                    className={`absolute left-0 top-0 h-full ${frame.phase === "PAIN" ? "bg-rose-400" : frame.phase === "FINAL" ? "bg-amber-400" : "bg-emerald-400"} transition-all duration-700`}
                    style={{ width: `${started ? progressPct : 0}%` }}
                    data-testid="hook-progress-fill"
                />
            </div>

            {/* Stage */}
            <div className="relative z-10 grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[1fr,320px]">
                {/* Left · narrative + metrics */}
                <div className="min-h-[320px]">
                    <div className="fade-in-up" key={`eye-${frame.id}`} data-testid="hook-frame-eyebrow">
                        <span className={`inline-flex items-center gap-1 rounded-full border ${accent.border} ${accent.bg} px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] ${accent.text}`}>
                            <Activity size={10} /> {frame.eyebrow}
                        </span>
                    </div>
                    <h2 key={`hd-${frame.id}`}
                        className="font-heading mt-3 text-balance text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl fade-in-up"
                        data-testid="hook-frame-headline">
                        {frame.headline}
                    </h2>
                    {frame.subline && (
                        <p key={`sl-${frame.id}`} className="mt-3 max-w-xl text-base leading-relaxed text-slate-300 fade-in-up"
                            data-testid="hook-frame-subline">
                            {frame.subline}
                        </p>
                    )}

                    {/* Stack chips · positioning frames */}
                    {Array.isArray(frame.stackChips) && frame.stackChips.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-1.5" data-testid="hook-stack-chips">
                            {frame.stackChips.map((c) => (
                                <span key={c} className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">
                                    {c}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Final-frame CTAs */}
                    {frame.isFinal && (
                        <FinalCtaRow demo={demo} navigate={navigate} accent={accent} />
                    )}
                </div>

                {/* Right · metrics + live action stream */}
                <div className="space-y-3">
                    {/* Metrics */}
                    {Array.isArray(frame.metrics) && frame.metrics.length > 0 && (
                        <div className="grid grid-cols-1 gap-2" data-testid="hook-metrics">
                            {frame.metrics.map((m) => (
                                <MetricTile key={m.label} label={m.label} value={m.value} accent={m.accent} />
                            ))}
                        </div>
                    )}
                    {/* Action ID stream */}
                    <div className="rounded-md border border-white/10 bg-ink-700/40 p-3" data-testid="hook-action-stream">
                        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Action ID stream</p>
                        <div className="mt-2 space-y-1.5">
                            {actionsVisible.length === 0 ? (
                                <p className="font-mono text-[10px] text-slate-500" data-testid="hook-action-empty">
                                    {started ? "Awaiting agent moves…" : "Press Start to begin"}
                                </p>
                            ) : (
                                actionsVisible.map((a) => (
                                    <div key={a.id} data-testid={`hook-action-${a.id}`}
                                        className="flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 font-mono text-[10px] text-emerald-200 fade-in-up">
                                        <ChevronRight size={10} className="text-emerald-300" />
                                        <span className="text-emerald-300">{a.id}</span>
                                        <span className="truncate text-slate-200">{a.label}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    {/* Avatar tag */}
                    {demo.avatar_intro && (
                        <div className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 font-mono text-[10px] text-slate-400">
                            <Sparkles size={11} className={accent.text} />
                            <span>Narrated by {demo.avatar_intro}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Frame nav scrubber (bottom) */}
            <div className="relative z-10 flex items-center justify-between gap-3 border-t border-white/5 bg-black/30 px-5 py-2.5 sm:px-6">
                <button onClick={() => goToFrame(idx - 1)} disabled={idx === 0}
                    data-testid="hook-prev-frame"
                    className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 hover:text-cyan-300 disabled:opacity-40">
                    <ArrowLeft size={11} /> Prev
                </button>
                <div className="flex flex-1 items-center justify-center gap-1.5">
                    {frames.map((f, i) => (
                        <button key={f.id} onClick={() => goToFrame(i)}
                            data-testid={`hook-frame-dot-${i}`}
                            aria-label={`Jump to frame ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${i === idx ? `w-6 ${accent.bg.replace("/10", "")}` : "w-1.5 bg-white/15 hover:bg-white/30"}`} />
                    ))}
                </div>
                <button onClick={() => goToFrame(idx + 1)} disabled={idx === frames.length - 1}
                    data-testid="hook-next-frame"
                    className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 hover:text-cyan-300 disabled:opacity-40">
                    Next <ArrowRight size={11} />
                </button>
            </div>
        </div>
    );
}

/* ──────── Sub-components ──────── */
const ACCENT_TEXT = {
    rose: "text-rose-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
};
const ACCENT_BORDER = {
    rose: "border-rose-500/30 bg-rose-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    cyan: "border-cyan-500/30 bg-cyan-500/5",
};

const MetricTile = ({ label, value, accent = "cyan" }) => {
    const tone = ACCENT_TEXT[accent] || ACCENT_TEXT.cyan;
    const box = ACCENT_BORDER[accent] || ACCENT_BORDER.cyan;
    return (
        <div className={`rounded-md border ${box} px-3 py-2 transition-all`} data-testid={`hook-metric-${(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className={`font-heading mt-0.5 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
        </div>
    );
};

const FinalCtaRow = ({ demo, navigate, accent }) => (
    <div className="mt-6 space-y-3" data-testid="hook-final-ctas">
        <button
            onClick={() => navigate(demo.full_walkthrough_path)}
            data-testid="hook-cta-watch-walkthrough"
            className={`group inline-flex w-full items-center justify-between gap-2 rounded-md ${accent.bg} ${accent.border} border px-5 py-3.5 text-left transition-all hover:bg-white/10`}>
            <span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-slate-300">Layer 2 · Industry walkthrough</span>
                <span className={`mt-0.5 block font-heading text-lg font-semibold ${accent.text}`}>
                    Watch the full walkthrough
                </span>
                <span className="block text-xs text-slate-400">{demo.full_walkthrough_label}</span>
            </span>
            <ArrowRight size={18} className={`${accent.text} transition-transform group-hover:translate-x-1`} />
        </button>

        <button
            onClick={() => navigate(demo.executive_path)}
            data-testid="hook-cta-executive"
            className="group inline-flex w-full items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-5 py-3 text-left transition-all hover:border-cyan-500/40 hover:bg-cyan-500/[0.05]">
            <span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Layer 3 · Executive deep dive</span>
                <span className="mt-0.5 block font-heading text-base font-semibold text-white">
                    Enterprise architecture · governance · audit trail
                </span>
            </span>
            <ChevronRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300" />
        </button>

        <div className="flex flex-wrap gap-2" data-testid="hook-final-tail">
            <button
                onClick={() => navigate("/demo")}
                data-testid="hook-cta-switch-industry"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                <Layers size={11} /> Switch industry
            </button>
            <button
                onClick={() => navigate("/contact")}
                data-testid="hook-cta-talk-ai"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 hover:text-cyan-300">
                <MessageCircle size={11} /> Talk to AI assistant
            </button>
        </div>
    </div>
);

/* ──────── Behind-the-Scenes panel ──────── */
export const BehindTheScenes = ({ demo }) => {
    const accent = ACCENT_MAP[demo?.accent || "cyan"];
    const items = demo?.behind_scenes || [];
    if (items.length === 0) return null;
    return (
        <div className={`mt-6 rounded-xl border ${accent.border} bg-ink-900/80 p-5 sm:p-6`} data-testid="behind-the-scenes">
            <div className="flex items-center gap-2">
                <Building2 size={14} className={accent.text} />
                <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accent.text}`}>See what CreatorBoostAI did behind the scenes</p>
            </div>
            <h3 className="font-heading mt-2 text-2xl font-semibold text-white">
                Every move. Every Action ID. Every system touched.
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((it) => (
                    <div key={it.id} data-testid={`bts-${it.id}`}
                        className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-cyan-500/30">
                        <div className="flex items-start gap-2">
                            <span className={`mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${accent.bg.replace("/10", "")}`} />
                            <div className="min-w-0">
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{it.id} · {it.lane}</p>
                                <p className="mt-0.5 text-sm text-slate-200">{it.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ──────── Industry chip strip · used on homepage hero & post-demo switch ──────── */
export const IndustryChipRow = ({ activeId, testId = "industry-chips", className = "" }) => {
    const navigate = useNavigate();
    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`} data-testid={testId}>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 self-center">I run a:</span>
            {INDUSTRY_CHIPS.map((c) => {
                const active = c.id === activeId;
                const target = c.hookReady ? `/demo/quick/${c.id}` : c.fallback;
                return (
                    <button
                        key={c.id}
                        onClick={() => navigate(target)}
                        data-testid={`industry-chip-${c.id}`}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${
                            active
                                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                                : "border-white/10 bg-ink-900 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                        }`}>
                        {c.label}
                        {c.hookReady && <span className="rounded-sm bg-emerald-400/20 px-1 text-[8px] tracking-[0.18em] text-emerald-300">60s</span>}
                    </button>
                );
            })}
        </div>
    );
};
