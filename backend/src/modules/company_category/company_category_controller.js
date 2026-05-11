import { Router } from "express";
import * as companyCategoryService from "./company_category_service.js";

const router = Router();

router.post("/", companyCategoryService.createCompanyCategory);
router.get("/", companyCategoryService.getCompanyCategory);
router.get("/search", companyCategoryService.searchCompanyCategory);
router.put("/", companyCategoryService.updateCompanyCategory);
router.delete("/", companyCategoryService.deleteCompanyCategory);

export default router;
