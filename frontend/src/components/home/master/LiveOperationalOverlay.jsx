import React from "react";

/**
 * LiveOperationalOverlay · Iter 96+
 * --------------------------------------------------------------------
 * Subtle SVG overlay layered on top of the master dashboard image to
 * make it feel like a live, breathing AI operating system — not a
 * static screenshot.
 *
 * Rules:
 *   · CSS / SVG only · no JS animation loops · no canvas
 *   · GPU-accelerated transforms + opacity only
 *   · Slow + ambient · low contrast · enterprise-grade
 *   · Avoids: fast neon, gamer effects, social-media motion
 *
 * Composition (all positioned in % so it scales with the image):
 *   1. Slow vertical scan-line sweep (12s)
 *   2. Six pulse beacons over the dashboard's hot zones
 *      (revenue, leads, deals, action-feed top, action-feed bottom, integrations)
 *   3. Two soft signal-glow streaks across the workflow connector area
 *   4. Heartbeat ECG line at the bottom — operational pulse signature
 *   5. Faint scanning gradient that drifts horizontally
 */

const BEACONS = [
    // Coordinates are tuned to land on the master mockup's KPI hotspots
    // (revenue, leads, deals, action-feed, integrations, alerts)
    { id: "revenue",      cx: "82.5%", cy: "31%", delay: "0s"   },
    { id: "leads",        cx: "82.5%", cy: "39%", delay: "1.2s" },
    { id: "deals",        cx: "82.5%", cy: "47%", delay: "2.4s" },
    { id: "feed-top",     cx: "63%",   cy: "30%", delay: "0.6s" },
    { id: "feed-bottom",  cx: "63%",   cy: "57%", delay: "3.6s" },
    { id: "integrations", cx: "82%",   cy: "76%", delay: "1.8s" },
];

