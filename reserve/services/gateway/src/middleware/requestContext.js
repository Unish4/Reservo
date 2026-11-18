import { v4 as uuidv4 } from "uuid";
import logger from "../config/logger.js";

export function requestContext(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.length > 0 ? incoming : uuidv4();

  const log = logger.child({ requestId });

  req.id = requestId;
  req.log = log;

  res.setHeader("X-Request-ID", requestId);

  const startTime = Date.now();
  log.info("request.received", { method: req.method, path: req.originalUrl });

  const originalEnd = res.end;
  res.end = function patchedEnd(...args) {
    const durationMs = Date.now() - startTime;

    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    log[level]("request.completed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });

    return originalEnd.apply(res, args);
  };

  next();
}
