import { api } from "./client";

// Backend contract (POST /user/login):
//   body:    { Email, Password }
//   200:     { ok: true, message, data: { user: {...} } }
//   400/401: { ok: false, message }
//   429:     { ok: false, message }   (rate limited)
export const login = async ({ email, password }) => {
  const { data } = await api.post("/user/login", {
    Email: email,
    Password: password,
  });
  return data;
};

export const logout = async () => {
  const { data } = await api.post("/user/logout");
  return data;
};

// POST /user/register
//   body for Client (Type='C'): FirstName, LastName, Email, Password,
//                               Type, PhoneNumber, NationalID, Address
//   body for Admin  (Type='A'): FirstName, LastName, Email, Password, Type
//   201:     { ok: true, message, data: { user } }
//   400/409: { ok: false, message }
export const register = async (payload) => {
  const { data } = await api.post("/user/register", payload);
  return data;
};
