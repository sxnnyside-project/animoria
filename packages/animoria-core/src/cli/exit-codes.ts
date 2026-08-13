/**
 * The canonical, exhaustive mapping from CLI outcomes to process exit
 * codes.
 *
 * ## Why this is one table instead of scattered `process.exit(n)` calls
 * A CI/CD system's entire contract with `animoria check` is its exit
 * code — everything else (stdout formatting, log verbosity) is
 * negotiable, but the exit code is what a pipeline's pass/fail gate
 * actually branches on. If the meaning of "2" or "3" were decided
 * ad-hoc at each call site, two code paths could drift into disagreeing
 * about what a given code means, silently breaking any automation built
 * around it. Centralizing the mapping here — and having exactly one
 * place in the CLI (`check-command.js`'s top-level handler) translate an
 * outcome into `process.exitCode` — makes that drift structurally
 * impossible and makes this table the CLI's actual, auditable public
 * contract.
 *
 * ## The categories, and why they're distinct
 * `animoria check` differentiates *why* it didn't return 0, because a
 * CI pipeline (and the human reading its log) needs to react
 * differently to each:
 *
 * - {@link SUCCESS} — governance passed. The only code meaning "nothing
 *   to do here."
 * - {@link GOVERNANCE_VIOLATIONS} — the workspace was analyzed
 *   successfully and the Rule Engine (or Health Score threshold) found
 *   something to fix. This is the expected, "the tool worked, your
 *   repository needs attention" failure — most CI gates should treat
 *   this as "block the merge."
 * - {@link INVALID_USAGE} — the command itself was invoked wrong (bad
 *   flag, bad value). This is a pipeline configuration bug, not a
 *   repository health problem — treating it the same as
 *   `GOVERNANCE_VIOLATIONS` would send someone hunting for asset
 *   problems that don't exist.
 * - {@link WORKSPACE_ERROR} — the given path doesn't exist or isn't a
 *   readable directory. An environment/checkout problem, not a
 *   governance one.
 * - {@link CONFIGURATION_ERROR} — `.animoriarc` exists but is malformed.
 *   Deliberately distinct from a governance failure: the Rule Engine
 *   never got to run rules that might have been configured, so
 *   reporting this as "0 violations, all clear" would be actively
 *   misleading, and reporting it as "governance violations" would hide
 *   that the *real* problem is a typo in a config file, not an asset.
 * - {@link INTERNAL_ERROR} — anything else: an unexpected exception
 *   during scanning, parsing, or reporting. Never disguised as a
 *   governance result — see the CLI's error handling docs for why that
 *   matters.
 */
export const CLI_EXIT_CODES = {
  SUCCESS: 0,
  GOVERNANCE_VIOLATIONS: 1,
  INVALID_USAGE: 2,
  WORKSPACE_ERROR: 3,
  CONFIGURATION_ERROR: 4,
  INTERNAL_ERROR: 5,
  /**
   * A rule the workspace configured at `'error'` severity could not be evaluated,
   * because evidence it depends on was unavailable.
   *
   * Distinct from every other code, and deliberately not folded into
   * {@link GOVERNANCE_VIOLATIONS}: nothing was found to be wrong with the
   * repository, so reporting a violation would be a fabrication — but the gate the
   * team asked for did not run, so reporting success would be worse. This is the
   * "I could not check what you asked me to check" outcome, and a pipeline should
   * treat it as a failure of the tool or environment, not of the assets.
   */
  INCOMPLETE_ANALYSIS: 6,
} as const;

/** A value from {@link CLI_EXIT_CODES}. */
export type CliExitCode = (typeof CLI_EXIT_CODES)[keyof typeof CLI_EXIT_CODES];
