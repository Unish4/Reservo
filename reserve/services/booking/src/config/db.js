import mongoose from "mongoose";
import { ENV } from "./env.js";
import logger from "./logger.js";

export async function connectDB() {
  mongoose.connection.on("connected", () => {
    logger.info("mongo.connected", {
      db: mongoose.connection.name,
      host: mongoose.connection.host,
    });
  });

  mongoose.connection.on("error", (err) => {
    logger.error("mongo.error", { message: err.message });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("mongo.disconnected");
  });

  try {
    await mongoose.connect(ENV.MONGODB_URI);
  } catch (error) {
    logger.error("mongo.connect.failed", { message: error.message });
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.connection.close();
  logger.info("mongo.disconnected.by.shutdown");
}
