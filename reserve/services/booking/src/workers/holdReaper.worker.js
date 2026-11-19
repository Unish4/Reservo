import { Hold } from "../models/Hold.js";
import { HoldEvent } from "../models/HoldEvent.js";
import logger from "../config/logger.js";
import { ENV } from "../config/env.js";

let timer = null;

async function reap() {
  const now = new Date();

  try {
    const expired = await Hold.find({
      status: "active",
      expiresAt: { $lte: now },
    })
      .select("_id businessId")
      .limit(500)
      .lean();

    if (expired.length === 0) return;

    await Hold.updateMany(
      {
        _id: { $in: expired.map((h) => h._id) },
        status: "active",
        expiresAt: { $lte: now },
      },
      { $set: { status: "expired" } },
    );

    await HoldEvent.insertMany(
      expired.map((h) => ({
        holdId: h._id,
        businessId: h.businessId,
        type: "expired",
      })),
      { ordered: false },
    ).catch(() => {});

    logger.info({ count: expired.length }, "reaper.expired");
  } catch (err) {
    logger.error({ message: err.message }, "reaper.error");
  }
}

export function startHoldReaper() {
  if (timer) return;

  reap();
  timer = setInterval(reap, ENV.REAPER_INTERVAL_MS);
  timer.unref?.();

  logger.info({ intervalMs: ENV.REAPER_INTERVAL_MS }, "reaper.started");
}

export function stopHoldReaper() {
  if (timer) clearInterval(timer);
  timer = null;
}
