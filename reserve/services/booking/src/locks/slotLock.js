
import { redis } from "../config/redis.js";
import { ENV } from "../config/env.js";

function lockKey({ businessId, resourceId, date, startTime }) {
  return `hold:${businessId}:${resourceId}:${date}:${startTime}`;
}

export async function acquireLock(
  { businessId, resourceId, date, startTime },
  holderToken,
) {
  const key = lockKey({ businessId, resourceId, date, startTime });

  const result = await redis.set(
    key,
    holderToken,
    "PX",
    ENV.HOLD_TTL_MS,
    "NX",
  );

  if (result === "OK") {
    return { acquired: true, holdKey: key };
  }

  return { acquired: false, holdKey: key };
}

const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

export async function releaseLock(
  { businessId, resourceId, date, startTime },
  holderToken,
) {
  const key = lockKey({ businessId, resourceId, date, startTime });
  const result = await redis.eval(RELEASE_SCRIPT, 1, key, holderToken);

  return result === 1;
}

export async function isLocked({
  businessId,
  resourceId,
  date,
  startTime,
}) {
  const key = lockKey({ businessId, resourceId, date, startTime });
  const exists = await redis.exists(key);

  return exists === 1;
}
