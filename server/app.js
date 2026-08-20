const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const fileRoutes = require("./routes/fileRoutes");
const swipeRoutes = require("./routes/swipeRoutes");
const matchRoutes = require("./routes/matchRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const blockRoutes = require("./routes/blockRoutes");
const protect = require("./middleware/auth");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/public",
  helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
  express.static("public")
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TripMatch API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/file", protect, fileRoutes);
app.use("/api/swipes", swipeRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/blocks", blockRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
