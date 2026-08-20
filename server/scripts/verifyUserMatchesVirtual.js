const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");
const Match = require("../models/Match");

const verifyUserMatchesVirtual = async () => {
  const virtual = User.schema.virtuals.matches;

  assert(virtual, "User.matches virtual is missing");
  assert.equal(virtual.options.ref, "Match");
  assert.equal(virtual.options.localField, "_id");
  assert.equal(virtual.options.foreignField, "users");

  const [existingMatch, matchedUserIds] = await Promise.all([
    Match.findOne().select("_id users").lean(),
    Match.distinct("users"),
  ]);
  const unmatchedUsers = await User.find({
    _id: { $nin: matchedUserIds },
  })
    .select("_id")
    .limit(3)
    .lean();

  const pairKey = `virtual-populate-verification:${randomUUID()}`;
  let temporaryMatch;
  let verificationResult;

  try {
    let expectedMatchId;
    let userWithMatchId;
    let userWithoutMatchId;

    if (existingMatch) {
      assert(
        unmatchedUsers[0],
        "Verification requires one user without existing Matches"
      );
      expectedMatchId = existingMatch._id;
      userWithMatchId = existingMatch.users[0];
      userWithoutMatchId = unmatchedUsers[0]._id;
    } else {
      assert.equal(
        unmatchedUsers.length,
        3,
        "Verification requires three users when no Match exists"
      );
      temporaryMatch = await Match.create({
        users: [unmatchedUsers[0]._id, unmatchedUsers[1]._id],
        pairKey,
      });
      expectedMatchId = temporaryMatch._id;
      userWithMatchId = unmatchedUsers[0]._id;
      userWithoutMatchId = unmatchedUsers[2]._id;
    }

    const [userWithMatch, userWithoutMatch] = await Promise.all([
      User.findById(userWithMatchId)
        .select("name")
        .populate({
          path: "matches",
          select: "_id users createdAt updatedAt",
        }),
      User.findById(userWithoutMatchId)
        .select("name")
        .populate({
          path: "matches",
          select: "_id users createdAt updatedAt",
        }),
    ]);

    assert(userWithMatch);
    assert(userWithoutMatch);
    const populatedMatchIds = userWithMatch.matches.map((match) =>
      String(match._id)
    );
    assert.equal(
      populatedMatchIds.filter((matchId) => matchId === String(expectedMatchId))
        .length,
      1
    );
    assert.equal(new Set(populatedMatchIds).size, populatedMatchIds.length);
    assert.deepEqual(userWithoutMatch.matches, []);

    const serializedUser = userWithMatch.toJSON();
    for (const privateField of [
      "matches",
      "password",
      "email",
      "authProvider",
      "firebaseUid",
      "questionnaire",
    ]) {
      assert.equal(privateField in serializedUser, false);
    }

    verificationResult = {
      populatedMatches: userWithMatch.matches.length,
      unmatchedUserMatches: userWithoutMatch.matches.length,
      duplicateMatches: false,
    };
  } finally {
    if (temporaryMatch) {
      const cleanup = await Match.deleteOne({
        _id: temporaryMatch._id,
        pairKey,
      });
      assert.equal(cleanup.deletedCount, 1);
    }
  }

  assert.equal(await Match.countDocuments({ pairKey }), 0);
  console.log("User.matches virtual populate verification passed", {
    ...verificationResult,
    temporaryMatchRemoved: Boolean(temporaryMatch),
  });
};

const run = async () => {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  await mongoose.connect(process.env.DATABASE_URL);
  await verifyUserMatchesVirtual();
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
