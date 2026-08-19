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
