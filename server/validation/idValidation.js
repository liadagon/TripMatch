const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const userIdParamSchema = Joi.object({
  userId: objectId.required(),
}).unknown(false);

const conversationIdParamSchema = Joi.object({
  conversationId: objectId.required(),
}).unknown(false);

module.exports = {
  userIdParamSchema,
  conversationIdParamSchema,
};
