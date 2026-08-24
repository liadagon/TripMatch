import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const source = await read("../src/utils/authNavigation.ts");
const appSource = await read("../src/App.tsx");
const protectedRouteSource = await read("../src/Components/ProtectedRoute.tsx");
const welcomeSource = await read("../src/Components/Welcome.tsx");
const postLoginWelcomeSource = await read("../src/Components/PostLoginWelcome.tsx");
const emailOtpVerifySource = await read("../src/Components/EmailOtpVerify.tsx");
const authContextSource = await read("../src/context/AuthContext.tsx");
const photoUploadSource = await read("../src/Components/PhotoUpload.tsx");
const questionnaireSource = await read("../src/Components/Questionnaire.tsx");
const profileSource = await read("../src/Components/Profile.tsx");
const photoUploadCssSource = await read("../src/Components/PhotoUpload.css");
const existingAccountDialogSource = await read("../src/Components/ExistingAccountDialog.tsx");
const firebaseSource = await read("../src/firebase.ts");
const authServiceSource = await read("../src/services/authService.ts");
const emailOtpRequestSource = await read("../src/Components/EmailOtpRequest.tsx");

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
  getOnboardingRouteRedirect,
  getPreviousOnboardingPath,
  getProfileCompletionPath,
  shouldConfirmExistingAccount,
  shouldShowEmailLoginSuccessTransition,
} = await import(moduleUrl);

function user(authProvider, onboardingComplete, nextOnboardingStep) {
  return {
    _id: `${authProvider}-user`,
    name: "Traveler",
    email: `${authProvider}@example.com`,
    authProvider,
    onboardingComplete,
    nextOnboardingStep,
    registrationComplete: onboardingComplete,
    registrationInProgress: !onboardingComplete,
    nextRegistrationStep: nextOnboardingStep,
  };
}

for (const authProvider of ["google", "email"]) {
  const newUser = user(authProvider, false, "photos");
  assert.equal(
    getAuthenticationPath({ user: newUser, isNewUser: true }),
    "/post-login-welcome",
  );
  assert.equal(getProfileCompletionPath(newUser), "/photo-upload");

  for (const blockedPath of [
    "/discover",
    "/likes",
    "/matches",
    "/chat/conversation-id",
    "/profile-preview",
    "/boost/return",
  ]) {
    assert.equal(
      getOnboardingRouteRedirect(newUser, blockedPath),
      "/photo-upload",
    );
  }
  assert.equal(
    getOnboardingRouteRedirect(newUser, "/photo-upload", {
      allowIncomplete: true,
      onboardingOnly: true,
    }),
    null,
  );

  const questionnaireUser = user(authProvider, false, "questionnaire");
  assert.equal(
    getOnboardingRouteRedirect(questionnaireUser, "/photo-upload", {
      allowIncomplete: true,
      onboardingOnly: true,
    }),
    null,
  );
  assert.equal(
    getOnboardingRouteRedirect(questionnaireUser, "/profile/setup", {
      allowIncomplete: true,
    }),
    "/questionnaire",
  );

  const profileUser = user(authProvider, false, "profile");
  for (const earlierStep of ["/photo-upload", "/questionnaire", "/profile/setup"]) {
    assert.equal(
      getOnboardingRouteRedirect(profileUser, earlierStep, {
        allowIncomplete: true,
        onboardingOnly: true,
      }),
      null,
    );
  }

  assert.equal(
    getAuthenticationPath({
      user: user(authProvider, false, "questionnaire"),
      isNewUser: false,
    }),
    "/questionnaire",
  );
  assert.equal(
    getAuthenticationPath({
      user: user(authProvider, false, "profile"),
      isNewUser: false,
    }),
    "/profile/setup",
  );
  assert.equal(
    getAuthenticationPath({
      user: user(authProvider, true, null),
      isNewUser: false,
    }),
    "/discover",
  );
  for (const registrationPath of [
    "/photo-upload",
    "/questionnaire",
    "/profile/setup",
  ]) {
    assert.equal(
      getOnboardingRouteRedirect(
        user(authProvider, true, null),
        registrationPath,
        { allowIncomplete: true, onboardingOnly: true },
      ),
      "/discover",
    );
  }
}

