import type { ActiveRuleSeverity, RuleDiagnostic } from '../rules-engine.js';

/**
 * Contracts for the Health Score system.
 *
 * ## Why the Health Score is not another analyzer
 * `RulesEngine` (see `../rules-engine.js`) is Animoria's one and only
 * governance domain layer: it is the sole place that decides what
 * counts as a violation and at what severity. The Health Score's job is
 * strictly downstream of that decision — it answers "given the
 * violations the Rule Engine already found, how healthy does this
 * repository look, and what's worth fixing first?" It never inspects an
 * asset, never re-derives whether something is unreferenced, oversized,
 * or duplicated, and never touches the filesystem. Every type in this
 * module is expressed in terms of {@link RuleDiagnostic} — the Rule
 * Engine's own output — precisely so that duplicating governance logic
 * here is not merely discouraged but structurally impossible: there is
 * no asset-level API to call.
 *
 * ## Why weights are data, not code
 * A naive scorer grows a branch (`if (ruleId === 'no-gif') ... else if
 * (ruleId === 'max-file-size-kb') ...`) for every rule the Rule Engine
 * ever gains, coupling the scoring engine to the exact set of rules that
 * exist today. This module instead expresses "how much does a violation
 * of rule X cost" as a lookup table (see
 * {@link "./default-weights.js" | HealthScoreWeights}) with one
 * documented fallback for rules it has never heard of. A brand-new
 * governance rule participates in scoring automatically, at a sane
 * default weight, the moment it starts producing diagnostics — no
 * change to this module or the engine that reads it.
 */

/**
 * Computes a numeric penalty for a single diagnostic.
 *
 * Most rules are adequately represented by a flat weight (see
 * {@link HealthScoreWeights.defaultWeight}), but some diagnostics carry
 * information worth scaling by — `max-file-size-kb` violations are
 * worse the further over the limit they are; `no-unreferenced-assets`
 * violations are worse for a 5 MB asset than a 2 KB one. A function form
 * lets a weight table entry express that scaling *as data configuration
 * for that one rule*, without teaching the scoring engine itself
 * anything about what the rule means. `diagnostic.asset` and
 * `diagnostic.details` — both already present on every
 * {@link RuleDiagnostic} — are the only inputs such a function needs;
 * nothing here re-reads a file or re-runs a rule.
 */
export type RulePenaltyWeight = number | ((diagnostic: RuleDiagnostic) => number);

/**
 * The complete, tunable scoring policy: how much a violation of a given
 * rule costs, and how severity scales that cost.
 *
 * This is the one piece of the Health Score system meant to be
 * overridden per workspace or product tier — e.g. a stricter internal
 * tool might weight `no-gif` far higher than the shipped default. See
 * {@link "./default-weights.js" | DEFAULT_HEALTH_SCORE_WEIGHTS} for
 * Animoria's built-in policy and the reasoning behind each weight.
 */
export interface HealthScoreWeights {
  /**
   * Penalty weight keyed by rule id (e.g. `"no-gif"`). A rule id absent
   * from this table falls back to {@link defaultWeight} — this is what
   * makes a brand-new rule "just work" at a reasonable default instead
   * of silently contributing zero penalty until someone remembers to
   * configure it.
   */
  readonly perRule: Readonly<Record<string, RulePenaltyWeight>>;
  /** Weight applied to a diagnostic whose rule id has no entry in {@link perRule}. */
  readonly defaultWeight: number;
  /**
   * Multiplier applied on top of a diagnostic's rule weight based on its
   * severity. Kept as data (not an engine-level `if (severity ===
   * 'error')`) for the same reason rule weights are: a workspace that
   * wants warnings to barely matter, or to matter almost as much as
   * errors, changes this table — not the engine.
   */
  readonly severityMultiplier: Readonly<Record<ActiveRuleSeverity, number>>;
}

