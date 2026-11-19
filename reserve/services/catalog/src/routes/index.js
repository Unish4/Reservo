import { Router } from "express";
import resourceRoutes from "./resourceRoutes.js";
import availabilityRoutes from "./availabilityRoutes.js";
import slotRoutes from "./slotRoutes.js";

const router = Router();
router.use("/resources", resourceRoutes);
router.use("/availability", availabilityRoutes);
router.use("/slots", slotRoutes);
export default router;
