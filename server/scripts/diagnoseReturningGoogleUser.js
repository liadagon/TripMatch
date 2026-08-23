const path = require("node:path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const Conversation = require("../models/Conversation");
const Match = require("../models/Match");
const Swipe = require("../models/Swipe");
const User = require("../models/User");
const {
  getRegistrationState,
  hasCompletedQuestionnaire,
  hasLegacyRegistrationCompletion,
  hasRequiredPhoto,
  hasTripDestination,
} = require("../utils/onboarding");
const { getAppOwnedPhotoUrls } = require("../utils/profilePhotos");

const QUESTIONNAIRE_PERSISTENCE_RELEASED_AT = new Date(
  "2026-08-18T19:11:41.000Z",
);

const hasText = (value) =>
  typeof value === "string" && value.trim().length > 0;

async function getLiveAuthMeState(user) {
  if (!process.env.JWT_SECRET) return { reachable: false, reason: "JWT secret missing" };
  const port = process.env.PORT || 5000;
  const token = jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET, {
    expiresIn: "2m",
  });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();
    const data = body?.data || {};
    return {
      reachable: true,
      status: response.status,
      authenticated: body?.authenticated ?? null,
      registrationComplete:
        body?.registrationComplete ?? data.registrationComplete ?? null,
      registrationInProgress:
        body?.registrationInProgress ?? data.registrationInProgress ?? null,
      nextRegistrationStep:
        body?.nextRegistrationStep ?? data.nextRegistrationStep ?? null,
      registrationCompletedAtPresent: Boolean(data.registrationCompletedAt),
      registrationFlowVersionExposed: data.registrationFlowVersion ?? null,
      appPhotoCount: getAppOwnedPhotoUrls(data).length,
      hasAppOwnedPhoto: getAppOwnedPhotoUrls(data).length > 0,
      questionnaireComplete: hasCompletedQuestionnaire(data),
      destinationComplete: hasTripDestination(data),
    };
  } catch (error) {
    return { reachable: false, reason: error.cause?.code || error.code || error.name };
  }
}

function classifyAppPhoto(value) {
  if (typeof value !== "string") return null;
  const pathname = new URL(value, "https://tripmatch.invalid").pathname;
  if (/^\/api\/file\/[a-f\d]{24}$/i.test(pathname)) return "/api/file/{id}";
  if (pathname.startsWith("/public/")) return "/public/...";
  return null;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  await mongoose.connect(process.env.DATABASE_URL);
  try {
    const users = await User.find({ authProvider: "google" }).select(
      "photo photoURL photos preferredDestinations tripDates budget travelStyle questionnaire tripLocation location bio age registrationCompletedAt registrationFlowVersion createdAt",
    );
    const candidates = users.filter((user) => hasRequiredPhoto(user));
    const safeResults = [];

    for (const [index, user] of candidates.entries()) {
      const [swipes, matches, conversations] = await Promise.all([
        Swipe.countDocuments({
          $or: [{ fromUser: user._id }, { toUser: user._id }],
        }),
        Match.countDocuments({ users: user._id }),
        Conversation.countDocuments({ participants: user._id }),
      ]);
      const rawUser = await User.collection.findOne(
        { _id: user._id },
        {
          projection: {
            questionnaire: 1,
            tripLocation: 1,
            preferredDestinations: 1,
            tripDates: 1,
            budget: 1,
            travelStyle: 1,
          },
        },
      );
      const state = getRegistrationState(user);
      const appPhotos = getAppOwnedPhotoUrls(user);
      const liveAuthMeState = await getLiveAuthMeState(user);

      safeResults.push({
        candidate: index + 1,
        authMeState: {
          authenticated: true,
          registrationComplete: state.registrationComplete,
          registrationInProgress: state.registrationInProgress,
          nextRegistrationStep: state.nextRegistrationStep,
          registrationCompletedAtPresent: Boolean(user.registrationCompletedAt),
          registrationFlowVersion: user.registrationFlowVersion ?? null,
          appPhotoCount: appPhotos.length,
          hasAppOwnedPhoto: appPhotos.length > 0,
          questionnaireComplete: hasCompletedQuestionnaire(user),
          destinationComplete: hasTripDestination(user),
        },
        liveAuthMeState,
        photoFormats: [...new Set(appPhotos.map(classifyAppPhoto).filter(Boolean))],
        questionnaire: {
          storedKeys: Object.keys(rawUser?.questionnaire || {}).sort(),
          currentFieldsWithValues: Object.fromEntries(
            [
              "planningStyle",
              "accommodationPreference",
              "companionScope",
              "companionPriority",
              "dealBreaker",
            ].map((field) => [field, hasText(rawUser?.questionnaire?.[field])]),
          ),
          preferredDestinationsPresent:
            Array.isArray(rawUser?.preferredDestinations) &&
            rawUser.preferredDestinations.some(hasText),
          tripDatesPresent: hasText(rawUser?.tripDates),
          budgetPresent: hasText(rawUser?.budget),
          travelStylePresent: hasText(rawUser?.travelStyle),
        },
        destinationProfile: {
          tripLocationStoredKeys: Object.keys(rawUser?.tripLocation || {}).sort(),
          legacyLocationPresent: hasText(user.location),
          bioPresent: hasText(user.bio),
          agePresent: Number.isFinite(user.age),
        },
        legacyEvidence: {
          currentLegacyRuleMatches: hasLegacyRegistrationCompletion(user),
          createdBeforeQuestionnairePersistence:
            user.createdAt < QUESTIONNAIRE_PERSISTENCE_RELEASED_AT,
          hasPriorApplicationActivity: swipes + matches + conversations > 0,
          swipeCount: swipes,
          matchCount: matches,
          conversationCount: conversations,
        },
      });
    }

    console.log(
      "Returning Google user diagnostic (anonymous safe fields only)",
      JSON.stringify({ candidateCount: safeResults.length, candidates: safeResults }, null, 2),
    );
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
