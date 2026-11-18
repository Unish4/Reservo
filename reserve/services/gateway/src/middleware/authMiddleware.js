import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function authMiddleware(req, _res, next) {
  const header = req.headers.authorization;
  req.user = null;

  if (!header) {
    return next();
  }

  if (!header.startsWith("Bearer ")) {
    return next(
      new AppError(
        "Invalid Authorization header format",
        401,
        "BAD_AUTH_HEADER",
      ),
    );
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    const code =
      err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    next(new AppError("Invalid or expired token", 401, code));
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }
  next();
}
