const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");
const Swipe = require("../models/Swipe");
const Match = require("../models/Match");
const Conversation = require("../models/Conversation");
const { createSwipe, getReceivedLikes } = require("../controllers/swipeController");
const { getConversationWithUser, getMessages, sendMessage } = require("../controllers/conversationController");
const { getUsers } = require("../controllers/userController");

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function invoke(handler, request) {
  const res = response();
  let failure;
  await handler(request, res, (error) => { failure = error; });
  if (failure) throw failure;
  return res;
}

async function run() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is not configured");
  await mongoose.connect(process.env.DATABASE_URL);
  const marker = `${Date.now()}-${crypto.randomUUID()}`;
  const users = [];

  try {
    for (const [index, name] of ["Real Matching A", "Real Matching B"].entries()) {
      users.push(await User.create({
        name,
        email: `${name.endsWith("A") ? "a" : "b"}-${marker}@example.com`,
        authProvider: "email",
        emailVerified: true,
        registrationFlowVersion: 2,
        registrationCompletedAt: new Date(),
        age: 27 + index,
        photoURL: `http://localhost:5000/api/file/64b0000000000000000000${index + 10}`,
        photos: [`http://localhost:5000/api/file/64b0000000000000000000${index + 10}`],
        bio: `Persisted real profile ${index + 1} for reciprocal matching verification`,
        tripLocation: {
          placeId: index ? "51111e0ec6b67a40598cb3aaadf07140" : "51f0d7c7f0e3c74059c9b1b86f826640",
          name: index ? "Rome, Italy" : "Bangkok, Thailand",
          formattedAddress: index ? "Rome, Lazio, Italy" : "Bangkok, Thailand",
          latitude: index ? 41.9028 : 13.7563,
          longitude: index ? 12.4964 : 100.5018,
          city: index ? "Rome" : "Bangkok",
          country: index ? "Italy" : "Thailand",
          countryCode: index ? "it" : "th",
        },
        preferredDestinations: [index ? "אירופה" : "תאילנד וויאטנם"],
        tripDates: index ? "בעוד חצי שנה" : "בתחילת הקיץ",
        tripDuration: index ? "שבוע עד שבועיים" : "יותר מחודש",
        budget: index ? "בינוני" : "חסכוני",
        travelStyle: index ? "סיורים תרבותיים וערים" : "תרמילאות ואורח חיים מקומי",
        interests: index ? ["תרבות", "אוכל מקומי"] : ["טבע", "טרקים"],
        questionnaire: {
          accommodationPreference: index ? "בית מלון סביר" : "הוסטל",
          companionScope: index ? "רק לחלק מהמסלול" : "לכל הטיול",
          companionPriority: index ? "אמינות ואחריות" : "גמישות ורוח טובה",
          dealBreaker: index ? "לוח זמנים לא מסונכרן" : "חוסר כבוד לגבולות",
        },
      }));
    }
    const [userA, userB] = users;

    const discoverForA = await invoke(getUsers, { user: userA, query: { page: 1, limit: 10 } });
    const visibleB = discoverForA.body.data.find((profile) => String(profile._id) === String(userB._id));
    assert(visibleB);
    assert.equal(visibleB.tripLocation.city, "Rome");
    assert.equal(visibleB.preferredDestinations[0], "אירופה");
    assert.equal(visibleB.questionnaire.accommodationPreference, "בית מלון סביר");
    assert.equal(visibleB.tripLocation.latitude, undefined);

    const firstLike = await invoke(createSwipe, { user: userA, body: { toUser: String(userB._id), action: "like" } });
    assert.equal(firstLike.body.isMatch, false);
    assert.equal(await Match.countDocuments({ users: { $all: [userA._id, userB._id] } }), 0);
    assert.equal(await Conversation.countDocuments({ participants: { $all: [userA._id, userB._id] } }), 0);

    const beforeMatchChat = await invoke(getConversationWithUser, { user: userA, params: { userId: String(userB._id) } });
    assert.equal(beforeMatchChat.statusCode, 404);

    const receivedLike = await invoke(getReceivedLikes, { user: userB });
    assert.equal(receivedLike.body.locked, true);
    assert.equal(receivedLike.body.count, 1);
    assert.equal(JSON.stringify(receivedLike.body).includes(String(userA._id)), false);

    const reciprocalLike = await invoke(createSwipe, { user: userB, body: { toUser: String(userA._id), action: "like" } });
    assert.equal(reciprocalLike.body.isMatch, true);
    const match = await Match.findOne({ users: { $all: [userA._id, userB._id] } });
    assert(match);
    const conversation = await Conversation.findOne({ match: match._id });
    assert(conversation);

    const chatForA = await invoke(getConversationWithUser, { user: userA, params: { userId: String(userB._id) } });
    const chatForB = await invoke(getConversationWithUser, { user: userB, params: { userId: String(userA._id) } });
    assert.equal(String(chatForA.body.data._id), String(conversation._id));
    assert.equal(String(chatForB.body.data._id), String(conversation._id));

    await invoke(sendMessage, { user: userA, params: { conversationId: String(conversation._id) }, body: { text: "Message from A" } });
    await invoke(sendMessage, { user: userB, params: { conversationId: String(conversation._id) }, body: { text: "Reply from B" } });
    const persistedForA = await invoke(getMessages, { user: userA, params: { conversationId: String(conversation._id) } });
    const persistedForB = await invoke(getMessages, { user: userB, params: { conversationId: String(conversation._id) } });
    assert.deepEqual(persistedForA.body.data.messages.map((message) => message.text), ["Message from A", "Reply from B"]);
    assert.deepEqual(persistedForB.body.data.messages.map((message) => message.text), ["Message from A", "Reply from B"]);

    console.log("Real reciprocal matching MongoDB verification: PASS", {
      oneSidedLikeHasNoMatch: true,
      chatBeforeMatchDenied: true,
      freeReceivedLikeIdentityLocked: true,
      reciprocalLikeCreatesMatch: true,
      sharedConversation: true,
      messagesPersistBothDirections: true,
      eligibleRealUsersVisibleWithPersistedData: true,
    });
  } finally {
    const userIds = users.map((user) => user._id);
    const matches = await Match.find({ users: { $in: userIds } }).select("_id").lean();
    await Promise.all([
      Conversation.deleteMany({ match: { $in: matches.map((match) => match._id) } }),
      Match.deleteMany({ _id: { $in: matches.map((match) => match._id) } }),
      Swipe.deleteMany({ $or: [{ fromUser: { $in: userIds } }, { toUser: { $in: userIds } }] }),
      User.deleteMany({ _id: { $in: userIds } }),
    ]);
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
