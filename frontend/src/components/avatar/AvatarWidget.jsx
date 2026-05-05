/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, X, Sparkles, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { avatarChat, avatarQuickContext, avatarEscalate } from "@/lib/api";

// CreatorBoostAI Avatar Widget — floating chat assistant.
// Uses POST /api/avatar/chat (non-streaming) with simulated typing on the
// client. Honors all 8 action types emitted by the orchestrator.

const STORAGE_KEY = "cb_avatar_session";

export default function AvatarWidget({ surface = "homepage", userEmail = null }) {
    const [open, setOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [chips, setChips] = useState([]);
    const [escalateForm, setEscalateForm] = useState(null);
    const scrollRef = useRef(null);
    const navigate = useNavigate();

    // Restore session on mount
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.sessionId) setSessionId(parsed.sessionId);
                if (parsed.history) setHistory(parsed.history);
            }
        } catch (_e) { /* ignore */ }
    }, []);

    // Persist
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, history }));
        } catch (_e) { /* ignore */ }
    }, [sessionId, history]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, busy]);

    // Fetch quick replies on first open
    useEffect(() => {
        if (open && history.length === 0 && chips.length === 0) {
            avatarQuickContext({ session_id: sessionId, user_email: userEmail })
                .then((r) => {
                    if (!sessionId && r.session_id) setSessionId(r.session_id);
                    setChips(r.quick_replies || []);
                    setHistory([{
                        role: "assistant",
                        content: "Hi — I'm the CreatorBoostAI avatar. I can route you to a live demo, explain how the Exclusive Lead Engine locks every lead to you alone, walk pricing, or connect you to Jeffrey. What's on your mind?",
                    }]);
                })
                .catch(() => { /* silent */ });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleAction = (a) => {
        switch (a.type) {
            case "route_to_demo":
                if (a.route) {
                    setOpen(false);
                    navigate(a.route);
                    toast.success(`Loading ${a.demo} demo…`);
                }
                break;
            case "open_pricing":
                setOpen(false);
                navigate(a.route || "/pricing");
                break;
            case "start_signup":
                setOpen(false);
                navigate(a.plan ? `/pricing?plan=${a.plan}` : "/pricing");
                break;
            case "open_calendly":
                if (a.url) window.open(a.url, "_blank", "noopener");
                break;
            case "schedule_followup":
                toast.success("I'll have Jeffrey reach out");
                setEscalateForm({ reason: "Follow-up requested via avatar", topic: a.topic });
                break;
            case "escalate_to_founder":
                setEscalateForm({ reason: a.reason || "User requested founder contact" });
                break;
            case "capture_lead":
                setEscalateForm({ reason: "Lead capture", fields: a.fields || {} });
                break;
            case "show_quick_replies":
                setChips(a.chips || []);
                break;
            default:
                break;
        }
    };

    const send = async (textOverride) => {
        const text = (textOverride ?? input).trim();
        if (!text || busy) return;
        const newHistory = [...history, { role: "user", content: text }];
        setHistory(newHistory);
        setInput("");
        setChips([]);
        setBusy(true);
        try {
            const res = await avatarChat({
                session_id: sessionId,
                user_email: userEmail,
                history: newHistory,
                surface,
            });
            if (!sessionId && res.session_id) setSessionId(res.session_id);
            setHistory((prev) => [...prev, {
                role: "assistant",
                content: res.reply,
                model: res.model,
                role_tag: res.role,
            }]);
            (res.actions || []).forEach(handleAction);
        } catch (e) {
            setHistory((prev) => [...prev, {
                role: "assistant",
                content: "Sorry — connection blip. Try again or click 'Talk to founder' below.",
            }]);
            setChips(["Talk to founder", "Try again"]);
        } finally {
            setBusy(false);
        }
    };

    const submitEscalation = async (contact) => {
        try {
            await avatarEscalate({
                session_id: sessionId || "anonymous",
                user_email: userEmail,
                reason: escalateForm.reason,
                last_message: history.slice(-1)[0]?.content,
                contact,
            });
            toast.success("Got it — Jeffrey will reach out shortly.");
            setEscalateForm(null);
            setHistory((prev) => [...prev, {
                role: "assistant",
                content: "Done — escalation logged. Jeffrey will reach out within a business day.",
            }]);
        } catch (_e) {
            toast.error("Could not submit. Try again.");
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                data-testid="avatar-widget-open"
                className="fixed bottom-20 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-900 shadow-[0_0_24px_rgba(34,211,238,0.4)] hover:bg-cyan-400"
                aria-label="Open CreatorBoostAI assistant"
            >
                <Sparkles size={14} />
                Talk to CreatorBoostAI
            </button>
        );
    }

    return (
        <div
            className="fixed bottom-20 right-5 z-50 flex h-[580px] max-h-[80vh] w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-cyan-500/30 bg-ink-900 shadow-[0_8px_60px_rgba(0,0,0,0.7)]"
            data-testid="avatar-widget-panel"
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                    </span>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">CreatorBoostAI · Avatar</p>
                </div>
                <button onClick={() => setOpen(false)} data-testid="avatar-widget-close"
                    className="text-slate-400 hover:text-rose-300" aria-label="Close">
                    <X size={16} />
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {history.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                            m.role === "user"
                                ? "bg-cyan-500/15 text-cyan-100 border border-cyan-500/30"
                                : "bg-ink-700/60 text-slate-100 border border-white/5"
                        }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {busy && (
                    <div className="flex justify-start">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-white/5 bg-ink-700/60 px-3 py-2 text-sm text-slate-300">
                            <Loader2 size={12} className="animate-spin text-cyan-300" />
                            thinking…
                        </div>
                    </div>
                )}

                {/* Escalation form */}
                {escalateForm && <EscalationForm form={escalateForm} onClose={() => setEscalateForm(null)} onSubmit={submitEscalation} />}

                {/* Quick reply chips */}
                {!busy && chips.length > 0 && !escalateForm && (
                    <div className="flex flex-wrap gap-2 pt-1" data-testid="avatar-widget-chips">
                        {chips.slice(0, 8).map((c, idx) => (
                            <button key={idx} onClick={() => send(c)}
                                data-testid={`avatar-chip-${idx}`}
                                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20">
                                {c}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                        placeholder="Ask anything…"
                        disabled={busy}
                        data-testid="avatar-widget-input"
                        className="flex-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none disabled:opacity-60"
                    />
                    <button onClick={() => send()} disabled={busy || !input.trim()}
                        data-testid="avatar-widget-send"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500 text-ink-900 hover:bg-cyan-400 disabled:opacity-40">
                        <Send size={14} />
                    </button>
                </div>
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                    Exclusive Lead Engine · No duplicates · Locked to you
                </p>
            </div>
        </div>
    );
}

const EscalationForm = ({ form, onClose, onSubmit }) => {
    const [name, setName] = useState(form.fields?.name || "");
    const [email, setEmail] = useState(form.fields?.email || "");
    const [company, setCompany] = useState(form.fields?.company || "");
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        if (!email) return toast.error("Email required");
        setBusy(true);
        await onSubmit({ name, email, company });
        setBusy(false);
    };
    return (
        <div className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-3" data-testid="avatar-widget-escalate-form">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Quick details</p>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
                data-testid="avatar-escalate-name"
                className="mb-2 w-full rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-100" />
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="avatar-escalate-email"
                className="mb-2 w-full rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-100" />
            <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)}
                data-testid="avatar-escalate-company"
                className="mb-2 w-full rounded-md border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-100" />
            <div className="flex items-center gap-2">
                <button onClick={submit} disabled={busy}
                    data-testid="avatar-escalate-submit"
                    className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                    {busy ? "Sending…" : "Send"}
                </button>
                <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200">Cancel</button>
            </div>
        </div>
    );
};
