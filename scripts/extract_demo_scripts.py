"""Iter 81 · Demo narration extractor.

Scans the canonical SCENES array in each demo page, parses the narration
field (handles "string" + "string" concatenation, single/double/backtick
quotes), and writes one canonical master script JSON.
"""
import json
import re
from pathlib import Path

DEMOS = {
    "supermarket": {
        "title": "Supermarket / Retail Operations Demo",
        "path": "/app/frontend/src/pages/SupermarketDemoPage.jsx",
        "narration_field": "narration",
        "duration_field": "fallback_ms",
        "section_field": "section",
    },
    "airport": {
        "title": "Airport Operations Demo",
        "path": "/app/frontend/src/pages/AirportDemoPage.jsx",
        "narration_field": "narration",
        "duration_field": "fallback_ms",
        "section_field": "section",
    },
    "school": {
        "title": "School District Operations Demo",
        "path": "/app/frontend/src/pages/SchoolDistrictDemoPage.jsx",
        "narration_field": "body",
        "duration_field": "durationMs",
        "section_field": "eyebrow",
        "title_field": "title",
    },
    "realtor": {
        "title": "Real Estate / Realtor Demo",
        "path": "/app/frontend/src/pages/RealtorDemoPage.jsx",
        "narration_field": "narration",
        "duration_field": "fallback_ms",
        "section_field": "section",
    },
    "noldus": {
        "title": "Enterprise (Noldus) Demo",
        "path": "/app/frontend/src/pages/NoldusDemoPage.jsx",
        "narration_field": "narration",
        "duration_field": "fallback_ms",
        "section_field": "section",
    },
    "startup": {
        "title": "Startup Founder Demo",
        "path": "/app/frontend/src/pages/StartupDemoPage.jsx",
        "narration_field": "voiceover",
        "duration_field": "durationMs",
        "section_field": "kicker",
        "title_field": "title",
    },
}


def parse_concatenated_string(s: str) -> str:
    """Parse a JS string expression that may be `"a" + "b" + "c"`.

    Handles ", ', and ` quote types. Strips whitespace + line continuations.
    """
    out = []
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if ch in ('"', "'", "`"):
            quote = ch
            j = i + 1
            buf = []
            while j < n:
                if s[j] == "\\" and j + 1 < n:
                    buf.append(s[j + 1])
                    j += 2
                    continue
                if s[j] == quote:
                    break
                buf.append(s[j])
                j += 1
            out.append("".join(buf))
            i = j + 1
        else:
            i += 1
    return " ".join(part.strip() for part in out)


def grab_field(scene_src: str, field: str, kind: str = "str"):
    """Find `field: <value>` anywhere in the scene body. Stops at next `,`
    that's followed by a top-level identifier-then-colon pattern.
    """
    m = re.search(rf"\b{field}\s*:\s*", scene_src)
    if not m:
        return None
    start = m.end()
    if kind == "num":
        m2 = re.match(r"\d+", scene_src[start:])
        return int(m2.group(0)) if m2 else None
    # Find the value expression up to the next `,\n        <ident>:` pattern
    # which starts a sibling key.
    rest = scene_src[start:]
    # Find next sibling key: comma followed by optional whitespace/newline
    # then an identifier and a colon. Works for both line-broken and same-line styles.
    boundary = re.search(r",\s*[A-Za-z_][A-Za-z0-9_]*\s*:", rest)
    end = boundary.start() if boundary else len(rest)
    # Also stop at trailing `, ]` or `, }` that closes the scene
    closer = re.search(r",\s*[\]\}]", rest[:end])
    if closer:
        end = min(end, closer.start())
    return parse_concatenated_string(rest[:end].strip().rstrip(","))


def extract_scenes(path: str, cfg: dict) -> list:
    src = Path(path).read_text()
    m = re.search(r"const SCENES\s*=\s*\[", src)
    if not m:
        return []
    start = m.end()
    depth = 1
    i = start
    while i < len(src) and depth > 0:
        if src[i] == "[":
            depth += 1
        elif src[i] == "]":
            depth -= 1
        i += 1
    body = src[start : i - 1]

    scenes = []
    depth = 0
    obj_start = None
    for j, ch in enumerate(body):
        if ch == "{":
            if depth == 0:
                obj_start = j
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and obj_start is not None:
                scenes.append(body[obj_start : j + 1])
                obj_start = None

    parsed = []
    for s in scenes:
        sid = grab_field(s, "id")
        section = grab_field(s, cfg["section_field"]) or ""
        title = grab_field(s, cfg.get("title_field", "title")) or section
        narration = grab_field(s, cfg["narration_field"]) or ""
        duration_ms = grab_field(s, cfg["duration_field"], "num") or 0
        parsed.append({
            "id": sid,
            "section": section,
            "title": title,
            "narration": narration,
            "duration_ms": duration_ms,
            "duration_seconds": round(duration_ms / 1000) if duration_ms else None,
        })
    return parsed


def main():
    out = {}
    totals = {}
    for key, cfg in DEMOS.items():
        scenes = extract_scenes(cfg["path"], cfg)
        # Startup uses a global SCENE_MS instead of per-scene duration
        if key == "startup":
            for s in scenes:
                if not s["duration_ms"]:
                    s["duration_ms"] = 16500
                    s["duration_seconds"] = 17
        out[key] = {
            "title": cfg["title"],
            "demo_key": key,
            "scene_count": len(scenes),
            "total_duration_ms": sum(s["duration_ms"] for s in scenes),
            "scenes": scenes,
        }
        totals[key] = (len(scenes), sum(s["duration_ms"] for s in scenes))

    out_path = Path("/app/memory/master_narration_scripts.json")
    out_path.write_text(json.dumps(out, indent=2))
    print(f"wrote {out_path}")
    for k, (n, ms) in totals.items():
        print(f"  {k}: {n} scenes · {ms / 1000:.1f}s total")


if __name__ == "__main__":
    main()
