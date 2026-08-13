import type { AnalysisLifecycle } from '../analysis/analysis-lifecycle.js';
import { deriveAnalysisLifecycle } from '../analysis/analysis-lifecycle.js';
import type {
  AnalysisFreshness,
  AnalysisReadiness,
  WorkspaceAnalysis,
} from '../analysis/workspace-analysis.js';
import type { DuplicateGroup } from '../governance/duplicates/types.js';
import type { HealthScoreOutcome } from '../governance/health-score.js';
import type { RuleDiagnostic } from '../governance/rules-engine.js';
import type { AnimoriaAsset } from '../types/asset.js';
import type { WorkspaceIdentity, WorkspaceRoot } from './workspace-identity.js';
import { rootForPath } from './workspace-identity.js';

/**
 * A multi-root workspace's analysis: one per root, aggregated for display.
 *
 * ## Why per-root and not one merged scan (D-05)
 * `.animoriarc` is root-scoped. Two roots may configure different rules, different
 * size limits, different allowed formats — so a single merged analysis would have to
 * pick one configuration and apply it to files it does not govern. Keeping
 * `WorkspaceAnalysis` per-root means each root is analysed under its own policy, and
 * aggregation happens at the presentation layer where no policy is involved.
 *
 * The rejected alternative was a persistent warning naming ignored folders. Cheaper,
 * but a governance tool that knowingly ignores part of the workspace cannot claim
 * workspace-level health.
 *
 * ## What aggregation may and may not do
 * It may **concatenate, count, and attribute**. It may not **merge** anything whose
 * meaning is root-scoped:
 *
 * - Diagnostics are concatenated with their root recorded.
 * - Duplicate groups are **not** merged across roots by filename. Two files named
 *   `logo.json` under different roots are the same *name*, not the same *asset*, and
 *   D-19 already established that a name collision and a content duplicate are
 *   different findings with opposite consequences. Cross-root grouping happens only
 *   on content hash, and only where the hash is genuinely equal.
 * - Health is **not** averaged. An average of two scores is a number no engine
 *   computed, which is precisely the fabrication the whole migration removed. The
 *   aggregate reports each root's outcome and, for a single-root workspace, that
 *   root's score unchanged.
 */

/** One root's analysis, tagged with the root it describes. */
export interface RootAnalysis {
  readonly root: WorkspaceRoot;
  readonly analysis: WorkspaceAnalysis;
}

/** A diagnostic, with the root it belongs to. */
export interface AttributedDiagnostic {
  readonly rootId: string;
  readonly rootName: string;
  readonly diagnostic: RuleDiagnostic;
}

/** An asset, with the root it belongs to. */
export interface AttributedAsset {
  readonly rootId: string;
  readonly rootName: string;
  readonly asset: AnimoriaAsset;
}

/**
 * Health across a multi-root workspace.
 *
 * Deliberately not a number. `scores` reports what each root's engine produced;
 * `unavailableRootCount` says how many could not be scored. A client renders the
 * per-root breakdown, or — in the single-root case — the one score verbatim.
 */
export interface AggregateHealth {
  readonly perRoot: readonly { readonly rootId: string; readonly outcome: HealthScoreOutcome }[];
  /**
   * The single root's outcome when there is exactly one, otherwise `null`.
   *
   * `null` for multi-root is the whole point: there is no workspace-level score, and
   * inventing one by averaging would be a fabricated measurement.
   */
  readonly singleRootOutcome: HealthScoreOutcome | null;
  readonly unavailableRootCount: number;
}

/** Everything a client needs about a workspace, however many roots it has. */
export interface MultiRootAnalysis {
  readonly workspace: WorkspaceIdentity;
  readonly generatedAt: string;
  /**
   * The maximum generation across roots.
   *
   * A plan is stale when *any* root has moved on, because a new file in root B can
   * make an asset in root A referenced. Taking the maximum means any root's advance
   * invalidates every plan — conservative, and correct for the same reason
   * `isProposalStale` compares whole analyses rather than individual candidates.
   */
  readonly generation: number;
  readonly roots: readonly RootAnalysis[];
  readonly readiness: AnalysisReadiness;
  readonly freshness: AnalysisFreshness;
  readonly lifecycle: AnalysisLifecycle;
  readonly assets: readonly AttributedAsset[];
  readonly diagnostics: readonly AttributedDiagnostic[];
  /** Content-hash groups, which may legitimately span roots. Never name-based across roots. */
  readonly duplicateGroups: readonly DuplicateGroup[];
  readonly health: AggregateHealth;
  readonly totalDurationMs: number;
}

/**
 * Aggregates per-root analyses.
 *
 * Pure. Every value here is either copied from a root's analysis or counted from
 * them; nothing is derived that an engine did not already compute.
 */
