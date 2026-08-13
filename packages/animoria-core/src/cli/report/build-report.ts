import type { WorkspaceAnalysis } from '../../analysis/workspace-analysis.js';
import { type CheckOutcomePolicy, determineCheckOutcome } from '../check-outcome.js';
import type { GovernanceCheckReport } from './governance-check-report.js';

/**
 * Wraps a workspace analysis in the pass/fail decision for one `animoria check` run.
 *
 * Deliberately does almost nothing. It used to copy a dozen fields out of the
 * indexer's result and derive a second opinion about Health Score availability;
 * both of those now live in the analysis, so the only thing left to compute here is
 * the piece of policy that is genuinely the command's own — whether a CI pipeline
 * should stop.
 *
 * @param analysis - The workspace state to report on.
 * @param durationMs - Total wall-clock time for the whole command.
 * @param policy - Pass/fail policy — see {@link CheckOutcomePolicy}.
 */
export function buildGovernanceCheckReport(
  analysis: WorkspaceAnalysis,
  durationMs: number,
  policy: CheckOutcomePolicy
): GovernanceCheckReport {
  return {
    analysis,
    outcome: determineCheckOutcome(
      analysis.diagnostics,
      analysis.health.status === 'computed' ? analysis.health.report.score : null,
      policy,
      analysis.skippedRules
    ),
    durationMs,
    generatedAt: new Date().toISOString(),
  };
}
