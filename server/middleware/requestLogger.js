const logger = require("../utils/logger");

/** Records safe request metadata after the response finishes. */
const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestPath = req.path;

  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    logger.info("HTTP request completed", {
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
    });
  });

  next();
};

module.exports = requestLogger;
