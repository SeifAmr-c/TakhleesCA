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

// PUT /user/profile (requires user session)
//   body:    { FirstName, LastName, Email }
//   200:     { ok: true, message, data: { user } }
//   400/401/409: { ok: false, message }
export const updateUserProfile = async ({ FirstName, LastName, Email }) => {
  const { data } = await api.put("/user/profile", { FirstName, LastName, Email });
  return data;
};

// GET /user/can-delete (requires user session)
//   Used by the profile-edit page to freeze the Delete button before
//   the user can trigger the 400 path.
//   200: { ok: true, hasActiveApplications: boolean }
export const canDeleteUser = async () => {
  const { data } = await api.get("/user/can-delete");
  return data;
};

// DELETE /user/profile (requires user session)
//   Account self-deletion. Backend blocks with 400 when the user has
//   any Pending / In Progress applications.
//   200: { ok: true, message }
//   400: { ok: false, message: "Cannot delete account if there is an active application." }
export const deleteUserAccount = async () => {
  const { data } = await api.delete("/user/profile");
  return data;
};
