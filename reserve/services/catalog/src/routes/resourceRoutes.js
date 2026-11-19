// src/routes/resourceRoutes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  createResource,
  listResources,
  getResource,
  updateResource,
} from "../controllers/resourceController.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRole("owner", "admin", "staff"), listResources);
router.get("/:id", requireRole("owner", "admin", "staff"), getResource);
router.post(
  "/",
  requireRole("owner", "admin"),
  validate({
    name: { type: "string", required: true, max: 120 },
    type: { type: "string", required: true },
    capacity: { type: "number", required: false },
  }),
  createResource,
);
router.patch("/:id", requireRole("owner", "admin"), updateResource);

export default router;
