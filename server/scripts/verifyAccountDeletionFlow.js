const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const express = require("express");
const errorHandler = require("../middleware/errorHandler");
const userRoutes = require("../routes/userRoutes");
const {
  createAccountDeletionService,
} = require("../services/accountDeletionService");
const {
  createSubscriptionOperations,
} = require("../services/subscriptionService");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

function createDeleteManyModel(name, calls) {
  return {
    async deleteMany(filter, options) {
      calls.push({ name, filter, options });
      return { deletedCount: 2 };
    },
  };
}

async function verifyCompleteCleanup() {
  const calls = [];
  const userId = new mongoose.Types.ObjectId();
  const matchId = new mongoose.Types.ObjectId();
  const session = {
    async withTransaction(operation) {
      calls.push({ name: "transaction" });
      await operation();
    },
    async endSession() {
      calls.push({ name: "endSession" });
    },
  };
  const user = {
    _id: userId,
    email: "Delete.Me@Example.com",
    paypalSubscriptionId: "I-STORED-ONLY",
    subscriptionStatus: "active",
  };
  const UserModel = {
    async findById(id) {
      assert.equal(String(id), String(userId));
      calls.push({ name: "findUser" });
      return user;
    },
    async deleteOne(filter, options) {
      calls.push({ name: "deleteUser", filter, options });
      return { deletedCount: 1 };
    },
  };
  const MatchModel = createDeleteManyModel("matches", calls);
  MatchModel.distinct = () => ({
    async session() {
      calls.push({ name: "findMatches" });
      return [matchId];
    },
  });
  const service = createAccountDeletionService({
    mongooseInstance: { async startSession() { return session; } },
    UserModel,
    SwipeModel: createDeleteManyModel("swipes", calls),
    MatchModel,
    ConversationModel: createDeleteManyModel("conversations", calls),
    BlockModel: createDeleteManyModel("blocks", calls),
    EmailOtpModel: createDeleteManyModel("emailOtp", calls),
    WebhookEventModel: createDeleteManyModel("webhooks", calls),
    async deleteOwnedProfileImages(id, options) {
      calls.push({ name: "images", id, options });
      return 2;
    },
    async cancelStoredSubscription(storedUser) {
      assert.equal(storedUser.paypalSubscriptionId, "I-STORED-ONLY");
      calls.push({ name: "cancelSubscription" });
    },
    async supportsTransactions() { return true; },
  });

  assert.deepEqual(await service.deleteUserAccount({ _id: userId }), {
    success: true,
  });
  const names = calls.map(({ name }) => name);
  assert.ok(names.indexOf("cancelSubscription") < names.indexOf("transaction"));
  assert.ok(names.indexOf("deleteUser") > names.indexOf("images"));
  assert.equal(names.at(-1), "endSession");

  const swipes = calls.find(({ name }) => name === "swipes").filter;
  assert.deepEqual(swipes.$or, [{ fromUser: userId }, { toUser: userId }]);
  const blocks = calls.find(({ name }) => name === "blocks").filter;
  assert.deepEqual(blocks.$or, [{ blocker: userId }, { blocked: userId }]);
  const conversations = calls.find(({ name }) => name === "conversations").filter;
  assert.ok(conversations.$or.some((entry) => entry.participants === userId));
  assert.ok(conversations.$or.some((entry) => entry["messages.sender"] === userId));
  assert.ok(conversations.$or.some((entry) => entry.match?.$in?.[0] === matchId));
  assert.deepEqual(
    calls.find(({ name }) => name === "emailOtp").filter,
    { email: "delete.me@example.com" },
  );
}

async function verifyCancellationFailurePreservesAccount() {
  let transactionStarted = false;
  const userId = new mongoose.Types.ObjectId();
  const service = createAccountDeletionService({
    mongooseInstance: {
      async startSession() {
        transactionStarted = true;
        throw new Error("must not start");
      },
    },
    UserModel: {
      async findById() {
        return { _id: userId, subscriptionStatus: "active" };
      },
    },
    async cancelStoredSubscription() {
      throw new Error("PayPal cancellation failed");
    },
  });

  await assert.rejects(
    service.deleteUserAccount({ _id: userId }),
    /PayPal cancellation failed/,
  );
  assert.equal(transactionStarted, false);
}

