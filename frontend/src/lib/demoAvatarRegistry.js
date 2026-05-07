/**
 * Demo Avatar Registry
 * --------------------------------------------------------------
 * Single source of truth that maps a demo + scene to a specific
 * HeyGen avatar clip. The cinematic ExecutiveAvatar reads this on
 * every scene change to choose which video to play.
 *
 * Today: every demo falls back to the two universal HeyGen exports
 * (cb-executive-intro + avatar-video). When per-scene exports land,
 * just drop them into /app/frontend/public/avatars/<demo>/<sceneId>.mp4
 * and add an entry under `scenes` here — no component changes needed.
 *
 * Schema:
 *
 *   demoKey: {
 *     fallback: {                 // used when scene has no explicit clip
 *       desktop:        string,   // primary desktop clip (with audio)
 *       mobile:         string,   // mobile/lighter clip
 *       loop:           string,   // muted-loop clip for hero/standby
 *       poster:         string,   // first-frame fallback (desktop)
 *       posterMobile:   string,   // first-frame fallback (mobile)
 *     },
 *     scenes: {
 *       [sceneId]: {
 *         desktop?:  string,
 *         mobile?:   string,
 *         poster?:   string,
 *         posterMobile?: string,
 *         durationMs?: number,    // optional override for auto-progression
 *       },
 *     },
 *   }
 */

const DEFAULT_FALLBACK = {
    desktop: "/avatars/avatar-desktop-opt.mp4",
    mobile: "/avatars/avatar-mobile-opt.mp4",
    loop: "/avatars/avatar-hero-loop.mp4",
    poster: "/avatars/poster-desktop.jpg",
    posterMobile: "/avatars/poster-mobile.jpg",
};

export const DEMO_AVATAR_REGISTRY = {
    homepage: {
        fallback: DEFAULT_FALLBACK,
        scenes: {}, // hero uses loop only
    },
    supermarket: {
        fallback: DEFAULT_FALLBACK,
        // per-scene HeyGen clips drop in here, keyed by SCENE.id
        scenes: {
            // "opening": { desktop: "/avatars/supermarket/opening.mp4", ... },
            // "money-saving": { ... },
        },
    },
    airport: {
        fallback: DEFAULT_FALLBACK,
        scenes: {},
    },
    school: {
        fallback: DEFAULT_FALLBACK,
        scenes: {},
    },
    startup: {
        fallback: DEFAULT_FALLBACK,
        scenes: {},
    },
    noldus: {
        fallback: DEFAULT_FALLBACK,
        scenes: {},
    },
    realtor: {
        fallback: DEFAULT_FALLBACK,
        scenes: {},
    },
};

/**
 * Resolve the avatar source set for a (demo, sceneId, platform) tuple.
 * Always returns a fully-populated object (poster + src) — never undefined.
 */
export const resolveAvatarSources = (
    demoKey,
    sceneId,
    platform = "desktop",
) => {
    const demo = DEMO_AVATAR_REGISTRY[demoKey];
    const fb = demo?.fallback || DEFAULT_FALLBACK;
    const sceneEntry = sceneId ? demo?.scenes?.[sceneId] : null;

    const isMobile = platform === "mobile";
    const src =
        (isMobile ? sceneEntry?.mobile : sceneEntry?.desktop) ||
        (isMobile ? fb.mobile : fb.desktop);
    const poster =
        (isMobile ? sceneEntry?.posterMobile : sceneEntry?.poster) ||
        (isMobile ? fb.posterMobile : fb.poster);

    return {
        src,
        poster,
        loopSrc: fb.loop,
        durationMs: sceneEntry?.durationMs || null,
        hasSceneClip: Boolean(
            isMobile ? sceneEntry?.mobile : sceneEntry?.desktop,
        ),
    };
};
