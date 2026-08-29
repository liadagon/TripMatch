const BOOST_RANKING_BONUS = 8;

/**
 * Adds the bounded Boost bonus without replacing compatibility as the main signal.
 * @param {number} compatibilityPercentage Base compatibility score.
 * @param {boolean} hasBoost Whether the candidate currently has Boost access.
 * @returns {number} Score used by discovery ordering.
 */
function getDiscoverRankingScore(compatibilityPercentage, hasBoost) {
  const compatibility = Number.isFinite(compatibilityPercentage)
    ? compatibilityPercentage
    : 0;
  return compatibility + (hasBoost ? BOOST_RANKING_BONUS : 0);
}

/**
 * Orders discovery candidates by text relevance, ranking score, compatibility, then stable ID.
 * @param {{id: unknown, textScore: number, rankingScore: number, compatibilityPercentage: number}} left First candidate.
 * @param {{id: unknown, textScore: number, rankingScore: number, compatibilityPercentage: number}} right Second candidate.
 * @param {boolean} [preserveTextRelevance=false] Keeps MongoDB text score as the primary search signal.
 * @returns {number} Comparator result for ascending-array sort APIs.
 */
function compareDiscoverCandidates(left, right, preserveTextRelevance = false) {
  if (preserveTextRelevance && left.textScore !== right.textScore) {
    return right.textScore - left.textScore;
  }

  if (left.rankingScore !== right.rankingScore) {
    return right.rankingScore - left.rankingScore;
  }

  if (left.compatibilityPercentage !== right.compatibilityPercentage) {
    return right.compatibilityPercentage - left.compatibilityPercentage;
  }

  return String(left.id).localeCompare(String(right.id));
}

module.exports = {
  BOOST_RANKING_BONUS,
  compareDiscoverCandidates,
  getDiscoverRankingScore,
};
