/**
 * useDemoTracking — single hook that wires a demo page into the
 * controlled, trackable, conversion-grade Demo Delivery Engine.
 *
 *   const { sessionId, personalization, trackEvent } = useDemoTracking({
 *     demoType: "noldus",
 *     started,            // bool — has the viewer pressed Start?
 *     scene,              // current scene index (0-based)
 *     totalScenes,        // total count
 *     watchSeconds,       // running counter (driven by your scene timer)
 *     overallProgress,    // 0–100 integer
 *     done,               // bool — has the demo completed?
 *   });
 *
 * personalization is `{ name, company, recipient_id }` parsed from the URL
 * (e.g. /demo/realtor?name=Sarah&company=Acme&rid=lead_42).
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { recordDemoOrigin } from "./demoOrigin";

const HEARTBEAT_INTERVAL_MS = 8_000;

const apiBase = () => `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const post = async (path, body) => {
    try {
        const res = await fetch(`${apiBase()}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            keepalive: true,
        });
        return res.ok ? await res.json().catch(() => ({})) : null;
    } catch {
        return null;
    }
};

export const useDemoTracking = ({
    demoType,
    started,
    scene = 0,
    totalScenes,
    watchSeconds = 0,
    overallProgress = 0,
    done = false,
}) => {
    const [params] = useSearchParams();
    const [sessionId, setSessionId] = useState(null);
    const halfNotifiedRef = useRef(false);
    const completedRef = useRef(false);
    const lastHeartbeat = useRef(0);

    const personalization = useMemo(() => {
        const get = (k) => (params.get(k) || "").trim();
        const name    = get("name") || get("n");
        const company = get("company") || get("c");
        const rid     = get("rid") || get("recipient_id");
        const email   = get("email") || get("e");
        return {
            name: name || null,
            company: company || null,
            recipient_id: rid || null,
            recipient_email: email || null,
            // Convenience: a non-empty, sentence-friendly greeting.
            greeting: name
                ? (company ? `Welcome, ${name} from ${company}.` : `Welcome, ${name}.`)
                : null,
        };
    }, [params]);

    // Open the session as soon as Start is pressed (not on mount, so we don't
    // log half-watched sessions on bots / accidental loads).
    useEffect(() => {
        if (!started || sessionId) return;
        // Demo-to-Revenue attribution — persist `demo_origin` locally the
        // moment the viewer engages, so any downstream checkout / contact
        // flow can forward source_demo + source_industry to the backend.
        recordDemoOrigin(demoType);
        let cancelled = false;
        (async () => {
            const utm = {};
            ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
                const v = params.get(k);
                if (v) utm[k] = v;
            });
            const out = await post("/demo/session/start", {
                demo_type: demoType,
                recipient_id: personalization.recipient_id,
                recipient_name: personalization.name,
                recipient_company: personalization.company,
                recipient_email: personalization.recipient_email,
                referrer: typeof document !== "undefined" ? document.referrer : null,
                utm,
            });
            if (!cancelled && out?.session_id) setSessionId(out.session_id);
        })();
        return () => { cancelled = true; };
    }, [started, sessionId, demoType, personalization, params]);

    // Periodic heartbeat
    useEffect(() => {
        if (!sessionId || !started || done) return;
        const tick = () => {
            const now = Date.now();
            if (now - lastHeartbeat.current < HEARTBEAT_INTERVAL_MS) return;
            lastHeartbeat.current = now;
            post("/demo/session/heartbeat", {
                session_id: sessionId,
                progress_pct: Math.max(0, Math.min(100, Math.round(overallProgress))),
                watch_seconds: Math.max(0, Math.round(watchSeconds)),
                current_scene: scene,
                total_scenes: totalScenes,
            }).then((r) => {
                if (r?.half_view_triggered) halfNotifiedRef.current = true;
            });
        };
        tick(); // immediate
        const id = setInterval(tick, HEARTBEAT_INTERVAL_MS);
        return () => clearInterval(id);
    }, [sessionId, started, done, scene, totalScenes, watchSeconds, overallProgress]);

    // Completion → final beacon
    useEffect(() => {
        if (!sessionId || !done || completedRef.current) return;
        completedRef.current = true;
        post("/demo/session/complete", {
            session_id: sessionId,
            watch_seconds: Math.max(0, Math.round(watchSeconds)),
        });
    }, [sessionId, done, watchSeconds]);

    // Final flush on unmount via beacon (for tab-close)
    useEffect(() => {
        return () => {
            if (!sessionId || completedRef.current) return;
            try {
                const blob = new Blob(
                    [JSON.stringify({
                        session_id: sessionId,
                        progress_pct: Math.max(0, Math.min(100, Math.round(overallProgress))),
                        watch_seconds: Math.max(0, Math.round(watchSeconds)),
                        current_scene: scene,
                        total_scenes: totalScenes,
                    })],
                    { type: "application/json" }
                );
                navigator.sendBeacon?.(`${apiBase()}/demo/session/heartbeat`, blob);
            } catch { /* swallow */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const trackEvent = useCallback((event_type, metadata) => {
        if (!sessionId) return;
        post("/demo/session/event", { session_id: sessionId, event_type, metadata });
    }, [sessionId]);

    return { sessionId, personalization, trackEvent };
};

export default useDemoTracking;
