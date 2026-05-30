import { Router } from "express";
import * as adminService from "./admin_service.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

router.get("/stats", requireAdmin, adminService.getDashboardStats);
router.get("/export-report", requireAdmin, adminService.generateExecutiveReport);

router.get("/companies/pending", requireAdmin, adminService.listPendingCompanies);
router.get("/companies/verified", requireAdmin, adminService.listVerifiedCompanies);
router.put("/companies/:id/verify", requireAdmin, adminService.verifyCompany);
router.delete("/companies/:id", requireAdmin, adminService.rejectCompany);

router.get("/tickets/pending", requireAdmin, adminService.listPendingTickets);
router.get("/tickets/resolved", requireAdmin, adminService.listResolvedTickets);
router.put("/tickets/:id/resolve", requireAdmin, adminService.resolveTicket);

router.get("/chatlogs", requireAdmin, adminService.listChatLogs);

export default router;
