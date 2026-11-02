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
import {
  getAdminManualPayments,
  approveManualPayment,
  rejectManualPayment,
} from "../controllers/manualPaymentController.js";

const router = express.Router();

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

router.get("/manual-payments", getAdminManualPayments);
router.patch("/manual-payments/:id/approve", approveManualPayment);
router.patch("/manual-payments/:id/reject", rejectManualPayment);

export default router;
