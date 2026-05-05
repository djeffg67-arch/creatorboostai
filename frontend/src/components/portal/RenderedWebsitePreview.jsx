import React, { useState } from "react";
import { Smartphone, Monitor } from "lucide-react";

/**
 * Renders a real (or demo) website preview from a `site` JSON object.
 * Matches the demo aesthetic so the same component can power both surfaces.
 *
 * Expected shape:
 *   { domain, brand, tagline,
 *     hero: { eyebrow, headline, subheadline, primary_cta, secondary_cta },
 *     services: [{ title, desc, price }],
 *     about, trust_points: [...], contact_fields: [...], contact_cta,
 *     footer_blurb }
 */
export const RenderedWebsitePreview = ({ site, defaultViewport = "desktop", testIdPrefix = "website" }) => {
    const [viewport, setViewport] = useState(defaultViewport);
    if (!site) return null;
    const isMobile = viewport === "mobile";
    const domain = (site.domain || "yourbusiness.com").replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const fullDomain = domain.includes(".") ? domain : `${domain}.com`;

    return (
        <div className="rounded-md border border-emerald-500/20 bg-ink-900/60 p-4" data-testid={`${testIdPrefix}-preview-card`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Live preview</p>
                    <p className="font-mono text-[10px] text-slate-500">{fullDomain}</p>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewport("mobile")}
                        data-testid={`${testIdPrefix}-preview-mobile`}
                        className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
                            isMobile ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-slate-400 hover:text-emerald-300"
                        }`}
                    >
                        <Smartphone size={10} /> Mobile
                    </button>
                    <button
                        onClick={() => setViewport("desktop")}
                        data-testid={`${testIdPrefix}-preview-desktop`}
                        className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
                            !isMobile ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-slate-400 hover:text-emerald-300"
                        }`}
                    >
                        <Monitor size={10} /> Desktop
                    </button>
                </div>
            </div>

            <div
                className={`mt-3 overflow-hidden rounded-md border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 transition-all duration-500 ${
                    isMobile ? "mx-auto max-w-[320px]" : "w-full"
                }`}
                data-testid={`${testIdPrefix}-preview-frame`}
            >
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-black/30 px-2 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                    <span className="ml-2 truncate font-mono text-[9px] text-slate-400">{fullDomain}</span>
                </div>
                {/* Nav */}
                <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2">
                    <span className="font-heading text-[12px] font-semibold text-white">{site.brand || "Your Business"}</span>
                    <div className="flex gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-400">
                        <span>Home</span><span>Services</span><span>About</span><span>Contact</span>
                    </div>
                </div>
                {/* Hero */}
                <div className="px-4 py-5">
                    {site.hero?.eyebrow && (
                        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-emerald-300">{site.hero.eyebrow}</p>
                    )}
                    <p className="mt-1.5 font-heading text-[18px] font-semibold leading-tight text-white sm:text-[22px]">
                        {site.hero?.headline || site.tagline || "Your headline goes here"}
                    </p>
                    {site.hero?.subheadline && (
                        <p className="mt-2 text-[11px] leading-snug text-slate-300 sm:text-[12px]">
                            {site.hero.subheadline}
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-sm bg-emerald-400 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-900">
                            {site.hero?.primary_cta || "Get started"}
                        </span>
                        {site.hero?.secondary_cta && (
                            <span className="rounded-sm border border-cyan-500/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">
                                {site.hero.secondary_cta}
                            </span>
                        )}
                    </div>
                </div>

                {/* Services */}
                {Array.isArray(site.services) && site.services.length > 0 && (
                    <div className="border-t border-white/10 bg-black/20 px-4 py-3">
                        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-cyan-300">Services</p>
                        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {site.services.slice(0, 4).map((s, i) => (
                                <div key={i} className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-heading text-[11px] font-semibold text-white">{s.title}</span>
                                        {s.price && (
                                            <span className="font-mono text-[9px] text-emerald-300">{s.price}</span>
                                        )}
                                    </div>
                                    {s.desc && <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{s.desc}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* About */}
                {site.about && (
                    <div className="border-t border-white/10 px-4 py-3">
                        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-cyan-300">About</p>
                        <p className="mt-1.5 text-[11px] leading-snug text-slate-300">{site.about}</p>
                    </div>
                )}

                {/* Trust points */}
                {Array.isArray(site.trust_points) && site.trust_points.length > 0 && (
                    <div className="border-t border-white/10 bg-black/20 px-4 py-3">
                        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {site.trust_points.slice(0, 4).map((t, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300">
                                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Lead form */}
                <div className="border-t border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                    <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-emerald-300">Lead capture → CRM</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                        {(site.contact_fields || ["Name", "Email", "Phone", "Message"]).slice(0, 4).map((f, i) => (
                            <span key={i} className="truncate rounded-sm bg-white/5 px-2 py-1 text-[9px] text-slate-400">{f}</span>
                        ))}
                    </div>
                    <span className="mt-1.5 block rounded-sm bg-emerald-400 px-2 py-1 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-900">
                        {site.contact_cta || "Submit"}
                    </span>
                </div>

                {/* Footer */}
                {site.footer_blurb && (
                    <div className="border-t border-white/10 bg-black/30 px-4 py-2">
                        <p className="font-mono text-[8px] text-slate-500">{site.footer_blurb}</p>
                    </div>
                )}
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-400">
                Domain-ready · lead capture wired to your CRM
            </p>
        </div>
    );
};

export default RenderedWebsitePreview;
