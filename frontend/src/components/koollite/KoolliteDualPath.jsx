import React, { useMemo, useState } from "react";
import {
    Lightbulb, TrendingUp, TrendingDown, Zap, Sun, BatteryCharging,
    DollarSign, Target, Sparkles, ArrowRight, Check, Calculator,
} from "lucide-react";

/**
 * KoolliteDualPath
 * --------------------------------------------------------------
 * Reusable, fully self-contained UI block that explains and
 * computes the two Koollite upgrade strategies:
 *
 *   Option A · Max Brightness · Same Wattage
 *      Keep wattage the same, jump to 220 lm/W → big foot-candle gain.
 *
 *   Option B · Max Savings · Same Brightness
 *      Cut wattage roughly in half while keeping similar brightness
 *      — large energy savings.
 *
 * Drop-in props (every prop is optional with a sensible default so
 * the component works on any page out-of-the-box):
 *
 *   industry        – string label e.g. "Supermarket"
 *   accent          – "cyan" | "amber" | "emerald" (visual tone)
 *   compact         – when true, renders a slim 2-card layout (used
 *                     inside cinematic demos)
 *   defaults        – override calculator defaults
 *   ctaHref         – primary CTA target URL (defaults to /koollite/roi)
 *   testIdPrefix    – stable test-id prefix per surface
 */

const DEFAULTS = {
    fixtures: 420,
    currentWatts: 32,           // typical existing LED tube wattage
    currentEfficacy: 150,       // typical existing LED lm/W
    koolliteEfficacy: 220,      // Koollite 220 lm/W spec
    hoursPerDay: 18,
    daysPerYear: 363,
    energyCostPerKwh: 0.16,
    targetFc: null,             // optional foot-candle target
};

const formatUSD = (n) =>
    n == null
        ? "—"
        : `$${Math.round(Number(n)).toLocaleString()}`;
const formatPct = (n) =>
    n == null ? "—" : `${(Number(n) * 100).toFixed(0)}%`;

/* -----------------------------------------------------------------
 * Pure math — exposed for re-use in the standalone ROI page
 * --------------------------------------------------------------- */
export const calcDualPath = (input = {}) => {
    const i = { ...DEFAULTS, ...input };
    const fixtures = Math.max(1, Number(i.fixtures) || 0);
    const W = Math.max(1, Number(i.currentWatts) || 0);
    const Ec = Math.max(1, Number(i.currentEfficacy) || 0);
    const Ek = Math.max(1, Number(i.koolliteEfficacy) || 0);
    const hpd = Math.max(0, Number(i.hoursPerDay) || 0);
    const dpy = Math.max(0, Number(i.daysPerYear) || 0);
    const rate = Math.max(0, Number(i.energyCostPerKwh) || 0);

    const lumensPerFixtureNow = W * Ec;
    const annualHours = hpd * dpy;

    // Current annual energy + cost (baseline)
    const baselineKwh = (W * fixtures * annualHours) / 1000;
    const baselineCost = baselineKwh * rate;

    // Option A — same wattage, more brightness
    const a_wattsPerFixture = W;
    const a_lumensPerFixture = W * Ek;
    const a_brightnessLift = (Ek - Ec) / Ec; // %
    const a_kwh = baselineKwh;
    const a_cost = baselineCost;
    const a_kwhSaved = 0;
    const a_costSaved = 0;

    // Option B — same brightness, less wattage
    const b_wattsPerFixture = lumensPerFixtureNow / Ek;
    const b_lumensPerFixture = lumensPerFixtureNow;
    const b_kwh =
        (b_wattsPerFixture * fixtures * annualHours) / 1000;
    const b_cost = b_kwh * rate;
    const b_kwhSaved = baselineKwh - b_kwh;
    const b_costSaved = baselineCost - b_cost;
    const b_wattReductionPct = (W - b_wattsPerFixture) / W;

    return {
        baseline: {
            wattsPerFixture: W,
            kwh: baselineKwh,
            cost: baselineCost,
        },
        optionA: {
            wattsPerFixture: a_wattsPerFixture,
            lumensPerFixture: a_lumensPerFixture,
            brightnessLift: a_brightnessLift,
            kwh: a_kwh,
            cost: a_cost,
            kwhSaved: a_kwhSaved,
            costSaved: a_costSaved,
        },
        optionB: {
            wattsPerFixture: b_wattsPerFixture,
            lumensPerFixture: b_lumensPerFixture,
            wattReductionPct: b_wattReductionPct,
            kwh: b_kwh,
            cost: b_cost,
            kwhSaved: b_kwhSaved,
            costSaved: b_costSaved,
        },
        meta: {
            fixtures,
            annualHours,
            koolliteEfficacy: Ek,
            currentEfficacy: Ec,
        },
    };
};

