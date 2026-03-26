import { Router } from "express";
import * as applicationService from "./application_service.js";

const router = Router();

router.post("/", applicationService.createApplication);
router.get("/", applicationService.getApplication);
router.delete("/", applicationService.deleteApplication);
router.put("/", applicationService.updateApplication);

export default router;