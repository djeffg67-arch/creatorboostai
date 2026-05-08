import React, { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, ChevronRight, RotateCcw, Play, Pause } from "lucide-react";
import {
    installAvatarVoiceLock,
    uninstallAvatarVoiceLock,
} from "@/lib/avatarVoiceLock";

/**
 * MasterHomepageAvatar
 * --------------------------------------------------------------
 * Iter 85 · Cinematic 5-scene avatar sequence shown on the homepage hero.
 *
 * Plays the user's HeyGen master clips in order, one at a time, with the
 * avatar's own audio active. Auto-advances on `onEnded`. Replays after
 * scene 5. Avatar voice-lock silences any legacy TTS/synth while playing.
 *
 *   Scene 1 · Master Intro            · master-intro.mp4
 *   Scene 2 · Command Center          · master-command-center.mp4
 *   Scene 3 · Security & Governance   · master-security.mp4
 *   Scene 4 · Execution Layer         · master-execution-layer.mp4
 *   Scene 5 · Industries / Startup    · master-industries.mp4
 *
 * The Realtor demo clip is intentionally NOT in this sequence — it lives
 * with the Realtor demo only.
 */

const MASTER_SCENES = [
    {
        id: "intro",
        index: 1,
        title: "Master Intro",
        src: "/avatars/master/master-intro-opt.mp4",
        poster: "/avatars/master/master-intro-poster.jpg",
        durationMs: 52120,
    },
    {
        id: "command-center",
        index: 2,
        title: "Command Center",
        src: "/avatars/master/master-command-center-opt.mp4",
        poster: "/avatars/master/master-command-center-poster.jpg",
        durationMs: 36040,
    },
    {
        id: "security",
        index: 3,
        title: "Security & Governance",
        src: "/avatars/master/master-security-opt.mp4",
        poster: "/avatars/master/master-security-poster.jpg",
        durationMs: 42040,
    },
    {
        id: "execution-layer",
        index: 4,
        title: "Execution Layer",
        src: "/avatars/master/master-execution-layer-opt.mp4",
        poster: "/avatars/master/master-execution-layer-poster.jpg",
        durationMs: 124200,
    },
    {
        id: "industries",
        index: 5,
        title: "Industries · Startup · Sales Reps",
        src: "/avatars/master/master-industries-opt.mp4",
        poster: "/avatars/master/master-industries-poster.jpg",
        durationMs: 30520,
    },
];

const VOICE_LOCK_PERSIST_KEY = "cb_avatar_voice_enabled";

