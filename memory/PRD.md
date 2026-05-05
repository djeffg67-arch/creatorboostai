# CreatorBoostAI + BodyIQ-AI — Master PRD

**Last update:** 2026-05-05 (Iter 55 — Client Delivery System: Client Portal + Auto-Onboarding)

> Older iterations (38-53) are summarized in `/app/memory/CHANGELOG.md` if it exists, else inferred from git log.

---

## 🎯 ITER 55 — CLIENT DELIVERY SYSTEM (Client Portal + Auto-Onboarding)

Per Jeffrey's "CLIENT DELIVERY SYSTEM" directive: convert CreatorBoostAI from a lead +
sales engine into a full business operating system. Auto-onboard every closed-won deal
into a magic-link-gated client workspace; founder manages the entire lifecycle inside Ops.

### Backend
- **`/app/backend/client_delivery.py`** (NEW · 566 lines · all 10 sections)
  - `auto_onboard_from_lead(db, lead_id, trigger)` — idempotent helper. Creates
    `client_accounts` row (uuid + magic token + plan_key + deal_value_usd), seeds 6
    default `client_tasks` (intake_received → strategy_defined → setup_complete →
    first_execution → review → optimization), seeds welcome `client_messages` from
    "Delivery AI".
  - **Founder/employee endpoints** (auth-gated): `POST /api/client/onboard-from-lead`,
    `/list` (with status filter + counts pills), `/workspace`, `/set-status`,
    `/task-toggle`, `/reply`, `/resend-magic`, `/inactive-flag-check`.
  - **Public portal endpoints** (magic-token gated): `/portal/access`, `/portal/upload`
    (5 MB cap, base64 storage in `client_uploads`), `/portal/message`.
  - **Section 7 status auto-sync**: 0 done → onboarding · 1-2 → in_progress · 3-5 →
    review · 6 → completed. Manual `inactive` flag respected.
  - **Section 8 founder notifications** via `email_service.send_founder_notification`:
    new client onboarded, client uploads file, client posts message, 48h-inactive flag.
  - All founder-facing responses strip `client_token`; only the magic_link URL exposes
    it (so founder can copy + manually share if Resend mail fails).
- **`/app/backend/server.py`**
  - Router wired after start_engine (line ~3565).
  - **Stripe webhook hook** (line ~2375 inside `_log_demo_revenue_event`): on
    `checkout.session.completed` for a lead with `lead_id` in metadata →
    `auto_onboard_from_lead(db, lead_id, trigger="stripe_close_won")` → magic-link email
    + founder alert.
- **`/app/backend/ops_center.py`** · `/leads/status`: when an employee/founder flips a
  lead to `won` manually → `auto_onboard_from_lead(...)` → `onboarded_client_id` echoed
  in the API response. Wrapped in try/except so onboarding failure doesn't block status.
- **`/app/backend/avatar.py`**
  - New "delivery" role-tagged system prompt (line 165): operator focused on moving the
    work forward, no upsell, can generate concrete deliverables (scripts, plans).
  - `_pick_model` escalates `delivery` to Claude Sonnet 4.5 (deep model).
  - `_handle_chat` (line 446): `surface == "client_portal"` forces role="delivery"
    regardless of message keywords.

### Frontend
- **`/app/frontend/src/pages/ClientPortalPage.jsx`** (NEW · 350 lines · public
  magic-token gated) — Welcome header, status pill, progress bar (% complete), 4 tabs:
  - **Deliverables** — checklist with completed-date stamps
  - **Messages** — conversation thread (client posts → founder/AI replies)
  - **Uploads** — file picker (5 MB cap, base64) + uploads list
  - **AI assistant** — calls `/api/avatar/chat` with `surface="client_portal"`
- **`/app/frontend/src/pages/PortalOpsPage.jsx`**
  - New `<ClientsTab>` between Demo Links and AI Assistant. Filter pills (all /
    onboarding / in_progress / review / completed / inactive) with live counts.
    "Onboard from lead" button for manual onboarding.
  - `<ClientDrawer>` per client: status switcher · 6-task checklist (toggle done) ·
    uploads list · messages thread + reply input · "Resend magic link" button · full
    magic link displayed for copy-paste.
