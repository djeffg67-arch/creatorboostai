import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react";
import { Volume2, VolumeX, Play, Pause, Maximize2, X } from "lucide-react";
import { resolveAvatarSources } from "@/lib/demoAvatarRegistry";

/**
 * ExecutiveAvatar
 * --------------------------------------------------------------
 * Modular HeyGen-driven AI Executive Operator video layer.
 *
 * Three asset variants ship under /avatars (public dir):
 *   • avatar-desktop-opt.mp4   — 1080x1920 · audio · ~8.5MB · primary desktop
 *   • avatar-mobile-opt.mp4    — 720x1280  · audio · ~1.9MB · mobile / fallback
 *   • avatar-hero-loop.mp4     — 720x1280  · NO audio · ~1.9MB · hero autoplay
 *
 * Variants this component ships:
 *
 *   variant="hero"            full-screen-feel cinematic loop in the homepage
 *                             hero. Muted autoplay (browser-safe). Click to
 *                             unmute + restart.
 *   variant="demo"            floating side-panel avatar inside cinematic
 *                             demos. Plays the desktop-opt version with audio.
 *   variant="onboarding"      compact greeting tile.
 *   variant="announcement"    inline strip with poster-only until tapped.
 *
 * Performance:
 *   - Lazy-mounted via IntersectionObserver — the <video> element is not
 *     attached to the DOM until the host enters the viewport.
 *   - preload="metadata" only when ready (not "auto") to keep CPU low.
 *   - Mobile breakpoint (≤768px) auto-swaps to the lighter mobile asset.
 *   - Posters supplied so the layout never CLS-flickers.
 *   - All controls progressive-enhance — works without JS heavy-lifting.
 *
 * Future hooks (kept modular):
 *   - onEnded callback for chaining ("AI is now executing" announcement).
 *   - sourceOverride prop accepts a custom desktop+mobile pair so we can
 *     later wire per-industry HeyGen exports.
 *   - exposes ref via avatarRef to enable real-time conversation /
 *     voice-interaction layers later.
 */

const DEFAULT_SOURCES = {
    heroLoop: "/avatars/avatar-hero-loop.mp4",
    desktop: "/avatars/avatar-desktop-opt.mp4",
    mobile: "/avatars/avatar-mobile-opt.mp4",
    posterDesktop: "/avatars/poster-desktop.jpg",
    posterMobile: "/avatars/poster-mobile.jpg",
};

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(max-width: 768px)").matches;
    });
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mql = window.matchMedia("(max-width: 768px)");
        const onChange = (e) => setIsMobile(e.matches);
        mql.addEventListener?.("change", onChange);
        return () => mql.removeEventListener?.("change", onChange);
    }, []);
    return isMobile;
};

const useInView = (rootMargin = "200px") => {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") {
            setInView(true);
            return;
        }
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) setInView(true);
                });
            },
            { rootMargin, threshold: 0.1 },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [rootMargin]);
    return [ref, inView];
};

const variantConfig = {
    hero: {
        loopVideo: true,
        defaultMuted: true,
        autoplay: true,
        showFullscreen: true,
        wrapperClass:
            "relative aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-[0_20px_80px_-20px_rgba(6,182,212,0.35)]",
        chipText: "AI Executive Operator · Live",
        chipAccent: "cyan",
    },
    demo: {
        loopVideo: false,
        defaultMuted: false,
        autoplay: true,
        showFullscreen: false,
        wrapperClass:
            "relative aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-xl border border-cyan-500/30 bg-ink-900 shadow-[0_10px_40px_-15px_rgba(6,182,212,0.4)]",
        chipText: "Avatar narration",
        chipAccent: "cyan",
    },
    onboarding: {
        loopVideo: false,
        defaultMuted: false,
        autoplay: true,
        showFullscreen: false,
        wrapperClass:
            "relative aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-xl border border-white/10 bg-ink-900",
        chipText: "Welcome briefing",
        chipAccent: "cyan",
    },
    announcement: {
        loopVideo: false,
        defaultMuted: true,
        autoplay: false,
        showFullscreen: false,
        wrapperClass:
            "relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-lg border border-cyan-500/30 bg-ink-900",
        chipText: "Action announcement",
        chipAccent: "cyan",
    },
    "demo-cinematic": {
        loopVideo: true,            // loop the avatar visually while TTS owns audio
        defaultMuted: true,         // muted (TTS is the audio source)
        autoplay: true,
        showFullscreen: true,
        wrapperClass:
            "relative aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-xl border border-cyan-500/40 bg-ink-900 shadow-[0_20px_60px_-20px_rgba(6,182,212,0.5)]",
        chipText: "AI Executive · Cinematic Briefing",
        chipAccent: "cyan",
    },
};

