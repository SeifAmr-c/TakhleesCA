import { api } from "./client.js";

export const listPorts = async () => {
  const { data } = await api.get("/port");
  return data;
};

export const createPort = async ({ PortName, PortType, EstDate }) => {
  const { data } = await api.post("/port", { PortName, PortType, EstDate });
  return data;
};

export const updatePort = async (portId, { PortName, PortType, EstDate }) => {
  const { data } = await api.put("/port", { PortName, PortType, EstDate }, { params: { PortID: portId } });
  return data;
};

export const deletePort = async (portId) => {
  const { data } = await api.delete("/port", { params: { PortID: portId } });
  return data;
};

export const listCompanyPorts = async (companyId) => {
  const { data } = await api.get("/companyport", { params: { CompanyID: companyId } });
  return data;
};

export const addCompanyPort = async ({ CompanyID, PortID }) => {
  const { data } = await api.post("/companyport", { CompanyID, PortID });
  return data;
};

export const removeCompanyPort = async (companyId, portId) => {
  const { data } = await api.delete("/companyport", { params: { CompanyID: companyId, PortID: portId } });
  return data;
};
