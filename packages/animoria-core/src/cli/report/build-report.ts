import type { RuleConfigError } from '../../governance/rules-engine.js';
import type { WorkspaceIndexSnapshot } from '../../indexer/workspace-indexer.js';
import { type CheckOutcomePolicy, determineCheckOutcome } from '../check-outcome.js';
import type { GovernanceCheckReport } from './governance-check-report.js';

/** Sentinel rule id used to surface a `.animoriarc` file-level problem through the same shape as a per-rule config error. */
const CONFIG_FILE_PSEUDO_RULE_ID = '<.animoriarc>';

/**
 * Assembles a {@link GovernanceCheckReport} from a workspace snapshot.
 *
 * Deliberately does almost nothing: every number here already exists on
 * `snapshot` or is the direct output of {@link determineCheckOutcome}.
 * This function's only real job is picking a stable shape for renderers
 * to depend on, so that a change to `WorkspaceIndexSnapshot`'s internal
 * structure (an infrastructure concern) doesn't ripple into every
 * `./renderers/*` implementation (a presentation concern).
 *
 * @param snapshot - The workspace state to report on — typically the
 *   result of `WorkspaceIndexer.initialize()` for a one-shot CI run.
 * @param workspacePath - Absolute path that was checked, for display.
 * @param durationMs - Total wall-clock time for the whole check, from
 *   the CLI's perspective (workspace resolution through evaluation) —
 *   distinct from `snapshot`'s own internal timings, which only cover
 *   the indexer's own work.
 * @param policy - Pass/fail policy — see {@link CheckOutcomePolicy}.
 * @param configLoadWarnings - File-level problems loading `.animoriarc`
 *   itself (malformed JSON/YAML, wrong top-level shape), as recorded by
 *   `WorkspaceIndexer`'s own diagnostics for this run. Distinct from
 *   `RuleEngineReport.configErrors` (a specific rule id/value problem
 *   inside an otherwise-valid file) — both are surfaced through the same
 *   `configErrors` field on the resulting report so every renderer only
 *   needs to handle one shape, but this command needs to know about
 *   file-level failures specifically to pick the right exit code (see
 *   `check-command.js`).
 */
export function buildGovernanceCheckReport(
  snapshot: WorkspaceIndexSnapshot,
  workspacePath: string,
  durationMs: number,
  policy: CheckOutcomePolicy,
  configLoadWarnings: readonly string[] = []
): GovernanceCheckReport {
  const diagnostics = snapshot.ruleReport?.diagnostics ?? [];
  const evaluatedRuleIds = snapshot.ruleReport?.evaluatedRuleIds ?? [];
  const healthScore = snapshot.healthScore;

  const configErrors: readonly RuleConfigError[] = [
    ...configLoadWarnings.map((warning) => ({
      ruleId: CONFIG_FILE_PSEUDO_RULE_ID,
      errors: [warning],
    })),
    ...(snapshot.ruleReport?.configErrors ?? []),
  ];

  const outcome = determineCheckOutcome(diagnostics, healthScore?.score ?? null, policy);

  return {
    workspacePath,
    generatedAt: new Date().toISOString(),
    durationMs,
    totalAssetCount: snapshot.assets.length,
    healthScore,
    diagnostics,
    diagnosticCountBySeverity: {
      error: diagnostics.filter((d) => d.severity === 'error').length,
      warning: diagnostics.filter((d) => d.severity === 'warning').length,
    },
    configErrors,
    evaluatedRuleIds,
    outcome,
  };
}
