import React from "react";
import {
    Wrench, ClipboardList, Activity, AlertTriangle, ArrowUpCircle,
    FileSignature, Eye, TrendingUp, Layers, Building2, Settings,
} from "lucide-react";

/**
 * <OperationsLifecycleSection />
 *
 * Positions CreatorBoostAI as an operations / maintenance / lifecycle layer
 * that sits on top of existing systems (does NOT replace them).
 *
 * Placement: directly below <GetLeadsSection /> on the homepage, before any
 * pricing/CTA section.
 *
 * Test IDs: ops-section · ops-title · ops-intro · ops-cap-<i> · ops-value-<i> ·
 *           ops-position · ops-close · ops-demos-cta
 */
const CAPABILITIES = [
    { Icon: Wrench,         label: "Track maintenance activity across locations and assets" },
    { Icon: ClipboardList,  label: "Log service history and ongoing work" },
    { Icon: Activity,       label: "Monitor equipment performance over time" },
    { Icon: AlertTriangle,  label: "Identify end-of-life equipment" },
    { Icon: ArrowUpCircle,  label: "Detect upgrade and replacement opportunities" },
    { Icon: FileSignature,  label: "Track service contracts and recurring service activity" },
    { Icon: Eye,            label: "Maintain visibility into customer operations and service needs" },
];

const VALUES = [
    "Reduces missed service opportunities",
    "Improves operational visibility",
    "Helps teams stay proactive instead of reactive",
    "Creates new revenue through upgrades and service",
    "Increases long-term customer value",
];

export const OperationsLifecycleSection = () => (
    <section
        data-testid="ops-section"
        id="ops-lifecycle"
        className="relative border-b border-white/5 bg-ink-900"
    >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 ambient-grid opacity-25" />
            <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 460, height: 460, bottom: -140, left: -120 }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            {/* Title + intro */}
            <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                    <Settings size={12} className="text-cyan-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Operations · Lifecycle · Service
                    </span>
                </div>
                <h2
                    data-testid="ops-title"
                    className="font-heading mt-5 text-balance text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl"
                >
                    Operations, Maintenance, and{" "}
                    <span className="text-cyan-400">Equipment Intelligence.</span>
                </h2>
                <p
                    data-testid="ops-intro"
                    className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg"
                >
                    CreatorBoostAI does more than generate leads — it helps businesses{" "}
                    <span className="font-semibold text-white">manage operations</span>,{" "}
                    <span className="font-semibold text-white">track service activity</span>, and{" "}
                    identify equipment and upgrade opportunities across every customer relationship.
                </p>
            </div>

            {/* Core capabilities */}
            <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Core capabilities
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {CAPABILITIES.map((c, i) => (
                        <li
                            key={c.label}
                            data-testid={`ops-cap-${i}`}
                            className="flex items-start gap-3 rounded-md border border-white/10 bg-ink-700/40 p-4 transition-colors hover:border-cyan-500/40"
                        >
                            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10">
                                <c.Icon size={14} className="text-cyan-300" />
                            </span>
                            <span className="text-sm leading-relaxed text-slate-200 sm:text-base">
                                {c.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Enterprise value */}
            <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-5">
                <div className="lg:col-span-3 rounded-md border border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 via-ink-800 to-ink-900 p-6 lg:p-8">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1">
                        <TrendingUp size={11} className="text-cyan-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            Enterprise value
                        </span>
                    </span>
                    <h3 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl">
                        Turn service into strategy.
                    </h3>
                    <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {VALUES.map((v, i) => (
                            <li
                                key={v}
                                data-testid={`ops-value-${i}`}
                                className="flex items-start gap-2 text-sm text-slate-200"
                            >
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />
                                {v}
                            </li>
                        ))}
                    </ul>
                </div>
                <div
                    data-testid="ops-position"
                    className="lg:col-span-2 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-8"
                >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-900 px-3 py-1">
                        <Layers size={11} className="text-slate-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                            System positioning
                        </span>
                    </span>
                    <p className="mt-4 font-heading text-xl font-semibold leading-snug text-white sm:text-2xl">
                        Sits on top. Doesn’t replace.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                        CreatorBoostAI sits on top of your existing systems and adds
                        sales, operations, and lifecycle intelligence —{" "}
                        <span className="font-semibold text-white">
                            without replacing your infrastructure
                        </span>.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2">
                        <Building2 size={12} className="text-cyan-300" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            Works with what you already own
                        </span>
                    </div>
                </div>
            </div>

            {/* Closing line */}
            <div
                data-testid="ops-close"
                className="mt-12 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-6 lg:p-8"
            >
                <p className="font-heading text-xl font-semibold leading-snug text-white sm:text-2xl">
                    From lead generation to service, maintenance, and upgrades —
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                    the system helps you grow revenue across the{" "}
                    <span className="font-semibold text-white">entire customer lifecycle</span>.
                </p>
            </div>
        </div>
    </section>
);

export default OperationsLifecycleSection;
