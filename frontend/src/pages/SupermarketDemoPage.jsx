import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/site/Layout";
import { shareDemo } from "@/lib/api";
import { useDemoTracking } from "@/lib/useDemoTracking";
import { useRefMirror, hardSilence, useDemoCleanup } from "@/lib/demoAudioFix";
import { SCENE_IMG_RETAIL } from "@/lib/images";
import { toast } from "sonner";
import { ActivateCommandCenter } from "@/components/ActivateCommandCenter";
import { SavePauseDialog } from "@/components/SavePauseDialog";
import {
    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Check, ArrowRight, Sparkles, Mic,
    Activity, Brain, Zap, Globe2, Send, Copy, QrCode, Cpu, Target,
    Mail, Shield, AlertTriangle, CheckCircle2, X, BarChart3, Layers,
    ShoppingCart, Truck, Wrench, Users, Camera, Fuel, Boxes, Building2,
    Package, ScanLine, MapPin, TrendingUp, TrendingDown, DollarSign, Lightbulb,
    RefreshCcw, Snowflake, Crown, Workflow, ShieldCheck, FileCheck2, Coins,
    PiggyBank, BadgeCheck, Hammer,
} from "lucide-react";
import {
    useAgenticEngine, ActionLedger, ReasoningStream, RevenueSavingsCounter,
    ExecutionControlPanel, SovereignVault, PortfolioCommandCenter,
} from "@/components/agentic/AgenticExecutionCore";
import { KoolliteDualPathStrip } from "@/components/koollite/KoolliteDualPath";

