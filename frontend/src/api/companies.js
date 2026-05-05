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

export const verifyCompany = async (companyId, status) => {
  const { data } = await api.put(`/company`, { CompanyID: companyId, Status: status });
  return data;
};

export const searchCompanies = async ({ keyword, keyvalue, sort } = {}) => {
  const { data } = await api.get(`/company/search`, { params: { keyword, keyvalue, sort } });
  return data;
};
