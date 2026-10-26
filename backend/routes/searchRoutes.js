import express from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { globalSearch } from "../controllers/searchController.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/", globalSearch);

export default router;
