# Per-Demo HeyGen Avatar Upload Guide

This is the bridge between the homepage avatar (which is correct as-is) and
true demo-specific avatar narration.

## Current state (after iter 79)

| Surface | Avatar audio source | Voice script | Status |
|---|---|---|---|
| Homepage hero | `avatar-desktop-opt.mp4` (HeyGen export) | Homepage intro script | ✅ Correct |
| All cinematic demos (supermarket / airport / school / startup / noldus / realtor) | Silent visual loop (`avatar-hero-loop.mp4`) | The original demo TTS narrates the correct script per scene | ✅ Correct (single voice, correct content) |

The avatar appears visually on every demo but is silent until you upload
per-scene HeyGen exports. As soon as you drop a per-scene clip in, that
specific scene's avatar speaks the demo script word-for-word.

---

## How to add a per-scene avatar clip (no code changes needed except registry)

### Step 1 — Find the scene IDs for the demo

Open the demo file and find the `SCENES` array. Each scene has an `id`.
For example, in `/app/frontend/src/pages/SupermarketDemoPage.jsx`:

```js
const SCENES = [
  { id: "opening", section: "Scene 1 · Opening", narration: "...", fallback_ms: 24000 },
  { id: "money-saving", section: "Scene 2 · Money Saving", narration: "...", fallback_ms: 22000 },
  ...
]
```

The `narration` field is the EXACT script HeyGen should record.

### Step 2 — Generate HeyGen exports

For each scene you want to upgrade, generate a HeyGen video using the
SAME avatar/voice as the homepage with the scene's `narration` text.

Aim for portrait 9:16 (1080×1920), with audio.

### Step 3 — Drop the files into the public folder

```
/app/frontend/public/avatars/<demoKey>/<sceneId>.mp4
/app/frontend/public/avatars/<demoKey>/<sceneId>-mobile.mp4   (optional, lighter mobile version)
/app/frontend/public/avatars/<demoKey>/<sceneId>.jpg          (optional, first-frame poster)
```

`<demoKey>` values: `supermarket`, `airport`, `school`, `startup`, `noldus`, `realtor`.

### Step 4 — Register them in `/app/frontend/src/lib/demoAvatarRegistry.js`

```js
export const DEMO_AVATAR_REGISTRY = {
    supermarket: {
        fallback: DEFAULT_FALLBACK,
        scenes: {
            "opening": {
                desktop: "/avatars/supermarket/opening.mp4",
                mobile:  "/avatars/supermarket/opening-mobile.mp4",   // optional
                poster:  "/avatars/supermarket/opening.jpg",          // optional
            },
            "money-saving": {
                desktop: "/avatars/supermarket/money-saving.mp4",
            },
            // ...add more scenes as you record them
        },
    },
    // ...same shape for airport, school, startup, noldus, realtor
};
```

### What happens automatically once registered

- The avatar component sees the per-scene clip → switches OUT of silent
  loop mode → plays the per-scene HeyGen audio → installs the voice lock
  (so legacy TTS doesn't double-speak) → fires `onSceneEnd` when the
  avatar finishes its line → demo auto-advances to the next scene.
- No code changes anywhere else.
- Mobile users get the lighter mobile clip if you provided one.
- Each scene's avatar speaks the **correct** demo narration word-for-word.

---

## Recommended priority order (highest impact first)

1. **Supermarket Scene 1** (opening hook) — most demoed, highest first impression.
2. **Airport Scene 1** — investor-facing.
3. **School Scene 1** — institutional buyers.
4. Then fill in remaining scenes per demo.

You can ship one scene at a time. The system mixes per-scene avatar
audio with silent-loop fallback for unrecorded scenes seamlessly.
