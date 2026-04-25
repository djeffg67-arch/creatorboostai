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



### Iter 5 (2026-02-26) — Native Stripe Subscription Mode
**Goal**: Convert CreatorBoostAI subscription checkout from one-time charge fallback to true recurring billing using native Stripe subscription mode.

**Backend (`server.py`)**
- `SUBSCRIPTIONS` dict — each plan now references its env var name (`price_id_env`) for the Stripe Dashboard recurring Price ID
- `POST /api/checkout/subscription` — refactored to pass `stripe_price_id` (recurring Price) to `CheckoutSessionRequest`. Stripe Checkout auto-detects recurring config and opens in subscription mode. Customer is billed every period forever.
- Fail-fast: returns **503 with explicit error** when the Price ID env var is missing — never silently falls back to one-time charge
- `txn_doc` now persists `subscription_mode="stripe_native"` and `stripe_price_id` for audit
- `POST /api/webhook/stripe` — extended to handle subscription lifecycle events:
  - `checkout.session.completed` → grant initial access (existing, refactored into `_handle_checkout_completed`)
  - `customer.subscription.created` → upsert into new `subscriptions` collection
  - `customer.subscription.updated` → keep status fresh
  - `invoice.paid` → recurring renewal: bump `last_renewal_at`, mark `status="active"`
  - `customer.subscription.deleted` → revoke portal access: mark sub `canceled`, flag user entitlements `canceled`
- **Idempotency**: every `event_id` recorded in new `processed_webhook_events` collection. Duplicate Stripe deliveries (retries) short-circuit with `{"received": True, "duplicate": True}`.
- `POST /api/portal/login` — now also returns `subscriptions` array so portal UI can display billing state
- `GET /api/admin/subscriptions` — admin endpoint listing all subscription rows (active + canceled)

**Env vars added (`backend/.env`)**
- `STRIPE_WEBHOOK_SECRET` — to be filled in when wiring live Stripe webhook
- `STRIPE_PRICE_CB_STARTER_MONTHLY` — Stripe Dashboard recurring Price for $49/mo
- `STRIPE_PRICE_CB_STARTER_ANNUAL` — Stripe Dashboard recurring Price for $490/yr
- `STRIPE_PRICE_CB_PRO_MONTHLY` — Stripe Dashboard recurring Price for $149/mo
- `STRIPE_PRICE_CB_PRO_ANNUAL` — Stripe Dashboard recurring Price for $1,490/yr

**New collections**
- `subscriptions` — `{id, email, plan_key, tier, interval, amount, currency, status, started_at, last_renewal_at, canceled_at, session_id, stripe_price_id, created_at, updated_at}`
- `processed_webhook_events` — `{event_id, event_type, session_id, processed_at}`

**Tests added** (`tests/test_bodyiq_subscriptions.py`)
- 9 tests covering: catalog, plan-key validation, 503-on-missing-price-id safety rail, webhook signature enforcement, admin auth, in-process subscription create/cancel handler logic, idempotency mechanic
- Updated `test_bodyiq_step1.py` to accept the new 503 contract until user provides Price IDs

**Test results**
- 76/76 backend tests passing
- Pricing UI verified rendering on desktop (1920×800)

### Test Results — Iter 5
- Backend: 76/76 (all prior + 9 new subscription tests)
- Frontend: rendering verified, no regressions



## Prioritized Backlog

### P0 — Launch blockers (BEFORE FLIPPING LIVE STRIPE KEYS)
- **User must mint 4 recurring Price IDs in their Stripe Dashboard** (Products → Add Product → Add Price → Recurring → monthly OR yearly):
  - Starter Monthly $49 → paste `price_...` into `STRIPE_PRICE_CB_STARTER_MONTHLY`
  - Starter Annual $490 → paste `price_...` into `STRIPE_PRICE_CB_STARTER_ANNUAL`
  - Pro Monthly $149 → paste `price_...` into `STRIPE_PRICE_CB_PRO_MONTHLY`
  - Pro Annual $1,490 → paste `price_...` into `STRIPE_PRICE_CB_PRO_ANNUAL`
- Provide live `STRIPE_API_KEY=sk_live_...`
- Register Stripe webhook in Dashboard → Developers → Webhooks pointed at `{SITE_URL}/api/webhook/stripe`. Subscribe to events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`. Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Provide real Resend API key → set `RESEND_API_KEY`
- Complete Resend DNS authentication (SPF + DKIM) for creatorboostai.com

### P1 — Conversion / UX
- PayPal Business as secondary processor (awaiting user Client ID + Secret)
- DNS apex-to-www redirect via Cloudflare (user action)
- Stripe Customer Portal link from /portal so users can self-cancel/upgrade
- Cohort countdown / seats-remaining on training page (scarcity)
- Admin view for payment_transactions + subscriptions with date filter

### P2 — Expansion
- Refactor: split RealtorDemoPage / InsuranceDemoPage (~1600 lines each) into shared components
- Dodo Payments fallback (currently stubbed)
- Funnel analytics (Posthog / GA4)
- Voice narration polish for additional verticals

## Next Tasks
1. **User provides 4 Stripe Price IDs** → paste into `backend/.env` → restart backend → re-test live recurrence
2. User provides `STRIPE_WEBHOOK_SECRET` from Stripe Dashboard webhook config
3. User provides live `sk_live_...` key + Resend `re_...` key
4. End-to-end live recurrence verification
5. PayPal integration once Client ID + Secret arrive
