/**
 * demoAudioFix.js
 * ---------------
 * Three small helpers used by every demo page to fix the audio bugs the user
 * reported:
 *
 *   • Demos stop mid-play  → audio onError now triggers advance + paused checks
 *                            read from a ref so timers see the freshest value.
 *   • Two voices on resume → hardSilence() cancels speechSynthesis + the
 *                            <audio> element together before any new scene.
 *   • Audio plays after closing → pagehide + beforeunload + visibilitychange
 *                                 + unmount all silence both engines.
 */
import { useEffect, useRef } from "react";

/** A ref that always mirrors the latest value of `value`. Lets timer
 *  callbacks read fresh state without re-creating the timer. */
export function useRefMirror(value) {
    const ref = useRef(value);
    useEffect(() => { ref.current = value; }, [value]);
    return ref;
}

/** Silences both the <audio> tag and speechSynthesis immediately. Safe to
 *  call repeatedly. */
export function hardSilence(audioRef) {
    const a = audioRef?.current;
    if (a) {
        try { a.pause(); } catch { /* noop */ }
        try { a.currentTime = 0; } catch { /* noop */ }
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }
}

/** Wires page-hide / before-unload / visibility-change / unmount cleanup so
 *  the demo never keeps talking after navigation or tab close. Pass the audio
 *  element ref + a ref that mirrors the audio-blob cache (for revoking URLs).
 */
export function useDemoCleanup(audioRef, audioCacheRef) {
    useEffect(() => {
        const fullStop = () => {
            const a = audioRef?.current;
            if (a) {
                try { a.pause(); } catch { /* noop */ }
                try { a.removeAttribute("src"); a.load(); } catch { /* noop */ }
            }
            if (typeof window !== "undefined" && window.speechSynthesis) {
                try { window.speechSynthesis.cancel(); } catch { /* noop */ }
            }
        };
        const onVis = () => { if (document.hidden) fullStop(); };
        if (typeof window !== "undefined") {
            window.addEventListener("pagehide", fullStop);
            window.addEventListener("beforeunload", fullStop);
            document.addEventListener("visibilitychange", onVis);
        }
        return () => {
            fullStop();
            try { Object.values(audioCacheRef?.current || {}).forEach(URL.revokeObjectURL); } catch { /* noop */ }
            if (typeof window !== "undefined") {
                window.removeEventListener("pagehide", fullStop);
                window.removeEventListener("beforeunload", fullStop);
                document.removeEventListener("visibilitychange", onVis);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
