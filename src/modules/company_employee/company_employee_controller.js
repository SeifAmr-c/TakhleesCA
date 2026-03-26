import { Router } from "express";
import * as companyEmployeeService from "./company_employee.service.js";

const router = Router();

router.post("/", companyEmployeeService.createCompanyEmployee);
router.get("/", companyEmployeeService.getCompanyEmployee);
router.delete("/", companyEmployeeService.deleteCompanyEmployee);
router.put("/", companyEmployeeService.updateCompanyEmployee);

export default router;