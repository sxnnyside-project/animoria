import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAssetTreeProjection } from '../../src/navigation/asset-tree-projection';
import type { AssetFolderNode } from '../../src/navigation/types';
import type { AnimoriaAsset } from '../../src/types/asset';

const WORKSPACE = '/workspace';

function asset(relativePath: string): AnimoriaAsset {
  const path = join(WORKSPACE, relativePath);
  const name = relativePath.split('/').pop()!;
  return {
    path,
    name,
    stem: name.replace(/\.\w+$/, ''),
    format: 'lottie',
    sizeBytes: 10,
    mtime: 0,
    status: 'parsed',
  };
}

describe('buildAssetTreeProjection', () => {
  it('places a root-level asset as a top-level file node', () => {
    const tree = buildAssetTreeProjection([asset('hero.json')], WORKSPACE);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ kind: 'file', asset: { name: 'hero.json' } });
  });

  it('nests an asset under its containing directory', () => {
    const tree = buildAssetTreeProjection([asset('assets/animations/hero.json')], WORKSPACE);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ kind: 'folder', name: 'assets' });
    const assetsFolder = tree[0] as AssetFolderNode;
    expect(assetsFolder.children).toHaveLength(1);
    expect(assetsFolder.children[0]).toMatchObject({ kind: 'folder', name: 'animations' });
    expect(assetsFolder.children[0].children[0]).toMatchObject({
      kind: 'file',
      asset: { name: 'hero.json' },
    });
  });

  it('groups multiple assets under a shared folder', () => {
    const tree = buildAssetTreeProjection(
      [asset('assets/a.json'), asset('assets/b.json')],
      WORKSPACE
    );
    const folder = tree[0] as AssetFolderNode;
    expect(folder.children).toHaveLength(2);
  });

  it('sorts folders before files at the same level', () => {
    const tree = buildAssetTreeProjection(
      [asset('z-asset.json'), asset('a-folder/inner.json')],
      WORKSPACE
    );
    expect(tree.map((n) => n.kind)).toEqual(['folder', 'file']);
  });

  it('sorts siblings alphabetically within each group', () => {
    const tree = buildAssetTreeProjection(
      [asset('b.json'), asset('a.json'), asset('c.json')],
      WORKSPACE
    );
    expect(tree.map((n) => (n as { asset: { name: string } }).asset.name)).toEqual([
      'a.json',
      'b.json',
      'c.json',
    ]);
  });

  it('assigns relativePath using forward slashes for nested folders', () => {
    const tree = buildAssetTreeProjection([asset('a/b/c.json')], WORKSPACE);
    const a = tree[0] as AssetFolderNode;
    const b = a.children[0];
    expect(a.relativePath).toBe('a');
    expect(b.relativePath).toBe('a/b');
  });

  it('produces an empty projection for no assets', () => {
    expect(buildAssetTreeProjection([], WORKSPACE)).toEqual([]);
  });

  it('produces byte-for-byte identical output across repeated calls (deterministic)', () => {
    const assets = [asset('b/x.json'), asset('a/y.json'), asset('root.json')];
    const first = buildAssetTreeProjection(assets, WORKSPACE);
    const second = buildAssetTreeProjection(assets, WORKSPACE);
    expect(second).toEqual(first);
  });
});
