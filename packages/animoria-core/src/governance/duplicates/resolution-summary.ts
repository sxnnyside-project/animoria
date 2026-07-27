import type { ResolutionPlan, ResolutionSummary } from './types.js';

/** Health Score readings surrounding a plan's execution. See {@link buildResolutionSummary}. */
export interface ResolutionSummaryScores {
  /** Health Score immediately before execution, or `null` if unavailable. */
  readonly before: number | null;
  /** Health Score after the index re-converged post-execution, or `null` if unavailable. */
  readonly after: number | null;
}

/**
 * Assembles the developer-facing closing report for a resolution
 * workflow run — the "Resolution Summary" phase.
 *
 * ## Why this phase exists
 * Without it, a developer who clicks "confirm" is left to infer, from
 * silence, that everything worked — "did it actually update all the
 * references? did anything break?" A workflow that deletes files and
 * rewrites source code owes its user an explicit closing statement, not
 * just a return to the previous screen. Quantifying *impact*
 * (references touched, storage recovered, Health Score movement) rather
 * than only confirming "operation complete" is also what turns this
 * from a file-management action into a governance one.
 *
 * ## Why this takes pre-computed numbers instead of computing them
 * Both Health Score readings are supplied by the caller rather than
 * computed here because *how* to get an accurate "before" and "after"
 * score is an orchestration concern (when to snapshot, whether to wait
 * for the reactive indexer to re-converge after execution) that
 * depends on the surrounding IDE integration's event loop — not
 * something this pure, synchronous assembly function should own. This
 * keeps `resolution-summary.js` trivially testable and guarantees it
 * can never itself trigger a redundant governance re-analysis.
 *
 * @param plan - The plan that was executed.
 * @param scores - Health Score readings from immediately before and
 *   after execution — see {@link ResolutionSummaryScores}.
 * @param remainingDiagnosticCount - Diagnostics, if any, that still
 *   concern the canonical asset after resolution (e.g. it happens to
 *   also be oversized) — `0` renders as "No issues detected."
 */
export function buildResolutionSummary(
  plan: ResolutionPlan,
  scores: ResolutionSummaryScores,
  remainingDiagnosticCount: number
): ResolutionSummary {
  const healthScoreDelta =
    scores.before !== null && scores.after !== null ? scores.after - scores.before : null;

  return {
    removedAssetCount: plan.assetsToDelete.length,
    updatedReferenceCount: plan.referenceUpdates.length,
    recoveredBytes: plan.estimatedSavingsBytes,
    healthScoreBefore: scores.before,
    healthScoreAfter: scores.after,
    healthScoreDelta,
    remainingDiagnosticCount,
  };
}
