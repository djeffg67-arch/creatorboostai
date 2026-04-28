# CreatorBoostAI + BodyIQ-AI — Master PRD & Handoff

**Last update:** 2026-04-28 (Iter 27 — Real Email + SMS OTP + Founder Admin CRUD + Truthful Delivery Status)

---

## 🆕 ITER 27 (2026-04-28) — Real Email/SMS OTP, Founder Admin CRUD, Audit Log, Truthful Delivery

User requested: full real-delivery email+SMS authentication pipeline, no mock/fake "code sent" messaging, phone as a channel option on `/team-access`, founder CRUD over approved users + ability to view per-attempt delivery status + roster management. Founder identity updated to `j.davidg67@gmail.com` / `+16162145861` with sender `info@bodyiq-ai.com`.

**Backend**
- `sms_service.py` (NEW) — Twilio async wrapper that returns structured `{ok, sid, error, configured}` so callers can surface truthful delivery outcomes. Lazy-imports `twilio.rest.Client`; handles invalid number (21211/21614), opt-out (21610), auth (20003). Includes `normalize_phone` (E.164 with US default) + `sms_configured()`.
- `email_service.py` — sender now `info@bodyiq-ai.com` via `SENDER_EMAIL` env. Added `send_otp_code()` branded HTML OTP template. Added `send_founder_notification()` for internal alerts. Added `send_raw()` public helper + `email_delivery_available()` so callers can tell misconfig from failure.
- `ops_center.py`:
  - `OtpRequest` extended with `channel: "email"|"sms"` + `phone?: str`.
  - `/api/ops/otp/request` rewritten — branches on channel, requires phone match against user.phone for SMS, returns `{sent, delivery_ok, channel, destination_masked, expires_in_sec, resend_cooldown_sec, retry_after_sec?, message}`. No fake success: when Resend/Twilio keys are missing, truthfully returns `sent: false` + human-readable error. Anti-enumeration preserved (unknown emails return the same generic shape).
  - New 30s resend cooldown + 5-attempt lockout on wrong codes + structured dev-mode echo (`OTP_DEV_RETURN_CODE=true` only when delivery failed).
  - `ops_login_attempts` (NEW collection) logs every OTP request/verify with outcome (`sent`, `delivery_failed`, `verified`, `invalid_code`, `expired`, `rate_limited`, `user_not_found`, `role_mismatch`, `inactive`, `trusted_device`), channel, `delivery_ok`, `provider_id` (Twilio SID or Resend id).
  - `_mask_destination()` helper — shows `j.***@gmail.com` / `+1***2145861` in UI confirmations.
  - Founder admin CRUD (founder-only):
    - `POST /api/ops/admin/users/list` — users + trusted_device_count, strips `portal_token`/`trusted_devices` from response
    - `POST /api/ops/admin/users/upsert` — add or update email/name/phone/role/active; phone normalized + validated E.164
    - `POST /api/ops/admin/users/deactivate` — cannot deactivate founder
    - `POST /api/ops/admin/users/reset-access` — rotates portal_token, clears trusted_devices, invalidates outstanding magic links
    - `POST /api/ops/admin/login-attempts` — paginated audit log (optional `outcome` filter) + header totals
    - `POST /api/ops/admin/delivery-status` — returns `{email: {configured, provider, sender}, sms: {configured, provider, from_number}}`
  - Every admin action logged to `ops_admin_audit` (actor, action, target, timestamp).
