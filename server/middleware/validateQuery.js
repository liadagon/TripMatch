/**
 * Builds query-validation middleware that preserves Joi conversions in `req.query`.
 * @param {import("joi").ObjectSchema} schema Query-string contract.
 * @returns {import("express").RequestHandler} Express validation middleware.
 */
const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((detail) => detail.message).join(", "),
    });
  }

  req.query = value;
  return next();
};

module.exports = validateQuery;
