import { v4 as uuidv4 } from "uuid";
import logger from "../config/logger.js";

// Copied from identity, with pino argument order fixed (object first, then msg).
export function requestContext(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.length > 0 ? incoming : uuidv4();

  const log = logger.child({ requestId });

  req.id = requestId;
  req.log = log;

  res.setHeader("X-Request-ID", requestId);

  const startTime = Date.now();
  log.info({ method: req.method, path: req.originalUrl }, "request.received");

  const originalEnd = res.end;
  res.end = function patchedEnd(...args) {
    const durationMs = Date.now() - startTime;

    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    log[level](
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      },
      "request.completed",
    );

    return originalEnd.apply(res, args);
  };

  next();
}
