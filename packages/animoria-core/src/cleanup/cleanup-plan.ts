import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { CleanupCandidate, CleanupProposal } from '../analysis/cleanup-candidates.js';
import { isProposalStale } from '../analysis/cleanup-candidates.js';
import type { WorkspaceAnalysis } from '../analysis/workspace-analysis.js';
import type { AnimoriaAsset, UsageReference } from '../types/asset.js';
import { UsageScanner } from '../usage/usage-scanner.js';
import { type TrashManifestEntry, moveAssetsToTrash, trashSessionDirFor } from './trash.js';

/**
 * Bulk cleanup, as a plan the UI cannot reconstruct.
 *
 * ## Why this lives in Core
 * Cleanup used to be planned and executed inside `animoria-vscode`
 * (`CleanupTypes.ts`, `CleanupPlanner.ts`, `CleanupExecutor.ts` — 772 lines), which
 * meant the extension owned a `CleanupProposal` type, a `CleanupCandidate` type, an
 * eligibility rule ("never remove a referenced asset") and a trash-staging routine
 * that no other client had. JetBrains had none of it: the same product removed
 * assets under one safety rule in one IDE and a different one in another, and the
 * shared UI could not render a proposal whose type only one host declared.
 *
 * Everything a client needs to decide, preview, confirm and apply a cleanup is here
 * now. A host contributes the filesystem primitive and the confirmation dialog
 * (D-03); it contributes no meaning.
 *
 * ## The invariant the plan exists to enforce
 * **Preview and execution consume the same immutable plan object.** A client asks
 * for a plan, renders exactly what that plan says, and applies *that same object*.
 * There is no second derivation between "what you saw" and "what ran", so the two
 * cannot disagree — the property is structural rather than a convention two code
 * paths must honour. This mirrors `ResolutionPlan` for duplicate resolution, which
 * established the same rule for the same reason (D-20).
 */

// ── Eligibility ───────────────────────────────────────────────────────────────

/**
 * Why an otherwise-flagged candidate may not be removed by bulk cleanup.
 *
 * `referenced` is the load-bearing one. Bulk cleanup has no mechanism for
 * redirecting a reference to a replacement — unlike duplicate resolution, where a
 * canonical asset exists to point at — so removing an asset source code still names
 * would break the build with nothing to repair it. The only safe contract is
 * refusing.
 */
export type CleanupBlockReason = 'referenced' | 'missing-on-disk' | 'analysis-incomplete';

/** Whether an individual candidate may be removed, and why not when it may not. */
export interface CleanupEligibility {
  readonly eligible: boolean;
  readonly blockedBy: CleanupBlockReason | null;
  /** Developer-readable explanation. Present whenever `eligible` is false. */
  readonly explanation: string | null;
}

/**
 * A candidate enriched with the evidence and eligibility a reviewer needs.
 *
 * `CleanupCandidate` (the analysis-derived half) says *why an asset was flagged*.
 * This says *whether acting on that is safe*, and shows the reference list behind
 * the answer rather than a count — a reviewer who is told "3 references" and not
 * which ones cannot check the claim.
 */
export interface ReviewableCleanupCandidate extends CleanupCandidate {
  readonly eligibility: CleanupEligibility;
  /** The actual file/line references, empty when `referenceCount` is 0. */
  readonly affectedReferences: readonly UsageReference[];
}

/** A proposal whose candidates carry eligibility and reference evidence. */
export interface ReviewableCleanupProposal extends Omit<CleanupProposal, 'candidates'> {
  readonly candidates: readonly ReviewableCleanupCandidate[];
  /** Workspace-relative directories containing at least one candidate, sorted. */
  readonly affectedFolders: readonly string[];
  /** Sum of every candidate's reference count. */
  readonly affectedReferenceCount: number;
}

// ── Plan ──────────────────────────────────────────────────────────────────────

/** One asset a plan will move to trash, with the destination decided up front. */
export interface CleanupPlanEntry {
  readonly asset: AnimoriaAsset;
  readonly sizeBytes: number;
  readonly reasons: readonly CleanupCandidate['reasons'][number][];
  readonly confidence: CleanupCandidate['confidence'];
}

/** A selected asset the plan refuses to remove, with the reason. */
export interface CleanupRefusal {
  readonly assetPath: string;
  readonly reason: CleanupBlockReason;
  readonly explanation: string;
}

