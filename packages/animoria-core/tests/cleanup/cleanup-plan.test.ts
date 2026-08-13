import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CleanupProposal } from '../../src/analysis/cleanup-candidates.js';
import type { WorkspaceAnalysis } from '../../src/analysis/workspace-analysis.js';
import {
  buildCleanupPlan,
  buildReviewableProposal,
  executeCleanupPlan,
} from '../../src/cleanup/cleanup-plan.js';
import { listTrashSessions, restoreTrashSession } from '../../src/cleanup/trash.js';
import type { AnimoriaAsset } from '../../src/types/asset.js';

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'animoria-cleanup-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function writeAsset(name: string, content = '{"v":"5.5.7","fr":30,"layers":[]}'): AnimoriaAsset {
  const path = join(workspace, name);
  writeFileSync(path, content);
  return {
    path,
    name,
    stem: name.replace(/\.[^.]+$/, ''),
    format: 'lottie',
    sizeBytes: content.length,
    mtime: Date.now(),
    status: 'parsed',
    references: [],
  } as unknown as AnimoriaAsset;
}

function analysisWith(
  overrides: Partial<WorkspaceAnalysis> & { referenceCounts?: Map<string, number> } = {}
): WorkspaceAnalysis {
  return {
    workspacePath: workspace,
    generatedAt: new Date().toISOString(),
    generation: 1,
    durationMs: 1,
    readiness: {
      assetsIndexed: true,
      referencesResolved: true,
      duplicatesResolved: true,
      complete: true,
    },
    assets: [],
    coverage: null,
    referenceCounts: overrides.referenceCounts ?? new Map(),
    referenceIndex: null,
    diagnostics: [],
    evaluatedRuleIds: [],
    skippedRules: [],
    configErrors: [],
    duplicateGroups: [],
    health: { status: 'unavailable', reason: 'no-assets', message: 'No assets.' },
    freshness: 'current',
    failure: null,
    ...overrides,
  } as WorkspaceAnalysis;
}

function proposalWith(
  assets: AnimoriaAsset[],
  referenceCounts = new Map<string, number>()
): CleanupProposal {
  return {
    workspacePath: workspace,
    generatedAt: new Date().toISOString(),
    analysisComplete: true,
    analysisGeneration: 1,
    totalSizeBytes: assets.reduce((s, a) => s + a.sizeBytes, 0),
    candidates: assets.map((asset) => ({
      asset,
      reasons: ['unreferenced' as const],
      confidence: 'high' as const,
      ruleIds: ['no-unreferenced-assets'],
      referenceCount: referenceCounts.get(asset.path) ?? 0,
      sizeBytes: asset.sizeBytes,
      coverage: null,
    })),
  };
}

describe('cleanup eligibility', () => {
  it('refuses a referenced asset regardless of what flagged it', async () => {
    // The one safety invariant bulk cleanup has: it cannot repoint a reference the
    // way duplicate resolution can, so removing a referenced asset breaks the build
    // with nothing to repair it.
    const asset = writeAsset('used.json');
    const refs = new Map([[asset.path, 3]]);

    const reviewable = await buildReviewableProposal(
      proposalWith([asset], refs),
      analysisWith({ referenceCounts: refs })
    );

    expect(reviewable.candidates[0]!.eligibility.eligible).toBe(false);
    expect(reviewable.candidates[0]!.eligibility.blockedBy).toBe('referenced');
    expect(reviewable.candidates[0]!.eligibility.explanation).toContain('3');
  });

  it('refuses everything when the analysis is incomplete', async () => {
    const asset = writeAsset('maybe.json');
    const proposal = { ...proposalWith([asset]), analysisComplete: false };

    const reviewable = await buildReviewableProposal(proposal, analysisWith());

    expect(reviewable.candidates[0]!.eligibility.blockedBy).toBe('analysis-incomplete');
  });

  it('accepts an unreferenced asset from a complete analysis', async () => {
    const asset = writeAsset('unused-one.json');
    const reviewable = await buildReviewableProposal(proposalWith([asset]), analysisWith());
    expect(reviewable.candidates[0]!.eligibility.eligible).toBe(true);
  });
});