- **`/app/frontend/src/App.js`** · `/portal/client/:client_id` route registered.
- **`/app/frontend/src/lib/api.js`** · 11 new helpers (founder + public portal).

### Verified live (testing agent iteration 33 · 16/16 pytest passing)
```
✓ Auto-onboard via /leads/status won → client_accounts created · 6 tasks · 1 welcome msg
✓ Idempotent on re-flip won → same client_id, no duplicate tasks
✓ /api/client/list (founder) → counts {all, onboarding, in_progress, review, completed, inactive}
✓ /api/client/workspace → tasks + messages + uploads + magic_link
✓ /api/client/task-toggle → status auto-syncs onboarding → in_progress → review → completed
✓ /api/client/portal/access valid token → full workspace
✓ /api/client/portal/access INVALID token → 401
✓ /api/client/portal/message author=client + last_activity_at bumped
✓ /api/client/portal/upload <5MB → ok · >5MB → 413
✓ /api/client/reply (founder) → message author=founder
✓ /api/client/inactive-flag-check (founder) → 48h cutoff scan + alerts
✓ Avatar surface=client_portal → role=delivery, no upsell language
✓ /portal/client/:id?token=valid → welcome + status pill + progress + 6 tasks rendered
✓ /portal/client/:id?token=INVALID → ACCESS DENIED screen
```

### Bug fixed by testing agent (auto-applied)
- `FounderReplyReq` was defined inside `make_client_delivery_router()` closure, causing
  FastAPI's body-type resolver to fail and return 422 on `/api/client/reply`. Fixed by
  hoisting to module-level alongside other Pydantic models. Pattern note: never define
  Pydantic body models inside route-factory closures.

### Files touched
- `/app/backend/client_delivery.py` (NEW)
- `/app/backend/server.py` (router wire + Stripe webhook auto-onboard hook)
- `/app/backend/ops_center.py` (manual won → auto-onboard hook)
- `/app/backend/avatar.py` (delivery role + surface gating)
- `/app/frontend/src/App.js` (route registration)
- `/app/frontend/src/pages/ClientPortalPage.jsx` (NEW)
- `/app/frontend/src/pages/PortalOpsPage.jsx` (Clients tab + Drawer)
- `/app/frontend/src/lib/api.js` (11 new helpers)
- `/app/backend/tests/test_iter55_client_delivery.py` (NEW · 16 pytest assertions)

### Outstanding / backlog
- (P1) `RESEND_API_KEY` for actual magic-link delivery (currently logs to
  `client_magic_link_log` with delivered_ok=false; founder can copy magic_link from
  drawer manually).
- (P2) Auto-cron for `/inactive-flag-check` every 6h (currently founder-triggered).
- (P2) Real file storage backend (S3/disk) — base64-in-Mongo works for MVP <5MB.
- (P2) Split client_delivery.py into public vs founder routers if Iter 56 extends.

---

## 🎯 ITER 54 — START ENGINE ACTIVATION + STARTUP PRICING TIERS

Per Jeffrey's "FINAL SYSTEM UPGRADE — START ENGINE + STARTUP PRICING" directive: every new
non-elevated user must hit a `/start-engine` first-login screen, choose an activation path,
get leads + autopilot triggered automatically, then land on the right portal mode. Plus a
new low-entry tier ladder ($29 / $79 / $149) above the existing standard tiers.

### Backend changes
- **`/app/backend/ops_center.py`**
  - `_strip()` now returns `onboarding_complete`, `onboarding_path`, `plan_tier`, and
    `onboarding_redirect` — privileged roles (founder/executive) bypass the gate.
  - `/api/ops/otp/verify` returns dynamic `redirect: /start-engine` for non-elevated users
    until they finish onboarding.
  - `/api/ops/access-link/consume` (magic-link auth) applies the same gate.
  - `/api/ops/employee-accept-invite` already gated since invite-flow.
