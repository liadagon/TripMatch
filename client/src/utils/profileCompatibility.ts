type CompatibleProfile = {
  preferredDestinations?: readonly string[]; travelStyle?: string; budget?: string; tripDates?: string; tripDuration?: string;
  questionnaire?: { accommodationPreference?: string; companionScope?: string; companionPriority?: string; dealBreaker?: string };
};

const normalize = (value: string | undefined) => value?.trim().toLocaleLowerCase() || "";
function compareValue(first: string | undefined, second: string | undefined) { const a = normalize(first); const b = normalize(second); return a && b ? a === b : null; }
function compareDestinations(first: readonly string[] = [], second: readonly string[] = []) { const values = new Set(first.map(normalize).filter(Boolean)); const candidates = second.map(normalize).filter(Boolean); return values.size && candidates.length ? candidates.some((value) => values.has(value)) : null; }

/**
 * Scores only preference criteria present on both profiles.
 * @param first First profile's travel preferences.
 * @param second Second profile's travel preferences.
 * @returns Percentage plus matched and compared criterion counts.
 */
export function calculateProfileCompatibility(first: CompatibleProfile, second: CompatibleProfile) {
  const comparisons = [compareDestinations(first.preferredDestinations, second.preferredDestinations), compareValue(first.travelStyle, second.travelStyle), compareValue(first.budget, second.budget), compareValue(first.tripDates, second.tripDates), compareValue(first.tripDuration, second.tripDuration), compareValue(first.questionnaire?.accommodationPreference, second.questionnaire?.accommodationPreference), compareValue(first.questionnaire?.companionScope, second.questionnaire?.companionScope), compareValue(first.questionnaire?.companionPriority, second.questionnaire?.companionPriority), compareValue(first.questionnaire?.dealBreaker, second.questionnaire?.dealBreaker)].filter((result): result is boolean => result !== null);
  const matchedCriteria = comparisons.filter(Boolean).length;
  const comparedCriteria = comparisons.length;
  return { percentage: comparedCriteria ? Math.round((matchedCriteria / comparedCriteria) * 100) : 0, matchedCriteria, comparedCriteria };
}
