import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { WorkspaceIndexUpdate } from '../../src/indexer/types.js';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer.js';

const tempDirs: string[] = [];
const indexers: WorkspaceIndexer[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-indexer-ignore-'));
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

/**
 * Proves `.animoriaignore` is honored end to end through the real
 * indexer — not just that `loadAnimoriaIgnore`/`compileIgnorePatterns`
 * work in isolation (see `animoria-ignore.test.ts`). Every other
 * component (governance, cleanup, duplicate detection, health score,
 * the tree view) only ever sees `WorkspaceIndexer`'s asset list, so
 * proving an ignored asset never enters that list here is the single
 * point of leverage for "consistent everywhere" — there is nothing else
 * to wire up.
 */
describe('WorkspaceIndexer — .animoriaignore', () => {
  it('excludes a matching asset from the initial scan', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriaignore'), 'legacy\n');
    await writeFile(join(workspace, 'hero.json'), LOTTIE_DOC);
    await mkdir(join(workspace, 'legacy'), { recursive: true });
    await writeFile(join(workspace, 'legacy', 'old-hero.json'), LOTTIE_DOC);

    const indexer = trackIndexer(new WorkspaceIndexer({ workspacePath: workspace }));
    const snapshot = await indexer.initialize();

    const paths = snapshot.assets.map((a) => a.path);
    expect(paths).toContain(join(workspace, 'hero.json'));
    expect(paths).not.toContain(join(workspace, 'legacy', 'old-hero.json'));
  });

  it('exposes the loaded patterns via getIgnorePatterns()', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriaignore'), 'legacy\n');

    const indexer = trackIndexer(new WorkspaceIndexer({ workspacePath: workspace }));
    await indexer.initialize();

    expect(indexer.getIgnorePatterns()).toContain('**/legacy');
    expect(indexer.getIgnorePatterns()).toContain('**/legacy/**');
  });

  it('drops an already-indexed asset once .animoriaignore is edited to cover it', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, 'hero.json'), LOTTIE_DOC);

    const indexer = trackIndexer(new WorkspaceIndexer({ workspacePath: workspace }));
    const initial = await indexer.initialize();
    expect(initial.assets.map((a) => a.path)).toContain(join(workspace, 'hero.json'));
    await nextUpdate(indexer); // the deferred reference-count-completion commit

    const settled = nextUpdate(indexer);
    await writeFile(join(workspace, '.animoriaignore'), 'hero.json\n');
    indexer.notifyFileChanged(join(workspace, '.animoriaignore'), 'created');
    const update = await settled;

    expect(update.analysis.assets.map((a) => a.path)).not.toContain(join(workspace, 'hero.json'));
    expect(update.removedAssetPaths).toContain(join(workspace, 'hero.json'));
  });

  it('does not index a newly created asset that matches an existing .animoriaignore pattern', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriaignore'), 'draft-*.json\n');

    const indexer = trackIndexer(new WorkspaceIndexer({ workspacePath: workspace }));
    await indexer.initialize();

    const settled = nextUpdate(indexer);
    await writeFile(join(workspace, 'draft-hero.json'), LOTTIE_DOC);
    indexer.notifyFileChanged(join(workspace, 'draft-hero.json'), 'created');
    const update = await settled;

    expect(update.analysis.assets.map((a) => a.path)).not.toContain(
      join(workspace, 'draft-hero.json')
    );
  });

  it('re-admits a previously ignored asset once the covering pattern is removed and the asset is re-touched', async () => {
    const workspace = await makeWorkspace();
    await writeFile(join(workspace, '.animoriaignore'), 'hero.json\n');
    await writeFile(join(workspace, 'hero.json'), LOTTIE_DOC);

    const indexer = trackIndexer(new WorkspaceIndexer({ workspacePath: workspace }));
    const initial = await indexer.initialize();
    expect(initial.assets.map((a) => a.path)).not.toContain(join(workspace, 'hero.json'));

    const ignoreReloaded = nextUpdate(indexer);
    await unlink(join(workspace, '.animoriaignore'));
    indexer.notifyFileChanged(join(workspace, '.animoriaignore'), 'deleted');
    await ignoreReloaded;
    expect(indexer.getIgnorePatterns()).toEqual([]);

    // Removing the pattern alone doesn't retroactively re-scan a file
    // the initial scan never picked up in the first place — the asset
    // must actually be (re-)touched for the indexer to discover it, the
    // same as any other never-before-seen file.
    const assetIndexed = nextUpdate(indexer);
    indexer.notifyFileChanged(join(workspace, 'hero.json'), 'created');
    const update = await assetIndexed;

    expect(update.analysis.assets.map((a) => a.path)).toContain(join(workspace, 'hero.json'));
  });
});
