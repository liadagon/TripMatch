const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    users: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: (users) => users.length === 2,
        message: "A match must contain exactly two users",
      },
      required: true,
    },
    pairKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);
