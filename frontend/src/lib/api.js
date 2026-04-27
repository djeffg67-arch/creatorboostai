import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const captureLead = (payload) => api.post("/leads", payload).then((r) => r.data);

export const analyzeLead = (description) =>
    api.post("/lead/analyze", { description }).then((r) => r.data);

export const listProducts = () => api.get("/products").then((r) => r.data);

export const createCheckoutSession = (payload) =>
    api.post("/checkout/session", payload).then((r) => r.data);

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

export const submitApplication = (payload) =>
    api.post("/applications", payload).then((r) => r.data);

export const listSubscriptions = () =>
    api.get("/subscriptions").then((r) => r.data);

export const listHighTicket = () =>
    api.get("/programs/high-ticket").then((r) => r.data);

export const createSubscriptionSession = (payload) =>
    api.post("/checkout/subscription", payload).then((r) => r.data);

export const portalLogin = (payload) =>
    api.post("/portal/login", payload).then((r) => r.data);

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
