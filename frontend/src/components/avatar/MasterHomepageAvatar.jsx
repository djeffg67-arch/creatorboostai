import React, { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, ChevronRight, RotateCcw, Play, Pause } from "lucide-react";
import {
    installAvatarVoiceLock,
    uninstallAvatarVoiceLock,
} from "@/lib/avatarVoiceLock";

/**
 * MasterHomepageAvatar · Iter 100 · Single-video architecture rewrite
 * --------------------------------------------------------------------
 * Architecture per user spec (release blocker after 3 iterations of buffering
 * regressions on real laptop browsers):
 *
 *   1. ONE <video> element on the page at any time. NO hidden preloaders,
 *      no second <video>, no parallel decoders. Frees the OS to give 100%
 *      of decode/network bandwidth to the visible scene.
 *
 *   2. Strict scene-switch cleanup: pause → src=""→ load() → mount next.
 *      Done inside a single useEffect, so no leaked listeners or detached
 *      MediaSource buffers between transitions.
 *
 *   3. 2-second buffering watchdog (down from 9s). If the buffering overlay
 *      is shown for >2s: auto-retry once via v.load()+play(). If retry also
 *      fails to clear within 2s: skip to next scene OR fall back to a static
 *      poster if all 5 scenes have errored. Never permanent buffering.
 *
 *   4. Comprehensive event logging: every <video> event is logged with
 *      scene id, src basename, timestamp (ms since mount), readyState,
 *      networkState, currentTime, duration. Console-grouped under
 *      [avatar:event].
 *
 *   5. `?debugVideo=true` overlay: visible state inspector pinned to
 *      top-right of the player showing scene, readyState/networkState,
 *      buffering, last event, retry count, current src basename.
 *
 *   6. Tap-to-Start fallback (Iter 98) + persistent <video> identity for
 *      smooth scene transitions (Iter 96+) preserved.
 *
 * Five scenes: master-intro → command-center → security → execution-layer
 * → industries → loop. Auto-advance on `onEnded`.
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
const BUFFER_RETRY_MS = 2000;          // 2s — auto-retry boundary per user spec
const SCENE_LOAD_TIMEOUT_MS = 4000;    // 4s — hard ceiling before skipping scene
const MAX_RETRY_PER_SCENE = 1;         // retry once, then skip
const ALL_EVENTS = [
    "loadstart", "loadedmetadata", "loadeddata", "canplay", "canplaythrough",
    "play", "playing", "waiting", "stalled", "suspend", "pause", "timeupdate",
    "ended", "error", "abort", "emptied",
];

const isDebugMode = () => {
    if (typeof window === "undefined") return false;
    try {
        return new URLSearchParams(window.location.search).get("debugVideo") === "true";
    } catch {
        return false;
    }
};

const basename = (s) => (s || "").split("/").pop() || "";

export const MasterHomepageAvatar = ({ testId = "master-homepage-avatar" }) => {
    const [sceneIdx, setSceneIdx] = useState(0);
    const [muted, setMuted] = useState(() => {
        try {
            return localStorage.getItem(VOICE_LOCK_PERSIST_KEY) !== "false";
        } catch {
            return true;
        }
    });
    const [paused, setPaused] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const [tapFallback, setTapFallback] = useState(false);
    const [posterFallback, setPosterFallback] = useState(false);
    const [debugInfo, setDebugInfo] = useState({
        readyState: 0, networkState: 0, currentTime: 0, duration: 0,
        lastEvent: "—", retryCount: 0, src: "—",
    });

    const videoRef = useRef(null);
    const bufferTimerRef = useRef(null);
    const sceneTimerRef = useRef(null);
    const retryCountRef = useRef(0);
    const erroredScenesRef = useRef(new Set());
    const mountTimeRef = useRef(Date.now());
    const debugRef = useRef(isDebugMode());

    const scene = MASTER_SCENES[sceneIdx];
    const total = MASTER_SCENES.length;

    // ─── Comprehensive event logger ─────────────────────────────────────
    const logEvent = useCallback((label, extra = {}) => {
        const v = videoRef.current;
        const elapsed = Date.now() - mountTimeRef.current;
        const payload = {
            t: `+${elapsed}ms`,
            scene: scene.id,
            src: basename(scene.src),
            readyState: v?.readyState ?? "n/a",
            networkState: v?.networkState ?? "n/a",
            currentTime: v ? Number(v.currentTime.toFixed(2)) : "n/a",
            duration: v && !Number.isNaN(v.duration) ? Number(v.duration.toFixed(2)) : "n/a",
            paused: v?.paused ?? "n/a",
            muted: v?.muted ?? "n/a",
            retry: retryCountRef.current,
            ...extra,
        };
        console.debug(`[avatar:${label}]`, payload);
        if (debugRef.current) {
            setDebugInfo((d) => ({
                ...d,
                readyState: payload.readyState,
                networkState: payload.networkState,
                currentTime: payload.currentTime,
                duration: payload.duration,
                lastEvent: label,
                retryCount: retryCountRef.current,
                src: payload.src,
            }));
        }
    }, [scene.id, scene.src]);

    // ─── Timer helpers ──────────────────────────────────────────────────
    const clearBufferTimer = () => {
        if (bufferTimerRef.current) {
            window.clearTimeout(bufferTimerRef.current);
            bufferTimerRef.current = null;
        }
    };
    const clearSceneTimer = () => {
        if (sceneTimerRef.current) {
            window.clearTimeout(sceneTimerRef.current);
            sceneTimerRef.current = null;
        }
    };

    // ─── Scene navigation (defined early so handlers can reference them) ─
    const goToScene = useCallback((idx) => {
        retryCountRef.current = 0;
        setSceneIdx((idx + total) % total);
    }, [total]);
    const goNext = useCallback(() => goToScene(sceneIdx + 1), [goToScene, sceneIdx]);
    const goPrev = useCallback(() => goToScene(sceneIdx - 1), [goToScene, sceneIdx]);

    // ─── Robust play() — handles autoplay rejection with muted retry ────
    const tryPlay = useCallback(async () => {
        const v = videoRef.current;
        if (!v) return false;
        try {
            const p = v.play();
            if (p && typeof p.then === "function") await p;
            logEvent("play-resolved");
            return true;
        } catch (err) {
            logEvent("play-rejected", { err: String(err) });
            try {
                v.muted = true;
                setMuted(true);
                const p2 = v.play();
                if (p2 && typeof p2.then === "function") await p2;
                logEvent("play-resolved-muted");
                return true;
            } catch (err2) {
                logEvent("play-rejected-final", { err: String(err2) });
                setBuffering(false);
                setTapFallback(true);
                return false;
            }
        }
    }, [logEvent]);

    // ─── 2s buffer watchdog with retry-once-then-skip ───────────────────
    // When buffering overlay is shown, arm this. After BUFFER_RETRY_MS:
    //   · If retryCount < MAX_RETRY_PER_SCENE → v.load() + tryPlay()
    //   · Else → mark scene errored, advance OR fall back to poster
    const armBufferWatchdog = useCallback(() => {
        clearBufferTimer();
        bufferTimerRef.current = window.setTimeout(() => {
            const v = videoRef.current;
            if (!v) return;
            if (retryCountRef.current < MAX_RETRY_PER_SCENE) {
                retryCountRef.current += 1;
                logEvent("buffer-retry", { attempt: retryCountRef.current });
                try { v.load(); } catch { /* noop */ }
                tryPlay();
                // Re-arm watchdog for the retry attempt
                armBufferWatchdog();
            } else {
                // Retry exhausted → mark scene errored + skip
                erroredScenesRef.current.add(scene.id);
                logEvent("buffer-retry-exhausted-skip");
                setBuffering(false);
                if (erroredScenesRef.current.size >= total) {
                    // All scenes have failed → poster fallback
                    setPosterFallback(true);
                } else {
                    goNext();
                }
            }
        }, BUFFER_RETRY_MS);
    }, [logEvent, tryPlay, scene.id, total, goNext]);

    // ─── Voice lock ─────────────────────────────────────────────────────
    useEffect(() => {
        installAvatarVoiceLock();
        return () => { uninstallAvatarVoiceLock(); };
    }, []);

    // ─── Auto-unmute on first user gesture ──────────────────────────────
    useEffect(() => {
        if (!muted) return undefined;
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

    // ─── Main scene-lifecycle effect ────────────────────────────────────
    // Per spec: on scene change, pause → removeAttribute(src) → load() →
    // set new src → register listeners → play. ONE place owns the entire
    // lifecycle so there's no cross-effect race.
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return undefined;

        // ── Step 1: aggressive cleanup of previous scene ──
        try { v.pause(); } catch { /* noop */ }
        try { v.removeAttribute("src"); v.load(); } catch { /* noop */ }
        clearBufferTimer();
        clearSceneTimer();
        setBuffering(true);
        setTapFallback(false);
        setPaused(false);
        retryCountRef.current = 0;

        // ── Step 2: register all event listeners ──
        const handlers = {};
        ALL_EVENTS.forEach((evt) => {
            const handler = () => {
                logEvent(evt);
                // State updates per event:
                if (evt === "canplay" || evt === "canplaythrough" || evt === "loadeddata") {
                    clearBufferTimer();
                    clearSceneTimer();
                    setBuffering(false);
                    tryPlay();
                } else if (evt === "playing" || evt === "timeupdate") {
                    // Authoritative "video is making progress" signals
                    if (v.currentTime > 0 || evt === "playing") {
                        clearBufferTimer();
                        clearSceneTimer();
                        setBuffering(false);
                        setTapFallback(false);
                        setPaused(false);
                    }
                } else if (evt === "waiting" || evt === "stalled") {
                    setBuffering(true);
                    armBufferWatchdog();
                } else if (evt === "pause") {
                    setPaused(true);
                } else if (evt === "ended") {
                    goNext();
                } else if (evt === "error") {
                    erroredScenesRef.current.add(scene.id);
                    logEvent("error-skip");
                    setBuffering(false);
                    if (erroredScenesRef.current.size >= total) {
                        setPosterFallback(true);
                    } else {
                        window.setTimeout(() => goNext(), 600);
                    }
                }
            };
            handlers[evt] = handler;
            v.addEventListener(evt, handler);
        });

        // ── Step 3: set the new src and trigger load ──
        v.src = scene.src;
        v.poster = scene.poster;
        try { v.load(); } catch { /* noop */ }
        logEvent("scene-mounted");

        // ── Step 4: hard ceiling — if scene hasn't reported any progress
        // within SCENE_LOAD_TIMEOUT_MS, skip it (in addition to per-buffer
        // watchdog). Defends against missed events on flaky decoders. ──
        sceneTimerRef.current = window.setTimeout(() => {
            if (v.readyState < 2 /* HAVE_CURRENT_DATA */) {
                erroredScenesRef.current.add(scene.id);
                logEvent("scene-load-timeout-skip");
                if (erroredScenesRef.current.size >= total) {
                    setPosterFallback(true);
                } else {
                    goNext();
                }
            }
        }, SCENE_LOAD_TIMEOUT_MS);

        // ── Step 5: cleanup on unmount or next scene change ──
        return () => {
            ALL_EVENTS.forEach((evt) => {
                v.removeEventListener(evt, handlers[evt]);
            });
            clearBufferTimer();
            clearSceneTimer();
            // Aggressively release decoder resources
            try { v.pause(); } catch { /* noop */ }
            try { v.removeAttribute("src"); v.load(); } catch { /* noop */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneIdx]);

    // ─── Manual controls ────────────────────────────────────────────────
    const restart = () => goToScene(0);
    const togglePause = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { tryPlay(); } else { v.pause(); }
    };
    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        try { localStorage.setItem(VOICE_LOCK_PERSIST_KEY, next ? "true" : "false"); } catch { /* noop */ }
    };
    const handleTapToStart = async () => {
        setTapFallback(false);
        setBuffering(true);
        const v = videoRef.current;
        if (!v) return;
        try { v.load(); } catch { /* noop */ }
        await tryPlay();
    };
    const handlePosterRetry = () => {
        erroredScenesRef.current.clear();
        retryCountRef.current = 0;
        setPosterFallback(false);
        goToScene(0);
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
            data-buffering={buffering ? "true" : "false"}
            data-poster-fallback={posterFallback ? "true" : "false"}
        >
            <div className="relative h-full w-full overflow-hidden rounded-xl">
                {!posterFallback ? (
                    <video
                        ref={videoRef}
                        poster={scene.poster}
                        playsInline
                        autoPlay
                        muted={muted}
                        preload="metadata"
                        crossOrigin="anonymous"
                        className="h-full w-full animate-cb-scene-fade-in object-cover"
                        data-testid={`${testId}-video`}
                    />
                ) : (
                    <div
                        className="absolute inset-0 grid place-items-center bg-cover bg-center"
                        style={{ backgroundImage: `url('${scene.poster}')` }}
                        data-testid={`${testId}-poster-fallback`}
                    >
                        <div className="absolute inset-0 bg-ink-900/70 backdrop-blur-[2px]" />
                        <div className="relative flex flex-col items-center gap-3 px-6 text-center">
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-200">
                                Avatar unavailable
                            </span>
                            <p className="text-xs leading-relaxed text-slate-200 sm:text-sm">
                                We couldn't play the cinematic intro on your browser. Tap below to try again.
                            </p>
                            <button
                                type="button"
                                onClick={handlePosterRetry}
                                data-testid={`${testId}-poster-retry`}
                                className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-100 hover:bg-cyan-500/20"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

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

                {/* Buffering overlay (auto-hidden after BUFFER_RETRY_MS via watchdog) */}
                {buffering && !tapFallback && !posterFallback && (
                    <div
                        className="pointer-events-none absolute inset-0 grid place-items-center bg-ink-900/45 backdrop-blur-[2px]"
                        data-testid={`${testId}-buffering`}
                    >
                        <div className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-ink-900/85 px-3 py-1.5 backdrop-blur-md">
                            <span className="cb-buffer-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                                Buffering…
                            </span>
                        </div>
                    </div>
                )}

                {/* Tap-to-Start fallback overlay */}
                {tapFallback && !posterFallback && (
                    <button
                        type="button"
                        onClick={handleTapToStart}
                        data-testid={`${testId}-tap-to-start`}
                        className="absolute inset-0 grid place-items-center bg-ink-900/55 backdrop-blur-[2px] transition-opacity duration-300 hover:bg-ink-900/65"
                    >
                        <span className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/60 bg-ink-900/85 px-5 py-2.5 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400 text-ink-900">
                                <Play size={14} fill="currentColor" />
                            </span>
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                                Tap to Start
                            </span>
                        </span>
                    </button>
                )}

                {/* ?debugVideo=true overlay */}
                {debugRef.current && (
                    <div
                        className="pointer-events-none absolute right-2 bottom-14 max-w-[200px] rounded-md border border-amber-400/50 bg-ink-900/90 p-2 backdrop-blur-md font-mono text-[8px] leading-snug text-amber-200"
                        data-testid={`${testId}-debug-overlay`}
                    >
                        <div className="mb-1 font-bold uppercase tracking-[0.18em] text-amber-300">DEBUG</div>
                        <div>scene: {scene.id} ({sceneIdx + 1}/{total})</div>
                        <div>src: {debugInfo.src}</div>
                        <div>readyState: {String(debugInfo.readyState)}</div>
                        <div>networkState: {String(debugInfo.networkState)}</div>
                        <div>currentTime: {String(debugInfo.currentTime)}</div>
                        <div>duration: {String(debugInfo.duration)}</div>
                        <div>buffering: {String(buffering)}</div>
                        <div>tapFallback: {String(tapFallback)}</div>
                        <div>posterFallback: {String(posterFallback)}</div>
                        <div>retryCount: {String(debugInfo.retryCount)}</div>
                        <div>lastEvent: {debugInfo.lastEvent}</div>
                    </div>
                )}
            </div>

            {/* Scene-thumbnail rail */}
            {!fullscreen && (
                <div
                    className="mt-3 grid grid-cols-5 gap-1.5"
                    data-testid={`${testId}-thumb-rail`}
                >
                    {MASTER_SCENES.map((s, i) => {
                        const active = i === sceneIdx;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => goToScene(i)}
                                title={`Jump to Scene ${s.index} · ${s.title}`}
                                data-testid={`${testId}-thumb-${s.id}`}
                                className={`group relative aspect-video overflow-hidden rounded-md border transition-all ${
                                    active
                                        ? "border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-[0_0_18px_rgba(6,182,212,0.35)]"
                                        : "border-white/10 hover:border-cyan-500/40 opacity-60 hover:opacity-100"
                                }`}
                            >
                                <img
                                    src={s.poster}
                                    alt={s.title}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent" />
                                <span className={`absolute left-1 top-1 rounded bg-ink-900/75 px-1 py-px font-mono text-[8px] tracking-wider backdrop-blur ${active ? "text-cyan-300" : "text-slate-300"}`}>
                                    {s.index}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <style>{`
                @keyframes cb-scene-fade-in {
                    0%   { opacity: 0; transform: scale(1.015); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .animate-cb-scene-fade-in {
                    animation: cb-scene-fade-in 460ms ease-out both;
                }
                @keyframes cb-buffer-pulse {
                    0%, 100% { opacity: 0.40; transform: scale(0.85); }
                    50%      { opacity: 1;    transform: scale(1.10); }
                }
                .cb-buffer-dot {
                    animation: cb-buffer-pulse 1.1s ease-in-out infinite;
                    will-change: opacity, transform;
                }
            `}</style>
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
