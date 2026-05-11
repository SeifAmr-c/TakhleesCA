import { Router } from "express";
import * as categoryService from "./category_service.js";

const router = Router();

router.post("/", categoryService.createCategory);
router.get("/", categoryService.getCategory);
router.get("/search", categoryService.searchCategory);
router.delete("/", categoryService.deleteCategory);
router.put("/", categoryService.updateCategory);

export default router;