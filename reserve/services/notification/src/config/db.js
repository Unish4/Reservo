import mongoose from "mongoose";
import { ENV } from "./env.js";
import logger from "./logger.js";

// NOTE: pino's signature is logger.level(mergingObject, message).
// The identity copy of this file passes (message, object), which makes pino
// silently drop the object. Argument order is fixed here.
export async function connectDB() {
  mongoose.connection.on("connected", () => {
    logger.info(
      { db: mongoose.connection.name, host: mongoose.connection.host },
      "mongo.connected",
    );
  });

  mongoose.connection.on("error", (err) => {
    logger.error({ message: err.message }, "mongo.error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("mongo.disconnected");
  });

  try {
    await mongoose.connect(ENV.MONGODB_URI);
  } catch (error) {
    logger.error({ message: error.message }, "mongo.connect.failed");
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.connection.close();
  logger.info("mongo.disconnected.by.shutdown");
}