/**
 * How much of what the developer selected this plan can actually do.
 *
 * `safe` — every selected asset will be removed.
 * `partial` — some selections are refused; the rest can proceed, but only on an
 *   explicit `allowPartial`, because a reviewer who selected ten assets and gets
 *   seven removed without being told is worse off than one who gets an error.
 * `unavailable` — nothing can proceed. Either every selection is refused, or the
 *   analysis behind the plan is stale or incomplete.
 */
export type CleanupPlanSafety = 'safe' | 'partial' | 'unavailable';

/**
 * The complete, immutable description of one bulk-cleanup decision.
 *
 * Inert data: building one reads the filesystem and nothing else. `planId` exists so
 * a UI can hold a reference to a plan across the preview → confirm → apply round
 * trip without ever holding the plan's *contents* in a form it could edit. The host
 * looks the id up; the UI cannot forge one.
 */
/**
 * Which root a plan belongs to.
 *
 * ## Why the plan carries this rather than letting a client derive it
 * `workspacePath` is the root's path, so a client *could* match it against the
 * workspace's roots. Every client doing that is path resolution in the presentation
 * layer — four implementations of `startsWith`, one of which gets `/workspace-old`
 * wrong. The plan states which root it belongs to, once, where it was built.
 *
 * `name` travels with `id` for display only. Comparison is always on `id`.
 */
export interface PlanRootRef {
  readonly id: string;
  readonly name: string;
}

export interface CleanupPlan {
  readonly planId: string;
  readonly workspacePath: string;
  /**
   * The root this plan operates in, when the caller supplied one.
   *
   * `null` for a caller that built a plan from a bare `WorkspaceAnalysis` with no
   * workspace context — the CLI's single-root path. A multi-root client always has
   * a root to name, and the UI refuses to render an unattributed plan in a
   * multi-root workspace rather than showing an ambiguous one.
   */
  readonly root: PlanRootRef | null;
  readonly createdAt: string;
  /** The analysis generation this plan was derived from. Compared before applying. */
  readonly analysisGeneration: number;
  readonly entries: readonly CleanupPlanEntry[];
  readonly refusals: readonly CleanupRefusal[];
  readonly safety: CleanupPlanSafety;
  /** Bytes recovered if this plan is applied in full. */
  readonly bytesReclaimed: number;
  /** Present when `safety === 'unavailable'` — why nothing can proceed. */
  readonly unavailableReason: string | null;
}

/** The outcome of applying a plan. Never thrown; every failure is a value. */
export interface CleanupExecutionResult {
  readonly status: 'applied' | 'rejected' | 'failed';
  readonly removedAssetPaths: readonly string[];
  readonly bytesReclaimed: number;
  readonly trashSessionId: string | null;
  readonly trashLocation: string | null;
  readonly refusals: readonly CleanupRefusal[];
  /** Present when `status === 'rejected'` or `'failed'`. */
  readonly reason: string | null;
  readonly completedAt: string;
}

// ── Reference evidence ────────────────────────────────────────────────────────

const REFERENCE_SCAN_BATCH_SIZE = 4;

const PROJECT_MARKERS: readonly string[] = [
  'package.json',
  'pubspec.yaml',
  'build.gradle',
  'build.gradle.kts',
  'Podfile',
  'Package.swift',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
];

/**
 * The narrowest directory that could plausibly contain a reference to an asset —
 * the nearest enclosing project root, falling back to the workspace.
 *
 * Scanning the whole workspace for every candidate is correct and slow; a reference
 * from a sibling package is not something a per-asset transparency scan can be
 * expected to find, and the reference *index* already established the count. This
 * scan only answers "show me where", so it can be scoped.
 */
export function resolveReferenceScopePath(assetPath: string, workspacePath: string): string {
  const root = resolve(workspacePath);
  let current = dirname(resolve(assetPath));

  while (current.startsWith(root) && current !== root) {
    for (const marker of PROJECT_MARKERS) {
      if (existsSync(join(current, marker))) return current;
    }
    current = dirname(current);
  }
  return root;
}

/**
 * Runs the targeted reference scan behind a proposal's candidates.
 *
 * Only assets the analysis already reports as referenced are scanned — this is a
 * transparency pass ("show me exactly where"), never a discovery pass. Whether an
 * asset is referenced at all is free from the reactive index.
 */