const accentClasses = {
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
};

export const ExecutiveAvatar = ({
    variant = "hero",
    sources: sourcesOverride,
    chipText: chipTextOverride,
    chipAccent: chipAccentOverride,
    autoUnmute = false,
    loop: loopOverride,
    onEnded,
    onPlay,
    className = "",
    testId = "executive-avatar",
    forcePlatform = null, // "desktop" | "mobile" | null
    // ------- demo-cinematic specific props (ignored by other variants) -------
    registry = null,        // demo key, e.g. "supermarket" — looks up demoAvatarRegistry
    sceneId = null,         // current scene id (for per-scene clip lookup)
    sceneIndex = 0,         // numeric scene index (for chip + crossfade key)
    sceneCount = 0,         // total scene count
    sceneLabel = "",        // optional human label for chip
    paused = false,         // pause state from the demo
    speaking = false,       // TTS is firing now
    onSceneEnd = null,      // optional callback when avatar's scene clip ends
}) => {
    const cfg = variantConfig[variant] || variantConfig.hero;
    const isMobile = useIsMobile();
    const platform =
        forcePlatform || (isMobile ? "mobile" : "desktop");

    const sources = useMemo(
        () => ({ ...DEFAULT_SOURCES, ...(sourcesOverride || {}) }),
        [sourcesOverride],
    );

    // ------------------------------------------------------------------
    // Source resolution
    //   • hero  → muted hero loop
    //   • demo-cinematic → consult registry → per-scene clip if present,
    //     else demo's fallback desktop/mobile clip
    //   • everything else → desktop or mobile clip
    // ------------------------------------------------------------------
    const cinematic = variant === "demo-cinematic";
    const cinematicSources = useMemo(() => {
        if (!cinematic || !registry) return null;
        return resolveAvatarSources(registry, sceneId, platform);
    }, [cinematic, registry, sceneId, platform]);

    // When a per-scene HeyGen clip is registered, switch from looping
    // ambient avatar to play-once-and-fire-onSceneEnd. That makes the
    // avatar the natural driver of scene progression (the demo's
    // narration timing follows the executive, not a hard timer).
    const cinematicHasSceneClip = Boolean(cinematic && cinematicSources?.hasSceneClip);

    const videoSrc = useMemo(() => {
        if (cinematic && cinematicSources) {
            // For cinematic mode we prefer the rich (with-audio) clip but render it muted —
            // Web Speech still drives the audio. If a scene-specific clip exists we use it,
            // else the loop variant gives a clean ambient feel.
            return cinematicSources.hasSceneClip
                ? cinematicSources.src
                : sources.heroLoop;
        }
        if (cfg.loopVideo && variant === "hero") return sources.heroLoop;
        if (platform === "mobile") return sources.mobile;
        return sources.desktop;
    }, [
        cinematic,
        cinematicSources,
        cfg.loopVideo,
        variant,
        platform,
        sources,
    ]);

    const poster =
        cinematic && cinematicSources
            ? cinematicSources.poster
            : platform === "mobile"
              ? sources.posterMobile
              : sources.posterDesktop;

    const [hostRef, inView] = useInView("250px");
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(cfg.defaultMuted && !autoUnmute);
    const [playing, setPlaying] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [crossfade, setCrossfade] = useState(true); // visible by default

    const loop =
        loopOverride !== undefined
            ? loopOverride
            : cinematicHasSceneClip
              ? false
              : cfg.loopVideo;

    const safePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        const p = v.play();
        if (p && typeof p.catch === "function") {
            p.catch(() => {
                // autoplay blocked — keep poster + a play button visible
                setPlaying(false);
            });
        }
    }, []);

    // attempt autoplay once mounted + in view
    useEffect(() => {
        if (!inView) return;
        if (!cfg.autoplay) return;
        const t = setTimeout(safePlay, 80);
        return () => clearTimeout(t);
    }, [inView, cfg.autoplay, safePlay, videoSrc]);

    // ------------------------------------------------------------------
    // Cinematic scene synchronization
    //   • paused prop → video.pause() / play()
    //   • scene change → 280ms opacity crossfade
    //   • the <video key> already remounts on src change so the fade
    //     hides the load flicker
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!cinematic) return;
        const v = videoRef.current;
        if (!v) return;
        if (paused) {
            v.pause();
        } else if (inView) {
            safePlay();
        }
    }, [cinematic, paused, inView, safePlay]);

    useEffect(() => {
        if (!cinematic) return;
        // Trigger crossfade out → swap → fade in. The src swap is driven
        // by React `key={videoSrc}` so we just animate opacity.
        setCrossfade(false);
        const t = setTimeout(() => setCrossfade(true), 80);
        return () => clearTimeout(t);
    }, [cinematic, sceneIndex, videoSrc]);

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) safePlay();
        else v.pause();
    };

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
        if (!v.muted && v.paused) safePlay();
    };

    // Dynamic chip text in cinematic mode reflects live narration state
    const dynamicChip = useMemo(() => {
        if (!cinematic) return chipTextOverride || cfg.chipText;
        if (paused) return `Paused · Scene ${sceneIndex + 1}`;
        if (speaking)
            return `Live · Scene ${sceneIndex + 1}${sceneCount ? ` of ${sceneCount}` : ""}`;
        return `Standing by · Scene ${sceneIndex + 1}${sceneCount ? ` of ${sceneCount}` : ""}`;
    }, [
        cinematic,
        chipTextOverride,
        cfg.chipText,
        paused,
        speaking,
        sceneIndex,
        sceneCount,
    ]);

    const chipText = dynamicChip;
    const chipAccent =
        accentClasses[chipAccentOverride || cfg.chipAccent] ||
        accentClasses.cyan;

    return (
        <>
            <div
                ref={hostRef}
                data-testid={testId}
                data-variant={variant}
                data-platform={platform}
                data-scene-index={cinematic ? sceneIndex : undefined}
                data-speaking={cinematic ? String(speaking) : undefined}
                data-paused={cinematic ? String(paused) : undefined}
                className={`group ${cfg.wrapperClass} ${className}`}
            >
                {/* Poster baseline (always rendered as fallback) */}
                <img
                    src={poster}
                    alt="AI Executive Operator"
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                />

                {/* Cinematic gradient overlays */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent" />

                {/* Lazy video element */}
                {inView && (
                    <video
                        ref={videoRef}
                        key={videoSrc}
                        src={videoSrc}
                        poster={poster}
                        muted={muted}
                        loop={loop}
                        playsInline
                        preload="metadata"
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                            cinematic && !crossfade ? "opacity-0" : "opacity-100"
                        }`}
                        onPlay={() => {
                            setPlaying(true);
                            onPlay?.();
                        }}
                        onPause={() => setPlaying(false)}
                        onEnded={() => {
                            setPlaying(false);
                            onEnded?.();
                            // Only drive scene progression when:
                            //  • we're in cinematic mode
                            //  • a real per-scene HeyGen clip is bound
                            //    (else the universal loop would prematurely advance)
                            //  • the demo isn't paused
                            if (cinematic && cinematicHasSceneClip && !paused) {
                                onSceneEnd?.();
                            }
                        }}
                        data-testid={`${testId}-video`}
                    />
                )}

                {/* Status chip */}
                <div
                    className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] backdrop-blur-md ${chipAccent}`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full bg-current ${
                            playing ? "animate-pulse" : "opacity-60"
                        }`}
                    />
                    {chipText}
                </div>

                {/* Cinematic scene progress strip */}
                {cinematic && sceneCount > 0 && (
                    <div
                        className="pointer-events-none absolute right-3 top-3 flex items-center gap-1"
                        data-testid={`${testId}-scene-strip`}
                    >
                        {Array.from({ length: sceneCount }).map((_, i) => (
                            <span
                                key={i}
                                className={`h-1 w-3 rounded-full transition-all duration-300 ${
                                    i < sceneIndex
                                        ? "bg-cyan-400/80"
                                        : i === sceneIndex
                                          ? "bg-cyan-300"
                                          : "bg-white/20"
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* Optional scene label band */}
                {cinematic && sceneLabel && (
                    <div
                        className="pointer-events-none absolute inset-x-3 bottom-14 rounded-md border border-white/10 bg-ink-900/80 px-2.5 py-1.5 backdrop-blur-md"
                        data-testid={`${testId}-scene-label`}
                    >
                        <p className="truncate font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                            Scene {sceneIndex + 1}
                            {sceneCount ? ` / ${sceneCount}` : ""}
                        </p>
                        <p className="truncate text-[11px] text-white">
                            {sceneLabel}
                        </p>
                    </div>
                )}

                {/* Controls */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 opacity-90">
                    <button
                        type="button"
                        onClick={togglePlay}
                        data-testid={`${testId}-play-toggle`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-ink-900/80 text-white backdrop-blur-md transition-all hover:border-cyan-400/60 hover:text-cyan-300"
                        aria-label={playing ? "Pause" : "Play"}
                    >
                        {playing ? (
                            <Pause size={14} />
                        ) : (
                            <Play size={14} fill="currentColor" />
                        )}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleMute}
                            data-testid={`${testId}-mute-toggle`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-ink-900/80 text-white backdrop-blur-md transition-all hover:border-cyan-400/60 hover:text-cyan-300"
                            aria-label={muted ? "Unmute" : "Mute"}
                        >
                            {muted ? (
                                <VolumeX size={14} />
                            ) : (
                                <Volume2 size={14} />
                            )}
                        </button>
                        {cfg.showFullscreen && (
                            <button
                                type="button"
                                onClick={() => setShowFullscreen(true)}
                                data-testid={`${testId}-fullscreen`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-ink-900/80 text-white backdrop-blur-md transition-all hover:border-cyan-400/60 hover:text-cyan-300"
                                aria-label="Open full briefing"
                            >
                                <Maximize2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Fullscreen briefing modal — uses the desktop-opt asset with audio */}
            {showFullscreen && (
                <FullscreenBriefing
                    src={sources.desktop}
                    poster={sources.posterDesktop}
                    onClose={() => setShowFullscreen(false)}
                />
            )}
        </>
    );
};

const FullscreenBriefing = ({ src, poster, onClose }) => {
    const ref = useRef(null);
    useEffect(() => {
        ref.current?.play?.().catch(() => {});
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/95 backdrop-blur-md"
            data-testid="executive-avatar-briefing"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <button
                type="button"
                onClick={onClose}
                data-testid="executive-avatar-briefing-close"
                aria-label="Close briefing"
                className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-ink-900/80 text-white transition-all hover:border-cyan-400/60 hover:text-cyan-300"
            >
                <X size={16} />
            </button>
            <video
                ref={ref}
                src={src}
                poster={poster}
                controls
                playsInline
                className="max-h-[92vh] w-auto max-w-[92vw] rounded-xl border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

/* -----------------------------------------------------------------
 * Compact strip — used inline next to action announcements.
 * --------------------------------------------------------------- */
export const AvatarAnnouncementStrip = ({
    title = "AI is now executing",
    subtitle = "Action ID logged · Sovereign Vault updated",
    accent = "cyan",
    testId = "avatar-announcement-strip",
    href,
}) => {
    const Wrapper = href ? "a" : "div";
    const accentRing = {
        cyan: "border-cyan-500/40 bg-cyan-500/5",
        amber: "border-amber-500/40 bg-amber-500/5",
        emerald: "border-emerald-500/40 bg-emerald-500/5",
    }[accent];
    return (
        <Wrapper
            href={href}
            data-testid={testId}
            className={`flex items-center gap-3 rounded-md border ${accentRing} p-2.5 transition-all hover:translate-y-[-1px]`}
        >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-white/10">
                <ExecutiveAvatar
                    variant="announcement"
                    autoUnmute={false}
                    testId={`${testId}-avatar`}
                />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    {title}
                </p>
                <p className="truncate text-xs text-slate-300">
                    {subtitle}
                </p>
            </div>
        </Wrapper>
    );
};

export default ExecutiveAvatar;
