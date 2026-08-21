const express = require("express");
const {
  register,
  login,
  googleLogin,
  requestEmailCode,
  verifyEmailCode,
  getCurrentUser,
} = require("../controllers/authController");
const protect = require("../middleware/auth");
const {
  authLimiter,
  emailOtpRequestLimiter,
  emailOtpVerifyLimiter,
} = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
} = require("../validation/authValidation");

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, validate(googleLoginSchema), googleLogin);
router.post(
  "/email/request-code",
  emailOtpRequestLimiter,
  validate(emailOtpRequestSchema),
  requestEmailCode,
);
router.post(
  "/email/verify-code",
  emailOtpVerifyLimiter,
  validate(emailOtpVerifySchema),
  verifyEmailCode,
);
router.get("/me", protect, getCurrentUser);

module.exports = router;
