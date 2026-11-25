import mongoose from "mongoose";

// One row per (event, channel). This collection IS the idempotency ledger:
// RabbitMQ guarantees at-least-once delivery, so the same booking event can
// arrive twice (redelivery after a crash, broker failover, a publisher retry).
// The unique index on dedupeKey is what stops a customer getting two emails.
const sentNotificationSchema = new mongoose.Schema(
  {
    // e.g. "booking.confirmed:<bookingId>:email"
    // WHY derived from business identity and not from a message id: a booking
    // is confirmed at most once and cancelled at most once, so this key stays
    // correct even if the publisher re-publishes with a fresh message id.
    dedupeKey: { type: String, required: true, unique: true },

    type: {
      type: String,
      enum: ["booking.confirmed", "booking.cancelled"],
      required: true,
    },
    channel: { type: String, enum: ["email"], required: true, default: "email" },

    bookingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    recipient: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true },

    // pending = claimed, send in progress | sent = done | failed = last attempt errored
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      required: true,
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    providerMessageId: { type: String, default: null },
    error: { type: String, default: null },
    sentAt: { type: Date, default: null },
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

export const SentNotification = mongoose.model(
  "SentNotification",
  sentNotificationSchema,
);
