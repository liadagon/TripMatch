const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
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
      maxlength: 128,
      select: false,
    },
    photo: {
      type: String,
      trim: true,
      default: "",
    },
    photoURL: {
      type: String,
      trim: true,
      default: "",
    },
    photos: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: (photos) => photos.length <= 6,
        message: "A profile can contain at most 6 photos",
      },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    age: {
      type: Number,
      min: 18,
      max: 120,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    interests: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
    },
    preferredDestinations: {
      type: [{ type: String, trim: true, maxlength: 100 }],
      default: [],
    },
    travelStyle: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    budget: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    tripDates: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    tripDuration: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    questionnaire: {
      planningStyle: { type: String, default: "" },
      accommodationPreference: { type: String, default: "" },
      companionScope: { type: String, default: "" },
      companionPriority: { type: String, default: "" },
      dealBreaker: { type: String, default: "" },
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

userSchema.index(
  {
    name: "text",
    location: "text",
    bio: "text",
    preferredDestinations: "text",
    interests: "text",
  },
  { name: "user_travel_partner_text" }
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
