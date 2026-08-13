import type { WorkspaceAnalysis } from '../../analysis/workspace-analysis.js';
import type { CheckOutcome } from '../check-outcome.js';

/**
 * The result of one `animoria check` run.
 *
 * ## Why this is a thin wrapper and not a parallel result shape
 * This type used to restate the analysis: its own `diagnostics`, `healthScore`,
 * `healthScoreAvailability`, `coverage`, `readiness`, `skippedRules`,
 * `configErrors`, `evaluatedRuleIds` and per-severity counts, all copied out of the
 * indexer's result and reassembled. Every copy was an opportunity for the CLI's idea
 * of the workspace to drift from Core's, and every new field had to be threaded
 * through by hand.
 *
 * It now carries the analysis itself plus the two things that are genuinely the
 * command's own: whether *this invocation* should be considered a pass, and how long
 * the whole command took. Renderers read `report.analysis.*` — they render Core's
 * answer rather than a restatement of it.
 */
export interface GovernanceCheckReport {
  /** The workspace's canonical analysis — the single source of every governance fact below. */
  readonly analysis: WorkspaceAnalysis;
  /**
   * Pass/fail for this invocation, from {@link determineCheckOutcome}.
   *
   * The one piece of policy the CLI owns: the analysis states what is true, this
   * states whether that should block a pipeline.
   */
  readonly outcome: CheckOutcome;
  /**
   * Total wall-clock time for the command, from workspace resolution through
   * rendering. Distinct from `analysis.durationMs`, which covers only the indexing
   * batch that produced it.
   */
  readonly durationMs: number;
  /** ISO timestamp this report was rendered. */
  readonly generatedAt: string;
}
