const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const fileRoutes = require("./routes/fileRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static("public"));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TripMatch API is running",
  });
});

app.use("/api/users", userRoutes);
app.use("/api/file", fileRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
