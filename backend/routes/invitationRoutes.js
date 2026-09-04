import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import {
  inviteMembers,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "../controllers/invitationController.js"

const router = express.Router()

router.use(authenticateToken)
router.get("/invitations", getPendingInvitations)
router.post("/invitations/:invitationId/accept", acceptInvitation)
router.post("/invitations/:invitationId/decline", declineInvitation)
router.post("/:workspaceId/invite", inviteMembers)

export default router
