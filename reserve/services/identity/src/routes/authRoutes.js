import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { register, login, refresh, logout, logoutAll } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", validate({
  email: { type: "string", required: true, email: true },
  password: { type: "string", required: true, min: 8 },
  name: { type: "string", required: true, max: 120 },
}), register);

router.post("/login", validate({
  email: { type: "string", required: true, email: true },
  password: { type: "string", required: true },
}), login);

router.post("/refresh", validate({
  refreshToken: { type: "string", required: true },
}), refresh);

router.post("/logout", logout);            
router.post("/logout-all", requireAuth, logoutAll);

export default router;