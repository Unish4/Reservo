import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  confirm,
  cancel,
  list,
  read,
} from "../controllers/bookingController.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requireRole("owner", "admin", "staff"),
  validate({
    holdId: { type: "string", required: true },
  }),
  confirm,
);

router.get("/", requireRole("owner", "admin", "staff"), list);
router.get("/:id", requireRole("owner", "admin", "staff"), read);
router.delete("/:id", requireRole("owner", "admin", "staff"), cancel);

export default router;
