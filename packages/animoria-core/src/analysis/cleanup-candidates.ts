import type { Confidence } from '../governance/rules/types.js';
import type { AnimoriaAsset } from '../types/asset.js';
import type { ScanCoverage } from '../types/scan-coverage.js';
import type { WorkspaceAnalysis } from './workspace-analysis.js';

/**
 * Why an asset is a candidate for removal.
 *
 * Each reason corresponds to exactly one rule, so a candidate's justification is
 * always traceable to a governance finding a developer can read, disagree with, or
 * turn off in `.animoriarc`. There is no cleanup-only classification: a category
 * that no rule produces would be a second governance model wearing a different name,
 * which is precisely what this module exists to eliminate.
 */
export type CleanupReason = 'unreferenced' | 'duplicate' | 'oversized' | 'forbidden-format';

/** The rule that justifies each reason. The mapping is the whole taxonomy. */
const REASON_BY_RULE_ID: Readonly<Record<string, CleanupReason>> = {
  'no-unreferenced-assets': 'unreferenced',
  'no-duplicate-content': 'duplicate',
  'max-file-size-kb': 'oversized',
  'allowed-formats': 'forbidden-format',
};

/** An asset a developer could be offered for removal, with the evidence behind the offer. */
export interface CleanupCandidate {
  readonly asset: AnimoriaAsset;
  /** Every reason this asset qualifies, deduplicated and stable-ordered. */
  readonly reasons: readonly CleanupReason[];
  /**
   * The weakest confidence among the findings behind it.
   *
   * Deliberately the minimum rather than the maximum: an asset that is *certainly*
   * oversized but only *moderately* likely to be unreferenced should not be offered
   * for deletion as though the whole case were certain. A candidate is only as
   * strong as the weakest claim being used to justify removing it.
   */
  readonly confidence: Confidence;
  /** Ids of the rules that produced the findings behind this candidate. */
  readonly ruleIds: readonly string[];
  /** Source-reference count, as already established by the analysis. */
  readonly referenceCount: number;
  /** Bytes recovered by removing this asset. */
  readonly sizeBytes: number;
  /** Reach of the reference scan behind any absence-based reason, when there is one. */
  readonly coverage: ScanCoverage | null;
}

/** A workspace's removal candidates, derived from one analysis. */
export interface CleanupProposal {
  readonly workspacePath: string;
  readonly generatedAt: string;
  readonly candidates: readonly CleanupCandidate[];
  readonly totalSizeBytes: number;
  /**
   * Whether the analysis behind this proposal was complete. A proposal built from an
   * incomplete analysis is a starting point, never a basis for bulk deletion.
   */
  readonly analysisComplete: boolean;
  /**
   * The analysis generation this proposal was derived from.
   *
   * A proposal is a statement about a workspace at one moment. The workspace does
   * not stop changing while the proposal sits on screen waiting to be approved, and
   * a developer confirming a list of deletions built from evidence that has since
   * changed is the exact scenario destructive-operation safety exists for. Pairing
   * this with the live analysis's generation ({@link isProposalStale}) is how any
   * client — with any UI — asks "is what I am showing still true?".
   */
  readonly analysisGeneration: number;
}

/**
 * Whether a proposal was built from evidence the workspace has since moved past.
 *
 * Deliberately a comparison of the *whole analysis* generation rather than a
 * per-asset check: a change anywhere can invalidate a cleanup candidate, because
 * a newly-added source file can reference an asset the proposal lists as
 * unreferenced. Asking whether each individual candidate changed would miss
 * exactly that case.
 *
 * Staleness is a signal, not a verdict. What a client does with it — disable
 * confirmation, re-derive silently, or show a "refresh" affordance — is a
 * presentation decision. What no client may do is apply a stale proposal as
 * though it were current, which is why the destructive paths re-validate against
 * live state regardless of whether anyone checked this first.
 */
export function isProposalStale(
  proposal: Pick<CleanupProposal, 'analysisGeneration'>,
  analysis: Pick<WorkspaceAnalysis, 'generation'>
): boolean {
  return analysis.generation !== proposal.analysisGeneration;
}

