import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { portalLogin } from "@/lib/api";
import { Loader2, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

const STORAGE_KEY = "bodyiq_portal_user";

/**
 * Magic-link auto-login for the Customer Portal.
 *
 * Flow:
 *   Email from Stripe webhook contains `{SITE}/portal/magic?email=...&token=...`
 *   This page validates the token via /api/portal/login, persists the session
 *   into localStorage (same key /portal uses), then redirects to /portal (or
 *   to the `?redirect=` destination if provided).
 */
export default function PortalMagicPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [state, setState] = useState({ status: "loading", message: "" });

    const email = params.get("email");
    const token = params.get("token");
    const redirectTo = params.get("redirect") || "/portal";

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!email || !token) {
                setState({ status: "error", message: "Missing email or token in the magic link." });
                return;
            }
            try {
                const res = await portalLogin({ email, token });
                if (cancelled) return;
                const data = {
                    email: res.email,
                    token,
                    entitlements: res.entitlements,
                    subscriptions: res.subscriptions || [],
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                setState({ status: "ok", message: "Signed in — taking you to your portal…" });
                setTimeout(() => navigate(redirectTo, { replace: true }), 700);
            } catch {
                if (!cancelled) setState({
                    status: "error",
                    message: "This magic link is invalid or has expired. Please request a new one.",
                });
            }
        };
        run();
        return () => { cancelled = true; };
    }, [email, token, redirectTo, navigate]);

    return (
        <Layout>
            <div className="mx-auto max-w-xl px-4 py-24 text-center lg:py-32" data-testid="portal-magic-page">
                {state.status === "loading" && (
                    <div className="flex flex-col items-center" data-testid="portal-magic-loading">
                        <Loader2 size={28} className="animate-spin text-cyan-400" />
                        <h1 className="font-heading mt-5 text-2xl font-semibold text-white sm:text-3xl">
                            Verifying your access…
                        </h1>
                        <p className="mt-3 text-sm text-slate-300">Hang tight — this takes a second.</p>
                    </div>
                )}
                {state.status === "ok" && (
                    <div className="flex flex-col items-center" data-testid="portal-magic-success">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10">
                            <CheckCircle2 size={22} className="text-cyan-300" />
                        </div>
                        <h1 className="font-heading mt-5 text-2xl font-semibold text-white sm:text-3xl">
                            You're signed in.
                        </h1>
                        <p className="mt-3 text-sm text-slate-300">{state.message}</p>
                    </div>
                )}
                {state.status === "error" && (
                    <div className="flex flex-col items-center" data-testid="portal-magic-error">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                            <AlertTriangle size={22} className="text-amber-300" />
                        </div>
                        <h1 className="font-heading mt-5 text-2xl font-semibold text-white sm:text-3xl">
                            Access link invalid.
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-slate-300">{state.message}</p>
                        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
                            <Link
                                to="/portal"
                                data-testid="portal-magic-manual-login"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-cyan-400"
                            >
                                Try manual login <ArrowRight size={14} />
                            </Link>
                            <Link
                                to="/contact"
                                className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-ink-900"
                            >
                                Contact support
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
