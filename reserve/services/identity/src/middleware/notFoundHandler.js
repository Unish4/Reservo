import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      `Route ${req.method} ${req.originalUrl} not found`,
      404,
      "ROUTE NOT FOUND",
    ),
  );
}
