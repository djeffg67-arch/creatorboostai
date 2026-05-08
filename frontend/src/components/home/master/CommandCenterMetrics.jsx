import React, { useEffect, useRef, useState } from "react";
import {
    DollarSign, Users, Briefcase, CheckCircle2, Sparkles, Plug,
    Workflow, PiggyBank,
} from "lucide-react";

/**
 * CommandCenterMetrics · Iter 96+
 * --------------------------------------------------------------------
 * "ONE COMMAND CENTER. EVERY OPERATION." — 8 animated KPI panels that
 * count up from 0 → final value when the section enters the viewport.
 * Pure CSS + rAF; no charts library. GPU-friendly.
 */

const PANELS = [
    { id: "revenue",        label: "Revenue Impact",         end: 1420000,  prefix: "$", suffix: "",   format: "compact",  delta: "+18%",  icon: DollarSign,    tone: "emerald" },
    { id: "leads",          label: "Leads Captured",         end: 342,      prefix: "",  suffix: "",   format: "comma",    delta: "+24%",  icon: Users,         tone: "cyan"    },
    { id: "deals",          label: "Deals in Pipeline",      end: 128,      prefix: "",  suffix: "",   format: "comma",    delta: "+15%",  icon: Briefcase,     tone: "violet"  },
    { id: "tasks",          label: "Tasks Completed",        end: 1247,     prefix: "",  suffix: "",   format: "comma",    delta: "+31%",  icon: CheckCircle2,  tone: "amber"   },
    { id: "ai-actions",     label: "AI Actions Executed",    end: 287,      prefix: "",  suffix: "",   format: "comma",    delta: "today", icon: Sparkles,      tone: "cyan"    },
    { id: "integrations",   label: "System Integrations",    end: 42,       prefix: "",  suffix: "",   format: "comma",    delta: "Live",  icon: Plug,          tone: "emerald" },
    { id: "automations",    label: "Workflow Automations",   end: 156,      prefix: "",  suffix: "",   format: "comma",    delta: "Active",icon: Workflow,      tone: "violet"  },
    { id: "savings",        label: "Operational Savings",    end: 612000,   prefix: "$", suffix: "",   format: "compact",  delta: "+27%",  icon: PiggyBank,     tone: "amber"   },
];

const TONE_CLS = {
    emerald: { ring: "ring-emerald-500/30", glow: "shadow-[0_0_28px_rgba(16,185,129,0.18)]", text: "text-emerald-300", icon: "text-emerald-400", bar: "from-emerald-500/60 to-emerald-400/30" },
    cyan:    { ring: "ring-cyan-500/30",    glow: "shadow-[0_0_28px_rgba(34,211,238,0.20)]", text: "text-cyan-300",    icon: "text-cyan-400",    bar: "from-cyan-500/60 to-cyan-400/30"       },
    violet:  { ring: "ring-violet-500/30",  glow: "shadow-[0_0_28px_rgba(139,92,246,0.18)]", text: "text-violet-300",  icon: "text-violet-400",  bar: "from-violet-500/60 to-violet-400/30"   },
    amber:   { ring: "ring-amber-500/30",   glow: "shadow-[0_0_28px_rgba(245,158,11,0.18)]", text: "text-amber-300",   icon: "text-amber-400",   bar: "from-amber-500/60 to-amber-400/30"     },
};

const formatValue = (n, fmt, prefix, suffix) => {
    let str;
    if (fmt === "compact") {
        if (n >= 1e6) str = (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
        else if (n >= 1e3) str = (n / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K";
        else str = String(Math.round(n));
    } else if (fmt === "comma") {
        str = Math.round(n).toLocaleString();
    } else {
        str = String(Math.round(n));
    }
    return `${prefix}${str}${suffix}`;
};

const useCountUp = (end, duration = 1400, start = false) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!start) return;
        let raf;
        const t0 = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setVal(end * eased);
            if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [end, duration, start]);
    return val;
};

export const CommandCenterMetrics = () => {
    const sectionRef = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el || typeof IntersectionObserver === "undefined") {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
            { threshold: 0.15 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            id="command-center"
            data-testid="command-center-metrics"
            className="relative isolate border-b border-white/5 bg-gradient-to-b from-ink-900 via-[#040d18] to-ink-900 py-20 lg:py-24"
        >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(34,211,238,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.4)_1px,transparent_1px)] [background-size:60px_60px]" />
            </div>

            <div className="mx-auto max-w-[1480px] px-5 lg:px-10">
                <div className="max-w-3xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/90" data-testid="cc-kicker">
                        03 / Command Center
                    </p>
                    <h2 className="font-heading mt-3 text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl" data-testid="cc-h2">
                        One Command Center. <span className="text-cyan-400">Every Operation.</span>
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                        Everything connected. Everything running. Everything accountable. Real numbers from your live
                        operating layer — not vanity dashboards.
                    </p>
                </div>

                <div
                    data-testid="cc-panels-grid"
                    className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {PANELS.map((p, idx) => (
                        <MetricPanel key={p.id} panel={p} index={idx} start={inView} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const MetricPanel = ({ panel, index, start }) => {
    const Icon = panel.icon;
    const tone = TONE_CLS[panel.tone];
    const v = useCountUp(panel.end, 1400 + index * 80, start);
    return (
        <div
            data-testid={`cc-panel-${panel.id}`}
            className={`relative overflow-hidden rounded-xl border border-white/10 bg-ink-800/40 p-5 ring-1 ${tone.ring} ${tone.glow} backdrop-blur-sm transition-transform hover:-translate-y-0.5`}
            style={{ animation: `ccFadeIn 0.7s ease-out ${0.05 * index}s both` }}
        >
            {/* top-edge accent bar */}
            <span aria-hidden className={`absolute left-0 top-0 h-px w-full bg-gradient-to-r ${tone.bar}`} />
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
                    <Icon size={16} className={tone.icon} strokeWidth={1.7} />
                </div>
                <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.text}`}>
                    {panel.delta}
                </span>
            </div>
            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                {panel.label}
            </p>
            <p
                className="font-heading mt-1.5 text-3xl font-semibold tabular-nums text-white"
                data-testid={`cc-value-${panel.id}`}
            >
                {formatValue(v, panel.format, panel.prefix, panel.suffix)}
            </p>
            {/* shimmer sweep */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:translate-x-full"
            />
            <style>{`
                @keyframes ccFadeIn {
                    0%   { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0);    }
                }
            `}</style>
        </div>
    );
};

export default CommandCenterMetrics;