- **`/app/backend/start_engine.py`** — full router (`/api/start-engine/*`):
  - `POST /status` · `POST /path-leads` · `POST /path-import` · `POST /path-explore` ·
    `POST /complete` · `POST /reset` (founder) · **NEW** `POST /analytics` (founder).
  - `path-leads` generates 10-50 plan-aware seed leads → `leads_registry` LOCKED to user,
    sets `first_lead_generated_at`, dispatches autopilot, returns
    `redirect: /portal/ops?mode=autopilot_ready`.
  - Plan-tier limit table: startup_starter 10/day · startup_growth 25/day · startup_pro
    50/day (with follow-ups + multi-sender + hot-lead toggles).
- **`/app/backend/lead_registry.py`** · `update_status()` now also stamps the OWNER user's
  `first_email_sent_at` (when status=contacted) and `first_reply_received_at` (when status
  in responded/meeting_set), powering the analytics card.
- **`/app/backend/avatar.py`** · Revenue role prompt + pricing context updated:
  - Recommend Starter Launch ($29) / Growth Launch ($79) / Pro Launch ($149) for
    new/anonymous users with my_leads=0.
  - Recommend Standard Starter / Growth / Pro ($97/$297/$597) for users with teams or
    >25 leads.
  - `open_pricing` action now accepts `plan` ∈ {startup_starter, startup_growth, startup_pro,
    starter, growth, pro}.
- **`/app/backend/server.py`** · `SUBSCRIPTIONS` map already includes 3 startup plan keys
  with `STRIPE_PRICE_STARTUP_*_MONTHLY` env vars. Endpoint returns graceful 503 if env
  unset (verified — no crash).

### Frontend changes
- **`/app/frontend/src/pages/PricingPage.jsx`** · New "For New Businesses" section above
  existing tiers: 3 emerald-bordered cards ($29 / $79 most-picked / $149) with feature
  bullets, separator strip "For Established Operators", existing 4-tier grid below.
- **`/app/frontend/src/pages/PortalOpsPage.jsx`**
  - **`<UpgradeBanner>`** with hybrid trigger: shows when user is on a startup tier AND
    (≥80% of daily limit hit OR 7+ days since onboarding_completed_at OR forced=true).
    Hides for non-startup-tier users, dismissable via session-storage flag.
  - **`<StartEngineAnalyticsCard>`** founder-only — onboarded count, lead-gen %, autopilot
    dispatch %, avg time-to-first-reply, path distribution bars, first-email/first-reply
    counters. Mounted inside `PerformanceTab` after `<SectionHeader>`.
- **`/app/frontend/src/lib/api.js`** · added `startEngineAnalytics({email,token})`.
- **`/app/frontend/src/pages/StartEnginePage.jsx`** · 3-path activation screen (was already
  scaffolded in last fork; verified working).

### Verified live (testing agent iteration 32)
```
✓ POST /api/ops/founder-access → role=founder · redirect=/portal/ops
✓ POST /api/ops/me  (founder) → onboarding_complete=true · onboarding_redirect=/portal/ops
✓ POST /api/start-engine/status → ok · plan_limits returned · default 10 leads/day
✓ POST /api/start-engine/path-leads → target_count=10 · autopilot_dispatched=true
   redirect=/portal/ops?mode=autopilot_ready
✓ POST /api/start-engine/path-import → redirect=/portal/ops?mode=import
✓ POST /api/start-engine/path-explore → redirect=/portal/ops?mode=demo
✓ POST /api/start-engine/analytics → users_total_gated, completed, per_path %,
   autopilot_dispatched_rate_pct, lead_generation_rate_pct, recent_runs returned
✓ POST /api/checkout/subscription startup_launch_monthly → 503 graceful (price ID unset)
✓ POST /api/avatar/chat "I'm a brand new business, what should I pay?"
   → reply mentions Starter Launch / $29 / startup tier
✓ /pricing renders 'For New Businesses' section with 3 tiles + Standard tiers below
✓ /portal/ops Performance tab → upgrade-banner correctly hidden for founder (no plan_tier)
✓ 13/13 pytest assertions in /app/backend/tests/test_iter54_start_engine.py
```

### Files touched
- `/app/backend/ops_center.py` · `_strip()`, `/otp/verify`, `/access-link/consume`
- `/app/backend/start_engine.py` · `/analytics` endpoint added (lines ~265-360)
- `/app/backend/lead_registry.py` · `update_status()` writes user activation timestamps
- `/app/backend/avatar.py` · Revenue role prompt + pricing context + open_pricing whitelist
- `/app/frontend/src/pages/PricingPage.jsx` · Startup tier section + subscribeStartup
- `/app/frontend/src/pages/PortalOpsPage.jsx` · UpgradeBanner + StartEngineAnalyticsCard
- `/app/frontend/src/lib/api.js` · `startEngineAnalytics`

