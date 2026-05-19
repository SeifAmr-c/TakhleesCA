import { Router } from "express";
import * as portService from "./port_service.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

/* GET routes stay open — companies need them to render the port picker on
   the profile-edit page and the public site reads them for listings. */
router.get("/", portService.getPort);
router.get("/search", portService.searchPort);

/* Admin-only management endpoints. */
router.get("/with-usage", requireAdmin, portService.getPortsWithUsage);
router.post("/", requireAdmin, portService.createPort);
router.put("/", requireAdmin, portService.updatePort);
router.delete("/", requireAdmin, portService.deletePort);

export default router;
