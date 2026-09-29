import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import {
  getDirectMessages,
  getChannelMessages,
  getUnreadMessageCounts,
  markChannelAsRead,
  markDirectMessagesAsRead,
  starMessage,
  unstarMessage,
  getStarredMessages,
} from "../controllers/messageController.js"

const router = express.Router()

router.use(authenticateToken)

router.get("/unread-counts", getUnreadMessageCounts)
router.get("/starred", getStarredMessages)
router.post("/:messageId/star", starMessage)
router.delete("/:messageId/star", unstarMessage)
router.post("/channels/:channelId/read", markChannelAsRead)
router.post("/direct/:userId/read", markDirectMessagesAsRead)
router.get("/channels/:channelId", getChannelMessages)
router.get("/:userId", getDirectMessages)

export default router
