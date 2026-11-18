import express from "express";
import { ENV } from "./config/env.js";
import logger from "./config/logger.js";
import { AppError } from "./utils/AppError.js";
import { requestContext } from "./middleware/requestContext.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { disconnectRedis } from "./config/redis.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(requestContext);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "identity",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/test-error", (_req, _res, next) => {
  next(new AppError("This is a test error", 400, "TEST_ERROR"));
});

app.use("/api", apiRoutes); // /api/auth/register

app.use(notFoundHandler);
app.use(errorMiddleware);

async function start() {
  await connectDB();

  const server = app.listen(ENV.PORT, () => {
    logger.info("identity service listening", {
      port: ENV.PORT,
      env: ENV.NODE_ENV,
    });
  });

  const shutdown = async (signal) => {
    logger.warn("shutdown.start", { signal });
    server.close(async () => {
      try {
        await disconnectDB();
        await disconnectRedis();
        logger.info("shutdown.complete");
        process.exit(0);
      } catch (err) {
        logger.error("shutdown.error", { message: err.message });
        process.exit(1);
      }
    });
    setTimeout(() => {
      logger.error("shutdown.forced");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  logger.error("boot.failed", { message: err.message });
  process.exit(1);
});
