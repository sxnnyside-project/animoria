import type { AnimoriaAsset, WorkspaceIndexSnapshot } from '@animoria/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CleanupPlanner } from '../../src/cleanup/CleanupPlanner.js';
import { resetTestWorkspace } from '../harness.js';
import { createMockExtensionContext } from '../mocks/vscode.js';
import { buildSnapshot, createFakeWorkspaceIndexer } from '../support/fakes.js';

/**
 * `CleanupPlanner.buildProposal` is the read-only stage of Bulk Cleanup —
 * these tests focus on the guarantee the rest of the workflow depends on:
 * given the same governance state, it always produces the same proposal
 * (`CleanupPlanner`'s own documented determinism guarantee), and dismissed
 * assets never resurface. Reference-bearing candidates are deliberately
 * excluded from these fixtures — scanning their reference detail is a real
 * filesystem operation (`UsageScanner`) exercised end-to-end in
 * `AnimoriaDuplicateResolver.test.ts` instead, keeping this suite fast and
 * isolated.
 */
describe('CleanupPlanner', () => {
  beforeEach(() => {
    resetTestWorkspace();
  });

  function orphanedAsset(name: string): AnimoriaAsset {
    return {
      path: `/workspace/assets/${name}`,
      name,
      stem: name.replace(/\.[^.]+$/, ''),
      format: 'lottie',
      sizeBytes: 500,
      mtime: Date.now(),
      status: 'parsed',
    };
  }

  function snapshotWith(assets: AnimoriaAsset[]): WorkspaceIndexSnapshot {
    return buildSnapshot({
      assets,
      referenceCounts: new Map(assets.map((a) => [a.path, 0])),
    });
  }

  it('flags zero-reference assets as orphaned candidates', async () => {
    const asset = orphanedAsset('orphan.json');
    const { indexer } = createFakeWorkspaceIndexer('/workspace', snapshotWith([asset]));
    const context = createMockExtensionContext();
    const planner = new CleanupPlanner(indexer, context);

    const proposal = await planner.buildProposal();

    expect(proposal.candidates).toHaveLength(1);
    expect(proposal.candidates[0]?.asset.path).toBe(asset.path);
    expect(proposal.candidates[0]?.reasons).toContain('orphaned');
    expect(proposal.candidates[0]?.confidence).toBe('high');
  });

  it('excludes an asset once it has been dismissed', async () => {
    const asset = orphanedAsset('dismiss-me.json');
    const { indexer } = createFakeWorkspaceIndexer('/workspace', snapshotWith([asset]));
    const context = createMockExtensionContext();
    const planner = new CleanupPlanner(indexer, context);

    planner.dismiss(asset.path);
    const proposal = await planner.buildProposal();

    expect(proposal.candidates).toHaveLength(0);
    expect(planner.getDismissed().has(asset.path)).toBe(true);
  });

  it('makes a dismissed asset eligible again after resetDismissals', async () => {
    const asset = orphanedAsset('reset-me.json');
    const { indexer } = createFakeWorkspaceIndexer('/workspace', snapshotWith([asset]));
    const context = createMockExtensionContext();
    const planner = new CleanupPlanner(indexer, context);

    planner.dismiss(asset.path);
    planner.resetDismissals();
    const proposal = await planner.buildProposal();

    expect(proposal.candidates).toHaveLength(1);
    expect(planner.getDismissed().size).toBe(0);
  });

  it('produces an identical proposal (aside from the generation timestamp) for an unchanged snapshot', async () => {
    const assets = [orphanedAsset('a.json'), orphanedAsset('b.json')];
    const { indexer } = createFakeWorkspaceIndexer('/workspace', snapshotWith(assets));
    const context = createMockExtensionContext();
    const planner = new CleanupPlanner(indexer, context);

    const first = await planner.buildProposal();
    const second = await planner.buildProposal();

    const strip = (p: typeof first) => ({ ...p, generatedAt: undefined });
    expect(strip(first)).toEqual(strip(second));
  });

  it('defaults every candidate decision to keep when building a session', async () => {
    const assets = [orphanedAsset('a.json'), orphanedAsset('b.json')];
    const { indexer } = createFakeWorkspaceIndexer('/workspace', snapshotWith(assets));
    const context = createMockExtensionContext();
    const planner = new CleanupPlanner(indexer, context);

    const proposal = await planner.buildProposal();
    const session = planner.buildSession(proposal);

    expect(Array.from(session.decisions.values())).toEqual(['keep', 'keep']);
  });

  it('ignores non-parsed assets entirely', async () => {
    const erroredAsset: AnimoriaAsset = {
      ...orphanedAsset('broken.json'),
      status: 'error',
      error: 'bad json',
    };
    const { indexer } = createFakeWorkspaceIndexer('/workspace', snapshotWith([erroredAsset]));
    const context = createMockExtensionContext();
    const planner = new CleanupPlanner(indexer, context);

    const proposal = await planner.buildProposal();

    expect(proposal.candidates).toHaveLength(0);
  });
});
