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
  completeRegistration: Joi.boolean().valid(true).optional(),
  name: Joi.string().trim().min(2).max(80).optional(),
  bio: Joi.string().trim().min(20).max(300).optional(),
  age: Joi.number().integer().min(18).max(120).optional(),
  tripLocation: tripLocationSchema.optional(),
  interests: Joi.array()
    .min(1)
    .max(10)
    .items(
      Joi.string()
        .trim()
        .valid(...QUESTIONNAIRE_OPTIONS.interests),
    )
    .optional(),
  preferredDestinations: Joi.array()
    .min(1)
    .max(1)
    .items(Joi.string().trim().valid(...QUESTIONNAIRE_OPTIONS.destinations))
    .optional(),
  travelStyle: Joi.string()
    .trim()
    .valid(...QUESTIONNAIRE_OPTIONS.travelStyles)
    .optional(),
  budget: Joi.string()
    .trim()
    .valid(...QUESTIONNAIRE_OPTIONS.budgets)
    .optional(),
  tripDates: Joi.string()
    .trim()
    .valid(...QUESTIONNAIRE_OPTIONS.tripDates)
    .optional(),
  tripDuration: Joi.string()
    .trim()
    .valid(...QUESTIONNAIRE_OPTIONS.tripDurations)
    .optional(),
  questionnaire: Joi.object({
    accommodationPreference: Joi.string()
      .trim()
      .valid(...QUESTIONNAIRE_OPTIONS.accommodationPreferences)
      .optional(),
    companionScope: Joi.string()
      .trim()
      .valid(...QUESTIONNAIRE_OPTIONS.companionScopes)
      .optional(),
    companionPriority: Joi.string()
      .trim()
      .valid(...QUESTIONNAIRE_OPTIONS.companionPriorities)
      .optional(),
    dealBreaker: Joi.string()
      .trim()
      .valid(...QUESTIONNAIRE_OPTIONS.dealBreakers)
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
