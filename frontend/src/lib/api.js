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
