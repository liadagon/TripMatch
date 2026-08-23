const { getRegistrationState } = require("../utils/onboarding");

function requireOnboardingComplete(req, res, next) {
  const registration = getRegistrationState(req.user);

  if (!registration.registrationComplete) {
    return res.status(403).json({
      success: false,
      code: "ONBOARDING_INCOMPLETE",
      message: "Complete onboarding before using this feature",
      ...registration,
    });
  }

  return next();
}

module.exports = requireOnboardingComplete;
