import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { websiteBuilderFetchPublished, websiteBuilderPublishedLead } from "@/lib/api";

/**
 * Public-facing rendering of a generated business website.
 * Route: /p/:slug
 * No header/footer chrome from the marketing site — this is the *customer's*
 * site, hosted on a CreatorBoostAI subdomain path.
 */
export default function PublishedSitePage() {
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const r = await websiteBuilderFetchPublished(slug);
                if (!cancelled) setData(r);
            } catch (e) {
                if (!cancelled) {
                    const msg = e?.response?.status === 404
                        ? "Site not found or unpublished."
                        : (e?.response?.data?.detail || e?.message || "Could not load site");
                    setError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    if (loading) {
        return (
            <div data-testid="published-loading" className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
                <Loader2 className="mr-2 animate-spin" size={18} />
                <span className="font-mono text-xs uppercase tracking-[0.22em]">Loading site…</span>
            </div>
        );
    }

    if (error || !data?.site) {
        return (
            <div data-testid="published-error" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
                <p className="font-heading text-2xl text-white">{error || "Site not available."}</p>
                <Link to="/" className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                    Visit CreatorBoostAI
                </Link>
            </div>
        );
    }

    return <PublicSiteRender slug={slug} site={data.site} businessName={data.business_name} />;
}

const PublicSiteRender = ({ slug, site, businessName }) => {
    const brand = site.brand || businessName || "Your Business";
    return (
        <div data-testid="published-site" className="min-h-screen bg-slate-950 text-slate-100">
            {/* Top nav */}
            <header className="border-b border-white/5 bg-slate-900/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="font-heading text-lg font-semibold text-white">{brand}</span>
                    </div>
                    <nav className="hidden gap-6 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 sm:flex">
                        <a href="#services">Services</a>
                        <a href="#about">About</a>
                        <a href="#contact" className="text-emerald-300">Contact</a>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden border-b border-white/5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
                    {site.hero?.eyebrow && (
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300" data-testid="published-eyebrow">
                            {site.hero.eyebrow}
                        </p>
                    )}
                    <h1 className="font-heading mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl" data-testid="published-headline">
                        {site.hero?.headline || site.tagline || brand}
                    </h1>
                    {site.hero?.subheadline && (
                        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg" data-testid="published-subhead">
                            {site.hero.subheadline}
                        </p>
                    )}
                    <div className="mt-8 flex flex-wrap gap-3">
                        <a href="#contact" data-testid="published-cta-primary"
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-6 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-300">
                            {site.hero?.primary_cta || "Get started"} <ArrowRight size={14} />
                        </a>
                        {site.hero?.secondary_cta && (
                            <a href="#services" data-testid="published-cta-secondary"
                                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-6 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/15 hover:text-white">
                                {site.hero.secondary_cta}
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* Services */}
            {Array.isArray(site.services) && site.services.length > 0 && (
                <section id="services" className="border-b border-white/5 py-16">
                    <div className="mx-auto max-w-6xl px-5 lg:px-8">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Services</p>
                        <h2 className="font-heading mt-2 text-3xl font-semibold text-white">What we do</h2>
                        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {site.services.slice(0, 4).map((s, i) => (
                                <div key={i} data-testid={`published-service-${i}`}
                                    className="rounded-md border border-white/10 bg-slate-900/60 p-5 transition-colors hover:border-emerald-500/40">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-heading text-base font-semibold text-white">{s.title}</h3>
                                        {s.price && (
                                            <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">{s.price}</span>
                                        )}
                                    </div>
                                    {s.desc && <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* About */}
            {site.about && (
                <section id="about" className="border-b border-white/5 bg-black/30 py-16">
                    <div className="mx-auto max-w-3xl px-5 lg:px-8">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">About</p>
                        <h2 className="font-heading mt-2 text-3xl font-semibold text-white">Why {brand}</h2>
                        <p className="mt-5 text-base leading-relaxed text-slate-300">{site.about}</p>
                    </div>
                </section>
            )}

            {/* Trust points */}
            {Array.isArray(site.trust_points) && site.trust_points.length > 0 && (
                <section className="border-b border-white/5 py-12">
                    <div className="mx-auto max-w-6xl px-5 lg:px-8">
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {site.trust_points.slice(0, 4).map((t, i) => (
                                <li key={i} data-testid={`published-trust-${i}`}
                                    className="flex items-start gap-2 rounded-md border border-white/5 bg-slate-900/40 p-4 text-sm text-slate-200">
                                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-300" />
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* Lead form */}
            <section id="contact" className="border-b border-white/5 bg-gradient-to-b from-slate-950 to-slate-900 py-20">
                <div className="mx-auto max-w-3xl px-5 lg:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Contact</p>
                    <h2 className="font-heading mt-2 text-3xl font-semibold text-white">
                        {site.contact_cta || "Tell us about your project"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">We respond within one business day.</p>
                    <PublishedLeadForm slug={slug} fields={site.contact_fields} cta={site.contact_cta} />
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black/40 py-8">
                <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 lg:flex-row lg:items-center lg:px-8">
                    <p className="text-xs text-slate-500">{site.footer_blurb || `© ${brand}. All rights reserved.`}</p>
                    <Link to="/" className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 hover:text-cyan-300" data-testid="published-built-with">
                        Built with CreatorBoostAI →
                    </Link>
                </div>
            </footer>
        </div>
    );
};

const PublishedLeadForm = ({ slug, fields, cta }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const wantsPhone = Array.isArray(fields)
        ? fields.some((f) => /phone|mobile|tel/i.test(String(f)))
        : true;

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!email || !email.includes("@")) {
            toast.error("Enter a valid email");
            return;
        }
        setBusy(true);
        try {
            const r = await websiteBuilderPublishedLead(slug, { name, email, phone, message });
            setDone(true);
            toast.success(r.thank_you || "Thanks — we'll be in touch.");
        } catch (err) {
            const msg = err?.response?.data?.detail || err?.message || "Could not submit";
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div data-testid="published-lead-success" className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-300" />
                <p className="font-heading mt-3 text-lg font-semibold text-white">Thanks — we got it.</p>
                <p className="mt-1 text-sm text-slate-300">We'll reach out shortly.</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="published-lead-form">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                data-testid="published-input-name"
                className="rounded-md border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="published-input-email"
                className="rounded-md border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none" />
            {wantsPhone && (
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    data-testid="published-input-phone"
                    className="rounded-md border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none sm:col-span-2" />
            )}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={4}
                data-testid="published-input-message"
                className="rounded-md border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none sm:col-span-2" />
            <button type="submit" disabled={busy}
                data-testid="published-submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-400 px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-emerald-300 disabled:opacity-60 sm:col-span-2">
                {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> {cta || "Send message"}</>}
            </button>
        </form>
    );
};
