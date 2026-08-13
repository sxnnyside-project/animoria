import type {
  AnalysisLifecycle,
  AnimoriaAsset,
  AttributedAsset,
  AttributedDiagnostic,
  Confidence,
  DuplicateGroup,
  HealthScoreOutcome,
  MultiRootAnalysis,
  RuleDiagnostic,
  ScanCoverage,
  WorkspaceRoot,
} from '@animoria/core/contracts';
import {
  CLEANUP_REASON_LABELS,
  CONFIDENCE_LABELS,
  COVERAGE_LABELS,
  LIFECYCLE_LABELS,
} from '@animoria/core/contracts';

/**
 * The one adaptation layer between `MultiRootAnalysis` and the components.
 *
 * ## The line this layer must not cross
 * It may **group, sort, count, filter and label**. It may not **classify, threshold,
 * score, or resolve a path**. Every judgement here is one Core already made and this
 * layer is quoting; every root attribution is one Core already made and this layer is
 * carrying.
 *
 * That second half is U5's addition and is easy to get wrong. The tempting shortcut
 * is `asset.path.startsWith(root.path)` — four lines, obviously correct, and a
 * reimplementation of workspace-root resolution in the presentation layer that gets
 * `/workspace-old` wrong the same way every prefix test does. `MultiRootAnalysis`
 * already carries `rootId` on every asset and every diagnostic. This layer reads it.
 *
 * The rule, stated so a reviewer can apply it: **if a line of this file contains a
 * comparison operator against a domain value, or a path operation, it is probably
 * wrong.** Sorting by size is fine. `refs > 10` is not. `path.startsWith` is not.
 */

// ── Root filtering ────────────────────────────────────────────────────────────

/**
 * Which roots a view is showing.
 *
 * `'all'` is the default, deliberately: a developer opening the panel wants to see
 * their workspace, not a picker. Filtering is an affordance for narrowing, never a
 * gate in front of the content.
 */
export type RootFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'root'; readonly rootId: string };

export const ALL_ROOTS: RootFilter = { kind: 'all' };

// ── Sections ──────────────────────────────────────────────────────────────────

/** One group of findings, keyed by the rule that produced them. */
export interface FindingSection {
  readonly ruleId: string;
  /** Rule id humanized. The rule owns its name; this only formats it. */
  readonly label: string;
  readonly diagnostics: readonly AttributedDiagnostic[];
}

/** One root, with the counts a selector needs to be informative. */
export interface RootSummary {
  readonly root: WorkspaceRoot;
  readonly assetCount: number;
  readonly findingCount: number;
  readonly health: HealthScoreOutcome;
  readonly coverage: ScanCoverage | null;
}

/** Everything a screen needs, derived once per analysis and filter. */
export interface AnalysisViewModel {
  readonly analysis: MultiRootAnalysis;
  readonly lifecycle: AnalysisLifecycle;
  readonly lifecycleLabel: string;

  // ── Roots ──
  readonly roots: readonly RootSummary[];
  readonly filter: RootFilter;
  /** True when the workspace has one root — hosts the selector should not render. */
  readonly isSingleRoot: boolean;
  /** The root a `root` filter names, or `null` when showing all. */
  readonly activeRoot: WorkspaceRoot | null;

  // ── Filtered content ──
  readonly assets: readonly AttributedAsset[];
  readonly assetCount: number;
  readonly sections: readonly FindingSection[];
  readonly findingCount: number;
  readonly diagnosticsByAssetPath: ReadonlyMap<string, readonly RuleDiagnostic[]>;
  readonly rootIdByAssetPath: ReadonlyMap<string, string>;
  readonly referenceCounts: ReadonlyMap<string, number>;
  readonly duplicateGroups: readonly DuplicateGroup[];
  /** Groups whose candidates span more than one root. Rendered with a caveat. */
  readonly crossRootGroupIds: ReadonlySet<string>;

  // ── Verdicts ──
  /**
   * The health outcome to render, or `null` when there is none to render.
   *
   * `null` for a multi-root workspace under the `all` filter — Core reports
   * `singleRootOutcome: null` there, because an average of two engine-computed scores
   * is a third number no engine computed. Under a `root` filter it is that root's
   * outcome, unchanged.
   */
  readonly health: HealthScoreOutcome | null;
  readonly coverage: ScanCoverage | null;
  readonly coverageLabel: string;
  readonly isEmpty: boolean;
  readonly allowsDestructiveActions: boolean;
}

