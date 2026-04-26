import React from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { EmailCapture } from "@/components/site/EmailCapture";
import { CountrySelector } from "@/components/site/CountrySelector";
import {
    ArrowRight, Play, Building2, ShieldCheck, Mic, ShoppingBag, Plane,
    HardHat, Briefcase, Layers, Brain, TrendingUp, DollarSign, Target,
    Network, Activity, Sparkles, CheckCircle2, Workflow, Users,
} from "lucide-react";

// Real-world business imagery (Unsplash CDN, optimized)
const HERO_BG = "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=2000&q=75"; // diverse team in modern office
const NOT_BL_IMG = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1400&q=75"; // executive boardroom conversation

const INDUSTRIES = [
    {
        id: "real-estate",
        Icon: Building2,
        title: "Real Estate",
        sub: "Brokerages · property management · agents",
        outcomes: [
            "Pipeline + commissions unified across Yardi, AppFolio, Salesforce",
            "AI lead-scoring that doubles closed deals",
            "Automated showings, follow-ups, and renewals",
        ],
        href: "/demo/realtor",
        cta: "Watch Real Estate demo",
        live: true,
    },
    {
        id: "insurance",
        Icon: ShieldCheck,
        title: "Insurance",
        sub: "Agencies · MGAs · brokerages · carriers",
        outcomes: [
            "Catalyst, AMS, underwriting, comms — one command center",
            "SOC 2 + audit-ready trail on every action",
            "Commission transparency from quote to payout",
        ],
        href: "/demo/insurance",
        cta: "Watch Insurance demo",
        live: true,
    },
    {
        id: "creators",
        Icon: Mic,
        title: "Influencers & Creators",
        sub: "Audience monetization · brand-deal automation",
        outcomes: [
            "Audience intelligence that surfaces buyer intent",
            "Brand-deal pipeline auto-built and auto-pitched",
            "Revenue scaling across storefront, paid tiers, and partnerships",
        ],
        href: "/preview",
        cta: "Open Creator preview",
        live: true,
        highlight: true,
    },
    {
        id: "retail",
        Icon: ShoppingBag,
        title: "Retail & Grocery",
        sub: "Multi-store operations · inventory · staff",
        outcomes: [
            "POS, ERP, scheduling, and loss prevention unified",
            "AI-driven demand forecasting and replenishment",
            "Per-store oversight with national rollup view",
        ],
        href: "/contact",
        cta: "Request retail brief",
    },
    {
        id: "airports",
        Icon: Plane,
        title: "Airports & SITA Systems",
        sub: "Operations · concessions · ground handling",
        outcomes: [
            "SITA + airline + concession data overlaid in one view",
            "Throughput, dwell time, revenue per square foot live",
            "Compliance + audit-ready reporting across terminals",
        ],
        href: "/contact",
        cta: "Request airport brief",
    },
    {
        id: "contractors",
        Icon: HardHat,
        title: "Contractors & Service",
        sub: "Trades · field operations · service businesses",
        outcomes: [
            "Job, dispatch, billing, and payroll unified",
            "Auto-quoted estimates and AI-priority dispatch",
            "Margin and crew performance tracked in real time",
        ],
        href: "/contact",
        cta: "Request services brief",
    },
    {
        id: "enterprise",
        Icon: Briefcase,
        title: "Enterprise",
        sub: "Multi-region · regulated industries",
        outcomes: [
            "Dedicated infrastructure, SOC 2, custom integrations",
            "Multi-tenant Command Center for divisions and regions",
            "Named CSM and executive sponsor for every deployment",
        ],
        href: "/pricing",
        cta: "Talk to sales",
    },
];

const INTEGRATIONS = [
    "Salesforce", "HubSpot", "Yardi", "AppFolio", "QuickBooks",
    "RealPage", "MRI", "Catalyst", "Applied Epic", "Follow Up Boss",
    "kvCORE", "Slack", "Twilio", "Zapier", "Stripe", "Shopify",
];

