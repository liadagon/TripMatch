const Joi = require("joi");

// PayPal signs the complete webhook event, so this schema is intentionally
// non-mutating and permits provider fields outside TripMatch's core metadata.
const paypalWebhookEventSchema = Joi.object({
  id: Joi.string().trim().min(1).max(100).required(),
  event_type: Joi.string().trim().min(1).max(150).required(),
  resource: Joi.object().unknown(true).optional(),
}).unknown(true);

module.exports = { paypalWebhookEventSchema };
