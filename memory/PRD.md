# CreatorBoostAI + BodyIQ-AI — Master PRD

**Last update:** 2026-05-05 (Iter 61 — CFO Business Case Generator + Dark Funnel Phase 1 + Sovereign Audit Trail Phase 1)

> Older iterations (38-53) are summarized in `/app/memory/CHANGELOG.md` if it exists, else inferred from git log.

---

## 🎯 ITER 61 — CFO BUSINESS CASE + DARK FUNNEL P1 + SOVEREIGN AUDIT TRAIL P1

Per Jeffrey: "Make the system close deals, then make it enterprise-ready. Ship fast."
Three subsystems shipped tonight, internally instrumented, end-to-end verified.

### 1. CFO-Ready Business Case Generator
- `/app/backend/cfo_business_case.py` (~250 lines, NEW)
- `POST /api/cfo-case/generate {lead_id?, industry?, inputs?, auth_email?, auth_token?}`
- 3 industry-routed CFO prompts (Claude Sonnet 4.5):
  • `koollite_energy` — investment, kWh savings, NPV/IRR, GO/WAIT/DECLINE
  • `real_estate` — position snapshot, 3-scenario table, PROCEED/ADJUST/WAIT
  • `general_business` — use of funds, 3-yr ROI, APPROVE/REVISE/DECLINE
- Industry classifier accepts free-form `industry` + lead `notes` and routes
  conservatively (defaults to general_business).
- Wraps every generation in `correction_agent.with_correction` (3 retries, 0/2/8s).
- Looks up lead context in `leads_registry` then falls back to `ops_leads`.
- Auto-records a Sovereign Audit Trail decision on every generation.
- Boosts `signal_score` by `asset_generated` (+5) when attached to a lead.
- `POST /api/cfo-case/list` (founder) — recent cases sans markdown.
- Output is forwardable as-is (no preamble, clean markdown, exec disclaimer).

### 2. Dark Funnel · Phase 1 (light, tied to outbound)
- `/app/backend/dark_funnel.py` (~310 lines, NEW)
- `GET /api/dark-funnel/r?t=<token>` — tracked redirect → records click signal
  (+20) + spike check + 302 to dest_url. Token TTL 90 days.
- `POST /api/dark-funnel/webhook/resend` — ingests Resend events:
  email.opened (+10) · email.clicked (+20) · delivered/bounced/complained logged-only.
  Optional HMAC verification when RESEND_WEBHOOK_SECRET is set.
- `mint_tracked_url(db, lead_id, dest_url, kind)` helper — used by orchestrator
  to inject CB-hosted tracked CTAs into outbound emails.
- `_detect_engagement_spike(db, lead_id)` — when 3+ engagement signals occur
  within 60 minutes, sets `signal_alerts_fired.engagement_spike` (idempotent).
- `reengagement_loop(db, interval_sec=600)` — background task launched at startup.
  Every 10min: finds leads with `signal_score >= 30` AND
  `signal_score_updated_at < now-48h` AND no prior `reengagement_sent_at`,
  sends canned re-engagement HTML, sets `reengagement_sent_at`. Idempotent.
  Disabled with `REENGAGEMENT_SCANNER=off`.
- `POST /api/dark-funnel/scan-reengagement` — founder-triggered manual scan.
- `POST /api/dark-funnel/lead-engagement` — founder feed for one lead:
  signal_score, history (last 10), spike/re-engage flags, tracked_links[].
- Orchestrator (`/app/backend/orchestrator.py`) updated to mint tracked CTA URLs
  for the Email-1 footer, so every outbound click is captured.

### 3. Sovereign Audit Trail · Phase 1 (internal traceability first)
- `/app/backend/audit_trail.py` (~165 lines, NEW)
- `record_decision(db, *, agent_id, action, reasoning_summary, data_sources,
  confidence, lead_id, inputs_preview, output_preview, meta) → decision_id`
  Best-effort (never raises). 800-char preview truncation, 600-char reasoning cap.
- Storage: `sovereign_audit_trail` collection. Indexes:
  unique on `decision_id`, compound on `(lead_id, timestamp desc)`,
  `timestamp desc`.
- Wired into:
  • `cfo_business_case.generate` — emits {agent_id:"cfo_business_case",
    action:"generate_cfo_case", confidence:85}
  • `orchestrator._orchestrate` — emits 5 rows per run:
    `{orchestrator, orchestrator.researcher, orchestrator.content,
     orchestrator.outreach, orchestrator.execution}` with confidence reflecting
    intent_score, send-success, etc.
- Founder endpoints:
  • `POST /api/audit/list {lead_id?, agent_id?, action?, limit}` — paginated feed
  • `POST /api/audit/detail {decision_id}` — full record
  • `POST /api/audit/lead-trail {lead_id}` — compact per-lead trail (no previews)

