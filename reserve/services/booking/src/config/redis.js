import Redis from "ioredis";
import logger from "./logger.js";
import { ENV } from "./env.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on("connect", () => logger.info("redis.connected"));
redis.on("ready", () => logger.info("redis.ready"));
redis.on("error", (err) =>
  logger.error("redis.error", { message: err.message }),
);
redis.on("close", () => logger.warn("redis.closed"));

export async function disconnectRedis() {
  await redis.quit();
  logger.info("redis.disconnected.by.shutdown");
}
