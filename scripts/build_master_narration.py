"""Iter 81 · Build the master HeyGen recording brief from the canonical
narration JSON. Run after `extract_demo_scripts.py`.

Generates:
  • /app/memory/master_narration_scripts.md      (human-readable brief)
  • /app/frontend/src/lib/masterNarration.js     (runtime single-source-of-truth)
"""
import json
from pathlib import Path

SRC = Path("/app/memory/master_narration_scripts.json")
MD_OUT = Path("/app/memory/master_narration_scripts.md")
JS_OUT = Path("/app/frontend/src/lib/masterNarration.js")


def build_md(data: dict) -> str:
    out = []
    out.append("# CreatorBoostAI · Master Narration Scripts")
    out.append("")
    out.append("**Auto-generated** from the canonical SCENES arrays in each demo page. "
               "This is the **single source of truth** for every demo's voiceover.")
    out.append("")
    out.append("Use these scripts to generate per-scene HeyGen avatar exports. "
               "Drop the resulting `.mp4` files into "
               "`/app/frontend/public/avatars/<demoKey>/<sceneId>.mp4` and add a "
               "1-line entry to `DEMO_AVATAR_REGISTRY` — the avatar will auto-replace "
               "the legacy TTS for that scene with matching lip-sync.")
    out.append("")
    out.append("---")
    out.append("")

    # Summary table
    out.append("## Summary")
    out.append("")
    out.append("| Demo | Key | Scenes | Total length |")
    out.append("|---|---|---:|---:|")
    for key, demo in data.items():
        mins = demo["total_duration_ms"] / 60000
        out.append(f"| {demo['title']} | `{key}` | {demo['scene_count']} | {mins:.1f} min |")
    out.append("")
    out.append("---")
    out.append("")

    # Per-demo detail
    for key, demo in data.items():
        out.append(f"## {demo['title']}")
        out.append("")
        out.append(f"- **Key:** `{key}` (use this in `DEMO_AVATAR_REGISTRY`)")
        out.append(f"- **Scenes:** {demo['scene_count']}")
        out.append(f"- **Total narration:** "
                   f"{demo['total_duration_ms']/1000:.0f}s "
                   f"({demo['total_duration_ms']/60000:.1f} min)")
        out.append("")

        for i, sc in enumerate(demo["scenes"], 1):
            out.append(f"### Scene {i} · `{sc['id']}`")
            out.append("")
            out.append(f"- **Section:** {sc['section']}")
            if sc.get("title") and sc["title"] != sc["section"]:
                out.append(f"- **Title:** {sc['title']}")
            out.append(f"- **Duration target:** {sc['duration_seconds']}s "
                       f"(`{sc['duration_ms']}ms`)")
            out.append(f"- **HeyGen file path:** "
                       f"`/app/frontend/public/avatars/{key}/{sc['id']}.mp4`")
            out.append("")
            out.append("**Narration script (record this verbatim):**")
            out.append("")
            narration = (sc.get("narration") or "(no narration captured — please review source)").strip()
            out.append(f"> {narration}")
            out.append("")
            out.append("---")
            out.append("")

    return "\n".join(out)


def build_js(data: dict) -> str:
    """Produce a small, deterministic ES module that exports the master
    narration script keyed by demo + scene id. Demos can `import { getNarration }`
    and pull the canonical text for captions / TTS / avatar / subtitles.
    """
    payload = {}
    for key, demo in data.items():
        payload[key] = {
            "title": demo["title"],
            "scenes": [
                {
                    "id": sc["id"],
                    "section": sc["section"],
                    "title": sc.get("title"),
                    "narration": sc.get("narration") or "",
                    "duration_ms": sc["duration_ms"],
                    "duration_seconds": sc["duration_seconds"],
                }
                for sc in demo["scenes"]
            ],
        }

    body = json.dumps(payload, indent=4, ensure_ascii=False)

    return f"""/**
 * masterNarration.js
 * --------------------------------------------------------------
 * AUTO-GENERATED · DO NOT EDIT BY HAND.
 *
 * Source of truth for every demo's voiceover script. This file is
 * regenerated from the canonical SCENES arrays via:
 *
 *   python3 /app/scripts/extract_demo_scripts.py
 *   python3 /app/scripts/build_master_narration.py
 *
 * The same string drives:
 *   • on-screen captions / subtitles
 *   • legacy demo TTS (until per-scene HeyGen clips are uploaded)
 *   • per-scene HeyGen avatar recordings (record this text verbatim)
 *   • dashboard tooling that previews demo content
 *
 * Shape:
 *   MASTER_NARRATION = {{
 *     [demoKey]: {{
 *       title: string,
 *       scenes: [
 *         {{ id, section, title, narration, duration_ms, duration_seconds }}
 *       ],
 *     }}
 *   }}
 */

export const MASTER_NARRATION = {body};

/** Look up the canonical narration for a (demo, scene-id) pair. */
export const getNarration = (demoKey, sceneId) => {{
    const demo = MASTER_NARRATION[demoKey];
    if (!demo) return null;
    return demo.scenes.find((s) => s.id === sceneId) || null;
}};

/** Return all scenes for a demo in order. */
export const getDemoScenes = (demoKey) => MASTER_NARRATION[demoKey]?.scenes || [];

export default MASTER_NARRATION;
"""


def main():
    data = json.loads(SRC.read_text())
    MD_OUT.write_text(build_md(data))
    JS_OUT.write_text(build_js(data))
    print(f"wrote {MD_OUT} ({MD_OUT.stat().st_size:,} bytes)")
    print(f"wrote {JS_OUT} ({JS_OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
