import express from "express";
import { ENV } from "./config/env.js";
import logger from "./config/logger.js";
import { AppError } from "./utils/AppError.js";
import { requestContext } from "./middleware/requestContext.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";

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

app.use(notFoundHandler);
app.use(errorMiddleware);

app.listen(ENV.PORT, () => {
  logger.info(
    {
      port: ENV.PORT,
      env: ENV.NODE_ENV,
    },
    "identity service listening",
  );
});
