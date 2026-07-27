import { dirname, relative } from 'node:path';
import { UsageScanner } from '@animoria/core';
import type {
  AnimoriaAsset,
  RuleEngineReport,
  WorkspaceIndexSnapshot,
  WorkspaceIndexer,
} from '@animoria/core';
import type { ExtensionContext } from 'vscode';
import { resolveScopePath } from '../utils/resolve-scope-path.js';
import type {
  CandidateDecision,
  CleanupCandidate,
  CleanupProposal,
  CleanupReason,
  CleanupSession,
} from './CleanupTypes.js';
import { DISMISSED_ASSETS_STATE_KEY } from './CleanupTypes.js';

/** Candidates are scanned for their detailed reference list in batches of this size. */
const REFERENCE_SCAN_BATCH_SIZE = 4;

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Estimate of ms per asset deletion operation used for
 * `CleanupProposal.estimatedExecutionMs`. Deliberately conservative so
 * the UI never under-promises.
 */
const ESTIMATED_MS_PER_ASSET = 40;

// ─── CleanupPlanner ───────────────────────────────────────────────────────────

/**
 * Translates the current workspace governance snapshot into a reviewable
 * {@link CleanupProposal} that can be handed to the Cleanup Review panel.
 *
 * ## Responsibilities
 * - Read the live {@link WorkspaceIndexer} snapshot (already computed — no
 *   extra I/O).
 * - Classify each asset into one or more {@link CleanupReason} buckets.
 * - Exclude dismissed assets (persisted in `vscode.ExtensionContext.workspaceState`).
 * - Compute aggregate impact metrics (total bytes, affected references,
 *   affected folders, health-score delta, execution estimate).
 * - Return an immutable {@link CleanupProposal}.
 *
 * ## What this class does NOT do
 * - It never reads a file from disk. Every decision is based solely on
 *   data the indexer already holds in memory.
 * - It never modifies any file. All mutations are owned by {@link CleanupExecutor}.
 * - It never displays UI. Panel orchestration is owned by `AnimoriaCleanupPanel`.
 *
 * ## Determinism guarantee
 * Given the same governance snapshot and the same dismissed-asset list,
 * `buildProposal` will always produce the same {@link CleanupProposal}.
 * This is important for testing and for ensuring the panel always reflects
 * the actual workspace state rather than a cached or stale view.
 */
export class CleanupPlanner {
  private readonly _indexer: WorkspaceIndexer;
  private readonly _context: ExtensionContext;

