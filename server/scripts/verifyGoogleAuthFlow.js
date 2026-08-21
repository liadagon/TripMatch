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

  const firstLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token" },
  });

  assert.equal(firstLogin.response.statusCode, 200);
  assert.equal(firstLogin.response.body.success, true);
  assert.equal(firstLogin.response.body.isNewUser, true);
  assert.equal(users.length, 1);
  assert.equal(createCount, 1);
  assert.equal(users[0].email, "traveler@example.com");
  assert.equal(users[0].firebaseUid, verifiedToken.uid);

  Object.assign(users[0], {
    bio: "Persisted Google profile",
    tripLocation: { city: "Barcelona", country: "Spain" },
    questionnaire: {
      planningStyle: "planned",
      accommodationPreference: "hotel",
      companionScope: "whole-trip",
      companionPriority: "compatibility",
      dealBreaker: "boundaries",
    },
  });

  const returningLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token" },
  });

  assert.equal(returningLogin.response.statusCode, 200);
  assert.equal(returningLogin.response.body.isNewUser, false);
  assert.equal(returningLogin.response.body.data._id, users[0]._id);
  assert.equal(returningLogin.response.body.data.bio, "Persisted Google profile");
  assert.equal(users.length, 1);
  assert.equal(createCount, 1);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const repeatedLogin = await invoke(googleLogin, {
      body: { idToken: "mock-firebase-id-token" },
    });
    assert.equal(repeatedLogin.response.body.isNewUser, false);
    assert.equal(repeatedLogin.response.body.data._id, users[0]._id);
  }

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

  const legacyGoogleUser = createUserDocument({
    name: "Legacy Traveler",
    email: "legacy@example.com",
    authProvider: "google",
  });
  const createdBeforeLegacyLogin = createCount;
  verifiedToken = {
    uid: "legacy-firebase-user",
    email: "legacy@example.com",
    email_verified: true,
  };

  const legacyLogin = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token" },
  });
  assert.equal(legacyLogin.response.statusCode, 200);
  assert.equal(legacyLogin.response.body.isNewUser, false);
  assert.equal(legacyLogin.response.body.data._id, legacyGoogleUser._id);
  assert.equal(legacyGoogleUser.firebaseUid, verifiedToken.uid);
  assert.equal(createCount, createdBeforeLegacyLogin);

  createUserDocument({
    name: "Local User",
    email: "local@example.com",
    authProvider: "local",
  });
  verifiedToken = {
    uid: "local-email-google-uid",
    email: "local@example.com",
    email_verified: true,
  };

  const providerConflict = await invoke(googleLogin, {
    body: { idToken: "mock-firebase-id-token" },
  });
  assert.equal(providerConflict.response.statusCode, 400);
  assert.equal(providerConflict.response.body.success, false);

  assert.equal(
    googleLoginSchema.validate({ idToken: "mock-firebase-id-token" }).error,
    undefined,
  );
  assert(googleLoginSchema.validate({}).error);
  assert(
    googleLoginSchema.validate({
      idToken: "mock-firebase-id-token",
      unexpected: true,
    }).error,
  );

  console.log("Google authentication flow verification passed", {
    newUserCreatedOnce: true,
    returningUserReused: true,
    repeatedLoginDuplicates: false,
    legacyGoogleEmailLinked: true,
    currentUserRestoredFromJwt: true,
    validationPassed: true,
  });
}

verifyGoogleAuthFlow().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
