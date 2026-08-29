/**
 * Builds route-parameter middleware that forwards only Joi-validated values.
 * @param {import("joi").ObjectSchema} schema Route-parameter contract.
 * @returns {import("express").RequestHandler} Express validation middleware.
 */
const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((detail) => detail.message).join(", "),
    });
  }

  req.params = value;
  return next();
};

module.exports = validateParams;
