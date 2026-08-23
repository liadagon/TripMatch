const BOOST_RANKING_BONUS = 8;

function getDiscoverRankingScore(compatibilityPercentage, hasBoost) {
  const compatibility = Number.isFinite(compatibilityPercentage)
    ? compatibilityPercentage
    : 0;
  return compatibility + (hasBoost ? BOOST_RANKING_BONUS : 0);
}

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
