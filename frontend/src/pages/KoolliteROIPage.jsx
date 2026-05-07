import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import {
    KoolliteDualPath,
    calcDualPath,
} from "@/components/koollite/KoolliteDualPath";
import {
    Lightbulb, Building2, ShoppingCart, Plane, GraduationCap, Factory,
    ArrowRight, Sparkles, FileText, Mail, Send,
} from "lucide-react";

/**
 * Koollite ROI Calculator Page
 * --------------------------------------------------------------
 * Standalone customer-facing page that lets any operator model
 * Option A (Max Brightness) vs Option B (Max Savings) against
 * realistic preset scenarios — Supermarket, Airport, School,
 * Warehouse — or fully custom inputs.
 *
 * Wires into:
 *   /koollite/roi
 *   /koollite
 *   /roi
 */

const PRESETS = [
    {
        id: "supermarket",
        Icon: ShoppingCart,
        label: "Supermarket / Grocery",
        sub: "1 store · 48k sqft · 420 fixtures",
        defaults: {
            fixtures: 420,
            currentWatts: 32,
            currentEfficacy: 150,
            hoursPerDay: 18,
            daysPerYear: 363,
            energyCostPerKwh: 0.16,
        },
        narrative:
            "Sales-floor LEDs, refrigeration cases, parking. Brightness drives basket size; savings drive store P&L.",
    },
    {
        id: "airport",
        Icon: Plane,
        label: "Airport Terminal",
        sub: "1 concourse · 1,800 fixtures",
        defaults: {
            fixtures: 1800,
            currentWatts: 60,
            currentEfficacy: 145,
            hoursPerDay: 22,
            daysPerYear: 365,
            energyCostPerKwh: 0.14,
        },
        narrative:
            "Gates, hold rooms, baggage claim, jet bridges. Brightness improves passenger flow + safety; savings hit the operating budget.",
    },
    {
        id: "school",
        Icon: GraduationCap,
        label: "School District",
        sub: "12 buildings · 3,400 fixtures",
        defaults: {
            fixtures: 3400,
            currentWatts: 38,
            currentEfficacy: 140,
            hoursPerDay: 12,
            daysPerYear: 200,
            energyCostPerKwh: 0.13,
        },
        narrative:
            "Classrooms, gymnasiums, hallways, parking lots. Brightness raises classroom comfort + safety; savings free up funds for academics.",
    },
    {
        id: "warehouse",
        Icon: Factory,
        label: "Warehouse / DC",
        sub: "1 DC · 240 high-bays",
        defaults: {
            fixtures: 240,
            currentWatts: 150,
            currentEfficacy: 135,
            hoursPerDay: 20,
            daysPerYear: 360,
            energyCostPerKwh: 0.12,
        },
        narrative:
            "High-bay LED fixtures over racking, dock doors, and yard. Brightness improves pick accuracy; savings drop straight to the bottom line.",
    },
];

const formatUSD = (n) =>
    n == null
        ? "—"
        : `$${Math.round(Number(n)).toLocaleString()}`;