export const MasterHomepageAvatar = ({ testId = "master-homepage-avatar" }) => {
    const [sceneIdx, setSceneIdx] = useState(0);
    const [muted, setMuted] = useState(() => {
        try {
            const persisted = localStorage.getItem(VOICE_LOCK_PERSIST_KEY);
            return persisted === "false"; // user previously enabled audio → mount unmuted
        } catch {
            return true;
        }
    });
    const [paused, setPaused] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [errored, setErrored] = useState(false);
    const videoRef = useRef(null);

    const scene = MASTER_SCENES[sceneIdx];
    const total = MASTER_SCENES.length;

    // Install avatar voice lock for the lifetime of this component so legacy
    // TTS / SpeechSynthesis cannot overlap with the avatar's own audio track.
    useEffect(() => {
        installAvatarVoiceLock();
        return () => {
            uninstallAvatarVoiceLock();
        };
    }, []);

    // Auto-unmute on the first user gesture anywhere on the page (one shot).
    useEffect(() => {
        if (!muted) return;
        const unlock = () => {
            setMuted(false);
            try { localStorage.setItem(VOICE_LOCK_PERSIST_KEY, "false"); } catch { /* noop */ }
        };
        const opts = { once: true, capture: true, passive: true };
        document.addEventListener("click", unlock, opts);
        document.addEventListener("touchstart", unlock, opts);
        document.addEventListener("keydown", unlock, opts);
        return () => {
            document.removeEventListener("click", unlock, opts);
            document.removeEventListener("touchstart", unlock, opts);
            document.removeEventListener("keydown", unlock, opts);
        };
    }, [muted]);

    // Restart playback from start whenever the scene changes.
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        try {
            v.currentTime = 0;
            v.play().catch(() => { /* autoplay may be blocked until gesture */ });
        } catch { /* noop */ }
    }, [sceneIdx]);

    const goNext = () => setSceneIdx((i) => (i + 1) % total);
    const goPrev = () => setSceneIdx((i) => (i - 1 + total) % total);
    const restart = () => {
        setSceneIdx(0);
        const v = videoRef.current;
        if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    };
    const togglePause = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play().catch(() => {}); setPaused(false); }
        else { v.pause(); setPaused(true); }
    };
    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        try { localStorage.setItem(VOICE_LOCK_PERSIST_KEY, next ? "true" : "false"); } catch { /* noop */ }
    };

    const onEnded = () => {
        // Auto-advance to next scene; loop back to scene 1 after the final.
        goNext();
    };

    const onError = () => {
        // Optimized clip failed → auto-skip to next scene after a brief beat
        // so the sequence never gets stuck on a single asset.
        setErrored(true);
        window.setTimeout(() => {
            setErrored(false);
            goNext();
        }, 1500);
    };

    const containerClass = fullscreen
        ? "fixed inset-0 z-[9999] bg-ink-900 flex items-center justify-center p-4"
        : "relative w-full max-w-[420px] aspect-[9/16] overflow-hidden rounded-xl border border-cyan-500/30 bg-ink-900 shadow-[0_0_60px_rgba(6,182,212,0.18)]";

    return (
        <div
            className={containerClass}
            data-testid={testId}
            data-scene-index={sceneIdx}
            data-scene-id={scene.id}
            data-paused={paused ? "true" : "false"}
            data-muted={muted ? "true" : "false"}
        >
            <div className="relative h-full w-full overflow-hidden rounded-xl">
                <video
                    key={scene.src} /* force remount on src change for clean transition */
                    ref={videoRef}
                    src={scene.src}
                    poster={scene.poster}
                    autoPlay
                    playsInline
                    muted={muted}
                    preload="metadata"
                    onEnded={onEnded}
                    onError={onError}
                    onPlay={() => setPaused(false)}
                    onPause={() => setPaused(true)}
                    className="h-full w-full object-cover"
                    data-testid={`${testId}-video`}
                />

                {/* Top chip — scene title + index */}
                <div className="pointer-events-none absolute left-3 top-3 right-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-ink-900/70 px-2.5 py-1 backdrop-blur-md">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300" data-testid={`${testId}-scene-chip`}>
                            Scene {scene.index} of {total} · {scene.title}
                        </span>
                    </div>
                </div>

                {/* Bottom scene label band */}
                <div className="pointer-events-none absolute bottom-12 left-3 right-3 rounded-md border border-white/10 bg-ink-900/65 p-2.5 backdrop-blur-md">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                        Master Experience · Cinematic Sequence
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{scene.title}</p>
                </div>

                {/* Scene progress strip */}
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center gap-1.5">
                    {MASTER_SCENES.map((s, i) => (
                        <span
                            key={s.id}
                            data-testid={`${testId}-progress-dot-${i}`}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                i === sceneIdx
                                    ? "bg-cyan-400"
                                    : i < sceneIdx
                                        ? "bg-cyan-700"
                                        : "bg-white/15"
                            }`}
                        />
                    ))}
                </div>

                {/* Right-side control rail */}
                <div className="absolute right-2 top-12 flex flex-col gap-1.5">
                    <ControlBtn onClick={toggleMute} testid={`${testId}-mute`} title={muted ? "Unmute" : "Mute"}>
                        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </ControlBtn>
                    <ControlBtn onClick={togglePause} testid={`${testId}-pause`} title={paused ? "Play" : "Pause"}>
                        {paused ? <Play size={13} /> : <Pause size={13} />}
                    </ControlBtn>
                    <ControlBtn onClick={restart} testid={`${testId}-restart`} title="Restart from scene 1">
                        <RotateCcw size={13} />
                    </ControlBtn>
                    <ControlBtn onClick={() => setFullscreen((f) => !f)} testid={`${testId}-fullscreen`} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
                        {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </ControlBtn>
                </div>

                {/* Prev / Next scene jumpers */}
                <div className="absolute left-2 top-12 flex flex-col gap-1.5">
                    <ControlBtn onClick={goPrev} testid={`${testId}-prev`} title="Previous scene">
                        <ChevronRight size={13} className="rotate-180" />
                    </ControlBtn>
                    <ControlBtn onClick={goNext} testid={`${testId}-next`} title="Next scene">
                        <ChevronRight size={13} />
                    </ControlBtn>
                </div>

                {errored && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-20 mx-auto w-fit rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-center backdrop-blur-md">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">
                            Scene {scene.index} unavailable · skipping…
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ControlBtn = ({ children, onClick, testid, title }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        data-testid={testid}
        className="grid h-7 w-7 place-items-center rounded-md border border-white/15 bg-ink-900/75 text-slate-200 backdrop-blur-md transition-all hover:border-cyan-500/40 hover:text-cyan-300"
    >
        {children}
    </button>
);

export default MasterHomepageAvatar;
