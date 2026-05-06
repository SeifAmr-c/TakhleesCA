import { api } from "./client.js";

export const onlineUsers = async () => {
  const { data } = await api.get("/user/online");
  return data;
};

export const listUsers = async () => {
  const { data } = await api.get("/user");
  return data;
};

export const listSupportTickets = async () => {
  const { data } = await api.get("/supportticket", { params: { TicketID: "%" } });
  return data;
};

export const resolveSupportTicket = async (ticketId) => {
  const { data } = await api.put("/supportticket", { Resolved: 1 }, { params: { TicketID: ticketId } });
  return data;
};
