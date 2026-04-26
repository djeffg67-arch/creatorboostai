import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { api } from "@/lib/api";
import { Lock, Loader2, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "bodyiq_portal_user";

/**
 * /founder?key=SECURE_KEY
 *
 * Hidden master access. Validates the key against backend FOUNDER_KEY env var,
 * receives a portal_token + full entitlement bundle, drops the user straight
 * into /portal as if they had paid for everything. No nav link — direct URL only.
 *
 * Security: zero credentials are accepted unless the URL contains `?key=`. The
 * actual validation happens server-side via `secrets.compare_digest`.
 */
export default function FounderPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("authenticating"); // authenticating | error | done
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const key = params.get("key");
        if (!key) { setStatus("error"); setErrorMsg("Missing access key. Append ?key=… to the URL."); return; }
        let alive = true;
        api.post("/founder/auth", { key })
            .then((r) => {
                if (!alive) return;
                const data = {
                    email: r.data.email,
                    token: r.data.token,
                    entitlements: r.data.entitlements || [],
                    subscriptions: [],
                    role: r.data.role,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                // Strip ?key from URL before redirecting so the secret never sticks
                // around in browser history / referrer.
                window.history.replaceState({}, "", "/founder");
                setStatus("done");
                setTimeout(() => navigate("/portal", { replace: true }), 600);
            })
            .catch((err) => {
                if (!alive) return;
                const detail = err?.response?.data?.detail;
                setStatus("error");
                setErrorMsg(typeof detail === "string" ? detail : "Authentication failed.");
            });
        return () => { alive = false; };
    }, [params, navigate]);

    return (
        <Layout>
            <div className="mx-auto max-w-md px-4 py-32" data-testid="founder-page">
                <div className="rounded-md border border-cyan-500/30 bg-ink-700/40 p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <ShieldCheck size={11} className="text-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Master Access</span>
                    </div>
                    {status === "authenticating" && (
                        <div className="mt-6" data-testid="founder-auth-loading">
                            <h1 className="font-heading text-2xl font-semibold text-white">Authenticating…</h1>
                            <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-400">
                                <Loader2 size={14} className="animate-spin text-cyan-400" /> Verifying founder key
                            </p>
                        </div>
                    )}
                    {status === "done" && (
                        <div className="mt-6" data-testid="founder-auth-success">
                            <h1 className="font-heading text-2xl font-semibold text-white">Access granted.</h1>
                            <p className="mt-2 text-sm text-slate-300">Redirecting to portal…</p>
                        </div>
                    )}
                    {status === "error" && (
                        <div className="mt-6" data-testid="founder-auth-error">
                            <div className="inline-flex items-center gap-2">
                                <Lock size={14} className="text-red-300" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-300">Denied</span>
                            </div>
                            <h1 className="font-heading mt-3 text-2xl font-semibold text-white">Access denied.</h1>
                            <p className="mt-2 text-sm text-slate-400">{errorMsg}</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
