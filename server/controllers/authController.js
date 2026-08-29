const jwt = require("jsonwebtoken");
const getFirebaseAdminAuth = require("../config/firebaseAdmin");
const User = require("../models/User");
const logger = require("../utils/logger");
const {
  EmailOtpError,
  consumeEmailOtp,
  requestEmailOtp,
} = require("../services/emailOtpService");
const {
  CURRENT_REGISTRATION_FLOW_VERSION,
  normalizeAuthenticatedUser,
} = require("../utils/onboarding");

/** Signs the application JWT used by authenticated API requests. */
const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

/** Builds the normalized session payload shared by every authentication method. */
const getAuthenticatedUserPayload = (user, { isNewUser = false } = {}) => {
  const data = normalizeAuthenticatedUser(user);

  return {
    data,
    authenticated: true,
    registrationComplete: data.registrationComplete,
    registrationInProgress: data.registrationInProgress,
    nextRegistrationStep: data.nextRegistrationStep,
    accountState: isNewUser
      ? "new_registration"
      : data.registrationComplete
        ? "registered"
        : "registration_in_progress",
    onboardingComplete: data.onboardingComplete,
    nextOnboardingStep: data.nextOnboardingStep,
  };
};

/** Sends the stable response used when a login identity has no TripMatch account. */
const sendAccountNotFound = (res) =>
  res.status(404).json({
    success: false,
    code: "ACCOUNT_NOT_FOUND",
    message: "TripMatch account not found; register first",
  });

/** Sends the stable conflict response for registration with an existing identity. */
const sendAccountAlreadyExists = (res) =>
  res.status(409).json({
    success: false,
    code: "ACCOUNT_ALREADY_EXISTS",
    message: "A TripMatch account already exists for this identity",
  });

/** Registers a local account and returns its authenticated session payload. */
const register = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const user = await User.create({
      ...req.body,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
    });
    const token = createToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Registration started successfully",
      token,
      ...getAuthenticatedUserPayload(user, { isNewUser: true }),
    });
  } catch (error) {
    return next(error);
  }
};

/** Authenticates an existing local account and returns a signed session token. */
const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select(
      "+password"
    );

    if (
      !user ||
      user.authProvider === "google" ||
      !user.password ||
      !(await user.comparePassword(req.body.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login completed successfully",
      token,
      ...getAuthenticatedUserPayload(user),
    });
  } catch (error) {
    return next(error);
  }
};

/** Verifies a Google identity and resolves the corresponding TripMatch account. */
const googleLogin = async (req, res, next) => {
  let firebaseAuth;

  try {
    firebaseAuth = getFirebaseAdminAuth();
  } catch (error) {
    logger.error("Google auth Firebase Admin initialization failed", { error });
    return res.status(500).json({
      success: false,
      code: "FIREBASE_ADMIN_INIT_FAILED",
      message: "Google authentication is not configured",
    });
  }

  let verifiedToken;

  try {
    verifiedToken = await firebaseAuth.verifyIdToken(req.body.idToken);
  } catch (error) {
    const invalidTokenCodes = new Set([
      "auth/argument-error",
      "auth/id-token-expired",
      "auth/id-token-revoked",
      "auth/invalid-id-token",
    ]);

    if (invalidTokenCodes.has(error.code)) {
      return res.status(401).json({
        success: false,
        code: "INVALID_FIREBASE_ID_TOKEN",
        message: "Invalid or expired Firebase authentication token",
      });
    }

    logger.error("Google auth Firebase ID token verification failed", { error });
    return res.status(500).json({
      success: false,
      code: "FIREBASE_TOKEN_VERIFICATION_FAILED",
      message: "Google authentication is temporarily unavailable",
    });
  }

  try {
    const firebaseUid =
      typeof verifiedToken.uid === "string" ? verifiedToken.uid.trim() : "";
    const email =
      typeof verifiedToken.email === "string"
        ? verifiedToken.email.trim().toLowerCase()
        : "";
    const hasEmailVerifiedClaim = Object.prototype.hasOwnProperty.call(
      verifiedToken,
      "email_verified"
    );

    if (
      !firebaseUid ||
      !email ||
      (hasEmailVerifiedClaim && verifiedToken.email_verified !== true)
    ) {
      return res.status(401).json({
        success: false,
        message: "The verified Google account is missing a verified email",
      });
    }

    const userByFirebaseUid = await User.findOne({ firebaseUid });
    const userByEmail = userByFirebaseUid
      ? null
      : await User.findOne({ email });
    let user = userByFirebaseUid || userByEmail;
    const isRegisterIntent = req.body.intent === "register";

    if (isRegisterIntent && user) return sendAccountAlreadyExists(res);
    if (!isRegisterIntent && !user) return sendAccountNotFound(res);

    if (userByEmail) {
      if (userByEmail.firebaseUid && userByEmail.firebaseUid !== firebaseUid) {
        return res.status(400).json({
          success: false,
          code: "GOOGLE_IDENTITY_CONFLICT",
          message: "This email is already registered with another Google account",
        });
      }

      userByEmail.firebaseUid = firebaseUid;
      userByEmail.emailVerified = true;
      user = await userByEmail.save();
    } else if (!user) {
      const verifiedName =
        typeof verifiedToken.name === "string"
          ? verifiedToken.name.trim()
          : "";
      try {
        user = await User.create({
          name: verifiedName || email.split("@")[0],
          email,
          authProvider: "google",
          emailVerified: true,
          firebaseUid,
          registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
        });
      } catch (error) {
        if (error?.code === 11000) return sendAccountAlreadyExists(res);
        throw error;
      }
    } else if (!user.emailVerified) {
      user.emailVerified = true;
      user = await user.save();
    }

    let token;

    try {
      token = createToken(user._id);
    } catch (error) {
      error.authStage = "jwt_creation";
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: isRegisterIntent
        ? "Google authentication succeeded; complete onboarding to finish registration"
        : "Google authentication completed successfully",
      token,
      ...getAuthenticatedUserPayload(user, { isNewUser: isRegisterIntent }),
      isNewUser: isRegisterIntent,
    });
  } catch (error) {
    return next(error);
  }
};

