import { api } from "./client.js";

export const listApplications = async (params = {}) => {
  const { data } = await api.get("/application", { params });
  return data;
};

export const createApplication = async (payload) => {
  const isFormData = payload instanceof FormData;
  const { data } = await api.post(
    "/application",
    payload,
    isFormData ? { headers: { "Content-Type": undefined } } : {}
  );
  return data;
};

// Map UI status names to the DB ENUM ('Pending' | 'In Progress' | 'Completed').
// The dashboards use lower-case sentinels like 'accepted' and 'in_progress';
// the DB only stores three states, so 'accepted' folds into 'In Progress'.
// 'rejected' isn't a valid DB value yet, so we surface that via an Error so
// the UI can decide how to react instead of silently corrupting state.
const STATUS_TO_DB = {
  pending: "Pending",
  accepted: "In Progress",
  in_progress: "In Progress",
  completed: "Completed",
};

export const updateApplicationStatus = async (applicationId, status) => {
  const dbStatus = STATUS_TO_DB[status];
  if (!dbStatus) {
    throw new Error(`Status "${status}" is not supported by the database schema yet.`);
  }
  const { data } = await api.put(
    `/application`,
    { Status: dbStatus },
    { params: { ApplicationID: applicationId } }
  );
  return data;
};

export const listCategories = async () => {
  const { data } = await api.get("/category");
  return data;
};

// DELETE /application/:id/cancel (requires user session)
//   Client-initiated cancellation. Backend deletes only when the row
//   belongs to the signed-in client AND is still 'Pending'; otherwise
//   responds 400.
//   200: { ok: true, message }
//   400: { ok: false, message: "Application cannot be cancelled." }
export const cancelApplication = async (applicationId) => {
  const { data } = await api.delete(`/application/${applicationId}/cancel`);
  return data;
};

// DELETE /application/:id/reject (requires company session)
//   Company-initiated rejection. Backend deletes the application, its
//   embedded documents/payments, and the documents' Cloudinary files, but
//   only when the row belongs to the signed-in company AND is 'Pending'.
//   200: { ok: true, message }
//   404: { ok: false, message }
export const rejectApplication = async (applicationId) => {
  const { data } = await api.delete(`/application/${applicationId}/reject`);
  return data;
};
