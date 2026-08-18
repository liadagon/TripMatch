const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: function requirePasswordForLocalUser() {
        return this.authProvider === "local";
      },
      minlength: 8,
      select: false,
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
    budget: {
      type: String,
      default: "",
    },
    tripDates: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  try {
    this.password = await bcrypt.hash(this.password, 12);
    return next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
