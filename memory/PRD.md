# BodyIQ-AI — PRD

## Original Problem Statement
Build BodyIQ-AI as a standalone premium AI intelligence web application focused on training sales, demo experience, and lead generation. Design feels high-end, minimal, intelligent. Multiple iterations: MVP → visual polish → cinematic finalization with Stripe Checkout + Resend email.

## User Personas
- Prospective Trainee, Field Operator, Enterprise Inquirer, Admin

## Core Requirements (Static)
Routes, premium navy/cyan design, multi-panel demo without proprietary definitions, training tiers $400/$1,500, Forensic Library $59, admin with CSV export, real Stripe Checkout Session API, Resend transactional email.

## What's Been Implemented

### Iter 1 (2026-02-24) — MVP
- Lead capture, admin console, 7-page React site with navy/cyan design system

### Iter 2 — Visual polish
- Glow orbs, scanlines, waveform strip, noise, curated imagery across all pages

### Iter 3 (2026-02-24) — Finalization
**Backend**
- `/api/products` — public product catalog ($400 foundations, $1,500 applied, $59 forensic_library)
- `/api/checkout/session` — creates Stripe Checkout Session via emergentintegrations (STRIPE_API_KEY=sk_test_emergent)
- `/api/checkout/status/{session_id}` — polls Stripe; falls back to DB-backed state when proxy GET unreliable
- `/api/webhook/stripe` — handles checkout.session.completed for authoritative payment confirmation
- `payment_transactions` Mongo collection with idempotent email-sent flag
- `email_service.py` — Resend integration with graceful degradation (RESEND_API_KEY empty → log-only)
- Lead welcome, contact ack, training purchase, forensic purchase email templates
- `jeffrey@creatorboostai.com` as sender, with reply-to

**Frontend**
- `SignalTape` — 8-frame auto-scrolling annotated strip on homepage (live analysis feel)
- Ken-burns zoom on hero background
- Scan-sweep + vignette on demo scene
- Global aurora-bg + aurora-grid (subtle animated gradient)
- Focus glow on inputs
- `TrainingPage` Reserve → real Stripe Checkout Session
- `ForensicLibraryPage` Purchase → real Stripe Checkout Session
- `ThankYouPage` polls session status, bounded MAX_ATTEMPTS, shows paid/timeout/no_session states
- All forms connected to backend with email triggers

### Test Results
- Iter 1: 20/20 backend + 100% frontend
- Iter 2: 100% (visual only)
- Iter 3: 34/34 backend + 100% frontend

### Iter 7 (2026-04-25) — Insurance Demo Scene 12 inserted (National Command Center)
- Inserted new **Scene 12 · National & Regional Command** between Revenue Multiplier and Command Center
- Total scenes: 14 → **15** (StartScreen, badges, narration count all updated)
- New `NationalCommandCenter` visual:
  - **Top KPI bar:** Total Revenue $284.2M · Policies 10,492 · Avg Conversion 12.0% · Compliance Alerts 3
  - **Heatmap regional grid:** 4 macro regions (West / Midwest / South / Northeast) with 50+ states color-coded by revenue performance (hot cyan glow / strong cyan / neutral / weak amber), with hover tooltips showing $ values
  - **Auto-rotating drill-down panel** cycling every 8s through: Nation → State (Texas) → Office (Houston Galleria) → Agent (Lopez, A.) → back. Distinct KPIs per zoom level + progress dots
  - Color legend included
- Narration to user spec: *"You're no longer managing agents. You're managing an entire national operation — from one system."*

### Iter 6 (2026-04-25) — 14-Scene Insurance Demo (`/demo/insurance`)
**New parallel route built** — same engine as realtor demo, insurance-specific content
- **14 scenes · ~12 min runtime** matching user's exact spec:
  - 1 Hook · 2 Current Software Stack · 3 CB Positioning · 4 Lead Flow · 5 AI Risk + Underwriting · 6 Follow-Up + Sales Automation · 7 Policy + Client Mgmt · 8 Commission + Payroll · 9 Compliance + Audit · 10 Integration Layer · 11 Revenue Multiplier · 12 Command Center · 13 Autonomous Mode · 14 Enterprise Close
- **Insurance stack overlayed:** Catalyst CRM, Core by Catalyst, HubSpot, Salesforce FSC, QQCatalyst, Applied Epic, AMS360, EZLynx, Microsoft 365, Teams, Slack, Zoom, Strike Graph, Vanta, AML/KYC, DocuSign (16 platforms total)
- **6 brand-new insurance-specific visuals:** `FragmentedAgents`, `InsuranceStackGrid` (4 categories), `InsuranceLeadFunnel`, `RiskUnderwritingPanel` (with risk scores + carrier matches), `PolicyLifecyclePanel`, `CommissionEnginePanel`, `CompliancePanel` (SOC2 + AML/KYC), `RevenueMultiplierPanel` (before/after metrics), `CommandCenterDashboard` (insurance KPIs)
- **Reused engine:** auto-play with `audio.ended` + per-scene fallback timer · subtitle bar · global timeline · pause/voice-off only · prefetch parallelized
- **Demo email generator:** insurance-tailored copy + roles (Agent/Broker, Agency Principal, Underwriter, Compliance, Carrier)
- **Verified:** smoke test passed, Scene 1 → Scene 2 auto-advanced, all visuals + subtitles render correctly on desktop + mobile

