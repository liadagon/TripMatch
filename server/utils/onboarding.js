const QUESTIONNAIRE_FIELDS = [
  "planningStyle",
  "accommodationPreference",
  "companionScope",
  "companionPriority",
  "dealBreaker",
];
const {
  getAppOwnedPhotoUrls,
  sanitizeUserPhotoFields,
} = require("./profilePhotos");

const CURRENT_REGISTRATION_FLOW_VERSION = 2;

const hasText = (value) =>
  typeof value === "string" && value.trim().length > 0;

const hasRequiredPhoto = (user) => getAppOwnedPhotoUrls(user).length > 0;

const hasCompletedQuestionnaire = (user) =>
  Array.isArray(user?.preferredDestinations) &&
  user.preferredDestinations.some(hasText) &&
  hasText(user?.tripDates) &&
  hasText(user?.budget) &&
  hasText(user?.travelStyle) &&
  QUESTIONNAIRE_FIELDS.every((field) => hasText(user?.questionnaire?.[field]));

const hasCompletedCurrentQuestionnaire = (user) =>
  hasCompletedQuestionnaire(user) && hasText(user?.tripDuration);
const hasCompletedPersonalProfile = (user) =>
  Number.isInteger(user?.age) &&
  user.age >= 18 &&
  user.age <= 120 &&
  Array.isArray(user?.interests) &&
  user.interests.some(hasText);
function hasTripDestination(user) {
  const destination = user?.tripLocation;
  return Boolean(
    destination &&
      typeof destination === "object" &&
      hasText(destination.country) &&
      (hasText(destination.name) || hasText(destination.city)),
  );
}

function hasLegacyRegistrationCompletion(user) {
  return (
    !user?.registrationFlowVersion &&
    !user?.registrationCompletedAt &&
    hasCompletedQuestionnaire(user)
  );
}

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

  if (
    !hasCompletedQuestionnaire(user) ||
    (user?.registrationFlowVersion === CURRENT_REGISTRATION_FLOW_VERSION &&
      !hasCompletedCurrentQuestionnaire(user))
  ) {
    return {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "questionnaire",
      onboardingComplete: false,
      nextOnboardingStep: "questionnaire",
    };
  }

  if (
    !hasTripDestination(user) ||
    (user?.registrationFlowVersion === CURRENT_REGISTRATION_FLOW_VERSION &&
      !hasCompletedPersonalProfile(user))
  ) {
    return {
      registrationComplete: false,
      registrationInProgress: true,
      nextRegistrationStep: "profile",
      onboardingComplete: false,
      nextOnboardingStep: "profile",
    };
  }

  return {
    registrationComplete: false,
    registrationInProgress: true,
    nextRegistrationStep: "profile",
    onboardingComplete: false,
    nextOnboardingStep: "profile",
  };
}

const getOnboardingState = getRegistrationState;

function markRegistrationCompleteIfEligible(user, now = new Date()) {
  if (
    !user?.registrationCompletedAt &&
    user?.registrationFlowVersion === CURRENT_REGISTRATION_FLOW_VERSION &&
    hasRequiredPhoto(user) &&
    hasCompletedCurrentQuestionnaire(user) &&
    hasCompletedPersonalProfile(user) &&
    hasTripDestination(user)
  ) {
    user.registrationCompletedAt = now;
    return true;
  }
  return false;
}

function isOnboardingComplete(user) {
  return getRegistrationState(user).registrationComplete;
}

function normalizeAuthenticatedUser(user) {
  const serialized =
    typeof user?.toJSON === "function" ? user.toJSON() : { ...user };
  delete serialized.password;
  delete serialized.registrationFlowVersion;
  sanitizeUserPhotoFields(serialized);

  return {
    ...serialized,
    ...getRegistrationState(user),
  };
}

module.exports = {
  QUESTIONNAIRE_FIELDS,
  CURRENT_REGISTRATION_FLOW_VERSION,
  getOnboardingState,
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
