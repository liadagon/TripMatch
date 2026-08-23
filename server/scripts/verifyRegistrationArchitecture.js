const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const User = require("../models/User");
const {
  getAppOwnedPhotoUrls,
  isAppOwnedPhotoUrl,
  sanitizeUserPhotoFields,
} = require("../utils/profilePhotos");

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

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
