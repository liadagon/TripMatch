const assert = require("node:assert/strict");

process.env.PAYPAL_PLAN_ID_BOOST = "P-TEST-BOOST";
process.env.PAYPAL_WEBHOOK_ID = "WH-TEST-ONLY";

const {
  createSubscriptionOperations,
  SubscriptionServiceError,
} = require("../services/subscriptionService");

const userAId = "64b00000000000000000000a";
const userBId = "64b00000000000000000000b";
const userCId = "64b00000000000000000000c";

function createUser(_id, subscriptionId) {
  return {
    _id,
    paypalSubscriptionId: subscriptionId,
    paypalPlanId: subscriptionId ? "P-TEST-BOOST" : undefined,
    subscriptionPlan: "free",
    subscriptionStatus: subscriptionId ? "approval_pending" : "none",
    saveCount: 0,
    async save() {
      this.saveCount += 1;
      return this;
    },
  };
}

const userA = createUser(userAId, "I-USER-A");
const userB = createUser(userBId, "I-USER-B");
const userC = createUser(userCId);
const users = [userA, userB, userC];
const eventClaims = new Map();
let verificationStatus = "SUCCESS";
let verificationCalls = 0;
let remoteStatus = "ACTIVE";
let getShouldFail = false;
const validHeaders = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api-m.sandbox.paypal.com/mock-cert",
  "paypal-transmission-id": "mock-transmission-id",
  "paypal-transmission-sig": "mock-signature",
  "paypal-transmission-time": "2026-08-22T12:00:00Z",
};

const UserModel = {
  async findOne(filter) {
    return users.find(
      (user) => user.paypalSubscriptionId === filter.paypalSubscriptionId,
    ) || null;
  },
  async findById(id) {
    return users.find((user) => String(user._id) === String(id)) || null;
  },
};

const EventModel = {
  async create(document) {
    if (eventClaims.has(document.eventId)) {
      const error = new Error("Duplicate webhook event");
      error.code = 11000;
      throw error;
    }
    eventClaims.set(document.eventId, { ...document });
    return document;
  },
  async updateOne(filter, update) {
    const claim = eventClaims.get(filter.eventId);
    if (claim?.status === filter.status) Object.assign(claim, update.$set);
    return { modifiedCount: claim ? 1 : 0 };
  },
  async deleteOne(filter) {
    const claim = eventClaims.get(filter.eventId);
    if (claim?.status === filter.status) eventClaims.delete(filter.eventId);
    return { deletedCount: claim ? 1 : 0 };
  },
};

const operations = createSubscriptionOperations({
  UserModel,
  EventModel,
  async requestAccessToken() {
    return { accessToken: "mock-token-never-printed" };
  },
  async verifyWebhook() {
    verificationCalls += 1;
    return { verification_status: verificationStatus };
  },
  async getSubscription(_token, subscriptionId) {
    if (getShouldFail) throw new Error("Mock synchronization failure");
    return {
      id: subscriptionId,
      plan_id: "P-TEST-BOOST",
      status: remoteStatus,
      billing_info: { next_billing_time: "2030-02-01T00:00:00Z" },
    };
  },
});

function subscriptionEvent(id, eventType, subscriptionId, customId) {
  return {
    id,
    event_type: eventType,
    resource: {
      id: subscriptionId,
      plan_id: "P-TEST-BOOST",
      ...(customId ? { custom_id: customId } : {}),
    },
  };
}

async function runEvent(id, type, status = "ACTIVE") {
  remoteStatus = status;
  return operations.handleWebhook(
    { ...validHeaders, "paypal-transmission-id": `transmission-${id}` },
    subscriptionEvent(id, type, "I-USER-A"),
  );
}

