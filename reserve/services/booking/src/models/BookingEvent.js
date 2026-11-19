import mongoose from "mongoose";

const bookingEventSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["confirmed", "cancelled"],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const BookingEvent = mongoose.model("BookingEvent", bookingEventSchema);
