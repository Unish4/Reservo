import { redis } from "../config/redis.js";
import { ENV } from "../config/env.js";

function ttlSeconds(jwtTtl) {
  const match = /^(\d+)([smhd])$/.exec(jwtTtl);
  if (!match) throw new Error(`Unparseable TTL: ${jwtTtl}`);
  const n = Number(match[1]);
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  return n * mult;
}

const sessionKey = (jti) => `refresh:${jti}`;
const userSetKey = (userId) => `user-refresh:${userId}`;

export async function createSession({ jti, userId, businessId = null }) {
  const ttl = ttlSeconds(ENV.JWT_REFRESH_TTL);
  const value = JSON.stringify({
    userId: String(userId),
    businessId,
    createdAt: Date.now(),
  });

  await redis
    .multi()
    .set(sessionKey(jti), value, "EX", ttl)
    .sadd(userSetKey(userId), jti)
    .expire(userSetKey(userId), ttl)
    .exec();
}

export async function getSession(jti) {
  const raw = await redis.get(sessionKey(jti));
  return raw ? JSON.parse(raw) : null;
}

export async function revokeSession(jti, userId) {
  await redis.multi().del(sessionKey(jti)).srem(userSetKey(userId), jti).exec();
}

export async function revokeAllForUser(userId) {
  const jtis = await redis.smembers(userSetKey(userId));
  if (jtis.length === 0) return 0;

  const keys = jtis.map(sessionKey);

  await redis
    .multi()
    .del(...keys)
    .del(userSetKey(userId))
    .exec();

  return jtis.length;
}