### Frontend (founder lead drawer · `/app/frontend/src/pages/PortalOpsPage.jsx`)
Inside the existing `<LeadCard>` expanded section, two new collapsible panels:
- **`<CfoCasePanel>`** — emerald-bordered. Industry dropdown
  (Auto-detect / Koollite / Real Estate / General-Insurance), optional context
  input, "Generate CFO case" button → renders markdown in a scroll box with
  `decision_id` chip + Copy-markdown action.
- **`<EngagementPanel>`** — cyan-bordered. Signal score badge (cool/warm/hot
  tone), spike flag, re-engage flag, recent signal history (last 10), tracked
  links with click counts, sovereign audit trail (last 20 decisions per lead).
- New `lib/api.js` helpers: `cfoCaseGenerate`, `darkFunnelLeadEngagement`,
  `darkFunnelScanReengagement`, `auditLeadTrail`, `auditList`.
- All elements have unique `data-testid="cfo-{toggle|generate|output|copy|industry|notes|decision|error}-{lead_id}"`
  and `engagement-{toggle|score|history|refresh}-{lead_id}` + `audit-trail-{lead_id}`.

### Verified live (testing agent iteration 38 · 16/16 backend pytest · 100%)
```
✓ CFO general_business, koollite_energy, real_estate, insurance fallback all generate >1500-char markdown
✓ Decision_id returned + persisted in sovereign_audit_trail
✓ Tracked redirect 302 + signal_score +20 + clicks counter incremented
✓ Resend webhook email.opened (+10) + email.clicked (+20) ingested
✓ Engagement spike fires after 3 signals/60min (idempotent on re-trigger)
✓ Re-engagement scan finds 48h+ stale lead with score>=30, sends gracefully
✓ Re-engagement idempotent — second scan does not double-send
✓ /lead-engagement returns full engagement detail
✓ /audit/list filters by lead_id + agent_id + action
✓ /audit/lead-trail returns compact decisions for a lead
✓ Audit auth: bad token → 401/403
✓ Iter 60 weak-signal regression preserved
✓ Iter 59 orchestrator emits 5 sovereign_audit_trail rows per run
```

### Frontend smoke (main agent · screenshot verified)
```
✓ Founder /portal/ops loads · 31 leads listed
✓ Lead expanded → 'CFO Business Case' panel toggles open with industry select + Generate
✓ Lead expanded → 'Engagement & Audit Trail' panel toggles open with score badge,
  empty-state messaging for history/links/audit when no signals exist (graceful)
✓ No regressions — Notes, Tasks, Status pills still render and function
```

### Files touched
- `/app/backend/cfo_business_case.py` (NEW · 250 lines)
- `/app/backend/dark_funnel.py` (NEW · 310 lines)
- `/app/backend/audit_trail.py` (NEW · 165 lines)
- `/app/backend/server.py` (3 routers wired + 3 startup index blocks)
- `/app/backend/orchestrator.py` (mint_tracked_url integration + 5 audit hooks)
- `/app/backend/tests/test_iter61_cfo_dark_audit.py` (NEW · 16 pytest cases)
- `/app/frontend/src/pages/PortalOpsPage.jsx` (CfoCasePanel + EngagementPanel
  inside LeadCard expanded section)
- `/app/frontend/src/lib/api.js` (5 new helpers)

### Operating constraints honored (per Jeffrey's directive)
- ✓ "Lightweight, tied to outbound, no heatmaps/behavioral modeling" (Dark Funnel)
- ✓ "Internal traceability first, not full compliance engine" (Audit Trail)
- ✓ "Speed and clarity over design" (frontend ships compact dark/cyan/emerald
  panels — no heavy styling, no separate routes)
- ✓ "Make the system close deals first" — CFO case is the headline feature

### Phase 2 — explicitly DEFERRED (per user direction)
- 🔴 Full compliance automation, regulatory ingestion (DRE/FINRA/state boards)
- 🔴 Government-grade deployment + explainability dashboards
- 🔴 Human-in-the-loop approval layers
- 🔴 Agentic RAG / Weaviate + advanced behavioral modeling + heatmaps
- 🔴 Crunchbase / Clearbit / Apollo external signal APIs (vendor approval pending)

### Code-review notes from testing agent (deferred · acceptable for MVP)
- `/webhook/resend` skips HMAC verification when `RESEND_WEBHOOK_SECRET` is
  unset — must be set in production to prevent forged engagement events.
- `cfo_business_case` accepts auth_email/token but verifies silently — fine for
  auth-optional surface, just be aware bad tokens silently no-op.
- `audit_trail.record_decision` failures only log at WARNING — consider counter
  metrics in production if audit volume becomes critical.

---

## 🎯 ITER 60 — PHASE 1 MAS UPGRADES (Weak Signal + Correction · region tag baseline)

