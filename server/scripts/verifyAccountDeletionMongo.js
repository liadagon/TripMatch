const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const Block = require("../models/Block");
const Conversation = require("../models/Conversation");
const EmailOtp = require("../models/EmailOtp");
const Match = require("../models/Match");
const ProcessedPayPalWebhookEvent = require("../models/ProcessedPayPalWebhookEvent");
const Swipe = require("../models/Swipe");
const User = require("../models/User");
const protect = require("../middleware/auth");
const { deleteUserAccount } = require("../services/accountDeletionService");
const {
  deleteProfileImage,
  findProfileImage,
  storeProfileImage,
} = require("../services/profileImageStorage");
const {
  CURRENT_REGISTRATION_FLOW_VERSION,
  getOnboardingState,
} = require("../utils/onboarding");

function pairKey(left, right) {
  return [String(left), String(right)].sort().join(":");
}

async function expectOldTokenRejected(token) {
  let statusCode;
  let body;
  let nextCalled = false;
  await protect(
    { headers: { authorization: `Bearer ${token}` } },
    {
      status(status) { statusCode = status; return this; },
      json(payload) { body = payload; return this; },
    },
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, false);
  assert.equal(statusCode, 401);
  assert.equal(body.success, false);
}

async function run() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  assert(process.env.JWT_SECRET, "JWT_SECRET is not configured");
  await mongoose.connect(process.env.DATABASE_URL);

  const marker = `delete-${Date.now()}-${crypto.randomUUID()}`;
  const email = `${marker}@example.com`;
  const firebaseUid = `${marker}-firebase`;
  const createdUserIds = [];
  const createdFileIds = [];

  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    const transactionsSupported = Boolean(
      hello.setName || hello.msg === "isdbgrid",
    );

    const [target, other, third] = await User.create([
      {
        name: "Deletion Target",
        email,
        authProvider: "email",
        emailVerified: true,
        photoURL: "/api/files/profile/legacy-reference",
        bio: "must disappear",
        preferredDestinations: ["Peru"],
      },
      { name: "Unrelated One", email: `${marker}-one@example.com`, authProvider: "email" },
      { name: "Unrelated Two", email: `${marker}-two@example.com`, authProvider: "email" },
    ]);
    createdUserIds.push(target._id, other._id, third._id);

    const [targetMatch, unrelatedMatch] = await Match.create([
      { users: [target._id, other._id], pairKey: pairKey(target._id, other._id) },
      { users: [other._id, third._id], pairKey: pairKey(other._id, third._id) },
    ]);
    await Conversation.create([
      {
        match: targetMatch._id,
        participants: [target._id, other._id],
        messages: [{ sender: target._id, text: "delete me" }],
      },
      {
        match: unrelatedMatch._id,
        participants: [other._id, third._id],
        messages: [{ sender: other._id, text: "keep me" }],
      },
    ]);
    await Swipe.create([
      { fromUser: target._id, toUser: other._id, action: "like" },
      { fromUser: third._id, toUser: target._id, action: "like" },
      { fromUser: other._id, toUser: third._id, action: "like" },
    ]);
    await Block.create([
      { blocker: target._id, blocked: other._id },
      { blocker: third._id, blocked: target._id },
      { blocker: other._id, blocked: third._id },
    ]);
    await EmailOtp.create({
      email,
      codeHash: "test-hash",
      requestId: marker,
      expiresAt: new Date(Date.now() + 60_000),
      lastSentAt: new Date(),
    });
    await ProcessedPayPalWebhookEvent.create({
      eventId: marker,
      eventType: "TEST.ACCOUNT.DELETION",
      paypalSubscriptionId: `I-${marker}`,
      status: "processed",
      processedAt: new Date(),
    });

    const ownedImage = await storeProfileImage({
      buffer: Buffer.from("owned-profile-image"),
      contentType: "image/png",
      ownerId: target._id,
    });
    const unrelatedImage = await storeProfileImage({
      buffer: Buffer.from("unrelated-profile-image"),
      contentType: "image/png",
      ownerId: other._id,
    });
    createdFileIds.push(ownedImage.fileId, unrelatedImage.fileId);

    const oldToken = jwt.sign(
      { userId: String(target._id) },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );
    await deleteUserAccount(target);

    assert.equal(await User.exists({ _id: target._id }), null);
    assert.equal(await Swipe.countDocuments({ $or: [{ fromUser: target._id }, { toUser: target._id }] }), 0);
    assert.equal(await Match.countDocuments({ users: target._id }), 0);
    assert.equal(await Conversation.countDocuments({ participants: target._id }), 0);
    assert.equal(await Block.countDocuments({ $or: [{ blocker: target._id }, { blocked: target._id }] }), 0);
    assert.equal(await EmailOtp.countDocuments({ email }), 0);
    assert.equal(await findProfileImage(ownedImage.fileId), null);
    assert(await findProfileImage(unrelatedImage.fileId));
    assert.equal(await Swipe.countDocuments({ fromUser: other._id, toUser: third._id }), 1);
    assert.equal(await Match.countDocuments({ _id: unrelatedMatch._id }), 1);
    assert.equal(await Conversation.countDocuments({ match: unrelatedMatch._id }), 1);
    assert.equal(await Block.countDocuments({ blocker: other._id, blocked: third._id }), 1);
    assert.equal(await User.countDocuments({ _id: target._id }), 0);
    await expectOldTokenRejected(oldToken);

    const emailReplacement = await User.create({
      name: "Fresh Email User",
      email,
      authProvider: "email",
      emailVerified: true,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
    });
    createdUserIds.push(emailReplacement._id);
    assert.notEqual(String(emailReplacement._id), String(target._id));
    assert.deepEqual(getOnboardingState(emailReplacement), {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "photos",
      onboardingComplete: false,
      nextOnboardingStep: "photos",
    });
    await deleteUserAccount(emailReplacement);

    const googleReplacement = await User.create({
      name: "Fresh Google User",
      email,
      authProvider: "google",
      emailVerified: true,
      firebaseUid,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
    });
    createdUserIds.push(googleReplacement._id);
    assert.notEqual(String(googleReplacement._id), String(emailReplacement._id));
    assert.deepEqual(getOnboardingState(googleReplacement), {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "photos",
      onboardingComplete: false,
      nextOnboardingStep: "photos",
    });
    await deleteUserAccount(googleReplacement);

    const crossProviderReplacement = await User.create({
      name: "Fresh Cross Provider User",
      email,
      authProvider: "email",
      emailVerified: true,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
    });
    createdUserIds.push(crossProviderReplacement._id);
    assert.notEqual(String(crossProviderReplacement._id), String(googleReplacement._id));
    assert.deepEqual(getOnboardingState(crossProviderReplacement), {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "photos",
      onboardingComplete: false,
      nextOnboardingStep: "photos",
    });
    await deleteUserAccount(crossProviderReplacement);

    console.log("Account deletion MongoDB verification: PASS", {
      transactionsSupported,
      oldJwtRejected: true,
      unrelatedDataPreserved: true,
      emailReregistrationFresh: true,
      googleReregistrationFresh: true,
      crossProviderFresh: true,
    });
  } finally {
    await Conversation.deleteMany({ participants: { $in: createdUserIds } });
    await Match.deleteMany({ users: { $in: createdUserIds } });
    await Swipe.deleteMany({ $or: [{ fromUser: { $in: createdUserIds } }, { toUser: { $in: createdUserIds } }] });
    await Block.deleteMany({ $or: [{ blocker: { $in: createdUserIds } }, { blocked: { $in: createdUserIds } }] });
    await EmailOtp.deleteMany({ email: { $regex: `^${marker}` } });
    await ProcessedPayPalWebhookEvent.deleteMany({ eventId: marker });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    for (const fileId of createdFileIds) {
      await deleteProfileImage(fileId).catch(() => {});
    }
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Account deletion MongoDB verification: FAIL");
  console.error(error);
  process.exitCode = 1;
});
