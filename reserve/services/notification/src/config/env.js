import dotenv from "dotenv";

dotenv.config();

const REQUIRED = [
  "NODE_ENV",
  "PORT",
  "LOG_LEVEL",
  "MONGODB_URI",
  "RABBITMQ_URL",
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    `[notification] missing required env vars: ${missing.join(", ")}`,
  );
  process.exit(1);
}

// WHY: fail at boot, not on the first email. A typo like "smpt" would otherwise
// silently pick the wrong branch and every message would fail at runtime.
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER;
if (!["console", "smtp"].includes(EMAIL_PROVIDER)) {
  console.error(
    `[notification] EMAIL_PROVIDER must be "console" or "smtp", got "${EMAIL_PROVIDER}"`,
  );
  process.exit(1);
}

if (EMAIL_PROVIDER === "smtp") {
  const smtpMissing = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].filter(
    (k) => !process.env[k],
  );
  if (smtpMissing.length > 0) {
    console.error(
      `[notification] EMAIL_PROVIDER=smtp but missing: ${smtpMissing.join(", ")}`,
    );
    process.exit(1);
  }
}

function positiveInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`[notification] ${name} must be a positive integer`);
    process.exit(1);
  }
  return n;
}

export const ENV = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
  MONGODB_URI: process.env.MONGODB_URI,

  RABBITMQ_URL: process.env.RABBITMQ_URL,
  RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE ?? "reserve.events",
  RABBITMQ_PREFETCH: positiveInt("RABBITMQ_PREFETCH", 10),

  EMAIL_PROVIDER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  PENDING_STALE_MS: positiveInt("PENDING_STALE_MS", 120_000),

  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
});
