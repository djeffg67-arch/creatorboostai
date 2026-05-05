import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Rocket, Upload, Compass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    startEngineStatus, startEnginePathLeads,
    startEnginePathImport, startEnginePathExplore,
} from "@/lib/api";

export default function StartEnginePage() {
    const [search] = useSearchParams();
    const navigate = useNavigate();
    const [auth, setAuth] = useState(null);
    const [busy, setBusy] = useState(null); // 'leads' | 'import' | 'explore' | null
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Read auth from query params or localStorage (set by sign-in flow)
        const email = search.get("email") || localStorage.getItem("cb_portal_email");
        const token = search.get("token") || localStorage.getItem("cb_portal_token");
        if (!email || !token) {
            toast.error("Sign in first");
            navigate("/team-access");
            return;
        }
        setAuth({ email, token });
        // Status check — if already complete, route to portal
        startEngineStatus({ email, token })
            .then((r) => {
                if (r.onboarding_complete) navigate("/portal/ops");
            })
            .catch(() => navigate("/team-access"));
    }, [navigate, search]);

    const runPath = async (path) => {
        if (!auth) return;
        setBusy(path);
        let progressTimer;
        if (path === "leads") {
            setProgress(0);
            progressTimer = setInterval(() => setProgress((p) => Math.min(p + 8, 92)), 250);
        }
        try {
            let r;
            if (path === "leads") r = await startEnginePathLeads(auth);
            else if (path === "import") r = await startEnginePathImport(auth);
            else r = await startEnginePathExplore(auth);
            if (progressTimer) clearInterval(progressTimer);
            setProgress(100);
            if (path === "leads") toast.success(`${r.added} leads built · autopilot queued`);
            // Persist auth to localStorage so the next page picks it up
            localStorage.setItem("cb_portal_email", auth.email);
            localStorage.setItem("cb_portal_token", auth.token);
            setTimeout(() => navigate(r.redirect || "/portal/ops"), 600);
        } catch (e) {
            if (progressTimer) clearInterval(progressTimer);
            const d = e?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Could not start engine");
            setBusy(null);
        }
    };

    if (!auth) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-ink-900 text-slate-300">
                <Loader2 className="animate-spin text-cyan-300" />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-ink-900 text-slate-100" data-testid="start-engine-page">
            {/* Subtle radial backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_70%)]" />

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-12">
                <div className="mb-10 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-300">CreatorBoostAI · Start Engine</p>
                    <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold leading-tight text-white sm:text-5xl">
                        We're going to get you leads and start outreach right now.
                    </h1>
                    <p className="mt-3 text-sm text-slate-400 sm:text-base">
                        No setup needed. Choose how you want to start.
                    </p>
                </div>

                <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Path 1 — Get me leads (primary) */}
                    <button
                        onClick={() => runPath("leads")}
                        disabled={busy !== null}
                        data-testid="start-engine-path-leads"
                        className="group relative overflow-hidden rounded-xl border border-cyan-500/50 bg-cyan-500/10 p-6 text-left transition-all hover:border-cyan-400 hover:bg-cyan-500/20 disabled:opacity-60"
                    >
                        <div className="absolute right-3 top-3 rounded-sm bg-cyan-500 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-900">primary</div>
                        <Rocket className="text-cyan-300" size={28} />
                        <h3 className="mt-4 font-heading text-xl font-semibold text-white">Get me leads</h3>
                        <p className="mt-2 text-sm text-slate-300">We'll generate your starter list, lock each lead to you, and queue Day 0 outreach automatically.</p>
                        <div className="mt-4 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                            {busy === "leads" ? <Loader2 size={12} className="animate-spin" /> : null}
                            {busy === "leads" ? `Building your first lead list… ${progress}%` : "Start in one click →"}
                        </div>
                    </button>

                    {/* Path 2 — I have leads */}
                    <button
                        onClick={() => runPath("import")}
                        disabled={busy !== null}
                        data-testid="start-engine-path-import"
                        className="group rounded-xl border border-white/15 bg-ink-700/40 p-6 text-left transition-all hover:border-cyan-500/40 hover:bg-ink-700/60 disabled:opacity-60"
                    >
                        <Upload className="text-slate-300" size={28} />
                        <h3 className="mt-4 font-heading text-xl font-semibold text-white">I have leads</h3>
                        <p className="mt-2 text-sm text-slate-300">Upload a CSV (LinkedIn, Lusha, Hunter, Snov) or paste them in. We'll dedupe + lock each lead to you.</p>
                        <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            {busy === "import" ? "Loading…" : "Open import center →"}
                        </div>
                    </button>

                    {/* Path 3 — Just exploring */}
                    <button
                        onClick={() => runPath("explore")}
                        disabled={busy !== null}
                        data-testid="start-engine-path-explore"
                        className="group rounded-xl border border-white/10 bg-ink-700/30 p-6 text-left transition-all hover:border-cyan-500/30 hover:bg-ink-700/50 disabled:opacity-60"
                    >
                        <Compass className="text-slate-400" size={28} />
                        <h3 className="mt-4 font-heading text-xl font-semibold text-white">Just exploring</h3>
                        <p className="mt-2 text-sm text-slate-300">Walk through the 8 industry demos with the avatar guiding you. Generate leads later.</p>
                        <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            {busy === "explore" ? "Loading…" : "Browse demos →"}
                        </div>
                    </button>
                </div>

                <p className="mt-10 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">
                    Exclusive Lead Engine · No duplicates · Locked to you
                </p>
            </div>
        </div>
    );
}
