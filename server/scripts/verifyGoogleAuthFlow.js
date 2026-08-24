const assert = require("node:assert/strict");

process.env.JWT_SECRET = "tripmatch-google-auth-verification-secret";
process.env.JWT_EXPIRES_IN = "1h";

const firebaseModulePath = require.resolve("../config/firebaseAdmin");
const userModulePath = require.resolve("../models/User");
const authControllerPath = require.resolve("../controllers/authController");
const authMiddlewarePath = require.resolve("../middleware/auth");

let verifiedToken;
let createCount = 0;
let nextUserId = 1;
const users = [];

function createUserDocument(payload) {
  const user = {
    _id: payload._id || `mock-user-${nextUserId++}`,
    authProvider: "local",
    photoURL: "",
    photos: [],
    questionnaire: {
      planningStyle: "",
      accommodationPreference: "",
      companionScope: "",
      companionPriority: "",
      dealBreaker: "",
    },
    ...payload,
    async save() {
      return this;
    },
  };

  users.push(user);
  return user;
}

const UserMock = {
  async findOne(filter) {
    if (filter.firebaseUid) {
      return users.find((user) => user.firebaseUid === filter.firebaseUid) || null;
    }

    if (filter.email) {
      return users.find((user) => user.email === filter.email) || null;
    }

    return null;
  },
  async findById(userId) {
    return users.find((user) => String(user._id) === String(userId)) || null;
  },
  async create(payload) {
    if (
      users.some(
        (user) =>
          user.email === payload.email ||
          (payload.firebaseUid && user.firebaseUid === payload.firebaseUid),
      )
    ) {
      const duplicateError = new Error("Duplicate user");
      duplicateError.code = 11000;
      throw duplicateError;
    }

    createCount += 1;
    return createUserDocument(payload);
  },
};

const firebaseAuthMock = {
  async verifyIdToken(idToken) {
    assert.equal(idToken, "mock-firebase-id-token");
    return verifiedToken;
  },
};