async function run() {
  const {
    PayPalConfigurationError,
    verifyPayPalWebhookSignature,
  } = require("../services/paypalService");
  assert.throws(
    () =>
      verifyPayPalWebhookSignature("mock-token", {
        headers: {},
        webhookEvent: {},
        webhookId: "WH-TEST-ONLY",
      }),
    (error) => error instanceof PayPalConfigurationError,
  );

  const configuredWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  delete process.env.PAYPAL_WEBHOOK_ID;
  await assert.rejects(
    () => runEvent("evt-no-webhook-id", "BILLING.SUBSCRIPTION.ACTIVATED"),
    (error) =>
      error instanceof SubscriptionServiceError && error.statusCode === 503,
  );
  process.env.PAYPAL_WEBHOOK_ID = configuredWebhookId;

  verificationStatus = "FAILURE";
  await assert.rejects(
    () => runEvent("evt-unverified", "BILLING.SUBSCRIPTION.ACTIVATED"),
    (error) =>
      error instanceof SubscriptionServiceError && error.statusCode === 401,
  );
  assert.equal(eventClaims.has("evt-unverified"), false);
  assert.equal(userA.subscriptionPlan, "free");

  verificationStatus = "SUCCESS";
  const verificationCallsBeforeInvalidEvent = verificationCalls;
  await assert.rejects(
    () =>
      operations.handleWebhook(validHeaders, {
        id: "evt-invalid-metadata",
        resource: { id: "I-USER-A" },
      }),
    (error) =>
      error instanceof SubscriptionServiceError &&
      error.code === "INVALID_PAYPAL_WEBHOOK" &&
      error.statusCode === 400,
  );
  assert.equal(verificationCalls, verificationCallsBeforeInvalidEvent + 1);
  assert.equal(eventClaims.has("evt-invalid-metadata"), false);

  await runEvent("evt-active", "BILLING.SUBSCRIPTION.ACTIVATED");
  assert.equal(userA.subscriptionStatus, "active");
  assert.equal(userA.subscriptionPlan, "boost");
  assert.equal(userB.subscriptionPlan, "free");

  const savesAfterActivation = userA.saveCount;
  const duplicate = await runEvent(
    "evt-active",
    "BILLING.SUBSCRIPTION.ACTIVATED",
  );
  assert.equal(duplicate.duplicate, true);
  assert.equal(userA.saveCount, savesAfterActivation);

  await runEvent("evt-cancelled", "BILLING.SUBSCRIPTION.CANCELLED", "CANCELLED");
  assert.equal(userA.subscriptionStatus, "cancelled");
  assert.equal(userA.subscriptionPlan, "free");

  await runEvent("evt-suspended", "BILLING.SUBSCRIPTION.SUSPENDED", "SUSPENDED");
  assert.equal(userA.subscriptionStatus, "suspended");
  assert.equal(userA.subscriptionPlan, "free");

  await runEvent("evt-expired", "BILLING.SUBSCRIPTION.EXPIRED", "EXPIRED");
  assert.equal(userA.subscriptionStatus, "expired");
  assert.equal(userA.subscriptionPlan, "free");

  await runEvent(
    "evt-payment-failed",
    "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  );
  assert.equal(userA.subscriptionStatus, "payment_failed");
  assert.equal(userA.subscriptionPlan, "free");

  remoteStatus = "ACTIVE";
  await operations.handleWebhook(
    validHeaders,
    {
      id: "evt-sale-completed",
      event_type: "PAYMENT.SALE.COMPLETED",
      resource: { billing_agreement_id: "I-USER-A" },
    },
  );
  assert.equal(userA.subscriptionStatus, "active");
  assert.equal(userA.subscriptionPlan, "boost");

  const userBSaveCount = userB.saveCount;
  const unrelated = await operations.handleWebhook(
    validHeaders,
    subscriptionEvent(
      "evt-unrelated",
      "BILLING.SUBSCRIPTION.CREATED",
      "I-ATTACKER",
      userBId,
    ),
  );
  assert.equal(unrelated.ignored, true);
  assert.equal(userB.saveCount, userBSaveCount);
  assert.equal(userB.paypalSubscriptionId, "I-USER-B");

  remoteStatus = "APPROVAL_PENDING";
  await operations.handleWebhook(
    validHeaders,
    subscriptionEvent(
      "evt-created",
      "BILLING.SUBSCRIPTION.CREATED",
      "I-USER-C",
      userCId,
    ),
  );
  assert.equal(userC.paypalSubscriptionId, "I-USER-C");
  assert.equal(userC.subscriptionStatus, "approval_pending");
  assert.equal(userC.subscriptionPlan, "free");

  getShouldFail = true;
  await assert.rejects(() =>
    operations.handleWebhook(
      validHeaders,
      subscriptionEvent(
        "evt-retryable-failure",
        "BILLING.SUBSCRIPTION.UPDATED",
        "I-USER-A",
      ),
    ),
  );
  assert.equal(eventClaims.has("evt-retryable-failure"), false);
  getShouldFail = false;

  console.log("PayPal webhook flow verification passed", {
    unverifiedRejected: true,
    activatedCorrectUser: true,
    cancelledRevokes: true,
    suspendedRevokes: true,
    expiredRevokes: true,
    paymentFailedDoesNotActivate: true,
    completedSaleRequiresMatchingSubscription: true,
    duplicateIdempotent: true,
    unrelatedUserProtected: true,
    createdEventLinksByServerCustomId: true,
    failedProcessingRemainsRetryable: true,
    missingSignatureHeadersRejected: true,
    missingWebhookIdFailsClosed: true,
    signedEventJoiValidatedAfterSignature: true,
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
