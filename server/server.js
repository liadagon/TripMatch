const app = require("./app");
const connectDB = require("./config/db");
const validateEnvironment = require("./config/env");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;
const DOMAIN_BASE = process.env.DOMAIN_BASE || "127.0.0.1";

const startServer = async () => {
  validateEnvironment();
  await connectDB();

  app.listen(PORT, () => {
    logger.info("Server started", {
      host: DOMAIN_BASE,
      port: Number(PORT),
      environment: process.env.NODE_ENV || "development",
    });
  });
};

startServer().catch((error) => {
  logger.error("Server startup failed", { error });
  process.exitCode = 1;
});
