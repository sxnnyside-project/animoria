import type { DiagnosticPenalty, HealthScoreCategoryBreakdown } from './types.js';

/**
 * Aggregates per-diagnostic penalties into per-rule category totals.
 *
 * Kept as a standalone, pure function (rather than folded into
 * {@link HealthScoreEngine.evaluate}) so it can be reused wherever a
 * "what's contributing to this score" view is needed — a sidebar
 * breakdown, a CLI table — without re-running the full evaluation
 * pipeline, and so its grouping/sorting/share-of-deduction math has
 * exactly one place to be correct.
 *
 * @param penalties - Per-diagnostic penalties from {@link calculatePenalties}.
 * @returns One entry per distinct rule id present in `penalties`, sorted
 *   by `totalPenalty` descending — the categories doing the most damage
 *   to the score come first, which is also the order recommendations
 *   are derived in.
 */
export function buildCategoryBreakdown(
  penalties: readonly DiagnosticPenalty[]
): readonly HealthScoreCategoryBreakdown[] {
  const totals = new Map<string, { count: number; penalty: number }>();

  for (const { diagnostic, penalty } of penalties) {
    const entry = totals.get(diagnostic.ruleId) ?? { count: 0, penalty: 0 };
    entry.count += 1;
    entry.penalty += penalty;
    totals.set(diagnostic.ruleId, entry);
  }

  const grandTotal = penalties.reduce((sum, p) => sum + p.penalty, 0);

  const categories = Array.from(totals.entries()).map(([ruleId, entry]) => ({
    ruleId,
    diagnosticCount: entry.count,
    totalPenalty: entry.penalty,
    shareOfDeduction: grandTotal > 0 ? entry.penalty / grandTotal : 0,
  }));

  return categories.sort((a, b) => b.totalPenalty - a.totalPenalty);
}
