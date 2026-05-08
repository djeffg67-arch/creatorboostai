import React, { useEffect, useState } from "react";
import { ArrowUpRight, Radio } from "lucide-react";

/**
 * LiveActionIDStrip · Iter 96+
 * --------------------------------------------------------------------
 * Bloomberg-terminal-style horizontal ticker beneath the master
 * dashboard. Renders the last 3-5 real operational events from the
 * SSE feed. Each chip is a clickable Action ID permalink (->/?action=ID)
 * with subtle category-coded color edge.
 *
 * Categorization (per spec):
 *   · revenue (invoice)              → soft green (emerald)
 *   · alerts                         → amber
 *   · outbound (lead/email/send/qualified/reply) → cyan
 *   · maintenance                    → orange
 *   · AI execution / scheduling / CRM (deal/appointment/task) → violet
 *
 * Motion language:
 *   · subtle slide-in from right when new event arrives
 *   · oldest fades out
 *   · NO marquee scroll, NO infinite loop, NO flashy effects
 *   · prefers-reduced-motion respected
 */

const CATEGORY_BY_KIND = {
    invoice:     "revenue",
    alert:       "alert",
    lead:        "outbound",
    qualified:   "outbound",
    email:       "outbound",
    send:        "outbound",
    reply:       "outbound",
    maintenance: "maintenance",
    deal:        "ai-exec",
    appointment: "ai-exec",
    task:        "ai-exec",
};

const CATEGORY_STYLES = {
    revenue:     { edge: "border-l-emerald-400/80", text: "text-emerald-200", dot: "bg-emerald-400", glow: "shadow-[0_0_14px_rgba(52,211,153,0.18)]", label: "REVENUE" },
    alert:       { edge: "border-l-amber-400/80",   text: "text-amber-200",   dot: "bg-amber-400",   glow: "shadow-[0_0_14px_rgba(251,191,36,0.18)]", label: "ALERT"   },
    outbound:    { edge: "border-l-cyan-400/80",    text: "text-cyan-200",    dot: "bg-cyan-400",    glow: "shadow-[0_0_14px_rgba(34,211,238,0.18)]", label: "OUTBOUND" },
    maintenance: { edge: "border-l-orange-400/80", text: "text-orange-200",  dot: "bg-orange-400",  glow: "shadow-[0_0_14px_rgba(251,146,60,0.18)]", label: "MAINTENANCE" },
    "ai-exec":   { edge: "border-l-violet-400/80", text: "text-violet-200",  dot: "bg-violet-400",  glow: "shadow-[0_0_14px_rgba(167,139,250,0.18)]", label: "AI EXECUTION" },
    default:     { edge: "border-l-slate-400/60",  text: "text-slate-200",   dot: "bg-slate-400",   glow: "",                                          label: "EVENT" },
};

const truncId = (id) => {
    if (!id) return "—";
    if (id.length <= 14) return `#${id}`;
    return `#${id.slice(0, 6)}…${id.slice(-4)}`;
};

const useAgeTick = () => {
    // Re-render every 5s so the "Xs ago" labels stay fresh.
    const [, setT] = useState(0);
    useEffect(() => {
        const i = window.setInterval(() => setT((n) => n + 1), 5000);
        return () => window.clearInterval(i);
    }, []);
};

const ageLabel = (ts) => {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 5)   return "now";
    if (s < 60)  return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    return `${Math.round(s / 3600)}h ago`;
};

