const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const hideNonDefaultUserVirtuals = (_doc, ret) => {
  delete ret.password;
  delete ret.matches;
  return ret;
};

const tripLocationSchema = new mongoose.Schema(
  {
    placeId: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 300,
      match: /^[0-9a-f]+$/i,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    formattedAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    city: { type: String, trim: true, maxlength: 200 },
    state: { type: String, trim: true, maxlength: 200 },
    country: { type: String, required: true, trim: true, maxlength: 200 },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 2,
      validate: {
        validator: (countryCode) => countryCode !== "il",
        message: "Trip destination must be outside Israel",
      },
    },
  },
  { _id: false }
);

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
      enum: ["local", "google", "email"],
      default: "local",
    },
    emailVerified: {
      type: Boolean,
      default: false,
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
    tripLocation: { type: tripLocationSchema },
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
    subscriptionPlan: {
      type: String,
      enum: ["free", "boost"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: [
        "none",
        "approval_pending",
        "approved",
        "active",
        "suspended",
        "cancelled",
        "expired",
        "payment_failed",
      ],
      default: "none",
    },
    paypalSubscriptionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    paypalPlanId: {
      type: String,
      trim: true,
    },
    subscriptionCurrentPeriodEnd: {
      type: Date,
    },
  },
  {
    timestamps: true,
    id: false,
    toJSON: {
      virtuals: true,
      transform: hideNonDefaultUserVirtuals,
    },
    toObject: { virtuals: true },
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

userSchema.virtual("matches", {
  ref: "Match",
  localField: "_id",
  foreignField: "users",
});

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
