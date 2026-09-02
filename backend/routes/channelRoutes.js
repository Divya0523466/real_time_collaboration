import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import {
  createChannel,
  getWorkspaceChannels,
  getChannel,
  updateChannel,
  deleteChannel,
  addChannelMember,
  removeChannelMember,
} from "../controllers/channelController.js"

const router = express.Router()

router.use(authenticateToken)

router.post("/:workspaceId/channels", createChannel)
router.get("/:workspaceId/channels", getWorkspaceChannels)
router.get("/:workspaceId/channels/:channelId", getChannel)
router.patch("/:workspaceId/channels/:channelId", updateChannel)
router.delete("/:workspaceId/channels/:channelId", deleteChannel)
router.post("/:workspaceId/channels/:channelId/members", addChannelMember)
router.delete("/:workspaceId/channels/:channelId/members/:memberId", removeChannelMember)

export default router
