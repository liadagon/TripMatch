import type {
  AuthUser,
  AuthenticationResult,
} from "../services/authService";

export type AuthenticationIntent = "login" | "register";

export const EXISTING_ACCOUNT_CONFIRMATION = {
  title: "החשבון כבר קיים",
  message:
    "החשבון הזה כבר רשום ב-TripMatch. אפשר להמשיך ישירות לחשבון הקיים.",
  actionLabel: "המשך לחשבון",
} as const;

type ProfileCompletionPath =
  | "/photo-upload"
  | "/questionnaire"
  | "/profile"
  | "/discover";

const questionnaireFields: Array<keyof NonNullable<AuthUser["questionnaire"]>> = [
  "planningStyle",
  "accommodationPreference",
  "companionScope",
  "companionPriority",
  "dealBreaker",
];

function hasProfilePhoto(user: AuthUser) {
  return Boolean(
    user.photoURL?.trim() ||
      user.photo?.trim() ||
      user.photos?.some((photo) => photo.trim()),
  );
}

function hasCompletedQuestionnaire(user: AuthUser) {
  return questionnaireFields.every((field) =>
    Boolean(user.questionnaire?.[field]?.trim()),
  );
}

export function getProfileCompletionPath(
  user: AuthUser,
): ProfileCompletionPath {
  if (user.authProvider === "google" && !hasProfilePhoto(user)) {
    return "/photo-upload";
  }

  if (!hasCompletedQuestionnaire(user)) {
    return "/questionnaire";
  }

  if (!user.tripLocation) {
    return "/profile";
  }

  return "/discover";
}

export function getAuthenticationPath(result: AuthenticationResult) {
  return result.isNewUser
    ? "/post-login-welcome"
    : getProfileCompletionPath(result.user);
}

export const getGoogleLoginPath = getAuthenticationPath;

export function shouldConfirmExistingAccount(
  intent: AuthenticationIntent,
  isNewUser: boolean,
) {
  return intent === "register" && !isNewUser;
}

export function shouldShowEmailLoginSuccessTransition(
  intent: AuthenticationIntent,
  isNewUser: boolean,
) {
  return intent === "login" && !isNewUser;
}

export function getAuthenticationIntent(state: unknown): AuthenticationIntent {
  if (
    typeof state === "object" &&
    state !== null &&
    "authIntent" in state &&
    state.authIntent === "register"
  ) {
    return "register";
  }

  return "login";
}