### Iter 5 (2026-04-25) — 13-Scene Cinematic Realtor Demo (Phase 1+2+3)
**Restructure: 22 scenes → 13 scenes** matching exact user spec
- Scene 1 Hook · 2 Current Stack · 3 CB Intro · 4 Lead Capture · 5 AI Qualification · 6 Follow-Up Automation · 7 Tasks & Pipeline · 8 Property & Management · 9 Revenue Engine · 10 Integration Layer · 11 Command Center · 12 Autonomous Mode · 13 Closing
- Target runtime: ~12-13 min (per-scene `fallback_ms` 45–90s)

**Phase 1 — Pure auto-flow**
- Removed all manual Skip/Back/Replay/Restart buttons
- Only `Pause/Resume` + `Voice On/Off` remain (per spec: "fallback pause/play")
- Hard timeout fallback per scene (`fallback_ms + 1500ms`) — guarantees no scene can ever freeze, even if TTS audio fails
- Audio.ended primary trigger; max-timer is the safety net
- Pause correctly preserves remaining scene time and resumes ticker

**New visuals built**
- `FragmentedTools` (Scene 1 — disconnected CRM/Email/MLS/Spreadsheets w/ amber ISOLATED tags)
- `SoftwareGridAll` (Scene 2 — full Enterprise + Field stack)
- `LeadCaptureFunnel` (Scene 4 — 6 sources funneling into auto-routed CRM tiles)
- `FollowUpAutomation` (Scene 6 — 6-step timeline with channels: email/SMS/call)
- `PipelinePanel` (Scene 7 — 5-stage pipeline + auto-task list)
- `AutonomousChoice` (Scene 12 — Autonomous vs Approval Mode comparison)

**Phase 3 — Avatar + Voice + Captions**
- Cinematic `SubtitleBar` fixed bottom-of-viewport (large white text, Nova label, fade-in-up per scene)
- `GlobalTimeline` thin cyan progress bar fixed top-of-viewport (z-60, above navbar) + compact scene meta strip below navbar
- Voice toggle prominent + mobile-friendly (`playsInline` audio)
- Avatar panel with speaking pulse animation

**Performance**
- TTS prefetch parallelized (5 concurrent) — cold-cache: ~30s, warm-cache: <1s
- All 13 scenes pre-warmed in `/tmp/tts_cache` after first run


**Frontend (`/demo/realtor`)**
- 22-scene auto-playing cinematic walkthrough (~10–14 min) narrated by Nova (OpenAI TTS)
- Positions CreatorBoostAI as a command center sitting on top of existing enterprise software (Yardi, MRI, RealPage, AppFolio, Accruent, Salesforce, Dynamics 365) and field software (FUB, kvCORE, BoomTown, Dotloop, SkySlope, ShowingTime, Zillow Premier, Matterport)
- Scene visuals: software-grid, software-overlay, 7 dashboard mockups, network map, connection diagram, security panel, closing CTA
- Playback controls: Play/Pause/Skip/Previous/Restart/Mute, scene auto-advance via `audio.ended`
- TTS prefetch parallelized (5 concurrent) — ~4× faster cold-cache start

**Backend**
- `/api/tts/speak` (Nova voice) with on-disk caching at `/tmp/tts_cache`
- `/api/lead/analyze` (gpt-5.1 via emergentintegrations) — structured lead intelligence + personalized outreach

### Test Results — Iter 4
- Backend: 14/14 new (TTS + lead/analyze) + 34/34 prior = 48/48
- Frontend: 100% (page loads clean, all 22 scenes render, controls work, no console errors)



## Prioritized Backlog

### P0 — Launch blockers
- Provide real Resend API key → set `RESEND_API_KEY` in `/app/backend/.env`
- Complete DNS authentication (SPF + DKIM) for creatorboostai.com in Resend dashboard
- Register Stripe webhook endpoint in Stripe dashboard (point to `{SITE_URL}/api/webhook/stripe`)
- Swap `STRIPE_API_KEY` from `sk_test_emergent` to live `sk_live_...` key at launch

### P1 — Conversion / UX
- Add "Check again" button on ThankYou timeout state
- Rate limiting on /api/checkout/session + /api/admin/login
- Per-session retry backoff on webhook email delivery
- Cohort countdown / seats-remaining on training page (scarcity)
- Admin view for payment_transactions with date filter

### P2 — Expansion
- Full accounts / paid content gate
- Voice narration (OpenAI TTS)
- Funnel analytics (Posthog / GA4)
- Idempotency keys on checkout

## Next Tasks
1. User provides Resend API key → drop into `.env`, restart backend → emails go live
2. User verifies creatorboostai.com DKIM/SPF in Resend
3. User registers Stripe webhook at Stripe dashboard for live reliability
4. Swap test → live Stripe key
