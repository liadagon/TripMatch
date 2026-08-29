const logger = require("../utils/logger");

/** Normalizes operational errors and records unexpected 5xx failures safely. */
const errorHandler = (err, req, res, next) => {
  let message = err.message || "Internal server error";

  if (err.code === 11000) {
    if (err.keyPattern?.paypalSubscriptionId) {
      err.statusCode = 409;
      message = "This PayPal subscription is already linked to another user";
    } else {
      err.statusCode = 400;
      message = "A user with this email already exists";
    }
  } else if (err instanceof SyntaxError && err.status === 400) {
    err.statusCode = 400;
    message = "Invalid JSON request";
  } else if (err.name === "CastError") {
    err.statusCode = 400;
    message = "Invalid resource identifier";
  } else if (err.name === "ValidationError") {
    err.statusCode = 400;
    message = Object.values(err.errors)
      .map((validationError) => validationError.message)
      .join(", ");
  } else if (err.name === "MulterError") {
    err.statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE"
      ? "Image size must not exceed 5MB"
      : message;
  }

  const statusCode = err.statusCode || 500;

  if (statusCode === 500) {
    message = "Internal server error";
  }

  if (statusCode >= 500) {
    logger.error("Unhandled request error", {
      method: req.method,
      path: req.path,
      statusCode,
      error: err,
    });
  }

  const response = {
    success: false,
    message,
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
