import { Router } from "express";
import * as companyPaymentService from "./company_payment_service.js";

const router = Router();

router.post("/", companyPaymentService.createCompanyPayment);
router.get("/", companyPaymentService.getCompanyPayment);
router.get("/search", companyPaymentService.searchCompanyPayment);
router.delete("/", companyPaymentService.deleteCompanyPayment);
router.put("/", companyPaymentService.updateCompanyPayment);

export default router;