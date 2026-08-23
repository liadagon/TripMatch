const mongoose = require("mongoose");

const processedPayPalWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    paypalSubscriptionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["processing", "processed"],
      default: "processing",
      required: true,
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "ProcessedPayPalWebhookEvent",
  processedPayPalWebhookEventSchema,
);
