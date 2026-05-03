import { api } from "./client.js";

export const listPorts = async () => {
  const { data } = await api.get("/port", { params: { PortID: "%" } });
  return data;
};
