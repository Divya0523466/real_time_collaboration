import express from "express";
import {
  createCheckoutSession,
  verifySession,
  getSubscriptionStatus,
  cancelSubscription,
  handleWebhook,
} from "../controllers/billingController.js";
import {
  submitManualPayment,
  getMyPaymentStatus,
} from "../controllers/manualPaymentController.js";
import authenticateToken from "../middleware/authenticateToken.js";
import uploadMiddleware from "../middleware/upload.js";

const router = express.Router();

router.post("/create-checkout-session", authenticateToken, createCheckoutSession);
router.post("/verify-session", authenticateToken, verifySession);
router.get("/status", authenticateToken, getSubscriptionStatus);
router.post("/cancel-subscription", authenticateToken, cancelSubscription);
router.post("/webhook", handleWebhook);

router.post("/manual-payment", authenticateToken, uploadMiddleware.single("screenshot"), submitManualPayment);
router.get("/manual-payment/status", authenticateToken, getMyPaymentStatus);

export default router;