- `.env` — `FOUNDER_EMAIL=j.davidg67@gmail.com`, `FOUNDER_PHONE=+16162145861`, `SENDER_EMAIL=info@bodyiq-ai.com`, `REPLY_TO_EMAIL=info@bodyiq-ai.com`, placeholders for `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
- `server.py` — `/api/leads` now fires `send_founder_notification()` to `FOUNDER_EMAIL` on every real lead capture (skips synthetic reservation rows). Best-effort — never raises.
- `requirements.txt` — `twilio==9.4.5` added.

**Frontend**
- `TeamAccessPage.jsx`:
  - Channel radio: **Email** / **Text message** (`team-channel-email` / `team-channel-sms`).
  - Phone field shown only when SMS selected (`team-phone-input`). Must match user's phone on file.
  - OTP step shows: channel + masked destination confirmation pill ("Code sent via SMS to +1***2145861"), code-expiry countdown (`team-code-expires`), 30s resend cooldown on the Resend button (`team-resend-code` disabled with "Resend in Ns"), inline red error band for invalid codes (`team-otp-error`).
  - Toast messages now surface truthful backend messages — no "Code sent" unless backend confirmed delivery.
- `PortalOpsPage.jsx`:
  - New **Admin** tab (sidebar nav `nav-admin`, founder-only via `me.scopes.can_see_settings`).
  - Delivery-status pills: green "Live delivery ready" when configured, amber "Not configured — add keys to .env" when not. Shows sender email + Twilio from-number.
  - User upsert form (email, name, phone E.164, role dropdown) → table with reset / deactivate actions.
  - Login-attempts panel: totals tiles (Total/Verified/Delivery-failed/Invalid-code) + outcome filter + refresh + timestamped audit table with channel badges and `OutcomeBadge` component (color-coded by outcome).
- `lib/api.js` — 6 new helpers: `opsAdminUsersList`, `opsAdminUsersUpsert`, `opsAdminUsersDeactivate`, `opsAdminUsersResetAccess`, `opsAdminLoginAttempts`, `opsAdminDeliveryStatus`.

**Verified via curl + Playwright**
- ✅ `POST /founder-access` — creates `j.davidg67@gmail.com` with `phone: +16162145861`
- ✅ `POST /otp/request email` (no RESEND key) → truthful `{sent: false, delivery_ok: false, message: "Email delivery not configured yet..."}`
- ✅ `POST /otp/request sms` (no TWILIO keys, within cooldown) → `{sent: false, retry_after_sec: 29}` — rate limit working
- ✅ `POST /admin/delivery-status` → email.configured=false (sender=info@bodyiq-ai.com), sms.configured=false
- ✅ `POST /admin/users/list` → founder row has phone, exec/employee rows include trusted_device_count
- ✅ `POST /admin/login-attempts` → returns attempts + totals, tracks both delivery_failed and rate_limited correctly
- ✅ Frontend channel picker switches email↔SMS, phone field appears, truthful error toast shown, Admin tab renders with all 4 sub-panels (delivery_status, upsert_form, users_table, attempts_panel)

**Still pending (waiting on user)**
- 🔑 `RESEND_API_KEY` — user said "already created", not yet pasted. Until it's in `.env`, email OTP returns truthful "not configured" error.
- 🔑 `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` — none provided. Until all three are set, SMS OTP returns truthful "not configured" error.
- 🌐 Domain verification — user stated "domain is verified" for Resend; once key lands we can verify the `info@bodyiq-ai.com` sender renders correctly (Resend dashboard logs will confirm delivery).
- 📱 **Test instructions the moment keys arrive**: Paste the 4 secrets into `/app/backend/.env`, restart backend, then re-run `POST /api/ops/otp/request` with `{"role":"founder","email":"j.davidg67@gmail.com","channel":"email"}` — expect `delivery_ok: true` and a real inbox delivery. Then `channel: "sms"` + `phone: "+16162145861"` for SMS.

---

## 🆕 ITER 26c (2026-04-28) — Team-Access Resend Access Link (RBAC Magic Link)

User requested a role-aware self-serve recovery flow on `/team-access` — a parallel to Iter 26b's `/portal` magic link but scoped to the three ops roles (founder / executive / employee). All three land back on `/portal/ops` with the correct RBAC scopes once consumed.

**Backend — `/app/backend/ops_center.py`**
- 2 new endpoints under `/api/ops/access-link/*`:
  - `POST /request` (`AccessLinkRequest`: `email`, optional `origin_url`) — mints a fresh one-time magic token, invalidates any prior unused tokens for the same email, sends the branded email via the existing `_OpsEmailAdapter`, logs every request to `ops_access_link_requests`. Returns identical `{ok, message}` generic response regardless of account existence / rate-limit / role-mismatch. Rate limit: 60s between requests per email (silent — still returns generic 200).
  - `POST /consume` (`AccessLinkConsume`: `magic_token`) — validates the token (exists, not used, not expired, user still exists with a valid ops role). Marks token consumed atomically. Returns `{email, name, role, token (portal_token), redirect: "/portal/ops"}` — same shape as `founder-access` / `executive-access` / `employee-accept-invite`. HTTP 404 / 410 / 403 on invalid / used / expired / role-changed.
- New Pydantic models `AccessLinkRequest` + `AccessLinkConsume` (min token length 16 chars to reject obvious garbage).
- New MongoDB collections: `ops_access_link_tokens` (payload: `id`, `magic_token`, `email`, `role`, `expires_at`, `used`, `created_at`, plus consume-time fields `consumed_at` / `consumption_outcome` / `invalidated_at` / `invalidation_reason`) and `ops_access_link_requests` (audit log: `email`, `role`, `status`, `ip`, `created_at`).
- Token TTL: **15 minutes**. Single-use enforced at consume time.
- Role never trusted from the client — always resolved server-side from `users.role` at mint time AND re-verified at consume time. If the user's role changes between mint and consume, the token is invalidated with `consumption_outcome="role_changed"`.
- Email template: brand-styled HTML with big "Open dashboard →" CTA, role label, 15-min expiry notice, and "ignore this email if you didn't request it" footer. Falls back to log-only if `RESEND_API_KEY` is unset.

**Frontend — `/app/frontend/src/pages/TeamAccessPage.jsx` + `/app/frontend/src/lib/api.js`**
- Two new helpers in `api.js`: `opsAccessLinkRequest({email, origin_url})` + `opsAccessLinkConsume(magic_token)`.
- New `useEffect` on `TeamAccessPage` that checks `?magic=<token>` on mount → auto-consumes → persists session (`cb_ops_session`) → toast → `navigate("/portal/ops")`. Mirrors the existing `?invite=<token>` auto-accept for employees but works for all three roles.
- New collapsible UI section `data-testid="team-resend-access-link"` rendered below the email input (on email step only). Toggle copy: **"Forgot access? Resend my access link"**. Pre-fills from the login email if user typed one. On submit → swaps to a cyan confirmation card (`team-resend-sent`) with the identical generic message as the backend, plus a sonner toast. Test IDs: `team-resend-toggle`, `team-resend-email`, `team-resend-submit`, `team-resend-sent`.
- Coexists with — does not replace — existing OTP + master-key + invite-token flows. All four paths remain live.

**Verified end-to-end**
- ✅ `POST /request` — founder email → 200 generic + email triggered (logged `[email disabled]` without Resend key); unknown email → identical 200 generic + no send; rate-limited retry → identical 200 generic + no send
- ✅ `POST /consume` — bogus token → 404; 15-char garbage → 422 (min_length); valid token → correct `{email, name, role: "founder", token, redirect: "/portal/ops"}`; re-consume of same token → 410 Gone
- ✅ UI — `/team-access?role=founder` renders resend panel, toggle expand works, email pre-fills from login field, submit swaps to confirmation card, toast fires
- ✅ `?magic=<token>` in URL → auto-consumes on mount + redirects to `/portal/ops` (same pattern as `?invite=`)
- ✅ Lint clean (Python + JavaScript)
- ✅ Backend restarts cleanly

**Security posture**
- No email enumeration — identical response shape for valid / invalid / rate-limited emails
- No role / key exposure — role resolved server-side, never in query params or client-visible responses before token consumption
- 15-min TTL + single-use token prevents link hijacking
- Superseding request invalidates prior unused tokens (defense-in-depth against multi-mint attacks)
- Every request logged to `ops_access_link_requests` for audit / abuse tracking

**User-visible copy (in `/team-access`)**
> **Forgot access? Resend my access link**
> Enter the email on file — we'll send a fresh one-time sign-in link that routes you straight into your dashboard. Links expire in 15 minutes and can only be used once.

---

## 🆕 ITER 26b (2026-04-28) — Resend Magic Link (/portal recovery — Customer Portal)

User asked for a password-reset-style recovery for buyers who lose the welcome email. Shipped on the same day as Iter 26a.

**Backend — `/app/backend/server.py`**
- New endpoint `POST /api/portal/resend-magic-link` (model `ResendMagicLinkRequest`: `email`, optional `origin_url`). Re-sends the welcome-with-access email if an account exists. Always returns `{ok: true, message: "If that email has an account with us, a fresh access link is on the way."}` regardless of account existence — prevents email enumeration.
- Simple in-memory rate limit: 1 send per email per 60s (module-level `_MAGIC_LINK_RATE_LIMIT` dict + `_MAGIC_LINK_COOLDOWN` timedelta). Still returns 200 on rate-limit hit (no timing signal).
- Does NOT rotate `portal_token` on resend — existing bookmarks / sessions remain valid. A separate "rotate token" flow can be added later for compromise recovery.

**Frontend — `/app/frontend/src/pages/PortalPage.jsx`**
- New `<ResendMagicLink defaultEmail={form.email} />` component rendered on BOTH the login view and the just-paid welcome view. Features:
  - Auto-fills from the main login form's email field
  - Cyan `Send` icon + "LOST YOUR ACCESS EMAIL?" header matching brand mono-style
  - On submit → swaps to a cyan confirmation card (`portal-resend-sent`) with the generic message
  - Toast notification via sonner
  - Test IDs: `portal-resend-magic-link`, `portal-resend-email`, `portal-resend-submit`, `portal-resend-sent`
- `portalResendMagicLink()` helper added to `/app/frontend/src/lib/api.js`

**Verified**
- ✅ Real email (founder) → 200 + welcome email triggered (logged as `[email disabled]` until RESEND_API_KEY lands)
- ✅ Fake email → 200 + identical generic message + NO email send logged
- ✅ Immediate retry (rate-limit) → 200 + identical generic message + NO email send logged
- ✅ UI: login view + resend panel + confirmation swap all render cleanly at 1920×1000

---

## 🆕 ITER 26 (2026-04-28) — Stripe Phase 4: Magic-Link Onboarding + Entitlement Gating

User requested completion of Phase 4 — turning a paid Stripe checkout into a seamless, gated product-access experience. Previously, `_grant_access_for_txn` created the user + portal_token on webhook, but buyers had no way to actually reach their portal (the emailed confirmations were generic). This iter wires up the full onboarding path.

**Backend — `/app/backend/server.py` + `/app/backend/email_service.py`**
- New email template `send_welcome_with_access(email, product_name, kind, portal_magic_url, portal_token)` in `email_service.py` — dark-brand HTML with a big "Open My Portal →" CTA + the raw access token as a fallback for manual login. Graceful no-op if `RESEND_API_KEY` is unset.
- `_grant_access_for_txn` now sends the welcome-with-access email for BOTH new and existing users (idempotent per `session_id`). Returning buyers of additional products still get a magic link for convenience.
- New helper `_magic_url(origin, email, token, redirect?)` builds `{origin}/portal/magic?email=...&token=...` with URL-encoded params.
- `origin_url` now persisted on every `payment_transactions` doc so the webhook pathway can build a correctly-prefixed magic link even when the webhook fires before the session is fetched back.
- 2 new API endpoints:
  - `POST /api/portal/entitlement-check` — auth via `email+token`, takes `product_key` OR `product_type`, returns `{entitled: bool, entitlement, email}`. Includes `_entitlement_is_active()` + `_matches()` helpers that honor subscription status (`active`/`trialing` only) while treating one-time entitlements as permanent.
  - `POST /api/portal/signal-pack-download` — auth-gated; picks highest owned tier (enterprise > pro > standard) and returns `{entitled, tier, label, download_url, pending, note}`. Returns `402` if the user has no pack entitlement. Download URLs are read from new env vars `SIGNAL_PACK_STANDARD_URL` / `SIGNAL_PACK_PRO_URL` / `SIGNAL_PACK_ENTERPRISE_URL` — when unset, `pending=true` so UI shows "link coming via email within 24 hours" rather than a dead button.
- Entitlement model now carries a `status` field (defaults to `active`) so subscription deactivation from webhook flows (e.g. `customer.subscription.deleted`) can mark individual entitlements `revoked`/`canceled` without deleting historical records.

**Frontend — 1 new page + 3 updates**
- **NEW** `/app/frontend/src/pages/PortalMagicPage.jsx` → route `/portal/magic` — consumes `?email=...&token=...&redirect=...` from URL, calls `/api/portal/login`, persists session to `localStorage['bodyiq_portal_user']` (same key `/portal` uses), redirects to `/portal` (or `?redirect=`) on success. Shows clear error state with "Try manual login" + "Contact support" CTAs if the token is invalid/expired.
- **UPDATED** `/app/frontend/src/pages/DownloadSignalPackPage.jsx` — now a dual-path page:
  1. If the user has a logged-in portal session (`localStorage`), it calls `/api/portal/signal-pack-download` directly — works with NO `session_id` in URL.
  2. If `session_id` is present (Stripe success redirect), it polls `/checkout/status` until paid, THEN re-tries the entitlement endpoint (the webhook should have created the user by then).
  - Download button renders `<a target="_blank">` when `download_url` is available; otherwise renders a locked "Delivery pending" pill + amber 24hr-email note. Tier label ("STANDARD"/"PRO"/"ENTERPRISE") surfaced in copy.
- **UPDATED** `/app/frontend/src/pages/PortalPage.jsx` — entitlement cards now render a new `<EntitlementCard>` helper with per-product CTAs:
  - Signal Pack tiers → "Download pack" button that calls `portalSignalPackDownload()`, opens signed URL in new tab, or shows amber "Delivery pending" state with the backend-supplied note
  - Forensic Library → "Open library" link to `/forensic-library`
  - Training tiers → "Training details" link to `/training`
  - Subscriptions → "Active" pill badge
- **UPDATED** `/app/frontend/src/lib/api.js` — added `portalEntitlementCheck()` + `portalSignalPackDownload()` helpers.
- **UPDATED** `/app/frontend/src/App.js` — registered `/portal/magic` route.

**Verified**
- ✅ `POST /api/portal/entitlement-check` → 401 on bad creds, correct `{entitled: true, entitlement: {...}}` shape on founder creds with product_key=signal_pack_pro
- ✅ `POST /api/portal/signal-pack-download` → 401 on bad creds, correct tier-priority pick on founder (enterprise > pro > standard) with `pending=true` + note when env URLs unset
- ✅ `/portal` dashboard renders 16 entitlement cards for the founder with correct per-product CTAs (Training / Library / Download / Subscription pill)
- ✅ Clicking "Download pack" triggers download endpoint → renders `Delivery pending` + amber note inline on the card when no signed URL is configured (graceful, no broken link)
- ✅ `/portal/magic?email=bad&token=bad` renders clear error state with fallback CTAs
- ✅ Lint clean across all modified files (Python + JavaScript)
- ✅ Backend services restart cleanly

**Env vars (optional — for actual signal pack delivery)**
```
SIGNAL_PACK_STANDARD_URL=<signed-S3-or-CDN-url>
SIGNAL_PACK_PRO_URL=<signed-url>
SIGNAL_PACK_ENTERPRISE_URL=<signed-url>
```
When unset, entitlement-check still works; download endpoint returns `pending=true` so users see a graceful "email coming within 24 hours" state. This means the product is fully launch-ready even before content is uploaded to S3/CDN.

**Testing — user selected "B: skip testing, start Phase 4" — testing agent NOT invoked.** Endpoints + pages verified via curl + screenshot. Future work: wire an integration test suite when content delivery URLs land.

**Still pending (P0 for live launch)**
- Stripe live keys (`STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, 6 Price IDs) — blocks actual purchases
- `RESEND_API_KEY` — blocks welcome-with-access email delivery
- Signal Pack CDN/S3 upload + `SIGNAL_PACK_*_URL` env vars — blocks direct-click download (graceful fallback in place)

---

## 🆕 ITER 25 (2026-02-27 — implemented by previous fork, documented here) — Unified Team Access + OTP Login + Responsiveness Sweep

Previous fork agent shipped but did not commit a PRD entry. Summary based on handoff:
- **`/team-access` page** — unified OTP (Email/SMS scaffolding) login entry with trusted device tracking.
- **Backend OTP endpoints** — `POST /api/ops/otp/request` + `POST /api/ops/otp/verify` in `ops_center.py`.
- **Server-side logout + rotating portal tokens** — `users.trusted_devices` collection added.
- **Mobile responsiveness sweep** — Navbar stack, dashboard grid adaptation on `/portal/ops` + `/portal/lighting`.
- **Status:** Shipped & visually verified by previous agent. **User elected to skip regression testing agent** in favor of Phase 4 work — Iter 26.

---

## 🆕 ITER 24 (2026-02-27) — Three-Role Operating Center (/portal/ops) with Magic-Link Access

User required three live roles (founder / executive / employee), each with its own magic-link access route and a fully functional operating dashboard (leads, outreach, demos, AI assistant, performance) — not placeholders.

**Backend** — `/app/backend/ops_center.py` (NEW · 480 LOC)
- 3 roles + RBAC scoping via `_scope_for(user)`, `_require_auth`, `_require_elevated`, `_require_founder`
- Module-scope Pydantic models (`OpsAuth`, `LeadCreate`, etc.) with renamed fields (`contact_name`/`contact_email`/`contact_phone`) to avoid collisions with inherited auth fields
- MongoDB collections added: `ops_leads`, `ops_outreach`, `ops_demo_links`, `ops_invites`, `ops_ai_log`
- 14 endpoints under `/api/ops/*`:
  - Magic-link auth: `POST /founder-access`, `POST /executive-access`, `POST /employee-accept-invite`, `POST /me`
  - Leads: `POST /leads/list|create|status|note|task|reassign`
  - Outreach: `POST /outreach/send|list` (Resend-backed; graceful fail without API key)
  - Demo links: `POST /demo-links/create|list` (integrates with existing `/api/r/{share_id}` tracker)
  - Performance: `POST /performance` (leads by status, pipeline value, won value, win rate, outreach count, demo count)
  - AI assistant: `POST /ai/chat` (Claude Sonnet 4.5 via `emergentintegrations` + `EMERGENT_LLM_KEY`) with per-user session logging
  - Employees: `POST /employees/list` (elevated), `POST /employees/invite` (founder only)
- RBAC enforced at every endpoint; employee visibility scoped to `assigned_to_email = self`; executive sees all but cannot invite or access settings
- New env var: `EXECUTIVE_KEY=erin-flanigan-2026-executive-president-master`

**Frontend** — 2 new pages
- `/app/frontend/src/pages/PortalOpsPage.jsx` — unified operating dashboard with role-gated sidebar (7 tabs for founder, 6 for executive, 5 for employee). Login screen with 3 role tabs. Tabs: Performance · Leads · Outreach · Demo Links · AI Assistant · Employees (elevated) · Settings (founder)
- `/app/frontend/src/pages/AccessLinkPage.jsx` — shared component that powers `/founder-access`, `/executive-access`, `/employee-access` routes. Accepts `?key=` or `?token=` via URL, auto-authenticates, persists session in `localStorage['cb_ops_session']`, redirects to `/portal/ops`. Falls back to manual-entry form if the param is missing or invalid.

**Routes registered**
- `/portal/ops`
- `/founder-access`
- `/executive-access`
- `/employee-access`

**Verified end-to-end**
- ✅ Founder magic link → signed in as `founder` → sees all 7 tabs
- ✅ Executive magic link (Erin Flanigan) → signed in as `executive` → sees leads + all employees · blocked from `/employees/invite` with 403 "Founder role required"
- ✅ Founder invites employee by email → invite token minted → employee accepts → role set to `employee` → sees only own scope
- ✅ Create lead → list leads → performance tiles reflect the 1 lead + $48K pipeline in the founder view
- ✅ Claude Sonnet AI assistant endpoint wired via `emergentintegrations` with session persistence
- ✅ Lint clean across all new files (caught 1 React hooks rule violation during build — `useMemo` called conditionally — fixed by hoisting above early returns)

**Credentials documented** in `/app/memory/test_credentials.md` with all 3 role URLs + emails + env-var locations.

**Testing** — user explicitly wants credit conservation; running testing agent NOT invoked. All 14 endpoints verified via curl; all 3 role flows verified live.

**Code review (non-blocking)**
- Add a `lighting` tab inside /portal/ops that composes the existing Lighting Command Center (deep-link for now)
- Email-send via `_OpsEmailAdapter` spawns a new event loop per send; migrate to a background task when we add live Resend key
- Add commission model (% of won deals) once commission formula is confirmed

---

## 🆕 ITER 23 (2026-02-27) — Demo Audio Bug Fix (all 5 demos) + Creator Send-Demo CTA

User reported three critical bugs across all 5 demos:
1. **Demos stop mid-play** — auto-advance failed silently when blob/network errors occurred
2. **Two voices on pause/resume** — speech-synthesis utterances and `<audio>` element ran in parallel after toggling pause
3. **Audio kept playing after closing the site** — page-hide/tab-close events didn't silence both engines

Plus the user requested a visible "Send Demo to others" CTA at the end of every demo. Every demo already has a closing narrative scene.

**Root causes**
- Timer callbacks captured `paused` in stale closures: `setTimeout(() => { if (!paused) goToNext() })` — when the user later un-paused, the closure still saw `paused=true` and skipped the advance
- `speakScene()` only called `audioRef.current.pause()` before a new scene; if the prior scene used speech-synthesis fallback, the previous utterance kept talking while the new one started → duplicate voices
- The unmount `useEffect` only fired on component unmount — not on `pagehide`, `beforeunload`, or `visibilitychange`. Users navigating away (especially Safari/iOS) left audio playing
- The `<audio>` element had no `error` listener — blob URL load failures stalled the demo

**Fixes shipped**
- New shared module `/app/frontend/src/lib/demoAudioFix.js` exporting `useRefMirror`, `hardSilence(audioRef)`, `useDemoCleanup(audioRef, audioCacheRef)`
- All 5 demo pages updated:
  - Added `pausedRef`/`mutedRef`/`audioCacheRef` mirrors + `useDemoCleanup` hook
  - Replaced inline `audioRef.current.pause()` with `hardSilence(audioRef)` in `speakScene`, `handlePauseResume`, `handleRestart`, `handleMute`
  - Replaced `if (!paused)` → `if (!pausedRef.current)` and `if (paused) return;` → `if (pausedRef.current) return;` in timer/event callbacks
  - Added `error` listener on `<audio>` — auto-advance on blob/network failure
  - Removed stale `useEffect(() => () => {...}, [])` cleanup that captured empty `audioCache` on first render
- `useDemoCleanup` wires `pagehide`, `beforeunload`, `visibilitychange`, unmount handlers; clears `src` + calls `audio.load()` to release buffer; revokes blob URLs
- Creator demo `ClosingCTA` upgraded with full Send-Demo module (`creator-share-module`, `-email`, `-send`, `-copy`, `-qr`) matching Noldus + Supermarket pattern. Realtor / Insurance / Noldus / Supermarket already had share modules

**Verification**
- All 5 demo routes return 200, frontend webpack compiled cleanly
- Lint clean on all modified pages
- User explicitly said "without using more credits" — testing agent NOT invoked. Patches are surgical, mechanically identical across all 5 files, lint-validated

---

## 🆕 ITER 22 (2026-02-27) — Dual-Layer Lighting Upgrade Engine (public showcase + /portal/lighting command center)

User finalized the architecture: CreatorBoostAI = intelligence + financial engine; Koollite = manufacturer + supplier ONLY (no install); customer's existing contractors = execution layer. Built the authenticated command center as a top-level enterprise module.

**Backend extensions to `/app/backend/lighting_engine.py`**
- All 4 Koollite SKUs now show **7-year warranty** per user spec
- New 4-state `LIFECYCLE_STATES` enum: `identified → approved → deployed → savings_verified`
- New collections wired: `lighting_action_ids` (append-only ledger of every state transition with actor + note + timestamp) and `lighting_locations` (auto-upserted per proposal — registers `tenant`, `location_label`, `sqft`, `fixture_count`, `current_action_id`)
- New `_log_lifecycle()`, `_upsert_location()`, `_transition()` helpers
- New endpoints:
  - `POST /api/lighting/proposal/{action_id}/deploy` — transitions to deployed (actor=contractor)
  - `POST /api/lighting/proposal/{action_id}/verify-savings?verified_annual_savings=N` — transitions to savings_verified, persists measured value
  - `GET /api/lighting/proposal/{action_id}/lifecycle` — returns ordered ledger
  - `POST /api/lighting/portal/projects` — authenticated (email + portal_token) returns user's project portfolio + financial decision panel rollup + locations registry + by-status counts
  - `POST /api/lighting/portal/approve` — authenticated Approve Upgrade action (verifies project ownership)
  - `GET /api/lighting/admin/projects` — admin Bearer-gated, supports `?status=` filter, returns summary aggregates
  - `GET /api/lighting/admin/locations` — admin Bearer-gated location registry
  - `GET /api/lighting/admin/lifecycle/{action_id}` — admin Bearer-gated full ledger
- `make_router(db, verify_admin=verify_admin)` signature update — admin endpoints registered when `verify_admin` is supplied
- Tenant detection: `company || email_domain.lower()` so portal rolls up cleanly

**Frontend** — `/app/frontend/src/pages/PortalLightingPage.jsx` (NEW, ~450 LOC)
- Authenticated route at `/portal/lighting`
- LoginScreen with email + portal_token (data-testids `lighting-portal-login`, `portal-lighting-login-email`, `portal-lighting-login-token`, `portal-lighting-login-submit`)
- CommandCenter shell: Header (tenant + email), Decision Panel (5 tiles: Action IDs / Total project cost / Annual savings / Annual payment / Net cash flow), Lifecycle distribution summary, neutrality strip (3 chips: Intelligence / Supply / Execution), Filterable project list (`filter-all`/`filter-identified`/`filter-approved`/`filter-deployed`/`filter-savings_verified`), Project rows with Approve Upgrade button + Lifecycle ledger toggle, Locations registry table
- localStorage persistence (`bodyiq_portal_user`) — auto-rehydrates on refresh
- Sign-out + "Run a new proposal" CTA back to public engine

**Public showcase** — added `cta-portal-command-center` button in `/lighting-upgrade-engine` hero so authenticated buyers can jump to the command center

**Verification (Iter 22 testing report)** — **100% pass**
- Backend: 17/17 pytest (`/app/backend/tests/test_lighting_iter22.py`)
- Frontend: full E2E login → command center → approve → lifecycle → signOut flow verified with real founder credentials
- Mobile 390×844 zero horizontal overflow
- All 4 SKUs show "7-yr warranty" on public catalog

**Test credentials documented** in `/app/memory/test_credentials.md` — Founder bypass mints rotating email + portal_token usable on `/portal/lighting`

**Code review (non-blocking)**
- `lighting_engine.py` now 645 LOC — approaching 700-line threshold for module split
- `verify-savings` endpoint doesn't enforce strict state ordering (could allow identified→savings_verified jump)
- Portal token has no expiry/rotation beyond founder refresh — acceptable for current usage
- Actor strings ad-hoc — could become an Enum

---

## 🆕 ITER 21 (2026-02-27) — Lighting Upgrade Engine (CreatorBoostAI × Koollite)

User commissioned a brand-new financial intelligence module that separates three layers:
- **Intelligence** = CreatorBoostAI (this engine)
- **Product Supply** = Koollite (manufacturer + supplier ONLY — no install)
- **Execution** = Customer's existing contractors

**Backend** — `/app/backend/lighting_engine.py` (NEW, 450 LOC)
- 4 Koollite SKUs hardcoded: KL-HB-150 ($285, 7yr), KL-LP-60 ($142, 5yr), KL-RC-22 ($78, 5yr), KL-CN-200 ($325, 7yr)
- Pure `_compute()` calculator: total_project_cost = fixtures + 22% install estimate; energy savings = (current_W − Koollite_W) × hours/yr × $/kWh; maintenance savings = 85% of input; subscription = 12% blended financing premium spread across term
- Action ID format: `CBLU-XXXX-XXXX` (alphabet excludes I/O/0/1)
- Endpoints registered under `/api/lighting/*`:
  - `GET /skus` — catalog + manufacturer attribution
  - `POST /proposal` — generate + persist proposal with Action ID
  - `GET /proposal/{action_id}` — fetch by Action ID
  - `POST /proposal/{action_id}/approve` — flip status to approved
  - `GET /portfolio` — single-tenant 184-store rollup across 6 regions (Northeast/Southeast/Midwest/SC/West/PNW)
  - `POST /warranty-event` — create warranty event tied to Action ID + SKU
  - `GET /warranty-events` — list events (filter by action_id)
  - `POST /notify-contractor` — notify customer's contractor (records neutrality_disclaimer; updates linked warranty event to `routed_to_contractor`)
  - `GET /stats` — aggregate counts
- MongoDB collections: `lighting_projects`, `lighting_warranty_events`, `lighting_contractor_notifications`
- `_id` correctly excluded from all reads via projection

**Frontend** — `/app/frontend/src/pages/LightingUpgradeEnginePage.jsx` (NEW)
- Public landing page at `/lighting-upgrade-engine` (alias `/lighting`)
- Sections: Hero (4 stat tiles + 3 CTAs) → ThreeLayer architecture (Intelligence/Supply/Execution + amber neutrality strip) → Koollite catalog (4 SKU cards with specs) → Email-gated functional Calculator → ProposalResult (Action ID, headline tiles, deal-structure cards, before/after table, contractor neutrality + warranty messaging) → Multi-location Portfolio rollup (national tiles + regional table + recent Action IDs) → Warranty system (4 coverage tiles + 4-row events table) → Closer
- Mobile-responsive at 390×844 (verified — zero horizontal overflow)
- Calculator pre-fills sample defaults; only email entry required to unlock

**Wiring**
- New route in `App.js`: `/lighting-upgrade-engine` and `/lighting`
- New homepage hero CTA `data-testid="hero-cta-lighting-engine"` (Lightbulb icon + Koollite badge) routing to /lighting-upgrade-engine
- `api.js` extended with 8 lighting helpers

**Hard contract enforced everywhere**
- ZERO labor / install / dispatch language inside CreatorBoostAI
- "Customer's existing contractors handle every installation and service call" — repeated on hero, three-layer, neutrality strip, proposal result, warranty section
- "Koollite is manufacturer and supplier only" — repeated
- Warranty failures fire notifications routed to the customer's contractor (not CreatorBoostAI, not Koollite)
- Each project has unique Action ID tracked from `identified` → `approved` → `deployed` → financial outcome

**Verification (Iter 21 testing report)** — 100% pass
- Backend: 12/12 pytest (`/app/backend/tests/test_lighting_engine.py`)
- Frontend: all required data-testids present, calculator email-gate validation works, proposal generation + approve flow E2E confirmed, regional rollup renders, mobile 390x844 zero overflow, homepage CTA visible
- No regressions: /demo/supermarket and other existing pages still load

**Code review (non-blocking)**
- Subscription premium (12%) and install estimate (22%) are hard-coded — fine for demo, may need tunability if customers request
- `lighting_engine.py` could split to `models.py + compute.py + router.py` if module grows
- Approve button needs scroll_into_view in Playwright tests (cosmetic test concern only)

---

## 🆕 ITER 20 (2026-02-27) — Self-Funding Upgrade System + Warranty Enforcement Scenes (Supermarket Demo finalized)

User finalized the Supermarket / C-Store demo as the primary enterprise sales asset focused PURELY on CreatorBoostAI as an operational intelligence + execution layer (no behavioral / BodyIQ language). Demo extended from 15 → 17 scenes (~14 min runtime).

**New Scene 14: The Self-Funding Upgrade System** (`stage-self-funding`)
- 4-tile savings inflows (Energy waste $1.8M, Repeat service avoided $1.2M, Vendor overcharge $640K, Downtime preserved $980K)
- 3-stat fund summary ($4.62M annualized · $3.18M available pool · $2.33M deployed YTD)
- 4-row upgrade pipeline with funding progress bars (LED retrofit 100% / Walk-in cooler 100% / Refrigeration controller 72% / Loading dock motor 100%)
- "Estimated values · based on operational patterns" disclaimer
- Tagline: "The savings pay for the upgrade. The upgrade compounds the savings."

**New Scene 15: Warranty and Service Control** (`stage-warranty`)
- 3-tier portfolio (Active 2,184 · Expiring 184 · OOW 47 across 2,415 stores)
- 4-row enforcement cases table (WC-4012 to WC-4144) showing service calls cross-checked against active warranties — REPLACE/CLAIM/SCHEDULED/ESCALATION actions
- 3-stat leakage panel (Repairs paid that should have been covered $1.84M baseline · Recovered under enforcement $1.62M · Replacements obligated 412 units)
- Amber disclaimer: "CreatorBoostAI does not perform installation and is not a contractor. All upgrades installed and serviced by qualified third-party partners under their 5–7 year warranty."
- Closing line: **"This is not just warranty coverage. This is warranty enforcement at scale."**

**Renumbering**
- Cost Recovery + Asset Intelligence = Scene 13 (unchanged)
- Self-Funding Upgrade System = Scene 14 (NEW)
- Warranty Enforcement at Scale = Scene 15 (NEW)
- Financial Impact Dashboard = Scene 16 (was 14)
- The Execution Layer for Retail (Closing) = Scene 17 (was 15)

**Wiring**
- `SCENES`, `SCENE_BG_MAP`, `STAGE_BADGES`, `SceneStage` switch all extended with `self-funding` and `warranty` keys
- `SCENE_IMG_RETAIL.selfFunding` + `SCENE_IMG_RETAIL.warranty` added to `/app/frontend/src/lib/images.js`
- All count copy updated 15 → 17 (Hero, StartScreen story arc, stat list, "Approximately 12 to 14 minutes", "Auto-plays · ~14 min")
- New imports: `PiggyBank`, `Coins`, `ShieldCheck`, `BadgeCheck`, `FileCheck2`, `Hammer` (lucide-react)

**Homepage updates**
- Retail industry tile rewritten — **scrubbed of all forbidden vocabulary** (BodyIQ-AI, SRS, CPS, EOS, "shelf hesitation", "behavior") — now reads as a pure operational execution layer pitch
- Retail tile id renamed `retail` → `supermarket-cstore` to fix duplicate React key with the older "Retail & Grocery" tile
- Hero CTA label upgraded to **"Watch Retail Demo"** (with "Supermarket · C-Store" badge), accompanying secondary **"Supermarket & C-Store Demo"** button — both routing to /demo/supermarket
- Runtime aligned to ~14 min across all surfaces

**Verification (Iter 20 testing report)**
- 100% functional pass
- Scene 14, 15, 16, 17 all mount programmatically with zero errors
- Auto-advance Scene 1 → Scene 2 confirmed
- Forbidden-vocab grep on /demo/supermarket: ZERO hits (BodyIQ, SRS, CPS, EOS, behavioral, nonverbal, "human signal")
- Both homepage CTAs render with correct labels and routes
- TTS `/api/tts/speak` returns 200 audio/mpeg for both new scene narrations (153KB / 148KB)
- Lint clean across SupermarketDemoPage.jsx, HomePage.jsx, images.js
- 2 minor design issues from testing agent both **FIXED** (runtime drift + duplicate id)

**Code review notes (non-blocking)**
- `SupermarketDemoPage.jsx` is now ~1759 LOC — extract `SCENES` data and 17 stage components to `/pages/supermarket/scenes/*.jsx` before adding more scenes
- Hoist `SUPERMARKET_DEMO_RUNTIME` literal into a shared constant in `/lib` to prevent cross-page string drift on future scene work

---

## 🆕 ITER 19 (2026-02-27) — Cost Recovery + Asset Intelligence Scene (Supermarket Demo)

User requested a new dedicated scene in the Supermarket / C-Store demo focused on cost recovery and asset intelligence. Demo extended from 14 → 15 scenes.

**New Scene 13: Cost Recovery + Asset Intelligence**
- Inserted between "Maintenance and Facilities" (Scene 12) and "Financial Impact Dashboard" (now Scene 14)
- 60-second narration (Sage TTS) describing how CreatorBoostAI reads purchasing logs, maintenance histories, vendor invoices, and equipment records
- New `<CostRecoveryStage />` component (data-testid `stage-cost-recovery`) renders three structured panels:
  - **6 flag cards** with recommended actions:
    - Repeated service calls (Walk-in cooler · Store 2073 · 3 calls/90d → REPLACE, payback 8.2 mo)
    - Maintenance cost climbing (Reach-in freezer · +34% YoY → REPLACE vs REPAIR queued)
    - End-of-life equipment (HVAC RTU-2 · 14yr · manufacturer EOL → Capital plan, Q3 swap)
    - Lighting upgrade opportunity (T8 → LED · 184 stores · 62% energy cut → Phase 1, ROI 22mo)
    - Refrigeration efficiency (Open-case dairy · door retrofit · 38% energy cut → CFO queue)
    - Vendor overcharging (FilterPro · +18% vs market · $184K overpaid → ESCALATE)
  - **5-row Reactive vs Proactive comparison** (Trigger / Decision / Vendor / Energy / Outcome)
  - **6-tile financial impact panel** ($6.4M cost savings, $3.6M avoided repairs, $3.5M energy, $1.2M vendor recovery, 238% ROI, $2.8M downtime savings)
- Voiceover messaging: "CreatorBoostAI is not just tracking maintenance — it is actively reducing costs and recovering lost money across every store, every vendor, and every asset."

**Wiring updates**
- `SCENES` array — new entry `cost-recovery` (id, narration, fallback_ms 60000) inserted at index 12; `financial-impact` and `closing` renumbered to Scene 14 / Scene 15
- `SCENE_BG_MAP` + `STAGE_BADGES` extended with `cost-recovery` keys
- `SceneStage` switch extended with `case "cost-recovery": return <CostRecoveryStage />`
- `SCENE_IMG_RETAIL.costRecovery` added to `/app/frontend/src/lib/images.js` (electrician/equipment audit Unsplash photo)
- All "14 scenes" copy upgraded to "15 scenes" in Hero, StartScreen story arc, stat list
- New imports: `TrendingUp`, `TrendingDown`, `DollarSign`, `Lightbulb`, `RefreshCcw`, `Snowflake` (lucide-react)

**Verification (Iter 19 testing report)**
- 100% pass · all 5 demos (`/demo/realtor`, `/demo/insurance`, `/demo/creator`, `/demo/noldus`, `/demo/supermarket`) load cleanly
- New Scene 13 renders all 6 flags + 5 comparison rows + 6 financial-impact tiles + recommended actions
- Auto-advance Scene 1 → Scene 2 confirmed; programmatically reached Scene 13/14/15 — all mount
- TTS `/api/tts/speak` returns 200 audio/mpeg (221KB) for the new cost-recovery narration
- StageImage strip visible on Scene 13

**Bugs caught + auto-fixed by testing agent**
- Pre-existing missing `Crown` and `Workflow` lucide-react imports in SupermarketDemoPage.jsx (used by ExecutiveViewStage / Scene 8). Latent — only surfaced once auto-advance reached Scene 8 because ErrorBoundary swallowed the render. Fix added to import list on line 13.

**Code review notes (non-blocking)**
- `SupermarketDemoPage.jsx` is now 1518 LOC — extract `SCENES` data + 15 stage components to `/pages/supermarket/scenes/*.jsx` later
- Add `eslint-plugin-react` `jsx-no-undef` rule or centralize icon imports via barrel module to prevent future missing-import regressions

---

## 🆕 ITER 18 (2026-02-27) — Per-Stage Pictures (Supermarket + Noldus)

(Earlier history retained — see entries below.)

---

## 🆕 ITER 16 (2026-04-27) — Noldus / Investor Cut cinematic demo + Share/QR

**Initial baseline header:** Iter 16 — Noldus / Investor Cut cinematic demo + Share/QR shipped
**Project status:** 🟢 Code-complete. Awaiting Stripe + Resend Live Keys.
**Site URL:** https://bodyiq-training.preview.emergentagent.com
**Supervisor:** backend + frontend RUNNING. Iter 10 testing 12/12 frontend + 2/2 pytest pass.

---

## 🆕 ITER 14 (2026-04-27) — Stripe Phase 1–3 (Catalog + Checkout + Webhooks + Success/Cancel pages)

User requested a Stripe-based payment + onboarding system in TEST mode (Phase 1–3). Built on top of existing emergentintegrations.payments.stripe.checkout wrapper.

**Catalog updates (server.py)**
- `PRODUCTS` now has all 4 training tiers as direct one-time checkouts: `foundations` $400, `applied` $1,500, **`strategy` $7,000 (NEW)**, **`full_training` $27,000 (NEW)** — no longer gated behind application flow.
- `SUBSCRIPTIONS` repriced to user spec: `cb_starter_monthly` $97, `cb_starter_annual` $970, **`cb_growth_monthly` $297 (NEW tier)**, **`cb_growth_annual` $2970 (NEW)**, `cb_pro_monthly` $997, `cb_pro_annual` $9970. Enterprise still routes to /contact.

**Checkout flow**
- One-time `success_url` → `/success?session_id={CHECKOUT_SESSION_ID}&product={key}`
- One-time `cancel_url` → `/cancel?product={key}`
- Subscription `success_url` → `/success?session_id={CHECKOUT_SESSION_ID}&product={plan_key}&type=subscription`
- Subscription `cancel_url` → `/cancel?product={plan_key}`
- Apple Pay / Google Pay auto-enabled by Stripe Checkout (no code needed).

**New pages**
- `/success` (SuccessPage.jsx) — polls `getCheckoutStatus`, swaps copy by product type: training (calendar invite + pre-work), subscription (welcome + portal CTA), library (access instructions). Failed/timeout states route to /pricing or /training.
- `/cancel` (CancelPage.jsx) — clean "no charge" message + smart CTA: subscription cancellations route back to /pricing, training cancellations route to /training.
- `/thank-you` legacy route preserved for backward compatibility.

**Pricing page**
- Now displays 4 tier cards (Starter/Growth/Pro/Enterprise) in responsive 4-col grid. Growth is `featured: true` with "MOST SELECTED" badge.

**Webhook handler** — verified unchanged (handles `checkout.session.completed`, `invoice.paid`, `customer.subscription.created/updated/deleted`, idempotent via `processed_webhook_events` collection).

**Phase 4 access grant** — `_grant_access_for_txn` already auto-creates user with `portal_token` + entitlements on paid checkout. `_trigger_post_purchase_email` sends Resend confirmation (currently in graceful-degrade mode until RESEND_API_KEY lands).

**Testing (iter 14)** — Backend 14/14 pytest pass · Frontend 100% pass · Zero issues · Zero action items.

**Phase 4 next steps (when keys arrive):**
- Mint recurring Price IDs in Stripe Dashboard for the 6 subscription plans → paste into `STRIPE_PRICE_CB_*` env vars.
- Add `STRIPE_WEBHOOK_SECRET` so live webhook signature verification activates.
- Add `RESEND_API_KEY` so onboarding emails actually deliver.

---


## 🆕 ITER 13 (2026-04-27) — Email Click-Tracking + Full 5-Demo Personalization

**Personalization (all 5 demos)**
- Realtor + Insurance demo pages now display dynamic greetings from `?name=&company=` URL params:
  - Hero: badge-style "Welcome, {name} from {company}" (data-testid `realtor-personalized-greeting`, `insurance-personalized-greeting`)
  - StartScreen: heading swaps to "This walkthrough was prepared for {name}." (data-testid `realtor-start-personalized`, `insurance-start-personalized`)
  - AvatarPanel scene 0: bordered cyan card "Hello {name} from {company} — this walkthrough was prepared just for you." (data-testid `avatar-personal-greeting`)
- Creator / Noldus / SITA already shipped in earlier iter — confirmed still working.
- `handleStart` reordered (Realtor / Insurance / Creator) so `setStarted(true)` runs BEFORE awaiting `prefetchAll()` → scene 0 + greeting visible at click-time, audio prefetch streams in background.

**Email click tracking**
- New endpoint: `GET /api/r/{share_id}` → 302 redirects recipient to `demo_url`, atomically `$inc click_count`, sets `first_clicked_at` (only if absent) + `last_clicked_at`. Full audit log in new `demo_share_clicks` collection.
- `POST /api/share-demo` now accepts new `recipient_name` field; auto-appends `?name=&company=&email=` to demo_url via `_append_personalization` helper (preserves existing query string, no double-personalization).
- Email body now uses `tracked_url` (not raw demo_url) so every link click is captured.
- `demo_type` regex extended to accept `sita` in addition to realtor/insurance/creator/noldus/enterprise.

**Admin dashboard**
- New "Demo Email Shares · Click-through" section at `/admin` (data-testid `admin-demo-shares`)
- 4 stat cards: Sent / Queued / Clicked / Click Rate
- Table with: Sent timestamp · Demo · Recipient · Company · Email Status · Clicks · First Click

**Half-view notification trigger** — verified atomically idempotent (fires exactly once on first ≥50% heartbeat; subsequent heartbeats return `half_view_triggered: false`).

**Testing (iter 13)** — Backend 10/10 pytest pass, Frontend ~95% (avatar greeting wiring verified, runtime visibility now fixed by handleStart reorder). Test file: `/app/backend/tests/test_iter13_share_tracking.py`.

**Still pending — P0 Activation:**
- Stripe live `STRIPE_API_KEY` (full `sk_live_...` string — last paste was truncated to `...AkyE`)
- `STRIPE_WEBHOOK_SECRET` (`whsec_...`)
- Resend `RESEND_API_KEY` (`re_...`) + verified `SENDER_EMAIL` domain
- Optional: `FOUNDER_EMAIL` for half-view alerts (currently logs only)

---


## 🆕 ITER 16 (2026-04-27) — Noldus / Investor Demo + Schema Generalization

User requested a specialized cinematic demo for Noldus, enterprise partners, and investor conversations following an exact 11-beat script. Built as a dedicated 12-scene auto-played walkthrough with Share + QR.

**New page: `/demo/noldus` (and `/demo/enterprise` alias)**
- 12 scenes · ~6.5 min total runtime · Nova female-American voice · zero clicks required.
- Scene arc 1:1 with user's script:
  1. Measurement Floor — FaceReader-style live AU/gaze/head-pose capture
  2. The Problem — measurement alone doesn't drive decisions (panel dimmed)
  3. BodyIQ Activation — first signal "Negotiation Friction · 0.62 · AU 4 + AU 7 + Lip Compression"
  4. Signal Cascade — Cognitive Gap + Evaluative Skepticism fire in sequence
  5. Decision Engine — "Do not proceed to close. Provide clarification. Reduce complexity."
  6. CreatorBoostAI Command Center opens with live KPIs
  7. Deal at Risk — Acme Corp · $184K ARR · 78% AI confidence + 3 Suggested Actions + Execute button
  8. Autonomous mode — toggle flips, system executes (email sent, task assigned, CRM updated)
  9. Global Dashboard — US/Europe/Asia · 1,248 sessions · 18,442 signals · $12.4M revenue
  10. Per-Rep Performance grid (Signal Accuracy / Decision Efficiency / Revenue Impact)
  11. Training Mode — recorded interaction with timeline overlays
  12. Closing slate — "Noldus measures. BodyIQ-AI defines. CreatorBoostAI executes. Together = first complete Human Intelligence Execution System."
- Same architecture as Realtor/Insurance/Creator demos: prefetch TTS via `/api/tts/speak` voice=nova → audio.ended + fallback_ms timer drives auto-advance.
- Pause / Resume / Mute / Replay controls + sticky scene header + global timeline + scene index sidebar.

**Share Module** (appears at scene 12 / closing)
- "Send Private Link" via Resend (calls existing `/api/share-demo` with new `demo_type='noldus'`)
- Copy link button
- QR code via `api.qrserver.com` (no library, dark navy + cyan brand colors) — trade-show ready
- Replay button to restart the demo

**Backend schema generalization (`server.py` `ShareDemoRequest`)**
- `demo_type` regex extended: `^(realtor|insurance|creator|noldus|enterprise)$`
- `sender_name` made Optional with default "A colleague"
- `share_target` accepts arbitrary string; if it starts with http(s):// the URL is used verbatim, otherwise behavior preserved (`demo` / `preview`)
- All upstream call sites updated to use `sender_name_clean`
- 2/2 new pytest tests in `/app/backend/tests/test_noldus_share.py` pass; legacy realtor share test remains green.

**Wiring**
- `App.js` — added 2 routes (`/demo/noldus`, `/demo/enterprise`)
- `VerticalPickerPage.jsx` — added 5th card (Cpu icon, "Enterprise · Noldus / Investor Cut", `/demo/noldus`, "12 scenes · ~6.5 min", badge "New · Enterprise")

**Verification (Iter 10 testing report)**
- Frontend: 12/12 review items pass · Scene 1 → Scene 2 auto-advanced in ~15s
- Backend: 2/2 pytest pass — Noldus payload returns 202 with correct URL · Realtor preview regression still works
- Hand-off: Critical share-demo schema bug caught and fixed; PRD now reflects relaxed validator.

**Code review notes (non-blocking)**
- `NoldusDemoPage.jsx` is ~1100 lines — same threshold as `CreatorDemoPage.jsx`. Both use the duplicated cinematic-demo architecture. P3: extract `useCinematicDemo()` hook + shared `<SceneHeader/>`/`<NarrationPanel/>`/`<SceneIndex/>` into `/components/demo/cinematic/` (~400 LOC removable across 4 demo pages).
- Noldus header comment was off-by-one ("11 scenes" vs 12) — corrected.

---

## 🆕 ITER 15 (2026-04-27) — Decision Intelligence Repositioning + 3 New Commerce Flows

User requested full repositioning: BodyIQ-AI = Intelligence Layer, CreatorBoostAI = Execution Layer of one unified Decision Intelligence System. Eliminate "Body Language" framing. Add Signal Pack product, Audit service, Report engagement, Jury legal vertical.

**HomePage rewrite (surgical, single file)**
- Hero kicker → "Decision Intelligence System · Live"
- Hero headline → "The AI System That Turns Human Signals Into Decisions, Insight, and Execution."
- Sub → "detect buying decisions, resistance, confusion, alignment, and decision shifts before they are spoken — and convert those signals into real actions, automation, and revenue outcomes"
- "Not Body Language" section retitled "This Is Not Body Language. This Is Signal Intelligence." with new pillars (Decision Detection, Resistance & Alignment, Decision Shift Mapping, Revenue Outcomes) and the line "We don't interpret people. We measure the signals that drive decisions."
- NEW `signal-execution-section` — two layered cards: Intelligence Layer (BodyIQ-AI) and Execution Layer (CreatorBoostAI) with capability bullet lists.
- NEW `audiences-section` — 6 audience cards (Enterprise Sales, Law Firms, Real Estate, Insurance, Corporate Leaders, Influencers/Negotiators).
- NEW `signal-products-section` — 3 product cards (Signal Pack / Audit / Report) + Jury Signal Intelligence band linking to `/services/jury`.
- NEW `differentiation-section` — "This is not (body language, emotion detection, call analysis, subjective opinion) / This is (objective signal measurement, structured insight, decision intelligence, execution-driven AI)" + closer "We don't need audio. The decision is already visible."

**5 new pages**
- `/products/signal-pack` (`SignalPackPage.jsx`) — BodyIQ-AI Signal Pack Vol. 1: Closing Intelligence. 3 Stripe Checkout tiers ($299 / $499 / $1,500+). Calls existing `createCheckoutSession` with new `product_key`. Includes "Want to see this inside your own meetings?" upsell to `/services/audit`.
- `/services/audit` (`AuditPage.jsx`) — Video Signal Intelligence Audit. 3 tier cards ($1,500 / $3,500 / $7,500+) + lead-capture form (source=`audit_request`). "Video only — we do not analyze phone calls" disclaimer.
- `/services/report` (`ReportPage.jsx`) — Full Signal Intelligence Report ($10K – $35K+). Lead-capture form (source=`report_request`). 4 use-case tiles (sales, trial, negotiation, exec hiring).
- `/services/jury` (`JuryPage.jsx`) — Jury Signal Intelligence. NDA-first, privileged-engagement form (source=`jury_request`). 4 phase analysis sections (opening, testimony, cross, closing).
- `/download/signal-pack` (`DownloadSignalPackPage.jsx`) — post-purchase landing. Polls `/api/checkout/status/{sessionId}`. Granted state shows download CTA + portal link; NotGranted state shows audit upsell. Default = NotGranted (testing agent fix).

**Backend additions (`server.py`)**
- 3 new entries in `PRODUCTS` dict: `signal_pack_standard` ($299), `signal_pack_pro` ($499), `signal_pack_enterprise` ($1500). Type `"signal_pack"`.
- `create_checkout_session` routes `signal_pack` type to `/download/signal-pack?session_id=…` on success (instead of generic `/thank-you`).
- `VALID_SOURCES` whitelist extended with `audit_request`, `report_request`, `jury_request` (testing agent fix).

**Navbar**
- Replaced Training + Apply links with new Signal Pack + Audit primary CTAs (testids: `nav-signal-pack`, `nav-audit`).

**Verification (Iter 9 testing)**
- 100% pass: 15/15 backend pytest tests in `/app/backend/tests/test_iter9_signal_intelligence.py` + all 18 frontend review items.
- 2 bugs auto-fixed by testing agent (VALID_SOURCES whitelist + DownloadSignalPackPage initial state).
- Regression: Realtor/Insurance/Creator demos all still auto-advance Scene 1→2 in ~22–25s.

**Funnel implemented**
HomePage → Signal Pack ($299/$499/$1500) → /download/signal-pack → Audit ($1.5K–$7.5K) → Report ($10K–$35K+) → Enterprise Engagement

**Code review notes (non-blocking)**
- HomePage.jsx now ~700 LOC; could split into `/components/home/*` later.
- AuditPage / ReportPage / JuryPage share a near-identical lead-capture form (~150 LOC dup) — extract `<LeadCaptureForm/>` later.
- VALID_SOURCES whitelist is manually maintained — derive from a shared enum in future.

---

## 🆕 ITER 14 (2026-02-27) — Demo Scene Backdrops

User asked to extend AI-generated illustrations into every demo scene. 30 additional brand-consistent illustrations generated and wired in.

**Generation**
- Extended `/app/backend/scripts/generate_brand_images.py` from 11 → 41 prompts.
- 12 Realtor scene backdrops (corporate office, conference room, team working, agent client, agent phone, property exterior, luxury home, city skyline, open house, walkthrough, desk monitors, handshake)
- 10 Insurance scene backdrops (agent desk, call center, team meeting, advisor client, handshake, desk monitors, corporate office, laptop woman, documents, city night)
- 8 Creator scene backdrops (creator studio, phone filming, podcast mic, audience crowd, laptop creator, social feed, city night, handshake)
- All saved to `/app/frontend/public/generated/scene-{demo}-{name}.jpg` (~600–750 KB each, 27 MB total for all 41 images).
- One image hit a transient credit budget limit during the first run; idempotent re-run picked it up. Final result: **41/41 generated**.

**Wiring**
- `RealtorDemoPage.jsx` `IMG` constant — 12 keys swapped from Unsplash CDN URLs to local `/generated/scene-realtor-*.jpg`.
- `InsuranceDemoPage.jsx` `IMG` constant — 10 keys swapped.
- `CreatorDemoPage.jsx` `IMG` constant — 8 keys swapped.
- Lint clean across all three demo files.

**Visual verification**
- Creator demo Scene 1: cinematic ring-light + dual-monitor creator studio with audience-analytics + brand-deal Kanban dashboards visible in monitors ✓
- Realtor demo Scene 1: silhouetted operator at multi-screen command center (CRM Pipeline / Live Listing Analytics / Outbound Mailings / US heatmap) — perfectly matches narration ✓
- All scene transitions still auto-advance via existing `audio.ended` + `fallback_ms` timer architecture (no functional changes)

**Scope total — entire platform now AI-illustrated**
- 7 industry tiles (HomePage)
- 4 demo cards (HomePage Demo Selector + VerticalPicker)
- 30 scene backdrops (3 demos)
- = **41 brand-consistent AI illustrations**, each unique, none stock

---

## 🆕 ITER 13 (2026-02-27) — AI-Generated Brand Illustrations

User asked for distinctive, brand-consistent imagery instead of generic stock. Generated 11 custom illustrations with Gemini Nano Banana (`gemini-3.1-flash-image-preview`) via Emergent LLM Key.

**Pipeline**
- New `/app/backend/scripts/generate_brand_images.py` — standalone Python script with 11 hand-crafted prompts, all sharing a common style prefix (deep navy `#07101e`, electric cyan `#06b6d4` accents, ambient grid texture, atmospheric volumetric light, no text/logos/faces). Saves to `/app/frontend/public/generated/<name>.jpg` so the frontend dev server serves them as `/generated/*.jpg`.
- Idempotent — re-running the script skips already-generated files. To regenerate, delete the file first.
- Each image: ~650–720 KB JPEG, 16:9 cinematic composition.

**11 illustrations generated**
- 7 industry tiles: real-estate, insurance, creators, retail, airports, contractors, enterprise
- 4 demo cards: realtor, insurance, creator, airports

**`/app/frontend/src/lib/images.js`**
- `INDUSTRY_IMG` and `DEMO_IMG` swapped from Unsplash CDN URLs to local `/generated/*.jpg` paths.
- `PAGE_HERO` and `SECTION_BG` still use Unsplash CDN (subtle background usage; not worth regenerating).

**Visual verification (smoke screenshots)**
- HomePage Industries section: 7 cohesive AI illustrations rendering with dark-navy + cyan aesthetic ✓
- HomePage Demo Selector: 4 cinematic AI illustrations rendering ✓
- Lint clean: `images.js` (JS) and `generate_brand_images.py` (Python) pass ✓

**Cost note**
- Gemini Nano Banana via Emergent LLM Key. 11 generations consumed credits on the universal key — usage visible in Profile → Universal Key. No per-render cost going forward (images are static files now).

---

## 🆕 ITER 12 (2026-02-27) — Site-wide Imagery Layer

User asked for "pictures in home page and all pages and demos and background pictures". Added a coherent imagery system without touching any business logic.

**New shared assets**
- `/app/frontend/src/lib/images.js` — curated Unsplash CDN catalog with 3 maps: `PAGE_HERO` (10 page hero bgs), `INDUSTRY_IMG` (7 industry tiles), `DEMO_IMG` (4 demo cards), `SECTION_BG` (4 homepage section bgs).
- `/app/frontend/src/components/site/PageHero.jsx` — reusable `<PageHero>` component with bg image + dark gradient mask + ambient grid + glow orbs (created for future pages; not yet retrofitted into existing pages since they each have custom layouts).

**HomePage.jsx — image upgrades**
- Industry tiles now show 16:9 photo headers (modern home, contract signing, creator-with-camera, grocery store, airplane runway, construction crew, boardroom). Icon + Live/In-production badge overlaid on top of each photo. Cards converted to `overflow-hidden` with image header above the body.
- Demo Selector cards now show 16:9 photo headers (open house, policy desk, creator studio, airport tarmac).
- Industries / Integrations / Demo-Selector / CTA-Strip sections now have subtle (10–15% opacity) full-bleed background images with dark gradient masks, providing visual depth without competing with content.

**VerticalPickerPage.jsx — image upgrades**
- Hero now has a city-skyline background image at 15% opacity behind the existing ambient grid.
- Each vertical card now has a 16:8 image header above the existing copy block (luxury home / contract signing / creator camera / airplane).

**Per-page hero backgrounds (all gracefully overlaid with dark gradients)**
- PricingPage — financial / charts photo
- ContactPage — Mac keyboard photo
- ApplyPage — team meeting photo
- PortalPage (logged-out) — workspace photo
- ThankYouPage — celebration crowd photo
- PressPage — corporate office photo
- PreviewPage — analytics dashboard photo

**Demos** — already image-rich pre-existing (Realtor 12 imgs, Insurance 12+ imgs, Creator 8 imgs across cinematic bands per scene). No changes needed.

**Verification (Iter 12)**
- Lint: 10/10 files pass
- Smoke tests: HomePage hero ✓, Industries section with 7 image tiles ✓, Demo Selector with 4 image cards ✓, VerticalPicker with 4 image cards ✓, Pricing hero ✓, Contact hero (keyboard bg visible) ✓
- Zero functional/behavioural changes — pure visual layer

---

## 🆕 ITER 11 (2026-02-27) — Creator Demo + Homepage UI Rebuild

User asked for unified rebuild (not refactor) including a brand-new Influencer/Creator cinematic demo and final homepage UI.

**HomePage.jsx — hero rebuilt to 2-column**
- Left col: Enterprise badge → headline → sub → CountrySelector → 3 CTAs (Watch Demo · See Your Industry · Request Access)
- Right col: NEW `<AnimatedHeroDashboard>` mini Command Center preview — KPIs, 30-day revenue spark + bars, "Auto-executed · last 60s" ticker, ambient glow blurs
- Trust strip moved below the 2-col grid (still 4 stats)
- NEW `<DemoCard>` and DEMO_SELECTOR array; new section `data-testid="demo-selector-section"` after Integrations and before CTA strip with 4 cards: Realtor (15 scenes / ~13 min), Insurance (16 scenes / ~13 min), **Creator (11 scenes / ~6.5 min — highlighted)**, Airports (Pilot Q3)
- Creator industry tile in Industries section now points to `/demo/creator` (was `/preview`)

**CreatorDemoPage.jsx (NEW · /demo/creator + /demo/influencer)**
- 11 scenes · ~6.5 min auto-play · Nova voice (female · American)
- Scene set: Hook → CB-on-top → Audience Intelligence → BodyIQ-AI behavioral overlay → Revenue engine → Brand-deal pipeline → Content scoring → Command Center → Autonomous-mode prompt → Scale-without-hiring → Closing
- SceneStage focus types each have a dedicated visual mock (BodyIQ frame-by-frame conviction bars, brand-deal pipeline table, revenue-mix bars, audience cluster bars, command-center KPI grid, automation-prompt 3-card selector with "Full Autonomy / Review & Approve / Mixed by Channel")
- Creator-stack overlay panel on start screen: IG · TT · YT · Stripe · Shopify · Patreon · Substack · Gmail
- Same architecture as Realtor/Insurance demos: TTS prefetch via `/api/tts/speak` voice=nova → blob URLs → `audio.ended` advances + `fallback_ms` cap (36–50s/scene)
- Pause / Resume / Mute / Replay controls + sticky scene header + global timeline bar
- DemoConversionCTA appended (`demoType="creator"`)

**VerticalPickerPage.jsx**
- Creator card href now `/demo/creator` (was `/preview`)
- Runtime label "11 scenes · ~6.5 min", badge "New"
- CTA label resolved: creator → "Watch the ~6.5 min demo"

**App.js**
- Added routes: `/demo/creator` and `/demo/influencer` → `CreatorDemoPage`

**Verification (Iter 8 frontend test report)**
- 12/12 review-request items passing — 100% success on backend + frontend probes
- Creator demo: Scene 1 → Scene 2 auto-advanced in 22s (no manual click)
- Realtor regression: Scene 1 → Scene 2 in 24s (architecture unaffected)
- TTS endpoint: 200 + audio/mpeg + non-zero body
- Zero orphan "BodyIQ" (without -AI) anywhere

**Backlog noted by reviewer (non-blocking)**
- `CreatorDemoPage.jsx` is ~1100 lines — split stage components into `/components/demo/creator/` later
- Auto-play architecture is now triplicated across Realtor / Insurance / Creator — extract `useCinematicDemo()` hook + shared SceneHeader/NarrationPanel during P3 refactor pass

---

## 📋 PREVIOUS ITERATIONS

---

## 🆕 ITER 10 (2026-02-26) — Full Enterprise Repositioning

User asked for "full positioning and structure correction" presenting platform as unified `CreatorBoostAI™ + BodyIQ-AI™` enterprise AI operating system.

**Header (Navbar.jsx — overwritten)**
- Both brand names always visible: "CreatorBoostAI™ + BodyIQ-AI™" (mobile collapses to "CBAI + BodyIQ-AI")
- Sticky tagline strip below header: "THE AI OPERATING SYSTEM THAT RUNS AND GROWS YOUR BUSINESS · POWERED BY REAL-TIME HUMAN INTELLIGENCE"
- Nav: Home · Demo · Command Center · Training · Pricing · Apply · Contact + "Watch Demo" CTA
- Mobile menu mirrors all 7 links + LanguageSelector
- BodyIQ always rendered as "BodyIQ-AI", never alone

**HomePage.jsx — full rewrite**
- Hero headline: "Run Your Entire Business With AI That Thinks, Decides, and Executes."
- Subheadline mentions both products by TM, revenue/cost/scale outcomes
- 3 CTAs: Watch Demo (→ /demo) · See Your Industry (anchor scroll) · Request Access (→ /apply/strategy)
- Country/region selector embedded in hero
- Trust stat strip: +34% revenue / -22% cost / 40+ systems / 7 industries
- Section "Built for Every Revenue-Driven Industry" with 7 tiles:
  - Real Estate (live, → /demo/realtor)
  - Insurance (live, → /demo/insurance)
  - Influencers & Creators (live, highlighted, → /preview) — monetization, audience intel, brand-deal automation
  - Retail & Grocery (in production, → /contact)
  - Airports & SITA Systems (in production, → /contact)
  - Contractors & Service Businesses (in production, → /contact)
  - Enterprise (→ /pricing)
  - Each tile: icon + outcomes (3 bullets) + Live/In-production badge + CTA arrow
- Section "This Is Not Body Language. This Is Business Intelligence." — explicit positioning correction with 4 pillars: Intent Detection · Closing Performance · Communication Lift · Revenue Outcomes
- Section "Works With the Systems You Already Use" — 16 integrations grid (Salesforce, HubSpot, Yardi, AppFolio, QuickBooks, RealPage, MRI, Catalyst, Applied Epic, FUB, kvCORE, Slack, Twilio, Zapier, Stripe, Shopify) + 3 capabilities (Oversee · Connect · Execute)
- Closing CTA strip with 3 buttons (Watch Demo · Open Command Center · Request Access)
- Real-world business imagery (Unsplash CDN) — diverse team office + executive boardroom

**VerticalPickerPage.jsx — extended**
- Now 4 vertical demos (was 2): Realtor, Insurance, Creators (→ /preview), Airports/SITA (→ /contact for brief)
- Hero rewritten: "See your industry executed." references both brand names
- COMING_SOON updated: Retail, Contractors, Mortgage, Healthcare
- Layout: 2×2 grid on desktop, single-column on mobile

**i18n status**
- Existing locale files still load (graceful EN fallback for new copy that hasn't been keyed)
- Region selector + LanguageSelector unchanged
- Phase 1 finishing pass for the 6 remaining unbound pages still queued

**Verification**
- Lint: 0 issues (HomePage, Navbar, VerticalPicker)
- Visual screenshot: every required element confirmed (header, tagline strip, headline, sub, 3 CTAs, region, trust strip, industries section visible on scroll)
- Backend: 111/111 tests still green (no backend changes in this iter)

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
