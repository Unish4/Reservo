import {
  acquireHold,
  releaseHold,
  getHold,
  slotIsLocked,
} from "../services/holdService.js";

export async function createHold(req, res, next) {
  try {
    const { resourceId, date, startTime, endTime } = req.body;
    const hold = await acquireHold({
      businessId: req.businessId,
      userId: req.user.sub,
      resourceId,
      date,
      startTime,
      endTime,
    });
    res.status(201).json({ hold });
  } catch (err) {
    next(err);
  }
}

export async function deleteHold(req, res, next) {
  try {
    const hold = await releaseHold({
      businessId: req.businessId,
      userId: req.user.sub,
      holdId: req.params.id,
    });
    res.json({ hold });
  } catch (err) {
    next(err);
  }
}

export async function readHold(req, res, next) {
  try {
    const hold = await getHold({
      businessId: req.businessId,
      holdId: req.params.id,
    });
    res.json({ hold });
  } catch (err) {
    next(err);
  }
}

export async function checkSlot(req, res, next) {
  try {
    const { resourceId, date, startTime } = req.query;
    const locked = await slotIsLocked({
      businessId: req.businessId,
      resourceId,
      date,
      startTime,
    });
    res.json({ locked });
  } catch (err) {
    next(err);
  }
}
