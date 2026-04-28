/**
 * TeamAccessPage.jsx
 * ------------------
 * Unified internal-access entry point (replaces scattering founder/exec/employee
 * login on the homepage).  Three-role tabs · email + OTP · trusted-device
 * recognition (skip OTP on known devices) · graceful keyboard/mobile experience.
 *
 * Existing deep-links (/founder-access, /executive-access, /employee-access)
 * remain functional — they're now treated as "advanced" entry points for users
 * with a master key or invite token.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Crown, ShieldCheck, Users, Mail, Smartphone, Lock, ArrowRight, KeyRound,
    Loader2, Fingerprint, ShieldQuestion, CheckCircle2, Send,
} from "lucide-react";
import {
    opsOtpRequest, opsOtpVerify, opsFounderAccess, opsExecutiveAccess,
    opsEmployeeAcceptInvite, opsAccessLinkRequest, opsAccessLinkConsume,
} from "@/lib/api";

const STORAGE_KEY = "cb_ops_session";
const DEVICE_KEY = "cb_ops_device_id";

const ensureDeviceId = () => {
    try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = (crypto?.randomUUID && crypto.randomUUID())
                || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(DEVICE_KEY, id);
        }
        return id;
    } catch { return null; }
};

const detectDeviceLabel = () => {
    if (typeof navigator === "undefined") return "this device";
    const ua = navigator.userAgent || "";
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Android/i.test(ua)) return "Android";
    if (/Macintosh/i.test(ua)) return "Mac";
    if (/Windows/i.test(ua)) return "Windows";
    return "browser";
};

const ROLES = [
    { id: "founder",   label: "Founder",   Icon: Crown,       sub: "Full system access" },
    { id: "executive", label: "Executive", Icon: ShieldCheck, sub: "President · elevated" },
    { id: "employee",  label: "Employee",  Icon: Users,       sub: "Assigned scope" },
];

export default function TeamAccessPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [role, setRole] = useState(() => params.get("role") || "founder");
    const [email, setEmail] = useState(() => params.get("email") || "");
    const [channel, setChannel] = useState("email"); // email | sms
    const [phone, setPhone] = useState("");
    const [step, setStep] = useState("email"); // email | otp
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [devCode, setDevCode] = useState(null);
    const [deliveryInfo, setDeliveryInfo] = useState(null); // { delivery_ok, channel, destination_masked, message }
    const [otpError, setOtpError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const [codeExpiresIn, setCodeExpiresIn] = useState(0);
    const [advanced, setAdvanced] = useState(false);
    const [advancedValue, setAdvancedValue] = useState("");
    const [resendOpen, setResendOpen] = useState(false);
    const [resendEmail, setResendEmail] = useState("");
    const [resendSent, setResendSent] = useState(false);
    const [resendBusy, setResendBusy] = useState(false);
    const deviceId = useMemo(ensureDeviceId, []);
    const deviceLabel = useMemo(detectDeviceLabel, []);

    // Auto-accept invite token from email link
    useEffect(() => {
        const t = params.get("invite") || params.get("token");
        if (t && role === "employee") {
            setBusy(true);
            opsEmployeeAcceptInvite(t)
                .then((data) => {
                    persistSession({ email: data.email, token: data.token });
                    toast.success("Welcome");
                    navigate(data.redirect || "/portal/ops", { replace: true });
                })
                .catch(() => toast.error("Invite expired or already used"))
                .finally(() => setBusy(false));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-consume "Resend access link" magic token from email link
    useEffect(() => {
        const m = params.get("magic");
        if (!m) return;
        setBusy(true);
        opsAccessLinkConsume(m)
            .then((data) => {
                persistSession({ email: data.email, token: data.token });
                // Match the tab to the resolved role so the page looks consistent
                if (data.role) setRole(data.role);
                toast.success(`Signed in · ${data.role}`);
                navigate(data.redirect || "/portal/ops", { replace: true });
            })
            .catch((err) => {
                const d = err?.response?.data?.detail;
                toast.error(typeof d === "string" ? d : "This access link is invalid or expired");
            })
            .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const persistSession = (s) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* noop */ }
    };

    // Countdown tickers — resend-cooldown + code-expiry
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [resendCooldown]);

    useEffect(() => {
        if (codeExpiresIn <= 0) return;
        const t = setInterval(() => setCodeExpiresIn((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [codeExpiresIn]);

    const requestOtp = async (isResend = false) => {
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            toast.error("Enter a valid email address");
            return;
        }
        if (channel === "sms" && !phone.trim()) {
            toast.error("Enter the phone number on file");
            return;
        }
        setBusy(true);
        setOtpError("");
        try {
            const res = await opsOtpRequest({
                role, email, channel,
                phone: channel === "sms" ? phone.trim() : undefined,
                device_id: deviceId,
            });
            if (res.trusted_device) {
                persistSession({ email, token: res.token });
                toast.success("Trusted device — signed in");
                navigate(res.redirect || "/portal/ops", { replace: true });
                return;
            }
            setDeliveryInfo(res);
            setDevCode(res.dev_code || null);
            if (res.delivery_ok) {
                setStep("otp");
                setResendCooldown(res.resend_cooldown_sec || 30);
                setCodeExpiresIn(res.expires_in_sec || 600);
                toast.success(res.message || "Code sent");
            } else {
                // Truthful failure — tell the user the real reason
                const msg = res.message || "We could not deliver your code.";
                toast.error(msg);
                if (res.retry_after_sec) {
                    setResendCooldown(res.retry_after_sec);
                    setStep("otp"); // still show the OTP screen so user can enter prior code
                }
            }
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Could not request code");
        } finally { setBusy(false); }
    };

    const verifyOtp = async () => {
        if (!/^\d{6}$/.test(code.trim())) { setOtpError("Enter the 6-digit code"); return; }
        setBusy(true);
        setOtpError("");
        try {
            const res = await opsOtpVerify({
                role, email, code: code.trim(),
                device_id: deviceId, device_label: deviceLabel, remember_device: true,
            });
            persistSession({ email: res.email, token: res.token });
            toast.success(`Signed in · ${res.role}`);
            navigate(res.redirect || "/portal/ops", { replace: true });
        } catch (err) {
            const d = err?.response?.data?.detail;
            const msg = typeof d === "string" ? d : "Could not verify code";
            setOtpError(msg);
            toast.error(msg);
        } finally { setBusy(false); }
    };

    // Advanced entry — master key (founder/exec) or invite token (employee)
    const submitAdvanced = async () => {
        if (!advancedValue) { toast.error("Paste your master key or invite token"); return; }
        setBusy(true);
        try {
            const data = role === "founder" ? await opsFounderAccess(advancedValue)
                : role === "executive" ? await opsExecutiveAccess(advancedValue)
                : await opsEmployeeAcceptInvite(advancedValue);
            persistSession({ email: data.email, token: data.token });
            toast.success(`Signed in · ${data.role}`);
            navigate(data.redirect || "/portal/ops", { replace: true });
        } catch (err) {
            const d = err?.response?.data?.detail;
            toast.error(typeof d === "string" ? d : "Invalid value");
        } finally { setBusy(false); }
    };

    // Forgot access — request a fresh magic link by email
    const requestAccessLink = async () => {
        const target = (resendEmail || email).trim();
        if (!target || !/^\S+@\S+\.\S+$/.test(target)) {
            toast.error("Enter a valid email address");
            return;
        }
        setResendBusy(true);
        try {
            const r = await opsAccessLinkRequest({
                email: target,
                origin_url: window.location.origin,
            });
            toast.success(r?.message || "If that email is registered, a fresh access link is on the way.");
            setResendSent(true);
        } catch {
            // Keep generic for security
            toast.success("If that email is registered, a fresh access link is on the way.");
            setResendSent(true);
        } finally { setResendBusy(false); }
    };

    const inputCls = "w-full rounded-md border border-white/10 bg-ink-900 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none";

    return (
        <Layout>
            <section className="relative min-h-[80vh] overflow-hidden bg-ink-900" data-testid="team-access-page">
                <div className="absolute inset-0 ambient-grid opacity-40" />
                <div className="relative mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-16 lg:py-24">
                    {/* Header */}
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                            <Lock size={12} className="text-cyan-400" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">CreatorBoostAI · Team Access</span>
                        </div>
                        <h1 className="font-heading mt-5 text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                            Sign in to your <span className="text-cyan-300">operating dashboard.</span>
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                            Founder, executive, and employee access — verified by email or SMS one-time code.
                            We remember trusted devices so you skip the code next time.
                        </p>
                    </div>

                    {/* Role tabs */}
                    <div className="mt-7 grid grid-cols-3 gap-2" data-testid="team-role-tabs">
                        {ROLES.map((r) => (
                            <button key={r.id} onClick={() => { setRole(r.id); setStep("email"); }}
                                data-testid={`team-role-${r.id}`}
                                className={`flex flex-col items-start rounded-md border p-3 text-left transition-all sm:p-4 ${role === r.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-ink-700/40 hover:border-cyan-500/30"}`}>
                                <r.Icon size={16} className={role === r.id ? "text-cyan-300" : "text-slate-400"} />
                                <span className={`mt-2 text-sm font-semibold sm:text-base ${role === r.id ? "text-white" : "text-slate-200"}`}>{r.label}</span>
                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{r.sub}</span>
                            </button>
                        ))}
                    </div>

                    {/* Email step */}
                    {step === "email" && (
                        <div className="mt-7 space-y-4" data-testid="team-step-email">
                            {/* Channel picker — email or SMS */}
                            <div className="grid grid-cols-2 gap-2" data-testid="team-channel-picker">
                                {[
                                    { id: "email", label: "Email", Icon: Mail, sub: "One-time code" },
                                    { id: "sms",   label: "Text message", Icon: Smartphone, sub: "6-digit SMS" },
                                ].map((c) => (
                                    <button key={c.id} onClick={() => setChannel(c.id)}
                                        data-testid={`team-channel-${c.id}`}
                                        type="button"
                                        className={`flex items-center gap-3 rounded-md border p-3 text-left transition-all ${channel === c.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-ink-700/40 hover:border-cyan-500/30"}`}>
                                        <c.Icon size={14} className={channel === c.id ? "text-cyan-300" : "text-slate-400"} />
                                        <div>
                                            <div className={`text-sm font-semibold ${channel === c.id ? "text-white" : "text-slate-200"}`}>{c.label}</div>
                                            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{c.sub}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <label className="block">
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                    Email on file
                                </span>
                                <div className="mt-1 flex items-center gap-2">
                                    <Mail size={14} className="ml-3 text-slate-500" style={{ marginRight: -28, position: "relative", zIndex: 1 }} />
                                    <input value={email} onChange={(e) => setEmail(e.target.value)}
                                        type="email" inputMode="email" autoComplete="email"
                                        placeholder="you@yourcompany.com" data-testid="team-email-input"
                                        className={`${inputCls} pl-10`}
                                        onKeyDown={(e) => e.key === "Enter" && requestOtp()} />
                                </div>
                            </label>

                            {/* Phone field — only visible when SMS channel is picked */}
                            {channel === "sms" && (
                                <label className="block" data-testid="team-phone-field">
                                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                        Phone on file
                                    </span>
                                    <div className="mt-1 flex items-center gap-2">
                                        <Smartphone size={14} className="ml-3 text-slate-500" style={{ marginRight: -28, position: "relative", zIndex: 1 }} />
                                        <input value={phone} onChange={(e) => setPhone(e.target.value)}
                                            type="tel" inputMode="tel" autoComplete="tel"
                                            placeholder="+1 616 214 5861" data-testid="team-phone-input"
                                            className={`${inputCls} pl-10`}
                                            onKeyDown={(e) => e.key === "Enter" && requestOtp()} />
                                    </div>
                                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                                        Must match the number on file for this account
                                    </p>
                                </label>
                            )}

                            <button onClick={() => requestOtp(false)} disabled={busy} data-testid="team-request-otp"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-base font-semibold text-ink-900 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 disabled:opacity-60 sm:w-auto">
                                {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                                {channel === "sms" ? "Send text code" : "Send verification code"}
                            </button>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                {channel === "sms"
                                    ? "We'll text a 6-digit code to the number on file."
                                    : "We'll email a 6-digit code. SMS too if you switch channel."}
                            </p>
                        </div>
                    )}

                    {/* Forgot access — self-serve resend */}
                    {step === "email" && (
                        <div
                            className="mt-6 rounded-md border border-white/10 bg-ink-700/30 p-4 sm:p-5"
                            data-testid="team-resend-access-link"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setResendOpen((p) => !p);
                                    if (!resendOpen && email && !resendEmail) setResendEmail(email);
                                    setResendSent(false);
                                }}
                                className="flex w-full items-center justify-between text-left"
                                data-testid="team-resend-toggle"
                            >
                                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                                    <Send size={11} className="text-cyan-400" />
                                    Forgot access? Resend my access link
                                </span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                    {resendOpen ? "Hide" : "Show"}
                                </span>
                            </button>
                            {resendOpen && (
                                <div className="mt-3 space-y-3">
                                    <p className="text-sm text-slate-300">
                                        Enter the email on file — we'll send a fresh one-time sign-in link
                                        that routes you straight into your dashboard. Links expire in 15 minutes
                                        and can only be used once.
                                    </p>
                                    {resendSent ? (
                                        <div
                                            className="flex items-start gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-cyan-100"
                                            data-testid="team-resend-sent"
                                        >
                                            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-cyan-300" />
                                            <span>
                                                If that email is registered, a fresh access link is on the way.
                                                Check your inbox (and spam) in the next minute.
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <input
                                                type="email"
                                                value={resendEmail}
                                                onChange={(e) => setResendEmail(e.target.value)}
                                                placeholder="you@yourcompany.com"
                                                data-testid="team-resend-email"
                                                className={`${inputCls} flex-1`}
                                                onKeyDown={(e) => e.key === "Enter" && requestAccessLink()}
                                            />
                                            <button
                                                type="button"
                                                onClick={requestAccessLink}
                                                disabled={resendBusy}
                                                data-testid="team-resend-submit"
                                                className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200 transition-all hover:bg-cyan-500 hover:text-ink-900 disabled:opacity-60"
                                            >
                                                {resendBusy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                                Resend link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* OTP step */}
                    {step === "otp" && (
                        <div className="mt-7 space-y-4" data-testid="team-step-otp">
                            <div className="flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3">
                                <CheckCircle2 size={14} className="text-cyan-300" />
                                <p className="text-sm text-cyan-100" data-testid="team-code-sent-message">
                                    Code sent via <span className="font-semibold uppercase">{deliveryInfo?.channel || channel}</span>
                                    {deliveryInfo?.destination_masked && (
                                        <> to <span className="font-semibold">{deliveryInfo.destination_masked}</span></>
                                    )}
                                </p>
                            </div>
                            {codeExpiresIn > 0 && (
                                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500" data-testid="team-code-expires">
                                    Code expires in {Math.floor(codeExpiresIn / 60)}:{String(codeExpiresIn % 60).padStart(2, "0")}
                                </p>
                            )}
                            <label className="block">
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">6-digit code</span>
                                <input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                                    type="text" inputMode="numeric" autoComplete="one-time-code"
                                    placeholder="000000" data-testid="team-otp-input"
                                    pattern="[0-9]{6}" maxLength={6}
                                    className={`${inputCls} text-center font-mono text-2xl tracking-[0.5em]`}
                                    onKeyDown={(e) => e.key === "Enter" && verifyOtp()} />
                            </label>
                            {otpError && (
                                <p className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-200" data-testid="team-otp-error">
                                    {otpError}
                                </p>
                            )}
                            {devCode && (
                                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300" data-testid="team-dev-code">
                                    Dev mode · code: <span className="text-amber-200">{devCode}</span>
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <button onClick={verifyOtp} disabled={busy} data-testid="team-verify-otp"
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-base font-semibold text-ink-900 hover:bg-cyan-400 disabled:opacity-60">
                                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                                    Verify & sign in
                                </button>
                                <button onClick={() => requestOtp(true)}
                                    disabled={busy || resendCooldown > 0}
                                    data-testid="team-resend-code"
                                    className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200 transition-all hover:bg-cyan-500 hover:text-ink-900 disabled:opacity-60 disabled:hover:bg-cyan-500/5 disabled:hover:text-cyan-200">
                                    <Send size={12} />
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                                </button>
                                <button onClick={() => { setStep("email"); setCode(""); setOtpError(""); setDeliveryInfo(null); }}
                                    data-testid="team-back-to-email"
                                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300">
                                    Use different email
                                </button>
                            </div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                <Smartphone size={11} className="mr-1 inline text-slate-500" />
                                Trusted on this device ({deviceLabel}) — you'll skip this step next time.
                            </p>
                        </div>
                    )}

                    {/* Advanced master-key entry */}
                    <div className="mt-10 rounded-md border border-white/5 bg-ink-700/40 p-4" data-testid="team-advanced">
                        <button onClick={() => setAdvanced((p) => !p)}
                            className="flex w-full items-center justify-between text-left" data-testid="team-advanced-toggle">
                            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                <KeyRound size={11} /> Advanced — use {role === "employee" ? "invite token" : "master key"}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{advanced ? "Hide" : "Show"}</span>
                        </button>
                        {advanced && (
                            <div className="mt-3 space-y-2">
                                <input value={advancedValue} onChange={(e) => setAdvancedValue(e.target.value)} type="text"
                                    placeholder={role === "employee" ? "invite-token-from-email" : "master access key"}
                                    data-testid="team-advanced-input"
                                    className={`${inputCls} font-mono text-sm`} />
                                <button onClick={submitAdvanced} disabled={busy} data-testid="team-advanced-submit"
                                    className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300 hover:bg-cyan-500 hover:text-ink-900">
                                    Sign in with {role === "employee" ? "token" : "key"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Biometric placeholder */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-white/5 bg-ink-700/40 p-3" data-testid="team-biometric-note">
                        <Fingerprint size={14} className="text-slate-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                            Face ID / Touch ID — coming soon · OTP works on every device today
                        </span>
                    </div>

                    {/* Help */}
                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/5 pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        <ShieldQuestion size={11} />
                        Trouble signing in?
                        <Link to="/contact" className="text-cyan-300 hover:text-cyan-200">Contact support</Link>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
