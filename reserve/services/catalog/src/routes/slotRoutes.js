import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getSlots } from "../controllers/slotController.js";

const router = Router();
router.use(requireAuth);
router.get("/:resourceId", requireRole("owner", "admin", "staff"), getSlots);
export default router;