  constructor(indexer: WorkspaceIndexer, context: ExtensionContext) {
    this._indexer = indexer;
    this._context = context;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** The live workspace index snapshot this planner reads from. Exposed so callers (e.g. the review panel) never need to reach past this class to get current governance state. */
  getSnapshot(): WorkspaceIndexSnapshot {
    return this._indexer.getSnapshot();
  }

  /** The workspace root this planner (and the indexer it reads from) operates on. Exposed so `CleanupExecutor` can stage removals under this workspace's `.animoria/trash/` without needing its own reference to the indexer. */
  get workspacePath(): string {
    return this._indexer.workspacePath;
  }

  /**
   * Builds a fresh, immutable {@link CleanupProposal} from the current index
   * snapshot.
   *
   * Candidate classification itself is synchronous — the snapshot is already
   * held in memory by `WorkspaceIndexer`. The `async` signature reflects real
   * I/O this method performs: for every candidate that has one or more known
   * references, it runs a targeted {@link UsageScanner} pass to populate
   * {@link CleanupCandidate.affectedReferences} with the actual file/line
   * list, so the review panel can show the developer exactly what a removal
   * would break — never just a count. Zero-reference candidates are never
   * scanned, since there is nothing to find.
   *
   * @returns A deterministic proposal reflecting the current governance state.
   */
  async buildProposal(): Promise<CleanupProposal> {
    const snapshot = this._indexer.getSnapshot();
    const dismissed = this._loadDismissed();
    const ruleReport = snapshot.ruleReport;
    const workspacePath = this._indexer.workspacePath;

    // Collect the per-asset data we need in one pass, then classify.
    const flagged: Array<{
      asset: AnimoriaAsset;
      reasons: CleanupReason[];
      referenceCount: number;
    }> = [];

    for (const asset of snapshot.assets) {
      if (asset.status !== 'parsed') continue;
      if (dismissed.has(asset.path)) continue;

      const reasons = this._classifyReasons(asset.path, snapshot.referenceCounts, ruleReport);
      if (reasons.length === 0) continue;

      const referenceCount = snapshot.referenceCounts.get(asset.path) ?? 0;
      flagged.push({ asset, reasons, referenceCount });
    }

    const referenceListByPath = await this._scanAffectedReferences(
      flagged.filter((f) => f.referenceCount > 0).map((f) => f.asset),
      workspacePath
    );

    const candidates: CleanupCandidate[] = flagged.map(({ asset, reasons, referenceCount }) => ({
      asset,
      reasons,
      confidence: referenceCount === 0 ? 'high' : 'medium',
      referenceCount,
      affectedReferences: referenceListByPath.get(asset.path) ?? [],
      sizeBytes: asset.sizeBytes,
      dismissed: false,
    }));

    // ── Aggregate metrics ────────────────────────────────────────────────────

    const totalSizeBytes = candidates.reduce((sum, c) => sum + c.sizeBytes, 0);
    const affectedReferencesCount = candidates.reduce((sum, c) => sum + c.referenceCount, 0);

    const affectedFolders = Array.from(
      new Set(candidates.map((c) => relative(workspacePath, dirname(c.asset.path)) || '.'))
    ).sort();

    // Health-score delta: approximate how many diagnostics would be resolved.
    const currentScore = snapshot.healthScore?.score ?? 100;
    const estimatedHealthScoreDelta = this._estimateHealthDelta(
      candidates.length,
      snapshot.assets.length,
      currentScore
    );

    const estimatedExecutionMs = candidates.length * ESTIMATED_MS_PER_ASSET;

    return {
      candidates,
      totalSizeBytes,
      affectedReferencesCount,
      affectedFolders,
      estimatedHealthScoreDelta,
      estimatedExecutionMs,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Constructs an initial {@link CleanupSession} from a proposal.
   *
   * All decisions default to `'keep'`. The developer then moves individual
   * candidates to `'remove'` or `'dismiss'` during the review stage.
   *
   * @param proposal The proposal to start reviewing.
   * @returns A mutable session ready for the panel to bind to.
   */
  buildSession(proposal: CleanupProposal): CleanupSession {
    const decisions = new Map<string, CandidateDecision>();
    for (const candidate of proposal.candidates) {
      decisions.set(candidate.asset.path, 'keep');
    }
    return { proposal, decisions };
  }

  // ── Dismissed-asset persistence ────────────────────────────────────────────

  /**
   * Persists a dismissed asset path so it never surfaces in future proposals
   * for this workspace.
   *
   * @param assetPath Absolute path of the asset to dismiss.
   */
  dismiss(assetPath: string): void {
    const dismissed = this._loadDismissed();
    dismissed.add(assetPath);
    void this._context.workspaceState.update(DISMISSED_ASSETS_STATE_KEY, Array.from(dismissed));
  }

  /**
   * Removes all dismissed assets for this workspace, making them eligible to
   * appear in future proposals again.
   */
  resetDismissals(): void {
    void this._context.workspaceState.update(DISMISSED_ASSETS_STATE_KEY, []);
  }

  /**
   * Returns the set of asset paths that have been permanently dismissed for
   * this workspace.
   */
  getDismissed(): ReadonlySet<string> {
    return this._loadDismissed();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Fetches the detailed reference list (file, line, source snippet) for
   * every given asset, batched to bound concurrent filesystem activity.
   *
   * Called only with assets already known (via the indexer's own
   * `referenceCounts`) to have at least one reference — this is a
   * transparency scan ("show me exactly where"), not a discovery scan;
   * whether an asset is referenced at all is already known for free from
   * the reactive index.
   */
  private async _scanAffectedReferences(
    assets: readonly AnimoriaAsset[],
    workspacePath: string
  ): Promise<ReadonlyMap<string, CleanupCandidate['affectedReferences']>> {
    const results = new Map<string, CleanupCandidate['affectedReferences']>();

    for (let i = 0; i < assets.length; i += REFERENCE_SCAN_BATCH_SIZE) {
      const batch = assets.slice(i, i + REFERENCE_SCAN_BATCH_SIZE);
      await Promise.all(
        batch.map(async (asset) => {
          const scanner = new UsageScanner({
            workspacePath,
            asset,
            strategy: 'pattern',
            scopePath: resolveScopePath(asset.path, workspacePath),
          });
          const result = await scanner.search();
          results.set(asset.path, result.references);
        })
      );
    }

    return results;
  }

  /**
   * Determines which {@link CleanupReason}s apply to a single asset.
   *
   * Adding a new reason requires only:
   * 1. Adding the literal to `CleanupReason` in `CleanupTypes.ts`.
   * 2. Adding an `if` branch here.
   * Nothing else needs to change.
   */
  private _classifyReasons(
    assetPath: string,
    referenceCounts: ReadonlyMap<string, number>,
    ruleReport: RuleEngineReport | null
  ): CleanupReason[] {
    const reasons: CleanupReason[] = [];
    const refCount = referenceCounts.get(assetPath) ?? 0;

    // ── Orphaned ──────────────────────────────────────────────────────────────
    if (refCount === 0) {
      reasons.push('orphaned');
    }

    // ── Rule-derived reasons ─────────────────────────────────────────────────
    if (ruleReport) {
      const diags = ruleReport.diagnostics.filter((d) => d.asset.path === assetPath);
      const ruleIds = new Set(diags.map((d) => d.ruleId));

      if (ruleIds.has('max-file-size-kb')) {
        reasons.push('oversized');
      }
      if (ruleIds.has('no-gif') || ruleIds.has('allowed-formats')) {
        reasons.push('forbidden-format');
      }
      if (ruleIds.has('no-duplicate-names') || ruleIds.has('no-duplicate-content')) {
        // Only add 'duplicate' if not already added (content-hash duplicates
        // are handled by governance-analyzer; name-based ones surface here).
        if (!reasons.includes('duplicate')) {
          reasons.push('duplicate');
        }
      }
    }

    // ── Naming pattern heuristics ─────────────────────────────────────────────
    const name = assetPath.split('/').pop()?.toLowerCase() ?? '';
    if (TEMPORARY_PATTERNS.some((p) => p.test(name))) {
      reasons.push('temporary');
    }

    // ── Suppress false duplicates: if the asset has references, 'orphaned'
    //    was not added, but we may still have other reasons. Return as-is.
    return reasons;
  }

  /** Rough estimate of how many score points would be recovered. */
  private _estimateHealthDelta(
    candidateCount: number,
    totalAssets: number,
    currentScore: number
  ): number {
    if (totalAssets === 0 || candidateCount === 0) return 0;
    // Conservative linear estimate: removing all candidates as a fraction of
    // total assets maps proportionally to points below 100.
    const potentialRecovery = 100 - currentScore;
    const fraction = Math.min(candidateCount / totalAssets, 1);
    return Math.round(potentialRecovery * fraction);
  }

  private _loadDismissed(): Set<string> {
    const raw = this._context.workspaceState.get<string[]>(DISMISSED_ASSETS_STATE_KEY, []);
    return new Set(raw);
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Filename patterns that suggest a file is temporary or a work-in-progress.
 * Matched case-insensitively against the bare filename (not the full path).
 */
const TEMPORARY_PATTERNS: readonly RegExp[] = [
  /[-_]copy\b/,
  /[-_]backup\b/,
  /[-_]bak\b/,
  /[-_]tmp\b/,
  /[-_]temp\b/,
  /[-_]wip\b/,
  /[-_]draft\b/,
  /[-_]old\b/,
  /[-_]v\d+\b/, // e.g. hero_v2.json, loading_v3.json
  /[-_]test\b/,
];
