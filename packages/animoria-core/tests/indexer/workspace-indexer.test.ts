import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { WorkspaceIndexUpdate } from '../../src/indexer/types';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer';

const tempDirs: string[] = [];
const indexers: WorkspaceIndexer[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-indexer-'));
  tempDirs.push(dir);
  return dir;
}

function trackIndexer(indexer: WorkspaceIndexer): WorkspaceIndexer {
  indexers.push(indexer);
  return indexer;
}

function nextUpdate(indexer: WorkspaceIndexer): Promise<WorkspaceIndexUpdate> {
  return new Promise((resolve) => {
    const sub = indexer.onDidUpdate((update) => {
      sub.dispose();
      resolve(update);
    });
  });
}

/**
 * `initialize()` now resolves with a fast snapshot (assets scanned/parsed,
 * reference counts not yet established) and fires a second `onDidUpdate`
 * once the background reference-count pass completes — see
 * `WorkspaceIndexer.initialize`'s doc comment. Tests that assert on the
 * *initial* reference counts need to wait for that second update rather
 * than reading `initialize()`'s own return value.
 */
async function initializeAndAwaitReferenceCounts(
  indexer: WorkspaceIndexer
): Promise<WorkspaceIndexUpdate['snapshot']> {
  // `initialize()`'s own fast commit fires and is delivered to any
  // subscriber synchronously before its promise resolves, so subscribing
  // only after it resolves guarantees the next update caught here is the
  // deferred, reference-counts-populated one, not the fast one.
  await indexer.initialize();
  return (await nextUpdate(indexer)).snapshot;
}

const LOTTIE_DOC = JSON.stringify({
  v: '5.9.0',
  fr: 30,
  ip: 0,
  op: 30,
  w: 100,
  h: 100,
  layers: [],
});

