const errorHandler = (err, req, res, next) => {
  let message = err.message || "Internal server error";

  if (err.code === 11000) {
    err.statusCode = 400;
    message = "A user with this email already exists";
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
  }

  const statusCode = err.statusCode || 500;

  if (statusCode === 500) {
    message = "Internal server error";
  }

  const response = {
    success: false,
    message,
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
