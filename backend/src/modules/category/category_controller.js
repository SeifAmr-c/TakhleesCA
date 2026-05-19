import { Router } from "express";
import * as categoryService from "./category_service.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

/* GET stays public — both the application form and the company pricing
   picker need to read the catalog. */
router.get("/", categoryService.getCategory);
router.get("/search", categoryService.searchCategory);

/* Admin-only catalog management. */
router.get("/with-usage", requireAdmin, categoryService.getCategoriesWithUsage);
router.post("/", requireAdmin, categoryService.createCategory);
router.put("/", requireAdmin, categoryService.updateCategory);
router.delete("/", requireAdmin, categoryService.deleteCategory);

export default router;
