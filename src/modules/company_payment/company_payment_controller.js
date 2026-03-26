import { Router } from "express";
import * as companyPaymentService from "./company_payment.service.js";

const router = Router();

router.post("/", companyPaymentService.createCompanyPayment);
router.get("/", companyPaymentService.getCompanyPayment);
router.delete("/", companyPaymentService.deleteCompanyPayment);
router.put("/", companyPaymentService.updateCompanyPayment);

export default router;