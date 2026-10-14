import express from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  createGroup,
  getWorkspaceGroups,
  getGroup,
  getGroupMessages,
  sendGroupMessage,
  addGroupMembers,
  removeGroupMember,
} from "../controllers/groupController.js";

const router = express.Router();
// auth middleware
router.use(authenticateToken);

router.post("/", createGroup);
router.get("/workspace/:workspaceId", getWorkspaceGroups);
router.get("/:groupId", getGroup);
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", sendGroupMessage);
router.post("/:groupId/members", addGroupMembers);
router.delete("/:groupId/members/:userId", removeGroupMember);

export default router;
