import { Router } from "express";
import holdRoutes from "./holdRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
const router = Router();
router.use("/holds", holdRoutes);
router.use("/bookings", bookingRoutes);
export default router;