async function collectAffectedReferences(
  assets: readonly AnimoriaAsset[],
  workspacePath: string
): Promise<ReadonlyMap<string, readonly UsageReference[]>> {
  const byPath = new Map<string, readonly UsageReference[]>();

  for (let i = 0; i < assets.length; i += REFERENCE_SCAN_BATCH_SIZE) {
    const batch = assets.slice(i, i + REFERENCE_SCAN_BATCH_SIZE);
    await Promise.all(
      batch.map(async (asset) => {
        const scanner = new UsageScanner({
          workspacePath,
          asset,
          strategy: 'pattern',
          scopePath: resolveReferenceScopePath(asset.path, workspacePath),
        });
        const result = await scanner.search();
        byPath.set(asset.path, result.references);
      })
    );
  }

  return byPath;
}

function eligibilityFor(
  candidate: CleanupCandidate,
  liveReferenceCount: number,
  analysisComplete: boolean
): CleanupEligibility {
  if (liveReferenceCount > 0) {
    return {
      eligible: false,
      blockedBy: 'referenced',
      explanation: `Source code still references this asset in ${liveReferenceCount} ${
        liveReferenceCount === 1 ? 'place' : 'places'
      }. Bulk cleanup cannot repoint a reference, so it will not remove a referenced asset.`,
    };
  }
  if (!analysisComplete) {
    return {
      eligible: false,
      blockedBy: 'analysis-incomplete',
      explanation:
        'The analysis behind this finding has not finished establishing reference evidence. Removing an asset on incomplete evidence could delete something that is used.',
    };
  }
  if (!existsSync(candidate.asset.path)) {
    return {
      eligible: false,
      blockedBy: 'missing-on-disk',
      explanation: 'This asset is no longer on disk. Refresh the analysis.',
    };
  }
  return { eligible: true, blockedBy: null, explanation: null };
}

/**
 * Turns an analysis-derived proposal into one a reviewer can act on.
 *
 * The only I/O is the reference-transparency scan; no classification happens here
 * that `buildCleanupCandidates` did not already do.
 */
export async function buildReviewableProposal(
  proposal: CleanupProposal,
  analysis: WorkspaceAnalysis
): Promise<ReviewableCleanupProposal> {
  const referenced = proposal.candidates.filter((c) => c.referenceCount > 0).map((c) => c.asset);
  const referencesByPath = await collectAffectedReferences(referenced, proposal.workspacePath);

  const candidates: ReviewableCleanupCandidate[] = proposal.candidates.map((candidate) => ({
    ...candidate,
    affectedReferences: referencesByPath.get(candidate.asset.path) ?? [],
    eligibility: eligibilityFor(
      candidate,
      analysis.referenceCounts.get(candidate.asset.path) ?? candidate.referenceCount,
      proposal.analysisComplete
    ),
  }));

  return {
    ...proposal,
    candidates,
    affectedReferenceCount: candidates.reduce((sum, c) => sum + c.referenceCount, 0),
    affectedFolders: Array.from(
      new Set(candidates.map((c) => relative(proposal.workspacePath, dirname(c.asset.path)) || '.'))
    ).sort(),
  };
}

// ── Plan construction ─────────────────────────────────────────────────────────

let planCounter = 0;

function nextPlanId(): string {
  planCounter += 1;
  return `cleanup-${Date.now().toString(36)}-${planCounter.toString(36)}`;
}

/**
 * Builds the immutable plan for a set of selected candidates.
 *
 * Eligibility is re-derived from the **live** analysis rather than trusted from the
 * proposal: a proposal sits on screen while the workspace keeps changing, and a
 * selection made against evidence that has since moved is exactly the case
 * destructive-operation safety exists for.
 */
export function buildCleanupPlan(
  proposal: ReviewableCleanupProposal,
  analysis: WorkspaceAnalysis,
  selectedAssetPaths: readonly string[],
  root: PlanRootRef | null = null
): CleanupPlan {
  const selected = new Set(selectedAssetPaths);
  const base = {
    planId: nextPlanId(),
    workspacePath: proposal.workspacePath,
    root,
    createdAt: new Date().toISOString(),
    analysisGeneration: analysis.generation,
  };

  if (isProposalStale(proposal, analysis)) {
    return {
      ...base,
      entries: [],
      refusals: [],
      safety: 'unavailable',
      bytesReclaimed: 0,
      unavailableReason:
        'The workspace changed after this list was produced. Refresh the analysis before removing anything.',
    };
  }

  const entries: CleanupPlanEntry[] = [];
  const refusals: CleanupRefusal[] = [];

  for (const candidate of proposal.candidates) {
    if (!selected.has(candidate.asset.path)) continue;

    const live = eligibilityFor(
      candidate,
      analysis.referenceCounts.get(candidate.asset.path) ?? candidate.referenceCount,
      proposal.analysisComplete
    );

    if (!live.eligible) {
      refusals.push({
        assetPath: candidate.asset.path,
        // `blockedBy` is non-null whenever `eligible` is false.
        reason: live.blockedBy ?? 'referenced',
        explanation: live.explanation ?? 'This asset cannot be removed.',
      });
      continue;
    }

    entries.push({
      asset: candidate.asset,
      sizeBytes: candidate.sizeBytes,
      reasons: candidate.reasons,
      confidence: candidate.confidence,
    });
  }

  const safety: CleanupPlanSafety =
    entries.length === 0 ? 'unavailable' : refusals.length === 0 ? 'safe' : 'partial';

  return {
    ...base,
    entries,
    refusals,
    safety,
    bytesReclaimed: entries.reduce((sum, e) => sum + e.sizeBytes, 0),
    unavailableReason:
      safety === 'unavailable'
        ? selected.size === 0
          ? 'Nothing is selected.'
          : 'None of the selected assets can be removed. See the reasons listed against each.'
        : null,
  };
}

