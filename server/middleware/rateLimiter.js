const { rateLimit } = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
});

const emailOtpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
});

const emailOtpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
});

module.exports = apiLimiter;
module.exports.authLimiter = authLimiter;
module.exports.emailOtpRequestLimiter = emailOtpRequestLimiter;
module.exports.emailOtpVerifyLimiter = emailOtpVerifyLimiter;
