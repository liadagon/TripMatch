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
const {
  filterCanonicalInterests,
} = require("../constants/profileOptions");

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
  filterCanonicalInterests(user?.interests).length > 0 &&
  hasText(user?.bio) &&
  user.bio.trim().length >= 20 &&
  user.bio.trim().length <= 300;

function getCurrentRegistrationValidationErrors(user) {
  const errors = {};
  if (!hasRequiredPhoto(user)) errors.photo = "יש להעלות לפחות תמונת פרופיל אחת.";
  if (!Number.isInteger(user?.age) || user.age < 18 || user.age > 120) {
    errors.age = "יש להזין גיל תקין בין 18 ל-120.";
  }
  if (!hasTripDestination(user)) errors.tripLocation = "יש לבחור יעד לטיול.";
  if (!Array.isArray(user?.preferredDestinations) || !user.preferredDestinations.some(hasText)) {
    errors.preferredDestinations = "יש לבחור יעד מועדף לטיול.";
  }
  if (!hasText(user?.tripDates)) errors.tripDates = "יש לבחור תאריכי טיול.";
  if (!hasText(user?.tripDuration)) errors.tripDuration = "יש לבחור משך טיול.";
  if (!hasText(user?.budget)) errors.budget = "יש לבחור תקציב.";
  if (!hasText(user?.travelStyle)) errors.travelStyle = "יש לבחור סגנון טיול.";
  const questionnaireMessages = {
    planningStyle: "יש לבחור סגנון תכנון.",
    accommodationPreference: "יש לבחור העדפת לינה.",
    companionScope: "יש לבחור עם מי תרצו לטייל.",
    companionPriority: "יש לבחור מה חשוב לכם בשותף לטיול.",
    dealBreaker: "יש לבחור מה מהווה מבחינתכם Deal Breaker.",
  };
  QUESTIONNAIRE_FIELDS.forEach((field) => {
    if (!hasText(user?.questionnaire?.[field])) errors[field] = questionnaireMessages[field];
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
    Object.keys(getCurrentRegistrationValidationErrors(user)).length === 0
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
