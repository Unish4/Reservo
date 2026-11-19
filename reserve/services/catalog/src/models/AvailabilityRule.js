import mongoose from "mongoose";

const availabilityRuleSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Matches JS Date.getDay().
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },

    openTime: { type: String, required: true, match: TIME_RE },
    closeTime: { type: String, required: true, match: TIME_RE },

    slotMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 240,
      default: 30,
    },
    bufferMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 120,
      default: 0,
    },
  },
  { timestamps: true },
);

availabilityRuleSchema.index({ resourceId: 1, dayOfWeek: 1 }, { unique: true });

availabilityRuleSchema.pre("validate", function (next) {
  if (this.openTime && this.closeTime && this.closeTime <= this.openTime) {
    return next(new Error("closeTime must be after openTime"));
  }
  next();
});

export const AvailabilityRule = mongoose.model(
  "AvailabilityRule",
  availabilityRuleSchema,
);
