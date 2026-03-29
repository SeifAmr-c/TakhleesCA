import { Router } from "express";
import * as userService from "./user_service.js";

const router = Router();

router.get("/", userService.getUser);
router.get("/search", userService.searchUser);
router.post("/", userService.createUser);
router.delete("/", userService.deleteUser);
router.put("/", userService.updateUser);
router.put("/client", userService.updateClient);
router.put("/admin", userService.updateAdmin);

export default router;