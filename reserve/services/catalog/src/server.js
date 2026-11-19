import express from "express";
import { ENV } from "./config/env.js";
import logger from "./config/logger.js";
import { AppError } from "./utils/AppError.js";
import { requestContext } from "./middleware/requestContext.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { connectDb, disconnectDb } from "./config/db.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(requestContext);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "catalog",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/test-error", (_req, _res, next) => {
  next(new AppError("Catalog test error", 400, "TEST_ERROR"));
});

app.use("/", apiRoutes);

app.use(notFoundHandler);
app.use(errorMiddleware);

async function start() {
  await connectDb();

  const server = app.listen(ENV.PORT, () => {
    logger.info("catalog service listening", {
      port: ENV.PORT,
      env: ENV.NODE_ENV,
    });
  });


  const shutdown = async (signal) => {
    logger.warn("shutdown.start", { signal });
    server.close(async () => {
      try {
        await disconnectDb();
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