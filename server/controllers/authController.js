const jwt = require("jsonwebtoken");
const getFirebaseAdminAuth = require("../config/firebaseAdmin");
const User = require("../models/User");
const {
  EmailOtpError,
  consumeEmailOtp,
  requestEmailOtp,
} = require("../services/emailOtpService");

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const register = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const user = await User.create(req.body);
    const token = createToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      token,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

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
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

const googleLogin = async (req, res, next) => {
  let firebaseAuth;

  try {
    firebaseAuth = getFirebaseAdminAuth();
  } catch (error) {
    console.error("[Google auth] Firebase Admin initialization failed", {
      code: error.code,
      message: error.message,
    });
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
    console.error("[Google auth] Firebase ID token verification failed", {
      code: error.code,
      message: error.message,
    });
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

    let user = await User.findOne({ firebaseUid });
    let isNewUser = false;

    if (user && user.authProvider !== "google") {
      return res.status(400).json({
        success: false,
        message:
          "This email is already registered with another login method",
      });
    }

    if (!user) {
      const existingUser = await User.findOne({ email });

      if (existingUser && existingUser.authProvider !== "google") {
        return res.status(400).json({
          success: false,
          message:
            "This email is already registered with another login method",
        });
      }

      if (existingUser) {
        if (
          existingUser.firebaseUid &&
          existingUser.firebaseUid !== firebaseUid
        ) {
          return res.status(400).json({
            success: false,
            message:
              "This email is already registered with another Google account",
          });
        }

        existingUser.firebaseUid = firebaseUid;
        user = await existingUser.save();
      } else {
        const verifiedName =
          typeof verifiedToken.name === "string"
            ? verifiedToken.name.trim()
            : "";
        const verifiedPhoto =
          typeof verifiedToken.picture === "string"
            ? verifiedToken.picture.trim()
            : "";

        user = await User.create({
          name: verifiedName || email.split("@")[0],
          email,
          photoURL: verifiedPhoto,
          authProvider: "google",
          firebaseUid,
        });
        isNewUser = true;
      }
    }

    let token;

    try {
      token = createToken(user._id);
    } catch (error) {
      console.error("[Google auth] TripMatch JWT creation failed", {
        code: error.code,
        message: error.message,
      });
      error.authStage = "jwt_creation";
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? "Google registration completed successfully"
        : "Google login completed successfully",
      token,
      data: user,
      isNewUser,
    });
  } catch (error) {
    if (error.authStage !== "jwt_creation") {
      console.error("[Google auth] MongoDB user lookup/create failed", {
        code: error.code,
        name: error.name,
        message: error.message,
      });
    }
    return next(error);
  }
};

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
      return res.status(503).json({
        success: false,
        code: "OTP_DELIVERY_UNAVAILABLE",
        message: "Verification email is temporarily unavailable",
      });
    }

    return next(error);
  }
};

async function findOrCreateVerifiedEmailUser(email) {
  let user = await User.findOne({ email });
  let isNewUser = false;

  if (user) {
    if (!user.emailVerified) {
      await User.updateOne(
        { _id: user._id },
        { $set: { emailVerified: true } },
      );
      user.emailVerified = true;
    }

    return { user, isNewUser };
  }

  try {
    user = await User.create({
      name: email.split("@")[0].slice(0, 80),
      email,
      authProvider: "email",
      emailVerified: true,
    });
    isNewUser = true;
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    user = await User.findOne({ email });

    if (!user) {
      throw error;
    }
  }

  return { user, isNewUser };
}

const verifyEmailCode = async (req, res, next) => {
  try {
    await consumeEmailOtp(req.body.email, req.body.code);
    const { user, isNewUser } = await findOrCreateVerifiedEmailUser(
      req.body.email,
    );
    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? "Email registration completed successfully"
        : "Email login completed successfully",
      token,
      data: user,
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

const getCurrentUser = (req, res) =>
  res.status(200).json({
    success: true,
    data: req.user,
  });

module.exports = {
  register,
  login,
  googleLogin,
  requestEmailCode,
  verifyEmailCode,
  getCurrentUser,
};
