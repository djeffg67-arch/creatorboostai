import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { SUPPORTED_LANGS } from "@/lib/i18n";

/**
 * Compact language switcher used in the navbar (desktop + mobile menu).
 * Persists choice via i18n.changeLanguage → localStorage (handled by i18n.js).
 * Mobile-friendly: dropdown closes on outside click + Escape.
 */
export const LanguageSelector = ({ variant = "desktop" }) => {
    const { i18n, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const current = SUPPORTED_LANGS.find((l) => l.code === i18n.language) || SUPPORTED_LANGS[0];

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const change = (code) => { i18n.changeLanguage(code); setOpen(false); };

    if (variant === "mobile") {
        return (
            <div className="mt-3 border-t border-white/5 pt-3" data-testid="lang-selector-mobile">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{t("lang.label")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {SUPPORTED_LANGS.map((l) => (
                        <button
                            key={l.code}
                            onClick={() => change(l.code)}
                            data-testid={`lang-mobile-${l.code}`}
                            className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs ${current.code === l.code ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-slate-300 hover:border-white/20"}`}
                        >
                            <span aria-hidden>{l.flag}</span> {l.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label={t("lang.select")}
                data-testid="lang-selector"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
                <Globe size={13} className="text-cyan-400" />
                <span className="font-mono uppercase tracking-[0.18em]">{current.code}</span>
                <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div
                    data-testid="lang-dropdown"
                    className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-white/10 bg-ink-800 shadow-xl backdrop-blur-xl rtl:left-0 rtl:right-auto"
                >
                    {SUPPORTED_LANGS.map((l) => (
                        <button
                            key={l.code}
                            onClick={() => change(l.code)}
                            data-testid={`lang-option-${l.code}`}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-cyan-500/10 ${current.code === l.code ? "text-cyan-300" : "text-slate-200"}`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <span aria-hidden className="text-base leading-none">{l.flag}</span>
                                <span>{l.label}</span>
                            </span>
                            {current.code === l.code && <Check size={13} className="text-cyan-400" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
