import mongoose from "mongoose";

const holdEventSchema = new mongoose.Schema(
  {
    holdId: {
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
      enum: ["acquired", "released", "expired", "converted"],
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

export const HoldEvent = mongoose.model("HoldEvent", holdEventSchema);
