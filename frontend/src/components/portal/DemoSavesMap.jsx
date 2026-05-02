import React, { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { MapPin, Globe2 } from "lucide-react";
import { opsDemoSavesGeo } from "@/lib/api";

/**
 * <DemoSavesMap />
 *
 * World-map pin cluster of demo-save locations (city-level). Founder-only;
 * backed by /api/ops/demo-saves-geo. Marker size scales with the number of
 * saves at that bucket. Click a marker to see the city + demo breakdown in
 * the side list.
 *
 * Test IDs: saves-map · saves-map-marker-<i> · saves-map-legend-country-<i>
 */
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export const DemoSavesMap = ({ auth, range = "30d" }) => {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(true);
    const [active, setActive] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setBusy(true);
        opsDemoSavesGeo({ ...auth, range })
            .then((d) => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setData({ markers: [], top_countries: [], total_with_geo: 0 }); })
            .finally(() => { if (!cancelled) setBusy(false); });
        return () => { cancelled = true; };
    }, [auth, range]);

    const markers = data?.markers || [];
    const topCountries = data?.top_countries || [];
    const maxCount = useMemo(() => Math.max(1, ...markers.map((m) => m.count)), [markers]);

    return (
        <div className="rounded-md border border-white/10 bg-ink-700/40 p-4" data-testid="saves-map">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="font-heading text-lg font-semibold text-white flex items-center gap-2">
                        <Globe2 size={16} className="text-cyan-300" />
                        Demo Saves · Global Heat-map
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                        {busy ? "Loading…" : `${data?.total_with_geo || 0} geo-resolved saves in range`}
                    </p>
                </div>
                {topCountries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" data-testid="saves-map-legend">
                        {topCountries.slice(0, 6).map((c, i) => (
                            <span
                                key={c.country_code}
                                data-testid={`saves-map-legend-country-${i}`}
                                className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300"
                            >
                                {c.country_code} · {c.count}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {!busy && markers.length === 0 && (
                <p className="mt-6 py-8 text-center text-sm text-slate-400" data-testid="saves-map-empty">
                    No geo-resolved saves yet in this range. Saves from private / CDN proxies don’t produce location data.
                </p>
            )}

            {markers.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 overflow-hidden rounded-md border border-white/10 bg-ink-900">
                        <ComposableMap
                            projectionConfig={{ rotate: [-11, 0, 0], scale: 145 }}
                            style={{ width: "100%", height: "auto" }}
                        >
                            <Geographies geography={GEO_URL}>
                                {({ geographies }) =>
                                    geographies.map((geo) => (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill="#0B1220"
                                            stroke="#1E293B"
                                            strokeWidth={0.4}
                                            style={{
                                                default: { outline: "none" },
                                                hover: { outline: "none", fill: "#0F172A" },
                                                pressed: { outline: "none" },
                                            }}
                                        />
                                    ))
                                }
                            </Geographies>
                            {markers.map((m, i) => {
                                const radius = 4 + (m.count / maxCount) * 12;
                                const isActive = active && active.city === m.city;
                                return (
                                    <Marker
                                        key={i}
                                        coordinates={[m.lon, m.lat]}
                                        data-testid={`saves-map-marker-${i}`}
                                        onClick={() => setActive(m)}
                                        onMouseEnter={() => setActive(m)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <circle
                                            r={radius}
                                            fill="rgba(6,182,212,0.22)"
                                            stroke="#06B6D4"
                                            strokeWidth={isActive ? 2 : 1}
                                        />
                                        <circle r={2.2} fill="#22D3EE" />
                                    </Marker>
                                );
                            })}
                        </ComposableMap>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                            {active ? "Selected" : "Top cities"}
                        </p>
                        {(active ? [active] : markers.slice(0, 10)).map((m, i) => (
                            <div
                                key={`${m.city}-${i}`}
                                className="rounded-md border border-white/10 bg-ink-900 p-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">
                                            <MapPin size={12} className="text-cyan-300" />
                                            {m.city || "Unknown city"}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                            {[m.region, m.country_code].filter(Boolean).join(" · ")}
                                        </p>
                                    </div>
                                    <span className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                                        {m.count} save{m.count === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {Object.entries(m.demos || {}).map(([demo, n]) => (
                                        <span key={demo} className="rounded-sm border border-white/10 bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300">
                                            {demo} · {n}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DemoSavesMap;
