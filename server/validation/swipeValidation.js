const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const createSwipeSchema = Joi.object({
  toUser: objectId.required(),
  action: Joi.string().valid("like", "skip").required(),
}).unknown(false);

module.exports = {
  createSwipeSchema,
};
