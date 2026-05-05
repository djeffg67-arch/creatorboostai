import axios from "axios";
import { demoAttributionPayload } from "./demoOrigin";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// One-shot boot sanity check — makes misconfigured prod builds obvious at
// first page load instead of hiding behind a silent "Network Error" later.
if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info(`[CreatorBoostAI] REACT_APP_BACKEND_URL=${BACKEND_URL || "(empty)"}`);
    if (!BACKEND_URL) {
        // eslint-disable-next-line no-console
        console.error(
            "[CreatorBoostAI] REACT_APP_BACKEND_URL is EMPTY in this build. " +
            "Set it in your deployment env-var dashboard to the backend host " +
            "(e.g. https://creatorboostai.com) and redeploy."
        );
    }
}

export const api = axios.create({ baseURL: API, timeout: 30000 });

// Every request failure now carries the exact URL that was attempted, so a
// generic axios "Network Error" gets enriched into a message the user can act
// on (tells them whether REACT_APP_BACKEND_URL is wrong, CORS is blocking, or
// the backend is down).
api.interceptors.response.use(
    (r) => r,
    (err) => {
        try {
            const url = `${err?.config?.baseURL || ""}${err?.config?.url || ""}`;
            const method = (err?.config?.method || "GET").toUpperCase();
            const status = err?.response?.status;
            const raw = err?.message || "Network Error";
            const detail =
                err?.response?.data?.detail ||
                err?.response?.data?.reason ||
                err?.response?.data?.error ||
                null;

            let hint = "";
            if (!err?.response) {
                // No response came back — classic REACT_APP_BACKEND_URL / CORS / DNS failure.
                hint =
                    ` (no response from ${url}). Check that REACT_APP_BACKEND_URL ` +
                    `points to the correct backend host and that CORS on the ` +
                    `backend allows this origin.`;
            } else if (status >= 500) {
                hint = ` (backend ${status}). Check backend logs.`;
            }
            const friendly = detail
                ? `${detail} — ${method} ${url}`
                : `${raw}${hint}`;
            // eslint-disable-next-line no-console
            console.error(`[API ERR] ${method} ${url}`, err);
            // Mutate message so existing `err.message` handlers show the enriched text.
            err.message = friendly;
            err.debugUrl = url;
            err.debugStatus = status ?? null;
        } catch {
            /* never swallow the original error */
        }
        return Promise.reject(err);
    }
);

export const captureLead = (payload) => api.post("/leads", payload).then((r) => r.data);

export const analyzeLead = (description) =>
    api.post("/lead/analyze", { description }).then((r) => r.data);

export const listProducts = () => api.get("/products").then((r) => r.data);

export const createCheckoutSession = (payload) =>
    api.post("/checkout/session", { ...demoAttributionPayload(), ...payload }).then((r) => r.data);

export const getCheckoutStatus = (sessionId) =>
    api.get(`/checkout/status/${sessionId}`).then((r) => r.data);

export const adminLogin = (password) =>
    api.post("/admin/login", { password }).then((r) => r.data);

