import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
    CheckCircle2, Circle, MessageSquare, Upload, Send, Loader2,
    Sparkles, FileText, ShieldCheck,
} from "lucide-react";
import {
    clientPortalAccess, clientPortalMessage, clientPortalUpload, avatarChat,
} from "@/lib/api";

const STATUS_LABELS = {
    onboarding: "Onboarding",
    in_progress: "In progress",
    review: "Review",
    completed: "Completed",
    inactive: "Inactive",
};
const STATUS_TONE = {
    onboarding: "border-cyan-400/40 bg-cyan-500/10 text-cyan-300",
    in_progress: "border-amber-400/40 bg-amber-500/10 text-amber-300",
    review: "border-violet-400/40 bg-violet-500/10 text-violet-300",
    completed: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    inactive: "border-rose-400/40 bg-rose-500/10 text-rose-300",
};

export default function ClientPortalPage() {
    const { client_id } = useParams();
    const [search] = useSearchParams();
    const token = search.get("token");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [tab, setTab] = useState("overview"); // overview | messages | uploads | ai

    const refresh = async () => {
        if (!client_id || !token) {
            setErr("Missing access token. Use the link from your invitation email.");
            setLoading(false);
            return;
        }
        try {
            const r = await clientPortalAccess({ client_id, client_token: token });
            setData(r);
        } catch (e) {
            setErr(e?.response?.data?.detail || "Could not access this portal");
        } finally { setLoading(false); }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line
    }, [client_id, token]);

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-ink-900 text-slate-300">
            <Loader2 className="animate-spin text-cyan-300" />
        </div>
    );
    if (err || !data) return (
        <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6 text-center">
            <div data-testid="client-portal-error">
                <ShieldCheck size={32} className="mx-auto text-rose-400" />
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">Access denied</p>
                <p className="mt-2 max-w-md text-sm text-slate-300">{err || "Unable to load portal"}</p>
            </div>
        </div>
    );

    const { client, tasks, messages, uploads } = data;
    const tasksDone = tasks.filter((t) => t.status === "done").length;
    const progress = tasks.length ? Math.round((100 * tasksDone) / tasks.length) : 0;

    return (
        <div className="min-h-screen bg-ink-900 text-slate-100" data-testid="client-portal-page">
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 lg:py-14">
                {/* Welcome header */}
                <div className="rounded-md border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-emerald-500/5 p-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Client workspace</p>
                            <h1 className="font-heading mt-2 text-2xl font-semibold text-white sm:text-3xl" data-testid="client-portal-welcome">
                                Welcome — your project is now active
                            </h1>
                            <p className="mt-2 text-sm text-slate-300">
                                {client.business_name} · {client.contact_name}
                            </p>
                        </div>
                        <span
                            data-testid="client-portal-status"
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${STATUS_TONE[client.status] || STATUS_TONE.onboarding}`}
                        >
                            {STATUS_LABELS[client.status] || client.status}
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-5">
                        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                            <span>Delivery progress</span>
                            <span data-testid="client-portal-progress">{tasksDone}/{tasks.length} · {progress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700/50">
                            <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>

                {/* Tab nav */}
                <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10" data-testid="client-portal-tabs">
                    {[
                        { k: "overview", label: "Deliverables", Icon: CheckCircle2 },
                        { k: "messages", label: `Messages (${messages.length})`, Icon: MessageSquare },
                        { k: "uploads",  label: `Uploads (${uploads.length})`,   Icon: Upload },
                        { k: "ai",       label: "AI assistant", Icon: Sparkles },
                    ].map((t) => (
                        <button
                            key={t.k}
                            onClick={() => setTab(t.k)}
                            data-testid={`client-tab-${t.k}`}
                            className={`flex items-center gap-1.5 rounded-t-md px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                                tab === t.k
                                    ? "border-b-2 border-cyan-400 text-cyan-200"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            <t.Icon size={12} /> {t.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {tab === "overview" && <DeliverablesPanel tasks={tasks} />}
                    {tab === "messages" && <MessagesPanel auth={{ client_id, client_token: token }} messages={messages} onPosted={refresh} />}
                    {tab === "uploads" && <UploadsPanel auth={{ client_id, client_token: token }} uploads={uploads} onUploaded={refresh} />}
                    {tab === "ai" && <DeliveryAIPanel client={client} />}
                </div>

                <p className="mt-12 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">
                    CreatorBoostAI · Exclusive Lead Engine · Locked to you
                </p>
            </div>
        </div>
    );
}

// ---------- Deliverables panel ----------
const DeliverablesPanel = ({ tasks }) => (
    <ul className="space-y-2" data-testid="deliverables-list">
        {tasks.map((t) => (
            <li
                key={t.id}
                data-testid={`task-row-${t.key}`}
                className={`flex items-center gap-3 rounded-md border p-3 ${
                    t.status === "done"
                        ? "border-emerald-400/30 bg-emerald-500/5"
                        : "border-white/10 bg-ink-700/30"
                }`}
            >
                {t.status === "done"
                    ? <CheckCircle2 size={18} className="text-emerald-300" />
                    : <Circle size={18} className="text-slate-500" />
                }
                <div className="flex-1">
                    <p className={`text-sm font-medium ${t.status === "done" ? "text-emerald-200 line-through" : "text-white"}`}>{t.title}</p>
                    {t.completed_at && (
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300/60">Completed {new Date(t.completed_at).toLocaleDateString()}</p>
                    )}
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Step {t.order}</span>
            </li>
        ))}
    </ul>
);

