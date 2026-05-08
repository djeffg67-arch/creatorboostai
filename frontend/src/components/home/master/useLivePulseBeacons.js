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
    const esRef           = useRef(null);
    const reconnectRef    = useRef(null);
    const cancelledRef    = useRef(false);

    useEffect(() => {
        if (!BACKEND_URL) return undefined;
        cancelledRef.current = false;

        const triggerKind = (kind, action_id, title) => {
            const beacons = KIND_TO_BEACONS[kind];
            if (!beacons || !beacons.length) return;
            const now = Date.now();
            setFlashes((prev) => {
                const next = { ...prev };
                beacons.forEach((bid) => { next[bid] = now; });
                return next;
            });
            setLastEvent({ kind, action_id: action_id || null, title: title || null, ts: now });
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
                triggerKind(payload.kind, payload.action_id, payload.title);
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

    return { flashes, sseLive, lastEvent };
};

export default useLivePulseBeacons;
