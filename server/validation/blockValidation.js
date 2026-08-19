const Joi = require("joi");

const emptyBlockBodySchema = Joi.object({}).unknown(false);

module.exports = {
  emptyBlockBodySchema,
};
