import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import * as companyService from "./company_service.js";
import { requireCompany } from "../../middleware/auth.js";

const companyRegistrationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "ComReg") {
      return cb(null, file.mimetype === "application/pdf");
    }
    if (file.fieldname === "logo") {
      return cb(null, /^image\//.test(file.mimetype));
    }
    return cb(null, false);
  },
});

/* Profile update accepts an optional logo image only — separate from
   registration so we cap at 4MB (matches the frontend) and reject any
   other field. */
const profileUpdateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "logo") {
      return cb(null, /^image\//.test(file.mimetype));
    }
    return cb(null, false);
  },
});

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many login attempts. Please try again in a minute." },
});

router.post(
  "/",
  companyRegistrationUpload.fields([
    { name: "ComReg", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  companyService.createCompany
);
router.post("/login", loginLimiter, companyService.loginCompany);
router.post("/logout", companyService.logoutCompany);
router.get("/", companyService.getCompany);
router.get("/dashboard-stats", requireCompany, companyService.getCompanyDashboardStats);
router.get("/export-report", requireCompany, companyService.generatePerformanceReport);
router.get("/search", companyService.searchCompany);
router.put(
  "/profile",
  requireCompany,
  profileUpdateUpload.fields([{ name: "logo", maxCount: 1 }]),
  companyService.updateCompanyProfile
);
router.put("/pricing", requireCompany, companyService.updateCompanyPricing);
router.delete("/", companyService.deleteCompany);
router.put("/", companyService.updateCompany);

export default router;