afterEach(async () => {
  for (const indexer of indexers.splice(0)) indexer.dispose();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('WorkspaceIndexer', () => {
  it('initialize() performs a full scan and produces a snapshot', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'hero.json'), LOTTIE_DOC);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const snapshot = await indexer.initialize();

    expect(snapshot.assets).toHaveLength(1);
    expect(snapshot.assets[0]?.name).toBe('hero.json');
    expect(snapshot.generation).toBe(1);
    // Reference counts are not yet established on this fast, first-commit
    // snapshot — see `initialize()`'s doc comment — so the asset is
    // legitimately absent from the map here, not present with count 0.
    expect(snapshot.referenceCounts.has(snapshot.assets[0]!.path)).toBe(false);

    const settled = await nextUpdate(indexer);
    expect(settled.snapshot.generation).toBe(2);
    expect(settled.snapshot.referenceCounts.get(snapshot.assets[0]!.path)).toBe(0);
  });

  it('does not flag every asset as unreferenced on the fast, pre-reference-count snapshot', async () => {
    const workspace = await makeWorkspace();
    await writeFile(
      join(workspace, '.animoriarc.json'),
      JSON.stringify({ rules: { 'no-unreferenced-assets': 'warning' } })
    );
    await mkdir(join(workspace, 'src'), { recursive: true });
    await writeFile(join(workspace, 'src', 'App.ts'), `import hero from '../../hero.json';\n`);
    await writeFile(join(workspace, 'hero.json'), LOTTIE_DOC);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const fast = await indexer.initialize();

    // The fast snapshot must not report `hero.json` as unreferenced just
    // because reference counts haven't been established yet — that would
    // be a false positive severe enough to mislead a user into deleting
    // a referenced asset via Bulk Cleanup.
    const fastUnused = fast.ruleReport?.diagnostics.filter(
      (d) => d.ruleId === 'no-unreferenced-assets'
    );
    expect(fastUnused ?? []).toHaveLength(0);

    const settled = await nextUpdate(indexer);
    expect(settled.snapshot.referenceCounts.get(join(workspace, 'hero.json'))).toBe(1);
    const settledUnused = settled.snapshot.ruleReport?.diagnostics.filter(
      (d) => d.ruleId === 'no-unreferenced-assets'
    );
    expect(settledUnused ?? []).toHaveLength(0);
  });

  it('picks up a newly created asset after settling', async () => {
    const workspace = await makeWorkspace();
    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    await indexer.initialize();

    const assetPath = join(workspace, 'new.json');
    await writeFile(assetPath, LOTTIE_DOC);

    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(assetPath, 'created');
    const result = await update;

    expect(result.upsertedAssetPaths).toEqual([assetPath]);
    expect(result.snapshot.assets.some((a) => a.path === assetPath)).toBe(true);
  });

  it('removes an asset that was deleted', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'gone.json');
    await writeFile(assetPath, LOTTIE_DOC);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    await indexer.initialize();
    await nextUpdate(indexer); // the deferred reference-count-completion commit

    await unlink(assetPath);
    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(assetPath, 'deleted');
    const result = await update;

    expect(result.removedAssetPaths).toEqual([assetPath]);
    expect(result.snapshot.assets.some((a) => a.path === assetPath)).toBe(false);
    expect(result.snapshot.referenceCounts.has(assetPath)).toBe(false);
  });

  it('converges to "absent" when a delete event arrives for a path that was actually replaced', async () => {
    // Simulates an atomic-replace sequence where a stale 'deleted' event
    // is the only one observed after the file already has new content on
    // disk — the indexer must trust the filesystem, not the event kind.
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'replaced.json');
    await writeFile(assetPath, LOTTIE_DOC);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    await indexer.initialize();
    await nextUpdate(indexer); // the deferred reference-count-completion commit

    // File still exists on disk; only a stray 'created' event fires (as
    // ChangeCoalescer would resolve a delete-then-create sequence to).
    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(assetPath, 'created');
    const result = await update;

    expect(result.snapshot.assets.some((a) => a.path === assetPath)).toBe(true);
  });

  it('establishes a reference count for a brand-new asset', async () => {
    const workspace = await makeWorkspace();
    await mkdir(join(workspace, 'src'), { recursive: true });
    await writeFile(join(workspace, 'src', 'App.ts'), `import hero from '../../hero.json';\n`);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    await indexer.initialize();

    const assetPath = join(workspace, 'hero.json');
    await writeFile(assetPath, LOTTIE_DOC);

    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(assetPath, 'created');
    const result = await update;

    expect(result.snapshot.referenceCounts.get(assetPath)).toBe(1);
  });

  it('incrementally updates reference counts when a source file adds a reference', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'hero.json');
    await writeFile(assetPath, LOTTIE_DOC);
    const sourcePath = join(workspace, 'App.ts');
    await writeFile(sourcePath, `console.log('nothing here');\n`);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const initial = await initializeAndAwaitReferenceCounts(indexer);
    expect(initial.referenceCounts.get(assetPath)).toBe(0);

    await writeFile(sourcePath, `import hero from '../../hero.json';\n`);
    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(sourcePath, 'changed');
    const result = await update;

    expect(result.snapshot.referenceCounts.get(assetPath)).toBe(1);
  });

  it('decrements reference counts when a reference is removed from a source file', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'hero.json');
    await writeFile(assetPath, LOTTIE_DOC);
    const sourcePath = join(workspace, 'App.ts');
    await writeFile(sourcePath, `import hero from '../../hero.json';\n`);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const initial = await initializeAndAwaitReferenceCounts(indexer);
    expect(initial.referenceCounts.get(assetPath)).toBe(1);

    await writeFile(sourcePath, `console.log('unrelated');\n`);
    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(sourcePath, 'changed');
    const result = await update;

    expect(result.snapshot.referenceCounts.get(assetPath)).toBe(0);
  });

  it("retracts a source file's contributions entirely when it is deleted", async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'hero.json');
    await writeFile(assetPath, LOTTIE_DOC);
    const sourcePath = join(workspace, 'App.ts');
    await writeFile(sourcePath, `import hero from '../../hero.json';\n`);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const initial = await initializeAndAwaitReferenceCounts(indexer);
    expect(initial.referenceCounts.get(assetPath)).toBe(1);

    await unlink(sourcePath);
    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(sourcePath, 'deleted');
    const result = await update;

    expect(result.snapshot.referenceCounts.get(assetPath)).toBe(0);
  });

  it('reloads .animoriarc when it changes and reflects new diagnostics', async () => {
    const workspace = await makeWorkspace();
    const assetPath = join(workspace, 'a.gif');
    await writeFile(assetPath, Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const initial = await indexer.initialize();
    expect(initial.ruleReport?.diagnostics ?? []).toHaveLength(0);

    const configPath = join(workspace, '.animoriarc.json');
    await writeFile(configPath, JSON.stringify({ rules: { 'no-gif': 'error' } }));

    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(configPath, 'created');
    const result = await update;

    expect(result.snapshot.ruleReport?.diagnostics).toHaveLength(1);
    expect(result.snapshot.ruleReport?.diagnostics[0]?.ruleId).toBe('no-gif');
  });

  it('computes a Health Score of 100 for a clean initial snapshot', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'hero.json'), LOTTIE_DOC);

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const snapshot = await indexer.initialize();

    expect(snapshot.healthScore?.score).toBe(100);
    expect(snapshot.healthScore?.totalAssetCount).toBe(1);
  });

  it('recomputes the Health Score reactively when a new rule violation appears', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'a.gif'), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const initial = await indexer.initialize();
    expect(initial.healthScore?.score).toBe(100);

    const configPath = join(workspace, '.animoriarc.json');
    await writeFile(configPath, JSON.stringify({ rules: { 'no-gif': 'error' } }));

    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(configPath, 'created');
    const result = await update;

    expect(result.snapshot.healthScore?.score).toBeLessThan(100);
    expect(result.snapshot.healthScore?.categories[0]?.ruleId).toBe('no-gif');
  });

  it('merges concurrent notifications for the same settle window into one batch', async () => {
    const workspace = await makeWorkspace();
    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 30, maxWaitMs: 200 })
    );
    await indexer.initialize();

    const a = join(workspace, 'a.json');
    const b = join(workspace, 'b.json');
    await writeFile(a, LOTTIE_DOC);
    await writeFile(b, LOTTIE_DOC);

    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(a, 'created');
    indexer.notifyFileChanged(b, 'created');
    const result = await update;

    expect(new Set(result.upsertedAssetPaths)).toEqual(new Set([a, b]));
  });

  it('increments generation on every applied batch', async () => {
    const workspace = await makeWorkspace();
    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    const initial = await indexer.initialize();
    expect(initial.generation).toBe(1);

    const assetPath = join(workspace, 'x.json');
    await writeFile(assetPath, LOTTIE_DOC);
    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(assetPath, 'created');
    const result = await update;

    expect(result.snapshot.generation).toBe(2);
  });

  it('records a diagnostic entry per applied batch', async () => {
    const workspace = await makeWorkspace();
    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    await indexer.initialize();

    const assetPath = join(workspace, 'x.json');
    await writeFile(assetPath, LOTTIE_DOC);
    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(assetPath, 'created');
    await update;

    const diagnostics = indexer.getDiagnostics();
    expect(diagnostics).toHaveLength(2); // initialize() + the incremental batch
    expect(diagnostics[1]?.upsertedAssetPaths).toEqual([assetPath]);
  });

  it('surfaces a malformed .animoriarc as a warning on the very first diagnostic entry', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriarc.json'), '{ not valid json');

    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    await indexer.initialize();

    const [firstBatch] = indexer.getDiagnostics();
    expect(firstBatch?.warnings.length).toBeGreaterThan(0);
    expect(firstBatch?.warnings[0]).toMatch(/JSON/);
  });

  it('ignores files with unrecognized extensions', async () => {
    const workspace = await makeWorkspace();
    const indexer = trackIndexer(
      new WorkspaceIndexer({ workspacePath: workspace, settleMs: 10, maxWaitMs: 50 })
    );
    await indexer.initialize();

    const irrelevantPath = join(workspace, 'notes.md');
    await writeFile(irrelevantPath, '# notes');

    // Force a flush without ever seeing an onDidUpdate fire for it by
    // racing against a real asset change, which we do expect to fire.
    const assetPath = join(workspace, 'x.json');
    await writeFile(assetPath, LOTTIE_DOC);

    const update = nextUpdate(indexer);
    indexer.notifyFileChanged(irrelevantPath, 'created');
    indexer.notifyFileChanged(assetPath, 'created');
    const result = await update;

    expect(result.upsertedAssetPaths).toEqual([assetPath]);
  });
});
