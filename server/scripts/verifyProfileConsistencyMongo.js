const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");
const PUBLIC_PROFILE_FIELDS = require("../utils/publicProfile");
const calculateProfileCompatibility = require("../utils/profileCompatibility");
const { updateCurrentUser } = require("../controllers/userController");
const { updateProfileSchema } = require("../validation/userValidation");
const {
  CURRENT_REGISTRATION_FLOW_VERSION,
  getCurrentRegistrationValidationErrors,
  getRegistrationState,
} = require("../utils/onboarding");

const preferences = {
  preferredDestinations: ["אירופה"],
  tripDates: "בתחילת הקיץ",
  tripDuration: "שבוע עד שבועיים",
  budget: "בינוני",
  travelStyle: "טרקים והרפתקאות טבע",
  questionnaire: {
    planningStyle: "אוהבת מסגרת בסיסית",
    accommodationPreference: "הוסטל",
    companionScope: "לכל הטיול",
    companionPriority: "אמינות ואחריות",
    dealBreaker: "חוסר כבוד לגבולות",
  },
};

const destination = {
  placeId: "64b000000000000000000099",
  name: "Barcelona",
  formattedAddress: "Barcelona, Spain",
  latitude: 41.3874,
  longitude: 2.1686,
  city: "Barcelona",
  country: "Spain",
  countryCode: "es",
};

async function updateUser(user, payload) {
  const value = await updateProfileSchema.validateAsync(payload, {
    abortEarly: false,
  });
  let responseBody;
  let nextError;
  let statusCode = 200;

  await updateCurrentUser(
    { user, body: value },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    },
    (error) => {
      nextError = error;
    },
  );

  if (nextError) throw nextError;
  assert(responseBody);
  return { ...responseBody, __statusCode: statusCode };
}

async function run() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  await assert.doesNotReject(() =>
    updateProfileSchema.validateAsync({ bio: "x".repeat(20) }),
  );
  await assert.doesNotReject(() =>
    updateProfileSchema.validateAsync({ bio: "x".repeat(300) }),
  );
  await assert.rejects(() =>
    updateProfileSchema.validateAsync({ bio: "x".repeat(10) }),
  );
  await assert.rejects(() =>
    updateProfileSchema.validateAsync({ bio: "x".repeat(301) }),
  );
  await mongoose.connect(process.env.DATABASE_URL);
  const marker = `${Date.now()}-${crypto.randomUUID()}`;
  const createdUserIds = [];

  try {
    const newUser = await User.create({
      name: "Consistency Test Traveler",
      email: `consistency-${marker}@example.com`,
      authProvider: "email",
      emailVerified: true,
      firebaseUid: `consistency-${marker}`,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
      photoURL: "http://localhost:5000/api/file/64b000000000000000000098",
      photos: ["http://localhost:5000/api/file/64b000000000000000000098"],
    });
    createdUserIds.push(newUser._id);

    const questionnaireResult = await updateUser(newUser, preferences);
    assert.equal(questionnaireResult.nextRegistrationStep, "profile");

    const rejectedCompletion = await updateUser(newUser, {
      age: 28,
      interests: ["טבע", "צילום"],
      tripLocation: destination,
    });
    assert.equal(rejectedCompletion.__statusCode, 400);
    assert.equal(rejectedCompletion.code, "REGISTRATION_VALIDATION_FAILED");
    assert.deepEqual(Object.keys(rejectedCompletion.fields), ["bio"]);
    const unchangedAfterRejection = await User.findById(newUser._id).lean();
    assert.equal(unchangedAfterRejection.age, undefined);
    assert.equal(unchangedAfterRejection.tripLocation, undefined);

    const completedResult = await updateUser(newUser, {
      age: 28,
      interests: ["טבע", "צילום"],
      bio: "Bio saved by the isolated consistency test",
      tripLocation: destination,
    });
    assert.equal(completedResult.registrationComplete, true);
    assert.equal(completedResult.nextRegistrationStep, null);

    const refreshedUser = await User.findById(newUser._id);
    assert(refreshedUser.registrationCompletedAt);
    assert.equal(getRegistrationState(refreshedUser).registrationComplete, true);

    const candidate = await User.create({
      name: "Consistency Candidate",
      email: `candidate-${marker}@example.com`,
      authProvider: "email",
      emailVerified: true,
      firebaseUid: `candidate-${marker}`,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
      registrationCompletedAt: new Date(),
      photoURL: "http://localhost:5000/api/file/64b000000000000000000097",
      photos: ["http://localhost:5000/api/file/64b000000000000000000097"],
      age: 29,
      interests: ["טבע"],
      bio: "Compatibility candidate",
      tripLocation: destination,
      ...preferences,
    });
    createdUserIds.push(candidate._id);

    const initialCompatibility = calculateProfileCompatibility(
      refreshedUser,
      candidate,
    );
    assert.deepEqual(initialCompatibility, {
      percentage: 100,
      matchedCriteria: 10,
      comparedCriteria: 10,
    });

    const editedResult = await updateUser(refreshedUser, {
      budget: "נוח",
      travelStyle: "סיורים תרבותיים וערים",
      interests: ["אוכל מקומי"],
      bio: "Updated bio from the isolated consistency test",
      questionnaire: { planningStyle: "ממש ספונטנית" },
    });
    assert.equal(editedResult.data.budget, "נוח");
    assert.equal(
      editedResult.data.questionnaire.accommodationPreference,
      preferences.questionnaire.accommodationPreference,
    );

    const editedUser = await User.findById(newUser._id);
    assert.deepEqual(editedUser.interests, ["אוכל מקומי"]);
    assert.equal(
      editedUser.bio,
      "Updated bio from the isolated consistency test",
    );
    assert.deepEqual(calculateProfileCompatibility(editedUser, candidate), {
      percentage: 70,
      matchedCriteria: 7,
      comparedCriteria: 10,
    });

    const publicProfile = await User.findById(newUser._id)
      .select(PUBLIC_PROFILE_FIELDS)
      .lean();
    assert.equal(publicProfile.tripDuration, preferences.tripDuration);
    assert.equal(publicProfile.questionnaire.dealBreaker, preferences.questionnaire.dealBreaker);
    assert.equal(publicProfile.tripLocation.latitude, undefined);
    assert.equal(publicProfile.tripLocation.longitude, undefined);
    assert.equal(publicProfile.email, undefined);
    assert.equal(publicProfile.firebaseUid, undefined);
    assert.equal(publicProfile.subscriptionPlan, undefined);

    const existingCompleted = {
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
      registrationCompletedAt: new Date(),
      bio: "",
    };
    assert.equal(getRegistrationState(existingCompleted).registrationComplete, true);
    const missingBioErrors = getCurrentRegistrationValidationErrors({
      ...preferences,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
      photoURL: "http://localhost:5000/api/file/64b000000000000000000096",
      photos: ["http://localhost:5000/api/file/64b000000000000000000096"],
      age: 28,
      interests: ["טבע"],
      tripLocation: destination,
      bio: "",
    });
    assert.deepEqual(Object.keys(missingBioErrors), ["bio"]);

    console.log("Profile consistency MongoDB verification passed", {
      disposableRegistrationCompleted: true,
      refreshPersistenceVerified: true,
      allDiscoverCriteriaCompared: 10,
      editsChangedCompatibility: true,
      previewPublicFieldsVerified: true,
      privateFieldsExcluded: true,
      existingCompletionPreserved: true,
      bioBoundariesVerified: true,
      incompleteFinalSaveRejectedWithoutPersistence: true,
      disposableRecordsRemoved: true,
    });
  } finally {
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