// =================================================================
// 17 scenes · Agentic Execution OS · Detected → Reasoned → Executed → Measured
// CreatorBoostAI is the execution layer, decision engine, revenue system,
// and operational control layer. It operates ACROSS existing systems
// (ERP · POS · workforce · maintenance · CRM · fuel) — it does not replace them.
// =================================================================
const SCENES = [
    {
        id: "opening",
        section: "Scene 1 · The Modern Retail Operation",
        focus: "opening",
        fallback_ms: 34000,
        narration:
            "Thousands of stores. Dozens of warehouses. Hundreds of trucks. " +
            "Fuel locations across multiple regions. Tens of thousands of employees. " +
            "The data is already flowing. CreatorBoostAI is the execution layer that " +
            "turns it into decisions, actions, and measured financial outcomes in real time.",
        actions: [{
            id: "#8801",
            trigger: "Enterprise data feeds connected — ERP, POS, workforce, maintenance, fuel",
            reasoning: "Signal volume exceeds human review capacity; establish agentic execution baseline",
            action: "Portfolio execution session initialized",
            impact_usd: 0, impact_label: "Session start", status: "executed",
        }],
    },
    {
        id: "existing-systems",
        section: "Scene 2 · The Systems Layer We Operate On",
        focus: "existing-systems",
        fallback_ms: 40000,
        narration:
            "Every retailer already runs on a system stack — ERP, retail platforms, workforce, " +
            "maintenance, CRM, fleet, fuel, and store-level POS. CreatorBoostAI does not replace " +
            "these systems. It sits across them, reads what they produce, reasons about what " +
            "matters, and executes the next action — automatically.",
        actions: [{
            id: "#8802",
            trigger: "Heterogeneous data from ERP, POS, workforce, fuel, maintenance",
            reasoning: "Unified schema synthesized across legacy sources; no rip-and-replace required",
            action: "Execution overlay established across 7 system classes",
            impact_usd: 0, impact_label: "Integration", status: "executed",
        }],
    },
    {
        id: "command-center",
        section: "Scene 3 · The Operations Command Center",
        focus: "command-center",
        fallback_ms: 38000,
        narration:
            "The Operations Command Center opens. For every live signal, the engine answers four " +
            "questions instantly. What needs attention first. What action to take. Who owns it. " +
            "What the dollar impact is if ignored. Not reporting — execution.",
        actions: [{
            id: "#8803",
            trigger: "1,247 live signals across portfolio exceed priority threshold",
            reasoning: "Financial-impact ranking applied; top 42 actions surfaced for execution",
            action: "Command Center activated · 42 actions queued for execution",
            impact_usd: 0, impact_label: "Queue", status: "executed",
        }],
    },
    {
        id: "money-saving",
        section: "Scene 4 · Cost Prevention Engine",
        focus: "money-saving",
        fallback_ms: 42000,
        narration:
            "Detected: refrigeration drift, HVAC fatigue, lighting waste, overstaffing, late " +
            "maintenance, shrink exposure. Reasoned: priority × dollar impact. Executed: work " +
            "orders dispatched, schedules adjusted, vendor escalations sent. Measured: every dollar " +
            "saved is tagged to the Action ID that prevented the loss.",
        actions: [
            {
                id: "#8821",
                trigger: "Refrigeration drift detected · Store 1142 · Unit A3",
                reasoning: "Temperature trend predicts spoilage within 6 hours; warranty coverage active",
                action: "Work order dispatched · warranty claim auto-filed",
                impact_usd: 1200, impact_label: "Savings", status: "executed",
            },
            {
                id: "#8822",
                trigger: "Lighting energy consumption 34% above efficient baseline",
                reasoning: "Retrofit ROI modeled at 11-month payback; capital fund available",
                action: "Retrofit proposal generated · capital request routed to regional",
                impact_usd: 3400, impact_label: "Savings", status: "pending",
            },
            {
                id: "#8823",
                trigger: "Maintenance vendor response time 2.4× SLA on 17 calls",
                reasoning: "Performance breach threshold exceeded; escalation path unlocked",
                action: "Vendor escalation email drafted · alternate vendor quote requested",
                impact_usd: 2800, impact_label: "Savings", status: "executed",
            },
        ],
    },
    {
        id: "revenue-making",
        section: "Scene 5 · Revenue Recovery Engine",
        focus: "revenue-making",
        fallback_ms: 40000,
        narration:
            "The engine identifies every missed dollar. Out-of-stock recovery. Better promotion " +
            "timing. Localized pricing. Basket-size lift. Upsell paths. Fuel-to-store conversion. " +
            "Loyalty triggers. For every opportunity, CreatorBoostAI recommends the next best " +
            "action and executes it — signage updated, promotion pushed, pricing adjusted.",
        actions: [
            {
                id: "#8824",
                trigger: "4 high-margin SKUs out of stock at 23 locations during weekend peak",
                reasoning: "Demand forecast vs on-hand inventory · priority replenishment justified",
                action: "Priority replenishment orders generated · substitute shelf-tags pushed",
                impact_usd: 8600, impact_label: "Revenue recovered", status: "executed",
            },
            {
                id: "#8825",
                trigger: "Freshness risk detected on 142 perishable SKUs · 48-hour window",
                reasoning: "Discount-to-move vs write-off financial modeling · FRESHNESS REVENUE ENGINE",
                action: "Time-limited promotion generated · pushed to in-store signage and app",
                impact_usd: 5400, impact_label: "Revenue recovered", status: "executed",
            },
        ],
    },
    {
        id: "store-example",
        section: "Scene 6 · Single-Store Execution · Store 1142",
        focus: "store-example",
        fallback_ms: 44000,
        narration:
            "Store 1142. Dairy sales falling. Refrigeration alerts on two units. Labor schedule " +
            "gaps. Customer complaints rising. Detected across six data streams. Reasoned against " +
            "financial impact. Executed: six coordinated actions fired in under ninety seconds. " +
            "Measured: every outcome tagged to an Action ID.",
        actions: [
            {
                id: "#8831",
                trigger: "Dairy category velocity −23% · 2 refrigeration units at risk",
                reasoning: "Cold-chain failure cascade predicted; financial exposure $4,800",
                action: "Maintenance dispatched · cold-chain inspection queued · manager notified",
                impact_usd: 4800, impact_label: "Savings", status: "executed",
            },
            {
                id: "#8832",
                trigger: "Evening-shift labor gap during forecasted customer peak",
                reasoning: "Understaffing cost vs on-call activation; net positive",
                action: "Schedule adjusted · on-call associate activated · manager task created",
                impact_usd: 920, impact_label: "Revenue recovered", status: "executed",
            },
            {
                id: "#8833",
                trigger: "Dairy promotion out of sync with inventory position",
                reasoning: "Price-point model recalculated against current shelf state",
                action: "Promotion updated · regional area-lead alert fired",
                impact_usd: 1600, impact_label: "Revenue recovered", status: "executed",
            },
        ],
    },
    {
        id: "regional-view",
        section: "Scene 7 · Regional Execution View",
        focus: "regional-view",
        fallback_ms: 38000,
        narration:
            "Zoom out. A regional manager oversees fifty to three hundred stores. Every location " +
            "is ranked by live financial risk. The top ten actions surface automatically. No " +
            "dashboards to hunt through. No reports to read. Just the next action to execute, " +
            "with the dollar impact attached.",
        actions: [{
            id: "#8841",
            trigger: "Regional portfolio scored across 187 locations",
            reasoning: "Weighted financial risk × opportunity × maintenance backlog ranking applied",
            action: "Top 10 priority actions pushed to regional operator dashboard",
            impact_usd: 14200, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "executive-view",
        section: "Scene 8 · Role-Tailored Execution",
        focus: "executive-view",
        fallback_ms: 38000,
        narration:
            "CEO sees enterprise performance. COO sees execution bottlenecks. CFO sees savings, " +
            "leakage, and return on investment — every dollar traceable to an Action ID. " +
            "Regional sees store priorities. Store managers see simple daily tasks. " +
            "One system. Every role. Every level. Aligned on execution.",
        actions: [{
            id: "#8851",
            trigger: "Executive digest generation due · financial period close",
            reasoning: "Role-permission filters applied to rationale ledger · PII redacted",
            action: "CEO / COO / CFO / Regional / Store digests generated and dispatched",
            impact_usd: 0, impact_label: "Governance", status: "executed",
        }],
    },
    {
        id: "autonomous",
        section: "Scene 9 · Assisted ↔ Autonomous Execution",
        focus: "autonomous",
        fallback_ms: 36000,
        narration:
            "Two execution modes. In manual mode, every action waits for human approval. In auto " +
            "mode, CreatorBoostAI creates tasks, sends alerts, drafts vendor emails, triggers " +
            "workflows, and logs results — automatically. The toggle is real-time and operator-level. " +
            "Control stays with the humans. Execution speed stays with the system.",
        actions: [{
            id: "#8861",
            trigger: "Execution mode toggle requested · regional scope",
            reasoning: "Role permissions verified; audit log initiated for mode change",
            action: "Auto mode engaged · every decision still logged to the Sovereign Vault",
            impact_usd: 0, impact_label: "Control", status: "executed",
        }],
    },
    {
        id: "c-store",
        section: "Scene 10 · Convenience + Fuel Operations",
        focus: "c-store",
        fallback_ms: 42000,
        narration:
            "Convenience stores and fuel forecourts come into focus. POS systems, fuel monitoring, " +
            "tank telemetry, food freshness, forecourt maintenance. In C-stores, speed matters. " +
            "The engine detects, reasons, and executes faster than small issues can become lost " +
            "sales. Every pump minute of downtime has a dollar attached.",
        actions: [
            {
                id: "#8871",
                trigger: "Fuel pump 4 downtime 12 minutes during peak · lost-sale exposure $340/hr",
                reasoning: "Detected ↔ fuel monitoring signal; vendor response SLA breach flagged",
                action: "Technician dispatched · backup pump pricing adjusted · loyalty push activated",
                impact_usd: 680, impact_label: "Revenue recovered", status: "executed",
            },
            {
                id: "#8872",
                trigger: "Hot-food freshness window expiring on 38 items",
                reasoning: "FRESHNESS REVENUE ENGINE · discount-vs-write-off model",
                action: "Flash promotion pushed to forecourt signage and mobile app",
                impact_usd: 420, impact_label: "Revenue recovered", status: "executed",
            },
        ],
    },
    {
        id: "fleet-supply",
        section: "Scene 11 · Fleet & Supply-Chain Execution",
        focus: "fleet-supply",
        fallback_ms: 38000,
        narration:
            "Trucks, warehouses, delivery routes, and store-level demand feed into one execution " +
            "view. Late deliveries detected. Reasoned against regional demand. Routes re-prioritized " +
            "automatically. Backhaul opportunities captured. The supply chain responds — it no " +
            "longer reacts.",
        actions: [{
            id: "#8881",
            trigger: "Delivery delay predicted on 6 routes · 41 stores affected",
            reasoning: "Route re-optimization vs customer-facing stock-out impact",
            action: "Routes re-prioritized · backhaul slots claimed · affected managers notified",
            impact_usd: 3100, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "maintenance",
        section: "Scene 12 · Maintenance as Execution Discipline",
        focus: "maintenance",
        fallback_ms: 38000,
        narration:
            "Work orders flow in across the chain. The engine identifies what is urgent, which " +
            "vendors are slow, which repairs are costing too much, which equipment is hurting " +
            "sales, which preventive work pays for itself. Maintenance stops being a backlog. " +
            "It becomes a measurable financial discipline.",
        actions: [{
            id: "#8891",
            trigger: "Maintenance backlog analysis · 2,840 open work orders",
            reasoning: "Urgency × revenue-exposure × vendor-reliability prioritization applied",
            action: "Top-47 work orders re-sequenced · 3 vendors flagged for review",
            impact_usd: 7200, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "cost-recovery",
        section: "Scene 13 · Cost Recovery & Asset Intelligence · Purchase Vault",
        focus: "cost-recovery",
        fallback_ms: 48000,
        narration:
            "The Purchase Vault reads purchasing logs, maintenance histories, vendor invoices, and " +
            "equipment records chain-wide. It detects repeated service calls on the same unit, " +
            "rising cost curves, end-of-life equipment, and vendor overcharging. For every flag it " +
            "recommends a clear action — replace versus repair, vendor escalation, capital upgrade " +
            "with payback. Every leak is found, ranked, and recovered.",
        actions: [
            {
                id: "#8901",
                trigger: "Same refrigeration unit · 7 service calls in 14 months",
                reasoning: "Replace-vs-repair model · lifecycle-end confidence 89% · payback 14 months",
                action: "Replacement proposal generated · warranty coverage applied to new unit",
                impact_usd: 6200, impact_label: "Savings", status: "pending",
            },
            {
                id: "#8902",
                trigger: "Vendor invoicing deviation · 4.2% above contract rate on 22 invoices",
                reasoning: "Purchase Vault cross-reference flagged overcharge pattern",
                action: "Recovery claim drafted · accounts payable notified · contract review queued",
                impact_usd: 4100, impact_label: "Savings", status: "executed",
            },
        ],
    },
    {
        id: "self-funding",
        section: "Scene 14 · Self-Funding Upgrade System",
        focus: "self-funding",
        fallback_ms: 44000,
        narration:
            "Most retailers know they need upgrades — efficient lighting, newer refrigeration, " +
            "smarter equipment — but the capital is never approved. CreatorBoostAI changes the " +
            "equation. It routes a portion of the savings it is already recovering into a modeled " +
            "upgrade fund. The savings pay for the upgrade. The upgrade compounds the savings. " +
            "No upfront capital required.",
        actions: [{
            id: "#8911",
            trigger: "Rolling 90-day savings exceed upgrade capital threshold",
            reasoning: "Self-funding model · savings pool $48,400 → lighting + refrigeration tier-1 funded",
            action: "Self-funded upgrade plan generated · capital committee notified",
            impact_usd: 48400, impact_label: "Savings", status: "pending",
        }],
    },
    {
        id: "warranty",
        section: "Scene 15 · Warranty Enforcement at Scale",
        focus: "warranty",
        fallback_ms: 42000,
        narration:
            "Every upgrade surfaces with a five to seven year third-party warranty covering parts, " +
            "service, and replacements. The engine monitors warranty coverage on every asset, " +
            "tracks every service call against the active warranty, and enforces replacement " +
            "obligations automatically. Most organizations unknowingly pay for repairs that should " +
            "be covered. CreatorBoostAI prevents that leakage.",
        actions: [{
            id: "#8921",
            trigger: "Service call submitted · equipment under active warranty",
            reasoning: "Warranty match · enforcement logic invoked · vendor obligation active",
            action: "Warranty claim auto-filed · invoice intercepted before payment",
            impact_usd: 1850, impact_label: "Savings", status: "executed",
        }],
    },
    {
        id: "financial-impact",
        section: "Scene 16 · Financial Impact Dashboard",
        focus: "financial-impact",
        fallback_ms: 38000,
        narration:
            "Every action ties to a number. Estimated savings. Revenue recovered. Maintenance " +
            "cost avoided. Labor efficiency. Energy reduction. Inventory waste prevented. Every " +
            "recommendation is tagged with a measurable financial outcome the moment it executes. " +
            "Not estimates — traceable dollars with Action IDs.",
        actions: [{
            id: "#8931",
            trigger: "Period-close impact report due · executive distribution",
            reasoning: "Aggregate ledger · per-Action-ID financial rollup · role-filtered views",
            action: "Financial impact digest generated · every dollar tagged to originating Action ID",
            impact_usd: 0, impact_label: "Reporting", status: "executed",
        }],
    },
    {
        id: "closing",
        section: "Scene 17 · Portfolio Command Center · Execute Upgrade",
        focus: "closing",
        fallback_ms: 42000,
        narration:
            "Your stores already generate the data. CreatorBoostAI turns that data into action. " +
            "Detect every signal. Reason against financial impact. Execute every action. Measure " +
            "every outcome. The Portfolio Command Center lets you run an upgrade across every " +
            "location — rollout plan, vendor coordination, proposals, task scheduling — with one " +
            "click. This is CreatorBoostAI. The execution layer for modern retail operations.",
        actions: [{
            id: "#8999",
            trigger: "Portfolio upgrade requested · operator role verified",
            reasoning: "Self-funding model + warranty coverage + vendor readiness = GO",
            action: "Portfolio upgrade rollout initiated · every location sequenced",
            impact_usd: 0, impact_label: "Execution", status: "executing",
        }],
    },
];

const SCENE_GAP_MS = 600;

// Maps scene focus key → curated background image (used as opacity layer).
const SCENE_BG_MAP = {
    "opening":          SCENE_IMG_RETAIL.opening,
    "existing-systems": SCENE_IMG_RETAIL.existingSystems,
    "command-center":   SCENE_IMG_RETAIL.commandCenter,
    "money-saving":     SCENE_IMG_RETAIL.moneySaving,
    "revenue-making":   SCENE_IMG_RETAIL.revenueMaking,
    "store-example":    SCENE_IMG_RETAIL.storeExample,
    "regional-view":    SCENE_IMG_RETAIL.regionalView,
    "executive-view":   SCENE_IMG_RETAIL.executiveView,
    "autonomous":       SCENE_IMG_RETAIL.autonomous,
    "c-store":          SCENE_IMG_RETAIL.cStore,
    "fleet-supply":     SCENE_IMG_RETAIL.fleetSupply,
    "maintenance":      SCENE_IMG_RETAIL.maintenance,
    "cost-recovery":    SCENE_IMG_RETAIL.costRecovery,
    "self-funding":     SCENE_IMG_RETAIL.selfFunding,
    "warranty":         SCENE_IMG_RETAIL.warranty,
    "financial-impact": SCENE_IMG_RETAIL.financialImpact,
    "closing":          SCENE_IMG_RETAIL.closing,
};

// =================================================================
// PAGE
// =================================================================
export default function SupermarketDemoPage() {
    const [started, setStarted] = useState(false);
    const [scene, setScene] = useState(0);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [audioCache, setAudioCache] = useState({});
    const [prefetching, setPrefetching] = useState(false);
    const [prefetchProgress, setPrefetchProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [overlayDismissed, setOverlayDismissed] = useState(false);
    const [sceneElapsed, setSceneElapsed] = useState(0);

    const audioRef = useRef(null);
    const advanceTimer = useRef(null);
    const maxTimer = useRef(null);
    const tickTimer = useRef(null);
    const sceneStart = useRef(0);
    const pausedRef = useRefMirror(paused);
    const mutedRef = useRefMirror(muted);
    const audioCacheRef = useRefMirror(audioCache);
    useDemoCleanup(audioRef, audioCacheRef);

    // ─── Agentic Execution OS ──────────────────────────────────
    const engine = useAgenticEngine({ initialMode: "auto" });

    const current = SCENES[scene];
    const total = SCENES.length;
    const totalRuntimeMs = useMemo(() => SCENES.reduce((a, s) => a + (s.fallback_ms || 40000), 0), []);
    const elapsedBeforeScene = useMemo(
        () => SCENES.slice(0, scene).reduce((a, s) => a + (s.fallback_ms || 40000), 0),
        [scene]
    );
    const overallProgress = Math.min(100, Math.round(((elapsedBeforeScene + sceneElapsed) / totalRuntimeMs) * 100));

    const apiBase = useMemo(() => `${process.env.REACT_APP_BACKEND_URL || ""}/api`, []);
    const { personalization, trackEvent, sessionId } = useDemoTracking({
        demoType: "supermarket",
        started, scene, totalScenes: total,
        watchSeconds: Math.round((elapsedBeforeScene + sceneElapsed) / 1000),
        overallProgress, done,
    });

    const prefetchAll = useCallback(async () => {
        setPrefetching(true);
        setPrefetchProgress(0);
        const cache = {};
        let donec = 0;
        const fetchOne = async (s) => {
            try {
                const res = await fetch(`${apiBase}/tts/speak`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: s.narration, voice: "sage" }),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    cache[s.id] = URL.createObjectURL(blob);
                }
            } catch { /* fallback to speechSynthesis */ }
            donec += 1;
            setPrefetchProgress(Math.round((donec / SCENES.length) * 100));
        };
        const CONCURRENCY = 5;
        for (let i = 0; i < SCENES.length; i += CONCURRENCY) {
            await Promise.all(SCENES.slice(i, i + CONCURRENCY).map(fetchOne));
        }
        setAudioCache(cache);
        setPrefetching(false);
        return cache;
    }, [apiBase]);

    const clearAllTimers = () => {
        clearTimeout(advanceTimer.current);
        clearTimeout(maxTimer.current);
        clearInterval(tickTimer.current);
    };

    const goToNext = useCallback(() => {
        clearAllTimers();
        setScene((p) => {
            if (p >= total - 1) { setDone(true); return p; }
            return p + 1;
        });
    }, [total]);

    const speakScene = useCallback((idx, cache = audioCache) => {
        clearAllTimers();
        if (audioRef.current) { hardSilence(audioRef); }
        const sc = SCENES[idx]; if (!sc) return;
        sceneStart.current = Date.now();
        setSceneElapsed(0);
        tickTimer.current = setInterval(() => setSceneElapsed(Date.now() - sceneStart.current), 250);
        const maxMs = sc.fallback_ms || 40000;
        maxTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs + 1500);

        if (muted) {
            setSpeaking(false);
            advanceTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs);
            return;
        }
        const url = cache[sc.id];
        if (url && audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.muted = false;
            audioRef.current.play().then(() => setSpeaking(true)).catch(() => setSpeaking(false));
        } else if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(sc.narration);
            u.rate = 0.97;
            const voices = window.speechSynthesis.getVoices();
            const female = voices.find((v) => /samantha|victoria|ava|allison|en-us.*female/i.test(v.name + " " + v.lang))
                || voices.find((v) => v.lang === "en-US")
                || voices.find((v) => v.lang?.startsWith("en"));
            if (female) u.voice = female;
            u.onstart = () => setSpeaking(true);
            u.onend = () => {
                setSpeaking(false);
                if (pausedRef.current) return;
                advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
            };
            window.speechSynthesis.speak(u);
        } else {
            advanceTimer.current = setTimeout(() => { if (!pausedRef.current) goToNext(); }, maxMs);
        }
    }, [audioCache, muted, paused, goToNext]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const a = audioRef.current; if (!a) return;
        const onEnded = () => {
            setSpeaking(false);
            if (pausedRef.current) return;
            advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
        };
        const onPlay = () => setSpeaking(true);
        const onPause = () => setSpeaking(false);
        const onError = () => {
            setSpeaking(false);
            if (pausedRef.current) return;
            advanceTimer.current = setTimeout(goToNext, SCENE_GAP_MS);
        };
        a.addEventListener("ended", onEnded);
        a.addEventListener("play", onPlay);
        a.addEventListener("pause", onPause);
        a.addEventListener("error", onError);
        return () => {
            a.removeEventListener("ended", onEnded);
            a.removeEventListener("play", onPlay);
            a.removeEventListener("pause", onPause);
            a.removeEventListener("error", onError);
        };
    }, [paused, goToNext]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!started) return;
        speakScene(scene);
        // Fire each scene's static Action IDs into the agentic engine.
        const acts = (SCENES[scene] && SCENES[scene].actions) || [];
        acts.forEach((a, i) => setTimeout(() => engine.fire(a), 300 + i * 900));
        return () => clearAllTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, started]);

    // (page-hide / before-unload / visibility / unmount cleanup is handled by useDemoCleanup hook above)

    const handleStart = async () => {
        setStarted(true);
        setScene(0); setDone(false); setPaused(false);
        engine.reset();
        const cache = await prefetchAll();
        setTimeout(() => speakScene(0, cache), 200);
    };
    const handlePauseResume = () => {
        if (paused) {
            setPaused(false);
            if (audioRef.current?.src) audioRef.current.play().catch(() => {});
            const remaining = Math.max(2000, (current.fallback_ms || 40000) + 1500 - sceneElapsed);
            sceneStart.current = Date.now() - sceneElapsed;
            tickTimer.current = setInterval(() => setSceneElapsed(Date.now() - sceneStart.current), 250);
            maxTimer.current = setTimeout(() => goToNext(), remaining);
        } else {
            setPaused(true);
            clearAllTimers();
            hardSilence(audioRef);
        }
    };
    const handleRestart = () => {
        clearAllTimers();
        hardSilence(audioRef);
        setScene(0); setDone(false); setPaused(false);
        setTimeout(() => speakScene(0), 150);
    };
    // ----- Scene scrubbing + save-dialog (shared pattern) -----
    const jumpToScene = (idx) => {
        const bounded = Math.max(0, Math.min(SCENES.length - 1, idx));
        clearAllTimers();
        hardSilence(audioRef);
        setScene(bounded);
        setDone(false);
        setSceneElapsed(0);
        sceneStart.current = Date.now();
        setPaused(false);
        setTimeout(() => speakScene(bounded), 150);
    };
    const handlePrevScene = () => jumpToScene(scene - 1);
    const handleNextScene = () => jumpToScene(scene + 1);
    const [saveOpen, setSaveOpen] = useState(false);
    const openSaveDialog = () => {
        if (!paused) {
            setPaused(true);
            clearAllTimers();
            hardSilence(audioRef);
        }
        setSaveOpen(true);
    };
    const handleMute = () => {
        setMuted((p) => {
            const n = !p;
            if (n) hardSilence(audioRef);
            else setTimeout(() => speakScene(scene), 100);
            return n;
        });
    };

    return (
        <Layout hideFooter>
            <audio ref={audioRef} className="hidden" preload="auto" playsInline />
            {started && (
                <>
                    <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 bg-white/5" data-testid="supermarket-global-timeline">
                        <div className="h-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 transition-[width] duration-300" style={{ width: `${overallProgress}%` }} />
                    </div>
                    <div className="pointer-events-none fixed left-1/2 top-1.5 z-[60] -translate-x-1/2 rounded-full border border-cyan-500/30 bg-ink-900/85 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-md">
                        {scene + 1}/{total} · {current.section} · {overallProgress}%
                    </div>
                </>
            )}

            <div className="relative mx-auto max-w-[1600px] px-4 py-8 lg:px-8" data-testid="supermarket-demo-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-50" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 480, height: 480, top: -160, left: -120 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -180, right: -100 }} />
                </div>

                <Hero personalization={personalization} />

                {!started ? (
                    <StartScreen onStart={handleStart} prefetching={prefetching} progress={prefetchProgress} personalization={personalization} />
                ) : (
                    <div className="mt-6">
                        <SceneHeader scene={scene} current={current} total={total} paused={paused} speaking={speaking} muted={muted} onPauseResume={openSaveDialog} onMute={handleMute} onPrev={handlePrevScene} onNext={handleNextScene} onJump={jumpToScene} scenes={SCENES} />
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <SceneStage scene={current} />
                                {/* Portfolio Command Center — scene 17 only */}
                                {current.focus === "closing" && (
                                    <div className="mt-4">
                                        <PortfolioCommandCenter totals={engine.totals} testId="supermarket-portfolio" />
                                    </div>
                                )}
                                {/* Revenue / Savings Counter — always visible under the stage */}
                                <div className="mt-4">
                                    <RevenueSavingsCounter totals={engine.totals} testId="supermarket-counter" />
                                </div>
                            </div>
                            <div className="space-y-4 lg:col-span-4">
                                <NarrationPanel
                                    narration={current.narration}
                                    speaking={speaking} muted={muted} paused={paused}
                                    onMute={handleMute}
                                    personalGreeting={scene === 0 && personalization?.name
                                        ? `Hello ${personalization.name}${personalization.company ? ` from ${personalization.company}` : ""} — this CreatorBoostAI retail walkthrough was prepared just for you.`
                                        : null}
                                />
                                {/* Agentic Execution OS overlay — Action Ledger · Reasoning Stream · Controls · Vault */}
                                <ActionLedger ledger={engine.ledger} testId="supermarket-ledger" />
                                <ReasoningStream stream={engine.stream} testId="supermarket-stream" />
                                <ExecutionControlPanel mode={engine.mode} setMode={engine.setMode} role="Regional Operator" testId="supermarket-control" />
                                <div className="flex items-center justify-between rounded-md border border-white/5 bg-ink-700/30 px-3 py-2">
                                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Traceability</p>
                                    <SovereignVault testId="supermarket-vault" />
                                </div>
                                <SceneIndex current={scene} total={total} />
                            </div>
                        </div>
                        {(current.focus === "closing" || done) && (
                            <div className="mt-6"><ShareModule onReplay={handleRestart} trackEvent={trackEvent} /></div>
                        )}
                    </div>
                )}
            </div>
            <ActivateCommandCenter
                open={done && !overlayDismissed}
                onClose={() => setOverlayDismissed(true)}
                industry="Retail / Supermarket"
                demoOrigin="supermarket"
                capability={[
                    "Shrink + waste detection across stores",
                    "Smart replenishment + supplier orchestration",
                    "Energy + cold-chain monitoring",
                    "Store-level command center + KPIs",
                ]}
            />
            <SavePauseDialog
                open={saveOpen}
                onClose={() => setSaveOpen(false)}
                onContinue={() => { setSaveOpen(false); handlePauseResume(); }}
                demoType="supermarket"
                scene={scene}
                totalScenes={total}
                demoOrigin="supermarket"
                sessionId={sessionId}
                industry="Retail / Supermarket"
            />
        </Layout>
    );
}

