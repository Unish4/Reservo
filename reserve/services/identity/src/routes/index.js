import { Router } from "express";
import authRoutes from "./authRoutes.js";
import businessRoutes from "./businessRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/businesses", businessRoutes);

export default router;
