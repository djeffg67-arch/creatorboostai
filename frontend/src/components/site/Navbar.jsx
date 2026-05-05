import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { LanguageSelector } from "@/components/site/LanguageSelector";

/**
 * Global header for the unified CreatorBoostAI™ + BodyIQ-AI™ enterprise platform.
 * Default wordmark shows BOTH brand names. On routes that should focus on a single
 * brand (e.g. /demo/supermarket — pure CreatorBoostAI retail-ops demo), the
 * wordmark collapses to CreatorBoostAI only.
 */
export const Navbar = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    // Single-brand routes that focus exclusively on CreatorBoostAI as the
    // retail operations execution layer. The brand stack collapses for these.
    const cbOnlyRoutes = ["/demo/supermarket", "/demo/retail", "/demo/c-store", "/demo/grocery"];
    const cbOnly = cbOnlyRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));

    const links = [
        { to: "/", label: t("nav.home"), testid: "nav-home" },
        { to: "/startup", label: "New Startup Business", testid: "nav-startup", highlight: true },
        { to: "/products/signal-pack", label: "Signal Pack", testid: "nav-signal-pack" },
        { to: "/services/audit", label: "Audit", testid: "nav-audit" },
        { to: "/demo", label: t("nav.demo"), testid: "nav-demo" },
        { to: "/demo/startup", label: "Startup Demo", testid: "nav-startup-demo", highlight: true },
        { to: "/demo/noldus", label: "Enterprise Demo", testid: "nav-noldus", highlight: true },
        { to: "/demo/airport", label: "Airport Demo", testid: "nav-airport", highlight: true },
        { to: "/demo/supermarket", label: "Retail Demo", testid: "nav-supermarket", highlight: true },
        { to: "/preview", label: "Command Center", testid: "nav-preview" },
        { to: "/pricing", label: t("nav.pricing"), testid: "nav-pricing" },
        { to: "/contact", label: t("nav.contact"), testid: "nav-contact" },
    ];

    return (
        <header
            data-testid="site-navbar"
            className="sticky top-0 z-50 w-full border-b border-white/5 bg-ink-800/80 backdrop-blur-xl"
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
                <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-logo">
                    <div className="relative h-7 w-7">
                        <div className="absolute inset-0 rounded-sm bg-cyan-500/20 blur-md group-hover:bg-cyan-400/40 transition-all" />
                        <div className="relative flex h-7 w-7 items-center justify-center rounded-sm border border-cyan-500/40 bg-ink-900">
                            <span className="font-mono text-[10px] font-semibold text-cyan-400">CB</span>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-baseline gap-1.5 leading-none">
                        <span className="font-heading text-[15px] font-semibold text-white">
                            CreatorBoost<span className="text-cyan-400">AI</span><sup className="text-[8px] text-slate-400">™</sup>
                        </span>
                        {!cbOnly && (
                            <>
                                <span className="text-slate-500 text-sm">+</span>
                                <span className="font-heading text-[15px] font-semibold text-white">
                                    BodyIQ<span className="text-cyan-400">-AI</span><sup className="text-[8px] text-slate-400">™</sup>
                                </span>
                            </>
                        )}
                    </div>
                    <span className="sm:hidden font-heading text-sm font-semibold text-white">
                        {cbOnly
                            ? <>CreatorBoost<span className="text-cyan-400">AI</span></>
                            : <>CB<span className="text-cyan-400">AI</span> + BodyIQ<span className="text-cyan-400">-AI</span></>
                        }
                    </span>
                </Link>

                <nav className="hidden items-center gap-4 lg:gap-6 md:flex">
                    {links.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.to === "/"}
                            data-testid={l.testid}
                            className={({ isActive }) =>
                                `whitespace-nowrap text-[13px] font-medium tracking-wide transition-colors ${
                                    isActive
                                        ? "text-cyan-400"
                                        : l.highlight
                                            ? "text-cyan-300 hover:text-cyan-200"
                                            : "text-slate-300 hover:text-white"
                                }`
                            }
                        >
                            {l.highlight ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-dot" />
                                    {l.label}
                                </span>
                            ) : l.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden md:flex md:items-center md:gap-3">
                    <LanguageSelector />
                    <Link
                        to="/demo"
                        data-testid="nav-cta-demo"
                        className="inline-flex items-center rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.55)]"
                    >
                        Watch Demo
                    </Link>
                    <Link
                        to="/team-access"
                        data-testid="nav-team-access"
                        className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-ink-900 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-200"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-dot" />
                        Team Access
                    </Link>
                </div>

                <button
                    data-testid="nav-mobile-toggle"
                    className="md:hidden p-2 text-slate-200"
                    onClick={() => setOpen(!open)}
                    aria-label={t("nav.menu_toggle")}
                >
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Tagline strip — appears site-wide directly under header */}
            <div className="border-t border-white/5 bg-ink-900/60" data-testid="tagline-strip">
                <div className="mx-auto max-w-7xl px-5 py-2 lg:px-8">
                    <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/90 sm:text-[11px]">
                        {cbOnly
                            ? "CreatorBoostAI · The Execution Layer for Modern Retail Operations"
                            : "The AI Operating System That Runs and Grows Your Business · Powered by Real-Time Human Intelligence"
                        }
                    </p>
                </div>
            </div>

            {open && (
                <div className="border-t border-white/5 bg-ink-800 md:hidden" data-testid="nav-mobile-menu">
                    <nav className="flex flex-col px-5 py-4">
                        {links.map((l) => (
                            <NavLink
                                key={l.to}
                                to={l.to}
                                end={l.to === "/"}
                                onClick={() => setOpen(false)}
                                data-testid={`${l.testid}-mobile`}
                                className={({ isActive }) =>
                                    `py-2.5 text-base font-medium ${isActive ? "text-cyan-400" : "text-slate-300"}`
                                }
                            >
                                {l.label}
                            </NavLink>
                        ))}
                        <Link
                            to="/demo"
                            onClick={() => setOpen(false)}
                            data-testid="nav-cta-demo-mobile"
                            className="mt-3 inline-flex items-center justify-center rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-ink-900"
                        >
                            Watch Demo
                        </Link>
                        <Link
                            to="/team-access"
                            onClick={() => setOpen(false)}
                            data-testid="nav-team-access-mobile"
                            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md border border-cyan-500/40 bg-ink-900 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-dot" />
                            Team Access
                        </Link>
                        <LanguageSelector variant="mobile" />
                    </nav>
                </div>
            )}
        </header>
    );
};
