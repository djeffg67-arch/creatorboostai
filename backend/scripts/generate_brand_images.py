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

    # ---------------------------------------------- REALTOR DEMO SCENE BACKDROPS
    ("scene-realtor-corporate-office",
     "A modern enterprise real-estate corporate office at night: glass-walled "
     "executive suite, dim cyan accent lighting, an open laptop on a long table, "
     "city lights bleeding in from the windows, atmospheric depth."),
    ("scene-realtor-conference-room",
     "A leadership conference room with a floating live wall-display: pipeline "
     "rollup KPIs, agent leaderboard, and revenue forecasts glowing in cyan and "
     "white. Empty leather chairs, 4 a.m. decision-making vibe."),
    ("scene-realtor-team-working",
     "A diverse top-producing real-estate team working late at a long desk: "
     "multiple monitors showing CRM kanban, listing photos, and showing schedules. "
     "Warm task lighting + cyan ambient light. Silhouettes from behind."),
    ("scene-realtor-agent-client",
     "An agent presenting a tablet to a couple in a beautifully staged "
     "kitchen / open house. Cinematic golden-hour window light + cyan accent "
     "glow from the tablet. Backs of figures, no faces."),
    ("scene-realtor-agent-phone",
     "A real-estate agent on the phone walking through a property hallway, late "
     "afternoon, holding their phone with a glowing AI assistant overlay showing "
     "a recommended next message and an intent score. Backlit silhouette."),
    ("scene-realtor-property-exterior",
     "A high-end suburban home exterior at dusk: manicured front lawn, warm "
     "interior lights through panoramic windows, listing-photo vibe. Subtle cyan "
     "rim-light on the roofline. No people, no signs of text."),
    ("scene-realtor-luxury-home",
     "A luxury contemporary home interior: open floor plan, double-height ceiling, "
     "minimal furniture, sweeping window onto a city or coastline. Cinematic warm "
     "interior + cool cyan window light. No people."),
    ("scene-realtor-city-skyline",
     "A nighttime city skyline panorama from a high-rise window: dense urban "
     "glow with cyan accent reflections in the glass. Foreground slightly out of "
     "focus suggesting an observer at a desk. Cinematic, no text."),
    ("scene-realtor-open-house",
     "A bright open-house front: tasteful staging, neutral palette, sunlight "
     "filtering through sheer curtains, an open door inviting the viewer in. "
     "Subtle cyan smart-home accent light. No realtor sign, no text."),
    ("scene-realtor-walkthrough",
     "A first-person walkthrough perspective inside a beautifully designed home: "
     "polished wood floors leading toward a brightly-lit living area. Cinematic "
     "depth, gentle cyan ambient light from connected smart fixtures."),
    ("scene-realtor-desk-monitors",
     "A cinematic office workstation: 3 ultrawide monitors showing CRM pipeline, "
     "live listing analytics, and a national heatmap. Mechanical keyboard, "
     "ambient cyan key-light, late-night work vibe. No visible text legible."),
    ("scene-realtor-handshake",
     "Close-up of a closing handshake at a polished wood desk: pen, contract "
     "paper, blurred signed deal. Warm side-light + cyan glow from a partly visible "
     "screen. Cinematic, no faces, no readable text."),

    # ------------------------------------------- INSURANCE DEMO SCENE BACKDROPS
    ("scene-insurance-agent-desk",
     "An insurance producer's executive desk: clean policy folio, fountain pen, "
     "open laptop showing a translucent risk-score panel, soft afternoon window "
     "light + cyan accent glow. Premium agency feel."),
    ("scene-insurance-call-center",
     "A modern insurance call-center floor: rows of agent stations softly out of "
     "focus, headset highlights, ambient cyan task-lighting on monitors showing "
     "underwriting queues. Cinematic depth, professional."),
    ("scene-insurance-team-meeting",
     "An insurance leadership huddle around a wall display: floating compliance "
     "dashboard with SOC-2 status, audit trails, and commission rollups in cyan. "
     "Minimal modern conference room. Backs of executives, no faces."),
    ("scene-insurance-advisor-client",
     "A producer reviewing a coverage proposal on a tablet across a polished "
     "table from a client; subtle holographic risk-score and policy-options panel "
     "floats above the tablet. Warm light + cyan accent. Hands and shoulders only."),
    ("scene-insurance-handshake",
     "A confident handshake closing an insurance bind: a Catalyst-style CRM "
     "screen visible in the background, compliance check-marks glowing cyan. "
     "Cinematic close-up, no faces, no readable text."),
    ("scene-insurance-desk-monitors",
     "A senior underwriter's workstation at dusk: dual ultrawide monitors with "
     "AI risk-scoring, AML/KYC verification panels, and an audit trail timeline "
     "in cyan. Coffee cup, warm desk lamp, premium agency feel."),
    ("scene-insurance-corporate-office",
     "A modern insurance brokerage corporate office at night: long glass corridor, "
     "open suites visible, soft cyan ambient lighting, late-shift workstation glow. "
     "Cinematic depth, no people in foreground."),
    ("scene-insurance-laptop-woman",
     "Over-the-shoulder of a senior producer reviewing a digital policy quote "
     "on her laptop at a clean home office. Backlit by a window, cyan keyboard "
     "ambient, focused expression. Back of head, no face."),
    ("scene-insurance-documents",
     "Cinematic close-up of policy documents and a fountain pen on a polished "
     "wood desk; corner of a laptop visible, glowing cyan AI underwriting panel "
     "overlay. Soft window light. No readable text."),
    ("scene-insurance-city-night",
     "A high-rise insurance HQ skyline view at night: corporate towers with "
     "selective lit windows, cyan light strips on a tall building, blurred city "
     "below. Premium enterprise feel. No text, no logos."),

    # --------------------------------------------- CREATOR DEMO SCENE BACKDROPS
    ("scene-creator-studio",
     "A modern content-creator home studio: ring light, RGB strip behind the "
     "desk, dual monitors showing audience analytics and a brand-deal Kanban. "
     "Cinematic, warm + cyan ambient mix. No people."),
    ("scene-creator-phone-filming",
     "A creator's hand holding a phone on a tripod filming a vlog frame: "
     "a translucent BodyIQ-AI conviction-score overlay floats above the screen "
     "in cyan. Soft golden-hour window light. Hand only, no face."),
    ("scene-creator-podcast-mic",
     "A premium podcast / streaming setup: large condenser microphone in "
     "foreground, RGB-lit audio interface, blurred monitors showing waveform and "
     "audience charts in cyan. Atmospheric depth, no people."),
    ("scene-creator-audience-crowd",
     "A glowing concert / live-event crowd shot from the stage perspective: "
     "thousands of phone lights raised, cyan stage uplighting, blurred faces — "
     "the visual translation of 'audience'. Cinematic, no text."),
    ("scene-creator-laptop-creator",
     "A creator working at a laptop on an aesthetically minimal desk: floating "
     "revenue-growth chart, paid-tier subscriber count, and storefront orders "
     "visualized in cyan above the screen. Warm + cyan mix, hands only."),
    ("scene-creator-social-feed",
     "A cinematic over-the-shoulder of a phone showing a stylized social grid "
     "feed of content thumbnails; subtle cyan engagement-rate overlays on each. "
     "Hand only, blurred bedroom desk background. No readable text or usernames."),
    ("scene-creator-city-night",
     "A creator's view from a high-rise apartment over the city at night: "
     "cyan accent light from a desk monitor reflecting in the glass, creator's "
     "silhouette suggested. Cinematic, atmospheric, no faces, no text."),
    ("scene-creator-handshake",
     "A polished close-up handshake closing a brand-deal: brand pitch deck "
     "papers blurred on a desk, a translucent contract-tracker UI in cyan above. "
     "Cinematic, no faces, no readable text."),
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
