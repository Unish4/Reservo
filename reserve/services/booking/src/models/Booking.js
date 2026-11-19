import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      required: true,
      default: "confirmed",
      index: true,
    },
    seatNumber: { type: Number, required: true, default: 0 },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, maxlength: 200, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_d, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

bookingSchema.index(
  { resourceId: 1, date: 1, startTime: 1, seatNumber: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } },
);

bookingSchema.index({ businessId: 1, date: 1, startTime: 1, status: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
