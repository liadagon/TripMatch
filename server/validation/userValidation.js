const Joi = require("joi");

const QUESTIONNAIRE_OPTIONS = {
  destinations: [
    "דרום אמריקה",
    "תאילנד וויאטנם",
    "הודו",
    "אוסטרליה",
    "אירופה",
    "עוד לא החלטתי",
  ],
  tripDates: [
    "בעוד חודש או חודשיים",
    "בעוד חצי שנה",
    "בתחילת הקיץ",
    "סוף הקיץ",
    "חורף",
    "גמיש לגמרי",
  ],
  budgets: ["חסכוני", "בינוני", "נוח", "גמיש, תלוי בחוויה"],
  travelStyles: [
    "תרמילאות ואורח חיים מקומי",
    "טרקים והרפתקאות טבע",
    "סיורים תרבותיים וערים",
    "חוף ים ומנוחה",
    "שילוב של הכול",
  ],
  planningStyles: [
    "אני חייבת הכול מתוכנן",
    "אוהבת מסגרת בסיסית",
    "מינימום תכנון",
    "ממש ספונטנית",
  ],
  accommodationPreferences: [
    "הוסטל",
    "Airbnb או דירה משותפת",
    "בית מלון סביר",
    "אוהל וקמפינג",
    "תלוי ביעד ובתקציב",
  ],
  companionScopes: [
    "לכל הטיול",
    "רק לחלק מהמסלול",
    "גמישה, נראה איך זה מסתדר",
  ],
  companionPriorities: [
    "תאימות לסגנון נסיעה",
    "אמינות ואחריות",
    "כימיה אישית טובה",
    "גמישות ורוח טובה",
    "כולם חשובים",
  ],
  dealBreakers: [
    "חוסר גמישות",
    "בזבזנות או קמצנות קיצונית",
    "חוסר כבוד לגבולות",
    "מריבות על החלטות קטנות",
    "לוח זמנים לא מסונכרן",
  ],
};

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  bio: Joi.string().trim().max(500).allow("").optional(),
  age: Joi.number().integer().min(18).max(120).optional(),
  location: Joi.string().trim().max(100).allow("").optional(),
  interests: Joi.array().items(Joi.string().trim().max(50)).optional(),
  preferredDestinations: Joi.when("questionnaire", {
    is: Joi.exist(),
    then: Joi.array()
      .length(1)
      .items(Joi.string().valid(...QUESTIONNAIRE_OPTIONS.destinations))
      .required(),
    otherwise: Joi.array()
      .items(Joi.string().trim().max(100))
      .optional(),
  }),
  travelStyle: Joi.when("questionnaire", {
    is: Joi.exist(),
    then: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.travelStyles)
      .required(),
    otherwise: Joi.string().trim().max(100).allow("").optional(),
  }),
  budget: Joi.when("questionnaire", {
    is: Joi.exist(),
    then: Joi.string().valid(...QUESTIONNAIRE_OPTIONS.budgets).required(),
    otherwise: Joi.string().trim().max(100).allow("").optional(),
  }),
  tripDates: Joi.when("questionnaire", {
    is: Joi.exist(),
    then: Joi.string().valid(...QUESTIONNAIRE_OPTIONS.tripDates).required(),
    otherwise: Joi.string().trim().max(100).allow("").optional(),
  }),
  questionnaire: Joi.object({
    planningStyle: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.planningStyles)
      .required(),
    accommodationPreference: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.accommodationPreferences)
      .required(),
    companionScope: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.companionScopes)
      .required(),
    companionPriority: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.companionPriorities)
      .required(),
    dealBreaker: Joi.string()
      .valid(...QUESTIONNAIRE_OPTIONS.dealBreakers)
      .required(),
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
  updateProfileSchema,
};
