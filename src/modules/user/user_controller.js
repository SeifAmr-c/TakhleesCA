import { Router } from "express";
import * as userService from "./user_service.js";

const router = Router();

router.get("/", userService.getUser);
router.get("/search", userService.searchUser);
router.get("/me", userService.me);
router.get("/online", userService.onlineUsers);
router.post("/register", userService.register);
router.post("/login", userService.login);
router.post("/logout", userService.logout);
router.delete("/", userService.deleteUser);
router.put("/", userService.updateUser);
router.put("/client", userService.updateClient);
router.put("/admin", userService.updateAdmin);

export default router;