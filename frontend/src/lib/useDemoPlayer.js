/**
 * useDemoPlayer.js
 * ----------------
 * One audio engine. Shared by all 5 demo pages.
 *
 * Fixes the three bugs the user reported:
 *
 *   1) Demos stop mid-play.
 *      - `<audio onError>` was never wired up — blob/network errors fell through
 *        the cracks. We now listen for `error` and advance immediately.
 *      - The "max" safety timer captured `paused` in a stale closure. We now
 *        read paused/muted via refs so timers always see fresh state.
 *
 *   2) Two voices on pause/resume.
 *      - speakScene() previously only paused the <audio> element; if speech
 *        synthesis was active (audio cache miss path), the previous utterance
 *        kept talking while the new one started. We now cancel both engines
 *        unconditionally before each new scene.
 *      - The mute toggle could race speakScene() with a still-playing utterance.
 *        We now flush both engines first, then start the new scene.
 *
 *   3) Audio still talking after closing the site.
 *      - Component-unmount cleanup was correct, but pagehide / beforeunload /
 *        tab-hidden weren't covered for some Safari/iOS scenarios. We now
 *        listen for those too and forcibly silence both engines.
 *      - On unmount we also clear `audioRef.current.src` and call `.load()` to
 *        release the underlying buffer.
 *
 * Public API kept identical to the original inline code so demo pages only
 * change the imports + replace the inline state machine block.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const SCENE_GAP_MS_DEFAULT = 800;

export function useDemoPlayer({ scenes, demoTypeLabel = "demo", sceneGapMs = SCENE_GAP_MS_DEFAULT, avatarMode = false }) {
    const [started, setStarted] = useState(false);
    const [scene, setScene] = useState(0);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [audioCache, setAudioCache] = useState({});
    const [prefetching, setPrefetching] = useState(false);
    const [prefetchProgress, setPrefetchProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [sceneElapsed, setSceneElapsed] = useState(0);

    const audioRef = useRef(null);
    const advanceTimer = useRef(null);
    const maxTimer = useRef(null);
    const tickTimer = useRef(null);
    const sceneStart = useRef(0);

    // Refs that always hold the freshest values for timer callbacks
    const pausedRef = useRef(false);
    const mutedRef = useRef(false);
    const avatarModeRef = useRef(false);
    const audioCacheRef = useRef({});
    useEffect(() => { pausedRef.current = paused; }, [paused]);
    useEffect(() => { mutedRef.current = muted; }, [muted]);
    useEffect(() => { avatarModeRef.current = avatarMode; }, [avatarMode]);
    useEffect(() => { audioCacheRef.current = audioCache; }, [audioCache]);

    const total = scenes.length;
    const current = scenes[scene];
    const totalRuntimeMs = useMemo(
        () => scenes.reduce((a, s) => a + (s.fallback_ms || 40000), 0),
        [scenes]
    );
    const elapsedBeforeScene = useMemo(
        () => scenes.slice(0, scene).reduce((a, s) => a + (s.fallback_ms || 40000), 0),
        [scenes, scene]
    );
    const overallProgress = Math.min(
        100,
        Math.round(((elapsedBeforeScene + sceneElapsed) / totalRuntimeMs) * 100)
    );

    const apiBase = useMemo(() => `${process.env.REACT_APP_BACKEND_URL || ""}/api`, []);

    // ------------------------------------------------------------------
    // Hard silence — always called before starting a new scene OR on cleanup
    // ------------------------------------------------------------------
    const hardSilence = useCallback(() => {
        const a = audioRef.current;
        if (a) {
            try { a.pause(); } catch { /* noop */ }
            try { a.currentTime = 0; } catch { /* noop */ }
        }
        if (typeof window !== "undefined" && window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch { /* noop */ }
        }
    }, []);

    // ------------------------------------------------------------------
    // Prefetch all narrations as cached blob URLs
    // ------------------------------------------------------------------
    const prefetchAll = useCallback(async () => {
        setPrefetching(true);
        setPrefetchProgress(0);
        const cache = {};
        let donec = 0;
        const fetchOne = async (s) => {
            try {
                const res = await fetch(`${apiBase}/tts/speak`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: s.narration, voice: "sage" }),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    cache[s.id] = URL.createObjectURL(blob);
                }
            } catch { /* fallback to speechSynthesis */ }
            donec += 1;
            setPrefetchProgress(Math.round((donec / scenes.length) * 100));
        };
        const CONCURRENCY = 5;
        for (let i = 0; i < scenes.length; i += CONCURRENCY) {
            await Promise.all(scenes.slice(i, i + CONCURRENCY).map(fetchOne));
        }
        setAudioCache(cache);
        setPrefetching(false);
        return cache;
    }, [apiBase, scenes]);

    const clearAllTimers = () => {
        clearTimeout(advanceTimer.current);
        clearTimeout(maxTimer.current);
        clearInterval(tickTimer.current);
    };

    const goToNext = useCallback(() => {
        clearAllTimers();
        setScene((p) => {
            if (p >= total - 1) { setDone(true); return p; }
            return p + 1;
        });
    }, [total]);

    const speakScene = useCallback((idx, cache) => {
        clearAllTimers();
        // 🔇 ALWAYS silence both engines before starting the next scene
        hardSilence();

        const sc = scenes[idx]; if (!sc) return;
        const useCache = cache || audioCacheRef.current;

        sceneStart.current = Date.now();
        setSceneElapsed(0);
        tickTimer.current = setInterval(() => setSceneElapsed(Date.now() - sceneStart.current), 250);

        const maxMs = sc.fallback_ms || 40000;
        // Hard safety: advance no matter what after scene's max + buffer
        maxTimer.current = setTimeout(() => {
            if (!pausedRef.current) goToNext();
        }, maxMs + 1500);

        // ✨ Avatar Mode: the HeyGen avatar owns the audio. We never play
        // the OpenAI sage TTS or the Web Speech fallback. The visual scene
        // still progresses on its fallback_ms timer; `speaking` stays true
        // so the avatar's chip + scene-progress strip animate as expected.
        if (avatarModeRef.current) {
            setSpeaking(true);
            advanceTimer.current = setTimeout(() => {
                setSpeaking(false);
                if (!pausedRef.current) goToNext();
            }, maxMs);
            return;
        }

        if (mutedRef.current) {
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs);
            return;
        }

        const url = useCache[sc.id];
        if (url && audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.muted = false;
            audioRef.current.play()
                .then(() => setSpeaking(true))
                .catch(() => {
                    // autoplay blocked or other play() rejection — fall back to timer
                    setSpeaking(false);
                    advanceTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs);
                });
        } else if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(sc.narration);
            u.rate = 0.97;
            const voices = window.speechSynthesis.getVoices();
            const female = voices.find((v) => /samantha|victoria|ava|allison|en-us.*female/i.test(v.name + " " + v.lang))
                || voices.find((v) => v.lang === "en-US")
                || voices.find((v) => v.lang?.startsWith("en"));
            if (female) u.voice = female;
            u.onstart = () => setSpeaking(true);
            u.onend = () => {
                setSpeaking(false);
                if (pausedRef.current) return;
                advanceTimer.current = setTimeout(goToNext, sceneGapMs);
            };
            u.onerror = () => {
                setSpeaking(false);
                if (pausedRef.current) return;
                advanceTimer.current = setTimeout(goToNext, sceneGapMs);
            };
            window.speechSynthesis.speak(u);
        } else {
            advanceTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs);
        }
    }, [scenes, hardSilence, goToNext, sceneGapMs]);

    // ------------------------------------------------------------------
    // <audio> event listeners — wired once per audioRef lifecycle
    // ------------------------------------------------------------------
    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        const onEnded = () => {
            setSpeaking(false);
            if (pausedRef.current) return;
            advanceTimer.current = setTimeout(goToNext, sceneGapMs);
        };
        const onPlay = () => setSpeaking(true);
        const onPause = () => setSpeaking(false);
        // 🆕 advance even if blob/network fails so the demo never stalls
        const onError = () => {
            setSpeaking(false);
            if (pausedRef.current) return;
            advanceTimer.current = setTimeout(goToNext, sceneGapMs);
        };
        a.addEventListener("ended", onEnded);
        a.addEventListener("play", onPlay);
        a.addEventListener("pause", onPause);
        a.addEventListener("error", onError);
        return () => {
            a.removeEventListener("ended", onEnded);
            a.removeEventListener("play", onPlay);
            a.removeEventListener("pause", onPause);
            a.removeEventListener("error", onError);
        };
    }, [goToNext, sceneGapMs]);

    // Auto-speak the active scene whenever it changes (after start)
    useEffect(() => {
        if (!started) return;
        speakScene(scene);
        return () => clearAllTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started]);

    // ------------------------------------------------------------------
    // Component unmount + page-hide / beforeunload — silence both engines
    // ------------------------------------------------------------------
    useEffect(() => {
        const fullStop = () => {
            clearAllTimers();
            const a = audioRef.current;
            if (a) {
                try { a.pause(); } catch { /* noop */ }
                try { a.removeAttribute("src"); a.load(); } catch { /* noop */ }
            }
            if (typeof window !== "undefined" && window.speechSynthesis) {
                try { window.speechSynthesis.cancel(); } catch { /* noop */ }
            }
        };
        const onHide = () => fullStop();
        if (typeof window !== "undefined") {
            window.addEventListener("pagehide", onHide);
            window.addEventListener("beforeunload", onHide);
            document.addEventListener("visibilitychange", () => {
                if (document.hidden) fullStop();
            });
        }
        return () => {
            fullStop();
            // Release any blob URLs we minted
            try { Object.values(audioCacheRef.current || {}).forEach(URL.revokeObjectURL); } catch { /* noop */ }
            if (typeof window !== "undefined") {
                window.removeEventListener("pagehide", onHide);
                window.removeEventListener("beforeunload", onHide);
            }
        };
    }, []);

    // ------------------------------------------------------------------
    // Public action handlers
    // ------------------------------------------------------------------
    const handleStart = useCallback(async () => {
        setStarted(true);
        setScene(0); setDone(false); setPaused(false);
        // ✨ Avatar Mode: skip TTS prefetch — the avatar is the voice.
        if (avatarModeRef.current) {
            setTimeout(() => speakScene(0, {}), 100);
            return;
        }
        const cache = await prefetchAll();
        setTimeout(() => speakScene(0, cache), 200);
    }, [prefetchAll, speakScene]);

    const handlePauseResume = useCallback(() => {
        if (pausedRef.current) {
            // RESUME
            setPaused(false);
            pausedRef.current = false;
            if (audioRef.current?.src) audioRef.current.play().catch(() => {});
            const remaining = Math.max(2000, (current?.fallback_ms || 40000) + 1500 - sceneElapsed);
            sceneStart.current = Date.now() - sceneElapsed;
            tickTimer.current = setInterval(() => setSceneElapsed(Date.now() - sceneStart.current), 250);
            maxTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, remaining);
        } else {
            // PAUSE — stop both engines hard
            setPaused(true);
            pausedRef.current = true;
            clearAllTimers();
            hardSilence();
        }
    }, [current, sceneElapsed, goToNext, hardSilence]);

    const handleRestart = useCallback(() => {
        clearAllTimers();
        hardSilence();
        setScene(0); setDone(false); setPaused(false);
        pausedRef.current = false;
        setTimeout(() => speakScene(0), 150);
    }, [hardSilence, speakScene]);

    const handleMute = useCallback(() => {
        setMuted((p) => {
            const n = !p;
            mutedRef.current = n;
            if (n) {
                hardSilence();
            } else {
                setTimeout(() => speakScene(scene), 100);
            }
            return n;
        });
    }, [scene, hardSilence, speakScene]);

    return {
        // state
        started, scene, muted, paused, speaking, prefetching, prefetchProgress, done,
        sceneElapsed, audioCache, current, total, overallProgress, totalRuntimeMs, elapsedBeforeScene,
        // refs
        audioRef,
        // actions
        handleStart, handlePauseResume, handleRestart, handleMute,
        setScene, setDone, setPaused,
        // labels (for callers that want them)
        demoTypeLabel,
    };
}
