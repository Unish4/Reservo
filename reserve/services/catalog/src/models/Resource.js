import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
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
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ["table", "room", "chair", "court"],
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 1,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    active: { type: Boolean, default: true },
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

resourceSchema.index({ businessId: 1, active: 1, createdAt: -1 });

export const Resource = mongoose.model("Resource", resourceSchema);
