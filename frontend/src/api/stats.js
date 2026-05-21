import { api } from "./client.js";

// GET /stats/landing (public)
//   200: { ok: true, data: { verifiedAgencies, containersCleared, onTimePct,
//                            inMotion, avgActivationSeconds, featured, recent } }
export const getLandingStats = async () => {
  const { data } = await api.get("/stats/landing");
  return data?.data || null;
};
