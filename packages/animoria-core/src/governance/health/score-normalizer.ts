const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * Converts a raw, unbounded total penalty into the public 0–100 score.
 *
 * Deliberately its own single-purpose function rather than an inline
 * `Math.max(0, 100 - total)` at the call site: normalization is the one
 * part of this system product judgment is most likely to want to change
 * independently of everything else (e.g. swapping a linear falloff for
 * a saturating curve so a handful of violations don't crash the score
 * as hard as forty do) without touching how penalties are computed,
 * grouped, or turned into recommendations. Today's policy is
 * intentionally simple and easy to reason about: every point of raw
 * penalty costs exactly one point of score, floored at 0. A repository
 * with zero diagnostics always scores exactly 100.
 *
 * @param totalPenalty - Sum of every diagnostic's resolved penalty.
 * @returns A score clamped to the inclusive range `[0, 100]`.
 */
export function normalizeScore(totalPenalty: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, MAX_SCORE - totalPenalty));
}
