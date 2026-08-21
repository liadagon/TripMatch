import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import ts from "typescript";

const sourceUrl = new URL("../src/utils/authNavigation.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const welcomeSource = await readFile(
  new URL("../src/Components/Welcome.tsx", import.meta.url),
  "utf8",
);
const authContextSource = await readFile(
  new URL("../src/context/AuthContext.tsx", import.meta.url),
  "utf8",
);
const existingAccountDialogSource = await readFile(
  new URL("../src/Components/ExistingAccountDialog.tsx", import.meta.url),
  "utf8",
);
const emailOtpVerifySource = await readFile(
  new URL("../src/Components/EmailOtpVerify.tsx", import.meta.url),
  "utf8",
);
const firebaseSource = await readFile(
  new URL("../src/firebase.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const {
  EXISTING_ACCOUNT_CONFIRMATION,
  getAuthenticationIntent,
  getAuthenticationPath,
  getGoogleLoginPath,
  getProfileCompletionPath,
  shouldConfirmExistingAccount,
} = await import(moduleUrl);

const completedQuestionnaire = {
  planningStyle: "planned",
  accommodationPreference: "hotel",
  companionScope: "whole-trip",
  companionPriority: "compatibility",
  dealBreaker: "boundaries",
};
const completeGoogleUser = {
  _id: "google-user",
  name: "Google Traveler",
  email: "traveler@example.com",
  authProvider: "google",
  photoURL: "https://example.com/photo.jpg",
  questionnaire: completedQuestionnaire,
  tripLocation: { placeId: "verified-trip-location" },
};

assert.equal(
  getGoogleLoginPath({ user: completeGoogleUser, isNewUser: true }),
  "/post-login-welcome",
);
assert.equal(
  getGoogleLoginPath({ user: completeGoogleUser, isNewUser: false }),
  "/discover",
);
const incompleteEmailUser = {
  ...completeGoogleUser,
  _id: "email-user",
  authProvider: "email",
  questionnaire: undefined,
};
const completeEmailUser = {
  ...completeGoogleUser,
  _id: "complete-email-user",
  authProvider: "email",
};
assert.equal(
  getAuthenticationPath({ user: incompleteEmailUser, isNewUser: true }),
  "/post-login-welcome",
);
assert.equal(
  getAuthenticationPath({ user: incompleteEmailUser, isNewUser: false }),
  "/questionnaire",
);
assert.equal(
  getAuthenticationPath({ user: completeEmailUser, isNewUser: false }),
  "/discover",
);
assert.equal(shouldConfirmExistingAccount("register", false), true);
assert.equal(shouldConfirmExistingAccount("register", true), false);
assert.equal(shouldConfirmExistingAccount("login", false), false);
assert.equal(
  EXISTING_ACCOUNT_CONFIRMATION.title,
  "החשבון כבר קיים",
);
assert.equal(
  EXISTING_ACCOUNT_CONFIRMATION.message,
  "החשבון הזה כבר רשום ב-TripMatch. אפשר להמשיך ישירות לחשבון הקיים.",
);
assert.equal(EXISTING_ACCOUNT_CONFIRMATION.actionLabel, "המשך לחשבון");
assert.equal(getAuthenticationIntent({ authIntent: "register" }), "register");
assert.equal(getAuthenticationIntent({ authIntent: "login" }), "login");
assert.equal(getAuthenticationIntent(undefined), "login");
assert.doesNotMatch(welcomeSource, /setTimeout/);
assert.match(existingAccountDialogSource, /role="dialog"/);
assert.match(welcomeSource, /setPendingExistingAccountPath\(destination\);\s+return;/);
assert.match(welcomeSource, /<ExistingAccountDialog/);
assert.match(emailOtpVerifySource, /<ExistingAccountDialog/);
assert.match(
  emailOtpVerifySource,
  /shouldConfirmExistingAccount\(authIntent,\s*result\.isNewUser\)/,
);
assert.match(
  emailOtpVerifySource,
  /setPendingExistingAccountPath\(destination\);\s+return;/,
);
assert.match(
  emailOtpVerifySource,
  /navigate\(pendingExistingAccountPath,\s*\{\s*replace:\s*true\s*\}\)/,
);
assert.match(welcomeSource, /await logout\(\)/);
assert.match(emailOtpVerifySource, /await logout\(\)/);
assert.match(authContextSource, /authenticateWithEmailCode/);
assert.match(authContextSource, /localStorage\.removeItem\(TRIPMATCH_TOKEN_KEY\)/);
assert.match(authContextSource, /await signOutFromFirebase\(\)/);
assert.match(firebaseSource, /await signOut\(auth\)/);
assert.doesNotMatch(authContextSource, /deleteCurrentUser|deleteUser/);
assert.equal(
  getProfileCompletionPath({
    ...completeGoogleUser,
    photoURL: "",
    photos: [],
  }),
  "/photo-upload",
);
assert.equal(
  getProfileCompletionPath({
    ...completeGoogleUser,
    questionnaire: undefined,
  }),
  "/questionnaire",
);
assert.equal(
  getProfileCompletionPath({
    ...completeGoogleUser,
    tripLocation: undefined,
  }),
  "/profile",
);
assert.equal(
  getProfileCompletionPath({
    ...completeGoogleUser,
    authProvider: "local",
    photoURL: "",
    photos: [],
  }),
  "/discover",
);

console.log("Authentication navigation verification passed", {
  newGoogleUser: "/post-login-welcome",
  returningCompleteUser: "/discover",
  missingPhoto: "/photo-upload",
  missingQuestionnaire: "/questionnaire",
  missingTripDestination: "/profile",
  localEmailFlowPreserved: true,
  registrationExistingAccountFeedback: true,
  existingAccountWaitsForConfirmation: true,
  existingAccountExitClearsSession: true,
  emailOtpUsesCentralAuthContext: true,
  googleAndEmailShareExistingAccountDialog: true,
  emailRegistrationExistingWaitsForConfirmation: true,
  emailExistingContinueUsesCompletionPath: true,
  emailExistingExitClearsSession: true,
});
