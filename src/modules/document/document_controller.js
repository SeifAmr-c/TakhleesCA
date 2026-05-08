import { Router } from "express";
import multer from "multer";
import * as documentService from "./document_service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

router.post("/upload", upload.single("file"), documentService.createDocumentWithFile);
router.get("/by-application", documentService.getDocumentsByApplication);
router.get("/search", documentService.searchDocument);
router.post("/", documentService.createDocument);
router.get("/", documentService.getDocument);
router.delete("/", documentService.deleteDocument);
router.put("/", documentService.updateDocument);

export default router;
