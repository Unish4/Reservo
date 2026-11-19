import mongoose from "mongoose";

const holdSchema = new mongoose.Schema(
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

    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
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

    expiresAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "converted", "released", "expired"],
      required: true,
      default: "active",
      index: true,
    },
    holderToken: { type: String, required: true, select: false },
    convertedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
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

holdSchema.index({
  businessId: 1,
  resourceId: 1,
  date: 1,
  startTime: 1,
  status: 1,
});

holdSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Hold = mongoose.model("Hold", holdSchema);
