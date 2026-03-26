import { Router } from "express";
import * as documentService from "./document.service.js";

const router = Router();

router.post("/", documentService.createDocument);
router.get("/", documentService.getDocument);
router.delete("/", documentService.deleteDocument);
router.put("/", documentService.updateDocument);

export default router;