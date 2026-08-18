const Joi = require("joi");

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  bio: Joi.string().trim().max(500).allow("").optional(),
  age: Joi.number().integer().min(18).max(120).optional(),
  location: Joi.string().trim().max(100).allow("").optional(),
  interests: Joi.array().items(Joi.string().trim().max(50)).optional(),
  preferredDestinations: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional(),
  travelStyle: Joi.string().trim().max(100).allow("").optional(),
  budget: Joi.string().trim().max(100).allow("").optional(),
  tripDates: Joi.string().trim().max(100).allow("").optional(),
  questionnaire: Joi.object({
    planningStyle: Joi.string().trim().max(150).allow("").required(),
    accommodationPreference: Joi.string().trim().max(150).allow("").required(),
    companionScope: Joi.string().trim().max(150).allow("").required(),
    companionPriority: Joi.string().trim().max(150).allow("").required(),
    dealBreaker: Joi.string().trim().max(150).allow("").required(),
  })
    .unknown(false)
    .optional(),
  photo: Joi.string().trim().allow("").optional(),
  photoURL: Joi.string().trim().allow("").optional(),
})
  .min(1)
  .unknown(false);

module.exports = {
  updateProfileSchema,
};
