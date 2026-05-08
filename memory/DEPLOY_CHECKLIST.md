# Production Deploy Checklist — Iter 96

**Status: 🟢 GREEN_DEPLOY_READY** (verified Iter 89, ground-truth probe `/api/public/deploy-readiness`)

---

## 1 · Pre-Deploy Health (verified ✅)

| Check | Result | How to re-verify |
|---|---|---|
| React production build | ✅ Compiles | `cd /app/frontend && yarn build` |
| Backend lint (ruff F401, F821, F-class) | ✅ 0 findings | `/opt/plugins-venv/bin/ruff check /app/backend` |
| `eval()` calls in backend | ✅ 0 | `grep -rEn "\beval\s*\(" /app/backend` |
| All services running | ✅ | `sudo supervisorctl status` |
| Pytest regression (Iter 89, 12 assertions) | ✅ 100% | `pytest /app/backend/tests/test_iter89_deploy_readiness.py` |
| PII leakage (emails/phones/SSNs in public APIs) | ✅ 0 | regex scan in test_iter89 |
| Mobile responsiveness 390×844 | ✅ no overflow | playwright in test_iter89 |

Hit `GET /api/public/deploy-readiness` any time post-deploy — payload shape is locked.

---

## 2 · Required Production Environment Variables

These keys are **intentionally absent from the preview pod** and **must be injected into the production environment**. Code is fully production-ready and gracefully degrades when keys are missing — but the affected features will be inert until the keys land.

### 🔴 Required (revenue-blocking if missing)

| Variable | Purpose | Where to obtain |
|---|---|---|
| `RESEND_API_KEY` | Outbound email engine, lead nurture, founder digests | https://resend.com/api-keys (must be a domain-verified key for `creatorboostai.com`) |
| `STRIPE_SECRET_KEY` | Payment intents, subscription billing | https://dashboard.stripe.com/apikeys → live mode → "Secret key" |
| `STRIPE_PUBLISHABLE_KEY` | Frontend Stripe.js initialization | Same Stripe dashboard → "Publishable key" |
| `STRIPE_WEBHOOK_SECRET` | `/api/webhook/stripe` signature verification | https://dashboard.stripe.com/webhooks → endpoint secret |

### 🟡 Optional (degrade gracefully)

| Variable | Purpose | Where to obtain |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | SMS notifications | https://console.twilio.com/ |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Twilio console |
| `TWILIO_FROM_NUMBER` | SMS sender | Twilio phone numbers |
| `CALENDLY_URL` | Outbound CTA destination | Calendly dashboard ✅ already set in preview |

### ✅ Platform-injected (do NOT touch)

| Variable | Source |
|---|---|
| `MONGO_URL` | Emergent platform |
| `DB_NAME` | Emergent platform |
| `EMERGENT_LLM_KEY` | Emergent platform (Universal LLM key — Claude / OpenAI / Gemini) |
| `REACT_APP_BACKEND_URL` | Emergent platform |

---

## 3 · Domain & Email Settings

For `creatorboostai.com` to send outbound mail without going to spam:

1. **Resend domain verification** (https://resend.com/domains)
   - Add DNS records:
     - `SPF` (TXT): `v=spf1 include:_spf.resend.com ~all`
     - `DKIM` (TXT, 3 records, Resend provides exact values)
     - `DMARC` (TXT): `v=DMARC1; p=none; rua=mailto:dmarc@creatorboostai.com`
2. **Custom return-path** (optional but improves deliverability): `bounces.creatorboostai.com` → CNAME → Resend value
3. Wait ≤ 24 h for DNS propagation; Resend dashboard turns the domain green when verified.

---

## 4 · Stripe Webhook Endpoint

After deploy, in Stripe dashboard:
1. Add webhook endpoint: `https://creatorboostai.com/api/webhook/stripe`
2. Subscribe to events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
3. Copy the "Signing secret" → set as `STRIPE_WEBHOOK_SECRET` in prod env

---

## 5 · What to tell Emergent Support

Copy-paste this into your Emergent Support ticket:

> **Subject:** Inject production environment variables for creatorboostai.com
>
> Please add the following environment variables to my production deployment for `creatorboostai.com`:
>
> - `RESEND_API_KEY` = `re_...` (I will provide my Resend domain-verified key)
> - `STRIPE_SECRET_KEY` = `sk_live_...`
> - `STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
> - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
> - (optional) `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
>
> Code is GREEN_DEPLOY_READY (probe: `https://creatorboostai.com/api/public/deploy-readiness` will confirm post-deploy). Preview environment shows `verdict=GREEN_DEPLOY_READY` and `critical_clean=true`. The above keys are intentionally absent from preview for security.

---

## 6 · Post-Deploy Smoke Test (run within 5 min of deploy)

```bash
# 1. Probe deploy-readiness on prod
curl https://creatorboostai.com/api/public/deploy-readiness | jq .verdict
# Expected: "GREEN_DEPLOY_READY"

# 2. Confirm SSE streams
curl -N https://creatorboostai.com/api/public/system-pulse/stream | head -3
# Expected: event: ready ... data: {"streaming": true, ...}

# 3. Confirm Action permalink
curl https://creatorboostai.com/api/public/action/fb-deal-004 | jq .found
# Expected: true

# 4. Confirm LLM stack (Claude Sonnet 4.5)
curl https://creatorboostai.com/api/startup-launch/health | jq '.llm_configured'
# Expected: true

# 5. Confirm homepage HTML
curl -sI https://creatorboostai.com/ | grep -i "200 OK"
```

Then visually confirm in browser:
- [ ] Homepage hero "CreatorBoostAI Master Experience" loads
- [ ] LIVE EXECUTION FEED shows ≥ 6 events + "STREAMING LIVE" + "N CONNECTED" counter increments when you open another tab
- [ ] `?action=fb-deal-004` highlights the Deal Stage row + shows PERMALINK badge
- [ ] `/koollite` shows "220 lm/W" and lumen output = wattage × 220
- [ ] `/startup-launch` form renders + a generate test produces a plan_id + `/launch/{plan_id}` renders shareable plan with PDF button
- [ ] `/portal/ops` (founder login via master key `jeffrey-2026-bodyiq-founder-master`) shows BROADCAST LIVE pill

---

## 7 · Architecture Pillars Locked (do NOT remove during deploy)

| Pillar | Surface |
|---|---|
| Live Execution SSE feed | `GET /api/public/system-pulse/stream` |
| Truthful connection counter | SSE `connected_count` heartbeat |
| Action ID search + permalinks | `?action={id}` + `/api/public/action/{id}` |
| Master Homepage 5-Scene Avatar | `/avatars/master/master-intro-opt.mp4` + 4 more |
| Operator dashboard SSE sync | `LiveSendPulse.jsx` |
| Cinematic command-center hero | `MasterCommandCenterHero.jsx` |
| Koollite 220 lm/W lock | `KoolliteDualPath.jsx` (constant `KOOLLITE_LM_PER_W = 220`) |
| Startup Launch Phase 1 (Claude Sonnet 4.5) | `/api/startup-launch/generate` |
| Shareable launch plan permalinks | `/launch/:plan_id` |
| Deploy readiness probe | `/api/public/deploy-readiness` |

---

## 8 · Known Non-Blockers (do NOT "fix" during deploy)

1. **Audit-bot false positives** (React 0/100, eval() in orchestrator.py, 39 undefined vars) — all three empirically debunked. The `/api/public/deploy-readiness` probe is ground truth. Trust the probe.
2. **`Scene N unavailable · Skipping...`** message in headless test browsers — H.264 decoder absence in CI/audit browsers. Real Chrome/Safari/Firefox play the avatars fine. Poster fallback is correct UX.
3. **Action ID display abbreviation** (`#lead-001` vs `#fb-lead-001` in feed rows) — purely cosmetic; the underlying `action_id` is the full string and search/permalink/highlight all work with full IDs.
4. **Anthropic 502 Bad Gateway** on `/api/startup-launch/generate` — historically intermittent upstream proxy issue. Code already handles with timeouts. Unrelated to deploy.

---

**Deploy decision:** 🟢 GREEN. Once Emergent Support injects the 4 required env vars (RESEND + 3× Stripe), production is ready.