// ── Execution ─────────────────────────────────────────────────────────────────

/** Options for {@link executeCleanupPlan}. */
export interface ExecuteCleanupPlanOptions {
  /**
   * Whether to proceed when the plan refuses part of the selection
   * (`safety === 'partial'`).
   *
   * Defaults to `false`, for the same reason `executeResolutionPlan` does: a caller
   * who has not shown the developer the refusals must not be able to apply past
   * them by omission.
   */
  readonly allowPartial?: boolean;
  /**
   * The live analysis, re-checked immediately before mutation. A plan built against
   * a generation the workspace has moved past is rejected here even if the client
   * never checked, so staleness cannot be bypassed by a client that forgets.
   */
  readonly analysis: WorkspaceAnalysis;
}

/**
 * Applies a cleanup plan by moving its entries into a Core trash session.
 *
 * Removal is a **move, not a delete** — every entry lands in
 * `.animoria/trash/<sessionId>/` with the same manifest every other removal path
 * writes, so `restoreTrashSession` can put it back without knowing which client
 * created the session.
 */
export async function executeCleanupPlan(
  plan: CleanupPlan,
  options: ExecuteCleanupPlanOptions
): Promise<CleanupExecutionResult> {
  const empty = {
    removedAssetPaths: [] as readonly string[],
    bytesReclaimed: 0,
    trashSessionId: null,
    trashLocation: null,
    completedAt: new Date().toISOString(),
  };

  if (plan.safety === 'unavailable') {
    return {
      ...empty,
      status: 'rejected',
      refusals: plan.refusals,
      reason: plan.unavailableReason ?? 'This plan cannot be applied.',
    };
  }

  if (plan.safety === 'partial' && options.allowPartial !== true) {
    return {
      ...empty,
      status: 'rejected',
      refusals: plan.refusals,
      reason: `${plan.refusals.length} selected asset(s) cannot be removed. Review the reasons and confirm explicitly to remove the rest.`,
    };
  }

  if (options.analysis.generation !== plan.analysisGeneration) {
    return {
      ...empty,
      status: 'rejected',
      refusals: plan.refusals,
      reason:
        'The workspace changed after this plan was built. Refresh the analysis and review again.',
    };
  }

  // Last-line re-check against live state. `buildCleanupPlan` already did this, but
  // the plan may have been sitting in front of a developer since — and this is the
  // final moment before files move.
  const nowReferenced = plan.entries.filter(
    (entry) => (options.analysis.referenceCounts.get(entry.asset.path) ?? 0) > 0
  );
  if (nowReferenced.length > 0) {
    return {
      ...empty,
      status: 'rejected',
      refusals: nowReferenced.map((entry) => ({
        assetPath: entry.asset.path,
        reason: 'referenced' as const,
        explanation: 'A reference to this asset appeared after the plan was built.',
      })),
      reason: 'Some assets in this plan are now referenced. Nothing was removed.',
    };
  }

  try {
    const moved = await moveAssetsToTrash(
      plan.workspacePath,
      plan.entries.map((e) => ({
        path: e.asset.path,
        name: e.asset.name,
        sizeBytes: e.sizeBytes,
      }))
    );

    return {
      status: 'applied',
      removedAssetPaths: moved.moved,
      bytesReclaimed: moved.bytesReclaimed,
      trashSessionId: moved.sessionId,
      trashLocation: trashSessionDirFor(plan.workspacePath, moved.sessionId),
      refusals: plan.refusals,
      reason: null,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ...empty,
      status: 'failed',
      refusals: plan.refusals,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type { TrashManifestEntry };
