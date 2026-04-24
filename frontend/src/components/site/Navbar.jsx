import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const links = [
    { to: "/", label: "Home", testid: "nav-home" },
    { to: "/demo", label: "Demo", testid: "nav-demo" },
    { to: "/training", label: "Training", testid: "nav-training" },
    { to: "/forensic-library", label: "Library", testid: "nav-library" },
    { to: "/contact", label: "Contact", testid: "nav-contact" },
];

export const Navbar = () => {
    const [open, setOpen] = useState(false);

    return (
        <header
            data-testid="site-navbar"
            className="sticky top-0 z-50 w-full border-b border-white/5 bg-ink-800/80 backdrop-blur-xl"
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
                <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-logo">
                    <div className="relative h-7 w-7">
                        <div className="absolute inset-0 rounded-sm bg-cyan-500/20 blur-md group-hover:bg-cyan-400/40 transition-all" />
                        <div className="relative flex h-7 w-7 items-center justify-center rounded-sm border border-cyan-500/40 bg-ink-900">
                            <span className="font-mono text-[10px] font-semibold text-cyan-400">B.IQ</span>
                        </div>
                    </div>
                    <span className="font-heading text-lg font-semibold tracking-tight text-white">
                        BodyIQ<span className="text-cyan-400">-AI</span>
                    </span>
                </Link>

                <nav className="hidden items-center gap-8 md:flex">
                    {links.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.to === "/"}
                            data-testid={l.testid}
                            className={({ isActive }) =>
                                `text-sm font-medium tracking-wide transition-colors ${
                                    isActive ? "text-cyan-400" : "text-slate-300 hover:text-white"
                                }`
                            }
                        >
                            {l.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden md:block">
                    <Link
                        to="/demo"
                        data-testid="nav-cta-demo"
                        className="inline-flex items-center rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.55)]"
                    >
                        Experience Demo
                    </Link>
                </div>

                <button
                    data-testid="nav-mobile-toggle"
                    className="md:hidden p-2 text-slate-200"
                    onClick={() => setOpen(!open)}
                    aria-label="Toggle menu"
                >
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
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
                            Experience Demo
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
};
