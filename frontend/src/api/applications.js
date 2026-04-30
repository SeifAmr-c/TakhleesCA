import { api } from "./client.js";

export const listApplications = async (params = {}) => {
  const { data } = await api.get("/application", { params });
  return data;
};

export const createApplication = async (payload) => {
  const { data } = await api.post("/application", payload);
  return data;
};

export const updateApplicationStatus = async (applicationId, status) => {
  const { data } = await api.put(`/application`, {
    ApplicationID: applicationId,
    Status: status,
  });
  return data;
};

export const listCategories = async () => {
  const { data } = await api.get("/category");
  return data;
};
