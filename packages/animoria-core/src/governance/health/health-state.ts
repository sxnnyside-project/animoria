/**
 * A coarse, human-meaningful bucket for a Health Score — the vocabulary
 * a sidebar header, a CLI summary, or a status bar item should use
 * instead of showing a bare number and leaving the developer to decide
 * whether "72" is fine or alarming.
 *
 * ## Why this exists
 * A numeric score answers "what is the value" but not "should I care
 * right now." Every presentation surface that shows a Health Score
 * needs the same answer to that second question, so it is computed once
 * here rather than re-approximated per surface (a sidebar header
 * choosing its own thresholds independently from a CLI summary would
 * mean the same score could read as "healthy" in one place and
 * "attention needed" in another — exactly the kind of inconsistency a
 * shared governance vocabulary is supposed to prevent).
 */
export type HealthState = 'excellent' | 'good' | 'fair' | 'poor';

/** Inclusive lower bound of each {@link HealthState}, checked highest-first. */
const HEALTH_STATE_THRESHOLDS: readonly { readonly state: HealthState; readonly min: number }[] = [
  { state: 'excellent', min: 90 },
  { state: 'good', min: 75 },
  { state: 'fair', min: 50 },
  { state: 'poor', min: 0 },
];

/**
 * Buckets a Health Score (0–100) into a {@link HealthState}.
 *
 * The thresholds are a deliberate product decision, not a derived
 * statistic — they mirror the weighting philosophy in
 * `default-weights.js`: a handful of warnings shouldn't tip a
 * repository into "poor," but a sustained pattern of unresolved
 * violations should. Adjusting where "good" ends and "fair" begins is a
 * one-line change to {@link HEALTH_STATE_THRESHOLDS}, not a redesign of
 * any caller.
 *
 * @param score - A Health Score in `[0, 100]` — typically
 *   `HealthScoreReport.score`.
 */
export function describeHealthState(score: number): HealthState {
  for (const { state, min } of HEALTH_STATE_THRESHOLDS) {
    if (score >= min) return state;
  }
  return 'poor';
}