describe('cleanup plan safety', () => {
  it('is safe when every selection is eligible', async () => {
    const a = writeAsset('a.json');
    const b = writeAsset('b.json');
    const analysis = analysisWith();
    const reviewable = await buildReviewableProposal(proposalWith([a, b]), analysis);

    const plan = buildCleanupPlan(reviewable, analysis, [a.path, b.path]);

    expect(plan.safety).toBe('safe');
    expect(plan.entries).toHaveLength(2);
    expect(plan.refusals).toHaveLength(0);
  });

  it('is partial when some selections are refused, and names each reason', async () => {
    const free = writeAsset('free.json');
    const used = writeAsset('used.json');
    const refs = new Map([[used.path, 1]]);
    const analysis = analysisWith({ referenceCounts: refs });
    const reviewable = await buildReviewableProposal(proposalWith([free, used], refs), analysis);

    const plan = buildCleanupPlan(reviewable, analysis, [free.path, used.path]);

    expect(plan.safety).toBe('partial');
    expect(plan.entries.map((e) => e.asset.path)).toEqual([free.path]);
    expect(plan.refusals[0]!.reason).toBe('referenced');
    expect(plan.refusals[0]!.explanation.length).toBeGreaterThan(0);
  });

  it('is unavailable when the analysis has moved on', async () => {
    // Staleness is checked at plan time and again at execution, because the developer
    // is looking at the preview in between.
    const asset = writeAsset('a.json');
    const analysis = analysisWith();
    const reviewable = await buildReviewableProposal(proposalWith([asset]), analysis);

    const plan = buildCleanupPlan(reviewable, { ...analysis, generation: 2 }, [asset.path]);

    expect(plan.safety).toBe('unavailable');
    expect(plan.unavailableReason).toContain('changed');
  });
});

describe('cleanup execution', () => {
  it('refuses a partial plan unless the caller opts in explicitly', async () => {
    const free = writeAsset('free.json');
    const used = writeAsset('used.json');
    const refs = new Map([[used.path, 1]]);
    const analysis = analysisWith({ referenceCounts: refs });
    const reviewable = await buildReviewableProposal(proposalWith([free, used], refs), analysis);
    const plan = buildCleanupPlan(reviewable, analysis, [free.path, used.path]);

    const refused = await executeCleanupPlan(plan, { analysis });
    expect(refused.status).toBe('rejected');
    expect(readFileSync(free.path, 'utf8').length).toBeGreaterThan(0);

    const applied = await executeCleanupPlan(plan, { analysis, allowPartial: true });
    expect(applied.status).toBe('applied');
    expect(applied.removedAssetPaths).toEqual([free.path]);
  });

  it('moves to trash rather than deleting, and the move is restorable', async () => {
    const asset = writeAsset('gone.json');
    const original = readFileSync(asset.path, 'utf8');
    const analysis = analysisWith();
    const reviewable = await buildReviewableProposal(proposalWith([asset]), analysis);
    const plan = buildCleanupPlan(reviewable, analysis, [asset.path]);

    const result = await executeCleanupPlan(plan, { analysis });
    expect(result.status).toBe('applied');
    expect(result.trashSessionId).toBeTruthy();

    const sessions = await listTrashSessions(workspace);
    expect(sessions.map((s) => s.sessionId)).toContain(result.trashSessionId);

    const restore = await restoreTrashSession(workspace, result.trashSessionId!);
    expect(restore.restoredPaths).toEqual([asset.path]);
    expect(readFileSync(asset.path, 'utf8')).toBe(original);
  });

  it('rejects at execution when a reference appeared after the plan was built', async () => {
    // The developer approved a removal against evidence that has since changed. The
    // plan is unchanged; the world is not.
    const asset = writeAsset('raced.json');
    const analysis = analysisWith();
    const reviewable = await buildReviewableProposal(proposalWith([asset]), analysis);
    const plan = buildCleanupPlan(reviewable, analysis, [asset.path]);

    const withReference = analysisWith({ referenceCounts: new Map([[asset.path, 1]]) });
    const result = await executeCleanupPlan(plan, { analysis: withReference });

    expect(result.status).toBe('rejected');
    expect(result.refusals[0]!.reason).toBe('referenced');
    expect(readFileSync(asset.path, 'utf8').length).toBeGreaterThan(0);
  });

  it('rejects a plan whose generation no longer matches, even if the client did not check', async () => {
    const asset = writeAsset('stale.json');
    const analysis = analysisWith();
    const reviewable = await buildReviewableProposal(proposalWith([asset]), analysis);
    const plan = buildCleanupPlan(reviewable, analysis, [asset.path]);

    const result = await executeCleanupPlan(plan, { analysis: { ...analysis, generation: 9 } });

    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('changed');
  });

  it('preview and execution consume the same plan object', async () => {
    // The structural half of "what you saw is what ran": there is no second
    // derivation between the rendered entries and the moved files.
    const a = writeAsset('one.json');
    const b = writeAsset('two.json');
    const analysis = analysisWith();
    const reviewable = await buildReviewableProposal(proposalWith([a, b]), analysis);
    const plan = buildCleanupPlan(reviewable, analysis, [a.path]);

    const previewed = plan.entries.map((e) => e.asset.path);
    const result = await executeCleanupPlan(plan, { analysis });

    expect(result.removedAssetPaths).toEqual(previewed);
    expect(readFileSync(b.path, 'utf8').length).toBeGreaterThan(0);
  });
});