/* -----------------------------------------------------------------
 * UI
 * --------------------------------------------------------------- */
const accentClasses = {
    cyan: {
        chip: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
        title: "text-cyan-300",
        ring: "border-cyan-500/40",
        soft: "bg-cyan-500/5",
        primary:
            "bg-cyan-500 text-ink-900 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]",
    },
    amber: {
        chip: "border-amber-500/30 bg-amber-500/5 text-amber-300",
        title: "text-amber-300",
        ring: "border-amber-500/40",
        soft: "bg-amber-500/5",
        primary:
            "bg-amber-400 text-ink-900 hover:bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]",
    },
    emerald: {
        chip: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
        title: "text-emerald-300",
        ring: "border-emerald-500/40",
        soft: "bg-emerald-500/5",
        primary:
            "bg-emerald-400 text-ink-900 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]",
    },
};

const Badge = ({ tone = "cyan", children, testid }) => {
    const c = accentClasses[tone] || accentClasses.cyan;
    return (
        <span
            data-testid={testid}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${c.chip}`}
        >
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {children}
        </span>
    );
};

const Stat = ({ label, value, sub }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
            {label}
        </p>
        <p className="mt-0.5 font-heading text-lg font-semibold text-white">
            {value}
        </p>
        {sub && (
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
                {sub}
            </p>
        )}
    </div>
);

const PathCard = ({
    tone,
    label,
    title,
    summary,
    bullets,
    stats,
    testid,
}) => {
    const c = accentClasses[tone] || accentClasses.cyan;
    return (
        <div
            data-testid={testid}
            className={`rounded-md border ${c.ring} ${c.soft} p-5 transition-all hover:translate-y-[-1px]`}
        >
            <div className="flex items-center gap-2">
                <Sparkles size={13} className={c.title} />
                <span
                    className={`font-mono text-[10px] uppercase tracking-[0.22em] ${c.title}`}
                >
                    {label}
                </span>
            </div>
            <h3 className="font-heading mt-3 text-xl font-semibold text-white">
                {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {summary}
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                        <Check
                            size={12}
                            className={`mt-0.5 flex-shrink-0 ${c.title}`}
                        />
                        <span>{b}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-4 grid grid-cols-3 gap-2">
                {stats.map((s) => (
                    <Stat
                        key={s.label}
                        label={s.label}
                        value={s.value}
                        sub={s.sub}
                    />
                ))}
            </div>
        </div>
    );
};

export const KoolliteDualPath = ({
    industry = "Operator",
    accent = "cyan",
    compact = false,
    defaults: defaultsOverride = {},
    ctaHref = "/koollite/roi",
    showCalculator = true,
    testIdPrefix = "koollite-dual-path",
}) => {
    const [inputs, setInputs] = useState({
        ...DEFAULTS,
        ...defaultsOverride,
    });
    const result = useMemo(() => calcDualPath(inputs), [inputs]);

    const setNum = (k) => (e) => {
        const v = e.target.value;
        setInputs((s) => ({
            ...s,
            [k]: v === "" ? "" : Number(v),
        }));
    };

    return (
        <section
            className="relative"
            data-testid={`${testIdPrefix}-section`}
        >
            {/* Heading */}
            <div className="flex flex-wrap items-center gap-3">
                <Badge tone={accent} testid={`${testIdPrefix}-badge`}>
                    <Lightbulb size={11} /> Koollite · 220 lm/W ·
                    Dual-Path Strategy
                </Badge>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {industry} · Two upgrade paths · One decision
                </span>
            </div>

            <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Same product. {" "}
                <span className={accentClasses[accent].title}>
                    Two completely different outcomes.
                </span>
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Koollite's 220 lumens-per-watt platform lets every operator
                pick the upgrade that matches their real goal. {" "}
                <span className="text-white">Brightness</span> for safety, sales lift
                and visibility — or {" "}
                <span className="text-white">savings</span> for energy budgets and
                sustainability targets. CreatorBoostAI models both paths
                against your actual fixtures and runs the deal accordingly.
            </p>

            {/* Two paths */}
            <div
                className={`mt-7 grid grid-cols-1 gap-4 ${
                    compact ? "lg:grid-cols-2" : "lg:grid-cols-2"
                }`}
            >
                <PathCard
                    tone="cyan"
                    label="Option A · Max Brightness"
                    title="Keep the same wattage. Get dramatically more light."
                    summary="Replace your existing fixtures with Koollite at the same wattage budget. Foot-candles climb, dark zones disappear, and merchandising / safety performance improves immediately."
                    bullets={[
                        "Same wattage. Same energy bill.",
                        "Up to ~47% more lumens per fixture.",
                        "Improved foot-candles in aisles, gates, classrooms, hangars.",
                        "Better camera-recognition + safety compliance.",
                        "Direct lift on retail / sales-floor performance.",
                    ]}
                    stats={[
                        {
                            label: "Brightness lift",
                            value: `+${formatPct(
                                result.optionA.brightnessLift,
                            ).replace("%", "")}%`,
                            sub: "per fixture",
                        },
                        {
                            label: "Lumens / fixture",
                            value: Math.round(
                                result.optionA.lumensPerFixture,
                            ).toLocaleString(),
                            sub: "@ same watts",
                        },
                        {
                            label: "Energy delta",
                            value: "= 0",
                            sub: "no extra cost",
                        },
                    ]}
                    testid={`${testIdPrefix}-option-a`}
                />
                <PathCard
                    tone="emerald"
                    label="Option B · Max Savings"
                    title="Match today's brightness. Cut wattage roughly in half."
                    summary="Hold light levels steady, drop wattage by ~30–50%, and capture the energy savings every month. The savings line typically funds the upgrade itself."
                    bullets={[
                        "Same brightness. Half the wattage.",
                        `~${formatPct(
                            result.optionB.wattReductionPct,
                        )} wattage reduction at the fixture.`,
                        "Direct annual energy savings on the utility bill.",
                        "Lower HVAC load (less heat output).",
                        "Carbon / ESG reporting impact baked in.",
                    ]}
                    stats={[
                        {
                            label: "Watts / fixture",
                            value: `${result.optionB.wattsPerFixture.toFixed(
                                1,
                            )} W`,
                            sub: `was ${result.baseline.wattsPerFixture} W`,
                        },
                        {
                            label: "Energy saved",
                            value: `${Math.round(
                                result.optionB.kwhSaved,
                            ).toLocaleString()} kWh`,
                            sub: "per year",
                        },
                        {
                            label: "$ saved / yr",
                            value: formatUSD(result.optionB.costSaved),
                            sub: `at $${inputs.energyCostPerKwh}/kWh`,
                        },
                    ]}
                    testid={`${testIdPrefix}-option-b`}
                />
            </div>

            {/* Calculator (optional) */}
            {showCalculator && (
                <div
                    className="mt-7 rounded-md border border-white/10 bg-ink-700/40 p-5"
                    data-testid={`${testIdPrefix}-calc`}
                >
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Calculator
                            size={13}
                            className={accentClasses[accent].title}
                        />
                        <span
                            className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accentClasses[accent].title}`}
                        >
                            Live Dual-Path ROI · Both options modeled
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <Field
                            label="Fixtures"
                            value={inputs.fixtures}
                            onChange={setNum("fixtures")}
                            testid={`${testIdPrefix}-input-fixtures`}
                        />
                        <Field
                            label="Current W / fixture"
                            value={inputs.currentWatts}
                            onChange={setNum("currentWatts")}
                            testid={`${testIdPrefix}-input-watts`}
                        />
                        <Field
                            label="Current lm/W"
                            value={inputs.currentEfficacy}
                            onChange={setNum("currentEfficacy")}
                            testid={`${testIdPrefix}-input-efficacy`}
                        />
                        <Field
                            label="Hours / day"
                            value={inputs.hoursPerDay}
                            onChange={setNum("hoursPerDay")}
                            testid={`${testIdPrefix}-input-hpd`}
                        />
                        <Field
                            label="Days / yr"
                            value={inputs.daysPerYear}
                            onChange={setNum("daysPerYear")}
                            testid={`${testIdPrefix}-input-dpy`}
                        />
                        <Field
                            label="$ / kWh"
                            value={inputs.energyCostPerKwh}
                            step="0.01"
                            onChange={setNum("energyCostPerKwh")}
                            testid={`${testIdPrefix}-input-rate`}
                        />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ResultBlock
                            tone="cyan"
                            icon={Sun}
                            title="Option A result"
                            rows={[
                                {
                                    k: "Brightness gain",
                                    v: `+${formatPct(
                                        result.optionA.brightnessLift,
                                    )}`,
                                },
                                {
                                    k: "Lumens / fixture",
                                    v: Math.round(
                                        result.optionA.lumensPerFixture,
                                    ).toLocaleString(),
                                },
                                {
                                    k: "Annual energy",
                                    v: `${Math.round(
                                        result.optionA.kwh,
                                    ).toLocaleString()} kWh`,
                                },
                                {
                                    k: "Annual cost",
                                    v: formatUSD(result.optionA.cost),
                                },
                            ]}
                            testid={`${testIdPrefix}-result-a`}
                        />
                        <ResultBlock
                            tone="emerald"
                            icon={BatteryCharging}
                            title="Option B result"
                            rows={[
                                {
                                    k: "Wattage reduction",
                                    v: `−${formatPct(
                                        result.optionB.wattReductionPct,
                                    )}`,
                                },
                                {
                                    k: "Watts / fixture",
                                    v: `${result.optionB.wattsPerFixture.toFixed(
                                        1,
                                    )} W`,
                                },
                                {
                                    k: "Energy saved",
                                    v: `${Math.round(
                                        result.optionB.kwhSaved,
                                    ).toLocaleString()} kWh / yr`,
                                },
                                {
                                    k: "Annual savings",
                                    v: formatUSD(
                                        result.optionB.costSaved,
                                    ),
                                },
                            ]}
                            testid={`${testIdPrefix}-result-b`}
                        />
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <a
                            href={ctaHref}
                            data-testid={`${testIdPrefix}-cta`}
                            className={`inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-all ${accentClasses[accent].primary}`}
                        >
                            <Calculator size={14} /> Open the full
                            Koollite ROI calculator
                            <ArrowRight size={13} />
                        </a>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            Numbers update live · CreatorBoostAI tags every
                            decision to an Action ID
                        </span>
                    </div>
                </div>
            )}
        </section>
    );
};

