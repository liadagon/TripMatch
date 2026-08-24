const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const User = require("../models/User");
const requireOnboardingComplete = require("../middleware/requireOnboardingComplete");
const PROFILE_OPTIONS = require("../constants/profileOptions");
const { registerSchema } = require("../validation/authValidation");
const {
  QUESTIONNAIRE_FIELDS,
  CURRENT_REGISTRATION_FLOW_VERSION,
  getOnboardingState,
  isOnboardingComplete,
  markRegistrationCompleteIfEligible,
  normalizeAuthenticatedUser,
} = require("../utils/onboarding");

const completedQuestionnaire = {
  accommodationPreference: PROFILE_OPTIONS.accommodationPreferences[0],
  companionScope: PROFILE_OPTIONS.companionScopes[0],
  companionPriority: PROFILE_OPTIONS.companionPriorities[0],
  dealBreaker: PROFILE_OPTIONS.dealBreakers[0],
};

function completeUser(authProvider) {
  return {
    _id: `${authProvider}-complete-user`,
    name: "Complete Traveler",
    email: `${authProvider}@example.com`,
    authProvider,
    photoURL: "http://localhost:5000/api/file/64b000000000000000000003",
    photos: ["http://localhost:5000/api/file/64b000000000000000000003"],
    preferredDestinations: [PROFILE_OPTIONS.destinations[0]],
    tripDates: PROFILE_OPTIONS.tripDates[0],
    tripDuration: PROFILE_OPTIONS.tripDurations[0],
    budget: PROFILE_OPTIONS.budgets[0],
    travelStyle: PROFILE_OPTIONS.travelStyles[0],
    age: 28,
    interests: [PROFILE_OPTIONS.interests[0]],
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
    "questionnaire",
  );

  const missingPersonalProfile = {
    ...complete,
    registrationCompletedAt: undefined,
    bio: "",
  };
  assert.equal(
    getOnboardingState(missingPersonalProfile).nextOnboardingStep,
    "questionnaire",
  );
  assert.equal(
    getOnboardingState({
      ...complete,
      registrationCompletedAt: undefined,
      tripLocation: {},
    }).nextOnboardingStep,
    "questionnaire",
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
  "tripDuration",
  "budget",
  "travelStyle",
]) {
  const user = completeUser("google");
  user.registrationCompletedAt = undefined;
  user[field] = field === "preferredDestinations" ? [] : "";
  assert.equal(getOnboardingState(user).nextOnboardingStep, "questionnaire");
}

const credentialsOnlyRegistration = registerSchema.validate({
  email: "new-registration@example.com",
  password: "safe-test-password",
});
assert.equal(credentialsOnlyRegistration.error, undefined);
const credentialsOnlyUser = new User({
  email: credentialsOnlyRegistration.value.email,
  password: credentialsOnlyRegistration.value.password,
  authProvider: "local",
  registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
});
assert.equal(credentialsOnlyUser.validateSync(), undefined);
assert.equal(credentialsOnlyUser.name, "");
assert.equal(getOnboardingState(credentialsOnlyUser).nextOnboardingStep, "photos");

for (const [field, missingValue] of [
  ["name", "   "],
  ["age", undefined],
  ["interests", []],
  ["bio", "   "],
]) {
  const user = completeUser("email");
  user.registrationCompletedAt = undefined;
  user[field] = missingValue;
  assert.equal(getOnboardingState(user).nextOnboardingStep, "questionnaire");
}

const nonCanonicalQuestionnaire = completeUser("google");
nonCanonicalQuestionnaire.registrationCompletedAt = undefined;
nonCanonicalQuestionnaire.budget = "not-a-canonical-budget";
assert.equal(
  getOnboardingState(nonCanonicalQuestionnaire).nextOnboardingStep,
  "questionnaire",
);

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
  allNineTravelPreferenceAnswersRequired: true,
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
