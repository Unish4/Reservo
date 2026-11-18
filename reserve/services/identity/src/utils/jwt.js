import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export function signAccessToken({ userId }) {
  return jwt.sign(
    {
      sub: String(userId),
      typ: "access",
    },
    ENV.JWT_ACCESS_SECRET,
    {
      expiresIn: ENV.JWT_ACCESS_TTL,
      issuer: "reserve.identity",
      audience: "reserve.api",
    },
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, ENV.JWT_ACCESS_SECRET, {
    issuer: "reserve.identity",
    audience: "reserve.api",
  });

  if (payload.typ !== "access") {
    throw new jwt.JsonWebTokenError("Wrong token type");
  }

  return payload;
}
