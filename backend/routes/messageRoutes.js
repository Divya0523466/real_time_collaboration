import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import {
  togglePinMessage,
  getPinnedMessages,
  getDirectMessages,
  getChannelMessages,
  getUnreadMessageCounts,
  markChannelAsRead,
  markChannelAsUnread,
  markDirectMessagesAsRead,
  markDirectMessagesAsUnread,
  starMessage,
  unstarMessage,
  getStarredMessages,
  getUserMentions,
  markMentionAsRead,
  markAllMentionsAsRead,
  forwardMessage,
  deleteDirectConversation,
  toggleBlockUser,
  toggleReaction,
} from "../controllers/messageController.js"

const router = express.Router()

router.use(authenticateToken)

router.post("/forward", forwardMessage)
router.post("/:messageId/react", toggleReaction)
router.get("/unread-counts", getUnreadMessageCounts)
router.get("/starred", getStarredMessages)
router.get("/pinned", getPinnedMessages)
router.post("/:messageId/pin", togglePinMessage)
router.get("/mentions", getUserMentions)
router.post("/mentions/read-all", markAllMentionsAsRead)
router.patch("/mentions/read-all", markAllMentionsAsRead)
router.post("/mentions/:messageId/read", markMentionAsRead)
router.patch("/mentions/:messageId/read", markMentionAsRead)
router.post("/:messageId/star", starMessage)
router.delete("/:messageId/star", unstarMessage)
router.post("/channels/:channelId/read", markChannelAsRead)
router.post("/channels/:channelId/unread", markChannelAsUnread)
router.post("/direct/:userId/read", markDirectMessagesAsRead)
router.post("/direct/:userId/unread", markDirectMessagesAsUnread)
router.post("/direct/:userId/block", toggleBlockUser)
router.delete("/direct/:userId/conversation", deleteDirectConversation)
router.delete("/direct/:userId", deleteDirectConversation)
router.delete("/:userId/conversation", deleteDirectConversation)
router.get("/channels/:channelId", getChannelMessages)
router.get("/:userId", getDirectMessages)

export default router
