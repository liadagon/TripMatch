const Joi = require("joi");
const tripLocationSchema = require("./tripLocationValidation");
const PROFILE_OPTIONS = require("../constants/profileOptions");

const email = Joi.string().trim().lowercase().email();
const password = Joi.string().min(8).max(128);
const authenticationIntent = Joi.string().valid("login", "register").required();

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  email: email.required(),
  password: password.required(),
  photo: Joi.string().trim().allow("").optional(),
  photoURL: Joi.string().trim().allow("").optional(),
  bio: Joi.string().trim().max(500).allow("").optional(),
  age: Joi.number().integer().min(18).max(120).optional(),
  location: Joi.string().trim().max(100).allow("").optional(),
  tripLocation: tripLocationSchema.optional(),
  interests: Joi.array()
    .max(10)
    .items(Joi.string().trim().valid(...PROFILE_OPTIONS.interests))
    .optional(),
  preferredDestinations: Joi.array()
    .max(1)
    .items(Joi.string().trim().valid(...PROFILE_OPTIONS.destinations))
    .optional(),
  travelStyle: Joi.string()
    .trim()
    .valid(...PROFILE_OPTIONS.travelStyles)
    .allow("")
    .optional(),
  budget: Joi.string()
    .trim()
    .valid(...PROFILE_OPTIONS.budgets)
    .allow("")
    .optional(),
  tripDates: Joi.string()
    .trim()
    .valid(...PROFILE_OPTIONS.tripDates)
    .allow("")
    .optional(),
  tripDuration: Joi.string()
    .trim()
    .valid(...PROFILE_OPTIONS.tripDurations)
    .allow("")
    .optional(),
});

const loginSchema = Joi.object({
  email: email.required(),
  password: password.required(),
});

const googleLoginSchema = Joi.object({
  idToken: Joi.string().trim().required(),
  intent: authenticationIntent,
}).unknown(false);

const emailOtpRequestSchema = Joi.object({
  email: email.required(),
  intent: authenticationIntent,
}).unknown(false);

const emailOtpVerifySchema = Joi.object({
  email: email.required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
  intent: authenticationIntent,
}).unknown(false);

module.exports = {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
};
