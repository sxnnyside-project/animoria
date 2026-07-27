import type { HealthScoreCategoryBreakdown, HealthScoreRecommendation } from './types.js';

const DEFAULT_MAX_RECOMMENDATIONS = 3;

/**
 * Turns a category breakdown into a ranked, deterministic list of
 * actionable recommendations.
 *
 * "Deterministic" here means the same breakdown always produces the
 * same recommendations in the same order — no randomness, no
 * clock-dependent tie-breaking. Ties in `totalPenalty` are broken by
 * `ruleId` alphabetically, which is arbitrary but stable, satisfying
 * that guarantee even in the (rare) case two categories cost exactly the
 * same.
 *
 * Only categories that actually cost something are recommended — a
 * category can theoretically appear in a breakdown with `totalPenalty`
 * of `0` (a custom weight function returning `0` for some diagnostics),
 * and recommending "fix this, it's free" would be noise, not guidance.
 *
 * @param categories - Output of {@link buildCategoryBreakdown}, expected
 *   already sorted by `totalPenalty` descending (this function does not
 *   re-sort, only re-stabilizes ties, to avoid paying for a second sort
 *   of data the caller already ordered).
 * @param maxRecommendations - Upper bound on how many recommendations to
 *   return. Default 3 — enough to be useful, few enough to stay
 *   actionable rather than becoming a restatement of the whole report.
 */
export function buildRecommendations(
  categories: readonly HealthScoreCategoryBreakdown[],
  maxRecommendations: number = DEFAULT_MAX_RECOMMENDATIONS
): readonly HealthScoreRecommendation[] {
  return categories
    .filter((category) => category.totalPenalty > 0)
    .slice() // buildCategoryBreakdown already sorts by penalty desc; stabilize ties only.
    .sort((a, b) => b.totalPenalty - a.totalPenalty || a.ruleId.localeCompare(b.ruleId))
    .slice(0, maxRecommendations)
    .map((category) => ({
      ruleId: category.ruleId,
      message: formatRecommendationMessage(category),
      potentialScoreRecovery: category.totalPenalty,
    }));
}

function formatRecommendationMessage(category: HealthScoreCategoryBreakdown): string {
  const label = humanizeRuleId(category.ruleId);
  const count = category.diagnosticCount;
  const noun = count === 1 ? 'violation' : 'violations';
  const points = roundToOneDecimal(category.totalPenalty);
  return `Resolve ${count} "${label}" ${noun} to recover up to ${points} point(s).`;
}

function humanizeRuleId(ruleId: string): string {
  return ruleId.replace(/-/g, ' ');
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
