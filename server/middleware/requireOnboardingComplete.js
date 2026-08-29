const { getRegistrationState } = require("../utils/onboarding");

/**
 * Allows protected feature access only after authoritative registration completion.
 * @param {import("express").Request} req Request whose `user` was populated by auth middleware.
 * @param {import("express").Response} res Express response.
 * @param {import("express").NextFunction} next Continues to the protected feature.
 * @returns {import("express").Response|void} A 403 response with resume state, or the next middleware result.
 */
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
