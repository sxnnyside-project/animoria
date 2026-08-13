import type { DuplicateGroup } from '../governance/duplicates/types.js';
import type { HealthScoreOutcome } from '../governance/health-score.js';
import type { RuleConfigError, RuleDiagnostic, SkippedRule } from '../governance/rules-engine.js';
import type { AnimoriaAsset } from '../types/asset.js';
import type { ScanCoverage } from '../types/scan-coverage.js';
import type { ReferenceIndexSummary } from '../usage/reference-index.js';

/**
 * Which parts of the analysis have actually been established.
 *
 * Publishing readiness is what stops a partial result from being read as a complete
 * one: a snapshot committed before reference evidence exists is the right thing to
 * paint a tree view from and the wrong thing to render a verdict from, and nothing
 * in the value itself used to say which it was.
 */
export interface AnalysisReadiness {
  /** Assets have been discovered and parsed. */
  readonly assetsIndexed: boolean;
  /** Source-reference evidence has been established for every indexed asset. */
  readonly referencesResolved: boolean;
  /** Content hashes have been computed, so duplicate groups are known. */
  readonly duplicatesResolved: boolean;
  /** True only when every other field is true — i.e. this analysis supports a verdict. */
  readonly complete: boolean;
}

/**
 * Everything Animoria knows about a workspace, in one value.
 *
 * ## Why this type exists
 * Animoria used to produce two incompatible governance results from two independent
 * pipelines. `RulesEngine` + `HealthScoreEngine` produced diagnostics and a score;
 * `GovernanceAnalyzer` separately produced `unused` / `duplicate` / `overused`
 * categories that fed nothing into that score and used a different vocabulary. Both
 * were surfaced in the same sidebar, so a workspace could display
 * `Health Score: 100/100 · Excellent` directly above a list of its own governance
 * problems. Every client then finished the reasoning itself, and finished it
 * differently — three Health Score formulas, two duplicate models, two confidence
 * scales.
 *
 * `WorkspaceAnalysis` is the single answer. A client renders it or maps it onto a
 * platform surface; no client recomputes any part of it, and none needs to run a
 * second analysis to fill a gap.
 *
 * ## What is deliberately *not* here
 * **Cleanup candidates.** Deciding which assets a developer should be *offered for
 * removal* is a policy applied to this analysis, not a fact about the workspace —
 * it depends on confidence thresholds and on what the caller intends to do. It is
 * derived by `buildCleanupCandidates(analysis)`, so the analysis stays a description
 * and remediation stays a decision made from it.
 */
export interface WorkspaceAnalysis {
  /** Absolute path to the workspace root this analysis describes. */
  readonly workspacePath: string;
  /** ISO timestamp this analysis was assembled. */
  readonly generatedAt: string;
  /**
   * Monotonically increasing counter, one per applied batch. Two analyses with the
   * same generation are identical; purely an observability aid.
   */
  readonly generation: number;
  /** Wall-clock time spent producing the batch behind this analysis. */
  readonly durationMs: number;

  /** What this analysis is and is not able to answer. Check before rendering a verdict. */
  readonly readiness: AnalysisReadiness;

  /** Every currently-known animated asset. */
  readonly assets: readonly AnimoriaAsset[];

  /**
   * What the reference scan examined, or `null` when none has run. Every absence
   * finding in {@link diagnostics} carries its own copy; this is the run-level view.
   */
  readonly coverage: ScanCoverage | null;
  /** Source-reference count per asset path. */
  readonly referenceCounts: ReadonlyMap<string, number>;
  /** Shape and cost of the reference scan, or `null` when none has run. */
  readonly referenceIndex: ReferenceIndexSummary | null;

  /** Every governance finding, from the one rule engine. */
  readonly diagnostics: readonly RuleDiagnostic[];
  /** Rules that evaluated. Disjoint from {@link skippedRules}. */
  readonly evaluatedRuleIds: readonly string[];
  /** Rules that were configured but declined to run, and why. */
  readonly skippedRules: readonly SkippedRule[];
  /** `.animoriarc` entries that could not be turned into a running rule. */
  readonly configErrors: readonly RuleConfigError[];

  /**
   * Byte-identical asset groups. Carried here as well as inside the
   * `no-duplicate-content` diagnostics because the duplicate-resolution workflow
   * needs the *group* (its candidates, their reference counts, the canonical
   * suggestion), not one asset's view of it.
   */
  readonly duplicateGroups: readonly DuplicateGroup[];

  /** The one Health Score, or the reason there is none. */
  readonly health: HealthScoreOutcome;

  /**
   * Whether the workspace has changed since this analysis was assembled.
   *
   * `stale` means filesystem signals have arrived that this analysis predates — not
   * that it is old. Two analyses a second apart may both be `current`; one built an
   * hour ago in an untouched workspace still is. Clients used to answer this
   * question themselves, each differently: VS Code compared `generation` on cleanup
   * proposals only, JetBrains never asked, and the sandbox had no concept of it.
   *
   * A destructive action must never run against `stale`. See
   * `executeCleanupPlan`, which re-checks regardless of whether the client did.
   */
  readonly freshness: AnalysisFreshness;

  /**
   * Why this analysis could not be produced, or `null` when it was.
   *
   * Distinct from an empty workspace: `assets: []` with `failure: null` is a
   * workspace with no animated assets — a fact. `failure` set means Animoria could
   * not establish the facts at all, which is a different thing to tell a developer
   * and a different screen to show them.
   */
  readonly failure: AnalysisFailure | null;
}

/** Whether an analysis still describes the workspace it was built from. */
export type AnalysisFreshness = 'current' | 'stale';

/** Why an analysis could not be produced. */
export interface AnalysisFailure {
  /** Stable code, safe to branch on. */
  readonly reason: 'workspace-unreadable' | 'workspace-missing' | 'scan-failed' | 'config-invalid';
  /** Developer-readable explanation, safe to render standalone. */
  readonly message: string;
}

/** Total assets in the analysis. Convenience for surfaces that only need the count. */
export function totalAssetCount(analysis: WorkspaceAnalysis): number {
  return analysis.assets.length;
}

/** Diagnostics for one asset path. */
export function diagnosticsForAsset(
  analysis: WorkspaceAnalysis,
  assetPath: string
): readonly RuleDiagnostic[] {
  return analysis.diagnostics.filter((d) => d.asset.path === assetPath);
}

/** The duplicate group an asset belongs to, or `undefined` when it is not duplicated. */
export function duplicateGroupForAsset(
  analysis: WorkspaceAnalysis,
  assetPath: string
): DuplicateGroup | undefined {
  return analysis.duplicateGroups.find((group) =>
    group.candidates.some((candidate) => candidate.asset.path === assetPath)
  );
}

/** Diagnostic counts by severity — the summary nearly every surface opens with. */
export function diagnosticCountBySeverity(analysis: WorkspaceAnalysis): {
  readonly error: number;
  readonly warning: number;
} {
  let error = 0;
  let warning = 0;
  for (const diagnostic of analysis.diagnostics) {
    if (diagnostic.severity === 'error') error++;
    else warning++;
  }
  return { error, warning };
}
