import express from "express"
import authenticateToken from "../middleware/authenticateToken.js"
import { getDirectMessages } from "../controllers/messageController.js"

const router = express.Router()

router.use(authenticateToken)

router.get("/:userId", getDirectMessages)

export default router
