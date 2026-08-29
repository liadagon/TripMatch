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
  | "/discover";

export type OnboardingPath =
  | "/photo-upload"
  | "/questionnaire";

export const ONBOARDING_PATHS: readonly OnboardingPath[] = [
  "/photo-upload",
  "/questionnaire",
];

/** Returns the preceding route in the ordered onboarding flow. */
export function getPreviousOnboardingPath(
  pathname: OnboardingPath,
): "/" | OnboardingPath {
  const currentIndex = ONBOARDING_PATHS.indexOf(pathname);
  return currentIndex <= 0 ? "/" : ONBOARDING_PATHS[currentIndex - 1];
}

/** Maps authoritative registration state to the next accessible route. */
export function getProfileCompletionPath(
  user: AuthUser,
): ProfileCompletionPath {
  if (user.registrationComplete) return "/discover";

  const stepRoutes = {
    photos: "/photo-upload",
    questionnaire: "/questionnaire",
    profile: "/questionnaire",
  } as const;

  return user.nextRegistrationStep
    ? stepRoutes[user.nextRegistrationStep]
    : "/photo-upload";
}

/** Selects the first route shown after a successful authentication result. */
export function getAuthenticationPath(result: AuthenticationResult) {
  const completionPath = getProfileCompletionPath(result.user);
  return result.isNewUser && completionPath !== "/discover"
    ? "/post-login-welcome"
    : completionPath;
}

/**
 * Resolves the safe redirect for incomplete registrations and onboarding-only pages.
 * @param user Authoritative authenticated user.
 * @param pathname Route currently being evaluated.
 * @param options Controls whether completed steps or onboarding-only pages are allowed.
 * @returns A replacement route, or null when the requested route is accessible.
 */
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

/** Indicates whether registration discovered an existing account. */
export function shouldConfirmExistingAccount(
  intent: AuthenticationIntent,
  isNewUser: boolean,
) {
  return intent === "register" && !isNewUser;
}

/** Indicates whether email login should show its existing-user transition. */
export function shouldShowEmailLoginSuccessTransition(
  intent: AuthenticationIntent,
  isNewUser: boolean,
) {
  return intent === "login" && !isNewUser;
}

/** Safely reads the requested authentication intent from router state. */
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
