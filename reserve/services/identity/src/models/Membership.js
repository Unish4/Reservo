import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "staff"],
      required: true,
      default: "staff",
    },
  },
  {
    timestamps: true,
  },
);

memberSchema.index({ userId: 1, businessId: 1 }, { unique: true });

export const Membership = mongoose.model("MemberShip", memberSchema);
