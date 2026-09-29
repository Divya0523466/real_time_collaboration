import express from "express";
import {
  uploadFile,
  getFileById,
  downloadOrViewFile,
} from "../controllers/uploadController.js";
import { uploadMiddleware } from "../middleware/upload.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();

router.post("/", authenticateToken, uploadMiddleware.single("file"), uploadFile);
router.get("/file/:id/download", authenticateToken, downloadOrViewFile);
router.get("/file/:id/view", authenticateToken, downloadOrViewFile);
router.get("/view", authenticateToken, downloadOrViewFile);
router.get("/download", authenticateToken, downloadOrViewFile);
router.get("/:id", authenticateToken, getFileById);

export default router;
