import { api } from "./client.js";

export const onlineUsers = async () => {
  const { data } = await api.get("/user/online");
  return data;
};

export const listUsers = async () => {
  const { data } = await api.get("/user");
  return data;
};
