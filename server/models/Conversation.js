const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

const clearedForSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clearedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      unique: true,
      index: true,
    },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: (participants) =>
          Array.isArray(participants) &&
          participants.length === 2 &&
          String(participants[0]) !== String(participants[1]),
        message: "A conversation must contain exactly two distinct participants",
      },
      required: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    clearedFor: {
      type: [clearedForSchema],
      default: [],
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
