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

### Iter 6 (2026-02-26) — Final Launch Finishing Pass
**Goal**: Wire monetization, conversion, share, and billing-portal surfaces using existing pages — NO redesign, NO rebuild.

**Backend (`server.py` + `email_service.py`)**
- `POST /api/share-demo` — sends personalized demo email via Resend (recipient_email, sender_name, demo_type=realtor|insurance, optional company/message). Always logs to `demo_shares` collection (audit trail) regardless of email outcome. Graceful degradation: `sent=false` + clear `reason` when `RESEND_API_KEY` is empty.
- `POST /api/portal/billing-session` — Stripe Customer Portal. Uses official `stripe` SDK (via `asyncio.to_thread`) to mint a one-time portal session URL. Returns 401 invalid creds, 409 if no `stripe_customer_id` on file (until live subscription webhook lands).
- `GET /api/admin/demo-shares?range=7d|30d|all` — admin demo-share log with date filter
- `GET /api/admin/transactions?range=` — date filter added (was no-filter)
- `GET /api/admin/subscriptions?range=` — date filter added
- `_handle_checkout_completed` — now retrieves Stripe Checkout Session via official SDK to cache `stripe_customer_id` + `stripe_subscription_id` on payment_transactions + subscriptions rows (so billing portal will work as soon as live keys land)
- `email_service.send_demo_share()` — branded HTML template w/ subject + body, demo URL, optional personal note quoted block

**Frontend**
- New shared component `components/site/DemoConversionCTA.jsx` injected at end of both demo pages:
  - Primary CTA: "Book a Live Demo" → `/apply/strategy`
  - 4 secondary CTAs: View Pricing, Start Training, Open Command Center, Email This Demo
  - `autoScroll` prop: smooth-scrolls into view when `done=true` (final scene ends)
  - `autoRedirect` prop: optional 8s redirect to `/apply/strategy` (currently disabled, ready to flip on)
