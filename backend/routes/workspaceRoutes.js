import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  updateMemberRole,
  removeMember,
} from "../controllers/workspaceController.js"

const router = express.Router()

router.use(authenticateToken)

router.post("/", createWorkspace)
router.get("/", getUserWorkspaces)
router.get("/:workspaceId", getWorkspace)
router.patch("/:workspaceId", updateWorkspace)
router.delete("/:workspaceId", deleteWorkspace)
router.patch("/:workspaceId/members/:memberId/role", updateMemberRole)
router.delete("/:workspaceId/members/:memberId", removeMember)

export default router