export default function HomePage() {
    return (
        <Layout>
            {/* HERO */}
            <section
                className="relative isolate overflow-hidden border-b border-white/5"
                data-testid="hero-section"
            >
                <div className="absolute inset-0 -z-10">
                    <img src={HERO_BG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/85 via-ink-900/95 to-ink-900" />
                    <div className="absolute inset-0 ambient-grid opacity-30" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 620, height: 620, top: -240, left: -160 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 480, height: 480, bottom: -200, right: -120 }} />
                </div>

                <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 fade-in-up">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Enterprise AI Operating System · Live</span>
                    </div>

                    <h1
                        className="font-heading mt-6 max-w-5xl text-balance text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-7xl fade-in-up"
                        style={{ animationDelay: "80ms" }}
                        data-testid="hero-headline"
                    >
                        Run Your Entire Business With AI That{" "}
                        <span className="text-cyan-400">Thinks, Decides, and Executes.</span>
                    </h1>

                    <p
                        className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg fade-in-up"
                        style={{ animationDelay: "160ms" }}
                        data-testid="hero-sub"
                    >
                        CreatorBoostAI™ combined with BodyIQ-AI™ increases revenue, reduces costs, and scales operations
                        across every revenue-driven industry — through real-time automation, business intelligence, and
                        execution on top of the systems you already use.
                    </p>

                    <CountrySelector />

                    <div
                        className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap fade-in-up"
                        style={{ animationDelay: "240ms" }}
                        data-testid="hero-ctas"
                    >
                        <Link
                            to="/demo"
                            data-testid="hero-cta-watch-demo"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]"
                        >
                            <Play size={14} fill="currentColor" /> Watch Demo
                        </Link>
                        <a
                            href="#industries"
                            data-testid="hero-cta-see-industry"
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                        >
                            See Your Industry <ArrowRight size={14} />
                        </a>
                        <Link
                            to="/apply/strategy"
                            data-testid="hero-cta-request-access"
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition-all hover:border-cyan-500/50 hover:text-cyan-400"
                        >
                            Request Access
                        </Link>
                    </div>

                    {/* Trust strip */}
                    <div className="mt-14 grid grid-cols-2 gap-6 border-t border-white/5 pt-8 sm:grid-cols-4">
                        <TrustStat Icon={TrendingUp} value="+34%" label="Avg revenue lift" />
                        <TrustStat Icon={DollarSign} value="-22%" label="Operating cost cut" />
                        <TrustStat Icon={Workflow} value="40+" label="Systems unified" />
                        <TrustStat Icon={Users} value="7" label="Industries served" />
                    </div>
                </div>
            </section>

            {/* INDUSTRIES */}
            <section id="industries" className="border-b border-white/5 py-20" data-testid="industries-section">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">01 / Verticals</p>
                        <h2 className="font-heading mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                            Built for Every <span className="text-cyan-400">Revenue-Driven Industry.</span>
                        </h2>
                        <p className="mt-4 text-base leading-relaxed text-slate-300">
                            One unified AI operating system. Vertical-specific execution playbooks for the operations that
                            actually drive your revenue.
                        </p>
                    </div>

                    <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {INDUSTRIES.map((ind) => (
                            <IndustryTile key={ind.id} ind={ind} />
                        ))}
                    </div>
                </div>
            </section>

            {/* NOT BODY LANGUAGE */}
            <section
                className="relative border-b border-white/5 py-20"
                data-testid="not-body-language-section"
            >
                <div className="absolute inset-0 -z-10">
                    <img src={NOT_BL_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/95 to-ink-900" />
                </div>
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">02 / Positioning</p>
                    <h2 className="font-heading mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                        This Is Not Body Language.{" "}
                        <span className="text-cyan-400">This Is Business Intelligence.</span>
                    </h2>
                    <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        BodyIQ-AI is the intelligence layer that powers decision-making inside the operating system. It
                        enhances communication, detects buyer intent, increases closing rates, and drives revenue
                        performance — not health, not wellness, not soft skills.
                    </p>

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Pillar Icon={Brain} title="Intent Detection" body="Reads engagement, hesitation, and commitment signals across every channel." />
                        <Pillar Icon={Target} title="Closing Performance" body="Surfaces the right move, in the right window, with the right risk profile." />
                        <Pillar Icon={Activity} title="Communication Lift" body="Coaches reps, leaders, and ops teams with real-time strategic recommendations." />
                        <Pillar Icon={DollarSign} title="Revenue Outcomes" body="Tied to dollars: attribution, conversion, lifetime value, retention." />
                    </div>
                </div>
            </section>

            {/* INTEGRATIONS */}
            <section className="border-b border-white/5 py-20" data-testid="integrations-section">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">03 / Compatibility</p>
                    <h2 className="font-heading mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                        Works With the <span className="text-cyan-400">Systems You Already Use.</span>
                    </h2>
                    <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        CreatorBoostAI is an overlay — it does not rip and replace. We oversee, connect, and improve every
                        system from one command center. Your team keeps its tools. Your data stays where it is. Your
                        operations get unified intelligence and execution.
                    </p>

                    <div className="mt-10 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-10">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                            <Network size={13} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Native overlays</span>
                            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">+ custom integrations available</span>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                            {INTEGRATIONS.map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-center rounded-sm border border-white/10 bg-ink-900 px-3 py-3 font-heading text-sm text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                                >
                                    {i}
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <Capability Icon={Layers} label="Oversee" body="One operational view across every connected system." />
                            <Capability Icon={Sparkles} label="Connect" body="Bidirectional sync — data flows where decisions need it." />
                            <Capability Icon={Workflow} label="Execute" body="Recommended actions fire automatically, with full audit trails." />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA STRIP */}
            <section className="py-16" data-testid="home-cta-strip">
                <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
                    <h2 className="font-heading text-3xl font-semibold leading-tight text-white sm:text-4xl">
                        Ready to <span className="text-cyan-400">execute?</span>
                    </h2>
                    <p className="mt-4 text-base text-slate-300">
                        Watch a vertical demo, open the read-only Command Center preview, or apply for a strategy call.
                    </p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link to="/demo" data-testid="home-cta-demo" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 hover:bg-cyan-400">
                            <Play size={14} fill="currentColor" /> Watch Demo
                        </Link>
                        <Link to="/preview" data-testid="home-cta-preview" className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                            Open Command Center
                        </Link>
                        <Link to="/apply/strategy" data-testid="home-cta-apply" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-transparent px-6 py-3.5 text-sm font-semibold text-white hover:border-cyan-500/50 hover:text-cyan-400">
                            Request Access
                        </Link>
                    </div>
                </div>
            </section>

            <EmailCapture />
        </Layout>
    );
}

