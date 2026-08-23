const path = require("node:path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const User = require("../models/User");

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const questionnaireFields = [
  "planningStyle",
  "accommodationPreference",
  "companionScope",
  "companionPriority",
  "dealBreaker",
];

function classifyPhotoUrl(value) {
  if (!hasText(value)) return "empty";
  let pathname = value.trim();
  let hostname = "";
  try {
    const parsed = new URL(pathname, "https://tripmatch.invalid");
    pathname = parsed.pathname;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return "ambiguous";
  }
  if (/^\/api\/file\/[a-f\d]{24}$/i.test(pathname) || pathname.startsWith("/public/")) {
    return "app-owned";
  }
  if (hostname.endsWith("googleusercontent.com") || hostname.endsWith("ggpht.com")) {
    return "known-google-provider";
  }
  return "ambiguous-external";
}

async function run() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  await mongoose.connect(process.env.DATABASE_URL);
  try {
    const users = await User.find({}).select(
      "authProvider photo photoURL photos preferredDestinations tripDates budget travelStyle questionnaire tripLocation location registrationCompletedAt registrationFlowVersion",
    ).lean();
    const report = {
      totalUsers: users.length,
      providers: {},
      photoUrls: {
        empty: 0,
        appOwned: 0,
        knownGoogleProvider: 0,
        ambiguousExternal: 0,
      },
      completionEvidence: {
        durableMarker: 0,
        completeHistoricalQuestionnaire: 0,
        currentFullShape: 0,
        incomplete: 0,
      },
    };

    for (const user of users) {
      report.providers[user.authProvider] = (report.providers[user.authProvider] || 0) + 1;
      const photoUrls = [user.photoURL, user.photo, ...(user.photos || [])];
      const classifications = new Set(photoUrls.map(classifyPhotoUrl));
      if (classifications.has("app-owned")) report.photoUrls.appOwned += 1;
      else if (classifications.has("known-google-provider")) report.photoUrls.knownGoogleProvider += 1;
      else if (classifications.has("ambiguous-external")) report.photoUrls.ambiguousExternal += 1;
      else report.photoUrls.empty += 1;

      const completeQuestionnaire =
        Array.isArray(user.preferredDestinations) &&
        user.preferredDestinations.some(hasText) &&
        hasText(user.tripDates) &&
        hasText(user.budget) &&
        hasText(user.travelStyle) &&
        questionnaireFields.every((field) => hasText(user.questionnaire?.[field]));
      const currentFullShape =
        classifications.has("app-owned") &&
        completeQuestionnaire &&
        Boolean(user.tripLocation?.country && (user.tripLocation?.name || user.tripLocation?.city));

      if (user.registrationCompletedAt) report.completionEvidence.durableMarker += 1;
      else if (currentFullShape) report.completionEvidence.currentFullShape += 1;
      else if (completeQuestionnaire) report.completionEvidence.completeHistoricalQuestionnaire += 1;
      else report.completionEvidence.incomplete += 1;
    }

    console.log("Registration-state audit (aggregate only)", report);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
