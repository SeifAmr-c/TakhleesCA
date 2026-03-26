import { Router } from "express";
import * as applicationService from "./application.service.js";

const router = Router();

router.post("/", applicationService.createApplication);
router.get("/", applicationService.getApplication);
router.delete("/", applicationService.deleteApplication);
router.put("/", applicationService.updateApplication);

export default router;