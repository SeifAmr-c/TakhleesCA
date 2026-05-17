import { Router } from "express";
import * as supportTicketService from "./support_ticket_service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/client", requireAuth, supportTicketService.listClientTickets);
router.put("/client", requireAuth, supportTicketService.updateClientTicket);
router.delete("/client/:id", requireAuth, supportTicketService.deleteClientTicket);

router.post("/", supportTicketService.createSupportTicket);
router.get("/", supportTicketService.getSupportTicket);
router.get("/search", supportTicketService.searchSupportTicket);
router.delete("/", supportTicketService.deleteSupportTicket);
router.put("/", supportTicketService.updateSupportTicket);

export default router;