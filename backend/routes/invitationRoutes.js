import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import { inviteMembers } from "../controllers/invitationController.js"

const router = express.Router()

router.use(authenticateToken)
router.post("/:workspaceId/invite", inviteMembers)

export default router