// ---------- Messages panel ----------
const MessagesPanel = ({ auth, messages, onPosted }) => {
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const endRef = useRef(null);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

    const post = async () => {
        if (!body.trim()) return;
        setBusy(true);
        try {
            await clientPortalMessage({ ...auth, body });
            setBody("");
            onPosted && onPosted();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Could not send message");
        } finally { setBusy(false); }
    };

    return (
        <div className="space-y-3" data-testid="messages-panel">
            <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-md border border-white/10 bg-ink-700/20 p-4">
                {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
                {messages.map((m) => (
                    <div
                        key={m.id}
                        data-testid={`message-${m.author}`}
                        className={`max-w-[85%] rounded-md p-3 ${
                            m.author === "client"
                                ? "ml-auto border border-cyan-500/30 bg-cyan-500/10"
                                : m.author === "delivery_ai"
                                ? "border border-emerald-400/30 bg-emerald-500/5"
                                : "border border-white/10 bg-ink-700/40"
                        }`}
                    >
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">{m.author_name}</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-100">{m.body}</p>
                        <p className="mt-1 font-mono text-[9px] text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
            <div className="flex items-end gap-2">
                <textarea
                    data-testid="message-input"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={2}
                    placeholder="Type a message…"
                    className="flex-1 resize-none rounded-md border border-white/10 bg-ink-900 p-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                    onClick={post}
                    disabled={busy || !body.trim()}
                    data-testid="message-send-btn"
                    className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-cyan-400 disabled:opacity-60"
                >
                    <Send size={12} /> {busy ? "Sending…" : "Send"}
                </button>
            </div>
        </div>
    );
};

// ---------- Uploads panel ----------
const UploadsPanel = ({ auth, uploads, onUploaded }) => {
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState("");

    const onPick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB per file"); return; }
        setBusy(true);
        try {
            const b64 = await new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
                fr.onerror = reject;
                fr.readAsDataURL(file);
            });
            await clientPortalUpload({
                ...auth,
                filename: file.name,
                mimetype: file.type || "application/octet-stream",
                content_b64: b64,
                note,
            });
            toast.success(`Uploaded ${file.name}`);
            setNote("");
            onUploaded && onUploaded();
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Upload failed");
        } finally { setBusy(false); e.target.value = ""; }
    };

    return (
        <div className="space-y-4" data-testid="uploads-panel">
            <div className="rounded-md border border-white/10 bg-ink-700/30 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Upload a file</p>
                <p className="mt-1 text-xs text-slate-400">Images, PDFs, docs · 5 MB max</p>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Optional note…"
                    data-testid="upload-note"
                    className="mt-3 w-full resize-none rounded-md border border-white/10 bg-ink-900 p-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-cyan-500 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-cyan-400">
                    <Upload size={12} /> {busy ? "Uploading…" : "Choose file"}
                    <input
                        type="file"
                        className="hidden"
                        onChange={onPick}
                        disabled={busy}
                        data-testid="upload-file-input"
                    />
                </label>
            </div>
            <ul className="space-y-2" data-testid="uploads-list">
                {uploads.length === 0 && <p className="text-sm text-slate-500">No files yet.</p>}
                {uploads.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 rounded-md border border-white/10 bg-ink-700/30 p-3">
                        <FileText size={18} className="text-cyan-300" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white">{u.filename}</p>
                            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{Math.round((u.size_bytes || 0) / 1024)} KB · {u.mimetype}</p>
                            {u.note && <p className="mt-1 text-xs text-slate-300">{u.note}</p>}
                        </div>
                        <span className="font-mono text-[9px] text-slate-500">{new Date(u.created_at).toLocaleDateString()}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ---------- AI Delivery Assistant ----------
const DeliveryAIPanel = ({ client }) => {
    const [history, setHistory] = useState([
        { role: "assistant", content: `Hi ${client.contact_name}. I'm your delivery assistant. Ask me anything — I can draft scripts, plan steps, or escalate to the founder.` },
    ]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const sessionRef = useRef(`client_portal_${client.client_id}`);

    const send = async () => {
        if (!input.trim() || busy) return;
        const text = input.trim();
        const newHist = [...history, { role: "user", content: text }];
        setHistory(newHist);
        setInput("");
        setBusy(true);
        try {
            const r = await avatarChat({
                session_id: sessionRef.current,
                surface: "client_portal",
                history: newHist,
            });
            setHistory([...newHist, { role: "assistant", content: r.reply || "…" }]);
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Assistant failed");
        } finally { setBusy(false); }
    };

    return (
        <div className="space-y-3" data-testid="delivery-ai-panel">
            <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Delivery mode</p>
                <p className="mt-1 text-xs text-slate-300">
                    The assistant is operating in delivery mode — focused on moving your project forward, not selling.
                </p>
            </div>
            <div className="max-h-[480px] space-y-2 overflow-y-auto rounded-md border border-white/10 bg-ink-700/20 p-4">
                {history.map((m, i) => (
                    <div
                        key={i}
                        className={`max-w-[85%] rounded-md p-3 ${
                            m.role === "user"
                                ? "ml-auto border border-cyan-500/30 bg-cyan-500/10"
                                : "border border-emerald-400/30 bg-emerald-500/5"
                        }`}
                    >
                        <p className="whitespace-pre-line text-sm text-slate-100">{m.content}</p>
                    </div>
                ))}
                {busy && <p className="font-mono text-[10px] text-emerald-300">Thinking…</p>}
            </div>
            <div className="flex items-end gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={2}
                    placeholder="Ask the delivery assistant…"
                    data-testid="ai-input"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    className="flex-1 resize-none rounded-md border border-white/10 bg-ink-900 p-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <button
                    onClick={send}
                    disabled={busy || !input.trim()}
                    data-testid="ai-send-btn"
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-900 hover:bg-emerald-300 disabled:opacity-60"
                >
                    <Send size={12} /> Ask
                </button>
            </div>
        </div>
    );
};
