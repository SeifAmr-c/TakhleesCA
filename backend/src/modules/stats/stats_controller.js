import { Router } from "express";
import * as statsService from "./stats_service.js";

const router = Router();

/* Public — feeds the unauthenticated landing page. Returns only
   aggregate counts and a name-stripped sample application. */
router.get("/landing", statsService.getLandingStats);

export default router;
