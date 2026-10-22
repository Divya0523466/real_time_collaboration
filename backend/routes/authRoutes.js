import express from "express";
import {
  register,
  login,
  verify2FA,
  resend2FA,
  send2FASetupOtp,
  enable2FA,
  send2FADisableOtp,
  disable2FA,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,
  updateProfile,
  updatePresenceStatus,
  getUserProfile,
  updateDnd,
} from "../controllers/authController.js";
import {
  initiateGoogleOAuth,
  googleOAuthCallback,
} from "../controllers/googleAuthController.js";
import { getMe } from "../controllers/authMeController.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();

router.get("/google", initiateGoogleOAuth);
router.get("/google/callback", googleOAuthCallback);
router.get("/me", authenticateToken, getMe);
router.put("/profile", authenticateToken, updateProfile);
router.get("/users/:userId/profile", authenticateToken, getUserProfile);
router.patch("/status", authenticateToken, updatePresenceStatus);
router.put("/dnd", authenticateToken, updateDnd);

router.post("/register", register);
router.post("/login", login);
router.post("/verify-2fa", verify2FA);
router.post("/resend-2fa-otp", resend2FA);

// 2FA management endpoints (require authenticated session)
router.post("/2fa/send-setup-otp", authenticateToken, send2FASetupOtp);
router.post("/2fa/enable", authenticateToken, enable2FA);
router.post("/2fa/send-disable-otp", authenticateToken, send2FADisableOtp);
router.post("/2fa/disable", authenticateToken, disable2FA);

router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

export default router;
