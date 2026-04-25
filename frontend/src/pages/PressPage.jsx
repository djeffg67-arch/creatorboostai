import React, { useRef, useState } from "react";
import { Layout } from "@/components/site/Layout";
import {
    Sparkles, Cpu, Brain, Target, Zap, ShieldCheck, Mail, Download,
    ArrowRight, FileImage, Lock, Award, Send,
} from "lucide-react";

// =================================================================
// Press / Investor Kit — hidden route (not linked from main nav)
// =================================================================

const SYSTEM_NODES = [
    { short: "CRM", label: "Customer Mgmt" },
    { short: "ERP", label: "Enterprise Ops" },
    { short: "MKT", label: "Marketing" },
    { short: "PAY", label: "Payroll" },
    { short: "AMS", label: "Agency Mgmt" },
    { short: "FIN", label: "Financial" },
    { short: "MLS", label: "Listings" },
    { short: "API", label: "Integrations" },
];

// =================================================================
// Pure-SVG diagram — infinitely scalable, downloadable
// =================================================================
const SVG_W = 1200;
const SVG_H = 800;
const SVG_CX = SVG_W / 2;
const SVG_CY = SVG_H / 2;

function buildExecutionEngineSvg() {
    // returns a complete standalone SVG document (string) for download
    const radius = 280;
    const nodeBoxW = 180;
    const nodeBoxH = 70;

    const nodes = SYSTEM_NODES.map((s, i) => {
        const a = (i / SYSTEM_NODES.length) * 2 * Math.PI - Math.PI / 2;
        const cx = SVG_CX + radius * Math.cos(a);
        const cy = SVG_CY + radius * Math.sin(a);
        return { ...s, cx, cy };
    });

    const beams = nodes
        .map(
            (n) =>
                `<line x1="${SVG_CX}" y1="${SVG_CY}" x2="${n.cx}" y2="${n.cy}" stroke="url(#beam)" stroke-width="2" opacity="0.6"/>`
        )
        .join("");

    const nodeMarkup = nodes
        .map(
            (n) => `
        <g>
            <rect x="${n.cx - nodeBoxW / 2}" y="${n.cy - nodeBoxH / 2}" rx="6" ry="6" width="${nodeBoxW}" height="${nodeBoxH}"
                  fill="#0a1424" stroke="#0891b2" stroke-width="1.5"/>
            <text x="${n.cx}" y="${n.cy - 8}" text-anchor="middle" font-family="ui-monospace, SF Mono, monospace" font-size="22" font-weight="700" fill="#67e8f9" letter-spacing="2">${n.short}</text>
            <text x="${n.cx}" y="${n.cy + 18}" text-anchor="middle" font-family="ui-monospace, SF Mono, monospace" font-size="13" fill="#94a3b8" letter-spacing="1">${n.label.toUpperCase()}</text>
        </g>`
        )
        .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}">
    <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="#0c1a2c"/>
            <stop offset="100%" stop-color="#020714"/>
        </radialGradient>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.9"/>
            <stop offset="60%" stop-color="#0891b2" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#0c4a6e" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.1"/>
        </linearGradient>
        <linearGradient id="coreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22d3ee"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
    </defs>
    <rect width="${SVG_W}" height="${SVG_H}" fill="url(#bg)"/>
    <!-- Concentric rings -->
    <circle cx="${SVG_CX}" cy="${SVG_CY}" r="120" fill="none" stroke="#0e7490" stroke-width="1" opacity="0.35"/>
    <circle cx="${SVG_CX}" cy="${SVG_CY}" r="180" fill="none" stroke="#0e7490" stroke-width="1" opacity="0.25"/>
    <circle cx="${SVG_CX}" cy="${SVG_CY}" r="240" fill="none" stroke="#0e7490" stroke-width="1" opacity="0.18"/>
    <!-- Beams -->
    ${beams}
    <!-- System nodes -->
    ${nodeMarkup}
    <!-- Core glow -->
    <circle cx="${SVG_CX}" cy="${SVG_CY}" r="160" fill="url(#coreGlow)"/>
    <!-- Core orb -->
    <circle cx="${SVG_CX}" cy="${SVG_CY}" r="100" fill="url(#coreFill)" stroke="#67e8f9" stroke-width="3"/>
    <text x="${SVG_CX}" y="${SVG_CY - 18}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="700" fill="#ffffff">CreatorBoostAI</text>
    <text x="${SVG_CX}" y="${SVG_CY + 8}" text-anchor="middle" font-family="ui-monospace, SF Mono, monospace" font-size="13" fill="#cffafe" letter-spacing="3">EXECUTION</text>
    <text x="${SVG_CX}" y="${SVG_CY + 28}" text-anchor="middle" font-family="ui-monospace, SF Mono, monospace" font-size="13" fill="#cffafe" letter-spacing="3">ENGINE</text>
    <!-- Bottom labels -->
    <text x="${SVG_CX}" y="${SVG_H - 60}" text-anchor="middle" font-family="ui-monospace, SF Mono, monospace" font-size="14" fill="#67e8f9" letter-spacing="4">PROPRIETARY · PATENT-PENDING · EXECUTION LAYER</text>
    <text x="${SVG_CX}" y="${SVG_H - 30}" text-anchor="middle" font-family="ui-monospace, SF Mono, monospace" font-size="11" fill="#475569" letter-spacing="3">creatorboostai.com</text>
