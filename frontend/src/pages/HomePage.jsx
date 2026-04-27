import React from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { EmailCapture } from "@/components/site/EmailCapture";
import { CountrySelector } from "@/components/site/CountrySelector";
import { INDUSTRY_IMG, DEMO_IMG, SECTION_BG } from "@/lib/images";
import {
    ArrowRight, Play, Building2, ShieldCheck, Mic, ShoppingBag, Plane,
    HardHat, Briefcase, Layers, Brain, TrendingUp, DollarSign, Target,
    Network, Activity, Sparkles, CheckCircle2, Workflow, Users, Scale,
    UserCog, Package, Video, FileText, ShoppingCart, Fuel,
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
        href: "/demo/creator",
        cta: "Watch Creator demo",
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
        id: "retail",
        Icon: ShoppingCart,
        title: "Supermarket · C-Store · Retail",
        sub: "Grocery · convenience · forecourt · loyalty",
        outcomes: [
            "CreatorBoostAI sits on top of SAP, Oracle Retail, Salesforce, Blue Yonder, ServiceChannel, Manhattan TMS",
            "BodyIQ-AI defines shelf hesitation, checkout friction, and forecourt behavior at the SRS · CPS · EOS signal level",
            "18-scene cinematic walkthrough · ~12 min · supermarket + C-store + fuel + fleet · share + QR ready",
        ],
        href: "/demo/supermarket",
        cta: "Watch Retail Demo",
        live: true,
        highlight: true,
    },
    {
        id: "enterprise",
        Icon: Briefcase,
        title: "Enterprise · Noldus / Investor Cut",
        sub: "Behavioral measurement · decision intelligence · autonomous execution",
        outcomes: [
            "Noldus FaceReader-grade signals enter the BodyIQ-AI Intelligence Layer",
            "Decisions execute autonomously inside CreatorBoostAI — global KPIs visible in one command center",
            "12-scene cinematic walkthrough · ~6.5 min · Nova voice · share + QR ready for trade shows",
        ],
        href: "/demo/noldus",
        cta: "Watch Enterprise Demo",
        live: true,
        highlight: true,
    },
];

const INTEGRATIONS = [
    "Salesforce", "HubSpot", "Yardi", "AppFolio", "QuickBooks",
    "RealPage", "MRI", "Catalyst", "Applied Epic", "Follow Up Boss",
    "kvCORE", "Slack", "Twilio", "Zapier", "Stripe", "Shopify",
];

const AUDIENCES = [
    { id: "enterprise-sales", Icon: Briefcase, label: "Enterprise Sales Teams" },
    { id: "law-firms",        Icon: Scale,     label: "Law Firms & Trial Strategy" },
    { id: "real-estate",      Icon: Building2, label: "Real Estate Professionals" },
    { id: "insurance",        Icon: ShieldCheck, label: "Insurance Agencies" },
    { id: "corporate",        Icon: UserCog,   label: "Corporate Leaders & Hiring" },
    { id: "creators",         Icon: Mic,       label: "Influencers & Negotiators" },
];

const SIGNAL_PRODUCTS = [
    {
        id: "signal-pack",
        Icon: Package,
        kicker: "Vol. 1 · Closing Intelligence",
        title: "BodyIQ-AI Signal Pack",
        body: "15–25 labeled signal video clips with structured definitions, decision moments, execution actions, and a What You Missed breakdown. Instant download.",
        priceLabel: "$299 · $499 · $1,500+ License",
        ctaLabel: "Buy Signal Pack",
        href: "/products/signal-pack",
        badge: "Now",
        highlight: true,
    },
    {
        id: "audit",
        Icon: Video,
        kicker: "Service",
        title: "Video Signal Intelligence Audit",
        body: "We analyze recorded video — meetings, negotiations, presentations, interviews, jury footage — and return a signal timeline, key clips, missed opportunities, and execution recommendations. (Video only — we do not analyze phone calls.)",
        priceLabel: "$1,500 · $3,500 · $7,500+",
        ctaLabel: "Request an Audit",
        href: "/services/audit",
    },
    {
        id: "report",
        Icon: FileText,
        kicker: "Engagement",
        title: "Full Signal Intelligence Report",
        body: "End-to-end video breakdown, decision mapping, resistance & alignment identification, plus insight + execution strategy for high-stakes sales or legal engagements.",
        priceLabel: "$10,000 – $35,000+",
        ctaLabel: "Request a Report",
        href: "/services/report",
    },
];

