import React from "react";
import { Layout } from "@/components/site/Layout";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail, Calendar, ArrowRight } from "lucide-react";

export default function ThankYouPage() {
    return (
        <Layout>
            <section className="relative overflow-hidden py-24 lg:py-36" data-testid="thankyou-page">
                <div className="absolute inset-0 ambient-grid" />
                <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 500, height: 500, top: -160, left: "50%", transform: "translateX(-50%)" }} />
                <div className="glow-orb glow-orb--blue" style={{ width: 340, height: 340, bottom: -140, right: -60 }} />
                <div className="relative mx-auto max-w-2xl px-5 text-center lg:px-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                        <CheckCircle2 size={28} className="text-cyan-400" />
                    </div>
                    <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Reservation Confirmed</p>
                    <h1 className="font-heading mt-4 text-balance text-4xl font-semibold text-white sm:text-5xl">
                        Your seat is locked in.
                    </h1>
                    <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
                        Welcome to the cohort. Session details, pre-work, and access links will arrive
                        in your inbox within 24 hours.
                    </p>

                    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 text-left">
                            <Mail size={16} className="text-cyan-400" />
                            <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 01</p>
                            <p className="mt-1 text-sm text-slate-200">Check your inbox for the welcome packet and calendar invite.</p>
                        </div>
                        <div className="rounded-md border border-white/10 bg-ink-700/40 p-5 text-left">
                            <Calendar size={16} className="text-cyan-400" />
                            <p className="font-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">Step 02</p>
                            <p className="mt-1 text-sm text-slate-200">Add the session to your calendar and complete 15-minute pre-work.</p>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            to="/demo"
                            data-testid="thankyou-cta-demo"
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-ink-900"
                        >
                            Explore the Demo <ArrowRight size={15} />
                        </Link>
                        <Link
                            to="/"
                            data-testid="thankyou-cta-home"
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-6 py-3 text-sm font-medium text-slate-200 transition-all hover:border-white/20 hover:text-white"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
