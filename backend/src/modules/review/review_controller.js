import { Router } from "express";
import * as reviewService from "./review_service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/averages", reviewService.getReviewAverages);
router.get("/by-client", reviewService.getClientReviewedApplications);
router.get("/company", reviewService.getCompanyReviews);
router.post("/", reviewService.createReview);
router.get("/", reviewService.getReview);
router.get("/search", reviewService.searchReview);
router.delete("/", reviewService.deleteReview);
router.put("/", reviewService.updateReview);
router.put("/client", requireAuth, reviewService.updateClientReview);
router.delete("/client", requireAuth, reviewService.deleteClientReview);

export default router;
