import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import {
  createSpace,
  getSpaces,
  getSpace,
  updateSpace,
  deleteSpace,
  addSpaceMembers,
  removeSpaceMember,
  getSpaceMembers,
  getSpaceMessages,
  markSpaceAsRead,
  markSpaceAsUnread,
  getSpaceUnreadCounts,
  checkSpaceMemberByEmail,
} from "../controllers/spaceController.js"

const router = express.Router()

router.use(authenticateToken)

router.get("/unread-counts", getSpaceUnreadCounts)
router.get("/check-member", checkSpaceMemberByEmail)
router.post("/", createSpace)
router.get("/", getSpaces)
router.get("/:spaceId", getSpace)
router.put("/:spaceId", updateSpace)
router.delete("/:spaceId", deleteSpace)
router.post("/:spaceId/members", addSpaceMembers)
router.delete("/:spaceId/members/:userId", removeSpaceMember)
router.get("/:spaceId/members", getSpaceMembers)
router.get("/:spaceId/messages", getSpaceMessages)
router.post("/:spaceId/read", markSpaceAsRead)
router.post("/:spaceId/unread", markSpaceAsUnread)

export default router
