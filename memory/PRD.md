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

### Iter 4 (2026-04-25) — 22-Scene Enterprise Realtor Demo
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