export interface CleanupCandidateOptions {
  /** Asset paths the developer has already dismissed; excluded from the result. */
  readonly dismissedPaths?: ReadonlySet<string>;
  /**
   * Lowest confidence worth offering. Defaults to `'low'` (offer everything, let the
   * surface decide what to preselect) — a *presentation* threshold, not a semantic
   * one, so it lives here rather than being baked into the analysis.
   */
  readonly minimumConfidence?: Confidence;
}

/** Weakest to strongest, for comparing and for taking a minimum. */
const CONFIDENCE_ORDER: readonly Confidence[] = ['low', 'moderate', 'high', 'certain'];

function rank(confidence: Confidence): number {
  return CONFIDENCE_ORDER.indexOf(confidence);
}

/**
 * Derives removal candidates from a workspace analysis.
 *
 * ## Why this is a function over the analysis, not an analyzer
 * Cleanup categories used to come from `GovernanceAnalyzer` — a second pipeline that
 * re-scanned usage, re-hashed contents, and produced its own `unused` / `duplicate`
 * classification with a hardcoded `confidence: 'high'` on every candidate. Two
 * pipelines meant two answers: the sidebar's governance section and the cleanup
 * panel could disagree about the same asset, and the cleanup panel's confidence was
 * a literal nobody had computed.
 *
 * Every fact this function needs is already in the analysis. It reads, groups, and
 * ranks; it scans nothing, hashes nothing, and decides no new governance meaning.
 * That is what makes "the cleanup panel and the governance report agree" a
 * structural property rather than something to keep in sync.
 */
export function buildCleanupCandidates(
  analysis: WorkspaceAnalysis,
  options: CleanupCandidateOptions = {}
): CleanupProposal {
  const dismissed = options.dismissedPaths ?? new Set<string>();
  const floor = rank(options.minimumConfidence ?? 'low');

  const byAssetPath = new Map<
    string,
    {
      asset: AnimoriaAsset;
      reasons: Set<CleanupReason>;
      ruleIds: Set<string>;
      confidence: Confidence;
      coverage: ScanCoverage | null;
    }
  >();

  for (const diagnostic of analysis.diagnostics) {
    const reason = REASON_BY_RULE_ID[diagnostic.ruleId];
    if (!reason) continue; // A finding that does not justify removal (e.g. a naming collision).
    if (dismissed.has(diagnostic.asset.path)) continue;

    const existing = byAssetPath.get(diagnostic.asset.path);
    if (!existing) {
      byAssetPath.set(diagnostic.asset.path, {
        asset: diagnostic.asset,
        reasons: new Set([reason]),
        ruleIds: new Set([diagnostic.ruleId]),
        confidence: diagnostic.confidence,
        coverage: diagnostic.coverage ?? null,
      });
      continue;
    }

    existing.reasons.add(reason);
    existing.ruleIds.add(diagnostic.ruleId);
    // Weakest claim wins — see `CleanupCandidate.confidence`.
    if (rank(diagnostic.confidence) < rank(existing.confidence)) {
      existing.confidence = diagnostic.confidence;
    }
    if (!existing.coverage && diagnostic.coverage) existing.coverage = diagnostic.coverage;
  }

  const candidates: CleanupCandidate[] = [];
  for (const entry of byAssetPath.values()) {
    if (rank(entry.confidence) < floor) continue;
    candidates.push({
      asset: entry.asset,
      reasons: [...entry.reasons].sort(),
      confidence: entry.confidence,
      ruleIds: [...entry.ruleIds].sort(),
      referenceCount: analysis.referenceCounts.get(entry.asset.path) ?? 0,
      sizeBytes: entry.asset.sizeBytes,
      coverage: entry.coverage,
    });
  }

  // Largest first: the reclaim-space question is the one a cleanup review opens with.
  // Ties broken by path so the order is stable across runs.
  candidates.sort((a, b) => b.sizeBytes - a.sizeBytes || a.asset.path.localeCompare(b.asset.path));

  return {
    workspacePath: analysis.workspacePath,
    generatedAt: analysis.generatedAt,
    candidates,
    totalSizeBytes: candidates.reduce((sum, c) => sum + c.sizeBytes, 0),
    analysisComplete: analysis.readiness.complete,
    analysisGeneration: analysis.generation,
  };
}
