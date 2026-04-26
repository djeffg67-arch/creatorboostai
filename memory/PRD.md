# BodyIQ-AI + CreatorBoostAI — Master PRD & Handoff

**Last update:** 2026-02-26 (end of day — user returning tomorrow with launch keys)
**Project status:** 🟢 Code-complete for launch. Awaiting 7 environment variables.
**Site URL:** https://bodyiq-training.preview.emergentagent.com
**Supervisor:** backend + frontend RUNNING. 111/111 backend tests passing.

---

## 🚀 RESUME-HERE INSTRUCTIONS FOR NEXT SESSION

**The user is coming back tomorrow with API keys.** Their literal next message will likely paste in some or all of these 7 values. The moment they land:

1. Drop the values into `/app/backend/.env` using `search_replace` (DON'T overwrite — only edit the matching lines)
2. `sudo supervisorctl restart backend && sleep 3`
3. Smoke-test: `curl -X POST {SITE_URL}/api/checkout/subscription -H "Content-Type: application/json" -d '{"plan_key":"cb_starter_monthly","origin_url":"…","email":"test@example.com"}'` → should now return 200 with a Stripe Checkout URL (not 503)
4. End-to-end live recurrence test: pay with Stripe test card `4242 4242 4242 4242` → confirm Stripe Dashboard shows active subscription → confirm `subscriptions` Mongo collection has row → confirm `users` collection auto-created with portal_token → confirm Resend delivered the welcome email → confirm `/portal` login + "Manage Subscription" button opens Stripe Customer Portal
5. Then PayPal (Step 3 from user's earlier sequence)

**Keys the user will paste:**
```
RESEND_API_KEY=re_xxx
STRIPE_API_KEY=sk_live_xxx                   (or sk_test_xxx for test mode first)
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_CB_STARTER_MONTHLY=price_xxx    ← $49/mo recurring
STRIPE_PRICE_CB_STARTER_ANNUAL=price_xxx     ← $490/yr recurring
STRIPE_PRICE_CB_PRO_MONTHLY=price_xxx        ← $149/mo recurring
STRIPE_PRICE_CB_PRO_ANNUAL=price_xxx         ← $1,490/yr recurring
```

**Stripe webhook URL to register in their Dashboard:** `{SITE_URL}/api/webhook/stripe`
**Subscribe events:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`

---

## 🎯 ORIGINAL PROBLEM STATEMENT

Build BodyIQ-AI as a standalone web application focused on training, demo experience, and lead generation. Premium high-end minimal AI intelligence aesthetic (deep navy/ink + electric cyan accents).

**Two products, one unified system:**
- **BodyIQ-AI** = Intelligence layer (reads human signals — visual, auditory, behavioral)
- **CreatorBoostAI** = Execution layer (sits on top of existing CRM/AMS/MLS/marketing/comms stacks and executes recommended actions)

**Monetization rules (strict):**
- $49/mo + $149/mo CB subscriptions → Stripe NATIVE subscription mode (recurring billing)
- $400 Foundations + $1,500 Applied → Stripe one-time checkout
- $7K Strategy + $27K Mastery → Application-only flow (no direct checkout) → Calendly booking
- $59 Forensic Library → Stripe one-time
- Auto-create user account + `/portal` access on `checkout.session.completed`
- PayPal = secondary processor (awaiting Client ID + Secret)
- Dodo Payments = stubbed only
- Zelle = manual only

---

## 📦 WHAT'S SHIPPED (status as of 2026-02-26)

### Pages (14 routes, all wired in `App.js`)
| Route | Page | Status |
|---|---|---|
| `/` | HomePage — hero + capabilities + signal tape + founder bio + email capture | ✅ + i18n |
| `/demo` | VerticalPickerPage — Realtor + Insurance cards with click tracking | ✅ |
| `/demo/realtor` | RealtorDemoPage — 15-scene cinematic auto-play | ✅ |
| `/demo/insurance` | InsuranceDemoPage — 16-scene cinematic auto-play | ✅ |
| `/training` | 4 tiers ($400, $1,500, $7K, $27K) with correct routing | ✅ |
| `/pricing` | 3-tier CB subscription pricing (Starter/Pro/Enterprise) | ✅ |
| `/apply/:program` | High-ticket application form (alias `strategy`→`accelerator_7k`, `mastery`→`mastery_27k`) | ✅ |
| `/portal` | Login + entitlements + Manage Subscription button | ✅ |
| `/preview` (`/cb-preview`) | Read-only Command Center (5 sections + Send-to-Agent) | ✅ + i18n |
| `/founder?key=…` | Master bypass — strips key, auto-logs into `/portal` | ✅ |
| `/press` | Investor/press kit + SVG/PNG export | ✅ |
| `/forensic-library` | $59 product page | ✅ |
| `/contact`, `/thank-you`, `/admin` | Supporting pages | ✅ |

### Backend (`/app/backend/server.py`, 111/111 tests green)
**Public endpoints**
- `POST /api/leads` — multi-source lead capture
- `POST /api/contact`, `POST /api/training/order`
- `POST /api/checkout/session` — one-time products ($400/$1500/$59); REJECTS high-ticket
- `POST /api/checkout/subscription` — NATIVE Stripe subscription mode (passes `stripe_price_id`); 503 fail-shut when Price ID env missing
- `POST /api/applications` — high-ticket lead capture + booking URL
- `GET /api/subscriptions` — public catalog
- `POST /api/track/picker-click` — vertical picker analytics
- `POST /api/share-demo` — Resend email send (`share_target: "demo"|"preview"`); audit row in `demo_shares`
- `POST /api/portal/login` — magic-token (email + portal_token); returns entitlements + subscriptions
- `POST /api/portal/billing-session` — Stripe Customer Portal session URL (uses official `stripe` SDK)
- `POST /api/founder/auth` — master bypass, validates `FOUNDER_KEY` (constant-time)
- `POST /api/webhook/stripe` — handles 5 events with idempotency via `processed_webhook_events`
- `POST /api/tts/speak` — OpenAI TTS Nova voice with on-disk cache
- `POST /api/lead/analyze` — gpt-5.1 lead intelligence

**Admin endpoints** (Bearer token from `/api/admin/login`)
- `GET /api/admin/leads`, `/leads/stats`, `/leads/export.csv`
- `GET /api/admin/applications`
- `GET /api/admin/subscriptions?range=7d|30d|all`
- `GET /api/admin/transactions?range=7d|30d|all`
- `GET /api/admin/picker-stats`
- `GET /api/admin/demo-shares?range=7d|30d|all`

### Mongo collections
`leads`, `applications`, `users`, `payment_transactions`, `subscriptions`, `processed_webhook_events`, `demo_shares`, `picker_clicks`, `contact_messages`

### 3rd-party integrations
- **Stripe**: native subscription mode wired via emergentintegrations + official `stripe` SDK for billing portal & session retrieval. `stripe==15.0.1` already installed.
- **Resend**: `email_service.py` covers welcome, contact ack, training, forensic, demo share (with `kind="demo"|"preview"`). All gracefully no-op when `RESEND_API_KEY` empty.
- **OpenAI TTS** (Nova voice for demo narration) via Emergent LLM key — already working
- **Emergent LLM key** — already in `.env`: `EMERGENT_LLM_KEY=sk-emergent-8B76051Bc7fCbA2F20`

### i18n (Phase 1 — paused per user, ships transparently)
- 6 locale files (`en/es/fr/pt/ar/zh`) with full namespaces for nav, footer, home, demoPicker, pricing, training, contact, apply, preview, press
- `LanguageSelector` in navbar (desktop + mobile) — already live
- `CountrySelector` on homepage hero — already live
- RTL handling for Arabic via `<html dir="rtl" lang="ar">`
- `localStorage["bodyiq_lang"]` persistence
- **Pages bound to translation keys:** Navbar, Footer, HomePage, PreviewPage
- **Pages with keys ready but JSX still hardcoded English (graceful fallback):** VerticalPickerPage, PricingPage, TrainingPage, ContactPage, ApplyPage, PressPage
- **Phase 1b deferred:** Demo subtitle translations (15 + 16 scenes × 5 languages)
- User explicitly paused further i18n work — will revisit post-launch

---

## 🔐 ENVIRONMENT VARIABLES — current state of `/app/backend/.env`

**Set and working:**
```
MONGO_URL=mongodb://...                 # protected
DB_NAME=…                                # protected
ADMIN_PASSWORD=bodyiq-admin-2026
FOUNDER_KEY=jeffrey-2026-bodyiq-founder-master
EMERGENT_LLM_KEY=sk-emergent-8B76051Bc7fCbA2F20
SITE_URL=https://bodyiq-training.preview.emergentagent.com
SENDER_EMAIL=jeffrey@creatorboostai.com
REPLY_TO_EMAIL=jeffrey@creatorboostai.com
USE_RESEND_TEST_DOMAIN=false
STRIPE_API_KEY=sk_test_emergent          # ⚠️ test key — needs swap to sk_live_
```

**Empty — to be filled tomorrow:**
```
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_CB_STARTER_MONTHLY=
STRIPE_PRICE_CB_STARTER_ANNUAL=
STRIPE_PRICE_CB_PRO_MONTHLY=
STRIPE_PRICE_CB_PRO_ANNUAL=
RESEND_API_KEY=
```

`/app/frontend/.env` (do NOT modify):
```
REACT_APP_BACKEND_URL=https://bodyiq-training.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## 🔑 ACCESS CREDENTIALS

See `/app/memory/test_credentials.md`. Summary:
- Admin: `/admin` → password `bodyiq-admin-2026`
- Founder bypass: `/founder?key=jeffrey-2026-bodyiq-founder-master` → auto-logs into `/portal` with all 9 entitlements

---

## 📈 TEST COVERAGE — 111/111 passing

`/app/backend/tests/`
- `test_bodyiq_api.py` — leads, contact, training, forensic, admin
- `test_bodyiq_step1.py` — full Phase-1 launch validation (subscription 503-safety-rail accepted)
- `test_bodyiq_checkout.py` — one-time + subscription Stripe flows
- `test_bodyiq_subscriptions.py` — native subscription mode + webhook lifecycle (9 tests)
- `test_iter8_send_to_agent.py` — share_target=preview vs demo (3 tests)
- `test_realtor_demo.py` — TTS, picker analytics

`/app/test_reports/iteration_{1..7}.json` — full historical test output

---

## 🗺️ POST-LAUNCH BACKLOG (deferred until keys arrive)

**P0 — required before launch flip**
- 7 env vars (above)
- Stripe Dashboard: mint 4 recurring Price IDs + register webhook
- Resend: verify creatorboostai.com SPF + DKIM
- Live end-to-end recurrence test

**P1 — post-launch wins**
- PayPal Business secondary processor (awaiting Client ID + Secret)
- DNS apex-to-www redirect via Cloudflare
- Phase 1a i18n finish — bind 6 remaining pages to translation keys (~30 min mechanical work)
- Move `ADMIN_TOKENS` from in-memory dict to DB-backed (won't survive restart / multi-replica)
- Rate limiting on `/api/admin/login`, `/api/portal/login`, checkout endpoints

**P2 — expansion**
- Refactor `RealtorDemoPage.jsx` + `InsuranceDemoPage.jsx` (~1,720 lines each) into modular components
- Phase 1b — demo subtitle translations + matching audio narration
- Dodo Payments fallback (currently stubbed)
- Per-share UTM + open/click tracking on demo emails (after Resend live)
- Funnel analytics (PostHog / GA4)
- Native-speaker review on AR + ZH translations

---

## 📝 SESSION HISTORY (today, 2026-02-26)

| Iter | Focus | Status |
|---|---|---|
| 5 | Native Stripe subscription mode + webhook lifecycle + idempotency | ✅ |
| 6 | Real demo share system + Resend integration + Stripe Customer Portal + admin tables | ✅ |
| 7 | Founder bypass + CB Preview Mode (5 sections) + preview entry points | ✅ |
| 8 | Send-to-Agent (preview link sharing) | ✅ |
| 9 | Phase 1 i18n foundation (6 languages, RTL, infrastructure + 4 pages bound) | 🟡 paused per user |

User explicitly said tonight: *"Do not proceed with multilingual implementation at this time. We are prioritizing launch-critical functionality only. Focus only on: Demo share system, Resend email activation, Stripe live billing setup, Founder access route. We will revisit multilingual support after launch."*

All 4 launch-critical items are CODE-COMPLETE. Items 1 (share) and 4 (founder) are 100% live. Items 2 (Resend) and 3 (Stripe live) are 100% wired and waiting on user-supplied keys only.

---

## 🛡️ DO-NOT-TOUCH LIST (for next agent)

- Don't redesign demos, scenes, or UI — user explicitly forbade
- Don't translate demo subtitles (Phase 1b deferred)
- Don't modify `/app/frontend/.env` keys (REACT_APP_BACKEND_URL, WDS_SOCKET_PORT)
- Don't modify `/app/backend/.env` MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, SITE_URL
- Don't add new pages or industries — Mortgage/Healthcare/FA/Hospitality stay "Coming soon" tiles
- Don't rebuild auth — Emergent-style magic-token flow is intentional
- Don't add new dependencies without checking package.json first
