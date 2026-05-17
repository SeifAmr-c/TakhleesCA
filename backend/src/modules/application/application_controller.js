import { Router } from "express";
import multer from "multer";
import * as applicationService from "./application_service.js";
import { requireAuth, requireCompany, requireSession } from "../../middleware/auth.js";

/* Buffers the entire multipart payload in memory so the service can
   stream each file to Cloudinary. `any()` so we don't have to declare
   field names up-front — the frontend tags files with indexed field
   names (Document_0..Document_3) and parallel DocType_<n> text fields. */
const applicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

const router = Router();

router.post("/", requireAuth, applicationUpload.any(), applicationService.createApplication);
router.post("/complete-via-qr", requireCompany, applicationService.completeViaQr);
router.get("/company-list", requireCompany, applicationService.listCompanyApplications);
router.get("/client-list", requireAuth, applicationService.listClientApplications);
router.get("/", requireSession, applicationService.getApplication);
router.get("/search", requireSession, applicationService.searchApplication);
router.delete("/:id/cancel", requireAuth, applicationService.cancelApplication);
router.put("/:id/client-edit", requireAuth, applicationUpload.any(), applicationService.editClientApplication);
router.delete("/", applicationService.deleteApplication);
router.put("/", applicationService.updateApplication);

export default router;