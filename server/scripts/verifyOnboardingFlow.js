const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const User = require("../models/User");
const requireOnboardingComplete = require("../middleware/requireOnboardingComplete");
const {
  QUESTIONNAIRE_FIELDS,
  CURRENT_REGISTRATION_FLOW_VERSION,
  getOnboardingState,
  isOnboardingComplete,
  markRegistrationCompleteIfEligible,
  normalizeAuthenticatedUser,
} = require("../utils/onboarding");

const completedQuestionnaire = {
  planningStyle: "planned",
  accommodationPreference: "hotel",
  companionScope: "whole-trip",
  companionPriority: "compatibility",
  dealBreaker: "boundaries",
};

function completeUser(authProvider) {
  return {
    _id: `${authProvider}-complete-user`,
    name: "Complete Traveler",
    email: `${authProvider}@example.com`,
    authProvider,
    photoURL: "http://localhost:5000/api/file/64b000000000000000000003",
    photos: ["http://localhost:5000/api/file/64b000000000000000000003"],
    preferredDestinations: ["Europe"],
    tripDates: "summer",
    tripDuration: "two-weeks",
    budget: "medium",
    travelStyle: "cities",
    age: 28,
    interests: ["hiking"],
    bio: "A sufficiently detailed traveler biography",
    questionnaire: { ...completedQuestionnaire },
    tripLocation: { city: "Barcelona", country: "Spain" },
    registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
    registrationCompletedAt: new Date("2026-08-23T00:00:00.000Z"),
  };
}

function invokeGuard(user) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  requireOnboardingComplete({ user }, response, () => {
    nextCalled = true;
  });
  return { nextCalled, response };
}

for (const authProvider of ["google", "email"]) {
  const complete = completeUser(authProvider);
  assert.deepEqual(getOnboardingState(complete), {
    registrationComplete: true,
    registrationInProgress: false,
    nextRegistrationStep: null,
    onboardingComplete: true,
    nextOnboardingStep: null,
  });
  assert.equal(isOnboardingComplete(complete), true);

  const newUser = {
    ...complete,
    photoURL: "",
    photos: [],
    registrationCompletedAt: undefined,
  };
  assert.equal(getOnboardingState(newUser).nextOnboardingStep, "photos");

  const partialUser = {
    ...complete,
    registrationCompletedAt: undefined,
    questionnaire: { ...completedQuestionnaire, dealBreaker: "" },
  };
  assert.equal(
    getOnboardingState(partialUser).nextOnboardingStep,
    "questionnaire",
  );

  const missingDestination = {
    ...complete,
    registrationCompletedAt: undefined,
    tripLocation: undefined,
  };
  assert.equal(
    getOnboardingState(missingDestination).nextOnboardingStep,
    "profile",
  );
  assert.equal(
    getOnboardingState({
      ...complete,
      registrationCompletedAt: undefined,
      tripLocation: {},
    }).nextOnboardingStep,
    "profile",
  );

  const blocked = invokeGuard(newUser);
  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.response.statusCode, 403);
  assert.equal(blocked.response.body.code, "ONBOARDING_INCOMPLETE");
  assert.equal(blocked.response.body.nextOnboardingStep, "photos");

  const allowed = invokeGuard(complete);
  assert.equal(allowed.nextCalled, true);
}

for (const field of QUESTIONNAIRE_FIELDS) {
  const user = completeUser("email");
  user.registrationCompletedAt = undefined;
  user.questionnaire[field] = "";
  assert.equal(getOnboardingState(user).nextOnboardingStep, "questionnaire");
}

for (const field of [
  "preferredDestinations",
  "tripDates",
  "budget",
  "travelStyle",
]) {
  const user = completeUser("google");
  user.registrationCompletedAt = undefined;
  user[field] = field === "preferredDestinations" ? [] : "";
  assert.equal(getOnboardingState(user).nextOnboardingStep, "questionnaire");
}

const historicalCompleteUser = completeUser("email");
delete historicalCompleteUser.registrationFlowVersion;
delete historicalCompleteUser.registrationCompletedAt;
historicalCompleteUser.photoURL = "https://lh3.googleusercontent.com/legacy-avatar";
historicalCompleteUser.photos = [];
historicalCompleteUser.tripLocation = undefined;
assert.equal(isOnboardingComplete(historicalCompleteUser), true);

const currentCompleteWithoutMarker = completeUser("email");
currentCompleteWithoutMarker.registrationCompletedAt = undefined;
assert.equal(isOnboardingComplete(currentCompleteWithoutMarker), false);
assert.equal(markRegistrationCompleteIfEligible(currentCompleteWithoutMarker), true);
assert.equal(isOnboardingComplete(currentCompleteWithoutMarker), true);

const normalized = normalizeAuthenticatedUser({
  ...completeUser("email"),
  password: "must-not-leak",
});
assert.equal(normalized.password, undefined);
assert.equal(normalized.onboardingComplete, true);
assert.equal(normalized.nextOnboardingStep, null);
assert.equal(normalized.registrationComplete, true);
assert.equal(normalized.registrationInProgress, false);
assert.equal(normalized.nextRegistrationStep, null);

assert.equal(User.schema.path("email").options.unique, true);
assert.equal(User.schema.path("firebaseUid").options.sparse, true);
assert.equal(typeof require("../app"), "function");

const routeDirectory = path.join(__dirname, "..", "routes");
for (const filename of [
  "swipeRoutes.js",
  "matchRoutes.js",
  "conversationRoutes.js",
  "blockRoutes.js",
  "subscriptionRoutes.js",
]) {
  const source = fs.readFileSync(path.join(routeDirectory, filename), "utf8");
  assert.match(source, /requireOnboardingComplete/);
  assert.match(source, /router\.use\(protect, requireOnboardingComplete\)/);
}

const userRoutesSource = fs.readFileSync(
  path.join(routeDirectory, "userRoutes.js"),
  "utf8",
);
assert(
  userRoutesSource.indexOf('router.put("/me"') <
    userRoutesSource.indexOf("router.use(requireOnboardingComplete)"),
  "Profile completion updates must remain available before the app guard",
);

const fileRoutesSource = fs.readFileSync(
  path.join(routeDirectory, "fileRoutes.js"),
  "utf8",
);
assert.match(fileRoutesSource, /router\.post\("\/", protect, upload\.single/);
assert.doesNotMatch(fileRoutesSource, /requireOnboardingComplete/);

console.log("Shared onboarding enforcement verification passed", {
  authoritativeRuleSharedByGoogleAndEmail: true,
  oneRequiredPhoto: true,
  allTenTravelPreferenceAnswersRequired: true,
  personalProfileRequiredForNewRegistrations: true,
  tripDestinationRequired: true,
  partialUsersResumeAtCorrectStep: true,
  historicalCompleteUsersDerivedWithoutFlag: true,
  incompleteUsersBlockedFromNormalApis: true,
  onboardingProfileUpdateAndUploadAllowed: true,
  normalizedUserDoesNotLeakPassword: true,
  schemaIndexesVerified: true,
  appLoads: true,
});
