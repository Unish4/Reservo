import { SentNotification } from "../models/SentNotification.js";
import { sendEmail } from "../providers/emailProvider.js";
import { ENV } from "../config/env.js";
import logger from "../config/logger.js";
import { AppError } from "../utils/AppError.js";

const OBJECT_ID = /^[a-f\d]{24}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Event contract (what booking must publish). Envelope:
//   { eventId?, type, occurredAt?, data: {
//       bookingId, businessId, userId, resourceId?, date, startTime, endTime,
//       recipient: { email, name? },
//       resourceName?, businessName?,     // optional, nicer emails
//       cancelReason?                     // booking.cancelled only
//   } }
// ---------------------------------------------------------------------------
function validate(envelope) {
  const d = envelope?.data;
  const problems = [];

  if (!d || typeof d !== "object") {
    throw new AppError("Event has no data object", 422, "BAD_EVENT");
  }
  for (const f of ["bookingId", "businessId", "userId"]) {
    if (typeof d[f] !== "string" || !OBJECT_ID.test(d[f])) problems.push(f);
  }
  if (typeof d.date !== "string" || !DATE.test(d.date)) problems.push("date");
  for (const f of ["startTime", "endTime"]) {
    if (typeof d[f] !== "string" || !TIME.test(d[f])) problems.push(f);
  }
  if (
    typeof d.recipient?.email !== "string" ||
    !EMAIL.test(d.recipient.email)
  ) {
    problems.push("recipient.email");
  }

  if (problems.length > 0) {
    // 422 => treated as permanent by the consumer: straight to DLQ, no retry.
    // Retrying a payload that is structurally wrong can never succeed.
    throw new AppError("Invalid event payload", 422, "BAD_EVENT", { problems });
  }
  return d;
}

// WHY escape: cancelReason is free text typed by an end user and ends up in an
// HTML email. Unescaped, it's an HTML-injection vector into someone's inbox.
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slotLine(d) {
  const what = d.resourceName ? `${d.resourceName}, ` : "";
  return `${what}${d.date}, ${d.startTime} - ${d.endTime}`;
}

const TEMPLATES = {
  confirmed(d) {
    const name = d.recipient.name ?? "there";
    const slot = slotLine(d);
    return {
      subject: `Booking confirmed: ${d.date} at ${d.startTime}`,
      text:
        `Hi ${name},\n\nYour booking is confirmed.\n\n` +
        `When: ${slot}\nBooking ID: ${d.bookingId}\n\n` +
        `Need to change plans? Please cancel so someone else can take the slot.`,
      html:
        `<p>Hi ${esc(name)},</p><p>Your booking is <strong>confirmed</strong>.</p>` +
        `<p><strong>When:</strong> ${esc(slot)}<br>` +
        `<strong>Booking ID:</strong> ${esc(d.bookingId)}</p>` +
        `<p>Need to change plans? Please cancel so someone else can take the slot.</p>`,
    };
  },

  cancelled(d) {
    const name = d.recipient.name ?? "there";
    const slot = slotLine(d);
    const reason = d.cancelReason ? `Reason: ${d.cancelReason}\n` : "";
    return {
      subject: `Booking cancelled: ${d.date} at ${d.startTime}`,
      text:
        `Hi ${name},\n\nYour booking has been cancelled.\n\n` +
        `Was: ${slot}\nBooking ID: ${d.bookingId}\n${reason}`,
      html:
        `<p>Hi ${esc(name)},</p><p>Your booking has been <strong>cancelled</strong>.</p>` +
        `<p><strong>Was:</strong> ${esc(slot)}<br>` +
        `<strong>Booking ID:</strong> ${esc(d.bookingId)}` +
        (d.cancelReason ? `<br><strong>Reason:</strong> ${esc(d.cancelReason)}` : "") +
        `</p>`,
    };
  },
};

// Atomically decide "is this send mine to perform?". Returns the ledger row if
// yes, or null if it's already sent / another worker is mid-send.
async function claim(base) {
  try {
    // First delivery: the insert itself is the lock. The unique index makes
    // concurrent inserts for the same dedupeKey fail with 11000 for all but one.
    return await SentNotification.create({
      ...base,
      status: "pending",
      attempts: 1,
    });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }

  // Row exists. Take it over ONLY if the previous attempt failed, or it's been
  // "pending" so long the worker must have crashed. One conditional update =
  // atomic, so two workers can't both win.
  const staleBefore = new Date(Date.now() - ENV.PENDING_STALE_MS);
  return SentNotification.findOneAndUpdate(
    {
      dedupeKey: base.dedupeKey,
      $or: [
        { status: "failed" },
        { status: "pending", updatedAt: { $lt: staleBefore } },
      ],
    },
    { $set: { status: "pending" }, $inc: { attempts: 1 } },
    { new: true },
  );
}

export async function sendBookingNotification(kind, envelope) {
  const d = validate(envelope);
  const content = TEMPLATES[kind](d);
  const type = `booking.${kind}`;
  const dedupeKey = `${type}:${d.bookingId}:email`;

  const record = await claim({
    dedupeKey,
    type,
    channel: "email",
    bookingId: d.bookingId,
    businessId: d.businessId,
    userId: d.userId,
    recipient: d.recipient.email,
    subject: content.subject,
  });

  if (!record) {
    logger.info({ dedupeKey }, "notification.skipped.duplicate");
    return { status: "skipped" };
  }

  try {
    const { messageId } = await sendEmail({
      to: d.recipient.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    await SentNotification.updateOne(
      { _id: record._id },
      {
        $set: {
          status: "sent",
          providerMessageId: messageId,
          sentAt: new Date(),
          error: null,
        },
      },
    );
    logger.info({ dedupeKey, attempts: record.attempts }, "notification.sent");
    return { status: "sent" };
  } catch (err) {
    // Record the failure, then rethrow so the consumer retries / dead-letters.
    // Swallowing here would ack the message and silently lose the email.
    await SentNotification.updateOne(
      { _id: record._id },
      { $set: { status: "failed", error: String(err.message).slice(0, 500) } },
    ).catch((e) =>
      logger.error({ message: e.message }, "notification.mark.failed.error"),
    );
    throw err;
  }
}
