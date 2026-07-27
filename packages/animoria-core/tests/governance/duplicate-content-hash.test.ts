import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  computeContentHashGroups,
  hashAssetContent,
} from '../../src/governance/duplicates/content-hash';
import type { AnimoriaAsset } from '../../src/types/asset';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-hash-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function asset(path: string, overrides: Partial<AnimoriaAsset> = {}): AnimoriaAsset {
  return {
    path,
    name: path.split('/').pop()!,
    stem: path
      .split('/')
      .pop()!
      .replace(/\.\w+$/, ''),
    format: 'lottie',
    sizeBytes: 10,
    mtime: 0,
    status: 'parsed',
    ...overrides,
  };
}

describe('computeContentHashGroups', () => {
  it('groups byte-identical files under the same hash', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    const b = join(workspace, 'b.json');
    const c = join(workspace, 'c.json');
    await writeFile(a, 'same content');
    await writeFile(b, 'same content');
    await writeFile(c, 'different content');

    const groups = await computeContentHashGroups([asset(a), asset(b), asset(c)]);

    const sizes = Array.from(groups.values())
      .map((g) => g.length)
      .sort();
    expect(sizes).toEqual([1, 2]);
  });

  it('returns groups of size 1 for unique content, not filtered out', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    await writeFile(a, 'unique');
    const groups = await computeContentHashGroups([asset(a)]);
    expect(Array.from(groups.values())[0]).toHaveLength(1);
  });

  it('supports groups larger than two candidates', async () => {
    const workspace = await makeWorkspace();
    const paths = ['a.json', 'b.json', 'c.json', 'd.json', 'e.json'].map((n) => join(workspace, n));
    await Promise.all(paths.map((p) => writeFile(p, 'identical payload')));

    const groups = await computeContentHashGroups(paths.map((p) => asset(p)));
    expect(Array.from(groups.values())[0]).toHaveLength(5);
  });

  it('returns an empty map for no assets', async () => {
    expect((await computeContentHashGroups([])).size).toBe(0);
  });
});

describe('hashAssetContent', () => {
  it('produces the same hash for identical content', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    const b = join(workspace, 'b.json');
    await writeFile(a, 'same');
    await writeFile(b, 'same');
    expect(await hashAssetContent(asset(a))).toBe(await hashAssetContent(asset(b)));
  });

  it('produces different hashes for different content', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    const b = join(workspace, 'b.json');
    await writeFile(a, 'one');
    await writeFile(b, 'two');
    expect(await hashAssetContent(asset(a))).not.toBe(await hashAssetContent(asset(b)));
  });
});
