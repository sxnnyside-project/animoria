import type { RuleDiagnostic } from '../rules-engine.js';
import type { DiagnosticPenalty, HealthScoreWeights } from './types.js';

/**
 * Resolves the raw, pre-normalization penalty for each diagnostic.
 *
 * This is the only place in the Health Score pipeline that reads
 * {@link HealthScoreWeights} — every other stage (category breakdown,
 * normalization, recommendations) operates purely on the resulting
 * {@link DiagnosticPenalty} values and has no notion of "weight" at all.
 * That separation is what lets the weighting policy evolve (new rules,
 * re-tuned constants) without touching how penalties are aggregated,
 * normalized, or turned into recommendations.
 *
 * @param diagnostics - Diagnostics from the Rule Engine's most recent run.
 * @param weights - The scoring policy to apply.
 * @returns One {@link DiagnosticPenalty} per input diagnostic, in the same order.
 */
export function calculatePenalties(
  diagnostics: readonly RuleDiagnostic[],
  weights: HealthScoreWeights
): readonly DiagnosticPenalty[] {
  return diagnostics.map((diagnostic) => ({
    diagnostic,
    penalty: resolvePenalty(diagnostic, weights),
  }));
}

function resolvePenalty(diagnostic: RuleDiagnostic, weights: HealthScoreWeights): number {
  const ruleWeight = weights.perRule[diagnostic.ruleId] ?? weights.defaultWeight;
  const baseWeight = typeof ruleWeight === 'function' ? ruleWeight(diagnostic) : ruleWeight;
  const severityMultiplier = weights.severityMultiplier[diagnostic.severity];
  return baseWeight * severityMultiplier;
}
