import { ApiKey } from "../models/ApiKey.js";
import { AppError } from "../utils/AppError.js";

export async function createApiKey(req, res, next) {
  try {
    const { name } = req.body;
    const { raw, prefix, keyHash } = ApiKey.generate();
    const apiKey = await ApiKey.create({
      businessId: req.businessId,
      name,
      prefix,
      keyHash,
    });
    res.status(201).json({
      apiKey: { ...apiKey.toJSON(), keyHash: undefined },
      rawKey: raw,
    });
  } catch (error) {
    next(error);
  }
}

export async function listApiKeys(req, res, next) {
  try {
    const keys = await ApiKey.find({ businessId: req.businessId })
      .select("-keyHash")
      .lean();
    res.json({ apiKeys: keys });
  } catch (err) {
    next(err);
  }
}

export async function revokeApiKey(req, res, next) {
  try {
    const { id } = req.params;
    const result = await ApiKey.findOneAndUpdate(
      { _id: id, businessId: req.businessId },
      { revokedAt: new Date() },
      { new: true },
    );
    if (!result)
      throw new AppError("API key not found", 404, "API_KEY_NOT_FOUND");
    res.json({ apiKey: { ...result.toJSON(), keyHash: undefined } });
  } catch (err) {
    next(err);
  }
}
