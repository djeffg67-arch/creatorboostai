import React from "react";
import { Link } from "react-router-dom";

export const Footer = () => {
    return (
        <footer
            data-testid="site-footer"
            className="border-t border-white/5 bg-ink-900 py-14"
        >
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 md:grid-cols-4 lg:px-8">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-cyan-500/40 bg-ink-800">
                            <span className="font-mono text-[10px] font-semibold text-cyan-400">B.IQ</span>
                        </div>
                        <span className="font-heading text-lg font-semibold text-white">
                            BodyIQ<span className="text-cyan-400">-AI</span>
                        </span>
                    </div>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
                        An AI intelligence platform that reads human signals, interprets behavioral
                        patterns, and produces strategic recommendations for real-world interactions.
                    </p>
                    <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                        SYSTEM ONLINE · v1.0
                    </p>
                </div>

                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Platform</p>
                    <ul className="mt-4 space-y-2.5 text-sm">
                        <li><Link className="text-slate-300 hover:text-cyan-400" to="/demo">Demo</Link></li>
                        <li><Link className="text-slate-300 hover:text-cyan-400" to="/training">Training</Link></li>
                        <li><Link className="text-slate-300 hover:text-cyan-400" to="/forensic-library">Forensic Library</Link></li>
                    </ul>
                </div>

                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Company</p>
                    <ul className="mt-4 space-y-2.5 text-sm">
                        <li><Link className="text-slate-300 hover:text-cyan-400" to="/contact">Contact</Link></li>
                        <li><Link className="text-slate-300 hover:text-cyan-400" to="/admin">Admin</Link></li>
                    </ul>
                </div>
            </div>
            <div className="mx-auto mt-10 max-w-7xl border-t border-white/5 px-5 pt-6 lg:px-8">
                <p className="text-xs text-slate-500">© {new Date().getFullYear()} BodyIQ-AI. All signals protected.</p>
            </div>
        </footer>
    );
};
