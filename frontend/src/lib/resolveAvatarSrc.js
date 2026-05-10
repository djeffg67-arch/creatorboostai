/**
 * resolveAvatarSrc.js · Iter 102d
 * --------------------------------------------------------------------
 * Single source of truth for rewriting avatar MP4 / poster URLs through
 * an external CDN (jsDelivr / Cloudinary / R2 / etc.) when the env var
 * REACT_APP_AVATAR_CDN_BASE is set.
 *
 * Usage:
 *   import { resolveAvatarSrc } from "@/lib/resolveAvatarSrc";
 *   <video src={resolveAvatarSrc("/avatars/master/master-intro-opt.mp4")} />
 *
 * Behaviour:
 *   • REACT_APP_AVATAR_CDN_BASE unset  → returns the path unchanged
 *     (local dev pod serves /avatars/* files).
 *   • REACT_APP_AVATAR_CDN_BASE set    → prefixes the base.
 *     e.g. "/avatars/master/foo.mp4" with base
 *     "https://cdn.jsdelivr.net/gh/user/repo@main/frontend/public" becomes
 *     "https://cdn.jsdelivr.net/gh/user/repo@main/frontend/public/avatars/master/foo.mp4"
 *
 * Defensive notes:
 *   • Trailing slash on base is stripped to avoid // double-slashes.
 *   • Already-absolute URLs (http://, https://, //, data:, blob:) pass
 *     through unchanged so callers can mix CDN + non-CDN sources safely.
 */

const AVATAR_CDN_BASE = (process.env.REACT_APP_AVATAR_CDN_BASE || "")
    .trim()
    .replace(/\/$/, "");

const isAbsolute = (url) =>
    typeof url === "string" && /^(https?:|\/\/|data:|blob:)/i.test(url);

export function resolveAvatarSrc(relPath) {
    if (!relPath) return relPath;
    if (isAbsolute(relPath)) return relPath;
    if (!AVATAR_CDN_BASE) return relPath;
    // Ensure the path has a leading slash so the join is unambiguous.
    const path = relPath.startsWith("/") ? relPath : `/${relPath}`;
    return `${AVATAR_CDN_BASE}${path}`;
}

export const AVATAR_CDN_BASE_VALUE = AVATAR_CDN_BASE;
export const isUsingCdn = !!AVATAR_CDN_BASE;
