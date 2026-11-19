import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  createHold,
  deleteHold,
  readHold,
  checkSlot,
} from "../controllers/holdController.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requireRole("owner", "admin", "staff"),
  validate({
    resourceId: { type: "string", required: true },
    date: { type: "string", required: true },
    startTime: { type: "string", required: true },
    endTime: { type: "string", required: true },
  }),
  createHold,
);

router.delete("/:id", requireRole("owner", "admin", "staff"), deleteHold);
router.get("/:id", requireRole("owner", "admin", "staff"), readHold);
router.get(
  "/check/:resourceId",
  requireRole("owner", "admin", "staff"),
  checkSlot,
);

export default router;
