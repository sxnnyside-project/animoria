import type { HealthScoreReport } from '../../governance/health-score.js';
import type { RuleConfigError, RuleDiagnostic } from '../../governance/rules-engine.js';
import type { CheckOutcome } from '../check-outcome.js';

/**
 * The structured, renderer-agnostic result of one `animoria check` run.
 *
 * ## Why a model instead of "just render Markdown"
 * The original brief for this command asked for Markdown output
 * specifically, for PR bot comments. Markdown is one *rendering* of a
 * governance check result — treating it as the command's actual output
 * contract would mean every future surface (a JSON blob for a
 * dashboard, a GitHub Actions annotation, a SARIF file for code
 * scanning, GitLab's own report format) would either have to scrape
 * Markdown back apart or duplicate the summarization logic that
 * produced it. `GovernanceCheckReport` is that summarization logic's
 * *output*: a plain, fully-computed data structure. Every renderer in
 * `./renderers/` consumes exactly this and nothing else — adding a new
 * output format is "write a function from `GovernanceCheckReport` to a
 * string," never "re-run the check differently."
 *
 * ## Provenance
 * Every field here is either passed through unchanged from
 * `WorkspaceIndexSnapshot`/`RuleEngineReport`/`HealthScoreReport` (see
 * `../../indexer/workspace-indexer.js`) or is the direct, undisputed
 * output of {@link determineCheckOutcome} (`../check-outcome.js`). This
 * module performs no analysis of its own — see `build-report.js` for the
 * (intentionally trivial) assembly function that populates it.
 */
export interface GovernanceCheckReport {
  /** Absolute path to the workspace that was checked. */
  readonly workspacePath: string;
  /** ISO timestamp this report was generated. */
  readonly generatedAt: string;
  /** Total time spent scanning, parsing, and evaluating, in milliseconds. */
  readonly durationMs: number;
  /** Total assets discovered in the workspace. */
  readonly totalAssetCount: number;
  /** The Health Score for this run, or `null` if none could be computed. */
  readonly healthScore: HealthScoreReport | null;
  /** Every diagnostic the Rule Engine produced, unfiltered. */
  readonly diagnostics: readonly RuleDiagnostic[];
  /** Diagnostic count grouped by severity, for quick summarization. */
  readonly diagnosticCountBySeverity: {
    readonly error: number;
    readonly warning: number;
  };
  /** `.animoriarc` entries that referenced an unknown rule or failed validation. */
  readonly configErrors: readonly RuleConfigError[];
  /** Rule ids that actually ran during this check. */
  readonly evaluatedRuleIds: readonly string[];
  /** The pass/fail decision and why — see {@link CheckOutcome}. */
  readonly outcome: CheckOutcome;
}
