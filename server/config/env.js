const Joi = require("joi");

const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  DATABASE_URL: Joi.string()
    .trim()
    .pattern(/^mongodb(?:\+srv)?:\/\//)
    .required(),
  JWT_SECRET: Joi.string().trim().min(16).required(),
  CLIENT_URL: Joi.string().trim().uri({ scheme: ["http", "https"] }).required(),
}).unknown(true);

/** Checks required server settings without logging their values. */
function validateEnvironment() {
  const { error, value } = environmentSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    const invalidKeys = [...new Set(error.details.map((detail) => detail.path[0]))]
      .filter(Boolean)
      .join(", ");
    const configurationError = new Error(
      `Server environment configuration is invalid or missing: ${invalidKeys}`,
    );
    configurationError.code = "INVALID_SERVER_ENVIRONMENT";
    throw configurationError;
  }

  return { nodeEnv: value.NODE_ENV };
}

module.exports = validateEnvironment;
module.exports.environmentSchema = environmentSchema;
