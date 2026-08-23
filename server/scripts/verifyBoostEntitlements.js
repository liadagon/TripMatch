const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.PAYPAL_PLAN_ID_BOOST = "P-TEST-BOOST";

const blockRelationshipPath = require.resolve("../utils/blockRelationship");
const getBlockStatus = async () => ({ blocked: false });
getBlockStatus.getBlockedUserIds = async () => [];
require.cache[blockRelationshipPath] = {
  id: blockRelationshipPath,
  filename: blockRelationshipPath,
  loaded: true,
  exports: getBlockStatus,
};

const Swipe = require("../models/Swipe");
const User = require("../models/User");
const Match = require("../models/Match");
const Conversation = require("../models/Conversation");
const { Types } = require("mongoose");
const {
  createSwipe,
  getReceivedLikes,
} = require("../controllers/swipeController");
const PUBLIC_PROFILE_FIELDS = require("../utils/publicProfile");
const { hasBoostAccess } = require("../utils/subscriptionEntitlement");
const {
  BOOST_RANKING_BONUS,
  compareDiscoverCandidates,
  getDiscoverRankingScore,
} = require("../utils/discoverRanking");

const originalSwipeDistinct = Swipe.distinct;
const originalFind = Swipe.find;
const originalSwipeExists = Swipe.exists;
const originalSwipeFindOneAndUpdate = Swipe.findOneAndUpdate;
const originalUserExists = User.exists;
const originalUserCountDocuments = User.countDocuments;
const originalMatchFindOneAndUpdate = Match.findOneAndUpdate;
const originalConversationFindOneAndUpdate = Conversation.findOneAndUpdate;
let findCalls = 0;
let distinctCalls = 0;

function createUser(status, overrides = {}) {
  return {
    _id: "64b000000000000000000001",
    subscriptionPlan: status === "active" ? "boost" : "free",
    subscriptionStatus: status,
    paypalSubscriptionId: "I-TEST",
    paypalPlanId: "P-TEST-BOOST",
    ...overrides,
  };
}

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

async function invokeReceivedLikes(user) {
  const response = createResponse();
  let nextError;
  await getReceivedLikes({ user }, response, (error) => {
    nextError = error;
  });
  if (nextError) throw nextError;
  return response;
}

async function invokeCreateSwipe(user, toUser) {
  const response = createResponse();
  let nextError;
  await createSwipe(
    { user, body: { toUser: String(toUser), action: "like" } },
    response,
    (error) => {
      nextError = error;
    },
  );
  if (nextError) throw nextError;
  return response;
}

