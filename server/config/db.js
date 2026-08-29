const mongoose = require("mongoose");
const logger = require("../utils/logger");

const db = mongoose.connection;

db.on("error", (error) => {
  logger.error("MongoDB connection error", { error });
});

db.once("open", () => {
  logger.info("MongoDB connected successfully");
});

/** Connects Mongoose using the validated database URL or terminates startup. */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
  } catch (error) {
    logger.error("MongoDB initial connection failed", { error });
    process.exit(1);
  }
};

module.exports = connectDB;
