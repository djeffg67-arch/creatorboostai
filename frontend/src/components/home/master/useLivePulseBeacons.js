import { useEffect, useRef, useState } from "react";

/**
 * useLivePulseBeacons · Iter 96+
 * --------------------------------------------------------------------
 * Subscribes to /api/public/system-pulse/stream and exposes a map of
 * beacon-id → last-flash-timestamp. The MasterExperienceShell overlay
 * uses this to fire its visual beacon ONLY when a real event from the
 * backend SSE stream arrives — not on a static timer. This is what
 * turns the homepage from "screenshot" into "live operating system".
 *
 * Mapping (event.kind → beacon-ids that should flash):
 *   - lead, qualified            → ["feed-top", "leads"]
 *   - email, send, reply         → ["feed-top"]
 *   - deal                       → ["deals"]
 *   - invoice                    → ["revenue"]
 *   - appointment                → ["feed-bottom"]
 *   - maintenance, alert         → ["integrations"]
 *   - task                       → ["feed-bottom"]
 *
 * Returned shape: `{ flashes: { beaconId: epochMs }, sseLive: boolean }`
 * Each flash entry stays "fresh" for FLASH_HOLD_MS, after which the
 * overlay fades it back to ambient.
 *
 * Resilience:
 *   - Reconnects with backoff on error
 *   - Cleans up cleanly on unmount
 *   - Falls back to NO flashes if EventSource is unavailable
 *   - Zero animation logic in JS — animation is pure CSS in the overlay
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SSE_RECONNECT_MS = 5000;

const KIND_TO_BEACONS = {
    lead:        ["feed-top", "leads"],
    qualified:   ["feed-top", "leads"],
    email:       ["feed-top"],
    send:        ["feed-top"],
    reply:       ["feed-top"],
    deal:        ["deals"],
    invoice:     ["revenue"],
    appointment: ["feed-bottom"],
    maintenance: ["integrations"],
    alert:       ["integrations"],
    task:        ["feed-bottom"],
};

export const useLivePulseBeacons = () => {
    const [flashes, setFlashes]   = useState({});      // { beaconId: epochMs }
    const [sseLive, setSseLive]   = useState(false);
    const [lastEvent, setLastEvent] = useState(null);  // { kind, action_id, title, ts }
    const [recentEvents, setRecentEvents] = useState([]); // ring buffer of last 5
    const esRef           = useRef(null);
    const reconnectRef    = useRef(null);
    const cancelledRef    = useRef(false);

    useEffect(() => {
        if (!BACKEND_URL) return undefined;
        cancelledRef.current = false;

        // Seed the strip with the initial snapshot so it isn't empty
        // before the first SSE event lands.
        const seedFromSnapshot = async () => {
            try {
                const r = await fetch(`${BACKEND_URL}/api/public/system-pulse`);
                if (!r.ok) return;
                const d = await r.json();
                if (cancelledRef.current) return;
                const events = (d.events || []).slice(0, 5).map((e, i) => ({
                    action_id: e.action_id || `seed-${i}`,
                    kind: e.kind || "task",
                    title: e.title || "Event",
                    sub: e.sub || "",
                    time: e.time || "",
                    ts: Date.now() - (i + 1) * 30000, // staggered older
                }));
                if (events.length) setRecentEvents(events);
            } catch {
                /* ignore — strip just renders empty until first SSE event */
            }
        };
        seedFromSnapshot();

        const triggerEvent = (payload) => {
            const kind = payload.kind;
            const beacons = KIND_TO_BEACONS[kind];
            const now = Date.now();
            // Always update ring buffer + lastEvent — even kinds without
            // a beacon mapping are still legitimate operational events
            // worth surfacing in the action-id ticker.
            setLastEvent({
                kind,
                action_id: payload.action_id || null,
                title: payload.title || null,
                ts: now,
            });
            setRecentEvents((prev) => {
                const enriched = {
                    action_id: payload.action_id || `evt-${now}`,
                    kind,
                    title: payload.title || "Event",
                    sub: payload.sub || "",
                    time: payload.time || "",
                    ts: now,
                };
                return [enriched, ...prev].slice(0, 5);
            });
            // Only flash beacons for mapped kinds
            if (beacons && beacons.length) {
                setFlashes((prev) => {
                    const next = { ...prev };
                    beacons.forEach((bid) => { next[bid] = now; });
                    return next;
                });
            }
        };

        const open = () => {
            if (cancelledRef.current) return;
            if (typeof EventSource === "undefined") return;

            let es;
            try {
                es = new EventSource(`${BACKEND_URL}/api/public/system-pulse/stream`);
            } catch {
                return;
            }
            esRef.current = es;

            es.addEventListener("ready",     () => { if (!cancelledRef.current) setSseLive(true); });
            es.addEventListener("heartbeat", () => { if (!cancelledRef.current) setSseLive(true); });

            es.addEventListener("pulse", (e) => {
                if (cancelledRef.current) return;
                let payload = null;
                try { payload = JSON.parse(e.data); } catch { return; }
                if (!payload || !payload.kind) return;
                triggerEvent(payload);
            });

            es.onerror = () => {
                if (cancelledRef.current) return;
                setSseLive(false);
                try { es.close(); } catch { /* noop */ }
                esRef.current = null;
                reconnectRef.current = window.setTimeout(open, SSE_RECONNECT_MS);
            };
        };

        open();

        return () => {
            cancelledRef.current = true;
            if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
            try { esRef.current && esRef.current.close(); } catch { /* noop */ }
            esRef.current = null;
        };
    }, []);

    return { flashes, sseLive, lastEvent, recentEvents };
};

export default useLivePulseBeacons;
