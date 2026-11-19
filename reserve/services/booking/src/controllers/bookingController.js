import {
  confirmBooking,
  cancelBooking,
  listBookings,
  getBooking,
} from "../services/bookingService.js";

export async function confirm(req, res, next) {
  try {
    const { holdId } = req.body;
    const booking = await confirmBooking({
      businessId: req.businessId,
      userId: req.user.sub,
      holdId,
    });
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const booking = await cancelBooking({
      businessId: req.businessId,
      userId: req.user.sub,
      bookingId: req.params.id,
      reason: req.body?.reason,
    });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const bookings = await listBookings({
      businessId: req.businessId,
      date: req.query.date,
      resourceId: req.query.resourceId,
      userId: req.query.mine === "true" ? req.user.sub : undefined,
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

export async function read(req, res, next) {
  try {
    const booking = await getBooking({
      businessId: req.businessId,
      bookingId: req.params.id,
    });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}
