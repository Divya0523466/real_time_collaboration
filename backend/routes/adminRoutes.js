import express from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import requireSuperAdmin from "../middleware/requireSuperAdmin.js";
import {
  getAdminStats,
  getAdminUsers,
  getAdminWorkspaces,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  deleteWorkspace,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication and super admin privileges
router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get("/stats", getAdminStats);
router.get("/users", getAdminUsers);
router.get("/workspaces", getAdminWorkspaces);
router.patch("/users/:userId/role", updateUserRole);
router.patch("/users/:userId/status", updateUserStatus);
router.patch("/users/:userId", updateUserStatus);
router.delete("/users/:userId", deleteUser);
router.delete("/workspaces/:workspaceId", deleteWorkspace);

export default router;
