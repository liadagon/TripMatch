const assert = require("node:assert/strict");
const path = require("node:path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");

async function run() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  await mongoose.connect(process.env.DATABASE_URL);

  try {
    const indexes = await User.collection.indexes();
    const emailIndex = indexes.find((index) => index.key?.email === 1);
    const firebaseUidIndex = indexes.find(
      (index) => index.key?.firebaseUid === 1,
    );

    assert(emailIndex, "User email index is missing");
    assert.equal(emailIndex.unique, true, "User email index must be unique");
    assert(firebaseUidIndex, "User Firebase UID index is missing");
    assert.equal(
      firebaseUidIndex.unique,
      true,
      "User Firebase UID index must be unique",
    );
    assert.equal(
      firebaseUidIndex.sparse,
      true,
      "User Firebase UID index must remain sparse",
    );

    console.log("Onboarding MongoDB index verification passed", {
      emailUnique: true,
      firebaseUidUniqueSparse: true,
      indexCount: indexes.length,
    });
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
