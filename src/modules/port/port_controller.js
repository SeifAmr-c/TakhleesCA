import { Router } from "express";
import * as portService from "./port_service.js";

const router = Router();

router.post("/", portService.createPort);
router.get("/", portService.getPort);
router.get("/search", portService.searchPort);
router.delete("/", portService.deletePort);
router.put("/", portService.updatePort);

export default router;
