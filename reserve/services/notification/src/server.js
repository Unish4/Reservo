import express from "express";
import mongoose from "mongoose";
import { ENV } from "./config/env.js";
import logger from "./config/logger.js";
import { requestContext } from "./middleware/requestContext.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectMQ, closeMQ, isMQConnected } from "./config/mq.js";
import { verifyEmailProvider } from "./providers/emailProvider.js";
import { startBookingConfirmedConsumer } from "./consumers/bookingConfirmed.consumer.js";
import { startBookingCancelledConsumer } from "./consumers/bookingCancelled.consumer.js";

const app = express();

app.use(requestContext);

// The only HTTP surface. Domain work arrives via RabbitMQ, not HTTP, so this
// exists for orchestrators/load balancers to probe. It reports 503 when a
// dependency is down: a "healthy" service that can't consume is a lie.
app.get("/health", (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const mq = isMQConnected();
  res.status(mongo && mq ? 200 : 503).json({
    status: mongo && mq ? "ok" : "degraded",
    service: "notification",
    mongo,
    mq,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorMiddleware);

async function start() {
  await connectDB();
  await connectMQ();
  await verifyEmailProvider();

  // Consumers start before we listen so the service never reports "up"
  // while it isn't actually draining the queues.
  await startBookingConfirmedConsumer();
  await startBookingCancelledConsumer();

  const server = app.listen(ENV.PORT, () => {
    logger.info(
      { port: ENV.PORT, env: ENV.NODE_ENV },
      "notification service listening",
    );
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.warn({ signal }, "shutdown.start");

    setTimeout(() => {
      logger.error("shutdown.forced");
      process.exit(1);
    }, 10_000).unref();

    try {
      // Order matters: stop pulling messages and let in-flight sends finish
      // BEFORE closing Mongo, otherwise a handler's final DB write would hit
      // a closed connection and the email would be sent but not recorded.
      await closeMQ();
      await new Promise((resolve) => server.close(resolve));
      await disconnectDB();
      logger.info("shutdown.complete");
      process.exit(0);
    } catch (err) {
      logger.error({ message: err.message }, "shutdown.error");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ reason: String(reason) }, "unhandledRejection");
});

start().catch((err) => {
  logger.error({ message: err.message }, "boot.failed");
  process.exit(1);
});