const Field = ({ label, value, onChange, testid, step }) => (
    <label className="flex flex-col gap-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
            {label}
        </span>
        <input
            data-testid={testid}
            type="number"
            inputMode="decimal"
            step={step || "1"}
            value={value}
            onChange={onChange}
            className="rounded-md border border-white/10 bg-ink-900 px-3 py-2 font-mono text-sm text-cyan-200 focus:border-cyan-500/50 focus:outline-none"
        />
    </label>
);

const ResultBlock = ({ tone, icon: Icon, title, rows, testid }) => {
    const c = accentClasses[tone] || accentClasses.cyan;
    return (
        <div
            data-testid={testid}
            className={`rounded-md border ${c.ring} ${c.soft} p-4`}
        >
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Icon size={13} className={c.title} />
                <span
                    className={`font-mono text-[10px] uppercase tracking-[0.22em] ${c.title}`}
                >
                    {title}
                </span>
            </div>
            <ul className="mt-3 space-y-1.5">
                {rows.map((r) => (
                    <li
                        key={r.k}
                        className="flex items-center justify-between border-b border-white/5 pb-1.5 last:border-b-0"
                    >
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            {r.k}
                        </span>
                        <span className="font-mono text-sm text-white">
                            {r.v}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

/**
 * Compact summary strip — drop into demo scenes for a one-line teaser.
 */
export const KoolliteDualPathStrip = ({
    accent = "cyan",
    href = "/koollite/roi",
    testid = "koollite-dual-path-strip",
}) => {
    const c = accentClasses[accent] || accentClasses.cyan;
    return (
        <a
            href={href}
            data-testid={testid}
            className={`group flex flex-wrap items-center gap-3 rounded-md border ${c.ring} ${c.soft} px-4 py-3 transition-all hover:translate-y-[-1px]`}
        >
            <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${c.chip}`}
            >
                <Lightbulb size={10} /> Koollite · 220 lm/W
            </span>
            <span className="text-sm text-slate-200">
                <span className="font-semibold text-white">
                    Option A
                </span>{" "}
                · same wattage → up to{" "}
                <span className={c.title}>+47% brightness</span>{" "}
                <span className="text-slate-500">·</span>{" "}
                <span className="font-semibold text-white">
                    Option B
                </span>{" "}
                · same brightness →{" "}
                <span className={c.title}>~50% wattage saved</span>
            </span>
            <span
                className={`ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] ${c.title} group-hover:underline`}
            >
                Run my ROI <ArrowRight size={12} />
            </span>
        </a>
    );
};

export default KoolliteDualPath;
