import React from "react";
import { Link } from "react-router-dom";
import {
    Plane, Home, ShoppingBag, Factory, Truck, HeartPulse,
    HardHat, Briefcase, Rocket, Mic, ShieldCheck, Hammer,
    GraduationCap, FileSpreadsheet, ArrowRight,
} from "lucide-react";

/**
 * IndustrySelectorMaster · Iter 96+
 * --------------------------------------------------------------------
 * 14 vertical industry cards. Click → /demo/{slug}. Each card has a
 * cinematic dark-graded thumbnail, a blue operational glow on hover,
 * and a 3-bullet capability list mirroring the master mockup.
 *
 * Imagery: Unsplash CDN with dark gradient grading + cyan tint overlay
 * for visual consistency. No external API calls — all static URLs.
 */

const u = (id, q = 78) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=${q}`;

const INDUSTRIES = [
    {
        slug: "airports", name: "Airports", icon: Plane,
        img: u("1436491865332-7a61a109cc05"), // airliner
        bullets: ["Asset Intelligence", "Maintenance", "Revenue Optimization", "Safety & Compliance"],
        live: true,
    },
    {
        slug: "real-estate", name: "Real Estate", icon: Home,
        img: u("1560518883-ce09059eeffa"), // luxury exterior
        bullets: ["Lead Capture · AI Scoring", "Follow-up Pipeline", "Closings"],
        live: true,
    },
    {
        slug: "retail", name: "Retail & Grocery", icon: ShoppingBag,
        img: u("1604719312566-8912e9227c6a"), // supermarket aisle
        bullets: ["Inventory · Supply Chain", "Demand Forecasting", "Shrinkage Control", "Workforce Planning"],
        live: true,
    },
    {
        slug: "manufacturing", name: "Manufacturing", icon: Factory,
        img: u("1565043666747-69f6646db940"), // factory robot arm
        bullets: ["Production Optimization", "Quality Control", "Maintenance", "Supply Chain"],
        live: false,
    },
    {
        slug: "logistics", name: "Logistics", icon: Truck,
        img: u("1586528116311-ad8dd3c8310d"), // logistics truck fleet
        bullets: ["Fleet Management", "Route Optimization", "Deliveries · Tracking", "Fuel & Performance"],
        live: false,
    },
    {
        slug: "healthcare", name: "Healthcare", icon: HeartPulse,
        img: u("1576091160399-112ba8d25d1d"), // hospital corridor
        bullets: ["Patient Flow", "Scheduling", "Billing & Claims", "Compliance"],
        live: false,
    },
    {
        slug: "construction", name: "Construction", icon: HardHat,
        img: u("1541888946425-d81bb19240f5"), // construction site
        bullets: ["Project Tracking", "Budget Control", "Safety Compliance", "Subcontractor Mgmt."],
        live: false,
    },
    {
        slug: "sales-teams", name: "Sales Teams", icon: Briefcase,
        img: u("1556761175-5973dc0f32e7"), // diverse modern team meeting
        bullets: ["Lead Management", "AI Outreach", "Forecasting", "Commissions"],
        live: true,
    },
    {
        slug: "startup-owners", name: "Startup Owners", icon: Rocket,
        img: u("1556761175-b413da4baf72"), // startup workspace
        bullets: ["Business Planning", "Funding · Loans", "Website + Branding", "Lead Generation"],
        live: true,
    },
    {
        slug: "influencers", name: "Influencers", icon: Mic,
        img: u("1556761175-4b46a572b786"), // creator setup with ring light
        bullets: ["Brand Deals", "Campaign Mgmt.", "Audience Growth", "Monetization"],
        live: true,
    },
    {
        slug: "insurance", name: "Insurance Operations", icon: ShieldCheck,
        img: u("1450101499163-c8848c66ca85"), // documents on table
        bullets: ["Policy Lifecycle", "Claims Routing", "Renewal Outreach", "Compliance & Audit"],
        live: true,
    },
    {
        slug: "contractors", name: "Contractors", icon: Hammer,
        img: u("1581094271901-8022df4466f9"), // contractor on site
        bullets: ["Job Pipeline", "Estimates → Invoices", "Crew Scheduling", "Permit Tracking"],
        live: false,
    },
    {
        slug: "schools", name: "Schools", icon: GraduationCap,
        img: u("1580582932707-520aed937b7b"), // campus building
        bullets: ["Enrollment Funnel", "Parent Communications", "Operations + Facilities", "Compliance Reports"],
        live: false,
    },
    {
        slug: "mortgage", name: "Mortgage Operations", icon: FileSpreadsheet,
        img: u("1554224155-6726b3ff858f"), // financial documents
        bullets: ["Application Routing", "Document Collection", "Underwriting Sync", "Closing Coordination"],
        live: false,
    },
];

export const IndustrySelectorMaster = () => {
    return (
        <section
            id="industry-selector"
            data-testid="industry-selector-master"
            className="relative isolate border-b border-white/5 bg-ink-900 py-20 lg:py-24"
        >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(34,211,238,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.4)_1px,transparent_1px)] [background-size:80px_80px]" />
                <div className="absolute -top-1/4 left-1/2 h-[80%] w-[80%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.10),transparent_70%)] blur-3xl" />
            </div>

            <div className="mx-auto max-w-[1480px] px-5 lg:px-10">
                <div className="max-w-3xl">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/90" data-testid="industry-kicker">
                        02 / Verticals
                    </p>
                    <h2 className="font-heading mt-3 text-3xl font-semibold leading-[1.1] text-white sm:text-4xl lg:text-5xl" data-testid="industry-h2">
                        Choose Your <span className="text-cyan-400">Business Type.</span>
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                        The system adapts to your industry. The execution never stops. 14 verticals · vertical-specific
                        playbooks · same operating system underneath.
                    </p>
                </div>

                <div
                    data-testid="industry-cards-grid"
                    className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {INDUSTRIES.map((ind, idx) => (
                        <IndustryCard key={ind.slug} ind={ind} index={idx} />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes industryFadeIn {
                    0%   { opacity: 0; transform: translateY(14px); }
                    100% { opacity: 1; transform: translateY(0);    }
                }
            `}</style>
        </section>
    );
};

