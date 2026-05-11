import { Router } from "express";
import * as supportTicketService from "./support_ticket_service.js";

const router = Router();

router.post("/", supportTicketService.createSupportTicket);
router.get("/", supportTicketService.getSupportTicket);
router.get("/search", supportTicketService.searchSupportTicket);
router.delete("/", supportTicketService.deleteSupportTicket);
router.put("/", supportTicketService.updateSupportTicket);

export default router;