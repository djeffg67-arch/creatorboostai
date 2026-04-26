import React from "react";

/**
 * Standardized page hero with a real-world background image, dark gradient
 * mask, ambient grid texture, and a glow orb. Drop-in replacement for the
 * "blank dark hero" pattern used across non-landing pages.
 *
 * Usage:
 *   <PageHero image={PAGE_HERO.contact} kicker="Contact" title={<>Get in <span class="text-cyan-400">touch.</span></>} sub="…" />
 *
 * Children render inside the hero below the title block (e.g. forms, CTA rows).
 */
export const PageHero = ({
    image,
    kicker,
    title,
    sub,
    children,
    align = "left",
    height = "default",
    testid,
    overlay = "default",
}) => {
    const minH = height === "tall" ? "min-h-[460px] lg:min-h-[520px]" : "min-h-[320px] lg:min-h-[380px]";
    const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
    const overlayCls =
        overlay === "heavy"
            ? "from-ink-900/95 via-ink-900/80 to-ink-900"
            : overlay === "soft"
            ? "from-ink-900/70 via-ink-900/55 to-ink-900"
            : "from-ink-900/85 via-ink-900/70 to-ink-900";

    return (
        <section
            data-testid={testid || "page-hero"}
            className={`relative isolate overflow-hidden border-b border-white/5 ${minH}`}
        >
            <div className="absolute inset-0 -z-10">
                {image && (
                    <img
                        src={image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-35"
                        loading="eager"
                    />
                )}
                <div className={`absolute inset-0 bg-gradient-to-b ${overlayCls}`} />
                <div className="absolute inset-0 ambient-grid opacity-30" />
                <div
                    className="glow-orb glow-orb--cyan animate-float-slow"
                    style={{ width: 480, height: 480, top: -180, left: -120 }}
                />
                <div
                    className="glow-orb glow-orb--blue"
                    style={{ width: 380, height: 380, bottom: -160, right: -100 }}
                />
            </div>
            <div className="mx-auto flex max-w-7xl flex-col justify-center px-5 py-16 lg:px-8 lg:py-20">
                <div className={`max-w-3xl ${alignCls}`}>
                    {kicker && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                                {kicker}
                            </span>
                        </div>
                    )}
                    {title && (
                        <h1 className="font-heading mt-5 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-4xl lg:text-5xl">
                            {title}
                        </h1>
                    )}
                    {sub && (
                        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                            {sub}
                        </p>
                    )}
                    {children && <div className="mt-6">{children}</div>}
                </div>
            </div>
        </section>
    );
};

export default PageHero;