export const LiveOperationalOverlay = () => {
    return (
        <div
            data-testid="live-operational-overlay"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        >
            <svg
                viewBox="0 0 1000 700"
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 h-full w-full"
            >
                <defs>
                    {/* Beacon radial — soft cyan halo */}
                    <radialGradient id="cb-beacon" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.85" />
                        <stop offset="40%"  stopColor="#22d3ee" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </radialGradient>
                    {/* Vertical scan-line gradient (top transparent → mid bright → bottom transparent) */}
                    <linearGradient id="cb-scan" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0" />
                        <stop offset="50%"  stopColor="#22d3ee" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                    {/* Horizontal data-flow gradient */}
                    <linearGradient id="cb-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0" />
                        <stop offset="50%"  stopColor="#22d3ee" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                    {/* Beacon pulse filter */}
                    <filter id="cb-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" />
                    </filter>
                </defs>

                {/* 1 · Slow vertical scan-line sweep (12s loop) */}
                <rect
                    className="cb-scan-line"
                    x="0" y="-60" width="1000" height="60"
                    fill="url(#cb-scan)"
                />

                {/* 2 · Horizontal data-flow streaks across the workflow connector area */}
                <g>
                    <rect
                        className="cb-flow-1"
                        x="-400" y="380" width="400" height="2"
                        fill="url(#cb-flow)"
                        opacity="0.7"
                    />
                    <rect
                        className="cb-flow-2"
                        x="-400" y="495" width="400" height="2"
                        fill="url(#cb-flow)"
                        opacity="0.5"
                    />
                </g>

                {/* 3 · Six pulse beacons */}
                {BEACONS.map((b) => (
                    <g key={b.id} data-testid={`overlay-beacon-${b.id}`}>
                        {/* outer expanding ring */}
                        <circle
                            className="cb-beacon-ring"
                            cx={b.cx} cy={b.cy} r="3"
                            fill="none" stroke="#22d3ee" strokeWidth="1"
                            style={{ animationDelay: b.delay }}
                        />
                        {/* soft halo */}
                        <circle
                            className="cb-beacon-halo"
                            cx={b.cx} cy={b.cy} r="14"
                            fill="url(#cb-beacon)"
                            filter="url(#cb-glow)"
                            style={{ animationDelay: b.delay }}
                        />
                        {/* core dot */}
                        <circle
                            className="cb-beacon-core"
                            cx={b.cx} cy={b.cy} r="1.8"
                            fill="#67e8f9"
                            style={{ animationDelay: b.delay }}
                        />
                    </g>
                ))}

                {/* 4 · Operational heartbeat ECG signature (bottom strip) */}
                <g transform="translate(60, 660)" opacity="0.55">
                    <path
                        className="cb-ecg"
                        d="M 0 0 L 80 0 L 90 -8 L 100 14 L 110 -22 L 120 8 L 130 0 L 880 0"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            </svg>

            {/* 5 · Faint horizontal scanning gradient sheen drifts across image */}
            <div
                className="cb-sheen pointer-events-none absolute inset-0"
                aria-hidden
            />

            <style>{`
                /* slow vertical scan-line sweep */
                @keyframes cb-scan-y {
                    0%   { transform: translateY(0px); opacity: 0; }
                    8%   { opacity: 1; }
                    92%  { opacity: 1; }
                    100% { transform: translateY(760px); opacity: 0; }
                }
                .cb-scan-line {
                    animation: cb-scan-y 12s ease-in-out infinite;
                    transform-origin: 0 0;
                    will-change: transform, opacity;
                }

                /* horizontal data-flow streaks */
                @keyframes cb-flow-x {
                    0%   { transform: translateX(0);    opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: 1; }
                    100% { transform: translateX(1500px); opacity: 0; }
                }
                .cb-flow-1 { animation: cb-flow-x  9s linear infinite;       will-change: transform, opacity; }
                .cb-flow-2 { animation: cb-flow-x 11s linear infinite 4.5s;  will-change: transform, opacity; }

                /* beacon expanding ring */
                @keyframes cb-beacon-ring {
                    0%   { r: 3;   opacity: 0.95; stroke-width: 1.2; }
                    100% { r: 24;  opacity: 0;    stroke-width: 0.4; }
                }
                .cb-beacon-ring {
                    animation: cb-beacon-ring 3.6s ease-out infinite;
                    transform-origin: center;
                    will-change: r, opacity;
                }

                /* beacon halo gentle breath */
                @keyframes cb-beacon-halo {
                    0%, 100% { opacity: 0.45; transform: scale(1.00); }
                    50%      { opacity: 0.85; transform: scale(1.08); }
                }
                .cb-beacon-halo {
                    animation: cb-beacon-halo 3.6s ease-in-out infinite;
                    transform-origin: center;
                    transform-box: fill-box;
                    will-change: opacity, transform;
                }

                /* beacon core */
                @keyframes cb-beacon-core {
                    0%, 100% { opacity: 0.85; }
                    50%      { opacity: 1;    }
                }
                .cb-beacon-core {
                    animation: cb-beacon-core 3.6s ease-in-out infinite;
                }

                /* ECG heartbeat — slow, faint, 6s loop */
                @keyframes cb-ecg-pulse {
                    0%   { stroke-dashoffset: 1000; opacity: 0.20; }
                    50%  { opacity: 0.75; }
                    100% { stroke-dashoffset: 0;    opacity: 0.20; }
                }
                .cb-ecg {
                    stroke-dasharray: 1000;
                    animation: cb-ecg-pulse 6s linear infinite;
                    will-change: stroke-dashoffset, opacity;
                }

                /* faint full-image sheen — extremely slow, very low opacity */
                @keyframes cb-sheen-x {
                    0%   { transform: translateX(-30%); opacity: 0; }
                    50%  { opacity: 0.06; }
                    100% { transform: translateX(130%); opacity: 0; }
                }
                .cb-sheen {
                    background: linear-gradient(110deg,
                        transparent 30%,
                        rgba(34,211,238,0.18) 50%,
                        transparent 70%);
                    animation: cb-sheen-x 14s ease-in-out infinite;
                    mix-blend-mode: screen;
                    will-change: transform, opacity;
                }

                /* Respect reduced-motion preference */
                @media (prefers-reduced-motion: reduce) {
                    .cb-scan-line, .cb-flow-1, .cb-flow-2,
                    .cb-beacon-ring, .cb-beacon-halo, .cb-beacon-core,
                    .cb-ecg, .cb-sheen { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

export default LiveOperationalOverlay;
