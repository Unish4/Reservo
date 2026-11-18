import express from "express";
import { ENV } from "./config/env.js";
import logger from "./config/logger.js";
import { AppError } from "./utils/AppError.js";
import { requestContext } from "./middleware/requestContext.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { buildRoutes } from "./routes.js";
import { SERVICES } from "./config/services.js";


const app = express();

app.use(requestContext);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "gateway",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/test-error", (_req, _res, next) => {
  next(new AppError("Gateway test error", 400, "TEST_ERROR"));
});

buildRoutes(app);

app.use(notFoundHandler);
app.use(errorMiddleware);

app.listen(ENV.PORT, () => {
  logger.info("gateway service listening", {
    port: ENV.PORT,
    env: ENV.NODE_ENV,
    upstreams: Object.keys(SERVICES),
  });
});