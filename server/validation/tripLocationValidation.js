const Joi = require("joi");

const optionalPlacePart = Joi.string().trim().min(1).max(200).optional();

const tripLocationSchema = Joi.object({
  placeId: Joi.string()
    .trim()
    .min(20)
    .max(300)
    .pattern(/^[0-9a-f]+$/i)
    .required(),
  name: Joi.string().trim().min(1).max(200).required(),
  formattedAddress: Joi.string().trim().min(1).max(500).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  city: optionalPlacePart,
  state: optionalPlacePart,
  country: Joi.string().trim().min(1).max(200).required(),
  countryCode: Joi.string().trim().lowercase().length(2).invalid("il").required(),
}).unknown(false);

module.exports = tripLocationSchema;