assert.equal(
  getGoogleLoginPath({
    user: user("google", false, "questionnaire"),
    isNewUser: false,
  }),
  "/questionnaire",
);
assert.equal(
  getProfileCompletionPath(user("email", false, null)),
  "/photo-upload",
);
assert.equal(getPreviousOnboardingPath("/photo-upload"), "/");
assert.equal(getPreviousOnboardingPath("/questionnaire"), "/photo-upload");
assert.equal(getPreviousOnboardingPath("/profile/setup"), "/questionnaire");
assert.equal(shouldConfirmExistingAccount("register", false), true);
assert.equal(shouldConfirmExistingAccount("register", true), false);
assert.equal(shouldConfirmExistingAccount("login", false), false);
assert.equal(shouldShowEmailLoginSuccessTransition("login", false), true);
assert.equal(shouldShowEmailLoginSuccessTransition("login", true), false);
assert.equal(shouldShowEmailLoginSuccessTransition("register", false), false);
assert.equal(EXISTING_ACCOUNT_CONFIRMATION.title, "החשבון כבר קיים");
assert.equal(
  EXISTING_ACCOUNT_CONFIRMATION.message,
  "החשבון הזה כבר רשום ב-TripMatch. אפשר להמשיך ישירות לחשבון הקיים.",
);
assert.equal(EXISTING_ACCOUNT_CONFIRMATION.actionLabel, "המשך לחשבון");
assert.equal(getAuthenticationIntent({ authIntent: "register" }), "register");
assert.equal(getAuthenticationIntent({ authIntent: "login" }), "login");
assert.equal(getAuthenticationIntent(undefined), "login");

