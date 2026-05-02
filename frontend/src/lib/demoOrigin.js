/**
 * demoOrigin — Demo-to-Revenue attribution helper.
 *
 * When a viewer presses Start on any demo, we persist a single
 * `demo_origin` record in localStorage. When they later hit a
 * checkout / contact / enterprise-request flow, we read that record
 * and forward `source_demo` + `source_industry` as metadata so the
 * founder dashboard can roll up "revenue per demo".
 *
 * 30-day TTL so stale demo views don't attribute months later.
 */

const KEY = "cb_demo_origin";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const INDUSTRY_MAP = {
    realtor: "Real Estate",
    insurance: "Insurance",
    supermarket: "Retail",
    creator: "Influencer",
    noldus: "Enterprise",
    airport: "Enterprise / Airport",
    sita: "Enterprise / Airport",
    general: "General",
};

/** Call this on demo-start. */
export const recordDemoOrigin = (demoType) => {
    if (typeof window === "undefined" || !demoType) return;
    try {
        const payload = {
            demo: demoType,
            industry: INDUSTRY_MAP[demoType] || "Other",
            at: Date.now(),
        };
        window.localStorage.setItem(KEY, JSON.stringify(payload));
    } catch { /* storage disabled — silently no-op */ }
};

/** Read (and auto-expire) the stored demo_origin. */
export const getDemoOrigin = () => {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.at || (Date.now() - parsed.at) > TTL_MS) {
            window.localStorage.removeItem(KEY);
            return null;
        }
        return parsed;
    } catch { return null; }
};

/** Spread into checkout / stripe / contact payloads. */
export const demoAttributionPayload = () => {
    const origin = getDemoOrigin();
    if (!origin) return {};
    return {
        source_demo: origin.demo,
        source_industry: origin.industry,
    };
};

export const clearDemoOrigin = () => {
    if (typeof window === "undefined") return;
    try { window.localStorage.removeItem(KEY); } catch { /* noop */ }
};
