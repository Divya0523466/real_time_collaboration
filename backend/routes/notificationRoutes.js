import express from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteSelectedNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/all", deleteAllNotifications);
router.delete("/batch", deleteSelectedNotifications);
router.post("/batch-delete", deleteSelectedNotifications);
router.delete("/:id", deleteNotification);

export default router;