function installModuleMock(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
    children: [],
    paths: [],
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function invoke(handler, request) {
  const response = createResponse();
  let nextCalled = false;
  let nextError;

  await handler(request, response, (error) => {
    nextCalled = true;
    nextError = error;
  });

  if (nextError) throw nextError;
  return { request, response, nextCalled };
}

installModuleMock(firebaseModulePath, () => firebaseAuthMock);
installModuleMock(userModulePath, UserMock);
delete require.cache[authControllerPath];
delete require.cache[authMiddlewarePath];

const { getCurrentUser, googleLogin } = require(authControllerPath);
const protect = require(authMiddlewarePath);
const { googleLoginSchema } = require("../validation/authValidation");

async function verifyGoogleAuthFlow() {
  verifiedToken = {
    uid: "firebase-user-1",
    email: "Traveler@Example.com",
    email_verified: true,
    name: "Trip Traveler",
    picture: "https://example.com/traveler.jpg",
  };

  const missingLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "login" },
  });
  assert.equal(missingLogin.response.statusCode, 404);
  assert.equal(missingLogin.response.body.code, "ACCOUNT_NOT_FOUND");
  assert.equal(users.length, 0);
  assert.equal(createCount, 0);

  const firstLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "register" },
  });

  assert.equal(firstLogin.response.statusCode, 200);
  assert.equal(firstLogin.response.body.success, true);
  assert.equal(firstLogin.response.body.isNewUser, true);
  assert.equal(users.length, 1);
  assert.equal(createCount, 1);
  assert.equal(users[0].email, "traveler@example.com");
  assert.equal(users[0].firebaseUid, verifiedToken.uid);
  assert.equal(users[0].emailVerified, true);
  assert.equal(users[0].photoURL, "");
  assert.deepEqual(users[0].photos, []);
  assert.equal(firstLogin.response.body.data.photoURL, "");
  assert.equal(firstLogin.response.body.registrationComplete, false);
  assert.equal(firstLogin.response.body.registrationInProgress, true);
  assert.equal(firstLogin.response.body.nextRegistrationStep, "photos");
  assert.equal(firstLogin.response.body.accountState, "new_registration");
  assert.equal(firstLogin.response.body.onboardingComplete, false);
  assert.equal(firstLogin.response.body.nextOnboardingStep, "photos");

  const initialProtectedRequest = await invoke(protect, {
    headers: {
      authorization: `Bearer ${firstLogin.response.body.token}`,
    },
  });
  const initialRestoredUser = await invoke(
    getCurrentUser,
    initialProtectedRequest.request,
  );
  assert.equal(initialRestoredUser.response.body.onboardingComplete, false);
  assert.equal(
    initialRestoredUser.response.body.nextOnboardingStep,
    "photos",
  );

  Object.assign(users[0], {
    photoURL: "http://localhost:5000/api/file/64b000000000000000000001",
    photos: ["http://localhost:5000/api/file/64b000000000000000000001"],
    bio: "Persisted Google profile",
    preferredDestinations: ["Europe"],
    tripDates: "summer",
    tripDuration: "two-weeks",
    budget: "medium",
    travelStyle: "cities",
    questionnaire: {
      planningStyle: "planned",
      accommodationPreference: "hotel",
      companionScope: "whole-trip",
      companionPriority: "compatibility",
      dealBreaker: "boundaries",
    },
  });

  const partialLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "login" },
  });
  assert.equal(partialLogin.response.body.onboardingComplete, false);
  assert.equal(partialLogin.response.body.nextOnboardingStep, "profile");

  users[0].tripLocation = { city: "Barcelona", country: "Spain" };
  users[0].registrationCompletedAt = new Date();
  verifiedToken.picture = "https://lh3.googleusercontent.com/replacement-avatar";
  verifiedToken.name = "Provider Replacement Name";

  const returningLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "login" },
  });

  assert.equal(returningLogin.response.statusCode, 200);
  assert.equal(returningLogin.response.body.isNewUser, false);
  assert.equal(returningLogin.response.body.data._id, users[0]._id);
  assert.equal(returningLogin.response.body.data.bio, "Persisted Google profile");
  assert.equal(returningLogin.response.body.data.name, "Trip Traveler");
  assert.equal(users[0].name, "Trip Traveler");
  assert.equal(returningLogin.response.body.onboardingComplete, true);
  assert.equal(returningLogin.response.body.nextOnboardingStep, null);
  assert.equal(returningLogin.response.body.registrationComplete, true);
  assert.equal(returningLogin.response.body.accountState, "registered");
  assert.equal(
    returningLogin.response.body.data.photoURL,
    "http://localhost:5000/api/file/64b000000000000000000001",
  );
  assert.equal(users.length, 1);
  assert.equal(createCount, 1);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const repeatedLogin = await invoke(googleLogin, {
      body: { idToken: "mock-firebase-id-token", intent: "login" },
    });
    assert.equal(repeatedLogin.response.body.isNewUser, false);
    assert.equal(repeatedLogin.response.body.data._id, users[0]._id);
  }

  assert.equal(users.length, 1);
  assert.equal(createCount, 1);

  const duplicateRegister = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "register" },
  });
  assert.equal(duplicateRegister.response.statusCode, 409);
  assert.equal(duplicateRegister.response.body.code, "ACCOUNT_ALREADY_EXISTS");
  assert.equal(users.length, 1);
  assert.equal(createCount, 1);

  const authRequest = {
    headers: {
      authorization: `Bearer ${returningLogin.response.body.token}`,
    },
  };
  const protectedRequest = await invoke(protect, authRequest);
  assert.equal(protectedRequest.nextCalled, true);
  assert.equal(protectedRequest.request.user._id, users[0]._id);

  const restoredUser = await invoke(getCurrentUser, protectedRequest.request);
  assert.equal(restoredUser.response.statusCode, 200);
  assert.equal(restoredUser.response.body.data._id, users[0]._id);
  assert.equal(restoredUser.response.body.data.bio, "Persisted Google profile");
  assert.equal(restoredUser.response.body.registrationComplete, true);

  const legacyGoogleUser = createUserDocument({
    name: "Legacy Traveler",
    email: "legacy@example.com",
    authProvider: "google",
    photoURL: "http://localhost:5000/api/file/64b000000000000000000006",
    photos: ["http://localhost:5000/api/file/64b000000000000000000006"],
    preferredDestinations: ["Europe"],
    tripDates: "summer",
    budget: "medium",
    travelStyle: "cities",
    questionnaire: {
      planningStyle: "planned",
      accommodationPreference: "hotel",
      companionScope: "whole-trip",
      companionPriority: "compatibility",
      dealBreaker: "boundaries",
    },
    tripLocation: { city: "Barcelona", country: "Spain" },
  });
  const createdBeforeLegacyLogin = createCount;
  verifiedToken = {
    uid: "legacy-firebase-user",
    email: "legacy@example.com",
    email_verified: true,
  };

  const legacyLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "login" },
  });
  assert.equal(legacyLogin.response.statusCode, 200);
  assert.equal(legacyLogin.response.body.isNewUser, false);
  assert.equal(legacyLogin.response.body.data._id, legacyGoogleUser._id);
  assert.equal(legacyGoogleUser.firebaseUid, verifiedToken.uid);
  assert.equal(legacyLogin.response.body.registrationComplete, true);
  assert.equal(legacyLogin.response.body.registrationInProgress, false);
  assert.equal(legacyLogin.response.body.nextRegistrationStep, null);
  assert.equal(legacyLogin.response.body.accountState, "registered");
  assert.equal(createCount, createdBeforeLegacyLogin);

  const partialLegacyGoogleUser = createUserDocument({
    name: "Partial Legacy Traveler",
    email: "partial-legacy@example.com",
    authProvider: "google",
    photoURL: "http://localhost:5000/api/file/64b000000000000000000007",
    photos: ["http://localhost:5000/api/file/64b000000000000000000007"],
    preferredDestinations: ["Europe"],
    tripDates: "summer",
    budget: "medium",
    travelStyle: "cities",
    questionnaire: {
      planningStyle: "planned",
      accommodationPreference: "hotel",
      companionScope: "whole-trip",
      companionPriority: "compatibility",
      dealBreaker: "",
    },
    tripLocation: { city: "Barcelona", country: "Spain" },
  });
  verifiedToken = {
    uid: "partial-legacy-firebase-user",
    email: "partial-legacy@example.com",
    email_verified: true,
  };

  const partialLegacyLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "login" },
  });
  assert.equal(partialLegacyLogin.response.body.isNewUser, false);
  assert.equal(partialLegacyLogin.response.body.data._id, partialLegacyGoogleUser._id);
  assert.equal(partialLegacyLogin.response.body.registrationComplete, false);
  assert.equal(partialLegacyLogin.response.body.nextRegistrationStep, "questionnaire");

  verifiedToken = {
    uid: "google-without-photo-uid",
    email: "google-without-photo@example.com",
    email_verified: true,
    name: "No Photo Traveler",
  };
  const googleWithoutPhoto = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "register" },
  });
  assert.equal(googleWithoutPhoto.response.body.isNewUser, true);
  assert.equal(googleWithoutPhoto.response.body.onboardingComplete, false);
  assert.equal(googleWithoutPhoto.response.body.nextOnboardingStep, "photos");

  const emailFirstUser = createUserDocument({
    name: "Email First User",
    email: "email-first@example.com",
    authProvider: "email",
    emailVerified: true,
    photoURL: "https://lh3.googleusercontent.com/imported-avatar",
    preferredDestinations: ["Europe"],
    tripDates: "summer",
    budget: "medium",
    travelStyle: "cities",
    questionnaire: {
      planningStyle: "planned",
      accommodationPreference: "hotel",
      companionScope: "whole-trip",
      companionPriority: "compatibility",
      dealBreaker: "boundaries",
    },
  });
  verifiedToken = {
    uid: "email-first-google-uid",
    email: "email-first@example.com",
    email_verified: true,
  };

  const linkedEmailUser = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token", intent: "login" },
  });
  assert.equal(linkedEmailUser.response.statusCode, 200);
  assert.equal(linkedEmailUser.response.body.isNewUser, false);
  assert.equal(linkedEmailUser.response.body.data._id, emailFirstUser._id);
  assert.equal(linkedEmailUser.response.body.nextOnboardingStep, null);
  assert.equal(linkedEmailUser.response.body.registrationComplete, true);
  assert.equal(linkedEmailUser.response.body.data.photoURL, "");
  assert.equal(emailFirstUser.firebaseUid, verifiedToken.uid);
  assert.equal(emailFirstUser.questionnaire.planningStyle, "planned");
  assert.equal(
    users.filter((user) => user.email === emailFirstUser.email).length,
    1,
  );

  assert.equal(
    googleLoginSchema.validate({
      idToken: "mock-firebase-id-token",
      intent: "login",
    }).error,
    undefined,
  );
  assert(googleLoginSchema.validate({}).error);
  assert(
    googleLoginSchema.validate({
      idToken: "mock-firebase-id-token",
      intent: "login",
      unexpected: true,
    }).error,
  );

  console.log("Google authentication flow verification passed", {
    newUserCreatedOnce: true,
    returningUserReused: true,
    repeatedLoginDuplicates: false,
    legacyGoogleEmailLinked: true,
    legacyCompleteGoogleUserEntersApp: true,
    genuinelyIncompleteLegacyGoogleUserRemainsPartial: true,
    emailThenGoogleReusesUserAndProgress: true,
    newUserOnboardingIncomplete: true,
    missingGooglePhotoRequiresPhotoStep: true,
    partialUserResumesAtProfile: true,
    completeUserEntersApp: true,
    currentUserRestoredFromJwt: true,
    providerAvatarNeverPersisted: true,
    providerNameDoesNotOverwriteAppName: true,
    existingAppPhotoPreserved: true,
    durableRegistrationState: true,
    validationPassed: true,
    missingLoginReturnsAccountNotFound: true,
    registerCreatesMissingUserOnly: true,
    duplicateRegisterRejected: true,
  });
}

verifyGoogleAuthFlow().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
