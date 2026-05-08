import React, { useEffect, useState } from "react";

/**
 * LiveOperationalOverlay · Iter 96+ (event-driven)
 * --------------------------------------------------------------------
 * Subtle SVG overlay layered on top of the master dashboard image.
 * Each beacon has TWO modes:
 *
 *   · ambient — very faint halo breathing, NO expanding ring.
 *               This is the resting state when no events are flowing.
 *   · active  — full pulse with expanding ring, brighter halo, and
 *               a tiny EVENT tag that surfaces for ~2s. Only triggered
 *               by real events from the SSE feed (`flashes` prop).
 *
 * `flashes` prop shape: { beaconId: epochMs (last fired) }
 * Beacons fall back to ambient when their flash > FLASH_HOLD_MS old.
 *
 * Persistent ambient elements (always running, very subtle):
 *   · slow vertical scan-line sweep (12s)
 *   · faint cyan sheen drift (14s, peak 6% opacity)
 *   · operational ECG heartbeat at the bottom (6s)
 *
 * Event-only elements (only fire on real SSE events):
 *   · expanding rings on individual beacons
 *   · horizontal data-flow streaks (only render after a "feed-top" event)
 *
 * Honors `prefers-reduced-motion`.
 */

const FLASH_HOLD_MS = 4200; // how long a beacon stays "active" after an event

const BEACONS = [
    { id: "revenue",      cx: "82.5%", cy: "31%", label: "Revenue" },
    { id: "leads",        cx: "82.5%", cy: "39%", label: "Lead" },
    { id: "deals",        cx: "82.5%", cy: "47%", label: "Deal" },
    { id: "feed-top",     cx: "63%",   cy: "30%", label: "Action" },
    { id: "feed-bottom",  cx: "63%",   cy: "57%", label: "Action" },
    { id: "integrations", cx: "82%",   cy: "76%", label: "System" },
];

