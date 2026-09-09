import express from "express";
import {
  uploadFile,
  getUserFiles,
  getFileById,
  deleteFile,
} from "../controllers/uploadController.js";
import { uploadMiddleware } from "../middleware/upload.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();

router.post("/", authenticateToken, uploadMiddleware.single("file"), uploadFile);

router.get("/", authenticateToken, getUserFiles);
router.get("/:id", authenticateToken, getFileById);
router.delete("/:id", authenticateToken, deleteFile);

export default router;
