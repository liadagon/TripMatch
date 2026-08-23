const assert = require("node:assert/strict");
const express = require("express");

process.env.PAYPAL_PLAN_ID_BOOST = "P-TEST-BOOST";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_SECRET = "tripmatch-subscription-verification-secret";

const {
  createSubscriptionOperations,
  getSafeSubscriptionState,
} = require("../services/subscriptionService");
const {
  createSubscriptionHandlers,
} = require("../controllers/subscriptionController");
const { hasBoostAccess } = require("../utils/subscriptionEntitlement");

const userId = "64b000000000000000000001";
let createCalls = 0;
let cancelCalls = 0;
let getStatus = "APPROVAL_PENDING";
let activeSubscriptionId = "I-SUBSCRIPTION-ONE";

function createMockUser(overrides = {}) {
  return {
    _id: userId,
    email: "subscriber@example.com",
    subscriptionPlan: "free",
    subscriptionStatus: "none",
    saveCount: 0,
    async save() {
      this.saveCount += 1;
      return this;
    },
    ...overrides,
  };
}

function buildPayPalSubscription(status = getStatus, id = activeSubscriptionId) {
  return {
    id,
    plan_id: "P-TEST-BOOST",
    status,
    billing_info: {
      next_billing_time: "2030-01-01T00:00:00Z",
    },
    links: [
      {
        rel: "approve",
        href: `https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=${id}`,
      },
    ],
  };
}

const operations = createSubscriptionOperations({
  async requestAccessToken() {
    return { accessToken: "mock-token-never-printed" };
  },
  async createSubscription(_token, payload, requestId) {
    createCalls += 1;
    assert.equal(payload.plan_id, "P-TEST-BOOST");
    assert.equal(payload.custom_id, userId);
    assert.equal(payload.application_context.user_action, "SUBSCRIBE_NOW");
    assert.equal(
      payload.application_context.return_url,
      "http://localhost:5173/boost/return",
    );
    assert.equal(
      payload.application_context.cancel_url,
      "http://localhost:5173/likes?paypal=cancel",
    );
    assert.match(requestId, /^[0-9a-f-]{36}$/);
    return buildPayPalSubscription("APPROVAL_PENDING");
  },
  async getSubscription(_token, subscriptionId) {
    assert.equal(subscriptionId, activeSubscriptionId);
    return buildPayPalSubscription();
  },
  async cancelSubscription(_token, subscriptionId, reason) {
    cancelCalls += 1;
    assert.equal(subscriptionId, activeSubscriptionId);
    assert.match(reason, /authenticated TripMatch user/);
    getStatus = "CANCELLED";
  },
});

function createResponse() {
  return {
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
}

async function invoke(handler, request) {
  const response = createResponse();
  let nextError;
  await handler(request, response, (error) => {
    nextError = error;
  });
  if (nextError) throw nextError;
  return response;
}

async function verifyUnauthenticatedRoute() {
  const app = require("../app");
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/subscriptions/paypal`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function run() {
  await verifyUnauthenticatedRoute();

  const user = createMockUser();
  const created = await operations.createForUser(user);
  assert.equal(created.reused, false);
  assert.equal(created.subscriptionId, activeSubscriptionId);
  assert.match(created.approvalUrl, /^https:\/\/www\.sandbox\.paypal\.com\//);
  assert.equal(user.subscriptionStatus, "approval_pending");
  assert.equal(user.subscriptionPlan, "free");
  assert.equal(hasBoostAccess(user), false);
  assert.equal(createCalls, 1);

  const duplicate = await operations.createForUser(user);
  assert.equal(duplicate.reused, true);
  assert.equal(createCalls, 1);

  getStatus = "ACTIVE";
  const activeState = await operations.refreshForUser(user);
  assert.equal(activeState.active, true);
  assert.equal(activeState.plan, "boost");
  assert.equal(user.subscriptionStatus, "active");
  assert.equal(hasBoostAccess(user), true);
  assert.deepEqual(Object.keys(activeState).sort(), [
    "active",
    "canManage",
    "currentPeriodEnd",
    "paypalSubscriptionId",
    "plan",
    "status",
  ]);

  const handlers = createSubscriptionHandlers(operations);
  const overrideResponse = await invoke(handlers.createPayPalSubscription, {
    user,
    body: { planId: "P-ATTACKER", amount: "0.01", currency: "USD" },
  });
  assert.equal(overrideResponse.statusCode, 400);
  assert.equal(createCalls, 1);

  const arbitraryCancelResponse = await invoke(
    handlers.cancelMyPayPalSubscription,
    { user, body: { subscriptionId: "I-OTHER-USER" } },
  );
  assert.equal(arbitraryCancelResponse.statusCode, 400);
  assert.equal(cancelCalls, 0);

  const cancelResponse = await invoke(handlers.cancelMyPayPalSubscription, {
    user,
    body: {},
  });
  assert.equal(cancelResponse.statusCode, 200);
  assert.equal(cancelCalls, 1);
  assert.equal(user.subscriptionStatus, "cancelled");
  assert.equal(user.subscriptionPlan, "free");
  assert.equal(hasBoostAccess(user), false);

  const legacyUser = createMockUser({
    subscriptionPlan: undefined,
    subscriptionStatus: undefined,
    paypalSubscriptionId: undefined,
    paypalPlanId: undefined,
  });
  assert.deepEqual(getSafeSubscriptionState(legacyUser), {
    plan: "free",
    status: "none",
    active: false,
    paypalSubscriptionId: null,
    currentPeriodEnd: null,
    canManage: false,
  });

  console.log("PayPal subscription flow verification passed", {
    unauthenticatedRejected: true,
    configuredPlanOnly: true,
    approvalUrlReturned: true,
    pendingPersistedWithoutEntitlement: true,
    duplicatePrevented: true,
    activeEntitlementConservative: true,
    safeStatusResponse: true,
    arbitraryCreateValuesRejected: true,
    cancellationUsesStoredSubscription: true,
    legacyUsersRemainFree: true,
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
