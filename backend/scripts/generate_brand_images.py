"""
Generate brand-consistent illustrations for the CreatorBoostAI + BodyIQ-AI
platform using Gemini Nano Banana (gemini-3.1-flash-image-preview) via the
Emergent LLM Key.

Run: python /app/backend/scripts/generate_brand_images.py

Outputs: /app/frontend/public/generated/<name>.png
All images are 16:9, dark-navy + cyan aesthetic, no text overlays — sized
for use as industry tile + demo card headers.
"""
import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT = Path("/app")
load_dotenv(ROOT / "backend" / ".env")

OUT_DIR = ROOT / "frontend" / "public" / "generated"
OUT_DIR.mkdir(parents=True, exist_ok=True)

API_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
MODEL = "gemini-3.1-flash-image-preview"

if not API_KEY:
    print("ERROR: EMERGENT_LLM_KEY missing", file=sys.stderr)
    sys.exit(1)

# Common style prefix applied to every prompt to keep the brand cohesive.
STYLE = (
    "16:9 widescreen cinematic illustration. Premium enterprise AI tech brand. "
    "Deep dark navy / ink-blue background (#07101e to #0f172a). Electric cyan and "
    "teal accent lighting (#06b6d4, #22d3ee, #67e8f9). Subtle ambient grid texture "
    "in the background. Atmospheric volumetric light, soft glow, slight bokeh, "
    "film-grain. Editorial photography meets futuristic dashboard UI. No text, "
    "no logos, no watermarks, no human faces directly facing camera. Negative "
    "space on the left for overlays. Composition cinematic, slightly low-angle, "
    "color-graded toward teal-shadow / cyan-highlight. "
)

PROMPTS = [
    # ---------------------------------------------------------- INDUSTRY TILES
    ("industry-real-estate",
     "A modern luxury real-estate brokerage office at dusk: floor-to-ceiling "
     "windows looking onto a glowing city skyline; a holographic property pipeline "
     "and listing dashboard floats in the foreground showing closed deals, "
     "commission tracking, and a property heatmap. Cyan light glints off the glass."),
    ("industry-insurance",
     "An executive insurance agency desk: an underwriting workstation with "
     "floating risk-score panels, policy cards, and a SOC-2 / compliance audit "
     "trail visualized as cyan ribbons of light flowing between connected systems."),
    ("industry-creators",
     "A creator studio at golden hour: ring light, broadcast camera on tripod, "
     "two monitors showing audience analytics + brand-deal pipeline + revenue "
     "growth chart. A subtle behavioral-intelligence overlay (frame-by-frame "
     "conviction bars) hovers over the camera viewfinder."),
    ("industry-retail",
     "A multi-store retail / grocery operations command screen: aisles of stocked "
     "shelves blurred behind a transparent dashboard showing per-store inventory, "
     "POS revenue, and demand-forecast heatmaps overlaid on a city map."),
    ("industry-airports",
     "An airport terminal operations command center: jet bridges and runway "
     "lights through panoramic glass; floating SITA + airline + concession data "
     "panels showing throughput, dwell time, and revenue per square foot."),
    ("industry-contractors",
     "A field-service / contractor operations dashboard: a high-vis crew silhouette "
     "in the background on a job site at twilight; foreground holographic dispatch "
     "panel with auto-quoted estimates, live job pipeline, and crew margin metrics."),
    ("industry-enterprise",
     "An executive enterprise boardroom view: a multi-region command wall with "
     "a glowing world-map showing connected regions, division rollup KPIs, and a "
     "central CB Core engine pulsing with cyan light at the center."),

    # -------------------------------------------------------------- DEMO CARDS
    ("demo-realtor",
     "A cinematic real-estate agent's evening: a luxury home glowing from inside "
     "with warm light, sale-pending sign in front, and a transparent floating "
     "panel of CRM lead-scoring + showing-schedule data hovering above the lawn."),
    ("demo-insurance",
     "An over-the-shoulder shot of a producer's hand signing a policy, with a "
     "translucent risk-score and underwriting AI panel hovering above the paper, "
     "cyan accent light from a laptop screen reflecting on the desk."),
    ("demo-creator",
     "A vibrant creator at the edit desk filmed from behind: triple monitors "
     "showing a colorful video edit timeline, audience growth graph, and brand-deal "
     "Kanban board. Cyan light strip behind the desk, RGB studio ambient."),
    ("demo-airports",
     "An aircraft taxiing on a dusk runway with terminal lights in the distance; "
     "a translucent operational dashboard floats showing gate utilization, dwell "
     "time, and concession revenue — cinematic atmospheric depth."),
]


async def generate_one(name: str, prompt: str) -> bool:
    """Generate one image and write it to OUT_DIR/<name>.jpg. Returns success."""
    out_path = OUT_DIR / f"{name}.jpg"
    if out_path.exists() and out_path.stat().st_size > 5_000:
        print(f"[skip] {name} already exists ({out_path.stat().st_size} bytes)")
        return True
    try:
        chat = LlmChat(
            api_key=API_KEY,
            session_id=f"img-gen-{name}",
            system_message="You are a senior brand illustrator. Output only one final image.",
        )
        chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
        full_prompt = STYLE + " Subject: " + prompt
        msg = UserMessage(text=full_prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        if not images:
            print(f"[fail] {name}: no images returned. text={text[:120] if text else ''!r}")
            return False
        img = images[0]
        out_path.write_bytes(base64.b64decode(img["data"]))
        size_kb = out_path.stat().st_size // 1024
        print(f"[ok]   {name}: {size_kb} KB · {img.get('mime_type', 'image/png')}")
        return True
    except Exception as e:
        print(f"[fail] {name}: {type(e).__name__}: {e}")
        return False


async def main():
    print(f"OUT_DIR: {OUT_DIR}")
    print(f"MODEL:   {MODEL}")
    print(f"COUNT:   {len(PROMPTS)}")
    print()
    # Generate sequentially to keep request load light + readable logs
    ok = 0
    for name, prompt in PROMPTS:
        if await generate_one(name, prompt):
            ok += 1
    print()
    print(f"DONE — {ok}/{len(PROMPTS)} generated")


if __name__ == "__main__":
    asyncio.run(main())
