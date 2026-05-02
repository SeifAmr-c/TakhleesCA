import { Router } from "express";
import * as companyPortService from "./company_port_service.js";

const router = Router();

router.post("/", companyPortService.createCompanyPort);
router.get("/", companyPortService.getCompanyPort);
router.get("/search", companyPortService.searchCompanyPort);
router.delete("/", companyPortService.deleteCompanyPort);

export default router;
