import { api } from "./client.js";

export const submitReview = async ({ Review, Rating, ApplicationID, CategoryID }) => {
  const { data } = await api.post("/review", { Review, Rating, ApplicationID, CategoryID });
  return data;
};

export const listCompanyReviews = async (companyId) => {
  const { data } = await api.get("/review/company", { params: { CompanyID: companyId } });
  return data;
};

export const listReviewAverages = async () => {
  const { data } = await api.get("/review/averages");
  return data;
};

export const listClientReviewedApplications = async (clientId) => {
  const { data } = await api.get("/review/by-client", { params: { ClientID: clientId } });
  return data;
};

export const checkApplicationReviewed = async (applicationId) => {
  const { data } = await api.get("/review/search", {
    params: { keyword: "ApplicationID", keyvalue: applicationId },
  });
  return Array.isArray(data) && data.length > 0;
};

export const getApplicationReview = async (applicationId) => {
  const { data } = await api.get("/review/search", {
    params: { keyword: "ApplicationID", keyvalue: applicationId },
  });
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

export const updateClientReview = async (reviewId, { Review, Rating }) => {
  const { data } = await api.put("/review/client", { Review, Rating }, { params: { ReviewID: reviewId } });
  return data;
};

export const deleteClientReview = async (reviewId) => {
  const { data } = await api.delete("/review/client", { params: { ReviewID: reviewId } });
  return data;
};