assert.match(existingAccountDialogSource, /role="dialog"/);
assert.match(welcomeSource, /getAuthenticationPath\(result\)/);
assert.match(welcomeSource, /authenticateWithGoogle\(idToken, authMode\)/);
assert.match(welcomeSource, /ACCOUNT_NOT_FOUND/);
assert.match(welcomeSource, /החשבון לא קיים\. יש להירשם מחדש\./);
assert.match(welcomeSource, /לעבור להרשמה/);
assert.match(welcomeSource, /setPendingExistingAccountPath\(destination\);\s+return;/);
assert.match(welcomeSource, /<ExistingAccountDialog/);
assert.match(emailOtpVerifySource, /getAuthenticationPath\(result\)/);
assert.match(emailOtpVerifySource, /authenticateWithEmailCode\([\s\S]*authIntent/);
assert.match(emailOtpVerifySource, /ACCOUNT_NOT_FOUND/);
assert.match(emailOtpVerifySource, /לעבור להרשמה/);
assert.match(emailOtpRequestSource, /requestEmailOtp\(normalizedEmail, authIntent\)/);
assert.match(authServiceSource, /\/api\/auth\/google", \{ idToken, intent \}/);
assert.match(authServiceSource, /\/api\/auth\/email\/verify-code[\s\S]*intent/);
assert.match(emailOtpVerifySource, /<ExistingAccountDialog/);
assert.match(
  emailOtpVerifySource,
  /shouldConfirmExistingAccount\(authIntent,\s*result\.isNewUser\)/,
);
assert.match(emailOtpVerifySource, /LOGIN_SUCCESS_TRANSITION_MS = 1350/);
assert.match(emailOtpVerifySource, /window\.setTimeout/);
assert.match(emailOtpVerifySource, /window\.clearTimeout/);
assert.match(authContextSource, /getCurrentUser\(\)/);
assert.match(
  authContextSource,
  /authenticateWithGoogle[\s\S]*localStorage\.setItem\(TRIPMATCH_TOKEN_KEY,[\s\S]*await getCurrentUser\(\)[\s\S]*user: authoritativeUser/,
);
assert.match(
  authContextSource,
  /authenticateWithEmailCode[\s\S]*localStorage\.setItem\(TRIPMATCH_TOKEN_KEY,[\s\S]*await getCurrentUser\(\)[\s\S]*user: authoritativeUser/,
);
assert.match(
  authContextSource,
  /async function updateProfile[\s\S]*await updateCurrentProfile\(payload\)[\s\S]*await getCurrentUser\(\)[\s\S]*setUser\(authoritativeUser\)[\s\S]*return authoritativeUser/,
);
assert.match(authContextSource, /localStorage\.removeItem\(TRIPMATCH_TOKEN_KEY\)/);
assert.match(authContextSource, /authenticateWithEmailCode/);
assert.match(authContextSource, /await signOutFromFirebase\(\)/);
assert.match(firebaseSource, /await signOut\(auth\)/);
assert.match(welcomeSource, /await logout\(\)/);
assert.match(emailOtpVerifySource, /await logout\(\)/);
assert.match(authContextSource, /deleteAccount/);

for (const blockedPath of ["/discover", "/likes", "/matches", "/chat/"]) {
  assert.match(appSource, new RegExp(blockedPath.replaceAll("/", "\\/")));
}
assert.match(protectedRouteSource, /getOnboardingRouteRedirect\(/);
assert.match(protectedRouteSource, /<Navigate to=\{redirect\} replace/);
assert.match(source, /pathname === "\/profile\/setup"\) return "\/discover"/);
assert.match(appSource, /allowIncomplete: true/);
assert.match(appSource, /path="\/profile\/setup"/);
assert.match(appSource, /path="\/profile" element=\{protectedPage\(<Profile \/>\)\}/);
assert.match(appSource, /user\?\.registrationComplete/);
assert.match(postLoginWelcomeSource, /האימות הצליח/);
assert.match(postLoginWelcomeSource, /נשארו עוד כמה שלבים להשלמת הפרופיל/);
assert.match(emailOtpVerifySource, /isPendingOnboarding/);
assert.doesNotMatch(photoUploadSource, /navigate\(-1\)/);
assert.doesNotMatch(postLoginWelcomeSource, /navigate\(-1\)/);
assert.match(photoUploadSource, /await logout\(\)/);
assert.match(photoUploadSource, /getPreviousOnboardingPath\("\/photo-upload"\)/);
assert.match(postLoginWelcomeSource, /await logout\(\)/);
assert.match(postLoginWelcomeSource, /navigate\("\/", \{ replace: true \}\)/);
assert.match(questionnaireSource, /getPreviousOnboardingPath\("\/questionnaire"\)/);
assert.match(profileSource, /getPreviousOnboardingPath\("\/profile\/setup"\)/);
assert.match(profileSource, /location\.pathname === "\/profile\/setup"/);
assert.match(profileSource, /navigate\("\/discover", \{ replace: true \}\)/);
assert.match(profileSource, /if \(normalizedAge && normalizedAge !== profile\.age\.trim\(\)\)/);
assert.match(profileSource, /payload\.age = Number\(normalizedAge\)/);
assert.match(profileSource, /יש לבחור יעד לטיול\./);
assert.match(profileSource, /לא כל השדות הנדרשים הושלמו\. יש להשלים את השדות המסומנים\./);
assert.match(photoUploadSource, /getPersistedPhotos\(user\)/);
assert.match(photoUploadSource, /Promise\.resolve\(photo\.previewUrl\)/);
assert.match(questionnaireSource, /persistedAnswers/);
assert.match(photoUploadSource, /type="button"[\s\S]*className="photo-upload-back"/);
assert.match(questionnaireSource, /type="button"[\s\S]*className="questionnaire-back-btn"/);
assert.match(profileSource, /type="button" className="profile-back-btn"/);
assert.match(photoUploadCssSource, /\.photo-upload-back\s*\{[\s\S]*cursor: pointer/);
assert.match(emailOtpVerifySource, /האימות הצליח/);

console.log("Authentication and onboarding navigation verification passed", {
  googleNewPartialComplete: true,
  emailNewPartialComplete: true,
  sharedBackendStateConsumed: true,
  directAppRoutesProtected: true,
  onboardingRoutesAllowed: true,
  completeUsersEnterDiscover: true,
  truthfulIncompleteAuthenticationMessage: true,
  jwtRestorationUsesNormalizedUser: true,
  postAuthenticationUsesFreshAuthMeState: true,
  googleBackHierarchy: true,
  emailBackHierarchy: true,
  persistedProgressReused: true,
  refreshSafeExplicitRoutes: true,
  firstStepLogsOutWithoutLoop: true,
});
