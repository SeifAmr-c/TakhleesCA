import { api } from "./client.js";

export const onlineUsers = async () => {
  const { data } = await api.get("/user/online");
  return data;
};

export const listUsers = async () => {
  const { data } = await api.get("/user");
  return data;
};

// GET /admin/stats → { ok, data: { TotalRequests, TotalTransactions, TotalWebsiteRevenue } }
export const getAdminStats = async () => {
  const { data } = await api.get("/admin/stats");
  return data;
};

// ── Company verification (admin only) ──────────────────────────
// GET /admin/companies/pending  → { ok, count, data: [...] }
export const getPendingCompanies = async () => {
  const { data } = await api.get("/admin/companies/pending");
  console.log("Pending Companies API Response:", data);
  return data;
};

// GET /admin/companies/verified → { ok, count, data: [...] }
export const getVerifiedCompanies = async () => {
  const { data } = await api.get("/admin/companies/verified");
  console.log("Verified Companies API Response:", data);
  return data;
};

/* PUT /admin/companies/:id/verify
   `body` defaults to { status: 'Verified' } per the task spec, but you can
   also pass { status: 'Rejected' } / { status: 'Pending' } or the boolean
   form { verified: true | false }. */
export const verifyCompany = async (companyId, body = { status: "Verified" }) => {
  const { data } = await api.put(`/admin/companies/${companyId}/verify`, body);
  return data;
};

// DELETE /admin/companies/:id → permanently removes a (pending) company.
export const rejectCompany = async (companyId) => {
  const { data } = await api.delete(`/admin/companies/${companyId}`);
  return data;
};

// ── Support tickets (admin only) ───────────────────────────────
// GET /admin/tickets/pending  → { ok, count, data: [...] }
export const getPendingTickets = async () => {
  const { data } = await api.get("/admin/tickets/pending");
  return data;
};

// GET /admin/tickets/resolved → { ok, count, data: [...] }
export const getResolvedTickets = async () => {
  const { data } = await api.get("/admin/tickets/resolved");
  return data;
};

// PUT /admin/tickets/:id/resolve  → stamps Resolved=1 + AdminID=session.userId
export const resolveTicket = async (ticketId) => {
  const { data } = await api.put(`/admin/tickets/${ticketId}/resolve`);
  return data;
};

// GET /admin/export-report → streamed application/pdf as a Blob.
export const exportAdminReport = async () => {
  const response = await api.get("/admin/export-report", {
    responseType: "blob",
  });
  return response.data;
};
