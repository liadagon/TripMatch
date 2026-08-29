const QUESTIONNAIRE_FIELDS = [
  "accommodationPreference",
  "companionScope",
  "companionPriority",
  "dealBreaker",
];
const {
  getAppOwnedPhotoUrls,
  sanitizeUserPhotoFields,
} = require("./profilePhotos");
const PROFILE_OPTIONS = require("../constants/profileOptions");
const { filterCanonicalInterests } = PROFILE_OPTIONS;

const CURRENT_REGISTRATION_FLOW_VERSION = 2;

const hasText = (value) =>
  typeof value === "string" && value.trim().length > 0;

/** Indicates whether the account owns at least one accepted profile image. */
const hasRequiredPhoto = (user) => getAppOwnedPhotoUrls(user).length > 0;

const hasCanonicalValue = (value, options) =>
  hasText(value) && options.includes(value.trim());

/** Recognizes questionnaire completion across current and legacy profiles. */
const hasCompletedQuestionnaire = (user) =>
  Array.isArray(user?.preferredDestinations) &&
  user.preferredDestinations.some(hasText) &&
  hasText(user?.tripDates) &&
  hasText(user?.budget) &&
  hasText(user?.travelStyle) &&
  QUESTIONNAIRE_FIELDS.every((field) => hasText(user?.questionnaire?.[field]));

/** Validates every questionnaire field required by the current flow. */
const hasCompletedCurrentQuestionnaire = (user) =>
  Array.isArray(user?.preferredDestinations) &&
  user.preferredDestinations.length === 1 &&
  hasCanonicalValue(user.preferredDestinations[0], PROFILE_OPTIONS.destinations) &&
  hasCanonicalValue(user?.tripDates, PROFILE_OPTIONS.tripDates) &&
  hasCanonicalValue(user?.tripDuration, PROFILE_OPTIONS.tripDurations) &&
  hasCanonicalValue(user?.budget, PROFILE_OPTIONS.budgets) &&
  hasCanonicalValue(user?.travelStyle, PROFILE_OPTIONS.travelStyles) &&
  hasCanonicalValue(
    user?.questionnaire?.accommodationPreference,
    PROFILE_OPTIONS.accommodationPreferences,
  ) &&
  hasCanonicalValue(user?.questionnaire?.companionScope, PROFILE_OPTIONS.companionScopes) &&
  hasCanonicalValue(
    user?.questionnaire?.companionPriority,
    PROFILE_OPTIONS.companionPriorities,
  ) &&
  hasCanonicalValue(user?.questionnaire?.dealBreaker, PROFILE_OPTIONS.dealBreakers);

/** Validates the personal profile fields required for registration completion. */
const hasCompletedPersonalProfile = (user) =>
  hasText(user?.name) &&
  user.name.trim().length >= 2 &&
  user.name.trim().length <= 80 &&
  Number.isInteger(user?.age) &&
  user.age >= 18 &&
  user.age <= 120 &&
  filterCanonicalInterests(user?.interests).length > 0 &&
  hasText(user?.bio) &&
  user.bio.trim().length >= 20 &&
  user.bio.trim().length <= 300;

/** Returns the current registration fields that remain incomplete or invalid. */
function getCurrentRegistrationValidationErrors(user) {
  const errors = {};
  if (!hasText(user?.name) || user.name.trim().length < 2 || user.name.trim().length > 80) {
    errors.name = "יש להזין שם באורך של 2 עד 80 תווים.";
  }
  if (!hasRequiredPhoto(user)) errors.photo = "יש להעלות לפחות תמונת פרופיל אחת.";
  if (!Number.isInteger(user?.age) || user.age < 18 || user.age > 120) {
    errors.age = "יש להזין גיל תקין בין 18 ל-120.";
  }
  if (!hasTripDestination(user)) errors.tripLocation = "יש לבחור יעד לטיול.";
  if (
    !Array.isArray(user?.preferredDestinations) ||
    user.preferredDestinations.length !== 1 ||
    !hasCanonicalValue(user.preferredDestinations[0], PROFILE_OPTIONS.destinations)
  ) {
    errors.preferredDestinations = "יש לבחור יעד מועדף לטיול.";
  }
  if (!hasCanonicalValue(user?.tripDates, PROFILE_OPTIONS.tripDates)) errors.tripDates = "יש לבחור תאריכי טיול.";
  if (!hasCanonicalValue(user?.tripDuration, PROFILE_OPTIONS.tripDurations)) errors.tripDuration = "יש לבחור משך טיול.";
  if (!hasCanonicalValue(user?.budget, PROFILE_OPTIONS.budgets)) errors.budget = "יש לבחור תקציב.";
  if (!hasCanonicalValue(user?.travelStyle, PROFILE_OPTIONS.travelStyles)) errors.travelStyle = "יש לבחור סגנון טיול.";
  const questionnaireMessages = {
    accommodationPreference: "יש לבחור העדפת לינה.",
    companionScope: "יש לבחור עם מי תרצו לטייל.",
    companionPriority: "יש לבחור מה חשוב לכם בשותף לטיול.",
    dealBreaker: "יש לבחור מה מהווה מבחינתכם Deal Breaker.",
  };
  const questionnaireOptions = {
    accommodationPreference: PROFILE_OPTIONS.accommodationPreferences,
    companionScope: PROFILE_OPTIONS.companionScopes,
    companionPriority: PROFILE_OPTIONS.companionPriorities,
    dealBreaker: PROFILE_OPTIONS.dealBreakers,
  };
  QUESTIONNAIRE_FIELDS.forEach((field) => {
    if (!hasCanonicalValue(user?.questionnaire?.[field], questionnaireOptions[field])) {
      errors[field] = questionnaireMessages[field];
    }
  });
  if (filterCanonicalInterests(user?.interests).length === 0) {
    errors.interests = "יש לבחור לפחות תחום עניין אחד.";
  }
  if (!hasText(user?.bio) || user.bio.trim().length < 20) {
    errors.bio = "יש לכתוב לפחות 20 תווים.";
  } else if (user.bio.trim().length > 300) {
    errors.bio = "ניתן לכתוב עד 300 תווים.";
  }
  return errors;
}

