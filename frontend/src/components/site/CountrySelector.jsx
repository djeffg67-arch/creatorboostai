import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";

const STORAGE_KEY = "bodyiq_region";

/**
 * Region selector for the homepage hero. Pure UX preference — saved to
 * localStorage so we can later filter content (e.g., currency, regional
 * cohort dates). Doesn't affect URL or routing.
 */
const REGIONS = [
    { code: "global", label: "Global" },
    { code: "us", label: "United States" },
    { code: "ca", label: "Canada" },
    { code: "mx", label: "México" },
    { code: "br", label: "Brasil" },
    { code: "uk", label: "United Kingdom" },
    { code: "eu", label: "Europe" },
    { code: "ae", label: "GCC / UAE" },
    { code: "in", label: "India" },
    { code: "cn", label: "中国" },
    { code: "apac", label: "Asia–Pacific" },
];

export const CountrySelector = () => {
    const { t } = useTranslation();
    const [region, setRegion] = useState(() => {
        if (typeof window === "undefined") return "global";
        return localStorage.getItem(STORAGE_KEY) || "global";
    });

    useEffect(() => {
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, region);
    }, [region]);

    return (
        <div
            data-testid="country-selector"
            className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2 backdrop-blur-sm"
        >
            <MapPin size={12} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">{t("country.label")}</span>
            <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                aria-label={t("country.select")}
                data-testid="country-selector-control"
                className="bg-transparent text-sm text-cyan-200 focus:outline-none"
            >
                {REGIONS.map((r) => (
                    <option key={r.code} value={r.code} className="bg-ink-800 text-white">{r.label}</option>
                ))}
            </select>
        </div>
    );
};

export default CountrySelector;
