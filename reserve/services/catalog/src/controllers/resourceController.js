import { Resource } from "../models/Resource.js";
import { AppError } from "../utils/AppError.js";

export async function createResource(req, res, next) {
  try {
    const { name, type, capacity, description } = req.body;
    const resource = await Resource.create({
      businessId: req.businessId,
      name,
      type,
      capacity,
      description,
    });
    res.status(201).json({ resource: resource.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function listResources(req, res, next) {
  try {
    const resources = await Resource.find({
      businessId: req.businessId,
      active: true,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ resources });
  } catch (err) {
    next(err);
  }
}

export async function getResource(req, res, next) {
  try {
    const resource = await Resource.findOne({
      _id: req.params.id,
      businessId: req.businessId, 
    }).lean();
    if (!resource)
      throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");
    res.json({ resource });
  } catch (err) {
    next(err);
  }
}

export async function updateResource(req, res, next) {
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      {
        $set: pick(req.body, [
          "name",
          "type",
          "capacity",
          "description",
          "active",
        ]),
      },
      { new: true, runValidators: true },
    );
    if (!resource)
      throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");
    res.json({ resource: resource.toJSON() });
  } catch (err) {
    next(err);
  }
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}
