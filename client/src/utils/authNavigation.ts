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
  | "/profile/setup"
  | "/discover";

export type OnboardingPath =
  | "/photo-upload"
  | "/questionnaire"
  | "/profile/setup";

export const ONBOARDING_PATHS: readonly OnboardingPath[] = [
  "/photo-upload",
  "/questionnaire",
  "/profile/setup",
];

export function getProfileCompletionPath(
  user: AuthUser,
): ProfileCompletionPath {
  if (user.registrationComplete) return "/discover";

  const stepRoutes = {
    photos: "/photo-upload",
    questionnaire: "/questionnaire",
    profile: "/profile/setup",
  } as const;

  return user.nextRegistrationStep
    ? stepRoutes[user.nextRegistrationStep]
    : "/photo-upload";
}

export function getAuthenticationPath(result: AuthenticationResult) {
  const completionPath = getProfileCompletionPath(result.user);
  return result.isNewUser && completionPath !== "/discover"
    ? "/post-login-welcome"
    : completionPath;
}

export function getOnboardingRouteRedirect(
  user: AuthUser,
  pathname: string,
  options: { allowIncomplete?: boolean; onboardingOnly?: boolean } = {},
) {
  if (!user.registrationComplete) {
    const nextOnboardingPath = getProfileCompletionPath(user);
    const isWelcome = pathname === "/post-login-welcome";
    const requestedStepIndex = ONBOARDING_PATHS.indexOf(
      pathname as OnboardingPath,
    );
    const requiredStepIndex = ONBOARDING_PATHS.indexOf(
      nextOnboardingPath as OnboardingPath,
    );
    const isAccessibleOnboardingStep =
      options.allowIncomplete &&
      requestedStepIndex >= 0 &&
      requestedStepIndex <= requiredStepIndex;

    if (
      !options.allowIncomplete ||
      (!isWelcome && !isAccessibleOnboardingStep)
    ) {
      return nextOnboardingPath;
    }

    return null;
  }

  return options.onboardingOnly ? "/discover" : null;
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
