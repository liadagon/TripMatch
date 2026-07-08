const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    photo: {
      type: String,
      default: "",
    },
    photoURL: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
    },
    location: {
      type: String,
    },
    interests: {
      type: [String],
      default: [],
    },
    preferredDestinations: {
      type: [String],
      default: [],
    },
    travelStyle: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