// =================================================================
// HERO + START
// =================================================================
const Hero = ({ personalization }) => (
    <section className="relative" data-testid="supermarket-hero">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Enterprise · Supermarket / C-Store / Retail</span>
        </div>
        {personalization?.greeting && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200" data-testid="supermarket-personalized-greeting">
                {personalization.greeting}
            </p>
        )}
        <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Your stores already generate the data.{" "}
            <span className="text-cyan-400">CreatorBoostAI turns that data into action.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
            A 13-minute walkthrough of the execution layer for modern retail operations. CreatorBoostAI
            sits on top of your existing ERP, retail, workforce, maintenance, CRM, fleet, fuel, and
            store-level POS systems — and helps operators see problems, prioritize actions, reduce waste, save money, and recover revenue across every store.
        </p>
    </section>
);

const StartScreen = ({ onStart, prefetching, progress, personalization }) => (
    <div className="mt-8 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Cinematic Demo Console</p>
                {personalization?.greeting && (
                    <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200" data-testid="supermarket-start-personalized">
                        {personalization.greeting}
                    </p>
                )}
                <h2 className="font-heading mt-4 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Run the 17-scene Supermarket &amp; C-Store walkthrough.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    A fully automated 17-scene cinematic walkthrough — narrated by Sage (female · American)
                    — designed for grocery, supermarket, and convenience-store enterprises. CreatorBoostAI
                    overlays your existing systems, prioritizes actions by financial impact, and helps
                    every level of the operation execute. No clicks. Approximately 12 to 14 minutes.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button onClick={onStart} disabled={prefetching} data-testid="start-supermarket-demo-btn"
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-7 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] disabled:opacity-60">
                        {prefetching ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900 border-t-transparent" />Prefetching · {progress}%</> : <><Play size={14} fill="currentColor" />Start Demo</>}
                    </button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Auto-plays · ~14 min · Voice: Sage</span>
                </div>
                <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                        "17 cinematic scenes",
                        "ERP · Retail · CRM",
                        "Maintenance · Workforce",
                        "Fleet · Supply Chain · POS",
                        "C-Store · Fuel · Forecourt",
                        "CEO · COO · CFO · Regional · Store views",
                        "Money saving + revenue recovery scenarios",
                        "Cost recovery + asset intelligence",
                        "Self-funding upgrade system",
                        "Warranty enforcement at scale",
                        "Assisted + Autonomous execution modes",
                    ].map((b) => (
                        <li key={b} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <Check size={13} className="text-cyan-400" /> {b}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="lg:col-span-5">
                <div className="rounded-sm border border-white/10 bg-ink-800 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">The story arc</p>
                    <ol className="mt-4 space-y-2 text-sm">
                        {[
                            "The Modern Retail Operation",
                            "The Existing Systems Layer",
                            "The Operations Command Center",
                            "Money-Saving Scenarios",
                            "Revenue-Making Scenarios",
                            "Store-Level Example · Store 1142",
                            "Regional Operator View",
                            "Executive View · CEO · COO · CFO",
                            "Assisted + Autonomous Execution",
                            "C-Store + Fuel Operations",
                            "Fleet and Supply Chain",
                            "Maintenance and Facilities",
                            "Cost Recovery + Asset Intelligence",
                            "The Self-Funding Upgrade System",
                            "Warranty Enforcement at Scale",
                            "Financial Impact Dashboard",
                            "The Execution Layer for Retail",
                        ].map((b, i) => (
                            <li key={b} className="flex items-start gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                                <span className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-2 py-0.5 text-[9px] text-cyan-300">{String(i + 1).padStart(2, "0")}</span>
                                <span>{b}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    </div>
);

const SceneHeader = ({ scene, current, total, paused, speaking, muted, onPauseResume, onMute, onPrev, onNext, onJump, scenes }) => (
    <div className="sticky top-0 z-50 -mx-4 mb-2 border-b border-white/10 bg-ink-900/90 px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8" data-testid="scene-header">
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Scene {scene + 1} of {total}</p>
                <p className="truncate font-heading text-base font-semibold text-white sm:text-lg">{current.section}</p>
            </div>
            <div className="flex items-center gap-2">
                {onPrev && (<Btn onClick={onPrev} icon={SkipBack} label="Prev scene" testid="prev-scene-btn" disabled={scene <= 0} />)}
                <Btn onClick={onPauseResume} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} primary testid="pause-btn" />
                {onNext && (<Btn onClick={onNext} icon={SkipForward} label="Next scene" testid="next-scene-btn" disabled={scene >= total - 1} />)}
                <Btn onClick={onMute} icon={muted ? VolumeX : Volume2} label={muted ? "Muted" : "On"} testid="mute-btn" />
                {onJump && scenes && (
                    <select data-testid="scene-jump" value={scene} onChange={(e) => onJump(Number(e.target.value))} aria-label="Jump to scene" className="rounded-md border border-white/10 bg-ink-900 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200 focus:border-cyan-500/50 focus:outline-none">
                        {scenes.map((s, i) => (<option key={i} value={i}>{String(i + 1).padStart(2, "0")} · {s.section}</option>))}
                    </select>
                )}
                {speaking && !muted && !paused && (
                    <span className="hidden items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 sm:inline-flex">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> Live narration
                    </span>
                )}
            </div>
        </div>
    </div>
);

const Btn = ({ onClick, icon: Icon, label, primary, testid, disabled }) => (
    <button onClick={onClick} data-testid={testid} disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-all disabled:cursor-not-allowed disabled:opacity-40 ${primary ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-ink-900" : "border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"}`}>
        <Icon size={12} /> <span>{label}</span>
    </button>
);

const NarrationPanel = ({ narration, speaking, muted, paused, onMute, personalGreeting }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Mic size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Narration · Sage</span>
            </div>
            <button onClick={onMute} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 hover:text-cyan-300">
                {muted ? <VolumeX size={11} /> : <Volume2 size={11} />} <span>{muted ? "Off" : "On"}</span>
            </button>
        </div>
        {personalGreeting && (
            <p className="mt-3 rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-sm leading-relaxed text-cyan-100" data-testid="supermarket-avatar-greeting">
                {personalGreeting}
            </p>
        )}
        <div className="mt-3 max-h-[26rem] overflow-y-auto pr-1">
            <p className={`text-sm leading-relaxed text-slate-200 transition-opacity ${speaking && !muted && !paused ? "opacity-100" : "opacity-80"}`}>{narration}</p>
        </div>
    </div>
);

const SceneIndex = ({ current, total }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/40 p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Scene Index</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{current + 1} / {total}</span>
        </div>
        <ul className="mt-3 space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {SCENES.map((s, i) => (
                <li key={s.id} className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${i === current ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : i < current ? "border-white/5 text-slate-500" : "border-white/5 text-slate-300"}`}>
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border border-white/10 text-[9px]">{i + 1}</span>
                    <span className="truncate">{s.section.replace(/^Scene \d+ · /, "")}</span>
                    {i < current && <Check size={10} className="ml-auto text-cyan-400/80" />}
                </li>
            ))}
        </ul>
    </div>
);

// Per-stage hero strip — a 16:9 photo placed above the structured cards.
const StageImage = ({ src, alt, badge }) => (
    <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md border border-cyan-500/20 sm:h-40 lg:h-48" data-testid="stage-image">
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/30 to-transparent" />
        {badge && (
            <span className="absolute bottom-2 left-2 rounded-full border border-cyan-500/40 bg-ink-900/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-md">
                {badge}
            </span>
        )}
    </div>
);

// Per-stage badge labels for the StageImage strip
const STAGE_BADGES = {
    "opening":          "Modern Retail Operation",
    "existing-systems": "Systems Layer · ERP · Retail · CRM",
    "command-center":   "Operations Command Center",
    "money-saving":     "Money-Saving Scenarios",
    "revenue-making":   "Revenue-Making Scenarios",
    "store-example":    "Store 1142 · Live View",
    "regional-view":    "Regional Manager · 184 Stores",
    "executive-view":   "CEO · COO · CFO · Regional · Store",
    "autonomous":       "Assisted ⇄ Autonomous Mode",
    "c-store":          "C-Store + Forecourt",
    "fleet-supply":     "Fleet + Supply Chain",
    "maintenance":      "Maintenance + Facilities",
    "cost-recovery":    "Cost Recovery + Asset Intelligence",
    "self-funding":     "Self-Funding Upgrade System",
    "warranty":         "Warranty Enforcement at Scale",
    "financial-impact": "Financial Impact Dashboard",
    "closing":          "The Execution Layer for Retail",
};

// =================================================================
// SCENE STAGES — CreatorBoostAI operational execution layer
// =================================================================
const SceneStage = ({ scene }) => {
    const StageBody = (() => {
        switch (scene.focus) {
            case "opening":          return <OpeningStage />;
            case "existing-systems": return <ExistingSystemsStage />;
            case "command-center":   return <CommandCenterStage />;
            case "money-saving":     return <MoneySavingStage />;
            case "revenue-making":   return <RevenueMakingStage />;
            case "store-example":    return <StoreExampleStage />;
            case "regional-view":    return <RegionalViewStage />;
            case "executive-view":   return <ExecutiveViewStage />;
            case "autonomous":       return <AutonomousModeStage />;
            case "c-store":          return <CStoreStage />;
            case "fleet-supply":     return <FleetSupplyStage />;
            case "maintenance":      return <MaintenanceStage />;
            case "cost-recovery":    return <CostRecoveryStage />;
            case "self-funding":     return <SelfFundingStage />;
            case "warranty":         return <WarrantyStage />;
            case "financial-impact": return <FinancialImpactStage />;
            case "closing":          return <ClosingStage />;
            default:                 return null;
        }
    })();
    const img = SCENE_BG_MAP[scene.focus];
    const badge = STAGE_BADGES[scene.focus];
    return (
        <div className="space-y-0">
            {img && <StageImage src={img} alt={badge || scene.section} badge={badge} />}
            {StageBody}
        </div>
    );
};

const KV = ({ label, value }) => (
    <div className="rounded-sm border border-white/5 bg-ink-900 px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">{value}</p>
    </div>
);

const KPI = ({ Icon, label, value, trend }) => (
    <div className="rounded-sm border border-white/10 bg-ink-900 p-3">
        <div className="flex items-center gap-2">
            {Icon && <Icon size={12} className="text-cyan-400" />}
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        </div>
        <p className="mt-1 font-heading text-xl font-semibold text-white">{value}</p>
        {trend && <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{trend}</p>}
    </div>
);

// ---- 1. Opening (scale of operation)
const OpeningStage = () => {
    const stats = [
        { Icon: Building2,  label: "Active stores",        value: "2,415",    trend: "across U.S. + LATAM + EU + APAC" },
        { Icon: Truck,      label: "Trucks · routes / day", value: "412 / 1,840", trend: "Fleet layer" },
        { Icon: Fuel,       label: "Fuel locations",         value: "618",     trend: "Fuel systems" },
        { Icon: Users,      label: "Active employees",       value: "47,200",  trend: "across all banners" },
        { Icon: Wrench,     label: "Open work orders",       value: "8,418",   trend: "Maintenance layer" },
        { Icon: Boxes,      label: "Inventory SKUs",         value: "1.4M",    trend: "Retail / ERP layer" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-opening">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Globe2 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Modern Retail at Scale</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Live operational footprint</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {stats.map((s, i) => (
                    <div key={s.label} className="rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center gap-2"><s.Icon size={12} className="text-cyan-400" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{s.label}</span></div>
                        <p className="mt-1 font-heading text-xl font-semibold text-white">{s.value}</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{s.trend}</p>
                    </div>
                ))}
            </div>
            <p className="mt-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">Large retailers do not need another disconnected tool.</span> They need an execution layer that helps their existing systems work together.
            </p>
        </div>
    );
};

// ---- 2. Existing systems
const ExistingSystemsStage = () => {
    const groups = [
        { label: "ERP",          items: ["Enterprise resource planning", "Finance consolidation"],  Icon: Cpu },
        { label: "Retail",       items: ["Merchandising", "Price & promotion"],                     Icon: ShoppingCart },
        { label: "Workforce",    items: ["Scheduling", "Forecasted labor"],                         Icon: Users },
        { label: "Maintenance",  items: ["Work-order routing", "Facilities systems"],               Icon: Wrench },
        { label: "CRM",          items: ["Customer + loyalty"],                                     Icon: Sparkles },
        { label: "Fleet",        items: ["Transportation mgmt", "Route + telematics"],              Icon: Truck },
        { label: "C-Store + Fuel", items: ["Forecourt POS", "Tank monitoring", "Fuel pricing"],     Icon: Fuel },
        { label: "Store POS",    items: ["Lane terminals", "Self-checkout", "Mobile POS", "Banner-level POS"],          Icon: ScanLine },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-existing-systems">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Layers size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI sits on top · No replacement · No migration</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">One command view</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {groups.map((g, i) => (
                    <div key={g.label} className="rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                        <div className="flex items-center gap-2"><g.Icon size={12} className="text-cyan-300" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{g.label}</span></div>
                        <ul className="mt-2 space-y-0.5">
                            {g.items.map((it) => (
                                <li key={it} className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">{it}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Executives · Regional Managers · Store Operators · Maintenance Teams — one command view.
            </p>
        </div>
    );
};

// ---- 3. Operations Command Center
const CommandCenterStage = () => {
    const streams = [
        "Sales", "Inventory", "Labor", "Maintenance", "Refrigeration",
        "Fleet", "Fuel", "Marketing", "Pricing", "Store Tasks",
        "Vendor Performance", "Customer Demand", "Regional Performance",
    ];
    const questions = [
        { Icon: AlertTriangle, q: "What needs attention first?" },
        { Icon: Target,        q: "What action should be taken?" },
        { Icon: Users,         q: "Who should handle it?" },
        { Icon: BarChart3,     q: "What is the financial impact?" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-command-center">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Cpu size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Operations Command Center · LIVE</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">13 live streams</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
                {streams.map((s, i) => (
                    <span key={s} className="rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>{s}</span>
                ))}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {questions.map((q, i) => (
                    <div key={q.q} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                        <q.Icon size={14} className="text-cyan-300" />
                        <p className="mt-2 text-sm font-medium text-white">{q.q}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- 4. Money saving
const MoneySavingStage = () => {
    const items = [
        { label: "Refrigeration drift",         saved: "$182K / yr", Icon: Wrench },
        { label: "HVAC failure prevention",     saved: "$94K / yr",  Icon: Wrench },
        { label: "Lighting waste",              saved: "$48K / yr",  Icon: Activity },
        { label: "Overstaffing on slow days",   saved: "$128K / yr", Icon: Users },
        { label: "Understaffing during rush",   saved: "$76K / yr",  Icon: Users },
        { label: "Late maintenance response",   saved: "$112K / yr", Icon: AlertTriangle },
        { label: "Fuel inventory risk",         saved: "$68K / yr",  Icon: Fuel },
        { label: "Shrink + expired products",   saved: "$144K / yr", Icon: Package },
        { label: "Missed vendor credits",       saved: "$92K / yr",  Icon: Boxes },
    ];
    return (
        <div className="rounded-md border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-ink-900 p-5 fade-in-up" data-testid="stage-money-saving">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <DollarBadge />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Money-Saving Scenarios · per store / yr · sample</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Total est. $944K / store / yr</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it, i) => (
                    <div key={it.label} className="flex items-center gap-3 rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <it.Icon size={14} className="text-amber-300 flex-shrink-0" />
                        <span className="text-sm text-slate-200 flex-1">{it.label}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{it.saved}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- 5. Revenue making
const RevenueMakingStage = () => {
    const items = [
        { label: "Out-of-stock recovery",       lift: "+$214K / yr", Icon: Package },
        { label: "Better promotion timing",     lift: "+$148K / yr", Icon: Sparkles },
        { label: "Localized pricing",           lift: "+$96K / yr",  Icon: Target },
        { label: "Basket-size improvement",     lift: "+$184K / yr", Icon: ShoppingCart },
        { label: "Missed upsell recovery",      lift: "+$72K / yr",  Icon: ArrowRight },
        { label: "Fuel-to-store conversion",    lift: "+$118K / yr", Icon: Fuel },
        { label: "Loyalty campaign triggers",   lift: "+$62K / yr",  Icon: Users },
        { label: "Regional product demand",     lift: "+$92K / yr",  Icon: Globe2 },
        { label: "High-margin product focus",   lift: "+$108K / yr", Icon: BarChart3 },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-revenue-making">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Revenue-Making Scenarios · per store / yr · sample</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Total est. +$1.1M / store / yr</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it, i) => (
                    <div key={it.label} className="flex items-center gap-3 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <it.Icon size={14} className="text-cyan-300 flex-shrink-0" />
                        <span className="text-sm text-slate-200 flex-1">{it.label}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{it.lift}</span>
                    </div>
                ))}
            </div>
            <p className="mt-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">CreatorBoostAI does not just report problems.</span> It recommends and helps execute the next best action.
            </p>
        </div>
    );
};

// ---- 6. Store-level example (Store 1142)
const StoreExampleStage = () => {
    const issues = [
        { Icon: BarChart3,     label: "Dairy sales · -18% week-over-week",   tone: "rose" },
        { Icon: Wrench,        label: "Refrigeration alerts · DR-04, DR-07", tone: "amber" },
        { Icon: Users,         label: "Labor schedule gap · evening shift",  tone: "amber" },
        { Icon: AlertTriangle, label: "Customer complaints · +6 this week",  tone: "rose" },
    ];
    const actions = [
        { Icon: Wrench,    label: "Dispatch maintenance · work-order layer", status: "Sent" },
        { Icon: Users,     label: "Adjust labor schedule · workforce · evening", status: "Updated" },
        { Icon: Target,    label: "Trigger manager task · cold chain check",   status: "Assigned" },
        { Icon: Package,   label: "Reorder affected SKUs · retail layer",    status: "Reordered" },
        { Icon: Sparkles,  label: "Update dairy promotion · loyalty app",     status: "Live" },
        { Icon: Send,      label: "Send regional alert · Region 04 lead",     status: "Notified" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-700/50 to-ink-900/80 p-5 fade-in-up" data-testid="stage-store-example">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Store 1142 · NJ Region 04 · Connected View</span>
                </div>
                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">Financial impact $4,820 / day</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Issues detected</p>
                    <ul className="mt-3 space-y-2">
                        {issues.map((it, i) => (
                            <li key={it.label} className={`flex items-center gap-2 rounded-sm border p-2 fade-in-up ${it.tone === "rose" ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5"}`} style={{ animationDelay: `${i * 80}ms` }}>
                                <it.Icon size={13} className={it.tone === "rose" ? "text-rose-300" : "text-amber-300"} />
                                <span className="text-sm text-slate-200">{it.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Recommended actions · executed</p>
                    <ul className="mt-3 space-y-2">
                        {actions.map((a, i) => (
                            <li key={a.label} className="flex items-center gap-2 rounded-sm border border-cyan-500/30 bg-ink-900 p-2 fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
                                <a.Icon size={13} className="text-cyan-300" />
                                <span className="flex-1 text-sm text-slate-200">{a.label}</span>
                                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{a.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

// ---- 7. Regional view (rank stores)
const RegionalViewStage = () => {
    const stores = [
        { id: "1142 · NJ", risk: "$4,820/d", save: "$182K/yr", rev: "+$214K/yr", flag: "rose" },
        { id: "0411 · CA", risk: "$1,140/d", save: "$98K/yr",  rev: "+$148K/yr", flag: "amber" },
        { id: "2073 · TX", risk: "$3,210/d", save: "$132K/yr", rev: "+$184K/yr", flag: "rose" },
        { id: "1556 · IL", risk: "$680/d",   save: "$72K/yr",  rev: "+$96K/yr",  flag: "cyan" },
        { id: "0814 · FL", risk: "$2,420/d", save: "$118K/yr", rev: "+$108K/yr", flag: "amber" },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-regional-view">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Region 04 · 184 stores · ranked by financial priority</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">Top 5 today · sample</span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-sm border border-white/5">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-ink-900">
                        <tr>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Store</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Daily Risk</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Savings Opportunity</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Revenue Opportunity</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stores.map((s) => (
                            <tr key={s.id} className="border-t border-white/5">
                                <td className="px-3 py-2 text-white">{s.id}</td>
                                <td className="px-3 py-2 font-mono text-rose-300">{s.risk}</td>
                                <td className="px-3 py-2 font-mono text-amber-300">{s.save}</td>
                                <td className="px-3 py-2 font-mono text-cyan-300">{s.rev}</td>
                                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${s.flag === "rose" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : s.flag === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{s.flag === "rose" ? "Urgent" : s.flag === "amber" ? "Watch" : "Healthy"}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">Stop guessing. Manage by financial priority.</span>
            </p>
        </div>
    );
};

// ---- 8. Executive view (CEO/COO/CFO/Regional/Store)
const ExecutiveViewStage = () => {
    const roles = [
        { role: "CEO",      Icon: Crown,        sees: "Total enterprise performance",     metric: "+11.4% YoY · $42M influenced" },
        { role: "COO",      Icon: Workflow,     sees: "Execution bottlenecks",            metric: "184 critical · 8.2K open" },
        { role: "CFO",      Icon: BarChart3,    sees: "Savings · leakage · ROI",          metric: "$18.4M saved · ROI 4.2x" },
        { role: "Regional", Icon: MapPin,       sees: "Store action priorities",          metric: "12 urgent · 38 watch" },
        { role: "Store",    Icon: Building2,    sees: "Daily tasks · simple actions",     metric: "6 tasks · 2 vendor calls" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-executive-view">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Role-based views · One system · Every level aligned</span>
                </div>
            </div>
            <div className="mt-5 space-y-2.5">
                {roles.map((r, i) => (
                    <div key={r.role} className="grid grid-cols-1 gap-2 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 sm:grid-cols-12 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center gap-2 sm:col-span-2"><r.Icon size={13} className="text-cyan-300" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{r.role}</span></div>
                        <span className="text-sm text-slate-200 sm:col-span-6">{r.sees}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 sm:col-span-4">{r.metric}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- 9. Autonomous mode
const AutonomousModeStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-autonomous">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
                <Cpu size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Execution Mode · Operator-level toggle</span>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Assisted ⇄ Autonomous</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-ink-900 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Assisted Mode</p>
                <p className="mt-2 text-sm text-slate-200">CreatorBoostAI recommends actions and waits for human approval.</p>
                <ul className="mt-3 space-y-1.5">
                    {["Flag issue", "Recommend action", "Show financial impact", "Wait for sign-off"].map((s, i) => (
                        <li key={s} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                            <span className="h-1 w-1 rounded-full bg-amber-400" /> {s}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Autonomous Mode</p>
                <p className="mt-2 text-sm text-slate-200">CreatorBoostAI executes immediately and logs every action.</p>
                <ul className="mt-3 space-y-1.5">
                    {["Create task", "Send alerts", "Draft vendor email", "Update managers", "Trigger workflow", "Log result"].map((s, i) => (
                        <li key={s} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                            <CheckCircle2 size={11} className="text-cyan-400" /> {s}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Companies choose how much control they want — by store, by team, or by category.
        </p>
    </div>
);

// ---- 10. C-Store + fuel
const CStoreStage = () => {
    const tiles = [
        { Icon: Fuel,         label: "Fuel pricing",          detail: "Real-time · fuel systems" },
        { Icon: Boxes,        label: "Fuel inventory + tank", detail: "Tank monitoring · variance alert" },
        { Icon: AlertTriangle,label: "Pump downtime",         detail: "Pump 4 · 18 min · vendor pinged" },
        { Icon: ScanLine,     label: "POS issues",            detail: "Lane terminal · 2 lanes · auto ticket" },
        { Icon: Package,      label: "Food freshness",        detail: "Hot bar · expiring 38 min" },
        { Icon: Users,        label: "Labor coverage",        detail: "Saturday morning · -1 cashier" },
        { Icon: Truck,        label: "Delivery timing",       detail: "Late · ETA shifted +1:14" },
        { Icon: Shield,       label: "Security incident",     detail: "Forecourt · auto-escalated" },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-c-store">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Fuel size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">C-Store + Forecourt · fuel · POS · tank monitoring</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Speed matters</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {tiles.map((t, i) => (
                    <div key={t.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-center gap-2"><t.Icon size={13} className="text-cyan-300" /><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{t.label}</span></div>
                        <p className="mt-2 text-sm text-slate-200">{t.detail}</p>
                    </div>
                ))}
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Vendor + repair accountability · fleet card activity · forecourt maintenance — all in one view.
            </p>
        </div>
    );
};

// ---- 11. Fleet + supply chain
const FleetSupplyStage = () => {
    const exceptions = [
        { id: "RT-1142", route: "Bronx · Queens · LI",         issue: "Late · -32 min", action: "Reprioritized" },
        { id: "RT-2073", route: "Houston · Galveston",          issue: "Backhaul opp.",   action: "Added" },
        { id: "RT-0411", route: "LA · OC · San Diego",          issue: "Demand spike · Store 0411", action: "Express slot" },
        { id: "RT-0814", route: "Miami · Tampa",                 issue: "Fuel cost +6%",  action: "Route adj." },
    ];
    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 fade-in-up" data-testid="stage-fleet-supply">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Truck size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Fleet + Supply Chain · transportation layer</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">412 active routes</span>
            </div>
            <div className="mt-5 space-y-2.5">
                {exceptions.map((e, i) => (
                    <div key={e.id} className="grid grid-cols-1 gap-2 rounded-sm border border-white/10 bg-ink-900 p-3 sm:grid-cols-12 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 sm:col-span-2">{e.id}</span>
                        <span className="text-sm text-slate-200 sm:col-span-4"><MapPin size={11} className="inline mr-1 text-cyan-400" />{e.route}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 sm:col-span-3">{e.issue}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 sm:col-span-3">→ {e.action}</span>
                    </div>
                ))}
            </div>
            <p className="mt-4 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                Late deliveries · route prioritization · backhaul opportunities · fuel cost visibility · warehouse-to-store coordination · real-time demand changes — all coordinated.
            </p>
        </div>
    );
};

// ---- 12. Maintenance + facilities
const MaintenanceStage = () => {
    const orders = [
        { id: "WO-9412", store: "Store 1142", issue: "Refrigeration DR-04",       vendor: "CoolTech",  cost: "$2,180", flag: "Urgent · sales impact" },
        { id: "WO-9418", store: "Store 0411", issue: "HVAC West Wing",            vendor: "ClimaCo",   cost: "$3,420", flag: "Vendor slow · 8d" },
        { id: "WO-9421", store: "Store 2073", issue: "Walk-in cooler · 3rd time", vendor: "CoolTech",  cost: "$5,640", flag: "Repeated failure" },
        { id: "WO-9424", store: "Store 1556", issue: "Lighting · aisle 12",       vendor: "BrightOps", cost: "$420",   flag: "Preventive · queued" },
    ];
    return (
        <div className="rounded-md border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-ink-900 p-5 fade-in-up" data-testid="stage-maintenance">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Wrench size={13} className="text-amber-300" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">Maintenance + Facilities · work-order + asset layer</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">8,418 open · ranked by impact</span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-sm border border-white/5">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-ink-900">
                        <tr>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">WO</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Store</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Issue</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Vendor</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Cost</th>
                            <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o) => (
                            <tr key={o.id} className="border-t border-white/5">
                                <td className="px-3 py-2 font-mono text-[10px] text-cyan-300">{o.id}</td>
                                <td className="px-3 py-2 text-white">{o.store}</td>
                                <td className="px-3 py-2 text-slate-200">{o.issue}</td>
                                <td className="px-3 py-2 font-mono text-[10px] text-slate-300">{o.vendor}</td>
                                <td className="px-3 py-2 font-mono text-rose-300">{o.cost}</td>
                                <td className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-300">{o.flag}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- 13. Cost Recovery + Asset Intelligence
const CostRecoveryStage = () => {
    const flags = [
        {
            Icon: RefreshCcw,
            tone: "rose",
            label: "Repeated service calls",
            unit: "Walk-in cooler · Store 2073",
            detail: "3 service calls in 90 days · CoolTech",
            cost: "$5,640 lifetime",
            action: "REPLACE — payback 8.2 mo",
        },
        {
            Icon: TrendingUp,
            tone: "amber",
            label: "Maintenance cost climbing",
            unit: "Reach-in freezer · Store 1142",
            detail: "+34% YoY · 5-yr asset",
            cost: "$11.4K trailing 12mo",
            action: "REPLACE vs REPAIR · queued",
        },
        {
            Icon: AlertTriangle,
            tone: "rose",
            label: "End-of-life equipment",
            unit: "HVAC RTU-2 · Store 0411",
            detail: "Manufacturer EOL · 14-yr unit",
            cost: "$8.2K avoided breakdown",
            action: "Capital plan · Q3 swap",
        },
        {
            Icon: Lightbulb,
            tone: "cyan",
            label: "Lighting upgrade opportunity",
            unit: "T8 fluorescent · 184 stores",
            detail: "LED retrofit · 62% energy cut",
            cost: "$2.1M / yr energy savings",
            action: "Phase 1 · 40 stores · ROI 22mo",
        },
        {
            Icon: Snowflake,
            tone: "cyan",
            label: "Refrigeration efficiency",
            unit: "Open-case dairy · 96 stores",
            detail: "Door retrofit · 38% energy cut",
            cost: "$1.4M / yr · shrink down 12%",
            action: "Capital case · CFO queue",
        },
        {
            Icon: DollarSign,
            tone: "amber",
            label: "Vendor overcharging detected",
            unit: "FilterPro · HVAC filters",
            detail: "Inconsistent pricing · +18% vs market",
            cost: "$184K overpaid · trailing 12mo",
            action: "ESCALATE · vendor review",
        },
    ];

    const toneRing = {
        rose:  "border-rose-500/30 bg-rose-500/5",
        amber: "border-amber-500/30 bg-amber-500/5",
        cyan:  "border-cyan-500/30 bg-cyan-500/5",
    };
    const toneIcon = { rose: "text-rose-300", amber: "text-amber-300", cyan: "text-cyan-300" };
    const toneAction = { rose: "text-rose-300", amber: "text-amber-300", cyan: "text-cyan-300" };

    const reactiveVsProactive = [
        { label: "Trigger",     reactive: "Equipment fails",       proactive: "Pattern detected before failure" },
        { label: "Decision",    reactive: "Repair · always",       proactive: "Replace · repair · upgrade · escalate" },
        { label: "Vendor",      reactive: "Pay invoice",           proactive: "Benchmark + flag overcharge" },
        { label: "Energy",      reactive: "Pay the bill",          proactive: "Retrofit with payback" },
        { label: "Outcome",     reactive: "Cost grows quarter-over-quarter", proactive: "Cost recovered + ROI tracked" },
    ];

    const impact = [
        { Icon: DollarSign,    label: "Estimated cost savings",   value: "$6.4M",  trend: "Annualized · 184 stores" },
        { Icon: Wrench,        label: "Avoided repair spend",     value: "$3.6M",  trend: "Replace-vs-repair flips" },
        { Icon: Activity,      label: "Reduced energy usage",     value: "$3.5M",  trend: "Lighting + refrigeration" },
        { Icon: TrendingDown,  label: "Vendor overcharge recovered", value: "$1.2M", trend: "Audit + escalation" },
        { Icon: BarChart3,     label: "ROI on upgrades",          value: "238%",   trend: "Blended · 24-mo cohort" },
        { Icon: Sparkles,      label: "Avoided downtime sales loss", value: "$2.8M", trend: "Refrigeration · HVAC" },
    ];

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-cost-recovery">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Cost Recovery + Asset Intelligence · purchasing · invoices · equipment history
                    </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Active recovery layer</span>
            </div>

            {/* Flags + recommended actions */}
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Flagged across all locations · ranked by financial leakage
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {flags.map((f, i) => (
                    <div key={f.label} className={`rounded-sm border p-3 fade-in-up ${toneRing[f.tone]}`} style={{ animationDelay: `${i * 70}ms` }}>
                        <div className="flex items-center gap-2">
                            <f.Icon size={13} className={toneIcon[f.tone]} />
                            <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${toneIcon[f.tone]}`}>{f.label}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-white">{f.unit}</p>
                        <p className="mt-0.5 text-xs text-slate-300">{f.detail}</p>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{f.cost}</p>
                        <div className="mt-2 flex items-center gap-1.5 border-t border-white/5 pt-2">
                            <ArrowRight size={11} className={toneAction[f.tone]} />
                            <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${toneAction[f.tone]}`}>{f.action}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reactive vs Proactive comparison */}
            <div className="mt-6 rounded-sm border border-white/10 bg-ink-900 p-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <RefreshCcw size={12} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Reactive Operations vs Proactive Cost Control
                    </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">Reactive</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Proactive · CreatorBoostAI</span>
                    {reactiveVsProactive.map((row) => (
                        <React.Fragment key={row.label}>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{row.label}</span>
                            <span className="text-sm text-rose-200/90">{row.reactive}</span>
                            <span className="text-sm text-cyan-200">{row.proactive}</span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Financial Impact Panel */}
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Financial impact · sample demo values
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {impact.map((t, i) => (
                    <div key={t.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-center gap-2"><t.Icon size={12} className="text-cyan-300" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{t.label}</span></div>
                        <p className="font-heading mt-1 text-xl font-semibold text-white">{t.value}</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{t.trend}</p>
                    </div>
                ))}
            </div>

            <p className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-3 text-sm text-cyan-100">
                CreatorBoostAI is not just tracking maintenance — it is actively reducing costs and
                recovering lost money across every store, every vendor, and every asset.
            </p>
        </div>
    );
};

// ---- 14. Self-Funding Upgrade System
const SelfFundingStage = () => {
    const flows = [
        { Icon: Activity,     label: "Energy waste eliminated",   value: "$1.8M",  detail: "LED + door retrofit · 124 stores" },
        { Icon: Wrench,       label: "Repeat service avoided",    value: "$1.2M",  detail: "Replace-vs-repair flips · TTM" },
        { Icon: DollarSign,   label: "Vendor overcharge reclaimed", value: "$640K", detail: "Audit + escalation · 14 vendors" },
        { Icon: Sparkles,     label: "Downtime sales preserved",  value: "$980K",  detail: "Refrigeration + HVAC uptime" },
    ];

    const upgrades = [
        { name: "LED retrofit · 40 stores",          cost: "$1.6M", payback: "22 mo", funded: 100, status: "Funded by current savings" },
        { name: "Walk-in cooler · door + gasket kit", cost: "$420K", payback: "11 mo", funded: 100, status: "Funded · Q3 install" },
        { name: "Refrigeration controller upgrade",   cost: "$880K", payback: "18 mo", funded: 72,  status: "72% funded · 4 mo to full coverage" },
        { name: "Loading dock motor replacement",     cost: "$310K", payback: "9 mo",  funded: 100, status: "Funded · vendor scheduled" },
    ];

    const totalSavings = "$4.62M / yr";
    const fundedPool = "$3.18M";
    const deployedThisYear = "$2.33M";

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-self-funding">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <PiggyBank size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Self-Funding Upgrade System · savings → upgrade fund
                    </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">No upfront capital required</span>
            </div>

            {/* Savings inflows */}
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Operational savings recovered every month — routed into the upgrade fund
            </p>
            {/* Koollite Dual-Path tease */}
            <div className="mt-3" data-testid="supermarket-koollite-strip">
                <KoolliteDualPathStrip accent="cyan" testid="supermarket-koollite-dualpath" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {flows.map((f, i) => (
                    <div key={f.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                        <div className="flex items-center gap-2"><f.Icon size={12} className="text-cyan-300" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{f.label}</span></div>
                        <p className="font-heading mt-1 text-lg font-semibold text-white">{f.value}</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">{f.detail}</p>
                    </div>
                ))}
            </div>

            {/* Fund summary */}
            <div className="mt-5 grid grid-cols-1 gap-3 rounded-sm border border-cyan-500/30 bg-ink-900 p-4 sm:grid-cols-3">
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Total annualized savings</p>
                    <p className="font-heading mt-1 text-2xl font-semibold text-cyan-300">{totalSavings}</p>
                </div>
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Available upgrade pool</p>
                    <p className="font-heading mt-1 text-2xl font-semibold text-white">{fundedPool}</p>
                </div>
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Deployed this year</p>
                    <p className="font-heading mt-1 text-2xl font-semibold text-white">{deployedThisYear}</p>
                </div>
            </div>

            {/* Upgrade pipeline */}
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Upgrade pipeline · estimated values · funded by recovered operational savings
            </p>
            <div className="mt-3 space-y-2.5">
                {upgrades.map((u, i) => (
                    <div key={u.name} className="rounded-sm border border-white/10 bg-ink-900 p-3 fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Coins size={12} className="text-cyan-400" />
                                <span className="text-sm font-medium text-white">{u.name}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
                                <span className="text-slate-300">{u.cost}</span>
                                <span className="text-slate-500">·</span>
                                <span className="text-cyan-300">Payback {u.payback}</span>
                            </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                            <div className={`h-full ${u.funded === 100 ? "bg-cyan-400" : "bg-amber-400"}`} style={{ width: `${u.funded}%` }} />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em]">
                            <span className={u.funded === 100 ? "text-cyan-300" : "text-amber-300"}>{u.status}</span>
                            <span className="text-slate-500">{u.funded}% covered by savings pool</span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-3 text-sm text-cyan-100">
                The savings pay for the upgrade. The upgrade compounds the savings. No upfront capital
                required. <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Estimated values · based on operational patterns.</span>
            </p>
        </div>
    );
};

// ---- 15. Warranty Enforcement at Scale
const WarrantyStage = () => {
    const portfolio = [
        { tier: "Active warranty",  count: "2,184",  pct: 90, tone: "cyan",  Icon: ShieldCheck, detail: "5–7 yr · third-party partner" },
        { tier: "Expiring 90 days", count: "184",   pct: 8,  tone: "amber", Icon: AlertTriangle, detail: "Auto-renew evaluation queued" },
        { tier: "Out of warranty",  count: "47",    pct: 2,  tone: "rose",  Icon: X,           detail: "Replacement queue · risk-ranked" },
    ];

    const enforcementCases = [
        { id: "WC-4012", store: "Store 1142", asset: "Walk-in cooler · CoolTech",   issue: "3rd service call · within warranty",  action: "REPLACE under warranty · invoice blocked",     savings: "$5,640" },
        { id: "WC-4087", store: "Store 0411", asset: "Reach-in freezer · Hussmann", issue: "Compressor failure · year 4 of 7",     action: "Warranty claim filed · vendor notified",        savings: "$3,420" },
        { id: "WC-4118", store: "Store 2073", asset: "LED canopy · BrightOps",      issue: "Driver failure · year 2 of 5",         action: "Replacement under warranty · scheduled",        savings: "$1,180" },
        { id: "WC-4144", store: "Store 1556", asset: "Refrigeration controller",     issue: "Repeated firmware fault · covered",    action: "Vendor escalation · replacement enforced",      savings: "$2,860" },
    ];

    const toneRing = { cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300", amber: "border-amber-500/30 bg-amber-500/5 text-amber-300", rose: "border-rose-500/30 bg-rose-500/5 text-rose-300" };

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-warranty">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                        Warranty + Service Control · 5–7 yr third-party coverage · enforcement layer
                    </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI does not install or contract</span>
            </div>

            {/* Portfolio coverage */}
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Warranty portfolio across 2,415 stores · parts · service · replacements
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {portfolio.map((p, i) => (
                    <div key={p.tier} className={`rounded-sm border p-3 fade-in-up ${toneRing[p.tone]}`} style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><p.Icon size={13} /><span className="font-mono text-[10px] uppercase tracking-[0.22em]">{p.tier}</span></div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em]">{p.pct}%</span>
                        </div>
                        <p className="font-heading mt-2 text-2xl font-semibold text-white">{p.count}</p>
                        <p className="mt-0.5 text-xs text-slate-300">{p.detail}</p>
                    </div>
                ))}
            </div>

            {/* Enforcement cases */}
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Live enforcement · service calls cross-checked against active warranties
            </p>
            <div className="mt-3 space-y-2">
                {enforcementCases.map((c, i) => (
                    <div key={c.id} className="grid grid-cols-1 gap-2 rounded-sm border border-white/10 bg-ink-900 p-3 sm:grid-cols-12 fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 sm:col-span-2">
                            <BadgeCheck size={11} className="inline mr-1 text-cyan-400" />{c.id}
                        </span>
                        <span className="text-sm text-white sm:col-span-3">{c.store} · <span className="text-slate-300">{c.asset}</span></span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 sm:col-span-3">{c.issue}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 sm:col-span-3">→ {c.action}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 sm:col-span-1 text-right">{c.savings}</span>
                    </div>
                ))}
            </div>

            {/* Leakage prevention summary */}
            <div className="mt-5 grid grid-cols-1 gap-3 rounded-sm border border-cyan-500/30 bg-ink-900 p-4 sm:grid-cols-3">
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Repairs paid that should have been covered</p>
                    <p className="font-heading mt-1 text-xl font-semibold text-rose-300">$1.84M / yr</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Industry baseline · pre-enforcement</p>
                </div>
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Recovered under enforcement</p>
                    <p className="font-heading mt-1 text-xl font-semibold text-cyan-300">$1.62M / yr</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Invoices blocked · claims enforced</p>
                </div>
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Replacements obligated under warranty</p>
                    <p className="font-heading mt-1 text-xl font-semibold text-white">412 units</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Tracked + escalated · TTM</p>
                </div>
            </div>

            <div className="mt-5 rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100">
                <Hammer size={12} className="inline mr-1 text-amber-300" />
                CreatorBoostAI does not perform installation and is not a contractor. All upgrades are
                installed and serviced by qualified third-party partners under their five-to-seven year
                warranty.
            </div>

            <p className="mt-5 rounded-sm border border-cyan-500/40 bg-cyan-500/5 p-3 text-base font-semibold text-cyan-100 sm:text-lg">
                <FileCheck2 size={14} className="inline mr-2 text-cyan-300" />
                This is not just warranty coverage. This is warranty enforcement at scale.
            </p>
        </div>
    );
};

// ---- 16. Financial impact
const FinancialImpactStage = () => {
    const tiles = [
        { Icon: BarChart3, label: "Estimated savings",        value: "$18.4M",  trend: "Q · est." },
        { Icon: Sparkles,  label: "Revenue recovered",         value: "$24.1M", trend: "Q · est." },
        { Icon: Wrench,    label: "Maintenance cost avoided",  value: "$3.6M",  trend: "Q · est." },
        { Icon: Users,     label: "Labor savings",             value: "$5.8M",  trend: "Q · est." },
        { Icon: Activity,  label: "Energy savings",            value: "$2.1M",  trend: "Q · est." },
        { Icon: Package,   label: "Inventory waste reduced",   value: "$4.4M",  trend: "Q · est." },
        { Icon: Boxes,     label: "Out-of-stock recovery",     value: "+$8.2M", trend: "Q · est." },
        { Icon: Target,    label: "Promotion lift",            value: "+$3.9M", trend: "Q · est." },
    ];
    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-5 fade-in-up" data-testid="stage-financial-impact">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-cyan-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Financial Impact Dashboard · Sample demo values</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">2,415 stores · current Q</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiles.map((t, i) => (
                    <div key={t.label} className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-center gap-2"><t.Icon size={12} className="text-cyan-300" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">{t.label}</span></div>
                        <p className="font-heading mt-1 text-xl font-semibold text-white">{t.value}</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">{t.trend}</p>
                    </div>
                ))}
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Every recommendation is tagged with measurable financial outcome the moment it executes.
            </p>
        </div>
    );
};

// ---- 17. Closing slate
const ClosingStage = () => (
    <div className="rounded-md border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-ink-900 p-7 lg:p-12 fade-in-up shadow-[0_0_60px_rgba(6,182,212,0.18)]" data-testid="stage-closing">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Closing</p>
        <div className="mt-6 space-y-3">
            <p className="font-heading text-2xl font-semibold text-white sm:text-3xl">Your stores already generate the data.</p>
            <p className="font-heading text-2xl font-semibold text-cyan-300 sm:text-3xl">CreatorBoostAI turns that data into action.</p>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
                { Icon: Building2,  text: "See every store" },
                { Icon: AlertTriangle, text: "Prioritize every issue" },
                { Icon: Zap,        text: "Execute every action" },
                { Icon: Wrench,     text: "Save money" },
                { Icon: BarChart3,  text: "Recover revenue" },
                { Icon: Target,     text: "Scale performance" },
            ].map((p, i) => (
                <div key={p.text} className="flex items-center gap-3 rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-3 fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <p.Icon size={14} className="text-cyan-300" />
                    <span className="text-sm font-medium text-white">{p.text}</span>
                </div>
            ))}
        </div>
        <p className="mt-7 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            <span className="text-cyan-300 font-semibold">CreatorBoostAI is the execution layer for modern retail operations.</span>
        </p>
    </div>
);

// helper
const DollarBadge = () => (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 font-mono text-[10px] font-semibold text-amber-300">$</span>
);

// =================================================================
// SHARE + QR
// =================================================================
const ShareModule = ({ onReplay, trackEvent }) => {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const url = typeof window !== "undefined" ? window.location.href : "";
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&bgcolor=0F172A&color=22D3EE&data=${encodeURIComponent(url)}`;

    const send = async () => {
        if (!email) { toast.error("Enter a recipient email"); return; }
        setBusy(true);
        try {
            const res = await shareDemo({ recipient_email: email, demo_type: "supermarket", share_target: url });
            trackEvent?.("share_send", { recipient_email: email });
            if (res?.sent) toast.success(`Sent to ${email}.`);
            else toast.message("Share recorded — email service is configured to deliver once Resend keys land.");
            setEmail("");
        } catch {
            toast.error("Could not record share. Please try again.");
        } finally { setBusy(false); }
    };
    const copy = async () => {
        try { await navigator.clipboard.writeText(url); trackEvent?.("share_copy", {}); toast.success("Link copied"); }
        catch { toast.error("Could not copy link"); }
    };

    return (
        <div className="rounded-md border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-ink-700/40 p-6 fade-in-up" data-testid="supermarket-share-module">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Demo Complete</p>
                    <h3 className="font-heading mt-2 text-2xl font-semibold text-white sm:text-3xl">Send this to your enterprise team.</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                        Forward the personalized link to retail executives, regional VPs, or your CIO — or
                        scan the QR code on a presentation screen.
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="recipient@company.com" data-testid="supermarket-share-email"
                            className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
                        <button onClick={send} disabled={busy} data-testid="supermarket-share-send"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60">
                            <Send size={13} /> {busy ? "Sending…" : "Send Private Link"}
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={copy} data-testid="supermarket-share-copy" className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <Copy size={12} /> Copy Link
                        </button>
                        <button onClick={onReplay} data-testid="supermarket-share-replay" className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                            <Play size={12} /> Watch Again
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <div className="rounded-sm border border-cyan-500/30 bg-ink-900 p-4 text-center" data-testid="supermarket-share-qr">
                        <div className="flex items-center justify-center gap-2 border-b border-white/5 pb-2">
                            <QrCode size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">QR · Scan to view</span>
                        </div>
                        <img src={qrSrc} alt="QR code" className="mx-auto mt-3 h-40 w-40 rounded-sm" />
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Use on any presentation screen</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
