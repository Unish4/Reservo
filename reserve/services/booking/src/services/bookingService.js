import { Booking } from "../models/Booking.js";
import { BookingEvent } from "../models/BookingEvent.js";
import { Hold } from "../models/Hold.js";
import { AppError } from "../utils/AppError.js";
import { releaseLock } from "../locks/slotLock.js";
import { markHoldConverted } from "./holdService.js";

export async function confirmBooking({ businessId, userId, holdId }) {
  const hold = await Hold.findOne({ _id: holdId, businessId, userId })
    .select("+holderToken")
    .lean();

  if (!hold) throw new AppError("Hold not found", 404, "HOLD_NOT_FOUND");

  if (hold.status !== "active") {
    throw new AppError(`Hold is ${hold.status}`, 409, "HOLD_NOT_ACTIVE");
  }

  if (hold.expiresAt <= new Date()) {
    throw new AppError("Hold has expired", 410, "HOLD_EXPIRED");
  }

  let booking;

  try {
    booking = await Booking.create({
      businessId,
      userId,
      resourceId: hold.resourceId,
      holdId: hold._id,
      date: hold.date,
      startTime: hold.startTime,
      endTime: hold.endTime,
      status: "confirmed",
      seatNumber: 0,
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new AppError("Slot already booked", 409, "SLOT_TAKEN");
    }

    throw err;
  }

  await markHoldConverted({
    holdId: hold._id,
    businessId,
    bookingId: booking._id,
  }).catch(() => {});

  await releaseLock(
    {
      businessId,
      resourceId: hold.resourceId,
      date: hold.date,
      startTime: hold.startTime,
    },
    hold.holderToken,
  ).catch(() => {});

  await BookingEvent.create({
    bookingId: booking._id,
    businessId,
    type: "confirmed",
    actor: userId,
    metadata: {
      holdId: hold._id,
      resourceId: hold.resourceId,
      date: hold.date,
      startTime: hold.startTime,
    },
  }).catch(() => {});

  return booking.toObject();
}

export async function cancelBooking({ businessId, userId, bookingId, reason }) {
  const booking = await Booking.findOne({ _id: bookingId, businessId, userId });

  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }

  if (booking.status !== "confirmed") {
    throw new AppError(
      `Booking is ${booking.status}`,
      409,
      "BOOKING_NOT_ACTIVE",
    );
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.cancelReason = reason ?? null;

  await booking.save();

  await BookingEvent.create({
    bookingId: booking._id,
    businessId,
    type: "cancelled",
    actor: userId,
    metadata: { reason: reason ?? null },
  }).catch(() => {});

  return booking.toObject();
}

export async function listBookings({ businessId, date, resourceId, userId }) {
  const query = { businessId };

  if (date) query.date = date;
  if (resourceId) query.resourceId = resourceId;
  if (userId) query.userId = userId;

  return Booking.find(query).sort({ date: 1, startTime: 1 }).lean();
}

export async function getBooking({ businessId, bookingId }) {
  const booking = await Booking.findOne({ _id: bookingId, businessId }).lean();

  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }

  return booking;
}
