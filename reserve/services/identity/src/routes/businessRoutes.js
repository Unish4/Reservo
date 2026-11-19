import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  createBusiness,
  listMyBusinesses,
  addMember,
  listMembers,
} from "../controllers/businessController.js";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "../controllers/apiKeyController.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  validate({
    name: { type: "string", required: true, max: 120 },
  }),
  createBusiness,
);

router.get("/", listMyBusinesses);

router.post(
  "/:businessId/members",
  requireRole("owner", "admin"),
  validate({
    email: { type: "string", required: true, email: true },
    role: { type: "string", required: true },
  }),
  addMember,
);

router.get(
  "/:businessId/members",
  requireRole("owner", "admin", "staff"),
  listMembers,
);

router.post(
  "/:businessId/api-keys",
  requireRole("owner", "admin"),
  validate({
    name: { type: "string", required: true, max: 80 },
  }),
  createApiKey,
);

router.get("/:businessId/api-keys", requireRole("owner", "admin"), listApiKeys);

router.delete(
  "/:businessId/api-keys/:id",
  requireRole("owner", "admin"),
  revokeApiKey,
);

export default router;
