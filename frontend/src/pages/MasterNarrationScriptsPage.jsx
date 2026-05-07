import React, { useMemo, useState } from "react";
import { Layout } from "@/components/site/Layout";
import { MASTER_NARRATION } from "@/lib/masterNarration";
import {
    Mic, Copy, ChevronRight, Clock, FileText, Check,
    ShoppingCart, Plane, GraduationCap, Building2, Layers, Briefcase,
} from "lucide-react";

/**
 * /portal/scripts — Master Narration Scripts viewer.
 *
 * Founder-facing read-only browser for every demo's voiceover script.
 * Used to:
 *   • Hand exact text to HeyGen for per-scene avatar recordings
 *   • Audit scene durations
 *   • Verify captions / TTS / avatar all read from the same source
 */

const ICONS = {
    supermarket: ShoppingCart,
    airport: Plane,
    school: GraduationCap,
    realtor: Building2,
    noldus: Layers,
    startup: Briefcase,
};

export default function MasterNarrationScriptsPage() {
    const demoKeys = useMemo(() => Object.keys(MASTER_NARRATION), []);
    const [activeKey, setActiveKey] = useState(demoKeys[0]);
    const active = MASTER_NARRATION[activeKey];
    const [copiedId, setCopiedId] = useState(null);

    const copyText = async (id, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
        } catch {
            /* ignore */
        }
    };

    const totalScenes = demoKeys.reduce(
        (acc, k) => acc + (MASTER_NARRATION[k]?.scenes?.length || 0),
        0,
    );
    const totalDurationSec = demoKeys.reduce(
        (acc, k) => acc + (MASTER_NARRATION[k]?.scenes || []).reduce(
            (a, s) => a + (s.duration_ms || 0), 0,
        ),
        0,
    ) / 1000;

    return (
        <Layout>
            <div
                className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-14"
                data-testid="master-narration-page"
            >
                {/* Hero */}
                <section data-testid="master-narration-hero">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5">
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                            Master Narration Scripts · Single source of truth
                        </span>
                    </div>
                    <h1 className="font-heading mt-6 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                        Every demo. Every scene.{" "}
                        <span className="text-cyan-400">One script source.</span>
                    </h1>
                    <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                        These scripts drive every audio path: legacy TTS today,
                        per-scene HeyGen avatar recordings tomorrow, captions and
                        subtitles always. Edit the source `SCENES` arrays in each
                        demo page and re-run the extractor — captions, voice,
                        avatar, and subtitles all update from this one source.
                    </p>
                </section>

                {/* Top stats */}
                <section
                    className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4"
                    data-testid="master-narration-stats"
                >
                    <Stat icon={FileText} label="Demos" value={demoKeys.length} />
                    <Stat icon={Mic} label="Total scenes" value={totalScenes} />
                    <Stat icon={Clock} label="Total narration" value={`${(totalDurationSec / 60).toFixed(1)} min`} />
                    <Stat icon={Layers} label="Source" value="SCENES → JSON → JS" small />
                </section>

                {/* Demo selector */}
                <section
                    className="mt-9"
                    data-testid="master-narration-selector"
                >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        Step 1 · Choose a demo
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {demoKeys.map((k) => {
                            const Icon = ICONS[k] || FileText;
                            const isActive = k === activeKey;
                            const demo = MASTER_NARRATION[k];
                            const totalSec = demo.scenes.reduce((a, s) => a + (s.duration_ms || 0), 0) / 1000;
                            return (
                                <button
                                    type="button"
                                    key={k}
                                    onClick={() => setActiveKey(k)}
                                    data-testid={`master-narration-tab-${k}`}
                                    className={`group rounded-md border p-3 text-left transition-all hover:translate-y-[-1px] ${
                                        isActive
                                            ? "border-cyan-500/50 bg-cyan-500/10"
                                            : "border-white/10 bg-ink-700/40 hover:border-cyan-500/30"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon size={14} className={isActive ? "text-cyan-300" : "text-slate-300"} />
                                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 truncate">
                                            {demo.title.replace(/Demo$/, "").trim()}
                                        </span>
                                    </div>
                                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                                        {demo.scenes.length} scenes · {(totalSec / 60).toFixed(1)} min
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Active demo scenes */}
                <section
                    className="mt-9"
                    data-testid={`master-narration-active-${activeKey}`}
                >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        Step 2 · Hand each script to HeyGen
                    </p>
                    <h2 className="font-heading mt-3 text-2xl font-semibold text-white sm:text-3xl">
                        {active.title}
                    </h2>

                    <div className="mt-6 space-y-4">
                        {active.scenes.map((scene, idx) => {
                            const id = `${activeKey}-${scene.id}`;
                            const wasCopied = copiedId === id;
                            const filePath = `/avatars/${activeKey}/${scene.id}.mp4`;
                            return (
                                <article
                                    key={scene.id}
                                    className="rounded-md border border-white/10 bg-ink-700/40 p-5"
                                    data-testid={`scene-${activeKey}-${scene.id}`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
                                                Scene {idx + 1} of {active.scenes.length}
                                            </span>
                                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                                {scene.section || scene.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                                                <Clock size={11} />
                                                {scene.duration_seconds || "?"}s target
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => copyText(id, scene.narration)}
                                                data-testid={`scene-copy-${activeKey}-${scene.id}`}
                                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] transition-all ${
                                                    wasCopied
                                                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                                                        : "border-cyan-500/40 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/10"
                                                }`}
                                            >
                                                {wasCopied ? <Check size={11} /> : <Copy size={11} />}
                                                {wasCopied ? "Copied" : "Copy script"}
                                            </button>
                                        </div>
                                    </div>

                                    {scene.title && scene.title !== scene.section && (
                                        <h3 className="font-heading mt-3 text-lg font-semibold text-white">
                                            {scene.title}
                                        </h3>
                                    )}

                                    <p
                                        className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200"
                                        data-testid={`scene-narration-${activeKey}-${scene.id}`}
                                    >
                                        {scene.narration || "(no narration captured — please review the source SCENES array)"}
                                    </p>

                                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
                                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                            HeyGen output path:
                                        </span>
                                        <code className="rounded bg-ink-900 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                                            {filePath}
                                        </code>
                                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                            scene id: <code className="text-slate-300">{scene.id}</code>
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {/* Footer */}
                <section
                    className="mt-12 rounded-md border border-white/10 bg-ink-700/40 p-5"
                    data-testid="master-narration-howto"
                >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
                        Step 3 · Re-deploy after upload
                    </p>
                    <ol className="mt-3 space-y-2 text-sm text-slate-300">
                        <li>1. Record each scene in HeyGen using the exact narration text above.</li>
                        <li>2. Drop the resulting <code>.mp4</code> into <code>/app/frontend/public/avatars/&lt;demoKey&gt;/&lt;sceneId&gt;.mp4</code>.</li>
                        <li>3. Add the file path to <code>DEMO_AVATAR_REGISTRY.scenes[sceneId]</code> in <code>/app/frontend/src/lib/demoAvatarRegistry.js</code>.</li>
                        <li>4. The demo's avatar auto-replaces legacy TTS for that scene with matching lip-sync. <span className="text-cyan-300">No code changes required.</span></li>
                    </ol>
                </section>
            </div>
        </Layout>
    );
}

const Stat = ({ icon: Icon, label, value, small }) => (
    <div className="rounded-md border border-white/10 bg-ink-900 p-4">
        <div className="flex items-center gap-1.5">
            <Icon size={12} className="text-cyan-300" />
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
        </div>
        <p className={`font-heading mt-1 font-semibold text-white ${small ? "text-base" : "text-2xl"}`}>{value}</p>
    </div>
);
