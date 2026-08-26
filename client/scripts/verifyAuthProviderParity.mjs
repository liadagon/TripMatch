import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const readClient = (relativePath) =>
  readFile(new URL(`../src/${relativePath}`, import.meta.url), "utf8");
const readServer = (relativePath) =>
  readFile(new URL(`../../server/${relativePath}`, import.meta.url), "utf8");

const applicationComponentPaths = [
  "App.tsx",
  "Components/ProtectedRoute.tsx",
  "Components/Questionnaire.tsx",
  "Components/PhotoUpload.tsx",
  "Components/Profile.tsx",
  "Components/MyProfilePreview.tsx",
  "Components/Discover.tsx",
  "Components/Likes.tsx",
  "Components/Matches.tsx",
  "Components/Chat.tsx",
  "Components/MatchesMap.tsx",
  "Components/BlockedUsers.tsx",
  "Components/BoostReturn.tsx",
  "Components/NavigationBar.tsx",
];
const serverApplicationPaths = [
  "controllers/userController.js",
  "controllers/swipeController.js",
  "controllers/matchController.js",
  "controllers/conversationController.js",
  "controllers/blockController.js",
  "middleware/requireOnboardingComplete.js",
  "utils/onboarding.js",
];

const [
  applicationSources,
  serverApplicationSources,
  discoverSource,
  authContextSource,
  authNavigationSource,
  userModelSource,
] = await Promise.all([
  Promise.all(applicationComponentPaths.map(readClient)),
  Promise.all(serverApplicationPaths.map(readServer)),
  readClient("Components/Discover.tsx"),
  readClient("context/AuthContext.tsx"),
  readClient("utils/authNavigation.ts"),
  readServer("models/User.js"),
]);

for (const [index, source] of applicationSources.entries()) {
  assert.doesNotMatch(
    source,
    /authProvider|firebaseUid|emailVerified/,
    `${applicationComponentPaths[index]} must not branch on authentication metadata`,
  );
}

for (const [index, source] of serverApplicationSources.entries()) {
  assert.doesNotMatch(
    source,
    /authProvider|firebaseUid|emailVerified/,
    `${serverApplicationPaths[index]} must not branch on authentication metadata`,
  );
}

const actionMarkup = discoverSource.slice(
  discoverSource.indexOf('<div className="discover-actions">'),
  discoverSource.indexOf("</div>", discoverSource.indexOf('<div className="discover-actions">')),
);
assert.match(actionMarkup, /moveToNextProfile\("skip"\)/);
assert.match(actionMarkup, /aria-label="דלגי"/);
assert.match(actionMarkup, /moveToNextProfile\("like"\)/);
assert.match(actionMarkup, /aria-label="אהבתי"/);
assert.match(discoverSource, /<Ban size=\{20\} \/>/);
assert.match(discoverSource, /profile\.destinationInfo/);
assert.match(discoverSource, /profile\.match/);

assert.match(
  authContextSource,
  /async function establishAuthenticatedSession\(token: string\)[\s\S]*await getCurrentUser\(\)[\s\S]*setUser\(authoritativeUser\)/,
);
assert.match(
  authContextSource,
  /async function login\([\s\S]*return establishAuthenticatedSession\(response\.data\.token\)/,
);
assert.match(
  authContextSource,
  /async function register\([\s\S]*return establishAuthenticatedSession\(response\.data\.token\)/,
);
assert.match(
  authContextSource,
  /async function authenticateWithGoogle\([\s\S]*await establishAuthenticatedSession\([\s\S]*response\.data\.token/,
);
assert.match(
  authContextSource,
  /async function authenticateWithEmailCode\([\s\S]*await establishAuthenticatedSession\([\s\S]*response\.data\.token/,
);

const { outputText } = ts.transpileModule(authNavigationSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const navigation = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const applicationPaths = [
  "/discover",
  "/likes",
  "/matches",
  "/matches-map",
  "/chat/conversation-id",
  "/profile",
  "/profile-preview",
  "/blocked-users",
  "/boost/return",
];

for (const authProvider of ["local", "email", "google"]) {
  const completedUser = {
    _id: `${authProvider}-completed-user`,
    authProvider,
    registrationComplete: true,
    registrationInProgress: false,
    nextRegistrationStep: null,
    onboardingComplete: true,
    nextOnboardingStep: null,
  };

  assert.equal(navigation.getProfileCompletionPath(completedUser), "/discover");
  for (const pathname of applicationPaths) {
    assert.equal(
      navigation.getOnboardingRouteRedirect(completedUser, pathname),
      null,
    );
  }
}

for (const sharedField of [
  "registrationCompletedAt",
  "photo",
  "photoURL",
  "photos",
  "questionnaire",
  "tripLocation",
  "subscriptionPlan",
  "subscriptionStatus",
]) {
  assert.match(userModelSource, new RegExp(`${sharedField}:`));
}
assert.match(userModelSource, /authProvider:[\s\S]*enum: \["local", "google", "email"\]/);
assert.match(userModelSource, /password:[\s\S]*this\.authProvider === "local"/);

console.log("Google/email application parity verification passed", {
  sharedApplicationComponents: applicationComponentPaths.length,
  sharedBackendApplicationPaths: serverApplicationPaths.length,
  discoverLikeVisibleForEveryProvider: true,
  discoverDislikeVisibleForEveryProvider: true,
  providerIndependentOnboardingAndRoutes: true,
  everyAuthenticationMethodHydratesFromAuthMe: true,
  providerMetadataRestrictedToAuthentication: true,
  sharedProfileMatchingSubscriptionFields: true,
});
