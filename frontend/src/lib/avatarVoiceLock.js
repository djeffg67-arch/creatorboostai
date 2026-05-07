/**
 * avatarVoiceLock.js
 * --------------------------------------------------------------
 * When a cinematic ExecutiveAvatar is mounted, the HeyGen avatar
 * IS the voice. We don't want the legacy demo narration (OpenAI
 * sage TTS via /api/tts/speak) or the Web Speech fallback talking
 * over (or under) it.
 *
 * This module installs two patches when an avatar mounts:
 *
 *   1) Replaces window.speechSynthesis.speak with a no-op
 *      (utterances tagged `__cb_broadcast = true` still pass through
 *      so BroadcastFeed alerts can keep narrating high-signal events).
 *
 *   2) Replaces window.fetch for `/tts/speak` requests so demo
 *      pages can't fetch new TTS blobs while the avatar is active.
 *
 *   3) Mutes + pauses any <audio> element currently in the DOM
 *      so already-playing TTS stops immediately.
 *
 * Use a refcount so multiple avatars across the page share one lock.
 */

let refcount = 0;
let originalSpeak = null;
let originalFetch = null;

const isTTSUrl = (url) => {
    if (!url) return false;
    const s = typeof url === "string" ? url : url.url || "";
    return s.includes("/tts/speak");
};

export function installAvatarVoiceLock() {
    if (typeof window === "undefined") return;
    refcount += 1;
    if (refcount > 1) return; // already installed

    // 1) speechSynthesis.speak — drop legacy utterances
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = function (u) {
            if (u && u.__cb_broadcast) {
                return originalSpeak(u);
            }
            try {
                if (typeof u?.onstart === "function") {
                    setTimeout(() => { try { u.onstart({}); } catch { /* noop */ } }, 0);
                }
                if (typeof u?.onend === "function") {
                    setTimeout(() => { try { u.onend({}); } catch { /* noop */ } }, 250);
                }
            } catch { /* noop */ }
        };
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }

    // 2) fetch — block /tts/speak so demos can't prefetch sage TTS
    if (window.fetch) {
        originalFetch = window.fetch.bind(window);
        window.fetch = function (url, opts) {
            if (isTTSUrl(url)) {
                // Reject so the demo's catch{} branch falls through cleanly
                return Promise.reject(new Error("avatar-voice-lock-active"));
            }
            return originalFetch(url, opts);
        };
    }

    // 3) Mute + pause any in-flight <audio> elements
    try {
        document.querySelectorAll("audio").forEach((a) => {
            try { a.muted = true; } catch { /* noop */ }
            try { a.pause(); } catch { /* noop */ }
        });
    } catch { /* noop */ }
}

export function uninstallAvatarVoiceLock() {
    if (typeof window === "undefined") return;
    refcount = Math.max(0, refcount - 1);
    if (refcount > 0) return;

    if (originalSpeak && window.speechSynthesis) {
        window.speechSynthesis.speak = originalSpeak;
        originalSpeak = null;
    }
    if (originalFetch) {
        window.fetch = originalFetch;
        originalFetch = null;
    }
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}

export const isAvatarVoiceLocked = () => refcount > 0;
