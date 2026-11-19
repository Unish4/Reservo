import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED = [
  "NODE_ENV", "PORT", "LOG_LEVEL",
  "MONGODB_URI",
  "JWT_ACCESS_TTL", "JWT_REFRESH_TTL",
  "REDIS_URL",
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[identity] missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

function loadKey(envName, fileName) {
  if (process.env[envName]) return process.env[envName];
  const p = path.resolve(__dirname, "../../keys", fileName);
  if (!fs.existsSync(p)) {
    console.error(`❌ [identity] no key: set ${envName} or place ${fileName} in keys/`);
    process.exit(1);
  }
  return fs.readFileSync(p, "utf8");
}

const JWT_PRIVATE_KEY = loadKey("JWT_PRIVATE_KEY", "jwt-private.pem");
const JWT_PUBLIC_KEY = loadKey("JWT_PUBLIC_KEY", "jwt-public.pem");

export const ENV = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL,   // "15m"
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL, // "7d"
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
});