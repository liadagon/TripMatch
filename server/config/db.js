const mongoose = require("mongoose");

const db = mongoose.connection;

db.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

db.once("open", () => {
  console.info("MongoDB connected successfully");
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
  } catch (error) {
    console.error("MongoDB initial connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
