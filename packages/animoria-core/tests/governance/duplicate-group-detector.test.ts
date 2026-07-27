import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { suggestCanonicalAsset } from '../../src/governance/duplicates/canonical-suggestion';
import { detectDuplicateGroups } from '../../src/governance/duplicates/duplicate-group-detector';
import type { AnimoriaAsset } from '../../src/types/asset';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'animoria-dupgroup-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function asset(path: string, sizeBytes = 100): AnimoriaAsset {
  const name = path.split('/').pop()!;
  return {
    path,
    name,
    stem: name.replace(/\.\w+$/, ''),
    format: 'lottie',
    sizeBytes,
    mtime: 0,
    status: 'parsed',
  };
}

describe('detectDuplicateGroups', () => {
  it('returns no groups when nothing duplicates', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    await writeFile(a, 'unique');
    const groups = await detectDuplicateGroups([asset(a)], new Map());
    expect(groups).toHaveLength(0);
  });

  it('detects a duplicate group with more than two candidates', async () => {
    const workspace = await makeWorkspace();
    const paths = ['a.json', 'b.json', 'c.json', 'd.json', 'e.json'].map((n) => join(workspace, n));
    await Promise.all(paths.map((p) => writeFile(p, 'same payload')));

    const groups = await detectDuplicateGroups(
      paths.map((p) => asset(p)),
      new Map()
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]!.candidates).toHaveLength(5);
  });

  it('computes potentialSavingsBytes as (n - 1) * sizeBytes', async () => {
    const workspace = await makeWorkspace();
    const paths = ['a.json', 'b.json', 'c.json'].map((n) => join(workspace, n));
    await Promise.all(paths.map((p) => writeFile(p, 'same payload')));

    const groups = await detectDuplicateGroups(
      paths.map((p) => asset(p, 500)),
      new Map()
    );

    expect(groups[0]!.potentialSavingsBytes).toBe(1000);
  });

  it('orders candidates by reference count descending', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    const b = join(workspace, 'b.json');
    await writeFile(a, 'same');
    await writeFile(b, 'same');

    const groups = await detectDuplicateGroups(
      [asset(a), asset(b)],
      new Map([
        [a, 1],
        [b, 5],
      ])
    );

    expect(groups[0]!.candidates[0]!.asset.path).toBe(b);
  });

  it('breaks reference-count ties by shorter path, then alphabetically', async () => {
    const workspace = await makeWorkspace();
    const short = join(workspace, 'a.json');
    const long = join(workspace, 'aa-longer-name.json');
    await writeFile(short, 'same');
    await writeFile(long, 'same');

    const groups = await detectDuplicateGroups([asset(long), asset(short)], new Map());
    expect(groups[0]!.candidates[0]!.asset.path).toBe(short);
  });

  it('orders groups by potentialSavingsBytes descending', async () => {
    const workspace = await makeWorkspace();
    const bigA = join(workspace, 'big-a.json');
    const bigB = join(workspace, 'big-b.json');
    const smallA = join(workspace, 'small-a.json');
    const smallB = join(workspace, 'small-b.json');
    await writeFile(bigA, 'x'.repeat(1000));
    await writeFile(bigB, 'x'.repeat(1000));
    await writeFile(smallA, 'y');
    await writeFile(smallB, 'y');

    const groups = await detectDuplicateGroups(
      [asset(bigA, 1000), asset(bigB, 1000), asset(smallA, 1), asset(smallB, 1)],
      new Map()
    );

    expect(groups[0]!.sizeBytes).toBe(1000);
    expect(groups[1]!.sizeBytes).toBe(1);
  });

  it('excludes assets that failed parsing', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    const b = join(workspace, 'b.json');
    await writeFile(a, 'same');
    await writeFile(b, 'same');

    const groups = await detectDuplicateGroups(
      [asset(a), { ...asset(b), status: 'error' }],
      new Map()
    );
    expect(groups).toHaveLength(0);
  });

  it('produces deterministic ordering across repeated calls', async () => {
    const workspace = await makeWorkspace();
    const paths = ['a.json', 'b.json', 'c.json'].map((n) => join(workspace, n));
    await Promise.all(paths.map((p) => writeFile(p, 'same')));
    const assets = paths.map((p) => asset(p));

    const first = await detectDuplicateGroups(assets, new Map());
    const second = await detectDuplicateGroups(assets, new Map());

    expect(second.map((g) => g.candidates.map((c) => c.asset.path))).toEqual(
      first.map((g) => g.candidates.map((c) => c.asset.path))
    );
  });
});

describe('suggestCanonicalAsset', () => {
  it('suggests the first (highest-priority) candidate', async () => {
    const workspace = await makeWorkspace();
    const a = join(workspace, 'a.json');
    const b = join(workspace, 'b.json');
    await writeFile(a, 'same');
    await writeFile(b, 'same');

    const groups = await detectDuplicateGroups(
      [asset(a), asset(b)],
      new Map([
        [a, 0],
        [b, 9],
      ])
    );

    expect(suggestCanonicalAsset(groups[0]!).path).toBe(b);
  });
});
