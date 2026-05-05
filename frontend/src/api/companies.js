import { api } from "./client.js";

// Backend contract (POST /company/login):
//   body:    { ContactEmail, Password }
//   200:     { ok: true, message, data: { company: {...} } }
//   400/401: { ok: false, message }
//   429:     { ok: false, message }   (rate limited)
export const loginCompany = async ({ contactEmail, password }) => {
  const { data } = await api.post("/company/login", {
    ContactEmail: contactEmail,
    Password: password,
  });
  return data;
};

export const logoutCompany = async () => {
  const { data } = await api.post("/company/logout");
  return data;
};

export const listCompanies = async ({ status } = {}) => {
  const params = status ? { VerficationStatus: status } : undefined;
  const { data } = await api.get("/company", { params });
  return data;
};

export const getCompany = async (companyId) => {
  const { data } = await api.get(`/company`, { params: { CompanyID: companyId } });
  return data;
};

export const registerCompany = async (payload) => {
  const { data } = await api.post("/company", payload);
  return data;
};

// Backend contract: PUT /company?CompanyID=<id>  body: { VerficationStatus }
//   `status` must be one of: 'Pending' | 'Verified' | 'Rejected'  (DB ENUM, capitalized)
export const verifyCompany = async (companyId, status) => {
  const { data } = await api.put(
    `/company`,
    { VerficationStatus: status },
    { params: { CompanyID: companyId } }
  );
  return data;
};

// Backend contract (PUT /company/profile, requires company session):
//   body: { Governorate?, Address?, ContactEmail?, About? }
//   200:  { ok: true, data: { company: {...} } }
export const updateCompanyProfile = async (payload) => {
  const { data } = await api.put("/company/profile", payload);
  return data;
};

// Backend contract (PUT /company/pricing, requires company session):
//   body: { prices: [{ CategoryID, Price }, ...] }
//   200:  { ok: true, data: { prices: [...] } }
export const updateCompanyPricing = async (prices) => {
  const { data } = await api.put("/company/pricing", { prices });
  return data;
};

// Backend contract (GET /company/dashboard-stats, requires company session):
//   200: { ok: true, data: { CompanyID, CompletedRevenue, Comm,
//                            CommissionAmount, PlatformFee, NetEarnings } }
export const getCompanyDashboardStats = async () => {
  const { data } = await api.get("/company/dashboard-stats");
  return data;
};

export const searchCompanies = async ({ keyword, keyvalue, sort } = {}) => {
  const { data } = await api.get(`/company/search`, { params: { keyword, keyvalue, sort } });
  return data;
};