const DEMO_SELECTOR = [
    {
        id: "realtor",
        href: "/demo/realtor",
        Icon: Building2,
        kicker: "Real Estate",
        title: "Brokerages, agents, property mgmt.",
        runtime: "15 scenes · ~13 min",
        tags: ["Yardi", "Salesforce", "FUB", "kvCORE"],
        live: true,
    },
    {
        id: "insurance",
        href: "/demo/insurance",
        Icon: ShieldCheck,
        kicker: "Insurance",
        title: "Agencies, MGAs, brokerages, carriers.",
        runtime: "16 scenes · ~13 min",
        tags: ["Catalyst", "Applied Epic", "AMS360", "EZLynx"],
        live: true,
    },
    {
        id: "creator",
        href: "/demo/creator",
        Icon: Mic,
        kicker: "Influencers & Creators",
        title: "Audience monetization & brand deals.",
        runtime: "11 scenes · ~6.5 min",
        tags: ["Instagram", "TikTok", "YouTube", "Stripe", "Shopify"],
        live: true,
        highlight: true,
    },
    {
        id: "airports",
        href: "/contact",
        Icon: Plane,
        kicker: "Airports & SITA",
        title: "Operations, concessions, ground handling.",
        runtime: "Pilot · Q3",
        tags: ["SITA", "Sabre", "Amadeus"],
        live: false,
    },
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
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
                        <div className="lg:col-span-7">
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 fade-in-up">
                                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Operational Intelligence · Execution Layer</span>
                            </div>

                            <h1
                                className="font-heading mt-6 text-balance text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl fade-in-up"
                                style={{ animationDelay: "80ms" }}
                                data-testid="hero-headline"
                            >
                                The AI That Connects Human Perception and Business Software Operations —{" "}
                                <span className="text-cyan-400">Turning Signals into Decisions, Insights, and Execution.</span>
                            </h1>

                            <p
                                className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg fade-in-up"
                                style={{ animationDelay: "160ms" }}
                                data-testid="hero-sub"
                            >
                                CreatorBoostAI connects your existing software systems and real-world signals
                                to drive smarter decisions, coordinated actions, and measurable business
                                outcomes — without adding more complexity.
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
                                <Link
                                    to="/demo/noldus"
                                    data-testid="hero-cta-enterprise-demo"
                                    className="relative inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/60 bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent px-6 py-3.5 text-sm font-semibold text-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.25)] transition-all hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.45)]"
                                >
                                    <Building2 size={14} /> Watch Enterprise Demo
                                    <span className="ml-1 rounded-sm border border-cyan-400/40 bg-ink-900 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-400">Noldus</span>
                                </Link>
                                <Link
                                    to="/demo/supermarket"
                                    data-testid="hero-cta-retail-demo"
                                    className="relative inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/60 bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent px-6 py-3.5 text-sm font-semibold text-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.25)] transition-all hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.45)]"
                                >
                                    <ShoppingCart size={14} /> Retail Demo
                                    <span className="ml-1 rounded-sm border border-cyan-400/40 bg-ink-900 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-400">Supermarket · C-Store</span>
                                </Link>
                                <Link
                                    to="/demo/supermarket"
                                    data-testid="hero-cta-supermarket-cstore"
                                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-transparent px-6 py-3.5 text-sm font-medium text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-300"
                                >
                                    <Fuel size={14} /> Supermarket &amp; C-Store Demo
                                </Link>
                                <Link
                                    to="/demo/noldus"
                                    data-testid="hero-cta-live-system"
                                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-transparent px-6 py-3.5 text-sm font-medium text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-300"
                                >
                                    <Activity size={14} /> See Live System in Action
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
                        </div>

                        <div className="lg:col-span-5">
                            <AnimatedHeroDashboard />
                        </div>
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
            <section id="industries" className="relative isolate border-b border-white/5 py-20" data-testid="industries-section">
                <div className="absolute inset-0 -z-10">
                    <img src={SECTION_BG.industries} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/95 via-ink-900/85 to-ink-900" />
                </div>
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

            {/* SIGNAL INTELLIGENCE — replaces the old "Not Body Language" framing */}
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
                        <span className="text-cyan-400">This Is Signal Intelligence.</span>
                    </h2>
                    <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        For decades, professionals have relied on gut feeling and subjective interpretation. BodyIQ-AI
                        replaces that with measurable signal intelligence — converting human behavior into structured,
                        actionable insight.
                    </p>
                    <p className="mt-4 max-w-3xl text-lg leading-relaxed text-cyan-200 sm:text-xl">
                        We don't interpret people. <span className="text-white">We measure the signals that drive decisions.</span>
                    </p>

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Pillar Icon={Brain} title="Decision Detection" body="Reads the moment a buyer decides — friction, readiness, hidden close, hesitation, conviction." />
                        <Pillar Icon={Target} title="Resistance & Alignment" body="Surfaces resistance the moment it forms and alignment the moment it stabilizes." />
                        <Pillar Icon={Activity} title="Decision Shift Mapping" body="Tracks every signal that flips a decision — at speakable speed and below it." />
                        <Pillar Icon={DollarSign} title="Revenue Outcomes" body="Tied to dollars: attribution, conversion, lifetime value, retention." />
                    </div>
                </div>
            </section>

            {/* FROM SIGNAL TO EXECUTION — Intelligence + Execution layered system */}
            <section className="relative border-b border-white/5 py-20" data-testid="signal-execution-section">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">03 / Architecture</p>
                    <h2 className="font-heading mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                        From Signal to <span className="text-cyan-400">Execution.</span>
                    </h2>
                    <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        BodyIQ-AI detects the signal. CreatorBoostAI executes the response. Together they form a complete
                        Decision Intelligence System.
                    </p>

                    <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* Intelligence Layer */}
                        <div className="rounded-md border border-white/10 bg-ink-700/40 p-7" data-testid="layer-intelligence">
                            <div className="flex items-center gap-2">
                                <Brain size={14} className="text-cyan-400" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Intelligence Layer</span>
                            </div>
                            <h3 className="font-heading mt-3 text-2xl font-semibold text-white">BodyIQ-AI</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                Identifies what is happening. Measures the signals that drive decisions —
                                frame by frame, structured, objective.
                            </p>
                            <ul className="mt-5 space-y-2.5">
                                {[
                                    "Buying-decision detection",
                                    "Resistance, confusion, and alignment scoring",
                                    "Decision-shift mapping over time",
                                    "Structured signal definitions, not subjective opinion",
                                ].map((s) => (
                                    <li key={s} className="flex items-start gap-2 text-sm text-slate-300">
                                        <CheckCircle2 size={13} className="mt-1 flex-shrink-0 text-cyan-400" />
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Execution Layer */}
                        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent p-7" data-testid="layer-execution">
                            <div className="flex items-center gap-2">
                                <Workflow size={14} className="text-cyan-400" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Execution Layer</span>
                            </div>
                            <h3 className="font-heading mt-3 text-2xl font-semibold text-white">CreatorBoostAI</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                Executes what happens next. A full AI-powered business operating system that turns
                                detected signals into real actions across sales, marketing, ops, and growth.
                            </p>
                            <ul className="mt-5 space-y-2.5">
                                {[
                                    "Automated lead generation",
                                    "Intelligent follow-up systems",
                                    "Proposal & deal execution workflows",
                                    "CRM and pipeline management",
                                    "AI assistants that guide decisions in real time",
                                    "Automated revenue actions on signal detection",
                                    "Centralized business command dashboard",
                                ].map((s) => (
                                    <li key={s} className="flex items-start gap-2 text-sm text-slate-300">
                                        <CheckCircle2 size={13} className="mt-1 flex-shrink-0 text-cyan-400" />
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <p className="mt-10 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        This is not insight alone. <span className="text-white">This is execution.</span>{" "}
                        BodyIQ-AI identifies what is happening. CreatorBoostAI executes what happens next.
                    </p>
                </div>
            </section>

            {/* WHO THIS IS FOR */}
            <section className="relative border-b border-white/5 py-20" data-testid="audiences-section">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">04 / Who This Is For</p>
                    <h2 className="font-heading mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                        Built for <span className="text-cyan-400">high-stakes decisions.</span>
                    </h2>
                    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {AUDIENCES.map((a) => (
                            <div
                                key={a.label}
                                data-testid={`audience-${a.id}`}
                                className="rounded-md border border-white/10 bg-ink-700/40 p-5 transition-all hover:-translate-y-0.5 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.18)]"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/5">
                                    <a.Icon size={15} className="text-cyan-300" />
                                </div>
                                <p className="mt-4 font-heading text-sm font-semibold leading-snug text-white">
                                    {a.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SIGNAL INTELLIGENCE PRODUCTS */}
            <section id="products" className="relative border-b border-white/5 py-20" data-testid="signal-products-section">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">05 / Signal Intelligence Packs</p>
                    <h2 className="font-heading mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                        Three ways to <span className="text-cyan-400">deploy decision intelligence.</span>
                    </h2>
                    <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Start with the Signal Pack. Move to a Video Signal Intelligence Audit on your own footage.
                        Scale to a Full Signal Intelligence Report for high-stakes sales or legal engagements.
                    </p>

                    <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
                        {SIGNAL_PRODUCTS.map((p) => (
                            <Link
                                key={p.id}
                                to={p.href}
                                data-testid={`signal-product-${p.id}`}
                                className={`group flex flex-col rounded-md border p-7 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(6,182,212,0.18)] ${
                                    p.highlight
                                        ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent"
                                        : "border-white/10 bg-ink-700/40 hover:border-cyan-500/40"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p.Icon size={14} className="text-cyan-300" />
                                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{p.kicker}</span>
                                    </div>
                                    {p.badge && <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{p.badge}</span>}
                                </div>
                                <h3 className="font-heading mt-4 text-xl font-semibold leading-snug text-white">{p.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.body}</p>
                                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{p.priceLabel}</p>
                                <div className="mt-auto pt-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                                    {p.ctaLabel} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Jury — legal positioning */}
                    <div className="mt-12 rounded-md border border-white/10 bg-ink-700/40 p-7 lg:p-9" data-testid="jury-band">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <Layers size={14} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Legal · Trial Strategy</span>
                            <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300">Confidential</span>
                        </div>
                        <h3 className="font-heading mt-5 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                            Jury Signal Intelligence
                        </h3>
                        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                            Structured signal analysis of juror behavior using observable patterns and measurable
                            indicators. Reaction breakdowns, bias detection, resistance signals, decision-shift
                            identification, and section analysis — opening, testimony, cross, closing.
                        </p>
                        <div className="mt-6">
                            <Link
                                to="/services/jury"
                                data-testid="cta-jury"
                                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                            >
                                Request Jury Engagement <ArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT MAKES THIS DIFFERENT */}
            <section className="relative border-b border-white/5 py-20" data-testid="differentiation-section">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">06 / Differentiation</p>
                    <h2 className="font-heading mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                        What Makes This System <span className="text-cyan-400">Different.</span>
                    </h2>

                    <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <div className="rounded-md border border-white/10 bg-ink-700/40 p-7">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">This is not</p>
                            <ul className="mt-4 space-y-2.5">
                                {["Body language", "Emotion detection", "Call analysis", "Subjective opinion"].map((x) => (
                                    <li key={x} className="flex items-start gap-2 text-sm text-slate-300">
                                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400/70" />
                                        <span>{x}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent p-7">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">This is</p>
                            <ul className="mt-4 space-y-2.5">
                                {[
                                    "Objective signal measurement",
                                    "Structured insight generation",
                                    "Decision intelligence",
                                    "Execution-driven AI system",
                                ].map((x) => (
                                    <li key={x} className="flex items-start gap-2 text-sm text-slate-200">
                                        <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                                        <span>{x}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <p className="mt-8 max-w-2xl rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5 text-base leading-relaxed text-cyan-200 sm:text-lg">
                        We don't need audio. <span className="text-white">The decision is already visible.</span>
                    </p>
                </div>
            </section>

            {/* INTEGRATIONS */}
            <section className="relative isolate border-b border-white/5 py-20" data-testid="integrations-section">
                <div className="absolute inset-0 -z-10">
                    <img src={SECTION_BG.integrations} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/95 via-ink-900/85 to-ink-900" />
                </div>
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

            {/* DEMO SELECTOR */}
            <section id="demo-selector" className="relative isolate border-b border-white/5 py-20" data-testid="demo-selector-section">
                <div className="absolute inset-0 -z-10">
                    <img src={SECTION_BG.demoSelector} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/95 via-ink-900/80 to-ink-900" />
                </div>
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="flex items-end justify-between flex-wrap gap-4">
                        <div className="max-w-3xl">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">04 / Cinematic Demos</p>
                            <h2 className="font-heading mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                                Pick a vertical. <span className="text-cyan-400">Watch it run itself.</span>
                            </h2>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                                Every demo is auto-played, narrated by Nova (female · American), and engineered to take you
                                from "what does this do?" to "we need this" in under 13 minutes. No clicks. No demos that
                                stall. Just cinematic walkthroughs.
                            </p>
                        </div>
                        <Link
                            to="/demo"
                            data-testid="demo-selector-all-link"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-200"
                        >
                            All demos <ArrowRight size={12} />
                        </Link>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {DEMO_SELECTOR.map((d) => (
                            <DemoCard key={d.id} demo={d} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA STRIP */}
            <section className="relative isolate py-16" data-testid="home-cta-strip">
                <div className="absolute inset-0 -z-10">
                    <img src={SECTION_BG.cta} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-b from-ink-900/95 via-ink-900/80 to-ink-900" />
                </div>
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
        className={`group relative flex flex-col overflow-hidden rounded-md border transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(6,182,212,0.18)] ${
            ind.highlight
                ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent"
                : "border-white/10 bg-ink-700/40 hover:border-cyan-500/40"
        }`}
    >
        {INDUSTRY_IMG[ind.id] && (
            <div className="relative aspect-[16/9] w-full overflow-hidden">
                <img
                    src={INDUSTRY_IMG[ind.id]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/60 to-transparent" />
                <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-md border border-cyan-500/40 bg-ink-900/80 backdrop-blur-sm">
                    <ind.Icon size={17} className="text-cyan-300" />
                </div>
                <div className="absolute right-4 top-4">
                    {ind.live ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300 backdrop-blur-sm">Live</span>
                    ) : (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300 backdrop-blur-sm">In production</span>
                    )}
                </div>
            </div>
        )}
        <div className="flex flex-1 flex-col p-6">
            <h3 className="font-heading text-xl font-semibold text-white">{ind.title}</h3>
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

const DemoCard = ({ demo }) => (
    <Link
        to={demo.href}
        data-testid={`demo-card-${demo.id}`}
        className={`group relative flex flex-col overflow-hidden rounded-md border transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(6,182,212,0.18)] ${
            demo.highlight
                ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent"
                : "border-white/10 bg-ink-700/40 hover:border-cyan-500/40"
        }`}
    >
        {DEMO_IMG[demo.id] && (
            <div className="relative aspect-[16/9] w-full overflow-hidden">
                <img
                    src={DEMO_IMG[demo.id]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/50 to-transparent" />
                <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/40 bg-ink-900/80 backdrop-blur-sm">
                    <demo.Icon size={15} className="text-cyan-300" />
                </div>
                <div className="absolute right-3 top-3">
                    {demo.live ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300 backdrop-blur-sm">Live</span>
                    ) : (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300 backdrop-blur-sm">Pilot</span>
                    )}
                </div>
            </div>
        )}
        <div className="flex flex-1 flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{demo.kicker}</p>
            <h3 className="font-heading mt-2 text-lg font-semibold leading-snug text-white">{demo.title}</h3>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{demo.runtime}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
                {demo.tags.map((t) => (
                    <span key={t} className="rounded-sm border border-white/10 bg-ink-900 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300">
                        {t}
                    </span>
                ))}
            </div>
            <div className="mt-auto pt-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                <Play size={11} fill="currentColor" /> {demo.live ? "Watch demo" : "Request brief"}
                <ArrowRight size={12} className="ml-auto transition-transform group-hover:translate-x-0.5" />
            </div>
        </div>
    </Link>
);

// Compact animated dashboard preview shown to the right of the hero copy.
// Pure CSS/SVG — no external libraries, no audio. Lightweight, ambient motion.
const AnimatedHeroDashboard = () => {
    const bars = [62, 78, 54, 88, 71, 94, 82, 96];
    const sparkPath = "M 0 36 L 16 30 L 32 22 L 48 25 L 64 18 L 80 22 L 96 12 L 112 16 L 128 6 L 144 10 L 160 4";
    return (
        <div
            data-testid="hero-dashboard-preview"
            className="relative rounded-md border border-white/10 bg-ink-700/50 p-4 shadow-[0_0_60px_rgba(6,182,212,0.18)] backdrop-blur-md fade-in-up"
            style={{ animationDelay: "300ms" }}
        >
            {/* Window chrome */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.7)] animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Command Center · LIVE</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            </div>

            {/* KPI row */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniKPI label="Revenue MTD" value="$1.84M" trend="+22%" />
                <MiniKPI label="Pipeline" value="$6.2M" trend="open" />
                <MiniKPI label="Active Leads" value="2,140" trend="hot 312" />
                <MiniKPI label="Conv. Rate" value="14.6%" trend="+3.1pt" />
            </div>

            {/* Spark + bars */}
            <div className="mt-4 rounded-sm border border-white/10 bg-ink-900 p-3">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">30-day revenue</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">+34% lift</span>
                </div>
                <svg viewBox="0 0 160 40" className="mt-2 h-12 w-full">
                    <defs>
                        <linearGradient id="hero-spark-grad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor="#06b6d4" stopOpacity="0.4" />
                            <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={`${sparkPath} L 160 40 L 0 40 Z`} fill="url(#hero-spark-grad)" />
                    <path d={sparkPath} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-3 flex h-12 items-end gap-1.5">
                    {bars.map((b, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-sm bg-gradient-to-t from-cyan-500/30 to-cyan-400 fade-in-up"
                            style={{ height: `${b}%`, animationDelay: `${300 + i * 80}ms` }}
                        />
                    ))}
                </div>
            </div>

            {/* Action ticker */}
            <div className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3">
                <div className="flex items-center gap-2">
                    <Activity size={11} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Auto-executed · last 60s</span>
                </div>
                <ul className="mt-2 space-y-1.5 text-[12px] text-slate-200">
                    <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-cyan-400" /> Routed 14 high-intent leads</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-cyan-400" /> Drafted 6 brand-deal pitches</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-cyan-400" /> Synced 3 CRMs · audit logged</li>
                </ul>
            </div>

            {/* Floating accent */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-cyan-400/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-blue-500/20 blur-3xl" />
        </div>
    );
};

const MiniKPI = ({ label, value, trend }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="font-heading mt-0.5 text-base font-semibold text-cyan-300">{value}</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{trend}</p>
    </div>
);
