/**
 * AccessLinkPage.jsx
 * ------------------
 * Three simple routes that accept a key/token via `?key=` or `?token=`
 * and bounce the user into /portal/ops fully signed in.
 *
 *   /founder-access?key=...
 *   /executive-access?key=...
 *   /employee-access?token=<invite-token>
 *
 * If the param is missing we show a tiny inline form so the user can paste it.
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import { opsFounderAccess, opsExecutiveAccess, opsEmployeeAcceptInvite } from "@/lib/api";
import { Crown, ShieldCheck, Users, Loader2, ArrowRight } from "lucide-react";

const STORAGE_KEY = "cb_ops_session";

const CONFIG = {
    founder: {
        title: "Founder Access",
        sub: "Full system · bypasses subscriptions",
        Icon: Crown,
        param: "key",
        authFn: (v) => opsFounderAccess(v),
        placeholder: "Founder master key",
        testid: "founder-access",
        accentCls: "border-amber-500/40 bg-amber-500/5 text-amber-300",
    },
    executive: {
        title: "Executive Access",
        sub: "Elevated access · President role",
        Icon: ShieldCheck,
        param: "key",
        authFn: (v) => opsExecutiveAccess(v),
        placeholder: "Executive master key",
        testid: "executive-access",
        accentCls: "border-cyan-500/40 bg-cyan-500/5 text-cyan-300",
    },
    employee: {
        title: "Employee Access",
        sub: "Accept your invite and log in",
        Icon: Users,
        param: "token",
        authFn: (v) => opsEmployeeAcceptInvite(v),
        placeholder: "Invite token (from your email)",
        testid: "employee-access",
        accentCls: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300",
    },
};

export default function AccessLinkPage({ mode }) {
    const cfg = CONFIG[mode] || CONFIG.founder;
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("idle"); // idle | busy | success | error
    const [manual, setManual] = useState("");

    const signIn = async (value) => {
        setStatus("busy");
        try {
            const data = await cfg.authFn(value);
            const session = { email: data.email, token: data.token };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* noop */ }
            setStatus("success");
            toast.success(`Signed in · ${data.role}`);
            setTimeout(() => navigate(data.redirect || "/portal/ops", { replace: true }), 500);
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Invalid access value");
            setStatus("error");
        }
    };

    useEffect(() => {
        const v = params.get(cfg.param);
        if (v) signIn(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    return (
        <Layout>
            <section className="relative min-h-[70vh] overflow-hidden bg-ink-900" data-testid={`${cfg.testid}-page`}>
                <div className="absolute inset-0 ambient-grid opacity-40" />
                <div className="relative mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] ${cfg.accentCls}`}>
                        <cfg.Icon size={12} /> {cfg.title}
                    </div>
                    <h1 className="font-heading mt-5 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                        {cfg.sub}
                    </h1>

                    {status === "busy" && (
                        <div className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300" data-testid={`${cfg.testid}-busy`}>
                            <Loader2 size={14} className="animate-spin" /> Verifying…
                        </div>
                    )}
                    {status === "success" && (
                        <div className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300" data-testid={`${cfg.testid}-success`}>
                            <ArrowRight size={14} /> Opening your operating dashboard…
                        </div>
                    )}
                    {(status === "idle" || status === "error") && (
                        <div className="mt-6 max-w-md" data-testid={`${cfg.testid}-manual-entry`}>
                            <p className="text-sm text-slate-300">
                                Paste your {cfg.param === "token" ? "invite token" : "access key"} below to sign in.
                            </p>
                            <form onSubmit={(e) => { e.preventDefault(); if (manual) signIn(manual); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
                                <input value={manual} onChange={(e) => setManual(e.target.value)}
                                    placeholder={cfg.placeholder}
                                    data-testid={`${cfg.testid}-input`}
                                    className="flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none font-mono" />
                                <button type="submit" data-testid={`${cfg.testid}-submit`}
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-2 text-sm font-semibold text-ink-900 hover:bg-cyan-400">
                                    Sign In <ArrowRight size={13} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
