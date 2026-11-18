import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { register, login } from "../controllers/authController.js";

const router = Router();

router.post(
  "/register",
  validate({
    email: { type: "string", required: true, email: true },
    password: { type: "string", required: true, min: 8 },
    name: { type: "string", required: true, max: 120 },
  }),
  register,
);

router.post(
  "/login",
  validate({
    email: { type: "string", required: true, email: true },
    password: { type: "string", required: true },
  }),
  login,
);

export default router;
