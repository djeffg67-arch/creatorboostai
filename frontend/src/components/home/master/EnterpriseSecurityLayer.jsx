import React from "react";
import {
    ShieldCheck, Lock, Fingerprint, ScrollText, KeyRound,
    Cloud, Network, BadgeCheck,
} from "lucide-react";

/**
 * EnterpriseSecurityLayer · Iter 96+
 * --------------------------------------------------------------------
 * Dark enterprise security strip. SOC 2 Type II Ready badge + 8 trust
 * pillars + "Your data. Your control." sovereignty card.
 */

const PILLARS = [
    { id: "soc2",        icon: BadgeCheck,   label: "SOC 2 Type II Ready",      sub: "Audit-aligned controls" },
    { id: "encryption",  icon: Lock,         label: "Encrypted Infrastructure", sub: "End-to-end · at rest + transit" },
    { id: "perms",       icon: KeyRound,     label: "Permission-Based Execution", sub: "Role-aware action gating" },
    { id: "governance",  icon: ScrollText,   label: "Governance Layer",         sub: "Approval flows · policy sync" },
    { id: "audit",       icon: Fingerprint,  label: "Action ID Tracking",       sub: "Every event has a permalink" },
    { id: "integrations",icon: Network,      label: "Secure Integrations",      sub: "API tokens · scoped + rotatable" },
    { id: "logs",        icon: ShieldCheck,  label: "Audit Logging",            sub: "Immutable, queryable trail" },
    { id: "data",        icon: Cloud,        label: "Proprietary Data Control", sub: "Your data stays yours" },
];

export const EnterpriseSecurityLayer = () => {
    return (
        <section
            id="security-layer"
            data-testid="enterprise-security-layer"
            className="relative isolate border-b border-white/5 bg-gradient-to-b from-ink-900 via-[#03101a] to-ink-900 py-20 lg:py-24"
        >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(34,211,238,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.35)_1px,transparent_1px)] [background-size:50px_50px]" />
                <div className="absolute -top-1/3 right-0 h-[80%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.10),transparent_70%)] blur-3xl" />
            </div>

            <div className="mx-auto max-w-[1480px] px-5 lg:px-10">
                <div className="max-w-3xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/90" data-testid="security-kicker">
                        04 / Enterprise Security & Sovereignty
                    </p>
                    <h2 className="font-heading mt-3 text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl" data-testid="security-h2">
                        Enterprise Security &
                        <br />
                        <span className="text-cyan-400">Sovereignty Layer.</span>
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                        Built with enterprise-grade security, permissioned execution, and compliance-first
                        architecture so your data stays protected and under your control — always.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                    {/* Pillars · 8 cards spanning 2 cols */}
                    <ul
                        data-testid="security-pillars"
                        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-4"
                    >
                        {PILLARS.map((p, idx) => {
                            const Icon = p.icon;
                            return (
                                <li
                                    key={p.id}
                                    data-testid={`security-pillar-${p.id}`}
                                    className="group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-white/10 bg-ink-800/40 p-4 backdrop-blur-sm transition-all hover:border-cyan-500/40 hover:bg-cyan-500/5"
                                    style={{ animation: `secFadeIn 0.6s ease-out ${0.04 * idx}s both` }}
                                >
                                    <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500/10 ring-1 ring-cyan-500/30">
                                        <Icon size={15} className="text-cyan-300" strokeWidth={1.7} />
                                    </div>
                                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                                        {p.label}
                                    </p>
                                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                                        {p.sub}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Sovereignty card */}
                    <div
                        data-testid="security-sovereignty-card"
                        className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-ink-800/60 to-violet-500/10 p-6 ring-1 ring-cyan-500/20 backdrop-blur-md"
                    >
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
                                <BadgeCheck size={12} className="text-emerald-300" />
                                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                                    SOC 2 Type II · Ready
                                </span>
                            </div>
                            <h3 className="font-heading mt-5 text-2xl font-semibold leading-tight text-white">
                                Your Data. Your Control.
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-slate-300">
                                Your proprietary operational data remains under your control. CreatorBoostAI operates
                                as a governed execution layer — not a data ownership platform. We never train on your
                                data. We never resell it.
                            </p>
                            <ul className="mt-4 space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2">
                                    <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" />
                                    <span>End-to-end encryption · zero-knowledge by default</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" />
                                    <span>Read-only mode available for risk-averse rollouts</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" />
                                    <span>Human approval gates on high-stakes actions</span>
                                </li>
                            </ul>
                        </div>
                        <a
                            href="/security"
                            data-testid="security-learn-more"
                            className="mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200 transition hover:border-cyan-400/70 hover:bg-cyan-500/20"
                        >
                            Read Security Brief →
                        </a>
                        {/* corner brackets */}
                        <span aria-hidden className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-cyan-400/60" />
                        <span aria-hidden className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-cyan-400/60" />
                        <span aria-hidden className="absolute left-2 bottom-2 h-4 w-4 border-l-2 border-b-2 border-cyan-400/60" />
                        <span aria-hidden className="absolute right-2 bottom-2 h-4 w-4 border-r-2 border-b-2 border-cyan-400/60" />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes secFadeIn {
                    0%   { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0);    }
                }
            `}</style>
        </section>
    );
};

export default EnterpriseSecurityLayer;
