import dotenv from "dotenv";
dotenv.config();

const REQUIRED = [
  "NODE_ENV",
  "PORT",
  "LOG_LEVEL",
  "JWT_ACCESS_SECRET",
  "JWT_ACCESS_TTL",
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[identity] missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL,

  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
};
