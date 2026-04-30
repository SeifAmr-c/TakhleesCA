import { api } from "./client.js";

export const listCompanies = async () => {
  const { data } = await api.get("/company");
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