export function aggregateAnalyses(
  workspace: WorkspaceIdentity,
  perRoot: readonly RootAnalysis[]
): MultiRootAnalysis {
  const assets: AttributedAsset[] = [];
  const diagnostics: AttributedDiagnostic[] = [];

  for (const { root, analysis } of perRoot) {
    for (const asset of analysis.assets) {
      assets.push({ rootId: root.id, rootName: root.name, asset });
    }
    for (const diagnostic of analysis.diagnostics) {
      diagnostics.push({ rootId: root.id, rootName: root.name, diagnostic });
    }
  }

  // Readiness is the conjunction: the workspace is only as established as its least
  // established root. Reporting `complete` while one root is still scanning would let
  // a client render a verdict over a partial asset set.
  const readiness: AnalysisReadiness = {
    assetsIndexed: perRoot.every((entry) => entry.analysis.readiness.assetsIndexed),
    referencesResolved: perRoot.every((entry) => entry.analysis.readiness.referencesResolved),
    duplicatesResolved: perRoot.every((entry) => entry.analysis.readiness.duplicatesResolved),
    complete: perRoot.every((entry) => entry.analysis.readiness.complete),
  };

  // Any stale root makes the workspace stale, for the same reason as `generation`.
  const freshness: AnalysisFreshness = perRoot.some((entry) => entry.analysis.freshness === 'stale')
    ? 'stale'
    : 'current';

  const firstFailure = perRoot.find((entry) => entry.analysis.failure !== null);
  const worstCoverage = pickWorstCoverage(perRoot);

  // The lifecycle is derived from a synthetic analysis carrying the aggregate's own
  // readiness, freshness, failure and coverage — so there is still exactly one
  // definition of the six states, rather than a second one for multi-root.
  const lifecycle = deriveAnalysisLifecycle({
    ...(perRoot[0]?.analysis ?? emptyAnalysisShape(workspace)),
    readiness,
    freshness,
    failure: firstFailure?.analysis.failure ?? null,
    coverage: worstCoverage,
    assets: assets.map((entry) => entry.asset),
    diagnostics: diagnostics.map((entry) => entry.diagnostic),
    skippedRules: perRoot.flatMap((entry) => entry.analysis.skippedRules),
  } as WorkspaceAnalysis);

  const perRootHealth = perRoot.map((entry) => ({
    rootId: entry.root.id,
    outcome: entry.analysis.health,
  }));

  return {
    workspace,
    generatedAt: new Date().toISOString(),
    generation: perRoot.reduce((max, entry) => Math.max(max, entry.analysis.generation), 0),
    roots: perRoot,
    readiness,
    freshness,
    lifecycle,
    assets,
    diagnostics,
    duplicateGroups: mergeContentDuplicateGroups(perRoot),
    health: {
      perRoot: perRootHealth,
      singleRootOutcome: workspace.isSingleRoot && perRoot[0] ? perRoot[0].analysis.health : null,
      unavailableRootCount: perRootHealth.filter((entry) => entry.outcome.status === 'unavailable')
        .length,
    },
    totalDurationMs: perRoot.reduce((sum, entry) => sum + entry.analysis.durationMs, 0),
  };
}

/**
 * The least trustworthy coverage across roots.
 *
 * A workspace's absence findings are only as good as its worst-covered root: if one
 * root could not be scanned, "nothing references this asset" is not something the
 * workspace can claim, even if the other roots scanned perfectly.
 */
function pickWorstCoverage(perRoot: readonly RootAnalysis[]): WorkspaceAnalysis['coverage'] {
  const rank: Record<string, number> = { unknown: 0, none: 1, partial: 2, complete: 3 };
  let worst: WorkspaceAnalysis['coverage'] = null;

  for (const { analysis } of perRoot) {
    const coverage = analysis.coverage;
    if (!coverage) continue;
    if (!worst || (rank[coverage.status] ?? 0) < (rank[worst.status] ?? 0)) worst = coverage;
  }
  return worst;
}

/**
 * Duplicate groups across roots — **content hash only**.
 *
 * Two assets in different roots are duplicates when their bytes are identical, and
 * only then. Grouping by filename across roots would report `acme/logo.json` and
 * `globex/logo.json` as duplicates of one another, and offer to delete one — losing
 * a client's asset because two unrelated projects named a file the same way.
 *
 * `no-duplicate-names` stays root-scoped for the same reason: a naming collision is a
 * problem *within* a codebase a developer navigates, and two separate projects are
 * not one codebase.
 */
function mergeContentDuplicateGroups(perRoot: readonly RootAnalysis[]): readonly DuplicateGroup[] {
  const byHash = new Map<string, DuplicateGroup>();

  for (const { analysis } of perRoot) {
    for (const group of analysis.duplicateGroups) {
      if (group.matchKind !== 'content-hash') {
        // Root-scoped: emitted as-is, never combined with another root's.
        byHash.set(`${group.matchKind}:${group.id}`, group);
        continue;
      }

      const existing = byHash.get(group.contentHash);
      if (!existing) {
        byHash.set(group.contentHash, group);
        continue;
      }

      const candidates = [...existing.candidates, ...group.candidates];
      byHash.set(group.contentHash, {
        ...existing,
        candidates,
        potentialSavingsBytes: (candidates.length - 1) * existing.sizeBytes,
      });
    }
  }

  return [...byHash.values()];
}

/** A minimal shape for the lifecycle derivation when there are no roots yet. */
function emptyAnalysisShape(workspace: WorkspaceIdentity): WorkspaceAnalysis {
  return {
    workspacePath: workspace.roots[0]?.path ?? '',
    generatedAt: new Date().toISOString(),
    generation: 0,
    durationMs: 0,
    readiness: {
      assetsIndexed: false,
      referencesResolved: false,
      duplicatesResolved: false,
      complete: false,
    },
    assets: [],
    coverage: null,
    referenceCounts: new Map(),
    referenceIndex: null,
    diagnostics: [],
    evaluatedRuleIds: [],
    skippedRules: [],
    configErrors: [],
    duplicateGroups: [],
    health: {
      status: 'unavailable',
      reason: 'no-assets-discovered',
      message: 'No workspace root has been indexed yet.',
    },
    freshness: 'current',
    failure: null,
  } as WorkspaceAnalysis;
}

/** The root an asset belongs to, for a client rendering an attributed list. */
export function attributeAsset(
  workspace: WorkspaceIdentity,
  assetPath: string
): WorkspaceRoot | null {
  return rootForPath(workspace, assetPath);
}
