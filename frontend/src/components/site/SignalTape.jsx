import React from "react";

const FRAMES = [
    { img: "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?auto=format&fit=crop&w=420&q=70", label: "Gaze aversion · 340ms", code: "V-04" },
    { img: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=420&q=70", label: "Postural convergence", code: "B-07" },
    { img: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=420&q=70", label: "Pitch elevation · +8%", code: "A-02" },
    { img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=420&q=70", label: "Micro-nod sequence", code: "B-11" },
    { img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=420&q=70", label: "Deflection cluster", code: "V-09" },
    { img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=420&q=70", label: "Baseline cadence", code: "A-01" },
    { img: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=420&q=70", label: "Leverage window · 14s", code: "C-03" },
    { img: "https://images.unsplash.com/photo-1758518730083-4c12527b6742?auto=format&fit=crop&w=420&q=70", label: "Pattern lock · stable", code: "C-08" },
];

export const SignalTape = () => {
    const loop = [...FRAMES, ...FRAMES];
    return (
        <div
            className="relative w-full overflow-hidden border-y border-white/5 bg-ink-900/60 py-4"
            data-testid="signal-tape"
        >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-900 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-900 to-transparent" />

            <div className="flex w-max animate-signal-scroll gap-4">
                {loop.map((f, i) => (
                    <div
                        key={i}
                        className="group relative h-24 w-56 flex-shrink-0 overflow-hidden rounded-sm border border-white/10 bg-ink-800"
                    >
                        <img
                            src={f.img}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover opacity-60 transition-opacity duration-500 group-hover:opacity-85"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/30 to-transparent" />
                        <div className="absolute left-2 top-2 rounded-sm border border-cyan-500/40 bg-ink-900/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400 backdrop-blur">
                            {f.code}
                        </div>
                        <div className="absolute inset-x-2 bottom-2">
                            <p className="font-mono text-[10px] leading-tight text-slate-200">{f.label}</p>
                        </div>
                        {/* active scan line */}
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent animate-scan-line" />
                    </div>
                ))}
            </div>
        </div>
    );
};
