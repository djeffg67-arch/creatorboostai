# BodyIQ-AI — PRD

## Original Problem Statement
Build BodyIQ-AI as a standalone premium AI intelligence web application focused on training sales, demo experience, and lead generation. Design should feel high-end, minimal, intelligent (NOT military/classified). Standalone app, no connection to CreatorBoostAI. Include guided scenario-based demo, /training page with two priced tiers linking to Stripe placeholder URLs, /thank-you page, $59 Forensic Visual Library product page, lightweight lead-capture backend with password-protected admin, responsive premium UI.

## User Personas
- **Prospective Trainee** — evaluating signal-reading training, arrives at home page, experiences demo, reserves seat.
- **Field Operator** — wants the Forensic Visual Library reference pack; signs up for launch notifications.
- **Enterprise Inquirer** — reaches out via /contact for custom cohorts.
- **Admin** — views captured leads and exports CSV for CRM / outreach.

## Core Requirements (Static)
1. Seven routes: `/`, `/demo`, `/demo/:variant`, `/training`, `/thank-you`, `/forensic-library`, `/contact`, `/admin`.
2. Premium navy/cyan design system with Outfit + Manrope + JetBrains Mono typography.
3. Demo must have multi-panel UI (scene, signal bars, patterns, strategy, narration) without exposing proprietary definitions.
4. Training tiers hardcoded: $400 Signal Foundations, $1,500 Applied Signals.
5. Stripe placeholders — ready to swap for real links.
6. Lead capture backend (Mongo) with sources: home, demo, demo_training, training, contact, newsletter, forensic_library.
7. Password-protected admin dashboard with stats, filter by source, CSV export, in-memory bearer tokens.

## What's Been Implemented (2026-02-24)
### Backend (`/app/backend/server.py`)
- `GET /api/` — health check
- `POST /api/leads` — create lead (email + source + optional name/message/metadata)
- `POST /api/admin/login` — validate password → bearer token
- `POST /api/admin/logout` — invalidate token
- `GET /api/admin/leads` — list (auth required, _id excluded)
- `GET /api/admin/leads/stats` — total + by_source counts
- `GET /api/admin/leads/export.csv?token=…` — CSV download
- `ADMIN_PASSWORD` env var (default `bodyiq-admin-2026`)

### Frontend
- Navbar + Footer layout shell
- `HomePage` — hero with signal console preview, capabilities grid, training teaser, newsletter
- `DemoPage` — multi-panel console (scene, signal bars, pattern chips, strategy, narration), play/prev/next, step timeline, two scenario variants (default Negotiation, /demo/training Field Training)
- `TrainingPage` — two-tier pricing cards, Reserve Spot → placeholder Stripe URL + lead log
- `ThankYouPage` — confirmation
- `ForensicLibraryPage` — $59 product marketing, placeholder purchase button (toast), notify-me email
- `ContactPage` — form storing submissions as leads
- `AdminPage` — password login, stats cards, filter pills, leads table, CSV export, logout
- Reusable `EmailCapture` component on Home, Demo, Training, Forensic Library
- Tailwind theme extended with ink + cyan palettes, grain + ambient-grid utilities
- Toaster (sonner) for success/error feedback

## Testing
- Backend: 20/20 pytest cases pass (iteration_1)
- Frontend: All 7 pages verified, all email captures, admin flow end-to-end

## Prioritized Backlog
### P0 — Revenue blockers
- Swap placeholder Stripe URLs for real payment links (2 links: $400 / $1,500)
- Real Stripe or crypto checkout for Forensic Visual Library ($59)
- Map Stripe success redirect → `/thank-you?session_id=…` with session validation

### P1 — Conversion lifts
- Email delivery on lead capture (Resend / SendGrid) — welcome sequence
- Admin CSV date-range filter + per-source export
- Calendar component for cohort date selection on `/training`
- Scenario recording/video scrubbing for demo (currently static images)
- Social proof: testimonials, logos, cohort counts

### P2 — Platform expansion
- Full user accounts + purchased-content gate for paid trainees
- Voice narration (OpenAI TTS) as upgrade over text narration
- Avatar-driven demo guide
- Analytics: funnel tracking (Posthog / GA4)
- Rate limiting on /api/leads + /api/admin/login (brute-force surface)
- Tighten CORS to production origins

## Next Tasks
1. Collect real Stripe payment link URLs from user → replace `STRIPE_LINKS` in `/app/frontend/src/pages/TrainingPage.jsx`
2. Integrate Resend for transactional email (welcome + admin notification)
3. Add proper Stripe checkout for $59 Forensic Library
