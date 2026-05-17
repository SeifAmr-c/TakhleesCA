import { api } from "./client.js";

export const listMyTickets = async () => {
  const { data } = await api.get("/supportticket/client");
  return data;
};

export const updateMyTicket = async (ticketId, { Issue }) => {
  const { data } = await api.put("/supportticket/client", { Issue }, { params: { TicketID: ticketId } });
  return data;
};

export const deleteMyTicket = async (ticketId) => {
  const { data } = await api.delete(`/supportticket/client/${ticketId}`);
  return data;
};
