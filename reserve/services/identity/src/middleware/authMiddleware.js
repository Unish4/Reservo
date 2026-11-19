import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { Membership } from "../models/Membership.js";

export function authMiddleware(req, _res, next) {
  const header = req.headers.authorization;
  req.user = null;
  if (!header) return next();
  if (!header.startsWith("Bearer "))
    return next(
      new AppError(
        "Invalid Authorization header format",
        401,
        "BAD_AUTH_HEADER",
      ),
    );

  try {
    const payload = jwt.verify(header.slice(7).trim(), ENV.JWT_PUBLIC_KEY, {
      algorithms: ["RS256"],
      issuer: "reserve.identity",
      audience: "reserve.api",
    });
    if (payload.typ !== "access")
      return next(new AppError("Wrong token type", 401, "TOKEN_WRONG_TYPE"));
    req.user = payload;
    next();
  } catch (err) {
    const code =
      err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    next(new AppError("Invalid or expired token", 401, code));
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user)
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  next();
}

export function requireRole(...allowedRoles) {
  return async (req, _res, next) => {
    try {
      const businessId = req.user?.businessId ?? req.headers["x-business-id"];
      if (!businessId) {
        throw new AppError(
          "No active business context",
          400,
          "NO_BUSINESS_CONTEXT",
        );
      }

      const membership = await Membership.findOne({
        userId: req.user.sub,
        businessId,
      });
      if (!membership) {
        throw new AppError(
          "Not a member of this business",
          403,
          "NOT_A_MEMBER",
        );
      }
      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        throw new AppError(
          `Requires role: ${allowedRoles.join(" or ")}`,
          403,
          "FORBIDDEN_ROLE",
        );
      }

      req.membership = membership;
      req.businessId = businessId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
