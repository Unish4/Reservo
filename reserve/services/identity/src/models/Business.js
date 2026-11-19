import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC",
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

export const Business = mongoose.model("Business", businessSchema);
