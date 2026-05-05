import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { toast } from "sonner";
import {
    Rocket, FileText, TrendingUp, Banknote, CheckCircle2, Users, Mail, Sparkles,
    Building2, Calculator, Target, BarChart3, MessageSquare, Receipt, Briefcase,
    Loader2, Download, Printer, Save, ArrowLeft, ArrowRight, Bookmark, ShieldCheck,
    Zap, X, Check,
} from "lucide-react";
import { builderListTools, builderGenerate, businessActivationCapture } from "@/lib/api";
import {
    exportMarkdownToPDF, exportMarkdownToDOCX, exportMarkdownTableToCSV,
    printMarkdown, saveToWorkspace, loadWorkspace, markdownToHTML,
} from "@/lib/exporters";

// Tool icons mapped by key
const TOOL_ICONS = {
    business_plan: FileText,
    financial_projections: TrendingUp,
    loan_summary: Banknote,
    startup_checklist: CheckCircle2,
    icp_builder: Target,
    sales_script: MessageSquare,
    email_campaign: Mail,
    pitch_deck_outline: Sparkles,
    offer_pricing: Building2,
    market_research: BarChart3,
    competitor_research: Users,
    social_content: Sparkles,
    proposal: Briefcase,
    invoice: Receipt,
    break_even: Calculator,
    roi_calc: Calculator,
    startup_budget: Calculator,
};

const HINT = {
    business_name: "Acme Mobile Grooming",
    industry: "Pet services",
    location: "Austin, TX",
    state: "Texas",
    target_customer: "Busy dog owners in suburban neighborhoods",
    pricing_idea: "$80 per groom",
    year1_goal: "$120,000 in revenue",
    starting_cash: "5000",
    monthly_fixed_costs: "1500",
    avg_unit_price: "80",
    expected_units_m1: "30",
    loan_amount: "25000",
    use_of_funds: "Van, equipment, working capital",
    owner_name: "Jane Doe",
    owner_experience_years: "5",
    structure: "LLC",
    product_description: "Mobile dog grooming for premium suburban customers",
    price_point: "$80 average ticket",
    geo: "Austin metro area",
    icp_role: "Pet owner · household income $90K+",
    value_prop_one_line: "We come to your driveway · 60-min appointments · zero crate time",
    stage: "pre-revenue",
    ask_amount: "150000",
    delivery_format: "1:1 service",
    competitor_price_band: "$60-$120",
    target_margin_pct: "65",
    competitor_names_csv: "PetSmart Mobile, BarkBus, FurryGo",
    primary_platform: "Instagram",
    voice_style: "warm, expert, owner-led",
    my_business_description: "Mobile dog grooming · 1 van · Austin",
    client_name: "Sample Client",
    scope_summary: "3-month coaching engagement",
    deliverables_csv: "Weekly call, 12 video lessons, private slack",
    fee_amount: "9000",
    timeline_weeks: "12",
    client_address: "100 Main St, Austin TX",
    line_items_csv: "Groom (1)|80, Travel fee (1)|10",
    tax_pct: "8.25",
    due_days: "14",
    fixed_costs_monthly: "1500",
    avg_unit_variable_cost: "20",
    investment_amount: "25000",
    expected_monthly_return: "1500",
    horizon_months: "24",
    expected_runway_months: "6",
};

