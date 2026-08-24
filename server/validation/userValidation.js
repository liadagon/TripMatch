const Joi = require("joi");
const tripLocationSchema = require("./tripLocationValidation");
const QUESTIONNAIRE_OPTIONS = require("../constants/profileOptions");

const userListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().trim().max(100).allow("").optional(),
  location: Joi.string().trim().max(100).optional(),
  travelStyle: Joi.string().trim().max(100).optional(),
}).unknown(false);

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  bio: Joi.string().trim().max(500).allow("").optional(),
  age: Joi.number().integer().min(18).max(120).optional(),
  tripLocation: tripLocationSchema.optional(),
  interests: Joi.array().max(10).items(Joi.string().trim().max(50)).optional(),
  preferredDestinations: Joi.array()
    .max(1)
    .items(Joi.string().valid(...QUESTIONNAIRE_OPTIONS.destinations))
    .optional(),
  travelStyle: Joi.string()
    .valid(...QUESTIONNAIRE_OPTIONS.travelStyles, "")
    .optional(),
  budget: Joi.string().valid(...QUESTIONNAIRE_OPTIONS.budgets, "").optional(),
  tripDates: Joi.string()
    .valid(...QUESTIONNAIRE_OPTIONS.tripDates, "")
    .optional(),
  tripDuration: Joi.string()
    .valid(...QUESTIONNAIRE_OPTIONS.tripDurations, "")
    .optional(),
  questionnaire: Joi.object({
    planningStyle: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.planningStyles, "")
      .optional(),
    accommodationPreference: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.accommodationPreferences, "")
      .optional(),
    companionScope: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.companionScopes, "")
      .optional(),
    companionPriority: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.companionPriorities, "")
      .optional(),
    dealBreaker: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.dealBreakers, "")
      .optional(),
  })
    .unknown(false)
    .optional(),
  photo: Joi.string().trim().allow("").optional(),
  photoURL: Joi.string().trim().allow("").optional(),
  photos: Joi.array()
    .max(6)
    .items(Joi.string().trim().min(1))
    .optional(),
})
  .min(1)
  .unknown(false);

module.exports = {
  userListQuerySchema,
  updateProfileSchema,
};
