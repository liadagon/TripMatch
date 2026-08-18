const Joi = require("joi");

const sendMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required(),
}).unknown(false);

module.exports = {
  sendMessageSchema,
};
