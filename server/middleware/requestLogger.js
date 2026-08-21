const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestPath = req.path;

  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    console.info(
      `${req.method} ${requestPath} ${res.statusCode} ${durationMs.toFixed(1)}ms`
    );
  });

  next();
};

module.exports = requestLogger;
