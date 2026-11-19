import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config();

const REQUIRED = [
  "NODE_ENV",
  "PORT",
  "LOG_LEVEL",
  "MONGODB_URI",
  "REDIS_URL",
  "JWT_PUBLIC_KEY_PATH",
  "HOLD_TTL_MS",
  "REAPER_INTERVAL_MS",
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[booking] missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

if (!fs.existsSync(process.env.JWT_PUBLIC_KEY_PATH)) {
  console.error(
    `[booking] public key not found at ${process.env.JWT_PUBLIC_KEY_PATH}`,
  );
  process.exit(1);
}

const holdTtl = Number(process.env.HOLD_TTL_MS);
const reaperInterval = Number(process.env.REAPER_INTERVAL_MS);
if (!Number.isFinite(holdTtl) || holdTtl <= 0) {
  console.error("[booking] HOLD_TTL_MS must be a positive number");
  process.exit(1);
}
if (!Number.isFinite(reaperInterval) || reaperInterval <= 0) {
  console.error("booking] REAPER_INTERVAL_MS must be a positive number");
  process.exit(1);
}

export const ENV = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  JWT_PUBLIC_KEY: fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, "utf8"),
  HOLD_TTL_MS: holdTtl,
  REAPER_INTERVAL_MS: reaperInterval,
  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
});
