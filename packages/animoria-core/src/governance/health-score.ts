import { performance } from 'node:perf_hooks';
import { buildCategoryBreakdown } from './health/category-breakdown.js';
import { DEFAULT_HEALTH_SCORE_WEIGHTS } from './health/default-weights.js';
import { calculatePenalties } from './health/penalty-calculator.js';
import { buildRecommendations } from './health/recommendation-builder.js';
import { normalizeScore } from './health/score-normalizer.js';
import type {
  HealthScoreEvaluationInput,
  HealthScoreOutcome,
  HealthScoreQualification,
  HealthScoreReport,
  HealthScoreWeights,
} from './health/types.js';

export type {
  HealthScoreReport,
  HealthScoreOutcome,
  HealthScoreUnavailableReason,
  HealthScoreQualification,
  HealthScoreEvaluationInput,
  HealthScoreWeights,
  RulePenaltyWeight,
  HealthScoreCategoryBreakdown,
  HealthScoreRecommendation,
  DiagnosticPenalty,
} from './health/types.js';
export { DEFAULT_HEALTH_SCORE_WEIGHTS } from './health/default-weights.js';
export { describeHealthState, type HealthState } from './health/health-state.js';

/** Constructor options for {@link HealthScoreEngine}. */
export interface HealthScoreEngineConfig {
  /** Scoring policy to use. Defaults to {@link DEFAULT_HEALTH_SCORE_WEIGHTS}. */
  readonly weights?: HealthScoreWeights | undefined;
  /** Maximum recommendations to include per report. Default 3. */
  readonly maxRecommendations?: number;
}

/**
 * Translates the Rule Engine's governance diagnostics into a single,
 * intuitive 0–100 Health Score, a per-rule breakdown, and ranked
 * recommendations.
 *
 * ## What this class is — and is not
 * `HealthScoreEngine` is a **scoring policy**, not an analyzer. It never
 * inspects an `AnimoriaAsset`, never touches the filesystem, never
 * re-implements or re-checks anything `RulesEngine`
 * (`./rules-engine.js`) has already decided. Its entire input is a list
 * of {@link RuleDiagnostic}s the Rule Engine already produced; its
 * entire job is turning that list into a number and some explanations.
 * If a future contributor is tempted to add asset-inspection logic to
 * this class — "while we're here, let's also check X" — that logic
 * belongs in a new governance rule instead, so it is visible to
 * `.animoriarc`, testable in isolation, and usable by every other
 * consumer of the Rule Engine, not just this one.
 *
 * ## Why this stays cheap
 * `evaluate` is synchronous and does no I/O: it is a handful of array
 * traversals over a diagnostics list already held in memory. This is
 * intentional and load-bearing — the design goal is to be cheap enough
 * to call after *every* governance refresh (see the reactive indexer,
 * `../indexer/workspace-indexer.js`, which does exactly that), not just
 * on an explicit user action.
 *
 * ## Pipeline
 * `evaluate` composes four independently-testable pure stages, each
 * documented in its own module for exactly why it is separate:
 * 1. {@link calculatePenalties} — diagnostic → weighted penalty.
 * 2. {@link buildCategoryBreakdown} — penalties → per-rule totals.
 * 3. {@link normalizeScore} — total penalty → the public 0–100 score.
 * 4. {@link buildRecommendations} — category totals → ranked suggestions.
 *
 * ## Extension points
 * - To change *how much* a rule's violations cost: override
 *   {@link HealthScoreEngineConfig.weights} — see
 *   `health/default-weights.js` for the shape and Animoria's own
 *   defaults. No engine code changes required, including for rules that
 *   do not exist yet.
 * - To change *how* a raw penalty total becomes a 0–100 score: replace
 *   {@link normalizeScore}'s implementation; nothing else in the
 *   pipeline depends on its internals.
 * - To change how recommendations are worded or ranked: see
 *   `health/recommendation-builder.js`.
 *
 * ## Determinism
 * For a fixed set of diagnostics and a fixed weights configuration,
 * `evaluate` always produces an identical report — no randomness, no
 * hidden mutable state, no dependency on call order across invocations.
 */
