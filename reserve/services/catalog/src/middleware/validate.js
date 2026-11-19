import { AppError } from "../utils/AppError.js";

export function validate(schema) {
  return (req, _res, next) => {
    const body = req.body ?? {};
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = body[field];

      if (
        rule.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push({ field, message: "is required" });
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rule.type && typeof value !== rule.type) {
        errors.push({ field, message: `must be a ${rule.type}` });
        continue;
      }

      if (
        rule.min !== undefined &&
        typeof value === "string" &&
        value.length < rule.min
      ) {
        errors.push({
          field,
          message: `must be at least ${rule.min} characters`,
        });
      }
      if (
        rule.max !== undefined &&
        typeof value === "string" &&
        value.length > rule.max
      ) {
        errors.push({
          field,
          message: `must be at most ${rule.max} characters`,
        });
      }

      if (
        rule.email &&
        typeof value === "string" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        errors.push({ field, message: "must be a valid email" });
      }
    }

    if (errors.length > 0) {
      return next(
        new AppError("Validation failed", 400, "VALIDATION_ERROR", { errors }),
      );
    }
    next();
  };
}
