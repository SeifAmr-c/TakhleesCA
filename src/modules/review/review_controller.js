import { Router } from "express";
import * as reviewService from "./review_service.js";

const router = Router();

router.post("/", reviewService.createReview);
router.get("/", reviewService.getReview);
router.get("/search", reviewService.searchReview);
router.delete("/", reviewService.deleteReview);
router.put("/", reviewService.updateReview);

export default router;