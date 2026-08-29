/**
 * Builds body-validation middleware that replaces `req.body` with Joi's validated value.
 * @param {import("joi").ObjectSchema} schema Request-body contract.
 * @returns {import("express").RequestHandler} Express validation middleware.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((detail) => detail.message).join(", "),
    });
  }

  req.body = value;
  return next();
};

module.exports = validate;
