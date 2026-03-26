import { Router } from "express";
import * as companyService from "./company.service.js";

const router = Router();

router.post("/", companyService.createCompany);
router.get("/", companyService.getCompany);
router.delete("/", companyService.deleteCompany);
router.put("/", companyService.updateCompany);

export default router;