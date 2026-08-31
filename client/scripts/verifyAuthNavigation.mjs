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
const tripLocationPickerSource = await read("../src/Components/TripLocationPicker.tsx");
const tripLocationPickerCssSource = await read("../src/Components/TripLocationPicker.css");
const questionnaireCssSource = await read("../src/Components/Questionnaire.css");
const envExampleSource = await read("../.env.example");

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
    "/profile",
    "/profile-preview",
    "/blocked-users",
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
      allowIncomplete: false,
    }),
    "/questionnaire",
  );
  for (const blockedPath of ["/profile", "/discover", "/likes", "/matches", "/chat/conversation-id", "/blocked-users", "/boost/return"]) {
    assert.equal(
      getOnboardingRouteRedirect(questionnaireUser, blockedPath),
      "/questionnaire",
    );
  }

  const profileUser = user(authProvider, false, "profile");
  assert.equal(getProfileCompletionPath(profileUser), "/questionnaire");
  for (const earlierStep of ["/photo-upload", "/questionnaire"]) {
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
    "/questionnaire",
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
assert.match(authContextSource, /getCurrentUser\(token\)/);
assert.match(
  authContextSource,
  /async function establishAuthenticatedSession\(token: string, revision: number\)[\s\S]*setAuthToken\(token\)[\s\S]*await getCurrentUser\(token\)[\s\S]*setUser\(authoritativeUser\)/,
);
assert.match(
  authContextSource,
  /async function login\([\s\S]*establishAuthenticatedSession\(response\.data\.token, revision\)/,
);
assert.match(
  authContextSource,
  /async function register\([\s\S]*establishAuthenticatedSession\(response\.data\.token, revision\)/,
);
assert.match(
  authContextSource,
  /authenticateWithGoogle[\s\S]*await establishAuthenticatedSession\([\s\S]*user: authoritativeUser/,
);
assert.match(
  authContextSource,
  /authenticateWithEmailCode[\s\S]*await establishAuthenticatedSession\([\s\S]*user: authoritativeUser/,
);
assert.match(
  authContextSource,
  /async function updateProfile[\s\S]*await updateCurrentProfile\(payload\)[\s\S]*await getCurrentUser\(token\)[\s\S]*setUser\(authoritativeUser\)[\s\S]*return authoritativeUser/,
);
assert.match(authContextSource, /removeAuthToken\(\)/);
assert.match(authContextSource, /authenticateWithEmailCode/);
assert.match(authContextSource, /await signOutFromFirebase\(\)/);
assert.match(firebaseSource, /await signOut\(getFirebaseAuth\(\)\)/);
assert.match(firebaseSource, /export async function prepareGoogleSignIn\(\)/);
assert.match(welcomeSource, /void prepareGoogleSignIn\(\)\.catch/);
assert.match(welcomeSource, /role="status" aria-live="polite"/);
assert.match(welcomeSource, /role="alert" aria-live="assertive"/);
assert.match(welcomeSource, /await logout\(\)/);
assert.match(emailOtpVerifySource, /await logout\(\)/);
assert.match(authContextSource, /deleteAccount/);

for (const blockedPath of ["/discover", "/likes", "/matches", "/chat/"]) {
  assert.match(appSource, new RegExp(blockedPath.replaceAll("/", "\\/")));
}
assert.match(protectedRouteSource, /getOnboardingRouteRedirect\(/);
assert.match(protectedRouteSource, /<Navigate to=\{redirect\} replace/);
assert.match(appSource, /allowIncomplete: true/);
assert.match(appSource, /path="\/profile\/setup"[\s\S]*Navigate to="\/profile" replace/);
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
assert.match(questionnaireSource, /completeRegistration: true/);
assert.match(questionnaireSource, /name: form\.name\.trim\(\)/);
assert.match(questionnaireSource, /age: Number\(form\.age\.trim\(\)\)/);
assert.match(questionnaireSource, /tripLocation: form\.tripLocation!/);
assert.match(questionnaireSource, /interests: filterCanonicalInterests\(form\.interests\)/);
assert.match(questionnaireSource, /bio: form\.bio\.trim\(\)/);
assert.match(questionnaireSource, /preferredDestinations: \[form\.preferredDestination\]/);
assert.match(questionnaireSource, /tripDuration: form\.tripDuration/);
assert.match(questionnaireSource, /dealBreaker: form\.dealBreaker/);
assert.doesNotMatch(questionnaireSource, /planningStyle/);
assert.doesNotMatch(profileSource, /planningStyle|profile\/setup/);
assert.match(questionnaireSource, /<TripLocationPicker/);
assert.match(tripLocationPickerSource, /import\.meta\.env\.VITE_GEOAPIFY_API_KEY/);
assert.match(tripLocationPickerSource, /api\.geoapify\.com\/v1\/geocode\/autocomplete/);
assert.match(tripLocationPickerSource, /onChange\(null\)/);
assert.match(tripLocationPickerSource, /onChange\(suggestion\)/);
assert.match(tripLocationPickerSource, /role="listbox"/);
assert.match(tripLocationPickerSource, /placeId: properties\.place_id/);
assert.doesNotMatch(tripLocationPickerSource, /apiKey\s*=\s*["'][A-Za-z0-9_-]{20,}["']/);
assert.match(envExampleSource, /^VITE_GEOAPIFY_API_KEY=$/m);
assert.match(tripLocationPickerCssSource, /\.trip-location-suggestions\s*\{[\s\S]*position: absolute;[\s\S]*z-index: 30;/);
assert.match(questionnaireCssSource, /\.questionnaire-section-card,[\s\S]*overflow: visible;/);
for (const persistedField of [
  "tripDates",
  "tripDuration",
  "preferredDestinations",
  "budget",
  "travelStyle",
  "interests",
  "questionnaire",
  "bio",
]) {
  assert.match(profileSource, new RegExp(`user\\?\\.${persistedField}`));
}
assert.match(profileSource, /payload\.interests = normalizedInterests/);
assert.match(profileSource, /if \(normalizedAge && normalizedAge !== profile\.age\.trim\(\)\)/);
assert.match(profileSource, /payload\.age = Number\(normalizedAge\)/);
assert.match(profileSource, /יש לבחור יעד לטיול\./);
assert.match(profileSource, /לא כל השדות הנדרשים הושלמו\. יש להשלים את השדות המסומנים\./);
assert.match(photoUploadSource, /getPersistedPhotos\(user\)/);
assert.match(photoUploadSource, /Promise\.resolve\(photo\.previewUrl\)/);
assert.match(questionnaireSource, /name: user\?\.name \|\| ""/);
assert.match(questionnaireSource, /tripLocation: user\?\.tripLocation \|\| null/);
assert.match(questionnaireSource, /filterCanonicalInterests\(user\?\.interests\)/);
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
  passwordAndOtpEmailUseSameAuthMeState: true,
  googleBackHierarchy: true,
  emailBackHierarchy: true,
  persistedProgressReused: true,
  refreshSafeExplicitRoutes: true,
  firstStepLogsOutWithoutLoop: true,
});
