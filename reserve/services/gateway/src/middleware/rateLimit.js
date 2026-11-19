import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../config/redis.js";

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  statusCode: 429,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: "rl:gateway:",
  }),
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: "Too many requests, please slow down.",
        code: "RATE_LIMITED",
      },
    });
  },
});
