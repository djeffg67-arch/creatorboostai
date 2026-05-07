# Draft email to Emergent Support — Missing "Add Secret" button

**To:** support@emergent.sh
**Subject:** Missing "Add Secret" button on production deployment dashboard — CreatorBoostAI

---

Hi Emergent Support team,

The "Add Secret" button is missing on my production deployment dashboard for **CreatorBoostAI** (slug/app: *creatorboostai* — please confirm the canonical slug from my account). Because of that I cannot inject the two environment variables my live frontend + backend need in production. I have screenshots ready if helpful.

**Please add the following to the production deployment for me, or restore the "Add Secret" button so I can do it myself:**

| Key | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://www.creatorboostai.com` |
| `CORS_ORIGINS` | `https://www.creatorboostai.com,https://creatorboostai.com` |

Both must be available at **runtime** to the production service (not just the build step). The frontend reads `REACT_APP_BACKEND_URL` at build time via `process.env`, and the backend reads `CORS_ORIGINS` via `os.environ.get('CORS_ORIGINS')` to populate the CORS allow-list.

**Why this is urgent:** Without these, the live site at `https://www.creatorboostai.com` cannot route API calls to the backend, and CORS rejects the apex domain. The Preview environment works fine — this is purely a production secret-binding issue.

**Related, separate issue (FYI, not blocking the above):**
The `RESEND_API_KEY` secret name is present in the production env-var keys, but the runtime value is empty (confirmed via my own diagnostic endpoint). Email delivery falls back to SANDBOX mode. Could you also re-bind that secret value while you're in the dashboard? I'll re-paste the key on request.

Thanks — I appreciate the help.

— Jeffrey
CreatorBoostAI
