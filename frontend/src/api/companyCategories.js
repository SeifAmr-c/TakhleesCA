import { api } from "./client.js";

/* Admin-managed catalog — kept here alongside the company-side helpers so
   both surfaces import from one place. */
export const listCategories = async () => {
  const { data } = await api.get("/category");
  return Array.isArray(data) ? data : data?.data || [];
};

export const listCategoriesWithUsage = async () => {
  const { data } = await api.get("/category/with-usage");
  return Array.isArray(data) ? data : data?.data || [];
};

export const createCategory = async ({ Type }) => {
  const { data } = await api.post("/category", { Type });
  return data;
};

export const updateCategory = async (categoryId, body) => {
  const { data } = await api.put("/category", body, { params: { CategoryID: categoryId } });
  return data;
};

export const deleteCategory = async (categoryId) => {
  const { data } = await api.delete("/category", { params: { CategoryID: categoryId } });
  return data;
};

// GET /companycategory?CompanyID=X
//   → [{ CompanyID, CategoryID, Price, Type }, ...]
//
// Returns every category that the given company services, with the
// company-specific price. Used by the application form to auto-fill
// the "Total Amount" field as the user picks a category.
export const listCompanyCategoryPricing = async (companyId) => {
  const { data } = await api.get("/companycategory", {
    params: { CompanyID: companyId },
  });
  return Array.isArray(data) ? data : data?.data || [];
};

// GET /companycategory?CompanyID=X&CategoryID=Y
//   → [{ CompanyID, CategoryID, Price }]
//
// Single-row variant. Useful when only one price is needed.
export const getCompanyCategoryPrice = async (companyId, categoryId) => {
  const { data } = await api.get("/companycategory", {
    params: { CompanyID: companyId, CategoryID: categoryId },
  });
  const rows = Array.isArray(data) ? data : data?.data || [];
  return rows[0]?.Price ?? null;
};

// POST /companycategory  body: { CompanyID, CategoryID, Price }
export const createCompanyCategoryPrice = async (companyId, categoryId, price) => {
  const { data } = await api.post("/companycategory", {
    CompanyID: companyId,
    CategoryID: categoryId,
    Price: price,
  });
  return data;
};

// PUT /companycategory?CompanyID=X&CategoryID=Y  body: { Price }
export const updateCompanyCategoryPrice = async (companyId, categoryId, price) => {
  const { data } = await api.put(
    "/companycategory",
    { Price: price },
    { params: { CompanyID: companyId, CategoryID: categoryId } }
  );
  return data;
};

// Convenience: try update first, fall back to create on 404 (no row yet).
// The backend returns 404 from PUT when the (CompanyID, CategoryID) pair
// doesn't exist; rather than make the caller juggle that, do it here.
export const upsertCompanyCategoryPrice = async (companyId, categoryId, price) => {
  try {
    return await updateCompanyCategoryPrice(companyId, categoryId, price);
  } catch (err) {
    if (err?.response?.status === 404) {
      return await createCompanyCategoryPrice(companyId, categoryId, price);
    }
    throw err;
  }
};

// DELETE /companycategory?CompanyID=X&CategoryID=Y
export const deleteCompanyCategoryPrice = async (companyId, categoryId) => {
  const { data } = await api.delete("/companycategory", {
    params: { CompanyID: companyId, CategoryID: categoryId },
  });
  return data;
};
