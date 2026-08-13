import type {
  ActiveRuleSeverity,
  RuleDiagnostic,
  SkippedRule,
} from '../governance/rules-engine.js';

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
  /**
   * True when the run failed *only* because a configured gate could not be
   * evaluated — no asset was found to violate anything. Lets the caller map this to
   * `INCOMPLETE_ANALYSIS` instead of reporting a governance violation that does not
   * exist.
   */
  readonly incomplete: boolean;
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
  policy: CheckOutcomePolicy = {},
  skippedRules: readonly SkippedRule[] = []
): CheckOutcome {
  const reasons: string[] = [];

  const errorCount = diagnostics.filter((d) => isErrorSeverity(d.severity)).length;
  if (errorCount > 0) {
    reasons.push(`${errorCount} rule finding(s) at "error" severity (see the diagnostics above).`);
  }

  // A rule the workspace configured at "error" is a gate the team asked to enforce.
  // If it could not run, this check has not established that the gate holds, and
  // saying "passed" would be a claim the run does not support. Reported as its own
  // failure reason — and mapped to its own exit code — rather than as a violation,
  // because nothing was found to be wrong with any asset.
  const blockingSkips = skippedRules.filter((r) => isErrorSeverity(r.severity));
  for (const skip of blockingSkips) {
    reasons.push(
      `Rule "${skip.ruleId}" is configured at "error" severity but could not be evaluated: ${skip.reason.message}`
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

  return {
    passed: reasons.length === 0,
    failureReasons: reasons,
    incomplete: reasons.length > 0 && errorCount === 0 && blockingSkips.length > 0,
  };
}

function isErrorSeverity(severity: ActiveRuleSeverity): boolean {
  return severity === 'error';
}
