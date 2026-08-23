const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");
const protect = require("../middleware/auth");
const {
  CURRENT_REGISTRATION_FLOW_VERSION,
  getRegistrationState,
  markRegistrationCompleteIfEligible,
  normalizeAuthenticatedUser,
} = require("../utils/onboarding");
const {
  deleteProfileImage,
  storeProfileImage,
} = require("../services/profileImageStorage");

const questionnaire = {
  planningStyle: "planned",
  accommodationPreference: "hotel",
  companionScope: "whole-trip",
  companionPriority: "compatibility",
  dealBreaker: "boundaries",
};

async function restoreWithJwt(user) {
  const token = jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });
  const request = { headers: { authorization: `Bearer ${token}` } };
  let nextCalled = false;
  await protect(
    request,
    {
      status() { return this; },
      json() { throw new Error("JWT restoration unexpectedly failed"); },
    },
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
  return normalizeAuthenticatedUser(request.user);
}

async function run() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  assert(process.env.JWT_SECRET, "JWT_SECRET is not configured");
  await mongoose.connect(process.env.DATABASE_URL);
  const marker = `${Date.now()}-${crypto.randomUUID()}`;
  const userIds = [];
  let fileId;

  try {
    const currentUser = await User.create({
      name: "Registration Architecture Test",
      email: `registration-${marker}@example.com`,
      authProvider: "google",
      emailVerified: true,
      firebaseUid: `registration-${marker}`,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
      photoURL: "https://lh3.googleusercontent.com/provider-avatar",
    });
    userIds.push(currentUser._id);
    assert.equal(getRegistrationState(currentUser).nextRegistrationStep, "photos");

    const storedImage = await storeProfileImage({
      buffer: Buffer.from("registration-owned-profile-image"),
      contentType: "image/png",
      ownerId: currentUser._id,
    });
    fileId = storedImage.fileId;
    const appPhoto = `http://localhost:5000/api/file/${fileId}`;
    Object.assign(currentUser, {
      photoURL: appPhoto,
      photos: [appPhoto],
      preferredDestinations: ["Europe"],
      tripDates: "summer",
      budget: "medium",
      travelStyle: "cities",
      questionnaire,
      tripLocation: {
        placeId: "64b000000000000000000005",
        name: "Barcelona",
        formattedAddress: "Barcelona, Spain",
        latitude: 41.3874,
        longitude: 2.1686,
        city: "Barcelona",
        country: "Spain",
        countryCode: "es",
      },
    });
    assert.equal(markRegistrationCompleteIfEligible(currentUser), true);
    await currentUser.save();

    const restored = await restoreWithJwt(currentUser);
    assert.equal(restored.registrationComplete, true);
    assert.equal(restored.registrationInProgress, false);
    assert.equal(restored.nextRegistrationStep, null);
    assert.equal(restored.photoURL, appPhoto);

    const legacyUser = await User.create({
      name: "Historical Registration Test",
      email: `legacy-registration-${marker}@example.com`,
      authProvider: "google",
      emailVerified: true,
      firebaseUid: `legacy-registration-${marker}`,
      photoURL: "https://lh3.googleusercontent.com/historical-avatar",
      preferredDestinations: ["Europe"],
      tripDates: "summer",
      budget: "medium",
      travelStyle: "cities",
      questionnaire,
    });
    userIds.push(legacyUser._id);
    const legacyState = normalizeAuthenticatedUser(legacyUser);
    assert.equal(legacyState.registrationComplete, true);
    assert.equal(legacyState.nextRegistrationStep, null);

    console.log("Registration MongoDB verification passed", {
      durableMarkerPersisted: true,
      jwtRestorationRegistered: true,
      historicalAccountCompatible: true,
      appOwnedPhotoPreserved: true,
    });
  } finally {
    await User.deleteMany({ _id: { $in: userIds } });
    if (fileId) await deleteProfileImage(fileId).catch(() => {});
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
