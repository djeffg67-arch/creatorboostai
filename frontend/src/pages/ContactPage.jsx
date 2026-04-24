import React, { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { captureLead } from "@/lib/api";
import { toast } from "sonner";
import { Send, Loader2, Mail, MapPin, Shield } from "lucide-react";

export default function ContactPage() {
    const [form, setForm] = useState({ name: "", email: "", message: "" });
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handle = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.message) {
            toast.error("Email and message are required");
            return;
        }
        setLoading(true);
        try {
            await captureLead({
                email: form.email,
                source: "contact",
                name: form.name || null,
                message: form.message,
            });
            setSent(true);
            toast.success("Message received. We'll respond within 48 hours.");
            setForm({ name: "", email: "", message: "" });
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Could not send. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <section className="relative py-20 lg:py-28" data-testid="contact-page">
                <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
                    <div className="absolute inset-0 ambient-grid opacity-50" />
                    <div className="glow-orb glow-orb--cyan animate-float-slow" style={{ width: 360, height: 360, top: -140, right: -80 }} />
                    <div className="glow-orb glow-orb--blue" style={{ width: 320, height: 320, bottom: -140, left: -80 }} />
                </div>
                <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 lg:grid-cols-12 lg:px-8">
                    <div className="lg:col-span-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">Contact</p>
                        <h1 className="font-heading mt-4 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
                            Let's talk signal.
                        </h1>
                        <p className="mt-5 text-base leading-relaxed text-slate-300">
                            Questions on training, custom cohorts, enterprise deployments, or partner
                            access? Drop a line — we read every message.
                        </p>

                        <div className="mt-10 space-y-5">
                            {[
                                { icon: Mail, title: "Email", value: "signal@bodyiq-ai.com" },
                                { icon: MapPin, title: "Operations", value: "Remote · Americas + EMEA" },
                                { icon: Shield, title: "Response Time", value: "Under 48 hours" },
                            ].map((r) => (
                                <div key={r.title} className="flex items-start gap-4">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border border-cyan-500/30 bg-cyan-500/5">
                                        <r.icon size={15} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{r.title}</p>
                                        <p className="mt-1 text-sm text-white">{r.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        <form
                            onSubmit={submit}
                            data-testid="contact-form"
                            className="rounded-md border border-white/10 bg-ink-700/40 p-6 backdrop-blur-sm sm:p-8"
                        >
                            {sent && (
                                <div className="mb-5 rounded-sm border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-300" data-testid="contact-success">
                                    Message received. We'll respond within 48 hours.
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={handle("name")}
                                        placeholder="Your name"
                                        data-testid="contact-name"
                                        className="mt-2 w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={handle("email")}
                                        placeholder="you@example.com"
                                        data-testid="contact-email"
                                        className="mt-2 w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Message *</label>
                                    <textarea
                                        required
                                        rows={6}
                                        value={form.message}
                                        onChange={handle("message")}
                                        placeholder="Tell us what you need…"
                                        data-testid="contact-message"
                                        className="mt-2 w-full rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                data-testid="contact-submit"
                                className="mt-7 inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.55)] disabled:opacity-60"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
