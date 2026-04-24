import React, { useState } from "react";
import { captureLead } from "@/lib/api";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export const EmailCapture = ({
    source = "home",
    variant = "inline",
    placeholder = "you@example.com",
    ctaLabel = "Get Access",
    testid = "email-capture",
    onSuccess,
}) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!email || !email.includes("@")) {
            toast.error("Please enter a valid email");
            return;
        }
        setLoading(true);
        try {
            await captureLead({ email, source });
            setDone(true);
            toast.success("You're on the list. Check your inbox.");
            setEmail("");
            if (onSuccess) onSuccess();
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div
                data-testid={`${testid}-success`}
                className="flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-300"
            >
                <CheckCircle2 size={16} /> You're on the list.
            </div>
        );
    }

    return (
        <form
            onSubmit={submit}
            data-testid={testid}
            className={`flex w-full gap-2 ${variant === "stacked" ? "flex-col" : "flex-col sm:flex-row"}`}
        >
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                data-testid={`${testid}-input`}
                className="input-glow flex-1 rounded-md border border-white/10 bg-ink-700/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-500 focus:outline-none"
            />
            <button
                type="submit"
                disabled={loading}
                data-testid={`${testid}-submit`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.55)] disabled:opacity-60"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {ctaLabel}
            </button>
        </form>
    );
};