/** Indicates whether the profile contains a complete structured trip destination. */
function hasTripDestination(user) {
  const destination = user?.tripLocation;
  return Boolean(
    destination &&
      typeof destination === "object" &&
      hasText(destination.country) &&
      (hasText(destination.name) || hasText(destination.city)),
  );
}

/** Recognizes profiles that completed the registration flow before version markers. */
function hasLegacyRegistrationCompletion(user) {
  return (
    !user?.registrationFlowVersion &&
    !user?.registrationCompletedAt &&
    hasCompletedQuestionnaire(user)
  );
}

/** Derives the authoritative registration state and next required step. */
function getRegistrationState(user) {
  if (user?.registrationCompletedAt || hasLegacyRegistrationCompletion(user)) {
    return {
      registrationComplete: true,
      registrationInProgress: false,
      nextRegistrationStep: null,
      onboardingComplete: true,
      nextOnboardingStep: null,
    };
  }

  if (!hasRequiredPhoto(user)) {
    return {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "photos",
      onboardingComplete: false,
      nextOnboardingStep: "photos",
    };
  }

  if (user?.registrationFlowVersion === CURRENT_REGISTRATION_FLOW_VERSION) {
    return {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "questionnaire",
      onboardingComplete: false,
      nextOnboardingStep: "questionnaire",
    };
  }

  if (!hasCompletedQuestionnaire(user)) {
    return {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "questionnaire",
      onboardingComplete: false,
      nextOnboardingStep: "questionnaire",
    };
  }

  return {
    registrationComplete: false,
    registrationInProgress: true,
    nextRegistrationStep: "questionnaire",
    onboardingComplete: false,
    nextOnboardingStep: "questionnaire",
  };
}

const getOnboardingState = getRegistrationState;

/** Persists the current flow marker when the profile satisfies all requirements. */
function markRegistrationCompleteIfEligible(user, now = new Date()) {
  if (
    !user?.registrationCompletedAt &&
    user?.registrationFlowVersion === CURRENT_REGISTRATION_FLOW_VERSION &&
    Object.keys(getCurrentRegistrationValidationErrors(user)).length === 0
  ) {
    user.registrationCompletedAt = now;
    return true;
  }
  return false;
}

/** Returns the registration-complete flag used by protected middleware. */
function isOnboardingComplete(user) {
  return getRegistrationState(user).registrationComplete;
}

/** Produces the credential-free user payload shared by authentication endpoints. */
function normalizeAuthenticatedUser(user) {
  const serialized =
    typeof user?.toJSON === "function" ? user.toJSON() : { ...user };
  delete serialized.password;
  delete serialized.registrationFlowVersion;
  sanitizeUserPhotoFields(serialized);
  serialized.interests = filterCanonicalInterests(serialized.interests);

  return {
    ...serialized,
    ...getRegistrationState(user),
  };
}

module.exports = {
  QUESTIONNAIRE_FIELDS,
  CURRENT_REGISTRATION_FLOW_VERSION,
  getOnboardingState,
  getCurrentRegistrationValidationErrors,
  getRegistrationState,
  hasCompletedQuestionnaire,
  hasCompletedCurrentQuestionnaire,
  hasCompletedPersonalProfile,
  hasLegacyRegistrationCompletion,
  hasRequiredPhoto,
  hasTripDestination,
  isOnboardingComplete,
  markRegistrationCompleteIfEligible,
  normalizeAuthenticatedUser,
};
