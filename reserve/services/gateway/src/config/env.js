// src/config/env.js
import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config();

const REQUIRED = [
  "NODE_ENV",
  "PORT",
  "LOG_LEVEL",
  "JWT_PUBLIC_KEY_PATH",
  "IDENTITY_SERVICE_URL",
  "REDIS_URL",
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    `[gateway] missing required env vars: ${missing.join(", ")}`,
  );
  process.exit(1);
}

if (!fs.existsSync(process.env.JWT_PUBLIC_KEY_PATH)) {
  console.error(
    `[gateway] public key not found at ${process.env.JWT_PUBLIC_KEY_PATH}`,
  );
  process.exit(1);
}

export const ENV = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_PUBLIC_KEY: fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, "utf8"),
  IDENTITY_SERVICE_URL: process.env.IDENTITY_SERVICE_URL,
  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
});
