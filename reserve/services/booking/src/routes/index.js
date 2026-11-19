import { Router } from "express";
import holdRoutes from "./holdRoutes.js";
const router = Router();
router.use("/holds", holdRoutes);
export default router;