- Both demo share sections (`CustomerEmailSection` + `DemoEmailSection`) refactored:
  - Primary: "Send Demo" button → `POST /api/share-demo` with success/error UI banners
  - Secondary: "Copy link" button (preserved)
  - Email preview pane unchanged (gives users a peek of what's being sent)
- `Navbar.jsx` — added `Pricing` + `Apply` links (now 7 links + Experience Demo CTA, gap tightened to fit)
- `ApplyPage.jsx` — `PROGRAM_ALIAS` map: `/apply/strategy` → `accelerator_7k` ($7K), `/apply/mastery` → `mastery_27k` ($27K). Keeps the original `/apply/accelerator_7k` URLs working.
- `PortalPage.jsx` — new "Manage Subscription" button calling `/api/portal/billing-session`, opens Stripe portal in new tab
- `AdminPage.jsx` — added date range toggle (7d / 30d / All-time), Subscriptions table, Payment Transactions table. Existing leads UI preserved.
- `lib/api.js` — new helpers: `shareDemo`, `portalBillingSession`, `adminListSubscriptions`, `adminListTransactions`, `adminListDemoShares`

**New collections**
- `demo_shares` — `{id, recipient_email, sender_name, company, message, demo_type, demo_url, ip, ua, timestamp, sent, error}`

### Iter 7 (2026-02-26) — Founder Bypass + CB Preview Mode
**Goal**: Activate founder master access + read-only Command Center preview. Demos and UI structure remain frozen.

**Backend (`server.py`)**
- `POST /api/founder/auth` — validates `FOUNDER_KEY` env (constant-time compare via `secrets.compare_digest`), 503 fail-shut when env empty, 401 on bad key. On success, idempotently creates/refreshes user `jeffrey@creatorboostai.com` with `role:"founder"` and seeds 9 entitlements (3 one-time + 4 subscription tiers + 2 high-ticket). Returns `{email, token, role, entitlements}`.
- New env var: `FOUNDER_KEY=jeffrey-2026-bodyiq-founder-master` (in `backend/.env`)

**Frontend**
- `pages/FounderPage.jsx` — new `/founder?key=…` route. POSTs to `/api/founder/auth`, strips `?key=` from URL via `history.replaceState`, persists user to localStorage, redirects to `/portal` (auto-login, full entitlement view).
- `pages/PreviewPage.jsx` — new `/preview` (alias `/cb-preview`) read-only Command Center:
  - Header + "Activate the live system" CTA → `/apply/strategy`
  - Section A · Command Center sample stats (revenue $1.84M, leads 2,317, opportunities 48, forecast $4.2M) + Salesforce/HubSpot/QuickBooks integration tiles
  - Section B · National & Regional drill-down (4 regions × cities × offices, fully interactive but sample data)
  - Section C · AI Opportunity Panel (6 insights: high-value leads, $320K revenue, follow-up gaps, churn risk, trigger events, AI-drafted proposals)
  - Section D · Creator/Influencer view (audience growth, brand-deal opportunities, revenue projection, engagement quality + 3 suggested actions: Launch Campaign / Optimize Content / Monetize Audience)
  - Section E · Locked execution actions (Run Campaign, Execute Follow-Up, Optimize Revenue) — clicking shows toast "Available after activation"
- `App.js` — registered `/founder`, `/preview`, `/cb-preview` routes
- `HomePage.jsx` — added `hero-cta-command-center` button → `/preview`
- `DemoConversionCTA.jsx` — secondary CTA "Open Command Center" now links to `/preview` (was `/portal`)

### Iter 8 (2026-02-26) — Send-to-Agent (Preview Sharing)
**Goal**: Turn the read-only `/preview` Command Center into its own viral channel — let creators/influencers send the preview link to their managers, booking agents, or partners in one click.

**Backend**
- `ShareDemoRequest` extended with optional `share_target: "demo" | "preview"` (default `"demo"`, regex-validated)
- `POST /api/share-demo` — when `share_target="preview"`, the demo_url becomes `{base}/preview` instead of `{base}/demo/{vertical}`. Audit row in `demo_shares` records the new field.
- `email_service.send_demo_share()` — new `kind="demo" | "preview"` param. When `kind="preview"`, subject becomes "{sender} sent you the CreatorBoostAI Command Center preview", body uses preview-themed copy, and CTA button reads "Open the Command Center →".

**Frontend**
- `pages/PreviewPage.jsx` — new `<SendToAgent>` component injected directly under the Creator/Influencer view inside Section D. Inline form with name + recipient email + optional message. POSTs to `/api/share-demo` with `share_target="preview"`. Success/error UI banners. "Copy link" preserved as secondary.

**Tests**
- New `tests/test_iter8_send_to_agent.py` (3 tests, all green): default share_target links to demo, share_target=preview links to /preview, invalid target rejected with 422.

### Iter 9 (2026-02-26) — Phase 1 Internationalization (i18n)
**Goal**: Multilingual support across 6 languages (EN, ES, FR, PT, AR, ZH) with RTL handling for Arabic. Demo subtitles deferred to Phase 1b per user choice.

**Stack added (yarn)**
- `react-i18next` (17.0.4) + `i18next` + `i18next-browser-languagedetector`

**Files created**
- `lib/i18n.js` — i18n init + RTL handler (sets `<html dir="rtl|ltr" lang="…">` on language change). Persists to `localStorage["bodyiq_lang"]`.
- `locales/{en,es,fr,pt,ar,zh}.json` — full translation namespaces: `common`, `nav`, `footer`, `home`, `demoPicker`, `pricing`, `training`, `contact`, `apply`, `preview`, `press`, `lang`, `country`
- `components/site/LanguageSelector.jsx` — desktop pill dropdown + mobile flag chip variant. Closes on outside click + Escape.
- `components/site/CountrySelector.jsx` — homepage hero region picker (11 regions: Global, US, CA, MX, BR, UK, EU, GCC/UAE, IN, CN, APAC). Persisted in `localStorage["bodyiq_region"]`.

**Pages translated (UI strings + headlines + CTAs)**
- ✅ Navbar (desktop + mobile menu)
- ✅ Footer
- ✅ HomePage (hero + capabilities + CTAs + region selector embed)
- ✅ PreviewPage (every section + send-to-agent + locked actions toast)
- ✅ Common toasts/errors via `t("common.*")` / `t("contact.error")`

**Pages with locale keys ready but UI strings still hardcoded English** (Phase 1a remainder — easy 30-min finishing pass; React-i18next gracefully shows English if a key isn't bound):
- VerticalPickerPage, PricingPage, TrainingPage, ContactPage, ApplyPage, PressPage

**Phase 1b deferred (per user choice "C")**
- Demo subtitle translations for Realtor (15 scenes) + Insurance (16 scenes) — UI is translated; demo `narr` strings remain English. Audio narration also stays English (matching).

**Verification**
- React lint: 0 issues across all 6 new files
- HTTP: `/` and `/preview` both 200
- Visual: language selector visible top-right of navbar, country selector visible in hero. Switching to Arabic flips `<html dir="rtl">` and persists `bodyiq_lang="ar"` in localStorage.
- Default language: English; first-time users with non-English browser get auto-detected language from i18next-browser-languagedetector.



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