export default function KoolliteROIPage() {
    const [presetId, setPresetId] = useState("supermarket");
    const preset = useMemo(
        () => PRESETS.find((p) => p.id === presetId) || PRESETS[0],
        [presetId],
    );

    return (
        <Layout>
            <div
                className="relative mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-14"
                data-testid="koollite-roi-page"
            >
                {/* Ambient bg */}
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div
                        className="glow-orb glow-orb--cyan animate-float-slow"
                        style={{
                            width: 480,
                            height: 480,
                            top: -160,
                            left: -120,
                        }}
                    />
                </div>

                {/* Hero */}
                <section data-testid="koollite-roi-hero">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            Koollite · 220 lm/W · Dual-Path ROI Calculator
                        </span>
                    </div>
                    <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                        Pick your goal.{" "}
                        <span className="text-cyan-400">
                            We'll model both upgrade paths.
                        </span>
                    </h1>
                    <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                        Every Koollite project starts the same way: do you want{" "}
                        <span className="text-white">more light</span> at the
                        same wattage — or{" "}
                        <span className="text-white">half the wattage</span> at
                        the same light? CreatorBoostAI runs both paths against
                        your fixture count, hours, and utility rate, then
                        produces an Action-ID-backed proposal you can hand to
                        your CFO.
                    </p>
                </section>

                {/* Preset selector */}
                <section
                    className="mt-9"
                    data-testid="koollite-roi-presets"
                >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        Step 1 · Pick a starting scenario
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {PRESETS.map((p) => {
                            const active = p.id === presetId;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPresetId(p.id)}
                                    data-testid={`koollite-roi-preset-${p.id}`}
                                    className={`group rounded-md border p-4 text-left transition-all hover:translate-y-[-1px] ${
                                        active
                                            ? "border-cyan-500/50 bg-cyan-500/10"
                                            : "border-white/10 bg-ink-700/40 hover:border-cyan-500/30"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <p.Icon
                                            size={14}
                                            className={
                                                active
                                                    ? "text-cyan-300"
                                                    : "text-slate-300 group-hover:text-cyan-300"
                                            }
                                        />
                                        <span
                                            className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                                                active
                                                    ? "text-cyan-300"
                                                    : "text-slate-300"
                                            }`}
                                        >
                                            {p.label}
                                        </span>
                                    </div>
                                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                        {p.sub}
                                    </p>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                                        {p.narrative}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Live dual-path block */}
                <section
                    className="mt-10"
                    data-testid="koollite-roi-block"
                >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        Step 2 · Tune the inputs · See both paths instantly
                    </p>
                    <div className="mt-3">
                        <KoolliteDualPath
                            key={preset.id}
                            industry={preset.label}
                            accent="cyan"
                            defaults={preset.defaults}
                            ctaHref="/lighting"
                            testIdPrefix={`koollite-roi-${preset.id}`}
                        />
                    </div>
                </section>

                {/* What CreatorBoostAI delivers */}
                <section
                    className="mt-12 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-10"
                    data-testid="koollite-roi-deliverables"
                >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        Step 3 · What lands in your inbox
                    </p>
                    <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                        A real proposal —{" "}
                        <span className="text-cyan-300">
                            both options modeled, side-by-side.
                        </span>
                    </h2>
                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {[
                            {
                                Icon: FileText,
                                title: "Dual-path proposal",
                                body: "Option A vs Option B engineered for your fixture count, hours, and utility rate. Lumens, watts, and dollars on every line.",
                            },
                            {
                                Icon: Sparkles,
                                title: "Action-ID lifecycle",
                                body: "Every decision tracked: identified → approved → deployed → savings_verified. Tagged to your CFO dashboard.",
                            },
                            {
                                Icon: Mail,
                                title: "Contractor-ready package",
                                body: "Your existing electrical contractor receives the SKU list, install plan, and warranty terms automatically.",
                            },
                        ].map((b) => (
                            <div
                                key={b.title}
                                className="rounded-md border border-white/10 bg-ink-900 p-5"
                            >
                                <b.Icon size={14} className="text-cyan-300" />
                                <h3 className="font-heading mt-3 text-lg font-semibold text-white">
                                    {b.title}
                                </h3>
                                <p className="mt-2 text-sm text-slate-300">
                                    {b.body}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                        <Link
                            to="/lighting#calculator"
                            data-testid="koollite-roi-cta-proposal"
                            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400"
                        >
                            <Send size={14} /> Generate the official proposal
                            <ArrowRight size={13} />
                        </Link>
                        <Link
                            to="/lighting"
                            data-testid="koollite-roi-cta-engine"
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                        >
                            <Lightbulb size={14} /> See the full Lighting
                            Upgrade Engine
                        </Link>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
