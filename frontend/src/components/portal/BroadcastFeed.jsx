import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Activity, Send, Inbox, Eye, MessageSquare, Flame, DollarSign,
    Calendar, ArrowRight, Pause, Play, X, Volume2, VolumeX,
} from "lucide-react";

/**
 * BroadcastFeed
 * --------------------------------------------------------------
 * Cinematic execution ticker — Bloomberg / SOC / NORAD style.
 *
 * Mounts as a fixed-bottom overlay across the Founder/Operator
 * dashboard. Polls the existing `/api/ops/outbound/live-pulse`
 * endpoint (every 6s) and renders new `broadcast_events` as
 * slide-in lines that auto-fade.
 *
 *   • Lane-coloured (outreach / reply / demo / hot / deal / scheduling)
 *   • Smooth slide-from-right · 4s dwell · fade out
 *   • Pause-on-hover · close button · global enable/disable
 *   • Persists "seen event" hashes so refreshes don't replay history
 *   • Zero-config: drop into any authed dashboard
 *
 * Not flashy. Single-line cinematic execution proof.
 */

const POLL_MS = 6000;
const DWELL_MS = 4500;
const FADE_MS = 450;
const STORAGE_KEY = "cb_broadcast_feed_v1";

// Lanes the AI Executive should speak out loud. Demo views / outbound sends
// would be too chatty — we narrate only meaningful operational moments.
const NARRATE_LANES = new Set(["reply", "hot", "deal", "scheduling"]);

// Generate a cinematic single-sentence narration line per event.
// Extract the prospect/business name from a backend summary like:
//   "Outreach sent → Coastal Realty · Real estate brokerage"
//   "Deal created · $30,000 → Realtor T"
//   "Hot lead detected → CompanyX"
// We always take the substring AFTER the arrow and BEFORE the first " · "
// segment so industry/state metadata don't end up spoken aloud.
const _extractName = (summary) => {
    if (!summary) return "";
    const afterArrow = summary.split("→").pop() || summary;
    const firstSeg = afterArrow.split("·")[0] || afterArrow;
    return firstSeg.trim();
};

// Pull a "$X,000" token out of a summary if present.
const _extractValue = (summary) => {
    const m = (summary || "").match(/\$\s?[\d,]+/);
    return m ? m[0].replace(/\s/g, "") : null;
};

const narrationLineFor = (e) => {
    if (!e) return null;
    const name = _extractName(e.summary);
    if (!name) return null;
    switch (e.lane) {
        case "hot":
            return `Hot lead detected. ${name} just hit a high-intent threshold.`;
        case "deal": {
            const v = _extractValue(e.summary);
            return v
                ? `Deal closed with ${name}, value ${v}.`
                : `Deal closed with ${name}.`;
        }
        case "reply": {
            // Heuristic: backend prefixes Interested replies with "Interested reply"
            const isInterested = /^Interested/i.test(e.summary || "");
            return isInterested
                ? `Interested reply received from ${name}.`
                : `New reply received from ${name}.`;
        }
        case "scheduling":
            return `Scheduling event confirmed for ${name}.`;
        default:
            return null;
    }
};

const speakLine = (text, { rate = 1.0, pitch = 1.0, volume = 0.9 } = {}) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) return;
    try {
        // Cancel any in-progress speech so the latest event takes priority
        synth.cancel();
        const u = new window.SpeechSynthesisUtterance(text);
        u.rate = rate;
        u.pitch = pitch;
        u.volume = volume;
        // Pick a calm voice if available
        const voices = synth.getVoices?.() || [];
        const preferred =
            voices.find((v) => /Google US English|Samantha|Daniel|Karen/i.test(v.name)) ||
            voices.find((v) => v.lang === "en-US") ||
            voices[0];
        if (preferred) u.voice = preferred;
        synth.speak(u);
        return u;
    } catch {
        return null;
    }
};

const LANE_STYLE = {
    outreach:   { color: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    Icon: Send,            label: "OUTREACH" },
    reply:      { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", Icon: MessageSquare,   label: "REPLY" },
    demo:       { color: "text-sky-300",     bg: "bg-sky-500/10",     border: "border-sky-500/30",     Icon: Eye,             label: "DEMO" },
    hot:        { color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   Icon: Flame,           label: "HOT LEAD" },
    deal:       { color: "text-fuchsia-300", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", Icon: DollarSign,      label: "DEAL" },
    scheduling: { color: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-500/30",  Icon: Calendar,        label: "SCHEDULE" },
    intake:     { color: "text-slate-300",   bg: "bg-slate-500/10",   border: "border-white/10",       Icon: Inbox,           label: "INTAKE" },
    engine:     { color: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    Icon: Activity,        label: "ENGINE" },
};

const eventKey = (e) => `${e.ts || ""}::${e.kind || ""}::${e.ref || ""}`;

const fmtClock = (iso) => {
    if (!iso) return "--:--:--";
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
        });
    } catch {
        return "--:--:--";
    }
};

