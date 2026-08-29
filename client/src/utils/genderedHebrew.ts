export type ApplicationGender = "male" | "female" | "unknown";

type GenderedCopy = {
  male: string;
  female: string;
  neutral: string;
};

const GENDERED_QUESTIONNAIRE_OPTION_LABELS: Readonly<
  Record<string, GenderedCopy>
> = {
  "אני חייבת הכול מתוכנן": {
    male: "אני חייב הכול מתוכנן",
    female: "אני חייבת הכול מתוכנן",
    neutral: "הכול מתוכנן מראש",
  },
  "אוהבת מסגרת בסיסית": {
    male: "אוהב מסגרת בסיסית",
    female: "אוהבת מסגרת בסיסית",
    neutral: "מסגרת בסיסית",
  },
  "ממש ספונטנית": {
    male: "ממש ספונטני",
    female: "ממש ספונטנית",
    neutral: "ספונטניות מלאה",
  },
  "גמישה, נראה איך זה מסתדר": {
    male: "גמיש, נראה איך זה מסתדר",
    female: "גמישה, נראה איך זה מסתדר",
    neutral: "גמישות, נראה איך זה מסתדר",
  },
};

/** Selects masculine, feminine, or neutral Hebrew copy for a user. */
export function getGenderedHebrewCopy(
  gender: ApplicationGender | undefined,
  copy: GenderedCopy,
) {
  if (gender === "male") return copy.male;
  if (gender === "female") return copy.female;
  return copy.neutral;
}

/** Maps a canonical questionnaire value to its gender-aware display label. */
export function getGenderedQuestionnaireOptionLabel(
  value: string,
  gender: ApplicationGender | undefined,
) {
  const copy = GENDERED_QUESTIONNAIRE_OPTION_LABELS[value];
  return copy ? getGenderedHebrewCopy(gender, copy) : value;
}
