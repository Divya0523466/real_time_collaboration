import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import {
  getDirectMessages,
  getChannelMessages,
  getUnreadMessageCounts,
  markChannelAsRead,
  markDirectMessagesAsRead,
} from "../controllers/messageController.js"

const router = express.Router()

router.use(authenticateToken)

router.get("/unread-counts", getUnreadMessageCounts)
router.post("/channels/:channelId/read", markChannelAsRead)
router.post("/direct/:userId/read", markDirectMessagesAsRead)
router.get("/channels/:channelId", getChannelMessages)
router.get("/:userId", getDirectMessages)

export default router
