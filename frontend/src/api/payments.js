import { api } from "./client.js";

export const submitPayment = async (payload) => {
  const { data } = await api.post("/payment", payload);
  return data;
};

export const submitSupportTicket = async (payload) => {
  const { data } = await api.post("/supportticket", payload);
  return data;
};
