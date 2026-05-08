import React from "react";
import { Crown, Settings2, TrendingUp, UserCheck, Mic, Rocket } from "lucide-react";

/**
 * BuiltForEveryRole · Iter 96+
 * --------------------------------------------------------------------
 * 6 role tiles — owners/exec, ops, sales, employees, influencers,
 * founders. Each tile uses an Unsplash portrait with dark cinematic
 * grading and an icon overlay.
 */

const u = (id, q = 78) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=${q}`;

const ROLES = [
    {
        id: "owners",
        title: "Owners & Executives",
        tagline: "See everything. Drive growth.",
        icon: Crown,
        img: u("1560250097-0b93528c311a"), // executive portrait
        bullets: ["Real-time P&L visibility", "Cross-team oversight", "Audit-ready reports"],
    },
    {
        id: "operations",
        title: "Operations Teams",
        tagline: "Run smoother. Fix faster.",
        icon: Settings2,
        img: u("1573497019418-b400bb3ab074"), // operations professional
        bullets: ["Workflow automations", "Maintenance scheduling", "Incident routing"],
    },
    {
        id: "sales",
        title: "Sales Teams",
        tagline: "Close more. Earn more.",
        icon: TrendingUp,
        img: u("1507003211169-0a1dd7228f2d"), // sales professional
        bullets: ["AI-scored leads", "Auto-follow-ups", "Pipeline forecasting"],
    },
    {
        id: "employees",
        title: "Employees",
        tagline: "Know what to do. Get it done.",
        icon: UserCheck,
        img: u("1573496359142-b8d87734a5a2"), // smiling team member
        bullets: ["Daily action lists", "Clear approvals", "Less back-and-forth"],
    },
    {
        id: "influencers",
        title: "Influencers",
        tagline: "Grow audience. Monetize smarter.",
        icon: Mic,
        img: u("1607990281513-2c110a25bd8c"), // creator with phone
        bullets: ["Brand deal pipeline", "Content scheduling", "Sponsor outreach"],
    },
    {
        id: "founders",
        title: "Founders & Startup Owners",
        tagline: "Build. Launch. Scale faster.",
        icon: Rocket,
        img: u("1519085360753-af0119f7cbe7"), // founder portrait
        bullets: ["Go-to-market plan", "Lead engine setup", "Investor-ready metrics"],
    },
];

export const BuiltForEveryRole = () => {
    return (
        <section
            id="built-for-every-role"
            data-testid="built-for-every-role"
            className="relative isolate border-b border-white/5 bg-ink-900 py-20 lg:py-24"
        >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(34,211,238,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.35)_1px,transparent_1px)] [background-size:60px_60px]" />
            </div>

            <div className="mx-auto max-w-[1480px] px-5 lg:px-10">
                <div className="max-w-3xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/90" data-testid="roles-kicker">
                        05 / Roles
                    </p>
                    <h2 className="font-heading mt-3 text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl" data-testid="roles-h2">
                        Built for <span className="text-cyan-400">Every Role.</span>
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                        From the owner to the front line — everyone operates with clarity. One operating layer that
                        adapts to what each role actually needs.
                    </p>
                </div>

                <div data-testid="roles-grid" className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {ROLES.map((r, idx) => (
                        <RoleCard key={r.id} role={r} index={idx} />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes roleFadeIn {
                    0%   { opacity: 0; transform: translateY(12px); }
                    100% { opacity: 1; transform: translateY(0);    }
                }
            `}</style>
        </section>
    );
};

const RoleCard = ({ role, index }) => {
    const Icon = role.icon;
    return (
        <div
            data-testid={`role-card-${role.id}`}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-ink-800/40 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_0_28px_rgba(34,211,238,0.18)]"
            style={{ animation: `roleFadeIn 0.6s ease-out ${0.05 * index}s both` }}
        >
            <div className="relative h-48 overflow-hidden">
                <img
                    src={role.img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover saturate-[0.85] brightness-75 transition-transform duration-700 group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/65 to-ink-900/20" />
                <div className="absolute inset-0 bg-cyan-500/8 mix-blend-overlay opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-ink-900/70 px-2 py-1 backdrop-blur-md">
                    <Icon size={12} className="text-cyan-300" strokeWidth={1.7} />
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                        {role.title}
                    </span>
                </div>
            </div>
            <div className="px-5 py-5">
                <p className="font-heading text-lg font-semibold leading-tight text-white">
                    {role.tagline}
                </p>
                <ul className="mt-3 space-y-1.5">
                    {role.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-[12px] text-slate-300">
                            <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400/70" />
                            <span>{b}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default BuiltForEveryRole;
