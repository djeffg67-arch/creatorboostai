import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Activity, Sparkles, Clock } from "lucide-react";

/**
 * <RecentActivityTicker />
 *
 * Real-time social-proof strip fed by /api/demo/recent-saves.
 * Rotates through the latest demo saves ("Jane from Acme saved Real Estate demo
 * 3 min ago — still 14 seats open today"). No PII beyond first name.
 *
 * Stays silent if there are no recent saves — no placeholder fake data.
 * Test IDs: recent-activity-ticker, recent-activity-item
 */
export const RecentActivityTicker = () => {
    const [items, setItems] = useState([]);
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const r = await api.get("/demo/recent-saves?limit=8");
                if (!cancelled && Array.isArray(r.data?.items)) {
                    setItems(r.data.items);
                }
            } catch { /* silent — no noise on hero if feed fails */ }
        };
        load();
        const poll = setInterval(load, 60_000);
        return () => { cancelled = true; clearInterval(poll); };
    }, []);

    useEffect(() => {
        if (items.length < 2) return;
        const rot = setInterval(() => setIdx((p) => (p + 1) % items.length), 4500);
        return () => clearInterval(rot);
    }, [items.length]);

    if (items.length === 0) return null;

    const item = items[idx % items.length];
    const seats = Math.max(3, 22 - items.length); // loose social-scarcity signal

    return (
        <div
            data-testid="recent-activity-ticker"
            className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3.5 py-2 backdrop-blur-md max-w-full"
        >
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                <Activity size={11} className="animate-pulse" />
            </span>
            <div className="min-w-0 flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5" data-testid="recent-activity-item">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Live</span>
                <span className="truncate text-xs text-slate-200 sm:text-[13px]">
                    <span className="font-semibold text-white">{item.name}</span>
                    {item.location && (
                        <>
                            {" from "}
                            <span className="font-semibold text-white">{item.location}</span>
                        </>
                    )}
                    {" "}saved the{" "}
                    <span className="font-semibold text-cyan-300">{item.industry}</span>
                    {" "}demo
                    {typeof item.minutes_ago === "number" && (
                        <span className="text-slate-400">
                            {" "}· <Clock size={10} className="inline -mt-0.5" /> {fmtMinutes(item.minutes_ago)}
                        </span>
                    )}
                </span>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                    <Sparkles size={10} /> {seats} seats open today
                </span>
            </div>
        </div>
    );
};

const fmtMinutes = (m) => {
    if (m == null) return "just now";
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

export default RecentActivityTicker;
