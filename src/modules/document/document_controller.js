import { Router } from "express";
import * as documentService from "./document_service.js";

const router = Router();

router.post("/", documentService.createDocument);
router.get("/", documentService.getDocument);
router.get("/search", documentService.searchDocument);
router.delete("/", documentService.deleteDocument);
router.put("/", documentService.updateDocument);

export default router;