import React, { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { EmailCapture } from "@/components/site/EmailCapture";
import { Lock, Check, Layers, Image as ImageIcon, BookOpen, Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/api";
import { toast } from "sonner";

const COVER = "https://images.pexels.com/photos/8090294/pexels-photo-8090294.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const ANALYSIS_BG = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=75";
const DETAIL_IMG = "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=75";

const features = [
    { icon: ImageIcon, title: "1,200+ Reference Frames", desc: "Catalogued micro-signal frames, indexed by channel and intensity." },
    { icon: Layers, title: "12 Signal Categories", desc: "Structured by visual, auditory, and behavioral category taxonomies." },
    { icon: BookOpen, title: "Field Annotations", desc: "Each frame paired with interpretation, context, and strategic note." },
];

export default function ForensicLibraryPage() {
    const [loading, setLoading] = useState(false);

    const handlePurchase = async () => {
        setLoading(true);
        try {
            const { url } = await createCheckoutSession({
                product_key: "forensic_library",
                origin_url: window.location.origin,
            });
            toast.success("Opening secure checkout…");
            window.location.href = url;
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not open checkout. Try again.");
            setLoading(false);
        }
    };

    return (
        <Layout>
            <section className="relative overflow-hidden py-20 lg:py-28" data-testid="forensic-hero">
                {/* Ambient background */}
                <div className="absolute inset-0">
                    <img src={ANALYSIS_BG} alt="" loading="eager" className="h-full w-full object-cover opacity-[0.08]" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-ink-800/80 via-ink-800/95 to-ink-800" />
                <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 420, height: 420, top: -120, right: -80 }} />
                <div className="glow-orb glow-orb--violet" style={{ width: 320, height: 320, bottom: -100, left: -60 }} />

                <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 lg:grid-cols-12 lg:px-8">
                    <div className="lg:col-span-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Product · Reference Library</p>
                        <h1 className="font-heading mt-4 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                            The Forensic Visual Library
                        </h1>
                        <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
                            A curated, annotated library of real-world signal frames — built for operators
                            who need a visual reference they can trust.
                        </p>

                        <div className="mt-8 flex items-end gap-2 border-b border-white/5 pb-6">
                            <span className="font-heading text-5xl font-semibold text-white">$59</span>
                            <span className="mb-1.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">One-time · lifetime access</span>
                        </div>

                        <ul className="mt-6 space-y-3 text-sm text-slate-300">
                            {[
                                "1,200+ annotated reference frames",
                                "Searchable by channel, category, intensity",
                                "Downloadable offline reference pack",
                                "Lifetime updates as the library grows",
                            ].map((b) => (
                                <li key={b} className="flex items-start gap-2.5">
                                    <Check size={15} className="mt-0.5 text-cyan-400" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <button
                                onClick={handlePurchase}
                                disabled={loading}
                                data-testid="forensic-purchase"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.55)] disabled:opacity-60"
                            >
                                {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                                {loading ? "Opening checkout…" : "Purchase · $59"}
                            </button>
                            <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                · Secure Stripe Checkout
                            </span>
                        </div>

                        <div className="mt-10 max-w-md rounded-md border border-white/10 bg-ink-700/30 p-5" data-testid="forensic-notify">
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Get notified at launch</p>
                            <div className="mt-3">
                                <EmailCapture source="forensic_library" ctaLabel="Notify me" testid="forensic-lead" />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6">
                        <div className="relative overflow-hidden rounded-md border border-white/10 bg-ink-700/30">
                            <img src={COVER} alt="Forensic Visual Library" className="aspect-[4/5] w-full object-cover opacity-85" />
                            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
                            <div className="absolute bottom-5 left-5 right-5 rounded-sm border border-cyan-500/30 bg-ink-900/70 p-4 backdrop-blur">
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Sample Frame · V-04</p>
                                <p className="mt-1 text-sm text-slate-200">Gaze vector · up-and-right · 340ms hold · interpretation: recall, not construction.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative pb-24" data-testid="forensic-features">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="grid grid-cols-1 gap-px rounded-md border border-white/5 bg-white/5 md:grid-cols-3">
                        {features.map((f) => (
                            <div key={f.title} className="bg-ink-800 p-8">
                                <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5">
                                    <f.icon size={18} className="text-cyan-400" />
                                </div>
                                <h3 className="font-heading mt-5 text-lg font-semibold text-white">{f.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detail imagery strip */}
                    <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {[DETAIL_IMG, COVER, ANALYSIS_BG].map((src, i) => (
                            <div key={i} className="relative overflow-hidden rounded-md border border-white/10">
                                <img src={src} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover opacity-70 transition-transform duration-700 hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
                                <div className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                                    Frame · {String(i + 1).padStart(2, "0")}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
}
