const normalize = (value) =>
  typeof value === "string" ? value.trim().toLocaleLowerCase() : "";

const compareValue = (first, second) => {
  const firstValue = normalize(first);
  const secondValue = normalize(second);

  if (!firstValue || !secondValue) return null;
  return firstValue === secondValue;
};

const compareDestinations = (first, second) => {
  const firstDestinations = new Set(
    (first || []).map(normalize).filter(Boolean)
  );
  const secondDestinations = (second || []).map(normalize).filter(Boolean);

  if (firstDestinations.size === 0 || secondDestinations.length === 0) {
    return null;
  }

  return secondDestinations.some((destination) =>
    firstDestinations.has(destination)
  );
};

const calculateProfileCompatibility = (firstUser, secondUser) => {
  const comparisons = [
    compareDestinations(
      firstUser.preferredDestinations,
      secondUser.preferredDestinations
    ),
    compareValue(firstUser.travelStyle, secondUser.travelStyle),
    compareValue(firstUser.budget, secondUser.budget),
    compareValue(firstUser.tripDates, secondUser.tripDates),
    compareValue(firstUser.tripDuration, secondUser.tripDuration),
    compareValue(
      firstUser.questionnaire?.accommodationPreference,
      secondUser.questionnaire?.accommodationPreference
    ),
    compareValue(
      firstUser.questionnaire?.companionScope,
      secondUser.questionnaire?.companionScope
    ),
    compareValue(
      firstUser.questionnaire?.companionPriority,
      secondUser.questionnaire?.companionPriority
    ),
    compareValue(
      firstUser.questionnaire?.dealBreaker,
      secondUser.questionnaire?.dealBreaker
    ),
  ].filter((result) => result !== null);
  const matchedCriteria = comparisons.filter(Boolean).length;
  const comparedCriteria = comparisons.length;

  return {
    percentage:
      comparedCriteria === 0
        ? 0
        : Math.round((matchedCriteria / comparedCriteria) * 100),
    matchedCriteria,
    comparedCriteria,
  };
};

module.exports = calculateProfileCompatibility;