export const LiveOperationalOverlay = ({ flashes = {}, sseLive = false }) => {
    // Tick state forces re-render after FLASH_HOLD_MS so beacons fade back
    // to ambient. Cheap timeout, no rAF loop.
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!flashes || Object.keys(flashes).length === 0) return undefined;
        const t = window.setTimeout(() => setTick((n) => n + 1), FLASH_HOLD_MS + 50);
        return () => window.clearTimeout(t);
    }, [flashes]);

    // Use `tick` to force re-evaluation; no operation needed beyond reading it
    void tick;

    const now = Date.now();
    const isActive = (id) => {
        const ts = flashes && flashes[id];
        return Boolean(ts) && now - ts < FLASH_HOLD_MS;
    };
    const flashAge = (id) => {
        const ts = flashes && flashes[id];
        return ts ? now - ts : null;
    };

    // If feed-top fired recently, also fire a horizontal data-flow streak
    const recentFeedTop = isActive("feed-top");

    return (
        <div
            data-testid="live-operational-overlay"
            data-sse-live={sseLive ? "true" : "false"}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        >
            <svg
                viewBox="0 0 1000 700"
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 h-full w-full"
            >
                <defs>
                    <radialGradient id="cb-beacon" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.85" />
                        <stop offset="40%"  stopColor="#22d3ee" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="cb-scan" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0" />
                        <stop offset="50%"  stopColor="#22d3ee" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="cb-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0" />
                        <stop offset="50%"  stopColor="#22d3ee" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                    <filter id="cb-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" />
                    </filter>
                </defs>

                {/* AMBIENT · slow vertical scan-line (always running, very faint) */}
                <rect
                    className="cb-scan-line"
                    x="0" y="-60" width="1000" height="60"
                    fill="url(#cb-scan)"
                />

                {/* EVENT-DRIVEN · horizontal data-flow streak (fires only on feed-top events) */}
                {recentFeedTop && (
                    <rect
                        key={flashes["feed-top"]}
                        className="cb-flow-burst"
                        x="-400" y="380" width="400" height="2"
                        fill="url(#cb-flow)"
                    />
                )}

                {/* BEACONS */}
                {BEACONS.map((b) => {
                    const active = isActive(b.id);
                    const age    = flashAge(b.id);
                    return (
                        <g key={b.id} data-testid={`overlay-beacon-${b.id}`} data-active={active ? "true" : "false"}>
                            {/* AMBIENT halo · always breathing softly */}
                            <circle
                                className="cb-halo-ambient"
                                cx={b.cx} cy={b.cy} r="11"
                                fill="url(#cb-beacon)"
                                filter="url(#cb-glow)"
                                opacity={active ? 0 : 0.55}
                            />
                            {/* AMBIENT core dot */}
                            <circle
                                className={active ? "cb-core-active" : "cb-core-ambient"}
                                cx={b.cx} cy={b.cy} r="1.6"
                                fill="#67e8f9"
                            />
                            {/* EVENT-DRIVEN expanding ring · keyed by flash timestamp so
                                React remounts the element on every fresh event */}
                            {active && (
                                <>
                                    <circle
                                        key={`ring-${age}`}
                                        className="cb-event-ring"
                                        cx={b.cx} cy={b.cy} r="3"
                                        fill="none"
                                        stroke="#22d3ee"
                                        strokeWidth="1.4"
                                    />
                                    <circle
                                        key={`halo-${age}`}
                                        className="cb-event-halo"
                                        cx={b.cx} cy={b.cy} r="18"
                                        fill="url(#cb-beacon)"
                                        filter="url(#cb-glow)"
                                    />
                                </>
                            )}
                        </g>
                    );
                })}

                {/* AMBIENT · operational ECG heartbeat (always faint) */}
                <g transform="translate(60, 660)" opacity="0.45">
                    <path
                        className="cb-ecg"
                        d="M 0 0 L 80 0 L 90 -8 L 100 14 L 110 -22 L 120 8 L 130 0 L 880 0"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            </svg>

            {/* AMBIENT · faint horizontal scanning sheen (always running) */}
            <div className="cb-sheen pointer-events-none absolute inset-0" aria-hidden />

            {/* SSE-LIVE indicator pip — bottom-right, very subtle */}
            <div
                className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/70 px-2 py-0.5 backdrop-blur-md"
                data-testid="overlay-sse-pip"
            >
                <span className={`relative inline-flex h-1.5 w-1.5 ${sseLive ? "" : "opacity-40"}`}>
                    <span className={`absolute inline-flex h-full w-full rounded-full ${sseLive ? "bg-emerald-400 animate-ping opacity-70" : "bg-slate-500"}`} />
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${sseLive ? "bg-emerald-400" : "bg-slate-500"}`} />
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-300">
                    {sseLive ? "Live · SSE" : "Reconnecting"}
                </span>
            </div>

            <style>{`
                /* AMBIENT · slow vertical scan-line sweep */
                @keyframes cb-scan-y {
                    0%, 100% { transform: translateY(0px);   opacity: 0;    }
                    8%       { opacity: 0.85; }
                    92%      { opacity: 0.85; }
                    99%      { transform: translateY(760px); opacity: 0;    }
                }
                .cb-scan-line {
                    animation: cb-scan-y 14s ease-in-out infinite;
                    will-change: transform, opacity;
                }

                /* AMBIENT · halo gentle breath */
                @keyframes cb-halo-breath {
                    0%, 100% { opacity: 0.40; }
                    50%      { opacity: 0.65; }
                }
                .cb-halo-ambient {
                    animation: cb-halo-breath 5s ease-in-out infinite;
                    transform-origin: center;
                    will-change: opacity;
                }
                /* AMBIENT · core dot · soft */
                .cb-core-ambient { opacity: 0.7; }

                /* EVENT · core dot · brighter when active */
                @keyframes cb-core-flash {
                    0%   { opacity: 1;   r: 2.6;  filter: drop-shadow(0 0 6px #22d3ee); }
                    100% { opacity: 0.85; r: 1.6; filter: drop-shadow(0 0 0px #22d3ee); }
                }
                .cb-core-active {
                    animation: cb-core-flash 1.6s ease-out;
                }

                /* EVENT · expanding ring (single shot per real event) */
                @keyframes cb-ring {
                    0%   { r: 3;   opacity: 0.95; stroke-width: 1.5; }
                    80%  { opacity: 0.10; }
                    100% { r: 28;  opacity: 0;    stroke-width: 0.4; }
                }
                .cb-event-ring {
                    animation: cb-ring 2.6s ease-out forwards;
                    will-change: r, opacity;
                }

                /* EVENT · brighter halo flash */
                @keyframes cb-event-halo-anim {
                    0%   { opacity: 0.95; transform: scale(0.6); }
                    50%  { opacity: 0.85; transform: scale(1.05); }
                    100% { opacity: 0;    transform: scale(1.30); }
                }
                .cb-event-halo {
                    animation: cb-event-halo-anim 2.8s ease-out forwards;
                    transform-box: fill-box;
                    transform-origin: center;
                    will-change: opacity, transform;
                }

                /* EVENT · horizontal data-flow burst (fires once on feed event) */
                @keyframes cb-flow-burst-anim {
                    0%   { transform: translateX(0);    opacity: 0;    }
                    15%  { opacity: 1; }
                    100% { transform: translateX(1500px); opacity: 0;  }
                }
                .cb-flow-burst {
                    animation: cb-flow-burst-anim 1.8s linear forwards;
                    will-change: transform, opacity;
                }

                /* AMBIENT · ECG heartbeat (always faint) */
                @keyframes cb-ecg-pulse {
                    0%   { stroke-dashoffset: 1000; opacity: 0.20; }
                    50%  { opacity: 0.65; }
                    100% { stroke-dashoffset: 0;    opacity: 0.20; }
                }
                .cb-ecg {
                    stroke-dasharray: 1000;
                    animation: cb-ecg-pulse 7s linear infinite;
                    will-change: stroke-dashoffset, opacity;
                }

                /* AMBIENT · sheen drift */
                @keyframes cb-sheen-x {
                    0%   { transform: translateX(-30%); opacity: 0; }
                    50%  { opacity: 0.05; }
                    100% { transform: translateX(130%); opacity: 0; }
                }
                .cb-sheen {
                    background: linear-gradient(110deg,
                        transparent 30%,
                        rgba(34,211,238,0.18) 50%,
                        transparent 70%);
                    animation: cb-sheen-x 16s ease-in-out infinite;
                    mix-blend-mode: screen;
                    will-change: transform, opacity;
                }

                /* Respect reduced-motion preference — disables all motion */
                @media (prefers-reduced-motion: reduce) {
                    .cb-scan-line, .cb-halo-ambient, .cb-core-active,
                    .cb-event-ring, .cb-event-halo, .cb-flow-burst,
                    .cb-ecg, .cb-sheen {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default LiveOperationalOverlay;