/**
 * The resolved penalty contribution of one diagnostic, after applying
 * {@link HealthScoreWeights}. An intermediate value — not part of the
 * public report — kept as its own type so the pipeline stages that
 * produce and consume it (`penalty-calculator.js`,
 * `category-breakdown.js`) can be tested independently of the full
 * {@link HealthScoreEngine} evaluation.
 */
export interface DiagnosticPenalty {
  readonly diagnostic: RuleDiagnostic;
  readonly penalty: number;
}

/**
 * How much a single rule contributed to the overall deduction, and how
 * many of its violations were involved.
 *
 * "Category" here is deliberately just the rule id: `RuleDiagnostic`
 * carries no separate taxonomy, and inventing one the Health Score alone
 * understands would itself be a second, competing classification of
 * governance data — exactly the duplication this system is built to
 * avoid. A rule id *is* a meaningful category (`"no-gif"`,
 * `"max-file-size-kb"`, ...); this type just aggregates by it.
 */
export interface HealthScoreCategoryBreakdown {
  readonly ruleId: string;
  /** Number of diagnostics from this rule. */
  readonly diagnosticCount: number;
  /** Sum of this rule's diagnostics' penalties, before normalization. */
  readonly totalPenalty: number;
  /**
   * This category's share of the total raw penalty across all
   * categories, in `[0, 1]`. `0` when there is no penalty at all (a
   * perfectly healthy report). Useful for presentation (e.g. a
   * proportional bar chart) without recomputing totals.
   */
  readonly shareOfDeduction: number;
}

/**
 * One deterministic, actionable suggestion, ranked by how much score is
 * available to recover by addressing it.
 */
export interface HealthScoreRecommendation {
  /** Which rule's violations this recommendation addresses. */
  readonly ruleId: string;
  /** Human-readable, standalone suggestion text. */
  readonly message: string;
  /**
   * The score this category is currently costing — i.e. the upper bound
   * on how many points resolving every diagnostic in this category could
   * recover. Approximate in the sense that resolving some violations may
   * change others' magnitude-scaled penalties (e.g. shrinking an
   * oversized file changes its own penalty) — it is not a promise, but a
   * deterministic, reproducible estimate from the current report.
   */
  readonly potentialScoreRecovery: number;
}

/**
 * The complete output of one {@link HealthScoreEngine.evaluate} call.
 *
 * Immutable and fully self-describing: everything needed to render a
 * sidebar widget, a CLI summary, or a CI annotation is present, without
 * the presentation layer needing to re-derive anything from the
 * underlying {@link RuleDiagnostic}s itself.
 */
export interface HealthScoreReport {
  /** Overall health, 0–100. Higher is healthier; 100 means zero diagnostics. */
  readonly score: number;
  /**
   * Total assets the underlying governance run considered. Passed
   * through from the caller for display context only (e.g. "Health
   * Score: 92/100 across 340 assets") — the Health Score engine never
   * inspects the asset list itself.
   */
  readonly totalAssetCount: number;
  /** Total number of diagnostics the score was computed from. */
  readonly totalDiagnosticCount: number;
  /** Per-rule breakdown of contributed penalty, sorted by `totalPenalty` descending. */
  readonly categories: readonly HealthScoreCategoryBreakdown[];
  /** Deterministic, ranked recommendations — see {@link HealthScoreRecommendation}. */
  readonly recommendations: readonly HealthScoreRecommendation[];
  /** ISO timestamp this report was computed. */
  readonly generatedAt: string;
  /** Wall-clock duration of this evaluation, in milliseconds. Always small — see class docs. */
  readonly durationMs: number;
}

/** Input to a single {@link HealthScoreEngine.evaluate} call. */
export interface HealthScoreEvaluationInput {
  /**
   * Diagnostics produced by the Rule Engine's most recent run. This is
   * the *entire* signal the Health Score is computed from — see the
   * module docs for why.
   */
  readonly diagnostics: readonly RuleDiagnostic[];
  /**
   * Total assets in the workspace, for display context only (see
   * {@link HealthScoreReport.totalAssetCount}). Pass `0` if unknown;
   * it does not affect the score itself.
   */
  readonly totalAssetCount: number;
}