const TrustStat = ({ Icon, value, label }) => (
    <div>
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        </div>
        <p className="font-heading mt-1.5 text-2xl font-semibold text-white sm:text-3xl">{value}</p>
    </div>
);

const IndustryTile = ({ ind }) => (
    <Link
        to={ind.href}
        data-testid={`industry-tile-${ind.id}`}
        className={`group relative flex flex-col rounded-md border p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(6,182,212,0.18)] ${
            ind.highlight
                ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent"
                : "border-white/10 bg-ink-700/40 hover:border-cyan-500/40"
        }`}
    >
        <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/5">
                <ind.Icon size={17} className="text-cyan-300" />
            </div>
            {ind.live ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">Live</span>
            ) : (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">In production</span>
            )}
        </div>
        <h3 className="font-heading mt-5 text-xl font-semibold text-white">{ind.title}</h3>
        <p className="mt-1 text-xs font-mono uppercase tracking-[0.18em] text-slate-400">{ind.sub}</p>
        <ul className="mt-5 space-y-2.5">
            {ind.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 size={13} className="mt-1 flex-shrink-0 text-cyan-400" />
                    <span className="leading-relaxed">{o}</span>
                </li>
            ))}
        </ul>
        <div className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
            {ind.cta} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </div>
    </Link>
);

const Pillar = ({ Icon, title, body }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5">
            <Icon size={16} className="text-cyan-400" />
        </div>
        <h3 className="font-heading mt-4 text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
);

const Capability = ({ Icon, label, body }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
        <div className="flex items-center gap-2">
            <Icon size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{label}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
);