export default function BusinessBuilderPage() {
    const [search, setSearch] = useSearchParams();
    const [tools, setTools] = useState([]);
    const [activeKey, setActiveKey] = useState(search.get("tool") || null);
    const [inputs, setInputs] = useState({});
    const [busy, setBusy] = useState(false);
    const [output, setOutput] = useState(null);
    const [workspace, setWorkspace] = useState(loadWorkspace());

    useEffect(() => {
        builderListTools().then((d) => setTools(d.tools || [])).catch(() => toast.error("Could not load tools"));
    }, []);
    useEffect(() => {
        // when a tool is picked from URL or sidebar, reset state
        setInputs({});
        setOutput(null);
    }, [activeKey]);

    const activeTool = useMemo(() => tools.find((t) => t.key === activeKey), [tools, activeKey]);

    const generate = async () => {
        if (!activeTool) return;
        setBusy(true);
        setOutput(null);
        try {
            const r = await builderGenerate({ tool: activeKey, inputs });
            setOutput(r);
            toast.success(`${r.tool_label} ready · 1 click to export`);
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Generation failed");
        } finally { setBusy(false); }
    };

    const onPick = (key) => {
        setActiveKey(key);
        setSearch((s) => { s.set("tool", key); return s; });
    };

    const onSave = () => {
        if (!output) return;
        const ws = saveToWorkspace(output.tool, output.tool_label, output.markdown);
        setWorkspace(ws);
        toast.success("Saved to workspace");
    };

    return (
        <Layout>
            <div className="min-h-screen bg-ink-900 text-slate-100" data-testid="business-builder-page">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Rocket size={20} className="text-emerald-300" />
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">CreatorBoostAI · Business Builder</p>
                                <h1 className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">
                                    {activeTool ? activeTool.label : "Pick a tool to start"}
                                </h1>
                            </div>
                        </div>
                        <Link to="/startup" className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 hover:text-cyan-300">
                            ← Back to Startup
                        </Link>
                    </div>

                    {!activeTool ? (
                        <ToolPicker tools={tools} onPick={onPick} workspace={workspace} />
                    ) : (
                        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
                            <ToolSidebar tools={tools} activeKey={activeKey} onPick={onPick} />
                            <div className="space-y-6">
                                {!output && (
                                    <InputForm
                                        key={activeTool.key}
                                        tool={activeTool}
                                        inputs={inputs}
                                        setInputs={setInputs}
                                        busy={busy}
                                        onGenerate={generate}
                                    />
                                )}
                                {busy && (
                                    <div className="flex items-center gap-3 rounded-md border border-emerald-400/30 bg-emerald-500/5 p-5 text-sm text-emerald-200">
                                        <Loader2 className="animate-spin" size={16} /> Drafting your {activeTool.label}…
                                    </div>
                                )}
                                {output && (
                                    <OutputPanel
                                        tool={activeTool}
                                        markdown={output.markdown}
                                        inputs={inputs}
                                        onRegenerate={() => { setOutput(null); }}
                                        onSave={onSave}
                                    />
                                )}
                                <Disclaimer />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

// ---------- Tool picker (initial grid) ----------
const ToolPicker = ({ tools, onPick, workspace }) => (
    <div className="mt-8 space-y-8">
        <p className="text-sm text-slate-400">
            Each tool runs a structured wizard, generates a draft document, and exports to PDF / DOCX / CSV.
            Outputs are decision-support material — review with a qualified professional before relying on them.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="builder-tool-grid">
            {tools.map((t) => {
                const Icon = TOOL_ICONS[t.key] || Sparkles;
                return (
                    <button
                        key={t.key}
                        data-testid={`builder-tool-${t.key}`}
                        onClick={() => onPick(t.key)}
                        className="group rounded-md border border-white/10 bg-ink-700/30 p-5 text-left transition-all hover:border-emerald-400/40 hover:bg-emerald-500/5"
                    >
                        <Icon size={18} className="text-emerald-300 group-hover:scale-110 transition-transform" />
                        <p className="mt-3 font-heading text-sm font-semibold text-white">{t.label}</p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                            {t.fields.length} input{t.fields.length === 1 ? "" : "s"}
                        </p>
                    </button>
                );
            })}
        </div>
        {workspace.length > 0 && (
            <section data-testid="builder-workspace">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Recent saves</p>
                <ul className="mt-3 space-y-2">
                    {workspace.slice(0, 5).map((w) => (
                        <li key={w.id} className="rounded-md border border-white/10 bg-ink-700/30 p-3 text-sm">
                            <p className="font-medium text-white">{w.label}</p>
                            <p className="font-mono text-[9px] text-slate-500">{new Date(w.saved_at).toLocaleString()}</p>
                        </li>
                    ))}
                </ul>
            </section>
        )}
    </div>
);

// ---------- Sidebar (left rail tool nav) ----------
const ToolSidebar = ({ tools, activeKey, onPick }) => (
    <aside className="rounded-md border border-white/10 bg-ink-700/30 p-3" data-testid="builder-sidebar">
        <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Tools</p>
        <nav className="mt-2 flex max-h-[600px] flex-col gap-0.5 overflow-y-auto">
            {tools.map((t) => {
                const Icon = TOOL_ICONS[t.key] || Sparkles;
                return (
                    <button
                        key={t.key}
                        onClick={() => onPick(t.key)}
                        data-testid={`builder-nav-${t.key}`}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                            activeKey === t.key
                                ? "bg-emerald-400/15 text-emerald-200"
                                : "text-slate-300 hover:bg-white/5 hover:text-emerald-200"
                        }`}
                    >
                        <Icon size={12} /> {t.label}
                    </button>
                );
            })}
        </nav>
    </aside>
);

// ---------- Input form (structured wizard) ----------
const InputForm = ({ tool, inputs, setInputs, busy, onGenerate }) => (
    <div className="rounded-md border border-white/10 bg-ink-700/30 p-5" data-testid="builder-input-form">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Inputs</p>
        <h3 className="font-heading mt-1 text-lg font-semibold text-white">Tell the avatar about your business.</h3>
        <p className="mt-1 text-xs text-slate-400">Fill what you know. Leave blank to let the AI fill in reasonable defaults.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tool.fields.map((f) => (
                <label key={f} className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{f.replace(/_/g, " ")}</span>
                    <input
                        type={/cost|price|amount|cash|months|years|pct|tax|days|units/.test(f) ? "text" : "text"}
                        data-testid={`builder-input-${f}`}
                        value={inputs[f] || ""}
                        onChange={(e) => setInputs((s) => ({ ...s, [f]: e.target.value }))}
                        placeholder={HINT[f] || "Enter…"}
                        className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                    />
                </label>
            ))}
        </div>

        <button
            onClick={onGenerate}
            disabled={busy}
            data-testid="builder-generate-btn"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-emerald-300 disabled:opacity-60"
        >
            {busy ? <><Loader2 className="animate-spin" size={14} /> Drafting…</> : <>Generate {tool.label} <ArrowRight size={14} /></>}
        </button>
    </div>
);

// ---------- Output panel (rendered markdown + export) ----------
const OutputPanel = ({ tool, markdown, onRegenerate, onSave, inputs }) => {
    const html = useMemo(() => markdownToHTML(markdown), [markdown]);
    const filename = `cb_${tool.key}_${Date.now()}`;
    const [showActivate, setShowActivate] = useState(false);

    return (
        <div className="space-y-4" data-testid="builder-output-panel">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={onRegenerate}
                    data-testid="builder-back-to-inputs"
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-700/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:text-cyan-300"
                >
                    <ArrowLeft size={11} /> Edit inputs
                </button>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">{tool.label} · ready</span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                    <ExportBtn label="PDF"   testid="export-pdf"  Icon={Download} onClick={() => exportMarkdownToPDF(markdown, `${filename}.pdf`)} />
                    <ExportBtn label="DOCX"  testid="export-docx" Icon={Download} onClick={() => exportMarkdownToDOCX(markdown, `${filename}.docx`)} />
                    <ExportBtn label="CSV"   testid="export-csv"  Icon={Download} onClick={() => exportMarkdownTableToCSV(markdown, `${filename}.csv`)} />
                    <ExportBtn label="Print" testid="export-print" Icon={Printer}  onClick={() => printMarkdown(markdown, tool.label)} />
                    <ExportBtn label="Save"  testid="export-save"  Icon={Bookmark} onClick={onSave} />
                </div>
            </div>

            {/* Iter 57 · Activation CTA — primary top-of-funnel */}
            <div className="rounded-md border border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 p-5" data-testid="activation-cta-block">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[260px]">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                            <Zap className="inline" size={11} /> One-click activation
                        </p>
                        <p className="mt-1 text-sm text-slate-200">
                            Send your <strong>{tool.label}</strong> + every output you've generated to your inbox as
                            a branded PDF, and switch on your AI execution system in one click.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowActivate(true)}
                        data-testid="activate-business-btn"
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:bg-emerald-300"
                    >
                        Activate My Business System <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            <article
                data-testid="builder-output-rendered"
                className="prose prose-invert max-w-none rounded-md border border-white/10 bg-ink-700/20 p-6 sm:p-8"
                style={{ "--tw-prose-headings": "#fff", "--tw-prose-body": "#cbd5e1" }}
                dangerouslySetInnerHTML={{ __html: html }}
            />

            {showActivate && (
                <ActivationModal
                    tool={tool}
                    markdown={markdown}
                    inputs={inputs || {}}
                    onClose={() => setShowActivate(false)}
                />
            )}
        </div>
    );
};

// ---------- Activation Modal (Iter 57 · primary top-of-funnel) ----------
const ActivationModal = ({ tool, markdown, inputs, onClose }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [businessName, setBusinessName] = useState(inputs.business_name || inputs.client_name || "");
    const [businessType, setBusinessType] = useState(inputs.industry || inputs.industry_tag || "");
    const [wantsHelp, setWantsHelp] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null); // success result

    const submit = async () => {
        if (!name.trim() || !email.trim()) {
            toast.error("Name and email are required");
            return;
        }
        setBusy(true);
        // Compile blocks: current output + last 5 saved workspace items
        const ws = loadWorkspace();
        const blocks = [
            { tool: tool.key, tool_label: tool.label, markdown },
            ...ws.slice(0, 5)
                .filter((w) => w.tool !== tool.key)
                .map((w) => ({ tool: w.tool, tool_label: w.label, markdown: w.markdown })),
        ];
        try {
            const r = await businessActivationCapture({
                name, email,
                business_name: businessName || null,
                business_type: businessType || null,
                blocks,
                wants_outbound_help: wantsHelp,
                consent_marketing: true,
                source: "startup_builder",
            });
            setDone(r);
            toast.success(r.email_delivered ? "Package sent to your inbox" : "Activation captured · email queued");
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Activation failed — try again");
        } finally { setBusy(false); }
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/85 p-4 backdrop-blur-sm"
            data-testid="activation-modal"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-md border border-emerald-400/40 bg-ink-800 p-6 shadow-[0_0_40px_rgba(16,185,129,0.25)]"
                onClick={(e) => e.stopPropagation()}
            >
                {!done ? (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                                    <Zap className="inline" size={11} /> Send my plan + start my AI system
                                </p>
                                <h3 className="font-heading mt-2 text-xl font-semibold text-white">
                                    Activate your business system
                                </h3>
                                <p className="mt-2 text-xs text-slate-400">
                                    We'll compile every output you've generated into a branded PDF, send it to your
                                    inbox, and lock your activation lead exclusively to your account.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                data-testid="activation-close"
                                className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-rose-300"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            <Input testid="activate-name"     label="Your name"        value={name}         onChange={setName}         placeholder="Jane Doe" />
                            <Input testid="activate-email"    label="Your email"       value={email}        onChange={setEmail}        placeholder="you@example.com" type="email" />
                            <Input testid="activate-business" label="Business name (optional)" value={businessName} onChange={setBusinessName} placeholder="Acme Mobile Grooming" />
                            <Input testid="activate-type"     label="Business type / industry (optional)" value={businessType} onChange={setBusinessType} placeholder="Pet services" />

                            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-emerald-400/30 bg-emerald-500/5 p-3">
                                <input
                                    type="checkbox"
                                    checked={wantsHelp}
                                    onChange={(e) => setWantsHelp(e.target.checked)}
                                    data-testid="activate-wants-help"
                                    className="mt-0.5 h-4 w-4 accent-emerald-400"
                                />
                                <span className="text-xs leading-relaxed text-slate-200">
                                    <strong className="text-emerald-300">I want CreatorBoostAI to help me get customers</strong>{" "}
                                    for this business. Flag my account for done-with-you outbound + lead generation later.
                                </span>
                            </label>
                        </div>

                        <button
                            onClick={submit}
                            disabled={busy || !name.trim() || !email.trim()}
                            data-testid="activate-submit"
                            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-emerald-300 disabled:opacity-60"
                        >
                            {busy ? <><Loader2 className="animate-spin" size={14} /> Compiling + sending…</> : <>Activate My Business System <ArrowRight size={14} /></>}
                        </button>

                        <p className="mt-3 text-center text-[10px] text-slate-500">
                            By activating, you agree to receive 3 short execution emails. Reply STOP any time.
                        </p>
                    </>
                ) : (
                    <div data-testid="activation-success">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 size={20} className="text-emerald-300" />
                            <p className="font-heading text-lg font-semibold text-white">Activation complete</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                            {done.email_delivered
                                ? "Your business package is on its way to your inbox. Check spam if it doesn't arrive in 2 minutes."
                                : "Captured. Email delivery is queued for when our sender warms back up."}
                        </p>
                        <div className="mt-4 space-y-1 rounded-md border border-emerald-400/30 bg-emerald-500/5 p-3 font-mono text-[10px] text-emerald-200">
                            <p>lead_id · {done.lead_id}</p>
                            <p>capture_id · {done.capture_id}</p>
                            <p>pdf · {Math.round((done.pdf_size_bytes || 0) / 1024)} KB</p>
                            <p>nurture · {done.nurture_scheduled ? "scheduled (T+24h, T+72h)" : "queued"}</p>
                        </div>
                        <a
                            href={done.continue_url}
                            data-testid="activation-continue-link"
                            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500 hover:text-ink-900"
                        >
                            Continue building <ArrowRight size={13} />
                        </a>
                        <button
                            onClick={onClose}
                            className="mt-2 w-full rounded-md border border-white/10 bg-ink-700/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 hover:text-slate-200"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Input = ({ label, value, onChange, placeholder, type = "text", testid }) => (
    <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <input
            data-testid={testid}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
        />
    </label>
);

const ExportBtn = ({ label, Icon, onClick, testid }) => (
    <button
        onClick={onClick}
        data-testid={testid}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-400 hover:text-ink-900"
    >
        <Icon size={11} /> {label}
    </button>
);

const Disclaimer = () => (
    <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-100/80" data-testid="builder-disclaimer">
        <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-amber-300" />
        <p>
            <strong>Draft document — not licensed advice.</strong> Always review with a qualified attorney, CPA, or
            financial advisor before submitting to lenders, investors, or government entities.
        </p>
    </div>
);
