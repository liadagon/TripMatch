const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;
const DOMAIN_BASE = process.env.DOMAIN_BASE || "127.0.0.1";

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.info(`Server running at http://${DOMAIN_BASE}:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed", {
    code: error.code,
    message: error.message,
  });
  process.exitCode = 1;
});
