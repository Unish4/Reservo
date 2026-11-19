import mongoose from "mongoose";

const blackoutSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      default: null,
      index: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    reason: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { timestamps: true },
);

blackoutSchema.index(
  { businessId: 1, date: 1, resourceId: 1 },
  { unique: true },
);

export const Blackout = mongoose.model("Blackout", blackoutSchema);
