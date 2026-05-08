import { useEffect, useState, useMemo } from "react";

/**
 * useAdaptiveAvatarSrc · Iter 96+
 * --------------------------------------------------------------------
 * Detects slow / mobile network conditions via the Network Information
 * API (`navigator.connection`) and returns a `getResolvedSrc(originalSrc)`
 * function that swaps `/avatars/<group>/file.mp4` for
 * `/avatars/<group>/lite/file.mp4` when the network is slow AND a lite
 * variant actually exists.
 *
 * Decision matrix:
 *   · effectiveType `2g` / `slow-2g`     → use lite if available
 *   · effectiveType `3g`                  → use lite if available
 *   · `saveData === true` (Data Saver)    → use lite if available
 *   · effectiveType `4g` / unknown / desk → full quality
 *
 * Probe: on first call we HEAD-request the lite variant of the *first*
 * src we see. If 200 → enable lite swap for all subsequent srcs in the
 * same group. If 404 → stay on full quality, do not retry.
 *
 * No NetworkInformation API support? → full quality, silently.
 *
 * Returns:
 *   { mode: "full"|"lite", getResolvedSrc(src) → string }
 */

const SLOW_TYPES = new Set(["slow-2g", "2g", "3g"]);
const probeCache = new Map(); // dir → boolean (lite available?)

const getLitePath = (src) => {
    if (!src || typeof src !== "string") return null;
    const i = src.lastIndexOf("/");
    if (i < 0) return null;
    return `${src.slice(0, i)}/lite${src.slice(i)}`;
};

const isSlowConnection = () => {
    if (typeof navigator === "undefined") return false;
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    if (c.saveData === true) return true;
    if (c.effectiveType && SLOW_TYPES.has(c.effectiveType)) return true;
    return false;
};

export const useAdaptiveAvatarSrc = (firstSrc) => {
    // mode: "full" until we confirm both (a) the connection is slow and
    // (b) at least one lite variant exists. Then we flip to "lite".
    const [mode, setMode] = useState("full");

    useEffect(() => {
        let cancelled = false;
        if (!firstSrc) return undefined;
        if (!isSlowConnection()) return undefined;

        const lite = getLitePath(firstSrc);
        if (!lite) return undefined;
        const dirKey = lite.slice(0, lite.lastIndexOf("/"));

        // Cached probe result for this lite folder?
        if (probeCache.has(dirKey)) {
            if (probeCache.get(dirKey)) setMode("lite");
            return undefined;
        }

        // HEAD probe — small, cheap, lets us know if /lite/ folder exists
        fetch(lite, { method: "HEAD" })
            .then((r) => {
                if (cancelled) return;
                const ok = r.ok;
                probeCache.set(dirKey, ok);
                if (ok) setMode("lite");
            })
            .catch(() => {
                probeCache.set(dirKey, false);
            });

        return () => { cancelled = true; };
    }, [firstSrc]);

    const getResolvedSrc = useMemo(() => {
        return (src) => {
            if (mode !== "lite") return src;
            return getLitePath(src) || src;
        };
    }, [mode]);

    return { mode, getResolvedSrc };
};

export default useAdaptiveAvatarSrc;
