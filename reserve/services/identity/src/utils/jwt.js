import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { ENV } from "../config/env.js";

const ISSUER = "reserve.identity";
const AUDIENCE = "reserve.api";

export function signAccessToken({ userId, businessId = null, role = null }) {
  return jwt.sign(
    {
      sub: String(userId),
      typ: "access",
      ...(businessId ? { businessId: String(businessId), role } : {}),
    },
    ENV.JWT_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: ENV.JWT_ACCESS_TTL, issuer: ISSUER, audience: AUDIENCE }
  );
}

export function signRefreshToken({ userId, jti }) {
  return jwt.sign(
    { sub: String(userId), typ: "refresh", jti },
    ENV.JWT_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: ENV.JWT_REFRESH_TTL, issuer: ISSUER, audience: AUDIENCE }
  );
}

export function verifyToken(token, expectedType) {
  const payload = jwt.verify(token, ENV.JWT_PUBLIC_KEY, {
    algorithms: ["RS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (expectedType && payload.typ !== expectedType) {
    throw new jwt.JsonWebTokenError(`Expected ${expectedType} token`);
  }
  return payload;
}

export function newJti() {
  return crypto.randomBytes(32).toString("hex");
}