async function run() {
  Swipe.distinct = async (field) => {
    distinctCalls += 1;
    assert.equal(field, "fromUser");
    return ["liker-one", "liker-two"];
  };
  User.countDocuments = async () => 2;
  Swipe.find = () => {
    findCalls += 1;
    return {
      sort() {
        return this;
      },
      async populate(_path, fields) {
        assert.equal(fields, PUBLIC_PROFILE_FIELDS);
        return [
          {
            _id: "like-one",
            fromUser: {
              _id: "64b000000000000000000000099",
              name: "Boost-visible traveler",
              photoURL: "https://example.com/profile.jpg",
            },
            createdAt: new Date("2026-01-01T00:00:00Z"),
            updatedAt: new Date("2026-01-01T00:00:00Z"),
          },
        ];
      },
    };
  };

  for (const status of ["none", "cancelled", "suspended", "expired"]) {
    const response = await invokeReceivedLikes(createUser(status));
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      locked: true,
      count: 2,
    });
    assert.equal(JSON.stringify(response.body).includes("Boost-visible"), false);
    assert.equal(JSON.stringify(response.body).includes("profile.jpg"), false);
    assert.equal(JSON.stringify(response.body).includes("64b000"), false);
  }

  const wrongPlan = await invokeReceivedLikes(
    createUser("active", { paypalPlanId: "P-OTHER-PLAN" }),
  );
  assert.equal(wrongPlan.body.locked, true);
  assert.equal(findCalls, 0);

  const activeResponse = await invokeReceivedLikes(createUser("active"));
  assert.equal(activeResponse.body.locked, false);
  assert.equal(activeResponse.body.count, 1);
  assert.equal(activeResponse.body.data[0].fromUser.name, "Boost-visible traveler");
  assert.equal(findCalls, 1);
  assert.equal(distinctCalls, 5);

  assert.equal(hasBoostAccess(createUser("active")), true);
  assert.equal(hasBoostAccess(createUser("cancelled")), false);
  assert.equal(
    getDiscoverRankingScore(70, true),
    70 + BOOST_RANKING_BONUS,
  );

  const moderatelyBoosted = {
    id: "boost",
    compatibilityPercentage: 70,
    rankingScore: getDiscoverRankingScore(70, true),
    textScore: 1,
  };
  const closeFreeCandidate = {
    id: "free-close",
    compatibilityPercentage: 75,
    rankingScore: getDiscoverRankingScore(75, false),
    textScore: 1,
  };
  const clearlyMoreRelevantFreeCandidate = {
    id: "free-relevant",
    compatibilityPercentage: 90,
    rankingScore: getDiscoverRankingScore(90, false),
    textScore: 1,
  };
  assert.deepEqual(
    [closeFreeCandidate, moderatelyBoosted]
      .sort((left, right) => compareDiscoverCandidates(left, right))
      .map((candidate) => candidate.id),
    ["boost", "free-close"],
  );
  assert.deepEqual(
    [moderatelyBoosted, clearlyMoreRelevantFreeCandidate]
      .sort((left, right) => compareDiscoverCandidates(left, right))
      .map((candidate) => candidate.id),
    ["free-relevant", "boost"],
  );
  assert.deepEqual(
    [
      { ...moderatelyBoosted, textScore: 1 },
      { ...closeFreeCandidate, textScore: 2 },
    ]
      .sort((left, right) => compareDiscoverCandidates(left, right, true))
      .map((candidate) => candidate.id),
    ["free-close", "boost"],
  );

  const boostUserId = new Types.ObjectId();
  const targetUserId = new Types.ObjectId();
  const boostUser = createUser("active", { _id: boostUserId });
  let matchCreationCalls = 0;
  User.exists = async () => true;
  Swipe.findOneAndUpdate = async () => ({
    _id: "swipe-test",
    fromUser: boostUserId,
    toUser: targetUserId,
    action: "like",
  });
  Match.findOneAndUpdate = async () => {
    matchCreationCalls += 1;
    return {
      _id: "match-test",
      users: [boostUserId, targetUserId],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };
  Conversation.findOneAndUpdate = async () => ({ _id: "conversation-test" });

  Swipe.exists = async () => null;
  const oneSidedLike = await invokeCreateSwipe(boostUser, targetUserId);
  assert.equal(oneSidedLike.body.isMatch, false);
  assert.equal(oneSidedLike.body.match, null);
  assert.equal(matchCreationCalls, 0);

  Swipe.exists = async () => ({ _id: "reciprocal-like" });
  const reciprocalLike = await invokeCreateSwipe(boostUser, targetUserId);
  assert.equal(reciprocalLike.body.isMatch, true);
  assert.equal(matchCreationCalls, 1);

  assert.doesNotMatch(PUBLIC_PROFILE_FIELDS, /subscription|paypal/i);
  const userControllerSource = fs.readFileSync(
    path.resolve(__dirname, "..", "controllers", "userController.js"),
    "utf8",
  );
  const swipeControllerSource = fs.readFileSync(
    path.resolve(__dirname, "..", "controllers", "swipeController.js"),
    "utf8",
  );
  assert.match(userControllerSource, /delete profile\.subscriptionPlan/);
  assert.match(userControllerSource, /delete profile\.paypalSubscriptionId/);
  assert.match(swipeControllerSource, /if \(reciprocalLike\)/);

  console.log("Boost entitlement verification passed", {
    freeIdentityLockedAtBackend: true,
    lockedCountCorrect: true,
    lockedResponseHasNoIdentity: true,
    activeConfiguredPlanCanSeeLikes: true,
    cancelledSuspendedExpiredRemainFree: true,
    moderateDiscoverBonus: BOOST_RANKING_BONUS,
    strongerRelevanceStillWins: true,
    textSearchRelevanceStillWins: true,
    matchingStillRequiresReciprocalLike: true,
    publicProfilesExcludeSubscriptionState: true,
  });
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    Swipe.distinct = originalSwipeDistinct;
    Swipe.find = originalFind;
    Swipe.exists = originalSwipeExists;
    Swipe.findOneAndUpdate = originalSwipeFindOneAndUpdate;
    User.exists = originalUserExists;
    User.countDocuments = originalUserCountDocuments;
    Match.findOneAndUpdate = originalMatchFindOneAndUpdate;
    Conversation.findOneAndUpdate = originalConversationFindOneAndUpdate;
  });
