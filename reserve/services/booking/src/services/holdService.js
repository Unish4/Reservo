import crypto from "node:crypto";
import { Hold } from "../models/Hold.js";
import { HoldEvent } from "../models/HoldEvent.js";
import { AppError } from "../utils/AppError.js";
import { acquireLock, releaseLock, isLocked } from "../locks/slotLock.js";
import { ENV } from "../config/env.js";

export async function acquireHold({
  businessId,
  userId,
  resourceId,
  date,
  startTime,
  endTime,
}) {
  const holderToken = crypto.randomUUID();

  const { acquired } = await acquireLock(
    { businessId, resourceId, date, startTime },
    holderToken,
  );

  if (!acquired) {
    throw new AppError("Slot is currently held", 409, "SLOT_TAKEN");
  }

  try {
    const expiresAt = new Date(Date.now() + ENV.HOLD_TTL_MS);

    const hold = await Hold.create({
      businessId,
      userId,
      resourceId,
      date,
      startTime,
      endTime,
      expiresAt,
      status: "active",
      holderToken,
    });

    await HoldEvent.create({
      holdId: hold._id,
      businessId,
      type: "acquired",
      actor: userId,
      metadata: { resourceId, date, startTime, endTime, holderToken },
    }).catch(() => {});

    return hold.toObject();
  } catch (err) {
    await releaseLock(
      { businessId, resourceId, date, startTime },
      holderToken,
    ).catch(() => {});

    throw err;
  }
}

export async function releaseHold({ businessId, userId, holdId }) {
  const hold = await Hold.findOne({ _id: holdId, businessId, userId }).select(
    "+holderToken",
  );
  if (!hold) {
    throw new AppError("Hold not found", 404, "HOLD_NOT_FOUND");
  }

  if (hold.status !== "active") {
    throw new AppError(`Hold is ${hold.status}`, 409, "HOLD_NOT_ACTIVE");
  }

  hold.status = "released";
  await hold.save();

  await HoldEvent.create({
    holdId: hold._id,
    businessId,
    type: "released",
    actor: userId,
  }).catch(() => {});

  await releaseLock(
    {
      businessId,
      resourceId: hold.resourceId,
      date: hold.date,
      startTime: hold.startTime,
    },
    hold.holderToken,
  );

  return hold.toObject();
}

export async function getHold({ businessId, holdId }) {
  const hold = await Hold.findOne({ _id: holdId, businessId }).lean();

  if (!hold) {
    throw new AppError("Hold not found", 404, "HOLD_NOT_FOUND");
  }

  return hold;
}

export async function slotIsLocked({
  businessId,
  resourceId,
  date,
  startTime,
}) {
  return isLocked({ businessId, resourceId, date, startTime });
}

export async function markHoldConverted({ holdId, businessId, bookingId }) {
  const hold = await Hold.findOneAndUpdate(
    { _id: holdId, businessId, status: "active" },
    { $set: { status: "converted", convertedBookingId: bookingId } },
    { new: true },
  ).lean();
  return hold;
}
