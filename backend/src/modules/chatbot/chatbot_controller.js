import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as chatbotService from "./chatbot_service.js";
import { requireClient } from "../../middleware/auth.js";

const router = Router();

/* The assistant calls Gemini per message, so cap per-IP request volume to
   keep model usage and cost bounded under abuse. Same library/shape as the
   login limiter. */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, code: "RATE_LIMITED", message: "Too many messages. Please slow down and try again in a minute." },
});

/* Clients only — admins/companies are rejected by requireClient even with a
   valid session. Streams a Server-Sent Events response (see service). */
router.post("/message", chatLimiter, requireClient, chatbotService.streamMessage);

export default router;
