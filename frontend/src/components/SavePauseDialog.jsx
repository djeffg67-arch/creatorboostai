import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Save, Rocket, X, Check, AlertTriangle, Sparkles, Mail } from "lucide-react";
import { saveDemoProgress } from "@/lib/api";
import { toast } from "sonner";

/**
 * <SavePauseDialog />
 *
 * Opens when a viewer pauses a demo. The on-brand "avatar" offers two paths:
 *   1. Save my spot — email me a resume link, keep browsing.
 *   2. See pricing now — skip ahead, decide today.
 *
 * Test IDs:
 *   save-dialog · save-dialog-close · save-dialog-email · save-dialog-name ·
 *   save-dialog-save · save-dialog-pricing · save-dialog-continue ·
 *   save-dialog-result-ok · save-dialog-result-err
 */
export const SavePauseDialog = ({
    open,
    onClose,
    onContinue,
    demoType,
    scene,
    totalScenes,
    demoOrigin,
    sessionId,
    industry = "your business",
}) => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null); // { ok, email_error } | null

    if (!open) return null;

    const progress = Math.round(((scene + 1) / Math.max(1, totalScenes)) * 100);

    const handleSave = async () => {
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            toast.error("Enter a valid email");
            return;
        }
        setBusy(true);
        try {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const res = await saveDemoProgress({
                session_id: sessionId || null,
                demo_type: demoType,
                scene, total_scenes: totalScenes,
                email, name: name || null,
                origin_url: origin,
            });
            setResult({ ok: true, email_sent: res.email_sent, email_error: res.email_error });
            if (res.email_sent) {
                toast.success("Saved — check your inbox for the resume link");
            } else {
                toast.success("Saved — we’ll hold your spot");
            }
        } catch (e) {
            setResult({ ok: false, email_error: e?.message || "Save failed" });
            toast.error("Could not save — try again");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            data-testid="save-dialog"
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-900 p-7 shadow-[0_0_60px_rgba(6,182,212,0.2)]"
                data-testid="save-pause-dialog"
            >
                <button
                    data-testid="save-dialog-close"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-md border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                    aria-label="Close"
                >
                    <X size={14} />
                </button>

                {/* Avatar prompt header */}
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                        <Sparkles size={18} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            CreatorBoostAI · Paused at scene {scene + 1}/{totalScenes} · {progress}%
                        </p>
                        <h3 className="font-heading mt-1 text-xl font-semibold leading-snug text-white sm:text-2xl">
                            Want to pick up where you left off?
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            I can email you a resume link — or, if you’re ready,
                            jump straight to pricing and get {industry} running today.
                        </p>
                    </div>
                </div>

                {/* Body — email save block */}
                {!result && (
                    <div className="mt-6 space-y-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <input
                                data-testid="save-dialog-name"
                                placeholder="Your name (optional)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-md border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                            />
                            <input
                                data-testid="save-dialog-email"
                                type="email"
                                placeholder="you@work.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="rounded-md border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                            />
                        </div>
                        <button
                            data-testid="save-dialog-save"
                            disabled={busy}
                            onClick={handleSave}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 transition-all hover:bg-cyan-400 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {busy ? "Saving…" : "Save my spot & email me the link"}
                        </button>
                    </div>
                )}

                {/* Success or failure feedback */}
                {result?.ok && (
                    <div
                        data-testid="save-dialog-result-ok"
                        className="mt-5 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200"
                    >
                        <div className="flex items-start gap-2">
                            <Check size={14} className="mt-0.5 flex-shrink-0 text-emerald-300" />
                            <div className="min-w-0">
                                <p className="font-semibold">Saved.</p>
                                <p className="mt-0.5 text-emerald-200/80">
                                    {result.email_sent
                                        ? "Check your inbox — the resume link lands in ~15s."
                                        : "Your spot is saved in our system. The email gateway is warming up — if you don't see it, just bookmark this tab."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {result && !result.ok && (
                    <div
                        data-testid="save-dialog-result-err"
                        className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200"
                    >
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-300" />
                            <p>{result.email_error || "Save failed. Please try again."}</p>
                        </div>
                    </div>
                )}

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">or</span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Right-to-pricing + continue watching */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Link
                        to={`/pricing?from=${encodeURIComponent(demoOrigin || demoType)}`}
                        data-testid="save-dialog-pricing"
                        className="group inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-5 py-3 text-sm font-semibold text-cyan-200 transition-all hover:bg-cyan-500 hover:text-ink-900"
                    >
                        <Rocket size={14} />
                        Skip to pricing
                    </Link>
                    <button
                        data-testid="save-dialog-continue"
                        onClick={onContinue}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-ink-700/40 px-5 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-cyan-500/30 hover:text-cyan-300"
                    >
                        Continue watching
                    </button>
                </div>

                <p className="mt-5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                    <Mail size={10} /> Email sent from CreatorBoostAI · verified sender
                </p>
            </div>
        </div>
    );
};

export default SavePauseDialog;
