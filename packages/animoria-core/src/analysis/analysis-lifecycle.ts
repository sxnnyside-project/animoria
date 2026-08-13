import type { WorkspaceAnalysis } from './workspace-analysis.js';

/**
 * The six states an Animoria surface can be in, as one closed union.
 *
 * ## Why six and not a boolean
 * Every client used to render `loading: boolean`. That collapses six genuinely
 * different situations into two pictures, and the collapse is not cosmetic — it
 * makes the product lie:
 *
 * - A workspace that has never been indexed and one whose scan *failed* both
 *   rendered as "not loading, no assets", which reads as **"you have no animated
 *   assets"**. One of those is a fact about the workspace; the other is a fact
 *   about Animoria.
 * - An analysis whose reference scan could not cover the workspace rendered
 *   identically to one that covered it completely, so an absence finding derived
 *   from `coverage: 'none'` looked exactly as trustworthy as one derived from
 *   `coverage: 'complete'` — the precise failure D-04 exists to prevent.
 * - An analysis the workspace had moved past rendered as current, so a developer
 *   could confirm a deletion against evidence that no longer held.
 *
 * The states are ordered by precedence, and the order is load-bearing: `failed`
 * outranks everything (there is nothing to show), `stale` outranks `incomplete`
 * (re-analysing supersedes any coverage caveat), and `incomplete` outranks `ready`
 * (a caveat must not be silently dropped).
 */
export type AnalysisLifecycleState =
  /** No usable analysis exists yet. Nothing has been established, including whether the workspace is empty. */
  | 'initializing'
  /** Analysis is actively running. Partial results may be shown, but no verdict. */
  | 'analyzing'
  /** The analysis is complete, current, and sufficient for every claim in this view. */
  | 'ready'
  /** The workspace changed after this analysis. Its claims may no longer hold. */
  | 'stale'
  /** Analysis finished, but coverage or readiness is insufficient for some claims. */
  | 'incomplete'
  /** Analysis could not produce a usable result at all. */
  | 'failed';

/** A lifecycle state with the reason behind it, ready to render. */
export interface AnalysisLifecycle {
  readonly state: AnalysisLifecycleState;
  /**
   * One-line explanation, safe to render standalone. Always present — a state
   * without a reason is a spinner the developer cannot interpret.
   */
  readonly summary: string;
  /**
   * Whether a destructive action may be offered in this state.
   *
   * `false` for every state but `ready` and `incomplete`. `incomplete` still allows
   * it because a coverage caveat is a reason to *warn*, not to forbid — the caveat
   * travels with the finding, and refusing outright would make a partially-scannable
   * workspace unusable. `stale` forbids it: acting on evidence the workspace has
   * moved past is the one case with no honest presentation.
   */
  readonly allowsDestructiveActions: boolean;
}

/**
 * Derives the lifecycle state from an analysis.
 *
 * Pure and total: every `WorkspaceAnalysis` maps to exactly one state, so a client
 * cannot reach a rendering path the contract did not name. Clients render the
 * result; they do not re-derive it, which is what keeps three UIs from disagreeing
 * about whether the same analysis is trustworthy.
 */
export function deriveAnalysisLifecycle(analysis: WorkspaceAnalysis): AnalysisLifecycle {
  if (analysis.failure) {
    return {
      state: 'failed',
      summary: analysis.failure.message,
      allowsDestructiveActions: false,
    };
  }

  if (!analysis.readiness.assetsIndexed) {
    return {
      state: 'initializing',
      summary: 'Animoria has not indexed this workspace yet.',
      allowsDestructiveActions: false,
    };
  }

  if (analysis.freshness === 'stale') {
    return {
      state: 'stale',
      summary: 'The workspace changed after this analysis. Refresh to see current results.',
      allowsDestructiveActions: false,
    };
  }

  if (!analysis.readiness.complete) {
    return {
      state: 'analyzing',
      summary: analysis.readiness.referencesResolved
        ? 'Establishing duplicate groups…'
        : 'Scanning source files for references…',
      allowsDestructiveActions: false,
    };
  }

  const coverage = analysis.coverage;
  if (coverage && (coverage.status === 'partial' || coverage.status === 'none')) {
    return {
      state: 'incomplete',
      summary:
        coverage.status === 'none'
          ? 'No source files could be read, so Animoria cannot say whether an asset is referenced.'
          : 'Some source formats could not be read, so reference findings are a lower bound.',
      allowsDestructiveActions: true,
    };
  }

  if (analysis.skippedRules.length > 0) {
    return {
      state: 'incomplete',
      summary: `${analysis.skippedRules.length} configured rule(s) declined to run, so this analysis is not a full accounting.`,
      allowsDestructiveActions: true,
    };
  }

  return {
    state: 'ready',
    summary:
      analysis.assets.length === 0
        ? 'No animated assets found in this workspace.'
        : `${analysis.assets.length} asset(s) analyzed.`,
    allowsDestructiveActions: true,
  };
}

/**
 * Whether an analysis has finished but found nothing.
 *
 * Kept distinct from `initializing` deliberately: "we have not looked yet" and
 * "we looked and there is nothing" are the same picture only if the product does
 * not care which one it is telling you.
 */
export function isEmptyWorkspace(analysis: WorkspaceAnalysis): boolean {
  return (
    analysis.failure === null && analysis.readiness.assetsIndexed && analysis.assets.length === 0
  );
}
