import { Resource } from "../models/Resource.js";
import { generateSlots } from "../services/slotService.js";
import { AppError } from "../utils/AppError.js";

export async function getSlots(req, res, next) {
  try {
    const { resourceId } = req.params;
    const { date } = req.query;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
      throw new AppError(
        "date query param required in YYYY-MM-DD format",
        400,
        "INVALID_DATE",
      );
    }

    const resource = await Resource.findOne({
      _id: resourceId,
      businessId: req.businessId,
      active: true,
    }).lean();
    if (!resource)
      throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");

    const slots = await generateSlots(resourceId, date, req.businessId);
    res.json({
      resourceId,
      date,
      slots,
      count: slots.length,
    });
  } catch (err) {
    next(err);
  }
}