export const adminListLeads = (token) =>
    api.get("/admin/leads", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminStats = (token) =>
    api.get("/admin/leads/stats", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminExportUrl = (token) =>
    `${API}/admin/leads/export.csv?token=${encodeURIComponent(token)}`;

export const adminPickerStats = (token) =>
    api.get("/admin/picker-stats", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminDemoRevenue = (token, range = "30d") =>
    api.get(`/admin/demo-revenue?range=${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const submitApplication = (payload) =>
    api.post("/applications", payload).then((r) => r.data);

export const listSubscriptions = () =>
    api.get("/subscriptions").then((r) => r.data);

export const listHighTicket = () =>
    api.get("/programs/high-ticket").then((r) => r.data);

export const createSubscriptionSession = (payload) =>
    api.post("/checkout/subscription", { ...demoAttributionPayload(), ...payload }).then((r) => r.data);

// Live Stripe Checkout (Iter 35) — accepts { priceId, customerEmail, successUrl, cancelUrl, ...attribution }
export const createLiveCheckoutSession = (payload) =>
    api.post("/create-checkout-session", { ...demoAttributionPayload(), ...payload }).then((r) => r.data);

// High-Stakes Engagement application (Iter 35) — routes to /api/submit-application
export const submitEngagementApplication = (payload) =>
    api.post("/submit-application", { ...demoAttributionPayload(), ...payload }).then((r) => r.data);

export const portalLogin = (payload) =>
    api.post("/portal/login", payload).then((r) => r.data);

export const portalResendMagicLink = (payload) =>
    api.post("/portal/resend-magic-link", payload).then((r) => r.data);

export const portalEntitlementCheck = (payload) =>
    api.post("/portal/entitlement-check", payload).then((r) => r.data);

export const portalSignalPackDownload = (payload) =>
    api.post("/portal/signal-pack-download", payload).then((r) => r.data);

export const adminListApplications = (token) =>
    api.get("/admin/applications", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminListSubscriptions = (token, range = "all") =>
    api.get(`/admin/subscriptions?range=${range}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminListTransactions = (token, range = "all") =>
    api.get(`/admin/transactions?range=${range}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminListDemoShares = (token, range = "all") =>
    api.get(`/admin/demo-shares?range=${range}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminListDemoSessions = (token, range = "30d", demoType = "") => {
    const qs = `range=${encodeURIComponent(range)}` + (demoType ? `&demo_type=${encodeURIComponent(demoType)}` : "");
    return api.get(`/admin/demo-sessions?${qs}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);
};

export const adminListDemoNotifications = (token) =>
    api.get(`/admin/demo-notifications`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const shareDemo = (payload) =>
    api.post("/share-demo", payload).then((r) => r.data);

export const portalBillingSession = (payload) =>
    api.post("/portal/billing-session", payload).then((r) => r.data);

// ---------- Lighting Upgrade Engine ----------
export const listLightingSkus = () =>
    api.get("/lighting/skus").then((r) => r.data);

export const createLightingProposal = (payload) =>
    api.post("/lighting/proposal", payload).then((r) => r.data);

export const getLightingProposal = (actionId) =>
    api.get(`/lighting/proposal/${actionId}`).then((r) => r.data);

export const approveLightingProposal = (actionId) =>
    api.post(`/lighting/proposal/${actionId}/approve`).then((r) => r.data);

export const deployLightingProposal = (actionId) =>
    api.post(`/lighting/proposal/${actionId}/deploy`).then((r) => r.data);

export const verifyLightingSavings = (actionId, verifiedAnnualSavings) =>
    api.post(`/lighting/proposal/${actionId}/verify-savings?verified_annual_savings=${verifiedAnnualSavings}`).then((r) => r.data);

export const getLightingLifecycle = (actionId) =>
    api.get(`/lighting/proposal/${actionId}/lifecycle`).then((r) => r.data);

export const getLightingPortfolio = (tenant = "acme-retail") =>
    api.get(`/lighting/portfolio?tenant=${encodeURIComponent(tenant)}`).then((r) => r.data);

export const createLightingWarrantyEvent = (payload) =>
    api.post("/lighting/warranty-event", payload).then((r) => r.data);

export const listLightingWarrantyEvents = (actionId) => {
    const qs = actionId ? `?action_id=${encodeURIComponent(actionId)}` : "";
    return api.get(`/lighting/warranty-events${qs}`).then((r) => r.data);
};

export const notifyLightingContractor = (payload) =>
    api.post("/lighting/notify-contractor", payload).then((r) => r.data);

export const getLightingStats = () =>
    api.get("/lighting/stats").then((r) => r.data);

export const portalLightingProjects = (payload) =>
    api.post("/lighting/portal/projects", payload).then((r) => r.data);

export const portalLightingApprove = (payload) =>
    api.post("/lighting/portal/approve", payload).then((r) => r.data);

export const adminLightingProjects = (token, status = "") => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return api.get(`/lighting/admin/projects${qs}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);
};

export const adminLightingLocations = (token) =>
    api.get("/lighting/admin/locations", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

export const adminLightingLifecycle = (token, actionId) =>
    api.get(`/lighting/admin/lifecycle/${actionId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

// ---------- Ops Center (Founder / Executive / Employee) ----------
export const opsFounderAccess = (key) =>
    api.post("/ops/founder-access", { key }).then((r) => r.data);

export const opsExecutiveAccess = (key) =>
    api.post("/ops/executive-access", { key }).then((r) => r.data);

export const opsEmployeeAcceptInvite = (invite_token) =>
    api.post("/ops/employee-accept-invite", { invite_token }).then((r) => r.data);

export const opsOtpRequest = (payload) =>
    api.post("/ops/otp/request", payload).then((r) => r.data);

export const opsOtpVerify = (payload) =>
    api.post("/ops/otp/verify", payload).then((r) => r.data);

// Founder-only admin endpoints (use elevated OpsAuth payload {email, token})
export const opsAdminUsersList = (auth) =>
    api.post("/ops/admin/users/list", auth).then((r) => r.data);

export const opsAdminUsersUpsert = (payload) =>
    api.post("/ops/admin/users/upsert", payload).then((r) => r.data);

export const opsAdminUsersDeactivate = (payload) =>
    api.post("/ops/admin/users/deactivate", payload).then((r) => r.data);

export const opsAdminUsersResetAccess = (payload) =>
    api.post("/ops/admin/users/reset-access", payload).then((r) => r.data);

export const opsAdminLoginAttempts = (payload) =>
    api.post("/ops/admin/login-attempts", payload).then((r) => r.data);

export const opsAdminDeliveryStatus = (auth) =>
    api.post("/ops/admin/delivery-status", auth).then((r) => r.data);

export const opsDemoRevenue = (payload) =>
    api.post("/ops/demo-revenue", payload).then((r) => r.data);

export const opsDemoSavesGeo = (payload) =>
    api.post("/ops/demo-saves-geo", payload).then((r) => r.data);

// --- Demo save-&-resume (avatar-prompted) ---
export const saveDemoProgress = (payload) =>
    api.post("/demo/session/save", payload).then((r) => r.data);

export const opsAccessLinkRequest = (payload) =>
    api.post("/ops/access-link/request", payload).then((r) => r.data);

export const opsAccessLinkConsume = (magic_token) =>
    api.post("/ops/access-link/consume", { magic_token }).then((r) => r.data);

export const opsLogout = (payload) =>
    api.post("/ops/logout", payload).then((r) => r.data);

export const opsMe = (auth) =>
    api.post("/ops/me", auth).then((r) => r.data);

export const opsListLeads = (auth) =>
    api.post("/ops/leads/list", auth).then((r) => r.data);

export const opsCreateLead = (payload) =>
    api.post("/ops/leads/create", payload).then((r) => r.data);

export const opsUpdateLeadStatus = (payload) =>
    api.post("/ops/leads/status", payload).then((r) => r.data);

export const opsAddLeadNote = (payload) =>
    api.post("/ops/leads/note", payload).then((r) => r.data);

export const opsAddLeadTask = (payload) =>
    api.post("/ops/leads/task", payload).then((r) => r.data);

export const opsReassignLead = (payload) =>
    api.post("/ops/leads/reassign", payload).then((r) => r.data);

export const opsSendOutreach = (payload) =>
    api.post("/ops/outreach/send", payload).then((r) => r.data);

export const opsListOutreach = (auth) =>
    api.post("/ops/outreach/list", auth).then((r) => r.data);

export const opsCreateDemoLink = (payload) =>
    api.post("/ops/demo-links/create", payload).then((r) => r.data);

export const opsListDemoLinks = (auth) =>
    api.post("/ops/demo-links/list", auth).then((r) => r.data);

export const opsPerformance = (auth) =>
    api.post("/ops/performance", auth).then((r) => r.data);

export const opsAIChat = (payload) =>
    api.post("/ops/ai/chat", payload).then((r) => r.data);

export const opsListEmployees = (auth) =>
    api.post("/ops/employees/list", auth).then((r) => r.data);

export const opsInviteEmployee = (payload) =>
    api.post("/ops/employees/invite", payload).then((r) => r.data);

// ---------- Outbound Sales Engine (Founder-only) ----------
export const opsOutboundState = (auth) =>
    api.post("/ops/outbound/state", auth).then((r) => r.data);

export const opsOutboundDashboard = (auth) =>
    api.post("/ops/outbound/dashboard", auth).then((r) => r.data);

export const opsOutboundPause = (payload) =>
    api.post("/ops/outbound/pause", payload).then((r) => r.data);

export const opsOutboundListProspects = (auth) =>
    api.post("/ops/outbound/prospects/list", auth).then((r) => r.data);

export const opsOutboundAddProspect = (payload) =>
    api.post("/ops/outbound/prospects/add", payload).then((r) => r.data);

export const opsOutboundUploadProspects = (authEmail, authToken, file) => {
    const form = new FormData();
    form.append("file", file);
    const qs = `auth_email=${encodeURIComponent(authEmail)}&auth_token=${encodeURIComponent(authToken)}`;
    return api.post(`/ops/outbound/prospects/upload?${qs}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const opsOutboundScore = (payload) =>
    api.post("/ops/outbound/prospects/score", payload).then((r) => r.data);

export const opsOutboundScoreAll = (auth) =>
    api.post("/ops/outbound/prospects/score-all", auth).then((r) => r.data);

export const opsOutboundLinkedinGenerate = (payload) =>
    api.post("/ops/outbound/prospects/linkedin-generate", payload).then((r) => r.data);

export const opsOutboundLinkedinMarkSent = (payload, which = "connect") =>
    api.post(`/ops/outbound/prospects/linkedin-mark-sent?which=${encodeURIComponent(which)}`, payload).then((r) => r.data);

export const opsOutboundMarkReplied = (payload) =>
    api.post("/ops/outbound/prospects/mark-replied", payload).then((r) => r.data);

export const opsOutboundDraftsList = (auth) =>
    api.post("/ops/outbound/drafts/list", auth).then((r) => r.data);

export const opsOutboundDraftApprove = (payload) =>
    api.post("/ops/outbound/drafts/approve", payload).then((r) => r.data);

export const opsOutboundDraftReject = (payload) =>
    api.post("/ops/outbound/drafts/reject", payload).then((r) => r.data);

export const opsOutboundRunTick = (auth) =>
    api.post("/ops/outbound/run-tick", auth).then((r) => r.data);

export const opsOutboundAutopilotNow = (auth) =>
    api.post("/ops/outbound/autopilot-now", auth, { timeout: 180000 }).then((r) => r.data);

export const opsOutboundAutopilotHistory = (auth) =>
    api.post("/ops/outbound/autopilot-history", auth).then((r) => r.data);

export const opsOutboundSourcesStatus = (auth) =>
    api.post("/ops/outbound/sources-status", auth).then((r) => r.data);

export const opsOutboundArchiveInternal = (auth) =>
    api.post("/ops/outbound/admin/archive-internal", auth).then((r) => r.data);

export const opsOutboundResetDaily = (auth) =>
    api.post("/ops/outbound/admin/reset-daily-counter", auth).then((r) => r.data);

export const opsOutboundDiagnostics = (auth) =>
    api.post("/ops/outbound/admin/diagnostics", auth).then((r) => r.data);

export const opsOutboundSetDailyLimit = (payload) =>
    api.post("/ops/outbound/admin/set-daily-limit", payload).then((r) => r.data);

export const opsOutboundSeedFromDemos = (auth) =>
    api.post("/ops/outbound/seed-from-demos", auth).then((r) => r.data);

export const opsOutboundImapPollNow = (auth) =>
    api.post("/ops/outbound/imap-poll-now", auth).then((r) => r.data);

export const opsOutboundPushHotLeads = (auth) =>
    api.post("/ops/outbound/push-hot-leads", auth).then((r) => r.data);

// ---------- Universal Lead Intake (Iter 51) ----------
export const leadsAddManual = ({ email, token, lead }) =>
    api.post("/leads/add-manual", { email, token, lead }).then((r) => r.data);

export const leadsList = ({ email, token, source, industry, status, assigned_to, limit }) =>
    api.post("/leads/list", { email, token, source, industry, status, assigned_to, limit }).then((r) => r.data);

export const leadsUpdateStatus = ({ email, token, lead_id, status }) =>
    api.post("/leads/update-status", { email, token, lead_id, status }).then((r) => r.data);

export const leadsTouch = ({ email, token, lead_id, type_, note }) =>
    api.post("/leads/touch", { email, token, lead_id, type_, note }).then((r) => r.data);

export const leadsRelease = ({ email, token, lead_id }) =>
    api.post("/leads/release", { email, token, lead_id }).then((r) => r.data);

export const leadsStats = ({ email, token }) =>
    api.post("/leads/stats", { email, token }).then((r) => r.data);

export const leadsImportCsv = ({ email, token, source, file }) => {
    const fd = new FormData();
    fd.append("email", email);
    fd.append("token", token);
    fd.append("source", source || "manual");
    fd.append("file", file);
    return api.post("/leads/import-csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

// ---------- Avatar Intelligence (Iter 52) ----------
export const avatarChat = ({ session_id, user_email, history, surface }) =>
    api.post("/avatar/chat", { session_id, user_email, history, surface }).then((r) => r.data);

export const avatarQuickContext = ({ session_id, user_email }) =>
    api.post("/avatar/quick-context", { session_id, user_email }).then((r) => r.data);

export const avatarEscalate = ({ session_id, user_email, reason, last_message, contact }) =>
    api.post("/avatar/escalate", { session_id, user_email, reason, last_message, contact }).then((r) => r.data);


