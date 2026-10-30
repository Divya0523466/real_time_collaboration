import express from "express";
import {
  createCheckoutSession,
  verifySession,
  getSubscriptionStatus,
  cancelSubscription,
  handleWebhook,
} from "../controllers/billingController.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();

router.post("/create-checkout-session", authenticateToken, createCheckoutSession);
router.post("/verify-session", authenticateToken, verifySession);
router.get("/status", authenticateToken, getSubscriptionStatus);
router.post("/cancel-subscription", authenticateToken, cancelSubscription);
router.post("/webhook", handleWebhook);

export default router;
