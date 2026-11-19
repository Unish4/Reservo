import mongoose from "mongoose";
import crypto from "node:crypto";

const apiKeySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    prefix: {
      type: String,
      required: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

apiKeySchema.statics.generate = function generate() {
  const raw = "reserve_" + crypto.randomBytes(32).toString("base64url");
  const prefix = raw.slice(0, 12);
  const keyHash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, keyHash };
};

apiKeySchema.statics.hash = function hash(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
};

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
