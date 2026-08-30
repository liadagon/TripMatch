const PROFILE_OPTIONS = {
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
  tripDurations: [
    "סוף שבוע ארוך",
    "עד שבוע",
    "שבוע עד שבועיים",
    "שבועיים עד חודש",
    "יותר מחודש",
    "עדיין לא החלטתי",
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
  interests: [
    "טבע",
    "טרקים",
    "חופים",
    "אוכל מקומי",
    "תרבות",
    "חיי לילה",
    "צילום",
    "ספורט",
    "מוזיקה",
    "קניות",
  ],
};

const canonicalInterests = new Set(PROFILE_OPTIONS.interests);

/** Keeps only unique interests defined by the canonical profile options. */
function filterCanonicalInterests(values) {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => canonicalInterests.has(value)),
    ),
  ];
}

module.exports = {
  ...PROFILE_OPTIONS,
  filterCanonicalInterests,
};
