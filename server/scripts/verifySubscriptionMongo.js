const assert = require("node:assert/strict");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");
const ProcessedPayPalWebhookEvent = require(
  "../models/ProcessedPayPalWebhookEvent"
);

function verifySchemas() {
  const legacyUser = new User({
    name: "Legacy Subscription Test",
    email: "legacy-subscription@example.com",
    authProvider: "email",
  });
  assert.equal(legacyUser.validateSync(), undefined);
  assert.equal(legacyUser.subscriptionPlan, "free");
  assert.equal(legacyUser.subscriptionStatus, "none");
  assert.equal(legacyUser.paypalSubscriptionId, undefined);

  const invalidUser = new User({
    name: "Invalid Subscription Test",
    email: "invalid-subscription@example.com",
    authProvider: "email",
    subscriptionPlan: "premium",
    subscriptionStatus: "paid",
  });
  const validationError = invalidUser.validateSync();
  assert(validationError?.errors?.subscriptionPlan);
  assert(validationError?.errors?.subscriptionStatus);

  const paypalIndex = User.schema.indexes().find(
    ([fields]) => fields.paypalSubscriptionId === 1,
  );
  assert(paypalIndex);
  assert.equal(paypalIndex[1].unique, true);
  assert.equal(paypalIndex[1].sparse, true);

  const eventIndex = ProcessedPayPalWebhookEvent.schema.indexes().find(
    ([fields]) => fields.eventId === 1,
  );
  assert(eventIndex);
  assert.equal(eventIndex[1].unique, true);
}

async function verifyDatabaseIndexes() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required for MongoDB index verification");
  }

  const databaseName = `tripmatch_subscription_verify_${Date.now()}`;
  const connection = mongoose.createConnection(process.env.DATABASE_URL, {
    dbName: databaseName,
    serverSelectionTimeoutMS: 10_000,
  });

  try {
    await connection.asPromise();
    assert.equal(connection.name, databaseName);

    const UserTest = connection.model("User", User.schema);
    const EventTest = connection.model(
      "ProcessedPayPalWebhookEvent",
      ProcessedPayPalWebhookEvent.schema,
    );
    await Promise.all([UserTest.init(), EventTest.init()]);

    await UserTest.create([
      {
        name: "Existing User One",
        email: "existing-one@example.com",
        authProvider: "email",
      },
      {
        name: "Existing User Two",
        email: "existing-two@example.com",
        authProvider: "email",
      },
    ]);

    await UserTest.create({
      name: "PayPal Owner",
      email: "paypal-owner@example.com",
      authProvider: "email",
      paypalSubscriptionId: "I-UNIQUE-SUBSCRIPTION",
    });
    await assert.rejects(
      () =>
        UserTest.create({
          name: "PayPal Collision",
          email: "paypal-collision@example.com",
          authProvider: "email",
          paypalSubscriptionId: "I-UNIQUE-SUBSCRIPTION",
        }),
      (error) => error?.code === 11000,
    );

    await EventTest.create({
      eventId: "WH-EVENT-UNIQUE",
      eventType: "BILLING.SUBSCRIPTION.ACTIVATED",
      status: "processed",
    });
    await assert.rejects(
      () =>
        EventTest.create({
          eventId: "WH-EVENT-UNIQUE",
          eventType: "BILLING.SUBSCRIPTION.ACTIVATED",
          status: "processed",
        }),
      (error) => error?.code === 11000,
    );
  } finally {
    if (connection.readyState === 1 && connection.name === databaseName) {
      await connection.dropDatabase();
    }
    await connection.close().catch(() => {});
  }
}

async function run() {
  verifySchemas();
  await verifyDatabaseIndexes();
  console.log("Subscription MongoDB verification passed", {
    legacyUsersValid: true,
    defaultsValid: true,
    enumsValid: true,
    sparseUniqueSubscriptionId: true,
    uniqueWebhookEventId: true,
    temporaryDatabaseRemoved: true,
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