export const LiveActionIDStrip = ({ recentEvents = [], sseLive = false, lastEventTs = 0 }) => {
    useAgeTick();

    return (
        <div
            data-testid="live-action-id-strip"
            data-sse-live={sseLive ? "true" : "false"}
            className="relative mt-6 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-ink-900/85 via-[#06121e]/90 to-ink-900/85 backdrop-blur-md"
        >
            {/* top hairline accent */}
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

            <div className="flex items-stretch gap-3 px-4 py-2.5 lg:gap-4 lg:px-5">
                {/* Static label cap · "LIVE EXECUTION FEED" */}
                <div className="flex flex-shrink-0 items-center gap-2 border-r border-white/10 pr-3 lg:pr-4">
                    <span className="relative inline-flex h-1.5 w-1.5">
                        <span className={`absolute inline-flex h-full w-full rounded-full ${sseLive ? "animate-ping bg-cyan-400 opacity-70" : "bg-slate-500"}`} />
                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${sseLive ? "bg-cyan-400" : "bg-slate-500"}`} />
                    </span>
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.20em] text-slate-300">
                        Live Execution Feed
                    </span>
                    <Radio size={11} className={sseLive ? "text-cyan-300" : "text-slate-500"} />
                </div>

                {/* Scrolling chips */}
                <div className="flex flex-1 items-center gap-2.5 overflow-x-auto pb-0.5 lg:gap-3 cb-strip-scroll" data-testid="live-action-id-strip-chips">
                    {recentEvents.length === 0 ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            Awaiting next operational event…
                        </span>
                    ) : (
                        recentEvents.map((e, idx) => (
                            <ActionChip
                                key={`${e.action_id}-${e.ts}`}
                                event={e}
                                isNewest={idx === 0 && e.ts === lastEventTs}
                            />
                        ))
                    )}
                </div>

                {/* Right-edge "see all" link */}
                <a
                    href="/portal/ops"
                    data-testid="live-action-id-strip-see-all"
                    className="hidden flex-shrink-0 items-center gap-1.5 border-l border-white/10 pl-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-cyan-200 lg:inline-flex lg:pl-4"
                >
                    Operator Console
                    <ArrowUpRight size={11} />
                </a>
            </div>

            <style>{`
                /* Hide scrollbar but keep scrollable on overflow */
                .cb-strip-scroll {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .cb-strip-scroll::-webkit-scrollbar { display: none; }

                @keyframes cb-chip-in {
                    0%   { opacity: 0; transform: translateX(14px); }
                    100% { opacity: 1; transform: translateX(0);    }
                }
                .cb-chip-in {
                    animation: cb-chip-in 0.55s ease-out both;
                    will-change: transform, opacity;
                }
                @keyframes cb-chip-flash-edge {
                    0%   { box-shadow: 0 0 0 1px rgba(34,211,238,0.55), 0 0 18px rgba(34,211,238,0.35); }
                    100% { box-shadow: none; }
                }
                .cb-chip-newest {
                    animation: cb-chip-flash-edge 1.6s ease-out forwards;
                }
                @media (prefers-reduced-motion: reduce) {
                    .cb-chip-in, .cb-chip-newest { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

const ActionChip = ({ event, isNewest }) => {
    const cat = CATEGORY_BY_KIND[event.kind] || "default";
    const s = CATEGORY_STYLES[cat] || CATEGORY_STYLES.default;
    const idShort = truncId(event.action_id);
    const href = event.action_id ? `/?action=${encodeURIComponent(event.action_id)}` : "#";

    return (
        <a
            href={href}
            data-testid={`action-chip-${event.action_id}`}
            data-kind={event.kind}
            data-category={cat}
            className={`group flex flex-shrink-0 items-center gap-2.5 rounded-md border-l-2 ${s.edge} border-y border-r border-white/10 bg-ink-900/60 px-2.5 py-1.5 backdrop-blur-sm transition-all hover:bg-ink-800/70 hover:border-white/20 ${s.glow} cb-chip-in ${isNewest ? "cb-chip-newest" : ""}`}
        >
            {/* category dot */}
            <span className="relative inline-flex h-1.5 w-1.5 flex-shrink-0">
                <span className={`absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-50 ${isNewest ? "animate-ping" : ""}`} />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
            </span>

            {/* category label */}
            <span className={`hidden font-mono text-[8px] font-semibold uppercase tracking-[0.18em] ${s.text} md:inline`}>
                {s.label}
            </span>

            {/* event title */}
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-200 max-w-[200px] truncate">
                {event.title}
            </span>

            {/* Action ID permalink */}
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 transition group-hover:text-cyan-300">
                {idShort}
            </span>

            {/* age */}
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">
                · {ageLabel(event.ts)}
            </span>
        </a>
    );
};

export default LiveActionIDStrip;