export const BroadcastFeed = ({
    apiBaseUrl,
    authEmail,
    authToken,
    pollMs = POLL_MS,
    testId = "broadcast-feed",
}) => {
    // user-controlled visibility (persisted)
    const [enabled, setEnabled] = useState(() => {
        try {
            const v = window.localStorage.getItem(STORAGE_KEY + ":enabled");
            return v === null ? true : v === "1";
        } catch {
            return true;
        }
    });
    const [muted, setMuted] = useState(false);
    // narration state — flips true while AI Executive avatar speaks an event
    const [narrating, setNarrating] = useState(false);

    // queue of events waiting to slide in
    const queueRef = useRef([]);
    // events already shown (so we don't re-broadcast on refresh)
    const seenRef = useRef(new Set());
    const [current, setCurrent] = useState(null);
    const [showing, setShowing] = useState(false); // visible / fading
    const hoverRef = useRef(false);
    const aliveRef = useRef(true);
    const fetchingRef = useRef(false);
    const dwellTimerRef = useRef(null);
    const fadeTimerRef = useRef(null);
    const narrateTimerRef = useRef(null);

    /* -------------- persistence of seen ids (shallow, last 200) -------------- */
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY + ":seen");
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    seenRef.current = new Set(arr.slice(-200));
                }
            }
        } catch { /* ignore */ }
    }, []);
    const persistSeen = useCallback(() => {
        try {
            const arr = Array.from(seenRef.current).slice(-200);
            window.localStorage.setItem(STORAGE_KEY + ":seen", JSON.stringify(arr));
        } catch { /* ignore */ }
    }, []);

    /* -------------- fetch loop -------------- */
    useEffect(() => {
        aliveRef.current = true;
        const tick = async () => {
            if (!enabled) return;
            if (fetchingRef.current) return;
            if (!apiBaseUrl || !authEmail || !authToken) return;
            fetchingRef.current = true;
            try {
                const res = await fetch(
                    `${apiBaseUrl}/api/ops/outbound/live-pulse`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: authEmail, token: authToken }),
                    },
                );
                const json = await res.json();
                if (!aliveRef.current || !json?.ok) return;

                const events = Array.isArray(json.broadcast_events) ? json.broadcast_events : [];
                // newest-first → reverse so slide order is oldest → newest
                const fresh = [];
                for (const e of [...events].reverse()) {
                    const k = eventKey(e);
                    if (!seenRef.current.has(k)) {
                        seenRef.current.add(k);
                        fresh.push(e);
                    }
                }
                if (fresh.length) {
                    queueRef.current = [...queueRef.current, ...fresh];
                    persistSeen();
                }
            } catch {
                /* keep silent — error UX belongs to LiveSendPulse */
            } finally {
                fetchingRef.current = false;
            }
        };
        tick();
        const id = setInterval(tick, pollMs);
        return () => {
            aliveRef.current = false;
            clearInterval(id);
        };
    }, [apiBaseUrl, authEmail, authToken, pollMs, enabled, persistSeen]);

    /* -------------- presenter loop · pull next from queue -------------- */
    useEffect(() => {
        if (!enabled) return;
        if (current) return;
        const pull = setInterval(() => {
            if (hoverRef.current) return;
            if (queueRef.current.length === 0) return;
            const next = queueRef.current.shift();
            setCurrent(next);
            setShowing(true);
        }, 600);
        return () => clearInterval(pull);
    }, [current, enabled]);

    /* -------------- dwell / fade -------------- */
    useEffect(() => {
        if (!current) return;
        if (hoverRef.current) return;
        clearTimeout(dwellTimerRef.current);
        clearTimeout(fadeTimerRef.current);

        // Avatar narration — only for high-signal events, only when not muted.
        if (!muted && enabled && NARRATE_LANES.has(current.lane)) {
            const line = narrationLineFor(current);
            if (line) {
                const u = speakLine(line);
                if (u) {
                    setNarrating(true);
                    u.onend = () => {
                        if (aliveRef.current) setNarrating(false);
                    };
                    u.onerror = () => {
                        if (aliveRef.current) setNarrating(false);
                    };
                    // Safety reset in case onend never fires (some engines silently fail)
                    clearTimeout(narrateTimerRef.current);
                    narrateTimerRef.current = setTimeout(() => {
                        if (aliveRef.current) setNarrating(false);
                    }, DWELL_MS + 1500);
                }
            }
        }

        dwellTimerRef.current = setTimeout(() => {
            setShowing(false);
            fadeTimerRef.current = setTimeout(() => setCurrent(null), FADE_MS);
        }, DWELL_MS);
        return () => {
            clearTimeout(dwellTimerRef.current);
            clearTimeout(fadeTimerRef.current);
            clearTimeout(narrateTimerRef.current);
        };
    }, [current, muted, enabled]);

    // Cancel any in-flight narration when feed disabled / muted
    useEffect(() => {
        if (!muted && enabled) return;
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
        setNarrating(false);
    }, [muted, enabled]);

    // Cancel narration when the component unmounts
    useEffect(() => {
        return () => {
            try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
        };
    }, []);

    // Mark dismiss → instant
    const dismiss = () => {
        clearTimeout(dwellTimerRef.current);
        clearTimeout(fadeTimerRef.current);
        setShowing(false);
        setTimeout(() => setCurrent(null), FADE_MS);
    };

    const onMouseEnter = () => { hoverRef.current = true; };
    const onMouseLeave = () => {
        hoverRef.current = false;
        // re-arm dwell
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = setTimeout(() => {
            setShowing(false);
            fadeTimerRef.current = setTimeout(() => setCurrent(null), FADE_MS);
        }, DWELL_MS);
    };

    const toggleEnabled = () => {
        const nv = !enabled;
        setEnabled(nv);
        try {
            window.localStorage.setItem(STORAGE_KEY + ":enabled", nv ? "1" : "0");
        } catch { /* ignore */ }
        if (!nv) {
            queueRef.current = [];
            setCurrent(null);
            setShowing(false);
        }
    };

    // Render lane info
    const lane = useMemo(() => {
        if (!current) return LANE_STYLE.outreach;
        return LANE_STYLE[current.lane] || LANE_STYLE.outreach;
    }, [current]);

    return (
        <>
            {/* Persistent compact control rail (always visible at bottom-left) */}
            <div
                className="fixed bottom-3 left-3 z-[80] flex items-center gap-1.5"
                data-testid={`${testId}-control-rail`}
            >
                {/* AI Executive avatar thumbnail — pulses + glows when narrating */}
                <div
                    className={`relative h-7 w-7 overflow-hidden rounded-full border transition-all ${
                        narrating
                            ? "border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.7)]"
                            : "border-white/15 opacity-80"
                    }`}
                    aria-hidden="true"
                    data-testid={`${testId}-avatar`}
                    data-narrating={narrating ? "true" : "false"}
                >
                    {narrating && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/30" />
                    )}
                    <img
                        src="/avatars/poster-mobile.jpg"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className={`relative h-full w-full object-cover ${
                            narrating ? "scale-105" : "scale-100"
                        } transition-transform duration-300`}
                    />
                </div>
                <button
                    type="button"
                    onClick={toggleEnabled}
                    aria-label={enabled ? "Pause broadcast feed" : "Resume broadcast feed"}
                    data-testid={`${testId}-toggle`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] backdrop-blur-md transition-all ${
                        enabled
                            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                            : "border-white/15 bg-ink-900/80 text-slate-400 hover:text-cyan-300"
                    }`}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-cyan-300 animate-pulse" : "bg-slate-500"}`} />
                    Broadcast {enabled ? "Live" : "Off"}
                    {enabled ? <Pause size={9} className="ml-0.5" /> : <Play size={9} className="ml-0.5" />}
                </button>
                <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    aria-label={muted ? "Unmute" : "Mute"}
                    data-testid={`${testId}-mute`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-ink-900/80 text-slate-400 backdrop-blur-md transition-all hover:text-cyan-300"
                >
                    {muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                </button>
            </div>

            {/* Cinematic bottom bar — only renders when an event is active */}
            <div
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center"
                data-testid={testId}
                data-active={current ? "true" : "false"}
            >
                <div
                    className={`pointer-events-auto mx-3 mb-3 w-full max-w-5xl transition-all duration-[450ms] ease-out ${
                        current && showing
                            ? "translate-y-0 opacity-100"
                            : "translate-y-6 opacity-0"
                    }`}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {current && (
                        <div
                            className={`flex items-center gap-3 rounded-md border ${lane.border} ${lane.bg} px-4 py-2.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl`}
                            data-testid={`${testId}-active`}
                            data-lane={current.lane}
                        >
                            {/* timestamp */}
                            <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400">
                                {fmtClock(current.ts)}
                            </span>

                            {/* arrow */}
                            <ArrowRight size={11} className={lane.color} />

                            {/* lane chip */}
                            <span
                                className={`inline-flex items-center gap-1 rounded-full border ${lane.border} bg-ink-900/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${lane.color}`}
                            >
                                <lane.Icon size={9} />
                                {lane.label}
                            </span>

                            {/* main summary */}
                            <span className="flex-1 truncate text-[12px] text-white">
                                {current.summary}
                                {current.simulated && (
                                    <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300/80">
                                        · simulated
                                    </span>
                                )}
                            </span>

                            {/* dismiss */}
                            <button
                                type="button"
                                onClick={dismiss}
                                aria-label="Dismiss"
                                data-testid={`${testId}-dismiss`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                <X size={11} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default BroadcastFeed;
