import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as userService from "./user_service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many login attempts. Please try again in a minute." },
});

router.get("/", userService.getUser);
router.get("/search", userService.searchUser);
// router.get("/me", userService.me);
router.get("/online", requireAuth, userService.onlineUsers);
router.post("/register", userService.register);
router.post("/login", loginLimiter, userService.login);
router.post("/logout", userService.logout);
router.delete("/", userService.deleteUser);
router.put("/", userService.updateUser);
router.put("/client", userService.updateClient);
router.put("/admin", userService.updateAdmin);

export default router;