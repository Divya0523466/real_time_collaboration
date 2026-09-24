import express from "express"
import { register, login, logout, forgotPassword, verifyOTP, resetPassword } from "../controllers/authController.js"
import { initiateGoogleOAuth, googleOAuthCallback } from "../controllers/googleAuthController.js"
import { getMe } from "../controllers/authMeController.js"
import authenticateToken from "../middleware/authenticateToken.js"

const router = express.Router()

router.get("/google", initiateGoogleOAuth)
router.get("/google/callback", googleOAuthCallback)
router.get("/me", authenticateToken, getMe)

router.post("/register", register)
router.post("/login", login)
router.post("/logout", logout)
router.post("/forgot-password",forgotPassword);
router.post("/verify-otp",verifyOTP);
router.post("/reset-password", resetPassword);

export default router