export class HealthScoreEngine {
  private readonly _weights: HealthScoreWeights;
  private readonly _maxRecommendations: number;

  constructor(config: HealthScoreEngineConfig = {}) {
    this._weights = config.weights ?? DEFAULT_HEALTH_SCORE_WEIGHTS;
    this._maxRecommendations = config.maxRecommendations ?? 3;
  }

  /**
   * Computes a {@link HealthScoreReport} from a Rule Engine diagnostics
   * list. Safe to call as often as governance state changes — see the
   * class docs for why this is cheap enough to do on every refresh.
   */
  /**
   * Produces a Health Score, or states why one cannot be produced.
   *
   * ## Why this returns an outcome rather than a number
   * The arithmetic below yields 100 for an empty diagnostic list, and an empty
   * diagnostic list has three innocent causes that have nothing to do with health:
   * no assets exist to violate anything, no rules are configured to find anything,
   * or the analysis never finished. Each of them once rendered as
   * `100/100 · Excellent` — the product telling a user their repository was in
   * perfect condition on the strength of never having looked. Refusing to score is
   * the honest answer, and the union makes it impossible for a caller to default
   * its way past.
   *
   * A score that *is* computed may still be qualified: a configured rule that
   * declined to run, or a reference scan that skipped formats, both mean the number
   * is a floor on the problems present rather than a full accounting.
   */
  evaluate(input: HealthScoreEvaluationInput): HealthScoreOutcome {
    const start = performance.now();

    const unavailable = this._describeUnavailability(input);
    if (unavailable) return unavailable;

    const penalties = calculatePenalties(input.diagnostics, this._weights);
    const categories = buildCategoryBreakdown(penalties);
    const totalPenalty = penalties.reduce((sum, p) => sum + p.penalty, 0);
    const score = normalizeScore(totalPenalty);
    const recommendations = buildRecommendations(categories, this._maxRecommendations);

    return {
      status: 'computed',
      report: {
        score,
        totalAssetCount: input.totalAssetCount,
        totalDiagnosticCount: input.diagnostics.length,
        categories,
        recommendations,
        qualifications: this._describeQualifications(input),
        generatedAt: new Date().toISOString(),
        durationMs: performance.now() - start,
      },
    };
  }

  /** The three states in which a score would be arithmetic rather than a verdict. */
  private _describeUnavailability(
    input: HealthScoreEvaluationInput
  ): Extract<HealthScoreOutcome, { status: 'unavailable' }> | null {
    if (!input.analysisComplete) {
      return {
        status: 'unavailable',
        reason: 'incomplete-analysis',
        message:
          'The analysis did not finish, so this score would not reflect the whole workspace.',
      };
    }
    if (input.totalAssetCount === 0) {
      return {
        status: 'unavailable',
        reason: 'no-assets-discovered',
        message:
          'No visual assets were discovered, so there is nothing to score. Check the workspace path and .animoriaignore.',
      };
    }
    if (input.evaluatedRuleCount === 0) {
      return {
        status: 'unavailable',
        reason: 'no-rules-configured',
        message:
          'No governance rules ran, so nothing was enforced. Add a .animoriarc to define a policy.',
      };
    }
    return null;
  }

  /** Caveats that limit a computed score without invalidating it. */
  private _describeQualifications(
    input: HealthScoreEvaluationInput
  ): readonly HealthScoreQualification[] {
    const qualifications: HealthScoreQualification[] = [];

    if (input.skippedRuleCount > 0) {
      qualifications.push({
        code: 'rules-skipped',
        message: `${input.skippedRuleCount} configured rule(s) could not be evaluated, so this score does not account for what they would have found.`,
      });
    }

    if (input.coverageStatus === 'partial') {
      qualifications.push({
        code: 'partial-coverage',
        message:
          'The reference scan did not read every format that can hold a reference, so unreferenced-asset findings — and this score — may understate or overstate the truth.',
      });
    }

    return qualifications;
  }
}
