const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const User = require("../models/User");
const PROFILE_OPTIONS = require("../constants/profileOptions");
const { registerSchema } = require("../validation/authValidation");
const {
  getAppOwnedPhotoUrls,
  isAppOwnedPhotoUrl,
  sanitizeUserPhotoFields,
} = require("../utils/profilePhotos");

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const registrationIdentity = {
  email: "registration-validation@example.com",
  password: "safe-password",
};

const expectRegistrationAccepted = (profile = {}) => {
  const { error } = registerSchema.validate({
    ...registrationIdentity,
    ...profile,
  });
  assert.equal(error, undefined);
};

const expectRegistrationRejected = (profile) => {
  const { error } = registerSchema.validate({
    ...registrationIdentity,
    ...profile,
  });
  assert(error);
};

expectRegistrationAccepted();
expectRegistrationAccepted({ interests: [PROFILE_OPTIONS.interests[0]] });
expectRegistrationAccepted({
  preferredDestinations: [PROFILE_OPTIONS.destinations[0]],
});
expectRegistrationAccepted({ travelStyle: PROFILE_OPTIONS.travelStyles[0] });
expectRegistrationAccepted({ budget: PROFILE_OPTIONS.budgets[0] });
expectRegistrationAccepted({ tripDates: PROFILE_OPTIONS.tripDates[0] });
expectRegistrationAccepted({ tripDuration: PROFILE_OPTIONS.tripDurations[0] });
expectRegistrationAccepted({
  interests: [],
  preferredDestinations: [],
  travelStyle: "",
  budget: "",
  tripDates: "",
  tripDuration: "",
});

expectRegistrationRejected({ interests: ["unknown-interest"] });
expectRegistrationRejected({
  interests: Array.from({ length: 11 }, () => PROFILE_OPTIONS.interests[0]),
});
expectRegistrationRejected({
  preferredDestinations: ["unknown-destination"],
});
expectRegistrationRejected({
  preferredDestinations: PROFILE_OPTIONS.destinations.slice(0, 2),
});
expectRegistrationRejected({ travelStyle: "unknown-travel-style" });
expectRegistrationRejected({ budget: "unknown-budget" });
expectRegistrationRejected({ tripDates: "unknown-trip-dates" });
expectRegistrationRejected({ tripDuration: "unknown-trip-duration" });
expectRegistrationRejected({ questionnaire: {} });

assert.equal(
  isAppOwnedPhotoUrl("https://lh3.googleusercontent.com/provider-avatar"),
  false,
);
assert.equal(isAppOwnedPhotoUrl("https://example.com/user-photo.jpg"), false);
assert.equal(
  isAppOwnedPhotoUrl("http://localhost:5000/api/file/64b000000000000000000004"),
  true,
);
assert.equal(isAppOwnedPhotoUrl("/public/legacy-profile.png"), true);

const profile = sanitizeUserPhotoFields({
  photoURL: "https://lh3.googleusercontent.com/provider-avatar",
  photo: "",
  photos: [
    "https://lh3.googleusercontent.com/provider-avatar",
    "http://localhost:5000/api/file/64b000000000000000000004",
  ],
});
assert.equal(
  profile.photoURL,
  "http://localhost:5000/api/file/64b000000000000000000004",
);
assert.deepEqual(getAppOwnedPhotoUrls(profile), [
  "http://localhost:5000/api/file/64b000000000000000000004",
]);

assert(User.schema.path("registrationFlowVersion"));
assert(User.schema.path("registrationCompletedAt"));

const authController = read("controllers/authController.js");
const userController = read("controllers/userController.js");
const matchController = read("controllers/matchController.js");
assert.doesNotMatch(authController, /verifiedToken\.picture/);
assert.match(authController, /registrationFlowVersion:\s*CURRENT_REGISTRATION_FLOW_VERSION/g);
assert.match(authController, /registrationComplete:\s*data\.registrationComplete/);
assert.match(authController, /registrationInProgress:\s*data\.registrationInProgress/);
assert.match(authController, /nextRegistrationStep:\s*data\.nextRegistrationStep/);
assert.match(userController, /markRegistrationCompleteIfEligible\(user\)/);
assert.match(matchController, /getAppOwnedPhotoUrls\(matchedUser\)/);

console.log("Registration architecture verification passed", {
  durableCompletionMarker: true,
  historicalCompatibility: true,
  googleAvatarIgnored: true,
  appOwnedPhotosOnly: true,
  normalizedRegistrationState: true,
});
