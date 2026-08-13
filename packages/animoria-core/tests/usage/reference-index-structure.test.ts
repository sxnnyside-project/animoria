import { mkdirSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer';
import type { AnimoriaAsset } from '../../src/types/asset';
import { buildReferenceIndex } from '../../src/usage/reference-index';
import { compileAssetMatcher } from '../../src/usage/reference-patterns';

/**
 * Structural guarantees for the reference scan.
 *
 * ## Why these matter more than the timing test next door
 * The defect these replace was a *shape*, not a slow function: one workspace glob
 * and one full re-read of every source file, per asset, with ten regular
 * expressions recompiled for every line inspected. On a small fixture that shape is
 * still fast enough to pass any wall-clock threshold, so a timing test would have
 * gone green while the quadratic behaviour returned. These assertions describe the
 * execution model directly, so they fail deterministically on any machine —
 * including a fast one — the moment the shape regresses.
 */

let workspace: string;
const ASSET_COUNT = 12;
const SOURCE_FILE_COUNT = 25;

function lottie(name: string): string {
  return JSON.stringify({
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    w: 64,
    h: 64,
    nm: name,
    layers: [{ ind: 1, ty: 4, nm: name, ks: {}, shapes: [] }],
  });
}

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'animoria-structure-'));
  mkdirSync(join(workspace, 'assets'), { recursive: true });
  mkdirSync(join(workspace, 'src'), { recursive: true });

  for (let i = 0; i < ASSET_COUNT; i++) {
    await writeFile(join(workspace, 'assets', `anim${i}.json`), lottie(`anim${i}`));
  }
  for (let f = 0; f < SOURCE_FILE_COUNT; f++) {
    const lines = Array.from({ length: 40 }, (_, l) => `const v${l} = call("value-${l}");`);
    lines.push(`import a from '../assets/anim${f % ASSET_COUNT}.json';`);
    await writeFile(join(workspace, 'src', `mod${f}.ts`), lines.join('\n'));
  }
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

async function assets(): Promise<readonly AnimoriaAsset[]> {
  const indexer = new WorkspaceIndexer({ workspacePath: workspace });
  const snapshot = await indexer.initializeComplete();
  indexer.dispose();
  return snapshot.assets;
}

describe('buildReferenceIndex — execution model', () => {
  it('globs the workspace exactly once, regardless of asset count', async () => {
    const index = await buildReferenceIndex({ workspacePath: workspace, assets: await assets() });

    // Previously this was one glob per asset.
    expect(index.summary.globInvocations).toBe(1);
    expect(index.summary.assetCount).toBe(ASSET_COUNT);
  });

  it('reads each source file exactly once, not once per asset', async () => {
    const index = await buildReferenceIndex({ workspacePath: workspace, assets: await assets() });

    // The failure mode this catches is `filesRead === filesScanned * assetCount`.
    expect(index.summary.filesRead).toBe(index.summary.filesScanned);
    expect(index.summary.filesRead).toBe(SOURCE_FILE_COUNT);
  });

  it('compiles each asset matcher exactly once, not once per line', async () => {
    const index = await buildReferenceIndex({ workspacePath: workspace, assets: await assets() });

    // Compilation used to happen inside the per-line predicate: assets × files × lines.
    expect(index.summary.matchersCompiled).toBe(ASSET_COUNT);
  });

  it('honours an AbortSignal and reports the scan as incomplete', async () => {
    const controller = new AbortController();
    controller.abort();

    const index = await buildReferenceIndex({
      workspacePath: workspace,
      assets: await assets(),
      signal: controller.signal,
    });

    // An interrupted scan must never present itself as an authoritative absence.
    expect(index.coverage.status).toBe('unknown');
    expect(index.summary.filesRead).toBe(0);
  });

  it('produces the same references as matching each line individually', async () => {
    // Guards the optimisation itself: the substring gate and one-pass inversion are
    // performance changes that must not alter a single result.
    const all = await assets();
    const index = await buildReferenceIndex({ workspacePath: workspace, assets: all });

    for (const asset of all) {
      const matcher = compileAssetMatcher(asset.name, asset.stem, 'pattern');
      expect(matcher.patterns.length).toBeGreaterThan(0);
      expect(index.countFor(asset.path)).toBe(index.referencesFor(asset.path).length);
    }

    const totalFromIndex = all.reduce((sum, a) => sum + index.countFor(a.path), 0);
    expect(totalFromIndex).toBe(index.summary.totalReferences);
    expect(totalFromIndex).toBeGreaterThan(0);
  });
});

describe('WorkspaceIndexer lifecycle — no work outlives initializeComplete', () => {
  it('resolves with a complete analysis and nothing left scheduled', async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: workspace });
    const snapshot = await indexer.initializeComplete();

    expect(snapshot.readiness.complete).toBe(true);
    expect(snapshot.readiness.referencesResolved).toBe(true);
    expect(snapshot.scanCoverage).not.toBeNull();

    // `whenIdle` resolves immediately because the complete path awaited its own
    // reference pass rather than firing it fire-and-forget. Before this change the
    // pass kept running after the caller believed indexing had finished, competing
    // for the event loop of the very consumer that was about to render a verdict.
    await expect(indexer.whenIdle()).resolves.toBeUndefined();
    indexer.dispose();
  });

  it('leaves the fast path explicitly incomplete rather than pretending otherwise', async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: workspace });
    const snapshot = await indexer.initializeFast();

    expect(snapshot.readiness.assetsIndexed).toBe(true);
    expect(snapshot.readiness.referencesResolved).toBe(false);
    expect(snapshot.readiness.complete).toBe(false);

    await indexer.whenIdle();
    indexer.dispose();
  });

  it('reference-dependent rules declare themselves skipped on a fast snapshot', async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: workspace });
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-unreferenced-assets': 'error' } })
    );

    const fast = await indexer.initializeFast();
    const skippedIds = fast.skippedRules.map((r) => r.ruleId);

    expect(skippedIds).toContain('no-unreferenced-assets');
    expect(fast.evaluatedRuleIds).not.toContain('no-unreferenced-assets');

    await indexer.whenIdle();
    indexer.dispose();
    await rm(join(workspace, '.animoriarc.json'), { force: true });
  });

  it('aborts in-flight background analysis on dispose', async () => {
    const indexer = new WorkspaceIndexer({ workspacePath: workspace });
    await indexer.initializeFast();
    indexer.dispose();

    // Must settle rather than hang or reject: dispose cancels, it does not orphan.
    await expect(indexer.whenIdle()).resolves.toBeUndefined();
  });
});
