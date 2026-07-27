import type { ActiveRuleSeverity, RuleDiagnostic } from '../governance/rules-engine.js';

/** Policy inputs for {@link determineCheckOutcome}. */
export interface CheckOutcomePolicy {
  /**
   * Minimum acceptable Health Score, 0–100. A score below this fails the
   * check. `undefined` (the default) disables this gate entirely — a
   * workspace that has never tuned a threshold should not suddenly start
   * failing CI because of a number nobody configured.
   */
  readonly minHealthScore?: number | undefined;
}

/** The result of applying {@link CheckOutcomePolicy} to a governance run. */
export interface CheckOutcome {
  readonly passed: boolean;
  /** Human-readable reasons the check failed. Empty when `passed` is `true`. */
  readonly failureReasons: readonly string[];
}

/**
 * Decides pass/fail for `animoria check`, from data the Rule Engine and
 * Health Score Engine already computed.
 *
 * ## Why this function exists, and why it is not "governance logic"
 * Deciding *whether a diagnostic exists* is the Rule Engine's job
 * (`../governance/rules-engine.js`); deciding *whether the CI build
 * should fail given the diagnostics that already exist* is an
 * automation policy, not a governance one — it produces no new
 * findings about any asset, it only interprets findings that were
 * already produced. That distinction is why this function lives in
 * `cli/`, not `governance/`: moving it into the governance layer would
 * blur the one boundary this whole task is built to protect.
 *
 * ## The default policy
 * With no configuration, the check fails on any `'error'`-severity
 * diagnostic and passes otherwise — `'warning'`-severity diagnostics are
 * visible in the report but do not fail the build, matching how
 * `.animoriarc` severities are meant to be used (a team opts a rule into
 * `'error'` specifically because they want it to gate CI). The Health
 * Score threshold is opt-in (see {@link CheckOutcomePolicy.minHealthScore})
 * so this function's behavior never changes for a workspace that hasn't
 * configured one.
 *
 * @param diagnostics - The Rule Engine's diagnostics for this run.
 * @param healthScore - The Health Score for this run, or `null` if one
 *   could not be computed (e.g. zero rules configured — still a valid,
 *   scoreable state in practice, but callers unable to compute one at
 *   all should pass `null` rather than a fabricated number).
 * @param policy - See {@link CheckOutcomePolicy}.
 */
export function determineCheckOutcome(
  diagnostics: readonly RuleDiagnostic[],
  healthScore: number | null,
  policy: CheckOutcomePolicy = {}
): CheckOutcome {
  const reasons: string[] = [];

  const errorCount = diagnostics.filter((d) => isErrorSeverity(d.severity)).length;
  if (errorCount > 0) {
    reasons.push(
      `${errorCount} rule violation(s) at "error" severity (see the diagnostics above).`
    );
  }

  if (
    policy.minHealthScore !== undefined &&
    healthScore !== null &&
    healthScore < policy.minHealthScore
  ) {
    reasons.push(
      `Health Score ${healthScore} is below the required minimum of ${policy.minHealthScore}.`
    );
  }

  return { passed: reasons.length === 0, failureReasons: reasons };
}

function isErrorSeverity(severity: ActiveRuleSeverity): boolean {
  return severity === 'error';
}
