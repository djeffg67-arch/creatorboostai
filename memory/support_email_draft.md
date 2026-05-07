# Email to Emergent Support — Production deployment & secrets recovery (CreatorBoostAI)

> Two issues bundled into one ticket so the platform team can handle them together.
> Send to: **support@emergent.sh**

---

**Subject:** URGENT — CreatorBoostAI production environment appears disconnected · need deployment + secrets restored

---

Hi Emergent Support team,

I'm Jeffrey (`j.davidg67@gmail.com`). My app is **CreatorBoostAI**, currently running in the Preview environment at `bodyiq-training.preview.emergentagent.com`. I have a serious situation with my live production deployment that I need help diagnosing and restoring. **Please don't trigger any new redeployments / rebuilds until we're aligned** — I'd like to avoid burning credits chasing a problem that may be a configuration or domain-binding issue rather than a code issue.

---

## 1) Symptoms I'm seeing

**A. Live domain is pointing to the OLD site.**
Typing `https://www.creatorboostai.com` still loads the previous deployment / build, not the current build I've been working on in Preview. The DNS / domain mapping appears to be pointing at a deployment that is no longer the active project.

**B. Current deployment looks like it's running on placeholder / sandbox env vars instead of original production secrets.**

Visible problems:
- `RESEND_API_KEY` showing placeholder / sandbox values (sender email is `onboarding@resend.dev`, OUTBOUND_MODE is `sandbox`).
- `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` missing entirely.
- Generic JWT values.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` not bound (or pointing at the wrong project).
- `OPENAI_*` and `EMERGENT_LLM_KEY` either missing or generic.
- Missing production env config in general — it looks like the original production environment variables did not transfer into this project.

**C. The "Add Secret" button is missing on my production deployment dashboard.**
Even if I had the secret values handy, I currently have no UI affordance to add them. (I'm including the two I already need — see section 3 — so you can set them while restoring the rest.)

**D. I cannot access the old build / site directly to retrieve the original settings myself.**

---

## 2) What I need help with (please address each)

**A. Locate the ORIGINAL production deployment / environment.**
Please check:
- prior deployments
- deployment history
- cloned projects
- environment history
- production vs preview environments
- project snapshots
- old deployment URLs
- old domain mappings tied to `creatorboostai.com` and `www.creatorboostai.com`

**B. Recover and restore ALL original production environment variables**, including (at minimum):

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- verified Resend sender domain / email
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (or whichever OpenAI credential was bound)
- `EMERGENT_LLM_KEY`
- `JWT_SECRET`
- any other prior working production variables that were on the original project

**C. Confirm whether this current deployment is:**
- a cloned project
- a staging environment
- a preview build that got promoted by accident
- a replacement deployment
- a disconnected rebuild

**D. Provide the correct NEW deployment URL for verification BEFORE we touch the live domain again.** I'd like to verify everything end-to-end on a non-production URL first.

**E. After production secrets are restored, please run / facilitate health checks on:**
- outbound email (Resend send + sender domain verified)
- Stripe (test charge / publishable key reachable)
- Supabase (read/write OK)
- login / auth (JWT verifies)
- avatar integrations (HeyGen `.mp4` assets in `/avatars/*` resolve)
- outbound engine (queue, worker telemetry, warmup ramp)
- all demo routes (`/demo/supermarket`, `/demo/airport`, `/demo/school`, `/demo/noldus`, `/demo/realtor`, `/demo/startup`, `/koollite/roi`, `/lighting`)

**F. Only AFTER verification:** reconnect `www.creatorboostai.com` (and `creatorboostai.com`) to the correct production deployment — don't switch DNS earlier.

**G. Please avoid unnecessary redeployments / rebuilds that consume excessive credits unless required for production restoration.**

---

## 3) Secrets I already have for you (please bind on the restored production deployment)

I started a separate ticket about my missing "Add Secret" button — please consolidate that with this one. The two values that absolutely need to be bound on the production deployment for the frontend + backend to talk to each other on the live domain are:

| Key | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://www.creatorboostai.com` |
| `CORS_ORIGINS` | `https://www.creatorboostai.com,https://creatorboostai.com` |

Both must be available **at runtime** to the production service (not just at build time). Frontend reads `REACT_APP_BACKEND_URL` via `process.env`, and the backend reads `CORS_ORIGINS` via `os.environ.get('CORS_ORIGINS')` to populate the CORS allow-list.

---

## 4) Specific questions I need answered

1. What is the **correct active deployment URL** I should be testing against?
2. Which deployment **currently owns the domain** `www.creatorboostai.com`?
3. **Does my old production environment still exist** in your platform records (snapshots, history, archived deployments)?
4. **Can production secrets be restored automatically** from a previous deployment / snapshot, or do I need to re-paste each key?
5. **Estimated steps** required to fully restore the working production environment (and approximate timeline).

---

## 5) About credits

I'd really prefer not to burn redeployment / rebuild credits chasing this if the root cause is a domain-binding or environment-separation issue rather than something the code itself can fix. Please confirm before triggering anything that consumes credits.

Thanks — I appreciate your help getting this back online cleanly.

— Jeffrey (`j.davidg67@gmail.com`)
CreatorBoostAI