/** Sends a one-time email code for the requested authentication intent. */
const requestEmailCode = async (req, res, next) => {
  try {
    const result = await requestEmailOtp(req.body.email);

    return res.status(200).json({
      success: true,
      message:
        "If the email address can receive messages, a verification code was sent.",
      expiresInSeconds: result.expiresInSeconds,
      cooldownSeconds: result.cooldownSeconds,
    });
  } catch (error) {
    if (error instanceof EmailOtpError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        ...(error.retryAfterSeconds
          ? { retryAfterSeconds: error.retryAfterSeconds }
          : {}),
      });
    }

    if (
      error?.name === "EmailConfigurationError" ||
      error?.name === "EmailDeliveryError"
    ) {
      logger.error("Email OTP delivery unavailable", { error });
      return res.status(503).json({
        success: false,
        code: "OTP_DELIVERY_UNAVAILABLE",
        message: "Verification email is temporarily unavailable",
      });
    }

    return next(error);
  }
};

/**
 * Resolves an OTP-verified identity according to login or registration intent.
 * @param {string} email Verified normalized email address.
 * @param {"login"|"register"} intent Requested account operation.
 * @returns {Promise<object>} Resolution result containing the account state.
 */
async function resolveVerifiedEmailUser(email, intent) {
  let user = await User.findOne({ email });

  if (intent === "login") {
    if (!user) return { accountNotFound: true };
    if (!user.emailVerified) {
      await User.updateOne(
        { _id: user._id },
        { $set: { emailVerified: true } },
      );
      user.emailVerified = true;
    }

    return { user, isNewUser: false };
  }

  if (user) return { accountAlreadyExists: true };

  try {
    user = await User.create({
      name: "",
      email,
      authProvider: "email",
      emailVerified: true,
      registrationFlowVersion: CURRENT_REGISTRATION_FLOW_VERSION,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    return { accountAlreadyExists: true };
  }

  return { user, isNewUser: true };
}

/** Consumes an email OTP and returns the resulting authenticated account. */
const verifyEmailCode = async (req, res, next) => {
  try {
    await consumeEmailOtp(req.body.email, req.body.code);
    const result = await resolveVerifiedEmailUser(
      req.body.email,
      req.body.intent,
    );
    if (result.accountNotFound) return sendAccountNotFound(res);
    if (result.accountAlreadyExists) return sendAccountAlreadyExists(res);
    const { user, isNewUser } = result;
    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? "Email authentication succeeded; complete onboarding to finish registration"
        : "Email authentication completed successfully",
      token,
      ...getAuthenticatedUserPayload(user, { isNewUser }),
      isNewUser,
    });
  } catch (error) {
    if (error instanceof EmailOtpError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }

    return next(error);
  }
};

/** Returns the normalized profile for the authenticated request user. */
const getCurrentUser = (req, res) =>
  res.status(200).json({
    success: true,
    ...getAuthenticatedUserPayload(req.user),
  });

module.exports = {
  register,
  login,
  googleLogin,
  requestEmailCode,
  verifyEmailCode,
  getCurrentUser,
};
