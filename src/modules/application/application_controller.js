import { Router } from "express";
import * as applicationService from "./application_service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, applicationService.createApplication);
router.get("/", applicationService.getApplication);
router.get("/search", applicationService.searchApplication);
router.delete("/", applicationService.deleteApplication);
router.put("/", applicationService.updateApplication);

export default router;