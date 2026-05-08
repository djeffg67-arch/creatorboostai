import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * useFilterURLSync · Iter 96+ (v2 — single-source-of-truth)
 * --------------------------------------------------------------------
 * Two-way sync between the homepage's `selectedCategory` state and the
 * `?focus=` URL search param. Also fires fire-and-forget analytics
 * events to /api/public/telemetry/focus.
 *
 * URL slug ↔ internal id mapping:
 *   ?focus=outbound      ↔ outbound
 *   ?focus=revenue       ↔ revenue
 *   ?focus=ai-actions    ↔ actions   (URL uses the human-readable slug)
 *   ?focus=alerts        ↔ alerts
 *   ?focus=appointments  ↔ appointments
 *   ?focus=tasks         ↔ tasks
 *
 * Architecture:
 *   · Hook returns `{ initialFocusId, setFocus }`
 *   · Caller seeds its useState with `initialFocusId` so the first
 *     paint already reflects the URL — zero layout shift.
 *   · Caller calls `setFocus(id)` instead of plain setState; the hook
 *     handles state, URL, and analytics in one shot.
 *   · Browser back/forward is handled by a one-way URL→state listener
 *     that runs only when the URL changes UNDER the current state.
 *
 * Privacy:
 *   · Only utm_source / utm_campaign forwarded
 *   · referrer sent (backend persists hostname only)
 *   · no IP, no fingerprint, no UA
 */

const URL_TO_ID = {
    outbound: "outbound",
    revenue: "revenue",
    "ai-actions": "actions",
    alerts: "alerts",
    appointments: "appointments",
    tasks: "tasks",
};
const ID_TO_URL = {
    outbound: "outbound",
    revenue: "revenue",
    actions: "ai-actions",
    alerts: "alerts",
    appointments: "appointments",
    tasks: "tasks",
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const safeToken = (v) => {
    if (!v || typeof v !== "string") return null;
    const trimmed = v.trim().slice(0, 64);
    if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return null;
    return trimmed;
};

const postFocusEvent = (payload) => {
    if (!BACKEND_URL) return;
    try {
        const url = `${BACKEND_URL}/api/public/telemetry/focus`;
        const body = JSON.stringify(payload);
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            const blob = new Blob([body], { type: "application/json" });
            const ok = navigator.sendBeacon(url, blob);
            if (ok) return;
            // sendBeacon can fail on small subset of browsers — fall through to fetch
        }
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
        }).catch(() => {});
    } catch {
        /* analytics must never throw */
    }
};

export const useFilterURLSync = (selectedCategory, setSelectedCategory) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const focusParam = searchParams.get("focus");
    const incomingId = focusParam ? URL_TO_ID[focusParam] || null : null;

    // Track when the current filter was applied → enables duration_ms on clear
    const appliedAtRef    = useRef(selectedCategory ? Date.now() : 0);
    const initFiredRef    = useRef(false);
    const userActionRef   = useRef(false); // set true on setFocus() to flag intentional changes

    // ── Effect 1: URL → State (back/forward + manual edit) ────────────
    // Skips if the change came from setFocus() in the same tick.
    useEffect(() => {
        if (userActionRef.current) {
            // The state was just set by setFocus(); don't bounce it back.
            userActionRef.current = false;
            return;
        }
        if (incomingId !== selectedCategory) {
            setSelectedCategory(incomingId);
            appliedAtRef.current = incomingId ? Date.now() : 0;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incomingId]);

    // ── Effect 2: First-paint analytics for deep-link campaigns ───────
    useEffect(() => {
        if (initFiredRef.current) return;
        initFiredRef.current = true;
        if (!incomingId) return;
        const utm_source   = safeToken(searchParams.get("utm_source"));
        const utm_campaign = safeToken(searchParams.get("utm_campaign"));
        postFocusEvent({
            category: ID_TO_URL[incomingId] || incomingId,
            action: "load_with_focus",
            duration_ms: null,
            utm_source,
            utm_campaign,
            referrer: typeof document !== "undefined" ? document.referrer || null : null,
        });
        // run once on mount only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Returned API: setFocus(id) — atomic state + URL + analytics ──
    const setFocus = (catId) => {
        const next = catId === selectedCategory ? null : catId;
        userActionRef.current = true;

        // 1. Update state
        setSelectedCategory(next);

        // 2. Update URL (push history)
        const sp = new URLSearchParams(searchParams);
        if (next) sp.set("focus", ID_TO_URL[next] || next);
        else      sp.delete("focus");
        setSearchParams(sp, { replace: false });

        // 3. Fire analytics
        const utm_source   = safeToken(searchParams.get("utm_source"));
        const utm_campaign = safeToken(searchParams.get("utm_campaign"));
        const referrer     = typeof document !== "undefined" ? document.referrer || null : null;
        if (next) {
            // SELECT (or transition between filters)
            appliedAtRef.current = Date.now();
            postFocusEvent({
                category: ID_TO_URL[next] || next,
                action: "select",
                duration_ms: null,
                utm_source, utm_campaign, referrer,
            });
        } else if (selectedCategory) {
            // CLEAR — compute duration since last apply
            const dur = appliedAtRef.current
                ? Math.max(0, Math.min(Date.now() - appliedAtRef.current, 24 * 3600 * 1000))
                : null;
            appliedAtRef.current = 0;
            postFocusEvent({
                category: ID_TO_URL[selectedCategory] || selectedCategory,
                action: "clear",
                duration_ms: dur,
                utm_source, utm_campaign, referrer,
            });
        }
    };

    return { initialFocusId: incomingId, setFocus };
};

export default useFilterURLSync;
