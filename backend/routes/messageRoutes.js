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
  getUserMentions,
  markMentionAsRead,
  markAllMentionsAsRead,
} from "../controllers/messageController.js"

const router = express.Router()

router.use(authenticateToken)

router.get("/unread-counts", getUnreadMessageCounts)
router.get("/starred", getStarredMessages)
router.get("/mentions", getUserMentions)
router.post("/mentions/read-all", markAllMentionsAsRead)
router.patch("/mentions/read-all", markAllMentionsAsRead)
router.post("/mentions/:messageId/read", markMentionAsRead)
router.patch("/mentions/:messageId/read", markMentionAsRead)
router.post("/:messageId/star", starMessage)
router.delete("/:messageId/star", unstarMessage)
router.post("/channels/:channelId/read", markChannelAsRead)
router.post("/direct/:userId/read", markDirectMessagesAsRead)
router.get("/channels/:channelId", getChannelMessages)
router.get("/:userId", getDirectMessages)

export default router
