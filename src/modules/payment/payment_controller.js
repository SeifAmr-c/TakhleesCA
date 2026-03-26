import { Router } from "express";
import * as paymentService from "./payment.service.js";

const router = Router();

router.post("/", paymentService.createPayment);
router.get("/", paymentService.getPayment);
router.delete("/", paymentService.deletePayment);
router.put("/", paymentService.updatePayment);

export default router;