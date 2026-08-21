const Joi = require("joi");
const tripLocationSchema = require("./tripLocationValidation");

const email = Joi.string().trim().lowercase().email();
const password = Joi.string().min(8).max(128);

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: email.required(),
  password: password.required(),
  photo: Joi.string().trim().allow("").optional(),
  photoURL: Joi.string().trim().allow("").optional(),
  bio: Joi.string().trim().max(500).allow("").optional(),
  age: Joi.number().integer().min(18).max(120).optional(),
  location: Joi.string().trim().max(100).allow("").optional(),
  tripLocation: tripLocationSchema.required(),
  interests: Joi.array().items(Joi.string().trim().max(50)).optional(),
  preferredDestinations: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional(),
  travelStyle: Joi.string().trim().max(100).allow("").optional(),
  budget: Joi.string().trim().max(100).allow("").optional(),
  tripDates: Joi.string().trim().max(100).allow("").optional(),
  tripDuration: Joi.string().trim().max(100).allow("").optional(),
});

const loginSchema = Joi.object({
  email: email.required(),
  password: password.required(),
});

const googleLoginSchema = Joi.object({
  idToken: Joi.string().trim().required(),
}).unknown(false);

const emailOtpRequestSchema = Joi.object({
  email: email.required(),
}).unknown(false);

const emailOtpVerifySchema = Joi.object({
  email: email.required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
}).unknown(false);

module.exports = {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
};
