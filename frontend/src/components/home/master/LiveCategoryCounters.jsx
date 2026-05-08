import React, { useEffect, useRef, useState } from "react";
import {
    Send, DollarSign, Sparkles, AlertTriangle, CalendarCheck,
    Radio, Cpu, ListChecks,
} from "lucide-react";

/**
 * LiveCategoryCounters · Iter 96+
 * --------------------------------------------------------------------
 * Executive telemetry row. 8 segmented tiles displaying live category
 * totals — seeded from /api/public/system-pulse, incremented by SSE
 * pulses. Bloomberg-terminal style: small typography, soft borders,
 * tabular-nums, no flash, no scroll, no marquee.
 *
 * Subtle transition cue: when a tile's value changes, a 1.4s soft
 * border-glow runs once. That's it.
 *
 * Mobile: 2 cols. Tablet: 4 cols. Desktop: 8 cols.
 */

const TILES = [
    { id: "outbound",     label: "OUTBOUND",       sub: "today",     icon: Send,           tone: "cyan",    fmt: "comma"   },
    { id: "revenue",      label: "REVENUE",        sub: "tracked",   icon: DollarSign,     tone: "emerald", fmt: "raw"     },
    { id: "actions",      label: "AI ACTIONS",     sub: "today",     icon: Sparkles,       tone: "violet",  fmt: "comma"   },
    { id: "alerts",       label: "ALERTS",         sub: "session",   icon: AlertTriangle,  tone: "amber",   fmt: "comma"   },
    { id: "appointments", label: "APPOINTMENTS",   sub: "session",   icon: CalendarCheck,  tone: "violet",  fmt: "comma"   },
    { id: "executions",   label: "LIVE EXECUTIONS",sub: "connected", icon: Radio,          tone: "cyan",    fmt: "comma"   },
    { id: "agents",       label: "ACTIVE AGENTS",  sub: "running",   icon: Cpu,            tone: "violet",  fmt: "comma"   },
    { id: "tasks",        label: "TASKS",          sub: "executed",  icon: ListChecks,     tone: "emerald", fmt: "comma"   },
];

const TONE_CLS = {
    emerald: { dot: "bg-emerald-400", text: "text-emerald-200", icon: "text-emerald-400/90", ring: "ring-emerald-500/25",  glow: "shadow-[0_0_18px_rgba(52,211,153,0.20)]" },
    cyan:    { dot: "bg-cyan-400",    text: "text-cyan-200",    icon: "text-cyan-400/90",    ring: "ring-cyan-500/25",     glow: "shadow-[0_0_18px_rgba(34,211,238,0.20)]"  },
    violet:  { dot: "bg-violet-400",  text: "text-violet-200",  icon: "text-violet-400/90",  ring: "ring-violet-500/25",   glow: "shadow-[0_0_18px_rgba(167,139,250,0.20)]" },
    amber:   { dot: "bg-amber-400",   text: "text-amber-200",   icon: "text-amber-400/90",   ring: "ring-amber-500/25",    glow: "shadow-[0_0_18px_rgba(251,191,36,0.20)]"  },
};

const formatValue = (v, fmt) => {
    if (fmt === "raw") return String(v ?? "—");
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v ?? "—");
    return n.toLocaleString();
};

export const LiveCategoryCounters = ({ counts, sseLive }) => {
    const safe = counts || {};
    const bumpedAt = safe.bumpedAt || {};
    return (
        <div
            data-testid="live-category-counters"
            data-sse-live={sseLive ? "true" : "false"}
            className="relative mt-3 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-ink-900/80 via-[#06121e]/90 to-ink-900/80 backdrop-blur-md"
        >
            {/* top hairline */}
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

            <div
                data-testid="lcc-grid"
                className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-4 lg:grid-cols-8"
            >
                {TILES.map((t) => (
                    <CounterTile
                        key={t.id}
                        tile={t}
                        rawValue={safe[t.id]}
                        bumpAt={bumpedAt[t.id] || 0}
                    />
                ))}
            </div>

            <style>{`
                @keyframes cb-tile-flash {
                    0%   { box-shadow: inset 0 0 0 1px rgba(34,211,238,0.55), 0 0 18px rgba(34,211,238,0.20); }
                    100% { box-shadow: inset 0 0 0 1px transparent, 0 0 0 transparent; }
                }
                .cb-tile-bump { animation: cb-tile-flash 1.4s ease-out forwards; }
                @media (prefers-reduced-motion: reduce) {
                    .cb-tile-bump { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

const CounterTile = ({ tile, rawValue, bumpAt }) => {
    const Icon = tile.icon;
    const tone = TONE_CLS[tile.tone] || TONE_CLS.cyan;
    const display = formatValue(rawValue, tile.fmt);
    const animatedDisplay = useSmoothNumber(rawValue, tile.fmt, display);

    // Determine if this tile is currently in its "bump" window
    const [bumpKey, setBumpKey] = useState(0);
    const lastBumpRef = useRef(0);
    useEffect(() => {
        if (!bumpAt || bumpAt === lastBumpRef.current) return;
        lastBumpRef.current = bumpAt;
        setBumpKey((k) => k + 1);
    }, [bumpAt]);

    return (
        <div
            data-testid={`lcc-tile-${tile.id}`}
            data-tone={tile.tone}
            data-bumped={bumpAt ? "true" : "false"}
            className={`relative bg-ink-900/85 px-3 py-3 lg:px-4 lg:py-3.5`}
        >
            {/* Bumped overlay — keyed so it remounts each bump and the keyframe restarts */}
            {bumpKey > 0 && (
                <span
                    key={bumpKey}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 cb-tile-bump"
                />
            )}

            <div className="flex items-center gap-2">
                <span className="relative inline-flex h-1.5 w-1.5">
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                </span>
                <span className={`font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-slate-400`}>
                    {tile.label}
                </span>
                <Icon size={11} className={`ml-auto ${tone.icon}`} strokeWidth={1.7} />
            </div>
            <p
                className={`font-heading mt-2 text-[20px] leading-tight font-semibold tabular-nums ${tone.text} transition-colors duration-300 lg:text-[22px]`}
                data-testid={`lcc-value-${tile.id}`}
            >
                {animatedDisplay}
            </p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-slate-500">
                {tile.sub}
            </p>
        </div>
    );
};

/**
 * useSmoothNumber — interpolates numeric tile values toward their next
 * target over 380ms (ease-out cubic). Pure rAF, no lib. Strings (e.g.
 * "$1.42M") pass through unchanged.
 */
const useSmoothNumber = (raw, fmt, fallback) => {
    const [shown, setShown] = useState(fallback);
    const prevNumRef = useRef(null);
    useEffect(() => {
        if (fmt !== "comma") {
            setShown(formatValue(raw, fmt));
            return undefined;
        }
        const target = Number(raw);
        if (!Number.isFinite(target)) {
            setShown(formatValue(raw, fmt));
            return undefined;
        }
        const start = prevNumRef.current ?? target;
        const t0 = performance.now();
        const dur = 380;
        let raf;
        const step = (now) => {
            const t = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = start + (target - start) * eased;
            setShown(formatValue(Math.round(v), fmt));
            if (t < 1) raf = requestAnimationFrame(step);
            else prevNumRef.current = target;
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [raw, fmt]);
    return shown;
};

export default LiveCategoryCounters;
