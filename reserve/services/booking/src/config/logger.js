import pino from "pino";
import { ENV } from "./env.js";

const SERVICE_NAME = "booking";

const logger = pino({
  level: ENV.LOG_LEVEL,
  base: { service: SERVICE_NAME },
  ...(ENV.IS_DEV && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname,service",
        messageFormat: "({service}): {msg}",
        singleLine: true,
      },
    },
  }),
});

export default logger;
