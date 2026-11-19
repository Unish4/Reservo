import { AvailabilityRule } from "../models/AvailabilityRule.js";
import { Blackout } from "../models/Blackout.js";
import { Resource } from "../models/Resource.js";
import { AppError } from "../utils/AppError.js";

export async function setAvailability(req, res, next) {
  try {
    const { resourceId } = req.params;
    const { rules } = req.body;

    const resource = await Resource.findOne({
      _id: resourceId, businessId: req.businessId,
    }).lean();
    if (!resource) throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");

    for (const r of rules) {
      if (r.closeTime <= r.openTime) {
        throw new AppError(
          `Rule for day ${r.dayOfWeek}: closeTime must be after openTime`,
          400, "INVALID_RULE"
        );
      }
    }

    await AvailabilityRule.deleteMany({ businessId: req.businessId, resourceId });
    const created = await AvailabilityRule.insertMany(
      rules.map((r) => ({ ...r, businessId: req.businessId, resourceId }))
    );

    res.json({ rules: created });
  } catch (err) {
    next(err);
  }
}

export async function getAvailability(req, res, next) {
  try {
    const { resourceId } = req.params;
    const rules = await AvailabilityRule.find({
      businessId: req.businessId, resourceId,
    }).sort({ dayOfWeek: 1 }).lean();
    res.json({ rules });
  } catch (err) {
    next(err);
  }
}

export async function createBlackout(req, res, next) {
  try {
    const { resourceId, date, reason } = req.body;
    if (resourceId) {
      const resource = await Resource.findOne({ _id: resourceId, businessId: req.businessId }).lean();
      if (!resource) throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");
    }
    const blackout = await Blackout.create({
      businessId: req.businessId, resourceId: resourceId ?? null, date, reason,
    });
    res.status(201).json({ blackout: blackout.toJSON() });
  } catch (err) {
    if (err?.code === 11000) {
      return next(new AppError("Blackout already exists for that date", 409, "BLACKOUT_EXISTS"));
    }
    next(err);
  }
}

export async function listBlackouts(req, res, next) {
  try {
    const query = { businessId: req.businessId };
    if (req.query.resourceId) query.resourceId = req.query.resourceId;
    if (req.query.from) query.date = { $gte: req.query.from };
    if (req.query.to) query.date = { ...query.date, $lte: req.query.to };
    const blackouts = await Blackout.find(query).sort({ date: 1 }).lean();
    res.json({ blackouts });
  } catch (err) {
    next(err);
  }
}