async function verifyPayPalDeletionCancellation() {
  const cancellationCalls = [];
  const activeOperations = createSubscriptionOperations({
    async requestAccessToken() { return { accessToken: "sandbox-token" }; },
    async getSubscription() { return { id: "I-SERVER", status: "ACTIVE" }; },
    async cancelSubscription(token, id) {
      cancellationCalls.push({ token, id });
    },
  });
  await activeOperations.cancelForAccountDeletion({
    paypalSubscriptionId: "I-SERVER",
    subscriptionStatus: "active",
  });
  assert.deepEqual(cancellationCalls, [
    { token: "sandbox-token", id: "I-SERVER" },
  ]);

  let terminalNetworkCall = false;
  const terminalOperations = createSubscriptionOperations({
    async requestAccessToken() {
      terminalNetworkCall = true;
      return { accessToken: "sandbox-token" };
    },
    async getSubscription() { return { id: "I-TERMINAL", status: "CANCELLED" }; },
    async cancelSubscription() { throw new Error("not expected"); },
  });
  await terminalOperations.cancelForAccountDeletion({
    paypalSubscriptionId: "I-TERMINAL",
    subscriptionStatus: "cancelled",
  });
  assert.equal(terminalNetworkCall, true);

  let pendingCancellationAttempted = false;
  const pendingOperations = createSubscriptionOperations({
    async requestAccessToken() { return { accessToken: "sandbox-token" }; },
    async getSubscription() {
      return { id: "I-PENDING", status: "APPROVAL_PENDING" };
    },
    async cancelSubscription() {
      pendingCancellationAttempted = true;
      throw new Error("PayPal must not be asked to cancel pending approval");
    },
  });
  assert.deepEqual(
    await pendingOperations.cancelForAccountDeletion({
      paypalSubscriptionId: "I-PENDING",
      subscriptionStatus: "approval_pending",
    }),
    { cancelled: false, terminal: true },
  );
  assert.equal(pendingCancellationAttempted, false);

  assert.deepEqual(
    await pendingOperations.cancelForAccountDeletion({
      subscriptionStatus: "approval_pending",
    }),
    { cancelled: false, terminal: true },
  );

  await assert.rejects(
    terminalOperations.cancelForAccountDeletion({
      subscriptionStatus: "active",
    }),
    (error) => error?.code === "SUBSCRIPTION_ID_MISSING",
  );

  let reads = 0;
  const failedOperations = createSubscriptionOperations({
    async requestAccessToken() { return { accessToken: "sandbox-token" }; },
    async getSubscription() {
      reads += 1;
      return { id: "I-ACTIVE", status: "ACTIVE" };
    },
    async cancelSubscription() { throw new Error("cancel failed"); },
  });
  await assert.rejects(
    failedOperations.cancelForAccountDeletion({
      paypalSubscriptionId: "I-ACTIVE",
      subscriptionStatus: "active",
    }),
    /cancel failed/,
  );
  assert.equal(reads, 2);
}

function verifyEndpointSecurity() {
  const routes = read("routes/userRoutes.js");
  const controller = read("controllers/userController.js");
  const service = read("services/accountDeletionService.js");
  assert.match(routes, /router\.use\(protect\)[\s\S]*router\.delete\("\/me", deleteCurrentUser\)/);
  assert.match(routes, /router\.delete\("\/:id", rejectLegacyMutation\)/);
  assert.match(controller, /deleteUserAccount\(req\.user\)/);
  assert.doesNotMatch(controller, /deleteUserAccount\(req\.(?:body|params|query)/);
  assert.match(controller, /json\(\{ success: true \}\)/);
  assert.match(service, /TRANSACTION_CAPABLE_TOPOLOGIES/);
  assert.match(service, /topology\?\.description\?\.type/);
  assert.doesNotMatch(service, /\.admin\(\)\s*\.command/);
}

async function verifyUnauthenticatedRequestRejected() {
  const app = express();
  app.use(express.json());
  app.use("/api/users", userRoutes);
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/users/me`, {
      method: "DELETE",
    });
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function main() {
  verifyEndpointSecurity();
  await verifyUnauthenticatedRequestRejected();
  await verifyCompleteCleanup();
  await verifyCancellationFailurePreservesAccount();
  await verifyPayPalDeletionCancellation();
  console.log("Account deletion flow verification: PASS");
}

main().catch((error) => {
  console.error("Account deletion flow verification: FAIL");
  console.error(error);
  process.exitCode = 1;
});