function humanizeRuleId(ruleId: string): string {
  const words = ruleId.replace(/^no-/, '').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Which root a duplicate candidate belongs to.
 *
 * Read from the attribution the analysis already made, never derived from the path.
 * `undefined` when the candidate is not in the attributed asset list — which happens
 * for a group naming an asset a filter has excluded, and is the correct answer.
 */
function rootIdFor(
  rootIdByAssetPath: ReadonlyMap<string, string>,
  assetPath: string
): string | undefined {
  return rootIdByAssetPath.get(assetPath);
}

/**
 * Builds the view model. Pure; call it whenever a new analysis or filter arrives.
 *
 * Deliberately derives everything in one pass rather than exposing helpers each
 * component calls. Three components each computing "findings for this asset" is three
 * chances to compute it differently, and that is the shape of the bug this package
 * exists to remove — not a performance concern.
 */
export function buildAnalysisViewModel(
  analysis: MultiRootAnalysis,
  filter: RootFilter = ALL_ROOTS
): AnalysisViewModel {
  const isSingleRoot = analysis.workspace.isSingleRoot;

  // A filter naming a root that no longer exists degrades to `all` rather than
  // showing an empty workspace. A removed folder must not look like an empty one.
  const activeRoot =
    filter.kind === 'root'
      ? (analysis.workspace.roots.find((root) => root.id === filter.rootId) ?? null)
      : null;
  const effectiveFilter: RootFilter = filter.kind === 'root' && !activeRoot ? ALL_ROOTS : filter;

  const matches = (rootId: string): boolean =>
    effectiveFilter.kind === 'all' || effectiveFilter.rootId === rootId;

  // ── Roots ──
  const healthByRoot = new Map(
    analysis.health.perRoot.map((entry) => [entry.rootId, entry.outcome])
  );

  const roots: RootSummary[] = analysis.roots.map(({ root, analysis: rootAnalysis }) => ({
    root,
    assetCount: rootAnalysis.assets.length,
    findingCount: rootAnalysis.diagnostics.length,
    health: healthByRoot.get(root.id) ?? rootAnalysis.health,
    coverage: rootAnalysis.coverage,
  }));

  // ── Filtered content ──
  const assets = analysis.assets.filter((entry) => matches(entry.rootId));
  const diagnostics = analysis.diagnostics.filter((entry) => matches(entry.rootId));

  const byAsset = new Map<string, RuleDiagnostic[]>();
  const byRule = new Map<string, AttributedDiagnostic[]>();

  for (const entry of diagnostics) {
    const forAsset = byAsset.get(entry.diagnostic.asset.path);
    if (forAsset) forAsset.push(entry.diagnostic);
    else byAsset.set(entry.diagnostic.asset.path, [entry.diagnostic]);

    const forRule = byRule.get(entry.diagnostic.ruleId);
    if (forRule) forRule.push(entry);
    else byRule.set(entry.diagnostic.ruleId, [entry]);
  }

  // Attribution, carried not derived. This map is what lets a component answer
  // "which root is this asset in?" without touching a path.
  const rootIdByAssetPath = new Map<string, string>();
  for (const entry of analysis.assets) rootIdByAssetPath.set(entry.asset.path, entry.rootId);

  // Reference counts merged across roots. Paths are absolute and roots do not
  // overlap, so no key can collide — which is precisely why identity is the canonical
  // path rather than a display name.
  const referenceCounts = new Map<string, number>();
  for (const { root, analysis: rootAnalysis } of analysis.roots) {
    if (!matches(root.id)) continue;
    const refCounts = rootAnalysis.referenceCounts;
    const entries: Iterable<readonly [unknown, unknown]> = !refCounts
      ? []
      : refCounts instanceof Map
        ? refCounts.entries()
        : Array.isArray(refCounts)
          ? refCounts
          : Object.entries(refCounts);

    for (const [path, count] of entries) {
      if (typeof path === 'string' && typeof count === 'number') {
        referenceCounts.set(path, count);
      }
    }
  }

  const sections: FindingSection[] = [...byRule.entries()]
    .map(([ruleId, entries]) => ({
      ruleId,
      label: humanizeRuleId(ruleId),
      diagnostics: entries,
    }))
    .sort(
      (a, b) => b.diagnostics.length - a.diagnostics.length || a.ruleId.localeCompare(b.ruleId)
    );

  // ── Duplicates ──
  //
  // A content-hash group may legitimately span roots (D-29). Under a root filter a
  // group is kept when *any* candidate is in that root — hiding a cross-root group
  // from the root that participates in it would make the duplicate invisible from
  // exactly the place a developer would look for it.
  const duplicateGroups = analysis.duplicateGroups.filter((group) =>
    group.candidates.some((candidate) =>
      matches(rootIdFor(rootIdByAssetPath, candidate.asset.path) ?? '')
    )
  );

  const crossRootGroupIds = new Set<string>();
  for (const group of analysis.duplicateGroups) {
    const groupRoots = new Set(
      group.candidates
        .map((candidate) => rootIdFor(rootIdByAssetPath, candidate.asset.path))
        .filter((id): id is string => id !== undefined)
    );
    if (groupRoots.size > 1) crossRootGroupIds.add(group.id);
  }

  // ── Verdicts ──
  //
  // Under a root filter the health is that root's, verbatim. Under `all` in a
  // multi-root workspace it is `null` — Core says so, and inventing one here would
  // be the fabrication the whole migration removed.
  const health = activeRoot
    ? (healthByRoot.get(activeRoot.id) ?? null)
    : analysis.health.singleRootOutcome;

  const coverage = activeRoot
    ? (analysis.roots.find((entry) => entry.root.id === activeRoot.id)?.analysis.coverage ?? null)
    : worstCoverage(analysis);

  return {
    analysis,
    lifecycle: analysis.lifecycle,
    lifecycleLabel: LIFECYCLE_LABELS[analysis.lifecycle.state] ?? analysis.lifecycle.state,

    roots,
    filter: effectiveFilter,
    isSingleRoot,
    activeRoot,

    assets,
    assetCount: assets.length,
    sections,
    findingCount: diagnostics.length,
    diagnosticsByAssetPath: byAsset,
    rootIdByAssetPath,
    referenceCounts,
    duplicateGroups,
    crossRootGroupIds,

    health,
    coverage,
    coverageLabel: coverage
      ? (COVERAGE_LABELS[coverage.status] ?? coverage.status)
      : COVERAGE_LABELS.unknown!,
    isEmpty:
      analysis.lifecycle.state !== 'failed' &&
      analysis.readiness.assetsIndexed &&
      assets.length === 0,
    allowsDestructiveActions: analysis.lifecycle.allowsDestructiveActions,
  };
}

/**
 * The least trustworthy coverage across the visible roots.
 *
 * A workspace's absence findings are only as good as its worst-covered root: one
 * unscannable root means "nothing references this" is not something the workspace can
 * claim, however well the others scanned.
 */
function worstCoverage(analysis: MultiRootAnalysis): ScanCoverage | null {
  const rank: Record<string, number> = { unknown: 0, none: 1, partial: 2, complete: 3 };
  let worst: ScanCoverage | null = null;

  for (const { analysis: rootAnalysis } of analysis.roots) {
    const coverage = rootAnalysis.coverage;
    if (!coverage) continue;
    if (!worst || (rank[coverage.status] ?? 0) < (rank[worst.status] ?? 0)) worst = coverage;
  }
  return worst;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

/** The canonical label for a confidence level. Never written inline by a component. */
export function confidenceLabel(confidence: Confidence): string {
  return CONFIDENCE_LABELS[confidence] ?? confidence;
}

/** The canonical label for a cleanup reason. */
export function cleanupReasonLabel(reason: string): string {
  return CLEANUP_REASON_LABELS[reason] ?? reason;
}

/** Human-readable byte size. One implementation; four surfaces used to have their own. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Re-exported so components need not import the contract package themselves. */
export type { AttributedAsset, AttributedDiagnostic, AnimoriaAsset, WorkspaceRoot };

// ── Reference wording ─────────────────────────────────────────────────────────

/**
 * How confidently a reference count can be read.
 *
 * `resolved` — the scan finished; a zero is a finding.
 * `incomplete` — the scan ran but could not read every format; a zero is a lower bound.
 * `unavailable` — the scan has not finished; a zero means nothing at all.
 */
export type ReferenceState = 'resolved' | 'incomplete' | 'unavailable';

/**
 * The state a reference count should be read under, for one analysis.
 *
 * Derived from Core's own readiness and coverage, never guessed. A surface that
 * cannot tell these apart eventually prints "0 references" over an asset that is
 * referenced in three files — which is precisely what shipped, because
 * `referenceCounts` is a `Map` and `JSON.stringify` turns one into `{}`.
 */
export function referenceStateOf(model: {
  readonly analysis: MultiRootAnalysis;
}): ReferenceState {
  const readiness = model.analysis.readiness;
  if (!readiness?.referencesResolved) return 'unavailable';

  const partial = model.analysis.roots.some(
    (entry) => entry.analysis.coverage && entry.analysis.coverage.status !== 'complete'
  );
  return partial ? 'incomplete' : 'resolved';
}

/**
 * The sentence a developer reads instead of a bare number.
 *
 * "0" is three different statements depending on the scan, and a UI that prints the
 * digit alone makes the reader guess which one. Every surface uses this so they
 * cannot word it differently.
 */
export function referenceLabel(count: number, state: ReferenceState): string {
  if (state === 'unavailable') return 'References not yet scanned';
  if (count === 0) {
    return state === 'incomplete' ? 'No references found so far' : 'No references detected';
  }
  const plural = count === 1 ? 'reference' : 'references';
  return state === 'incomplete' ? `${count} ${plural} so far` : `${count} ${plural}`;
}

/** The longer explanation, for a tooltip or an inspector line. */
export function referenceExplanation(state: ReferenceState): string {
  switch (state) {
    case 'unavailable':
      return 'Animoria has not finished scanning source files, so reference counts are not yet meaningful.';
    case 'incomplete':
      return 'Some source formats could not be read, so this is a lower bound rather than a total.';
    default:
      return 'Animoria scanned every source format it supports for this workspace.';
  }
}
