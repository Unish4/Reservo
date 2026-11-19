import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  setAvailability,
  getAvailability,
  createBlackout,
  listBlackouts,
} from "../controllers/availabilityController.js";

const router = Router();

router.use(requireAuth);
router.get("/blackouts", requireRole("owner", "admin", "staff"), listBlackouts);
router.post("/blackouts", requireRole("owner", "admin"), createBlackout);
router.get(
  "/:resourceId",
  requireRole("owner", "admin", "staff"),
  getAvailability,
);
router.put("/:resourceId", requireRole("owner", "admin"), setAvailability);

export default router;
