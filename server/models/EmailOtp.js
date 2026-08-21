const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    requestId: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    attemptCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EmailOtp", emailOtpSchema);
