import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as companyService from "./company_service.js";
import { requireCompany } from "../../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many login attempts. Please try again in a minute." },
});

router.post("/", companyService.createCompany);
router.post("/login", loginLimiter, companyService.loginCompany);
router.post("/logout", companyService.logoutCompany);
router.get("/", companyService.getCompany);
router.get("/search", companyService.searchCompany);
router.put("/profile", requireCompany, companyService.updateCompanyProfile);
router.put("/pricing", requireCompany, companyService.updateCompanyPricing);
router.delete("/", companyService.deleteCompany);
router.put("/", companyService.updateCompany);

export default router;
