import React, { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, ChevronRight, RotateCcw, Play, Pause } from "lucide-react";
import {
    installAvatarVoiceLock,
    uninstallAvatarVoiceLock,
} from "@/lib/avatarVoiceLock";
import { useAdaptiveAvatarSrc } from "./useAdaptiveAvatarSrc";

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

// iOS / Safari mobile detection. iOS only allows ONE active <video> decoder
// per page — mounting a hidden preloader video competes with the visible one
// for that slot and can leave the visible video stuck in `BUFFERING…` forever
// (the symptom the user reported on iPhone). On mobile we therefore:
//   · do NOT render the hidden preloader
//   · use preload="metadata" instead of "auto" (less aggressive, faster TTFP)
//   · drop the stall-watchdog from 9s → 5s
//   · fall back to a Tap-to-Play button after 3s of buffering instead of an
//     infinite spinner
const detectMobile = () => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/i.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 1024;
    return isIOS || isAndroid || isSmallScreen;
};

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
    const [buffering, setBuffering] = useState(false);
    // tapFallback: after TAP_FALLBACK_MS of buffering, hide the overlay and
    // surface a "Tap to Start" button so the user is NEVER stuck in an
    // infinite loading state on iOS Safari.
    const [tapFallback, setTapFallback] = useState(false);
    // Stable mobile flag (computed once on mount). Don't recompute on every
    // render — would cause the preloader video to mount/unmount, which itself
    // would compete for the iOS decoder slot.
    const [isMobile] = useState(detectMobile);
    const videoRef = useRef(null);
    // Hidden preloader for the *next* scene so its bytes are already in the
    // browser cache by the time we switch the visible <video>'s src.
    // Desktop only — on mobile this is null and the second <video> is not
    // rendered at all (see iOS single-decoder note above).
    const preloadRef = useRef(null);
    // Stall watchdog id; if buffering > STALL_TIMEOUT_MS we skip to next scene
    const stallTimerRef = useRef(null);
    // Tap-fallback watchdog id; if buffering > TAP_FALLBACK_MS we surface
    // the manual Tap-to-Play UI.
    const tapTimerRef = useRef(null);
    // Tracks the in-flight transition: on scene change we set src, then wait
    // for canplay before invoking play(). play() called before then races.
    const pendingPlayRef = useRef(false);

    const scene = MASTER_SCENES[sceneIdx];
    const total = MASTER_SCENES.length;
    const nextScene = MASTER_SCENES[(sceneIdx + 1) % total];

    const STALL_TIMEOUT_MS = isMobile ? 5000 : 9000;
    const TAP_FALLBACK_MS = 3000;

    // Adaptive streaming — swap to /lite/ variants on slow / mobile networks
    // when (a) navigator.connection reports 2g/3g/saveData and (b) the lite
    // variant actually exists. HEAD-probed once on mount.
    const { mode: adaptiveMode, getResolvedSrc } = useAdaptiveAvatarSrc(MASTER_SCENES[0].src);
    const visibleSrc = getResolvedSrc(scene.src);
    const preloadSrc = getResolvedSrc(nextScene.src);

    // Diagnostic logger — gated to console.debug so it doesn't spam prod logs
    // but is visible when DevTools is open + verbose logging on. Helps diagnose
    // mobile Safari readyState / networkState behavior.
    const logMediaState = (label, extra = {}) => {
        const v = videoRef.current;
        if (!v) return;
        try {
            // eslint-disable-next-line no-console
            console.debug(`[avatar:${label}]`, {
                sceneIdx,
                isMobile,
                readyState: v.readyState,
                networkState: v.networkState,
                currentTime: v.currentTime,
                paused: v.paused,
                muted: v.muted,
                src: (v.currentSrc || v.src || "").split("/").pop(),
                ...extra,
            });
        } catch { /* noop */ }
    };

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
    // Single persistent <video> element — we let React update the src
    // attribute (no `key` prop = no remount = no decoder teardown). Then we
    // pause, mark "want to play once data is ready", and the canplay handler
    // below will call .play() in lockstep with the audio decoder.
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        try {
            try { v.pause(); } catch { /* noop */ }
            // The video element will start fetching the new src as soon as
            // React updates the attribute on render. We just need to wait
            // for canplay before invoking play(), which prevents the racy
            // "audio plays, video frozen" pattern on slow connections.
            pendingPlayRef.current = true;
            setBuffering(true);
            setTapFallback(false);
            logMediaState("scene-change");
            // Safety net: after 800ms re-check the video state. If the new
            // src has already buffered enough (browser cached it from the
            // hidden preloader on desktop), readyState>=2 and we should
            // clear the buffering overlay even if `canplay`/`loadeddata`
            // already fired before this effect committed React state.
            const safetyId = window.setTimeout(() => {
                if (v.readyState >= 2) {
                    setBuffering(false);
                    if (pendingPlayRef.current) {
                        pendingPlayRef.current = false;
                        tryPlay();
                    }
                }
            }, 800);
            return () => window.clearTimeout(safetyId);
        } catch { /* noop */ }
        return undefined;
        // logMediaState/tryPlay intentionally not in dep list — they read
        // refs and we only want this effect to fire on sceneIdx change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneIdx]);

    // Robust play() — handles autoplay-policy rejections gracefully. Returns
    // a promise that resolves true on success or false if the browser refused
    // to autoplay (e.g., audio-without-gesture on iOS). On rejection we force
    // muted=true and retry once — that's the canonical iOS Safari recovery
    // path. If even the muted retry fails we surface the Tap-to-Start UI.
    const tryPlay = async () => {
        const v = videoRef.current;
        if (!v) return false;
        try {
            const p = v.play();
            if (p && typeof p.then === "function") {
                await p;
            }
            logMediaState("play-resolved");
            return true;
        } catch (err) {
            logMediaState("play-rejected", { err: String(err) });
            // Retry muted — Safari blocks autoplay-with-sound until gesture
            try {
                v.muted = true;
                setMuted(true);
                const p2 = v.play();
                if (p2 && typeof p2.then === "function") {
                    await p2;
                }
                logMediaState("play-resolved-muted-retry");
                return true;
            } catch (err2) {
                logMediaState("play-rejected-after-retry", { err: String(err2) });
                // Surface the Tap-to-Start fallback UI
                setBuffering(false);
                setTapFallback(true);
                return false;
            }
        }
    };

    // ─── Visible video event listeners (single registration) ────────────
    // Kept as one effect to avoid the dance of attach/detach on every render.
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return undefined;

        const clearStall = () => {
            if (stallTimerRef.current) {
                window.clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
        };
        const clearTap = () => {
            if (tapTimerRef.current) {
                window.clearTimeout(tapTimerRef.current);
                tapTimerRef.current = null;
            }
        };

        const armStall = () => {
            clearStall();
            stallTimerRef.current = window.setTimeout(() => {
                // After STALL_TIMEOUT_MS of buffering, skip rather than freeze
                logMediaState("stall-watchdog-fired");
                setErrored(true);
                window.setTimeout(() => {
                    setErrored(false);
                    setSceneIdx((i) => (i + 1) % total);
                }, 800);
            }, STALL_TIMEOUT_MS);
        };

        const armTapFallback = () => {
            clearTap();
            tapTimerRef.current = window.setTimeout(() => {
                logMediaState("tap-fallback-fired");
                // Hide the buffering overlay and reveal the Tap-to-Start CTA
                // — never allow infinite buffering on iOS / Safari.
                setBuffering(false);
                setTapFallback(true);
            }, TAP_FALLBACK_MS);
        };

        // Both `canplay` (W3C standard) and `loadeddata` (Safari fires this
        // more reliably on iOS) are listened to so we don't deadlock if one
        // event is suppressed by the browser.
        const onReady = () => {
            logMediaState("ready");
            setBuffering(false);
            clearStall();
            clearTap();
            if (pendingPlayRef.current) {
                pendingPlayRef.current = false;
                tryPlay();
            }
        };
        const onWaiting  = () => { logMediaState("waiting"); setBuffering(true);  armStall(); armTapFallback(); };
        const onStalled  = () => { logMediaState("stalled"); setBuffering(true);  armStall(); armTapFallback(); };
        const onPlaying  = () => {
            logMediaState("playing");
            setBuffering(false);
            setTapFallback(false);
            clearStall();
            clearTap();
            setPaused(false);
        };
        // `timeupdate` is the authoritative "video is making progress" signal.
        // If currentTime advances, by definition the video is playing and the
        // buffering overlay must NOT be visible. This is the safety net for
        // the bug where `play` / `playing` events fired before React attached
        // the listener (autoplay starts decoding immediately on mount, but
        // the listener-effect runs only after the first paint).
        let lastSeenTime = -1;
        const onTimeUpdate = () => {
            const t = v.currentTime;
            if (t > lastSeenTime + 0.05) {
                lastSeenTime = t;
                // Progress is happening — force-clear any stale buffering UI
                setBuffering(false);
                setTapFallback(false);
                clearStall();
                clearTap();
            }
        };
        // `play` fires the moment .play() is invoked or autoplay kicks in,
        // BEFORE the first frame may have decoded. We still treat it as
        // "playback intent confirmed" so we hide the spinner optimistically.
        const onPlay = () => {
            logMediaState("play");
            setPaused(false);
        };

        v.addEventListener("canplay",      onReady);
        v.addEventListener("loadeddata",   onReady);
        v.addEventListener("waiting",      onWaiting);
        v.addEventListener("stalled",      onStalled);
        v.addEventListener("playing",      onPlaying);
        v.addEventListener("play",         onPlay);
        v.addEventListener("timeupdate",   onTimeUpdate);

        // Sync from the video element's current state — if `canplay` /
        // `playing` already fired BEFORE we attached the listener (very
        // common with autoplay videos because the browser starts decoding
        // immediately on mount but our useEffect runs after first paint),
        // we'd be stuck with `buffering=true` forever despite the video
        // actually playing. This explicit sync catches that race.
        if (v.readyState >= 2 /* HAVE_CURRENT_DATA */) {
            // Defer one tick so React has a chance to commit the initial
            // setBuffering(true) from scene-change effect before we clear it.
            window.setTimeout(() => {
                if (v.readyState >= 2) {
                    setBuffering(false);
                    if (pendingPlayRef.current) {
                        pendingPlayRef.current = false;
                        tryPlay();
                    }
                }
                if (!v.paused) {
                    setBuffering(false);
                    setTapFallback(false);
                    clearTap();
                }
            }, 0);
        }

        // Arm tap fallback for the very first scene too — if loadeddata never
        // fires on iOS we'll still surface the manual play after 3s.
        armTapFallback();

        return () => {
            v.removeEventListener("canplay",    onReady);
            v.removeEventListener("loadeddata", onReady);
            v.removeEventListener("waiting",    onWaiting);
            v.removeEventListener("stalled",    onStalled);
            v.removeEventListener("playing",    onPlaying);
            v.removeEventListener("play",       onPlay);
            v.removeEventListener("timeupdate", onTimeUpdate);
            clearStall();
            clearTap();
        };
        // STALL_TIMEOUT_MS / TAP_FALLBACK_MS are stable per-mount; total never changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    // Handler for the manual Tap-to-Start button. User gesture is the
    // strongest possible autoplay unlocker on iOS Safari.
    const handleTapToStart = async () => {
        setTapFallback(false);
        setBuffering(true);
        const v = videoRef.current;
        if (!v) return;
        try { v.load(); } catch { /* noop */ }
        // Inside the gesture handler, retrying play() is much more likely
        // to succeed than the original autoplay attempt.
        await tryPlay();
    };

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
                    ref={videoRef}
                    src={visibleSrc}
                    poster={scene.poster}
                    playsInline
                    autoPlay
                    muted={muted}
                    preload={isMobile ? "metadata" : "auto"}
                    onEnded={onEnded}
                    onError={onError}
                    onPlay={() => setPaused(false)}
                    onPause={() => setPaused(true)}
                    className="h-full w-full animate-cb-scene-fade-in object-cover"
                    data-testid={`${testId}-video`}
                    data-adaptive-mode={adaptiveMode}
                    data-is-mobile={isMobile ? "true" : "false"}
                />
                {/* Hidden preloader for the next scene so its bytes are already
                    in the cache by the time we switch the visible <video>'s
                    src. DESKTOP ONLY — iOS allows only ONE active video
                    decoder per page; rendering this on mobile competes with
                    the visible video for the decoder slot and can leave the
                    visible one stuck in BUFFERING forever. */}
                {!isMobile && (
                    <video
                        ref={preloadRef}
                        src={preloadSrc}
                        preload="auto"
                        muted
                        playsInline
                        aria-hidden="true"
                        tabIndex={-1}
                        className="absolute h-px w-px opacity-0 pointer-events-none"
                        data-testid={`${testId}-preload-video`}
                    />
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

                {errored && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-20 mx-auto w-fit rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-center backdrop-blur-md">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">
                            Scene {scene.index} unavailable · skipping…
                        </p>
                    </div>
                )}

                {/* Buffering overlay — shown while the player is waiting for
                    enough data to keep playback in sync. Subtle dark wash +
                    spinner so the user knows it's not a hang. Auto-hidden
                    after TAP_FALLBACK_MS when the Tap-to-Start CTA appears. */}
                {buffering && !errored && !tapFallback && (
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

                {/* Tap-to-Start fallback — shown when autoplay is blocked OR
                    buffering exceeds TAP_FALLBACK_MS. iOS Safari frequently
                    refuses to autoplay videos with audio without a user
                    gesture; rather than leave the user staring at a buffering
                    spinner, we surface a clear, premium CTA they can tap.
                    A user gesture is the strongest possible autoplay
                    unlocker — `tryPlay()` from inside this onClick handler
                    almost always succeeds. */}
                {tapFallback && !errored && (
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
            </div>

            {/* Scene-thumbnail rail (outside the framed video, below it) */}
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
                                onClick={() => setSceneIdx(i)}
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

            {/* Cinematic fade-in animation for scene transitions */}
            <style>{`
                @keyframes cb-scene-fade-in {
                    0%   { opacity: 0; transform: scale(1.015); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .animate-cb-scene-fade-in {
                    animation: cb-scene-fade-in 460ms ease-out both;
                }
                /* Subtle pulse for buffering dot */
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
