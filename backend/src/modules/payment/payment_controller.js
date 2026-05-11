import { Router } from "express";
import * as paymentService from "./payment_service.js";

const router = Router();

router.post("/", paymentService.createPayment);
router.get("/", paymentService.getPayment);
router.get("/search", paymentService.searchPayment);
router.delete("/", paymentService.deletePayment);
router.put("/", paymentService.updatePayment);

export default router;