const IndustryCard = ({ ind, index }) => {
    const Icon = ind.icon;
    return (
        <Link
            to={`/demo/${ind.slug}`}
            data-testid={`industry-card-${ind.slug}`}
            className="group relative isolate flex flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-ink-800/60 to-ink-900/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_0_36px_rgba(34,211,238,0.25)]"
            style={{ animation: `industryFadeIn 0.6s ease-out ${0.04 * index}s both` }}
        >
            {/* Thumbnail */}
            <div className="relative h-44 overflow-hidden">
                <img
                    src={ind.img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover saturate-[0.85] brightness-75 transition-transform duration-700 group-hover:scale-[1.06]"
                />
                {/* dark grading + cyan tint */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/55 to-ink-900/15" />
                <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {/* corner indicators */}
                <span aria-hidden className="absolute left-2 top-2 h-3 w-3 border-l border-t border-cyan-400/70" />
                <span aria-hidden className="absolute right-2 top-2 h-3 w-3 border-r border-t border-cyan-400/70" />
                {/* live badge */}
                {ind.live && (
                    <div className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 backdrop-blur-md">
                        <span className="relative inline-flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </span>
                        <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Live</span>
                    </div>
                )}
                {/* icon chip */}
                <div className="absolute left-2.5 bottom-2.5 inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-ink-900/70 px-2 py-1 backdrop-blur-md">
                    <Icon size={12} className="text-cyan-300" />
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                        {ind.name}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-2 px-4 py-4">
                <ul className="space-y-1.5">
                    {ind.bullets.slice(0, 4).map((b) => (
                        <li key={b} className="flex items-start gap-2 text-[12px] text-slate-300">
                            <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400/70" />
                            <span>{b}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                        Vertical Playbook
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300 transition-transform duration-300 group-hover:translate-x-0.5">
                        View Demo <ArrowRight size={11} />
                    </span>
                </div>
            </div>

            {/* hover glow border */}
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-cyan-500/0 transition-all duration-300 group-hover:ring-cyan-500/40" />
        </Link>
    );
};

export default IndustrySelectorMaster;
