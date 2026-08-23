const path = require("node:path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");
const { getAppOwnedPhotoUrls } = require("../utils/profilePhotos");

function hasModernAppPhoto(user) {
  return getAppOwnedPhotoUrls(user).some((value) => {
    const pathname = new URL(value, "https://tripmatch.invalid").pathname;
    return /^\/api\/file\/[a-f\d]{24}$/i.test(pathname);
  });
}

async function run() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    throw new Error("Database or JWT configuration is missing");
  }

  await mongoose.connect(process.env.DATABASE_URL);
  try {
    const googleUsers = await User.find({ authProvider: "google" }).select(
      "name photo photoURL photos",
    );
    const candidates = googleUsers.filter(hasModernAppPhoto);

    if (candidates.length !== 1) {
      console.log("Authenticated identity diagnostic", {
        safeCandidateCount: candidates.length,
        result: "A unique affected candidate could not be selected safely",
      });
      return;
    }

    const candidate = candidates[0];
    const token = jwt.sign(
      { userId: String(candidate._id) },
      process.env.JWT_SECRET,
      { expiresIn: "2m" },
    );
    const response = await fetch(
      `http://127.0.0.1:${process.env.PORT || 5000}/api/auth/me`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await response.json();
    const data = body?.data || {};

    console.log("Authenticated identity diagnostic (safe fields only)", {
      status: response.status,
      authenticated: body?.authenticated ?? null,
      displayName: typeof data.name === "string" ? data.name : null,
      registrationComplete:
        body?.registrationComplete ?? data.registrationComplete ?? null,
      registrationInProgress:
        body?.registrationInProgress ?? data.registrationInProgress ?? null,
      nextRegistrationStep:
        body?.nextRegistrationStep ?? data.nextRegistrationStep ?? null,
      appOwnedPhotoPresent: getAppOwnedPhotoUrls(data).length > 0,
    });
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
