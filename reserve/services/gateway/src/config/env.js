// src/config/env.js
import dotenv from "dotenv";

dotenv.config();

const REQUIRED = [
  "NODE_ENV",
  "PORT",
  "LOG_LEVEL",
  "JWT_ACCESS_SECRET",
  "IDENTITY_SERVICE_URL",
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[gateway] missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

export const ENV = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  IDENTITY_SERVICE_URL: process.env.IDENTITY_SERVICE_URL,

  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
});
