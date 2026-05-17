import { api } from "./client.js";

export const listCategories = async () => {
  const { data } = await api.get("/category");
  return data;
};

export const createCategory = async ({ Type }) => {
  const { data } = await api.post("/category", { Type });
  return data;
};

export const updateCategory = async (categoryId, { Type }) => {
  const { data } = await api.put("/category", { Type }, { params: { CategoryID: categoryId } });
  return data;
};

export const deleteCategory = async (categoryId) => {
  const { data } = await api.delete("/category", { params: { CategoryID: categoryId } });
  return data;
};