</svg>`;
}

const InlineDiagram = () => {
    const radius = 36; // % of container
    return (
        <div className="relative w-full overflow-hidden rounded-md border border-cyan-500/40 bg-gradient-to-b from-ink-900 to-[#020714] shadow-[0_0_60px_rgba(6,182,212,0.2)]" data-testid="press-diagram-inline">
            <div className="relative mx-auto aspect-[3/2] w-full max-w-5xl">
                {/* Concentric rings */}
                <div className="absolute inset-[18%] rounded-full border border-cyan-500/30" />
                <div className="absolute inset-[28%] rounded-full border border-cyan-500/40" />
                <div className="absolute inset-[38%] rounded-full border border-cyan-500/50" />

                {/* System nodes orbiting */}
                {SYSTEM_NODES.map((s, i) => {
                    const angle = (i / SYSTEM_NODES.length) * 2 * Math.PI - Math.PI / 2;
                    const x = 50 + radius * Math.cos(angle);
                    const y = 50 + radius * Math.sin(angle);
                    return (
                        <div key={s.short} className="absolute -translate-x-1/2 -translate-y-1/2"
                             style={{ left: `${x}%`, top: `${y}%` }}>
                            <div
                                className="pointer-events-none absolute left-1/2 top-1/2 h-px origin-left bg-gradient-to-r from-cyan-400/60 to-cyan-400/0"
                                style={{
                                    width: `${radius}%`,
                                    transform: `rotate(${angle * 180 / Math.PI + 180}deg)`,
                                    transformOrigin: "left center",
                                }}
                            />
                            <div className="relative z-10 rounded-md border border-cyan-500/50 bg-ink-900 px-3 py-1.5 text-center shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                                <span className="font-mono text-[10px] font-semibold text-cyan-300 tracking-widest">{s.short}</span>
                                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400 leading-tight">{s.label}</p>
                            </div>
                        </div>
                    );
                })}

                {/* Central Core */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                        <div className="absolute inset-[-40px] rounded-full bg-cyan-400/30 blur-3xl" />
                        <div className="absolute inset-[-20px] rounded-full border border-cyan-400/50" />
                        <div className="relative z-10 flex h-36 w-36 sm:h-44 sm:w-44 flex-col items-center justify-center rounded-full border-2 border-cyan-400/70 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 shadow-[0_0_60px_rgba(6,182,212,0.7)]">
                            <Sparkles size={20} className="text-white" />
                            <span className="font-heading mt-1.5 text-sm font-bold text-white">CreatorBoostAI</span>
                            <span className="font-mono mt-1 text-[9px] uppercase tracking-[0.3em] text-cyan-100">EXECUTION</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-100">ENGINE</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer caption */}
            <div className="border-t border-white/5 px-4 py-3 text-center sm:px-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400">
                    Proprietary · Patent-Pending · Execution Layer
                </p>
            </div>
        </div>
    );
};

// =================================================================
// Page
// =================================================================
export default function PressPage() {
    const [downloading, setDownloading] = useState(false);
    const linkRef = useRef(null);

    const downloadSvg = () => {
        const svg = buildExecutionEngineSvg();
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "creatorboostai-execution-engine.svg";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const downloadPng = async () => {
        try {
            setDownloading(true);
            const svg = buildExecutionEngineSvg();
            const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
            // 2x for retina-quality PNG
            const scale = 2;
            const canvas = document.createElement("canvas");
            canvas.width = SVG_W * scale;
            canvas.height = SVG_H * scale;
            const ctx = canvas.getContext("2d");
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, SVG_W, SVG_H);
            URL.revokeObjectURL(url);
            const pngUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = "creatorboostai-execution-engine.png";
            document.body.appendChild(a); a.click(); a.remove();
        } catch (e) {
            console.error("PNG export failed", e);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Layout hideFooter>
            <div className="relative mx-auto max-w-[1280px] px-4 py-12 lg:px-8 lg:py-20" data-testid="press-page">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-40" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 480, height: 480, top: -160, left: -100 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 420, height: 420, bottom: -180, right: -80 }} />
                </div>

                {/* Header */}
                <header data-testid="press-header">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <Lock size={11} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Investor & Press Kit · Direct-Link Access</span>
                    </div>
                    <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                        CreatorBoostAI is the{" "}
                        <span className="text-cyan-400">execution layer</span>{" "}
                        for enterprise software.
                    </h1>
                    <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                        Proprietary, patent-pending architecture that connects, analyzes, and executes
                        across the systems your enterprise already runs — without replacing any of them.
                    </p>
                </header>

                {/* Diagram + downloads */}
                <section className="mt-12" data-testid="press-diagram-section">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Cpu size={13} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Architecture Diagram · High-Resolution</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={downloadSvg}
                                data-testid="download-svg-btn"
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                            >
                                <FileImage size={12} /> Download SVG
                            </button>
                            <button
                                onClick={downloadPng}
                                disabled={downloading}
                                data-testid="download-png-btn"
                                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-60"
                            >
                                <Download size={12} /> {downloading ? "Rendering…" : "Download PNG"}
                            </button>
                            <a ref={linkRef} className="hidden" />
                        </div>
                    </div>
                    <InlineDiagram />
                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                        2400 × 1600 retina PNG · scalable SVG · brand-safe · royalty-free for editorial use
                    </p>
                </section>

                {/* Three core paragraphs */}
                <section className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3" data-testid="press-core-paragraphs">
                    <CoreCard
                        idx="01"
                        Icon={Cpu}
                        kicker="Proprietary Execution OS"
                        title="An operating system, not another app."
                        body="CreatorBoostAI is a proprietary, patent-pending execution operating system that sits on top of the enterprise software organizations already use — CRM, ERP, marketing, payroll, AMS, and beyond. It does not replace any of them. It overlays them, unifies them, and gives leadership a single layer to operate from."
                    />
                    <CoreCard
                        idx="02"
                        Icon={Brain}
                        kicker="Analyze · Identify · Execute"
                        title="Live intelligence, real-time action."
                        body="The platform analyzes activity across every connected system continuously — surfacing revenue opportunities, operational inefficiencies, and compliance risk the moment they appear. When authorized, it executes actions across those systems automatically: drafting messages, advancing deals, routing leads, reconciling commissions, producing audit trails."
                    />
                    <CoreCard
                        idx="03"
                        Icon={ShieldCheck}
                        kicker="Defensible Category"
                        title="The category nobody else owns."
                        body="Because CreatorBoostAI does not replace existing software, it sidesteps the rip-and-replace adoption problem that limits competing platforms. Its defensibility is structural: a proprietary, patent-pending execution architecture that operates as a layer across every system — making it stickier the more software an enterprise runs."
                    />
                </section>

                {/* Three quick stats */}
                <section className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="press-stats">
                    <Stat icon={Target} label="Category" value="Execution OS" />
                    <Stat icon={Award} label="IP Status" value="Patent-Pending" />
                    <Stat icon={Zap} label="Verticals Live" value="Real Estate · Insurance" />
                    <Stat icon={Cpu} label="Architecture" value="API-Native · Read-Only Default" />
                </section>

                {/* Founder section */}
                <section className="mt-20 rounded-md border border-white/10 bg-ink-700/40 p-6 lg:p-10" data-testid="press-founder">
                    <div className="flex items-center gap-2">
                        <Sparkles size={13} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Founder</span>
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-3">
                            <div className="aspect-square w-32 rounded-md border border-cyan-500/30 bg-gradient-to-br from-cyan-500/15 to-blue-500/5 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                                <span className="font-heading text-3xl font-semibold text-cyan-300">JR</span>
                            </div>
                        </div>
                        <div className="lg:col-span-9">
                            <h3 className="font-heading text-2xl font-semibold text-white sm:text-3xl">Jeffrey Ramos</h3>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Founder & CEO · CreatorBoostAI</p>
                            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                                Operator, technologist, and originator of the BodyIQ-AI behavioral framework that
                                preceded CreatorBoostAI. Spent the last decade studying how revenue-critical
                                workflows actually move through enterprise software stacks — and how repeatedly
                                the gaps between systems, not the systems themselves, are where revenue and
                                compliance get lost. CreatorBoostAI is the infrastructure response to that
                                observation: an operating layer purpose-built to close those gaps automatically.
                            </p>
                            <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                <span className="rounded-sm border border-white/10 bg-ink-900 px-2 py-1">Forensic Behavioral Science</span>
                                <span className="rounded-sm border border-white/10 bg-ink-900 px-2 py-1">Enterprise SaaS Architecture</span>
                                <span className="rounded-sm border border-white/10 bg-ink-900 px-2 py-1">Real Estate · Insurance Operations</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section className="mt-16 rounded-md border border-cyan-500/40 bg-cyan-500/5 p-6 lg:p-10 shadow-[0_0_40px_rgba(6,182,212,0.15)]" data-testid="press-contact">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Send size={13} className="text-cyan-400" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Investor & Press Inquiries</span>
                            </div>
                            <h3 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                                Ready to dig deeper?
                            </h3>
                            <p className="mt-2 max-w-xl text-sm text-slate-300">
                                We're happy to walk leadership teams, investors, and press through the full
                                architecture, the live demos, and the proprietary execution stack.
                            </p>
                            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Direct contact</p>
                            <a href="mailto:jeffrey@creatorboostai.com" data-testid="press-email-link" className="mt-1 inline-flex items-center gap-2 font-heading text-lg text-cyan-300 hover:text-cyan-200">
                                <Mail size={15} /> jeffrey@creatorboostai.com
                            </a>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                            <a
                                href="/contact"
                                data-testid="press-request-demo-btn"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-4 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                            >
                                <ArrowRight size={15} /> Request Demo
                            </a>
                            <a
                                href="/demo"
                                data-testid="press-watch-demos-btn"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-cyan-500/40 px-6 py-4 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/10"
                            >
                                <Sparkles size={15} /> Watch the demos
                            </a>
                        </div>
                    </div>
                </section>

                {/* Footer note */}
                <p className="mt-10 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                    © {new Date().getFullYear()} CreatorBoostAI · Proprietary · Patent-pending · All rights reserved
                </p>
            </div>
        </Layout>
    );
}

// =================================================================
// Helper components
// =================================================================
const CoreCard = ({ idx, Icon, kicker, title, body }) => (
    <div className="relative rounded-md border border-white/10 bg-ink-700/40 p-6 transition-all hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
        <span className="absolute right-4 top-4 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-600">{idx}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Icon size={16} className="text-cyan-300" />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">{kicker}</p>
        <h3 className="font-heading mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
);

const Stat = ({ icon: Icon, label, value }) => (
    <div className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="flex items-center gap-1.5">
            <Icon size={11} className="text-cyan-400" />
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
        </div>
        <p className="font-heading mt-2 text-base font-semibold text-white">{value}</p>
    </div>
);
