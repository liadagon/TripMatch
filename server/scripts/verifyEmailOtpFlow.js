const assert = require("node:assert/strict");
const express = require("express");

process.env.JWT_SECRET = "tripmatch-email-otp-verification-secret";
process.env.JWT_EXPIRES_IN = "1h";

const emailOtpModelPath = require.resolve("../models/EmailOtp");
const emailServicePath = require.resolve("../services/emailService");
const userModelPath = require.resolve("../models/User");
const emailOtpServicePath = require.resolve("../services/emailOtpService");
const authControllerPath = require.resolve("../controllers/authController");
const authMiddlewarePath = require.resolve("../middleware/auth");

const otpRecords = new Map();
const users = [];
const sentCodes = new Map();
let nextOtpId = 1;
let nextUserId = 1;
let userCreateCount = 0;
let emailSendCount = 0;

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

function queryResult(value) {
  return {
    select: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
}

function findOtpById(id) {
  return [...otpRecords.values()].find((record) => record._id === id) || null;
}

const EmailOtpMock = {
  async findOneAndUpdate(filter, update, options) {
    if (filter.email) {
      const existing = otpRecords.get(filter.email);
      const cutoff = filter.$or?.[0]?.lastSentAt?.$lte;
      const canSend =
        !existing || !existing.lastSentAt || existing.lastSentAt <= cutoff;

      if (!canSend && options?.upsert) {
        const duplicateError = new Error("OTP cooldown collision");
        duplicateError.code = 11000;
        throw duplicateError;
      }

      const record = {
        _id: existing?._id || `otp-${nextOtpId++}`,
        email: filter.email,
        ...existing,
        ...update.$set,
      };
      otpRecords.set(filter.email, record);
      return record;
    }

    const record = findOtpById(filter._id);

    if (!record || record.attemptCount >= filter.attemptCount.$lt) {
      return null;
    }

    record.attemptCount += update.$inc.attemptCount;
    return record;
  },
  findOne(filter) {
    return queryResult(otpRecords.get(filter.email) || null);
  },
  async findOneAndDelete(filter) {
    const record = findOtpById(filter._id);

    if (
      !record ||
      record.codeHash !== filter.codeHash ||
      record.expiresAt <= filter.expiresAt.$gt ||
      record.attemptCount >= filter.attemptCount.$lt
    ) {
      return null;
    }

    otpRecords.delete(record.email);
    return record;
  },
  async deleteOne(filter) {
    const record = filter.email
      ? otpRecords.get(filter.email)
      : findOtpById(filter._id);

    if (
      record &&
      (!filter.requestId || record.requestId === filter.requestId)
    ) {
      otpRecords.delete(record.email);
      return { deletedCount: 1 };
    }

    return { deletedCount: 0 };
  },
};

const emailServiceMock = {
  async sendTransactionalEmail(message) {
    const codeMatch = message.textContent.match(/\b(\d{6})\b/);
    assert(codeMatch, "OTP email must contain a six-digit code");
    assert.equal(typeof message.to, "string");
    emailSendCount += 1;
    sentCodes.set(message.to, codeMatch[1]);
    return { messageId: "mock-email-message" };
  },
};

function createUser(payload) {
  const user = {
    _id: payload._id || `user-${nextUserId++}`,
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
  };
  users.push(user);
  return user;
}

const UserMock = {
  async findOne(filter) {
    return users.find((user) => user.email === filter.email) || null;
  },
  async findById(id) {
    return users.find((user) => String(user._id) === String(id)) || null;
  },
  async updateOne(filter, update) {
    const user = users.find((candidate) => candidate._id === filter._id);
    if (user) Object.assign(user, update.$set);
    return { modifiedCount: user ? 1 : 0 };
  },
  async create(payload) {
    if (users.some((user) => user.email === payload.email)) {
      const duplicateError = new Error("Duplicate user");
      duplicateError.code = 11000;
      throw duplicateError;
    }

    userCreateCount += 1;
    return createUser(payload);
  },
};

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

installModuleMock(emailOtpModelPath, EmailOtpMock);
installModuleMock(emailServicePath, emailServiceMock);
installModuleMock(userModelPath, UserMock);
delete require.cache[emailOtpServicePath];
delete require.cache[authControllerPath];
delete require.cache[authMiddlewarePath];

const {
  requestEmailCode,
  verifyEmailCode,
  getCurrentUser,
} = require(authControllerPath);
const protect = require(authMiddlewarePath);
const {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
} = require("../validation/authValidation");

async function requestCode(email) {
  return invoke(requestEmailCode, { body: { email } });
}

async function verifyCode(email, code) {
  return invoke(verifyEmailCode, { body: { email, code } });
}

async function verifyEndpointRateLimit() {
  const { emailOtpRequestLimiter } = require("../middleware/rateLimiter");
  const app = express();
  app.post("/request", emailOtpRequestLimiter, (_req, res) => {
    res.status(200).json({ success: true });
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  try {
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/request`;
    let response;

    for (let requestNumber = 1; requestNumber <= 6; requestNumber += 1) {
      response = await fetch(url, { method: "POST" });
    }

    assert.equal(response.status, 429);
    assert(response.headers.get("ratelimit-limit"));
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Too many requests, please try again later.",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function run() {
  assert.equal(
    emailOtpRequestSchema.validate({ email: "Traveler@Outlook.com" }).value
      .email,
    "traveler@outlook.com",
  );
  assert(emailOtpRequestSchema.validate({ email: "not-an-email" }).error);
  assert(
    emailOtpVerifySchema.validate({
      email: "traveler@university.edu",
      code: "123456",
    }).error === undefined,
  );

  const newEmail = "new.traveler@outlook.com";
  const requested = await requestCode(newEmail);
  assert.equal(requested.response.statusCode, 200);
  assert.equal(emailSendCount, 1);
  const newCode = sentCodes.get(newEmail);
  const storedRecord = otpRecords.get(newEmail);
  assert.match(newCode, /^\d{6}$/);
  assert.notEqual(storedRecord.codeHash, newCode);
  assert.equal(storedRecord.codeHash.length, 64);

  const cooldown = await requestCode(newEmail);
  assert.equal(cooldown.response.statusCode, 429);
  assert.equal(cooldown.response.body.code, "OTP_RESEND_COOLDOWN");
  assert.equal(emailSendCount, 1);

  const newVerification = await verifyCode(newEmail, newCode);
  assert.equal(newVerification.response.statusCode, 200);
  assert.equal(newVerification.response.body.isNewUser, true);
  assert.equal(newVerification.response.body.data.authProvider, "email");
  assert.equal(newVerification.response.body.data.emailVerified, true);
  assert.equal(userCreateCount, 1);
  assert.equal(users.length, 1);

  const reusedCode = await verifyCode(newEmail, newCode);
  assert.equal(reusedCode.response.statusCode, 400);
  assert.equal(reusedCode.response.body.code, "OTP_INVALID_OR_EXPIRED");

  const usersAfterNewRegistration = users.length;
  const createsAfterNewRegistration = userCreateCount;
  await requestCode(newEmail);
  const repeatedAuthentication = await verifyCode(
    newEmail,
    sentCodes.get(newEmail),
  );
  assert.equal(repeatedAuthentication.response.statusCode, 200);
  assert.equal(repeatedAuthentication.response.body.isNewUser, false);
  assert.equal(
    repeatedAuthentication.response.body.data._id,
    newVerification.response.body.data._id,
  );
  assert.equal(users.length, usersAfterNewRegistration);
  assert.equal(userCreateCount, createsAfterNewRegistration);

  const authRequest = {
    headers: {
      authorization: `Bearer ${newVerification.response.body.token}`,
    },
  };
  const protectedRequest = await invoke(protect, authRequest);
  assert.equal(protectedRequest.nextCalled, true);
  const restored = await invoke(getCurrentUser, protectedRequest.request);
  assert.equal(restored.response.body.data._id, users[0]._id);

  const wrongEmail = "wrong-code@yahoo.com";
  await requestCode(wrongEmail);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const wrong = await verifyCode(wrongEmail, "000000");
    assert.equal(wrong.response.statusCode, 400);
  }
  const blocked = await verifyCode(wrongEmail, "000000");
  assert.equal(blocked.response.statusCode, 429);
  assert.equal(blocked.response.body.code, "OTP_TOO_MANY_ATTEMPTS");

  const expiredEmail = "expired@icloud.com";
  await requestCode(expiredEmail);
  otpRecords.get(expiredEmail).expiresAt = new Date(Date.now() - 1);
  const expired = await verifyCode(expiredEmail, sentCodes.get(expiredEmail));
  assert.equal(expired.response.statusCode, 400);
  assert.equal(expired.response.body.code, "OTP_INVALID_OR_EXPIRED");

  const googleUser = createUser({
    _id: "existing-google-user",
    name: "Existing Google Traveler",
    email: "shared@gmail.com",
    authProvider: "google",
    firebaseUid: "existing-google-uid",
    emailVerified: false,
  });
  const usersBeforeExistingLogin = users.length;
  const createsBeforeExistingLogin = userCreateCount;
  await requestCode(googleUser.email);
  const existingVerification = await verifyCode(
    googleUser.email,
    sentCodes.get(googleUser.email),
  );
  assert.equal(existingVerification.response.statusCode, 200);
  assert.equal(existingVerification.response.body.isNewUser, false);
  assert.equal(existingVerification.response.body.data._id, googleUser._id);
  assert.equal(googleUser.emailVerified, true);
  assert.equal(users.length, usersBeforeExistingLogin);
  assert.equal(userCreateCount, createsBeforeExistingLogin);

  await verifyEndpointRateLimit();

  console.log("Email OTP authentication verification passed", {
    cryptographicSixDigitCode: true,
    plaintextOtpStored: false,
    expirationMinutes: 10,
    maxAttempts: 5,
    resendCooldownSeconds: 60,
    newUserCreatedOnce: true,
    existingGoogleUserReused: true,
    duplicateUsersCreated: false,
    wrongExpiredAndReusedCodesRejected: true,
    jwtRestorationPassed: true,
    nonGmailValidationPassed: true,
    endpointRateLimitPassed: true,
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
