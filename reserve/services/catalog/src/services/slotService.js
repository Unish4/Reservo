import { AvailabilityRule } from "../models/AvailabilityRule.js";
import { Blackout } from "../models/Blackout.js";

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function isBefore(a, b) {
  return a < b;
}

export async function generateSlots(resourceId, date, businessId) {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();

  const rule = await AvailabilityRule.findOne({
    businessId,
    resourceId,
    dayOfWeek,
  }).lean();

  if (!rule) return [];

  const blackouts = await Blackout.find({
    businessId,
    date,
    $or: [{ resourceId: null }, { resourceId }],
  }).lean();

  if (blackouts.length > 0) return [];

  const slots = [];
  let cursor = rule.openTime;
  const step = rule.slotMinutes + rule.bufferMinutes;

  while (true) {
    const end = addMinutes(cursor, rule.slotMinutes);

    if (end > rule.closeTime) break;
    if (!isBefore(cursor, rule.closeTime)) break;

    slots.push({
      startTime: cursor,
      endTime: end,
    });

    cursor = addMinutes(cursor, step);
  }

  return slots;
}