Per Jeffrey's "Force Multiplier" letter, scoped down to two real working layers tonight
(rest deferred — see "Honestly Deferred" list in Iter 59). Internal tone: honest
engineering. External tone: keep marketing language for landing/demo/investor copy.

### What runs autonomously now
- Every lead has a rolling **`signal_score` 0-100** that updates on every touchpoint
  with named deltas. Score is clamped, persisted, and history-tracked in
  `leads_registry.signal_history[]` (last 200 entries).
- **Founder SMS at 80 (hot) and 95 (urgent)** — both fire in the same delta if a
  single jump crosses both thresholds. Idempotent: each level fires exactly once
  per lead (tracked in `signal_alerts_fired`).
- **Sentiment Drift detector** (`detect_topic_drift`) — Haiku 4.5 classifier compares
  a new client message vs prior 3; if topic depth jumps from `general` to
  `technical / regulatory / financial`, +15 boost to signal_score.
- Every async agent step in the orchestrator is wrapped with
  **`with_correction(coro_factory, kind, lead_id, ...)`** — 3 attempts at 0s/2s/8s
  backoff, silent retries logged to `workflow_corrections`, founder SMS on final
  failure with 60-min suppression per (kind, lead_id) pair.
- All captures + agent_runs accept an optional **`region`** field (max 80 chars,
  free-form). Persisted to `leads_registry.region`. **No compliance content
  generated** — safe baseline until lawyer engaged (per Jeffrey's direction).

### Signal delta table
| Touchpoint | Δ | SMS-aware |
|---|---|---|
| capture_submitted | +25 | yes |
| orchestrator_run_started | +10 | yes |
| asset_generated | +5 | yes |
| email_opened (Resend webhook) | +10 | yes |
| email_clicked | +20 | yes |
| email_replied | +35 | yes |
| demo_viewed | +15 | yes |
| builder_tool_run | +8 | no (low signal) |
| multiple_sessions_24h | +12 | yes |
| topic_depth_jump | +15 | yes |
| client_portal_opened | +18 | yes |

### Backend (NEW modules)
- **`/app/backend/signal_scoring.py`** (~180 lines)
  - `touch_signal(db, lead_id, kind, *, reason, sms=True)` — append to history,
    clamp+persist score, fire SMS on threshold crossings.
  - `detect_topic_drift(db, lead_id, new_message)` — Haiku JSON classifier; +15
    on jump.
  - `rebuild_score(db, lead_id)` — recompute from history (migration helper).
  - `SIGNAL_DELTAS` and `SIGNAL_THRESHOLDS` exported.
- **`/app/backend/correction_agent.py`** (~120 lines)
  - `with_correction(coro_factory, kind, db, lead_id, context)` — generic retry
    wrapper with exponential backoff. Returns success result; raises last
    exception on permanent failure.
  - Logs every attempt to `workflow_corrections` with status
    `recovered | failed`. Founder SMS on `failed` with 60-min suppression.

### Wiring
- `orchestrator._orchestrate` — all 4 agent calls now wrapped in `with_correction`.
  `lead_id` is locked BEFORE retries start, so any agent failure still leaves an
  owned lead. Signal_score touchpoints fire at: orchestrator_run_started,
  asset_generated, email_sent (when ok).
- `business_activation.capture` — fires `capture_submitted` (+25) + one
  `builder_tool_run` (+8) per included block. Region tag persisted when provided.
  Auto-trigger to orchestrator preserved (Iter 59).

### Verified live (testing agent iteration 37 · 14/14 backend pytest · 100% pass)
```
✓ Signal score increments correctly on capture (+25) + builder tools (+8 ea) + orchestrator
  steps (+10/+5). Caps at 100.
✓ Score recompute via rebuild_score matches history sum.
✓ Threshold crossing 75→100 now fires BOTH 'hot' AND 'urgent' SMS (code-review fix applied).
✓ Idempotent: re-trigger same kind after threshold fire → no duplicate SMS.
✓ Region accepted up to 80 chars; 81+ rejected with 422.
✓ Region persisted to leads_registry; agent_runs.region stamped when LeadSpec.region given.
✓ Correction Agent: recovers on 2nd attempt → workflow_corrections.status='recovered'.
✓ Correction Agent: 3-attempt exhaustion raises original exception, status='failed', 3 attempts.
✓ Backoff timing measured at 10-14s for 3 failures (matches 0+2+8).
✓ NO compliance content in any output (only Iter 57 'Draft document — not licensed advice'
  disclaimer remains, by design).
✓ Iter 56/59 regression preserved: business-builder/tools=17, orchestrator/list returns runs+kpi.
```

### Code-review fixes applied (from testing agent's iteration 37 review)
- ✅ `signal_scoring`: prev<80 jumping to >=95 now correctly fires BOTH hot+urgent
  (was only firing urgent, skipping hot).
- ✅ `correction_agent`: removed redundant `update_one` followed by
  `find_one_and_update`; consolidated to single sort-aware `find_one_and_update`.

### Code-review notes deferred (acceptable for MVP)
- Module-level `FOUNDER_PHONE` — fine because `dotenv` loads before module import.
  Tests must `load_dotenv()` before importing `signal_scoring` (test file does).
- Correction Agent suppression key `(kind, lead_id)` collapses to per-kind when
  `lead_id=None`. Acceptable; tune later when system-level kinds appear.
- `business_activation` reuses `touch_signal` per builder block (lookup+update per
  block). Acceptable; could batch if hot-path latency becomes an issue.

### Files touched
- `/app/backend/signal_scoring.py` (NEW)
- `/app/backend/correction_agent.py` (NEW)
- `/app/backend/orchestrator.py` (4 agents wrapped + signal touchpoints + region field)
- `/app/backend/business_activation.py` (signal touchpoints + region field)
- `/app/backend/tests/test_iter60_signal_correction.py` (NEW · 14 pytest cases)

### What's STILL deferred (per Jeffrey · "Force Multiplier" letter)
Real, but each requires weeks or vendor decisions:
- 🔴 Shadow Outreach Agent (option a in this iteration's plan — Jeffrey picked b+c)
- 🔴 ROI / Efficiency dashboard card
- 🔴 Frontend `<SignalScoreBadge>` + `<CorrectionsTab>` (founder dashboard surfaces)
- 🔴 Real-time regulatory ingestion (DRE/FINRA/state boards) — 4-6 week scraper
  project + lawyer review
- 🔴 Anomaly Detection (volume drops, conversion anomalies) — needs 30+ days
  baseline
- 🔴 Self-healing workflows / agent negotiation / predictive modeling — multi-week
- 🔴 Hyper-personalized video snippets — vendor (HeyGen / Synthesia)
- 🔴 Dynamic landing pages per lead — 1-2 sessions
- 🔴 Agentic RAG / Weaviate — Jeffrey explicitly deferred to "after revenue
  validation"
- 🔴 E2B / Modal sandboxing for agent code exec — bounded risk currently (agents
  call Claude+Resend only)
- 🔴 Crunchbase / Clearbit signal APIs — pending Jeffrey's vendor approval

### Production readiness
Set in production, missing in preview:
- `RESEND_API_KEY` → live email send
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` / `FOUNDER_PHONE`
  → SMS hot-lead alerts AND Correction Agent failure alerts both fire on prod

---

## 🎯 ITER 59 — AGENTIC ORCHESTRATOR (Sovereign Intelligence Engine MVP-1)

Per Jeffrey's "Sovereign Intelligence Engine" blueprint, scoped tonight to ONE
deeply-working layer instead of stub-everything: the autonomous 4-agent execution
chain. All other blueprint items (RAG, sandboxing, signal APIs, governance-as-code)
are documented as Phase 2/3 with explicit vendor requirements. Real execution. Real
emails. Real lead locking.

### What runs autonomously now (no human in the loop)
A high-intent lead enters the system → 30-50 seconds later:
1. **Researcher Agent** classifies industry + pain point + asset_type + intent_score
2. **Content Agent** generates a tailored 1-page asset (markdown) — picks from 5
   asset templates based on the researcher's classification
3. **Outreach Agent** writes a personalized 60-110 word first email with the
   researcher's hook + asset-by-name reference + 1 specific question + signature
4. **Execution Agent** sends Email 1 immediately + queues T+24h and T+72h
   follow-ups in the existing `business_activation_nurture` loop
Throughout: lead is locked into the Exclusive Lead Engine before agent 1 runs;
every step is persisted to `agent_runs` with duration_ms + output_preview for audit.

### Routing matrix (Researcher's industry → asset_type)
| Industry signal in lead | Asset type |
|---|---|
| real estate / listing / agent / broker | `real_estate_correction` |
| lighting / energy / kWh / fluorescent / utility | `energy_savings` |
| brand-new / pre-revenue / launching | `business_plan_lite` |
| has revenue / wants more customers | `roi_report` or `icp_brief` |
| anything else with revenue context | `roi_report` |

### Backend (`/app/backend/orchestrator.py`, NEW · 510 lines)
- 4 specialized Claude agents (3× Sonnet 4.5 for content/outreach quality, 1× Haiku
  4.5 for fast classification). All use Emergent LLM Key.
- `_orchestrate(db, lead_input, triggered_by)` — top-level chain function. Used by:
  - `POST /api/orchestrator/run` (manual trigger w/ optional founder auth)
  - `POST /api/orchestrator/run-on-lead` (founder · re-runs the chain on an existing
    `leads_registry` row)
  - **Auto-trigger from `business_activation.capture`** when `wants_outbound_help=true`
    via `asyncio.create_task(_orchestrate(...))` — non-blocking, the user already has
    their PDF + Iter 57 Email 1; the orchestrator adds a second tailored email.
- `POST /api/orchestrator/list` (founder) — returns runs[] + KPI {total, completed,
  emails_sent, avg_duration_ms} for the dashboard card.
- `POST /api/orchestrator/detail` (founder) — full step-by-step trace for one run.
- MongoDB index `agent_runs.started_at desc` + unique index on `id` for fast /list
  under concurrent load (added per Iter 59 testing agent code-review).
- HTML escape on outreach body before email render (XSS-prevention; per Iter 59
  testing agent code-review).

### Verified live (testing agent iteration 36 · 100% pass · 14/14 backend assertions)
```
✓ Cross-industry routing: real_estate, energy_savings, icp_brief, business_plan_lite all picked correctly
✓ Lead locked to founder before any agent runs (lock_status=LOCKED)
✓ agent_runs persists 4-step trace + asset_markdown + outreach JSON + duration_ms
✓ /list KPI returns total/completed/emails_sent/avg_duration_ms
✓ /detail returns full run; 404 on unknown run_id
✓ /run-on-lead reuses existing leads_registry context correctly
✓ Auto-trigger from /business-activation/capture wants_outbound_help=true → completed run
✓ wants_outbound_help=false → orchestrator_triggered=false, no agent_runs created
✓ Email graceful degrade (preview): email_sent=false + email_error mentions RESEND_API_KEY,
  but run still status='completed' because lock + asset + nurture all succeeded
✓ Outreach constraints honored: 60-110 words, no "I noticed you" phrasing, signed Jeffrey · CreatorBoostAI
```

### Output quality sample (real run, real-estate vertical)
```
Subject: Your expired Austin listing + pricing strategy
Body:
Your suburban Austin listing just expired—relisting at the same price without a
strategy change is likely to repeat the same stalled result.

I put together a real estate correction analysis that maps out three positioning
shifts that could get buyer activity moving in the first 14 days.

Are you planning to adjust your approach before relisting, or testing the market as-is?

Jeffrey · CreatorBoostAI
```

### What's explicitly DEFERRED (per Jeffrey's "hybrid approach" direction)
The blueprint mentions these — they are real, but they need vendor decisions or weeks:
- **Agentic RAG / Weaviate vector DB** — Phase 1 light ingestion only after revenue
  validation, per Jeffrey's reply: "RAG will support accuracy and scale after initial
  revenue validation"
- **E2B / Modal sandbox isolation for agent execution** — agents currently call
  Claude + Resend only (no arbitrary code exec, so the risk profile is bounded)
- **Crunchbase / Clearbit signal ingestion** — pending Jeffrey's vendor approval
  ($50-100/mo)
- **MLS / RETS for real-estate signals** — licensing problem, not a code problem
  (broker partnership required)
- **Permit / utility data APIs** — state-by-state public datasets, no unified API
- **Governance-as-Code policy engine (OPA / Cedar)** — 2-4 week build with
  ephemeral creds + audit logging
- **Frontend dashboard for `agent_runs`** — deferred to next iteration; founder can
  curl `/list` + `/detail` for now
- **LinkedIn ingestion** — Jeffrey's earlier "skip" decision still stands

### Files touched
- `/app/backend/orchestrator.py` (NEW · 510 lines)
- `/app/backend/server.py` (router wired + agent_runs index)
- `/app/backend/business_activation.py` (auto-trigger block on wants_outbound_help=true)
- `/app/backend/tests/test_iter59_orchestrator.py` (NEW · 14 pytest cases)

### Code-review items addressed
- ✅ HTML-escaped outreach body in email render (XSS prevention)
- ✅ MongoDB index on `agent_runs.started_at desc` + unique on `id`

### Code-review items deferred (acceptable for MVP)
- `/api/orchestrator/run` is auth-optional. Acceptable while the endpoint is internal.
  Lock down before any public surface.
- Fire-and-forget `asyncio.create_task` has no retry/dead-letter. MVP risk acceptable;
  consider a `done_callback` logger before scaling.
- Researcher non-JSON fallback only logs a warning, doesn't persist parse failure to
  the run trace. Cosmetic.

---

## 🎯 ITER 58 — ACTIVATION SYSTEM POLISH (Outbound bridge + activation copy)

Polish pass on Iter 57. Per Jeffrey's directive, the activation flow now feels like
"I just activated something powerful" — not "I submitted a form" — and the cold-outreach
engine actually picks up opt-in leads.

### Backend (`/app/backend/business_activation.py`)
- **Bridge to Outbound Engine** — when `wants_outbound_help=true`, the capture endpoint
  also writes an `outbound_prospects` row tagged `target_segment="activation_opt_in"`,
  `source="business_activation"`, with `source_capture_id` + `source_lead_id` joins so
  the cold-outreach scheduler can claim it on its next tick. Idempotent — skips if an
  outbound prospect with that email already exists.
- Response now includes `outbound_prospect_id` and `outbound_bridged` so the frontend
  can show the bridge status in the success state.

### Frontend (`/app/frontend/src/pages/BusinessBuilderPage.jsx`)
- **Success state rewritten** to match the spec exactly:
  - Headline: "Your business system has been activated."
  - Subhead: "Your plan has been sent to your email. CreatorBoostAI is now preparing your next steps."
  - Live activation checklist with green checks / amber dots tied to real backend state:
    Lead locked · Branded PDF compiled & emailed · 3-step execution sequence triggered ·
    Outbound engine bridged
  - Receipt block (lead_id, capture_id, pdf size + status)
  - Primary CTA: **"Continue Building My Business"** (emerald, glowing)
  - Pulsing emerald ping on the success icon — activation feel, not confirmation feel

### Verified live (smoke-tested by main agent + Iter 57 testing agent baseline)
```
✓ Capture with wants_outbound_help=true → outbound_bridged=true + prospect_id minted
✓ Capture with wants_outbound_help=false → outbound_bridged=false + prospect_id=null
✓ Idempotency preserved — same email re-submits don't double-bridge
✓ Frontend success state shows exact spec wording + Continue Building My Business CTA
✓ All 6 production-readiness boxes:
    1. Lead is captured ✓
    2. Lead stored with unique ID ✓
    3. Lead is locked (Exclusive Lead Engine) ✓
    4. Email is sent (graceful degrade in preview without RESEND_API_KEY) ✓
    5. Outbound sequence is triggered (nurture + opt-in bridge) ✓
    6. User is returned into system (Continue Building My Business CTA) ✓
```

### Files touched
- `/app/backend/business_activation.py` (outbound bridge block + response fields)
- `/app/frontend/src/pages/BusinessBuilderPage.jsx` (success state rewrite + CTA rename)

### What this completes (per Jeffrey's spec)
✓ Display success state that reinforces system activation (exact copy)
✓ "Continue Building My Business" button takes user back to platform
✓ Lead has unique lead_id, stored, locked
✓ Outbound triggers automatically (immediate Email 1 + scheduled Emails 2-3)
✓ Email content positions CB as the system, not a file delivery (Iter 57 templates)
✓ Checkbox flag wired (`wants_outbound_help` in lead record + outbound bridge)
✓ Fast response · clear confirmation · immediate value · clear next step

---

## 🎯 ITER 57 — BUSINESS ACTIVATION CAPTURE SYSTEM (Top-of-funnel pipeline)

Per Jeffrey's directive: replace the simple "save my draft" idea with a full activation
pipeline. Every Business Builder output now becomes a captured + LOCKED lead inside the
Exclusive Lead Engine, with a compiled PDF emailed to the founder and a 3-step nurture
sequence triggered automatically.

### Backend (`/app/backend/business_activation.py`, NEW · 570 lines)
- `POST /api/business-activation/capture` (public) — full pipeline in one call:
  1. **Compile PDF** server-side via `reportlab` (pure-python, no system deps). Cover
     page + one section per builder block + closing activation page + legal disclaimer.
     Markdown → branded PDF with bold/headings/bullets/separators/tables.
  2. **Register lead** via `lead_registry.upsert_lead` with
     `assigned_to_user_id=FOUNDER_EMAIL`. The Exclusive Lead Engine fingerprint hash
     (email · phone · company+location · name) ensures the lead is LOCKED and globally
     deduplicated. Idempotent: same email re-submission returns same `lead_id`.
  3. **Persist capture record** to `business_activation_captures` collection (full
     session, all blocks, wants_outbound_help flag).
  4. **Send Email 1 immediately** — subject "Your Business Plan + AI System Access",
     PDF attached, "Activate my system" CTA button, Continue Building deep link.
     From `info@creatorboostai.com` (verified Resend sender; SENDER_EMAIL env var is
     intentionally hardcoded — see email_service.py).
  5. **Schedule Email 2 (T+24h)** — execution-focused: "Plans don't fail. Execution
     does."
  6. **Schedule Email 3 (T+72h)** — offer assistance with Loom/demo links: "Want me to
     help you ship X?"
  7. **Notify founder** of the new captured lead via existing
     `email_service.send_founder_notification` — flagged with OUTBOUND HELP REQUESTED
     when applicable.
- `POST /api/business-activation/admin-list` (founder-auth) — captures sorted desc
  with per-step nurture progress for each capture.
- **Background nurture loop** `business_activation_nurture_loop(db, interval_sec=300)`
  started from `server.py` on app startup. Polls for due step_2 / step_3, sends them,
  marks complete. Disabled with `NURTURE_SCHEDULER=off`.
- **Resend attachment support** via `_send_with_attachment` — extends
  `email_service.send_with_result` with base64 PDF attachment param.

### Frontend (`/app/frontend/src/pages/BusinessBuilderPage.jsx`)
- New `<ActivationModal>` component. Triggered from a prominent emerald-bordered
  CTA block ("Activate My Business System") above every generated output.
- Modal collects: name, email, business_name (pre-filled from inputs), business_type
  (pre-filled from inputs.industry), and an **opt-in checkbox**:
  "I want CreatorBoostAI to help me get customers for this business" → flags
  `wants_outbound_help` for future done-with-you outbound services.
- On submit: bundles current output + last 5 saved workspace blocks → POST to
  `/capture` with 60s timeout → success state shows lead_id, capture_id, PDF size,
  nurture schedule + Continue Building link.

### What this pipeline guarantees (per Jeffrey's spec)
- ✓ Every captured lead has a unique `lead_id` (uuid4)
- ✓ Locked + globally deduplicated via Exclusive Lead Engine fingerprint
- ✓ Cannot be reassigned without explicit founder action (Iter 51 ownership rules)
- ✓ Source tagged `startup_builder` (or override per call)
- ✓ Activation email + 3-step nurture trigger automatically and atomically
- ✓ Graceful degrade when RESEND_API_KEY is absent (preview env): lead still locked,
  PDF still compiled, nurture still scheduled, email_error surfaced honestly

### Verified live (testing agent iteration 35 · 100% pass · 6/6 backend + frontend e2e)
```
✓ /capture happy path → lead_id + capture_id + PDF (4-7KB) + nurture scheduled
✓ Idempotency → same email → same lead_id, is_new_lead=false
✓ Invalid email → 422
✓ Email graceful degrade → email_delivered=false + email_error surfaced
✓ /admin-list 401 on bogus token, returns enriched captures[] for founder
✓ Lead created in leads_registry with status=new + lock_status=LOCKED + assigned_to_user_id=founder
✓ Frontend: builder generate → activation-cta-block visible → modal opens
✓ Frontend: empty fields → submit disabled
✓ Frontend: full submit → success state with lead_id + continue link
✓ Frontend: modal close (X + backdrop) cleanly resets state
```

### Observed behavior (per spec — not a bug)
- Lead dedupe operates at the BUSINESS level (email OR phone OR company+location).
  Two team members from the same business activating with different emails will
  share the same `lead_id`. This is the Iter 51 Exclusive Lead Engine rule —
  "no two users can ever get the same business as a lead". Founder can split via
  manual reassignment if needed.

### Files touched
- `/app/backend/business_activation.py` (NEW · 570 lines)
- `/app/backend/server.py` (router wired + nurture loop start)
- `/app/backend/requirements.txt` (added `reportlab==4.5.0`)
- `/app/frontend/src/pages/BusinessBuilderPage.jsx` (Activate CTA + Modal)
- `/app/frontend/src/lib/api.js` (`businessActivationCapture` helper)
- `/app/backend/tests/test_iter57_business_activation.py` (NEW · 6 pytest cases)
- `/app/memory/test_credentials.md` (added 2-auth-paths note)

### Production readiness checklist
- ✓ Lead capture working
- ✓ PDF generation working (server-side reportlab; no client dep)
- ✓ Outbound nurture sequence triggering
- ✓ Leads stored + locked properly via Exclusive Lead Engine
- ⏸ Email delivery requires `RESEND_API_KEY` in production .env (already verified to
  exist in production deployment per email_service log line)
- ⏸ Founder-notification email also requires `FOUNDER_EMAIL` env (defaults to
  j.davidg67@gmail.com)

---

## 🎯 ITER 56 — NEW STARTUP BUSINESS POSITIONING + BUSINESS BUILDER

Core positioning shift: CreatorBoostAI is not just for enterprise — it's the single
operating system a brand-new founder uses to launch, fund, sell, and deliver. User
confirmed reduced Phase 1 scope (chat) — full spec deferred to Phase 2 once API keys
land for new-business ingestion / LinkedIn / inbox warming.

### What shipped (Phase 1)
- **Navbar** (desktop + mobile): "New Startup Business" → `/startup` and "Startup Demo"
  → `/demo/startup`, both highlighted with the cyan dot indicator. `whitespace-nowrap`
  applied to prevent label wrap.
- **`/startup`** (`StartupLandingPage.jsx`): hero with the exact headline + subtext +
  3 CTAs (Start a New Business / Watch Startup Demo / Build My Business Plan), 8-tool
  grid, story strip, startup-tier pricing teaser, legal disclaimer.
- **`/demo/startup`** (`StartupDemoPage.jsx`): 10-scene auto-advancing cinematic
  walkthrough (Spark → Discovery → Plan → Numbers → Capital → Customers → Outreach →
  Conversion → Signal → Delivery). Pause/Play/Replay + clickable scene pager. CTAs to
  Builder + Pricing.
- **`/portal/builder`** (`BusinessBuilderPage.jsx`): structured wizard for **17 tools**
  — business plan, financial projections, loan summary, startup checklist, ICP builder,
  sales script, email campaign, pitch deck outline, offer/pricing builder, market
  research, competitor research, social content, proposal, invoice, break-even, ROI,
  startup budget. URL param `?tool=<key>` auto-selects.
  - Each tool: structured input form → Claude Sonnet 4.5 generation → markdown render +
    HTML preview + 5 export buttons (PDF, DOCX, CSV, Print, Save).
  - Client-side exports: `jspdf` (PDF), `docx` + `file-saver` (DOCX), `sheetjs`-style
    CSV writer for any markdown table. localStorage workspace persists last 30 saves.
- **Avatar Startup Advisor** delivered via the existing `client_portal` surface +
  `delivery` role (Iter 55) — Builder uses dedicated tool prompts so the avatar widget
  stays focused on conversational decision support.
- **Legal disclaimer** appended automatically to every Builder output: "Draft document
  — review with a qualified professional. Not licensed legal/tax/financial advice."

### Backend (`/app/backend/business_builder.py`, NEW · 290 lines)
- `TOOLS` catalog of 17 tools, each with `label`, `fields[]`, and a tool-specific
  Claude system prompt (no fluff, no preamble, markdown-clean output).
- `GET /api/business-builder/tools` — public catalog for the picker.
- `POST /api/business-builder/generate {tool, inputs, session_id?}` — runs Claude
  Sonnet 4.5 with the tool's system prompt + structured user message. 45s asyncio
  timeout. Persists run history to `business_builder_runs` (best-effort).
- All outputs auto-include the `DISCLAIMER` markdown block.

### Verified live (testing agent iteration 34 · 100% pass · 4/4 backend + frontend e2e)
```
✓ Nav: nav-startup → /startup, nav-startup-demo → /demo/startup
✓ /startup renders headline + 3 CTAs + 8 tool tiles + pricing CTA
✓ /demo/startup auto-advances · pause/play/replay/pager all work
✓ /portal/builder renders 17 tool cards
✓ ?tool= URL param auto-selects + scrolls to input form
✓ /generate startup_checklist (Texas LLC) → 6.7KB markdown w/ disclaimer + state-specific items
✓ /generate break_even → numeric content (formula + math + sensitivity table)
✓ /generate unknown tool → 400
✓ Generate UI flow: form fill → output panel → 5 export buttons + disclaimer visible
✓ export-save persists to localStorage cb_builder_workspace
✓ back-to-inputs returns to form cleanly
```

### Bug fixed by testing agent
- `builderGenerate()` in `/app/frontend/src/lib/api.js` was using axios default 30s
  timeout, but Claude Sonnet 4.5 long-form generations take 25–45s. Bumped to 90s
  matching the autopilot pattern. Backend already enforces its own 45s asyncio timeout.

### Code-review findings (cosmetic only, not actioned)
- `business_builder.py` module docstring still says "16 tool keys" — catalog now 17.
- `BusinessBuilderPage.jsx` input type ternary always evaluates to "text" (dead code).
  All fields render as text inputs — fine for MVP per user direction.

### Phase 2 — DEFERRED (blocked on Jeffrey decisions / API keys)
- New-business registration ingestion (Outscraper / OpenCorporates / manual CSV)
- LinkedIn auto-touchpoint (HeyReach / PhantomBuster) — user picked manual buttons
- Inbox health card (compute from existing bounce/complaint data — quick win, can ship
  next cycle without any vendor)
- Real-time intent triggers wired to demo viewer behavior (Hot Leads infrastructure
  already exists from Iter 50 — needs frontend hook on demo pages)
- Dynamic demo personalization via URL params (`?name=&company=&industry=`)
- Homepage hero refresh with the new high-visibility startup section
- Multi-channel total-touch counter (Resend + LinkedIn manual + SMS)

### Files touched
- `/app/backend/business_builder.py` (NEW)
- `/app/backend/server.py` (router wired)
- `/app/frontend/src/components/site/Navbar.jsx` (2 new highlighted links + nowrap)
- `/app/frontend/src/App.js` (3 new routes)
- `/app/frontend/src/pages/StartupLandingPage.jsx` (NEW)
- `/app/frontend/src/pages/StartupDemoPage.jsx` (NEW)
- `/app/frontend/src/pages/BusinessBuilderPage.jsx` (NEW)
- `/app/frontend/src/lib/exporters.js` (NEW · jspdf + docx + CSV + print + workspace)
- `/app/frontend/src/lib/api.js` (builderListTools + builderGenerate, 90s timeout)
- `/app/backend/tests/test_iter56_business_builder.py` (NEW · 4 pytest cases)
- `package.json`: added `jspdf`, `docx`, `file-saver`

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