### Outstanding / backlog (P1 — only Jeffrey can do)
- Mint 3 recurring Stripe Prices for Starter Launch ($29), Growth Launch ($79), Pro Launch
  ($149). Paste price_... IDs into `/app/backend/.env` as
  `STRIPE_PRICE_STARTUP_LAUNCH_MONTHLY`, `STRIPE_PRICE_STARTUP_GROWTH_MONTHLY`,
  `STRIPE_PRICE_STARTUP_PRO_MONTHLY`. Backend already routes these correctly.
- Add `RESEND_API_KEY` and `IMAP_HOST/USER/PASSWORD` for live email + reply detection.
- Live external lead APIs (Apollo / Outscraper / Clay / Instantly / Smartlead) — adapter
  shells already wired in `lead_sources.py`.

### Completed in prior iterations (compact)
- Iter 53 — Avatar Escalations triage admin panel + status pipeline
- Iter 52 — Avatar Intelligence Layer (multi-agent orchestrator + chat widget)
- Iter 51 — Universal Lead Intake (CSV/manual + global dedup + exclusive ownership)
- Iter 50 — Demo-First force-reply Day 0 + +45min bumps + 5-sender rotation +
  Hot Leads push button + tracking pixel + Resend webhook + AI reply classifier
- Iter 49 — Demo-First cadence (Day 0/1/3/7), auto-deal creation with industry
  pipeline values, 3-bucket reply classifier
- Iter 48 — Calendly integration end-to-end + reply-YES auto-send + e2e self-test
- Iter 47 — Demo soft-gate capture + warm prospect auto-injection + dashboard KPIs
- Iter 46 — Education vertical + demo delivery tracking
- Iter 45 — Performance dashboard wired to outbound engine
- Iter 44 — Low Credit Mode + KPI source toggle
- Iter 43 — Diagnostics + Admin migration + verified execution
- Iter 42 — Internal lead generator + simulated-send mode + fire-and-forget autopilot
- Iter 41 — Daily autopilot loop + 5 lead-source adapter shells + Clay webhook +
  4-email cadence + 8-category reply taxonomy + founder SMS notification
- Earlier iters → see git log

---

## 🔵 NEXT-ACTION ROADMAP (Prioritized)

**P0 (Jeffrey) — unblocks live revenue from new tiers**
- Mint Stripe Prices for $29 / $79 / $149 monthly + paste price_... IDs into backend/.env

**P1 (Jeffrey) — unblocks live email/reply path**
- `RESEND_API_KEY` + `IMAP_HOST/USER/PASSWORD` in production .env
- Verify SPF/DKIM/DMARC on creatorboostai.com
- Configure Resend webhook URL + secret

**P1 (Agent) — small post-Iter-54 polish**
- Add UpgradeBanner to ALL portal tabs (currently only Performance) — wrap in main render
- Wire `forced=true` trigger to a "Scale / Upgrade" button in Sidebar so users can opt-in

**P2 — backlog**
- Live external API integrations (Apollo / Outscraper / Clay / Instantly / Smartlead)
- Multi-tenant lead registry + commission attribution
- Refactor outbound.py (split sender pool / cadence / scheduler into modules)
- Apply `<SoftGateModal>` to remaining 6 cinematic demos
- LinkedIn auto-channel
- PayPal Business secondary payments

---

## 🧠 TECH STACK (unchanged)
- Backend: FastAPI + Motor (MongoDB) + Claude Sonnet/Haiku 4.5 via emergentintegrations
- Frontend: React + Vite + Tailwind + shadcn/ui + lucide-react + sonner
- Payments: Stripe live (Iter 38) + emergentintegrations Stripe wrapper
- Email: Resend (live key needed) + IMAP poller for replies
- SMS: Twilio (configured, founder-phone alerts)
- Auth: OTP (email/SMS) + magic-link recovery + master-key bypass for founder/executive
