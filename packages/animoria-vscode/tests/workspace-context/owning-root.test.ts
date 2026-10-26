import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { rootForPath } from '../../src/panels/vscode-host-bridge.js';
import {
  mergeRoots,
  owningRoot,
  relativeAssetPath,
  resolveSymlinks,
  trashInOwningRoot,
} from '../../src/workspace-context/owning-root.js';

const roots = [{ path: '/w/app' }, { path: '/w/app-extra' }, { path: '/w/app/packages/ui' }];

describe('owningRoot', () => {
  it('picks the folder that contains the file, not just the first one', () => {
    expect(owningRoot(roots, '/w/app-extra/logo.png')?.path).toBe('/w/app-extra');
  });

  it('does not treat a sibling that shares a name prefix as the owner', () => {
    expect(owningRoot([{ path: '/w/app' }], '/w/app-extra/logo.png')).toBeUndefined();
    expect(owningRoot([{ path: '/w/app' }], '/w/app.png')).toBeUndefined();
  });

  it('resolves nested roots to the deepest one', () => {
    expect(owningRoot(roots, '/w/app/packages/ui/icons/a.svg')?.path).toBe('/w/app/packages/ui');
    expect(owningRoot(roots, '/w/app/src/a.svg')?.path).toBe('/w/app');
  });

  it('accepts the root itself and rejects paths outside every root', () => {
    expect(owningRoot(roots, '/w/app')?.path).toBe('/w/app');
    expect(owningRoot(roots, '/elsewhere/a.png')).toBeUndefined();
    expect(owningRoot([], '/w/app/a.png')).toBeUndefined();
  });

  it('is not fooled by ".." segments that leave the root', () => {
    expect(owningRoot([{ path: '/w/app' }], '/w/app/../secret/a.png')).toBeUndefined();
  });
});

describe('trashInOwningRoot', () => {
  it('sends the trash request to the root that owns the asset', async () => {
    const trashAsset = vi.fn().mockResolvedValue({});
    const seen: string[] = [];

    const used = await trashInOwningRoot(
      { trashAsset },
      [{ path: '/w/first' }, { path: '/w/second' }],
      'asset-1',
      '/w/second/img/logo.png',
      (root) => seen.push(root),
    );

    expect(used).toBe('/w/second');
    expect(trashAsset).toHaveBeenCalledWith('/w/second', 'asset-1', '/w/second/img/logo.png');
    expect(seen).toEqual(['/w/second']);
  });

  it('refuses an asset outside every open folder without calling the daemon', async () => {
    const trashAsset = vi.fn();
    const beforeTrash = vi.fn();

    await expect(
      trashInOwningRoot(
        { trashAsset },
        [{ path: '/w/first' }],
        'a',
        '/other/logo.png',
        beforeTrash,
      ),
    ).rejects.toThrow('not inside an open workspace folder');

    expect(trashAsset).not.toHaveBeenCalled();
    expect(beforeTrash).not.toHaveBeenCalled();
  });
});

// The daemon reports canonical paths: a folder opened as /var/x (a symlink to /private/var/x)
// owns assets whose path starts with /private/var/x.
describe('folders opened through a symlink', () => {
  const folderAsOpened = ['/var/x'];
  const scannedCanonical = ['/private/var/x'];
  const assetPath = '/private/var/x/img/logo.png';

  it('mergeRoots keeps both forms once', () => {
    expect(mergeRoots(folderAsOpened, scannedCanonical, scannedCanonical)).toEqual([
      { path: '/var/x' },
      { path: '/private/var/x' },
    ]);
  });

  it('owningRoot finds nothing in the as-opened form alone, which is why scanned roots are merged in', () => {
    expect(owningRoot(mergeRoots(folderAsOpened), assetPath)).toBeUndefined();
    expect(owningRoot(mergeRoots(folderAsOpened, scannedCanonical), assetPath)?.path).toBe(
      '/private/var/x',
    );
  });

  it('trashes in the canonical root instead of refusing the asset', async () => {
    const trashAsset = vi.fn().mockResolvedValue({});

    const used = await trashInOwningRoot(
      { trashAsset },
      mergeRoots(folderAsOpened, scannedCanonical),
      'a',
      assetPath,
    );

    expect(used).toBe('/private/var/x');
    expect(trashAsset).toHaveBeenCalledWith('/private/var/x', 'a', assetPath);
  });

  it('copy path is relative to the owning root, and absolute only when no root owns the file', () => {
    const roots = mergeRoots(folderAsOpened, scannedCanonical);
    expect(relativeAssetPath(roots, assetPath)).toBe('img/logo.png');
    expect(relativeAssetPath(roots, '/elsewhere/logo.png')).toBe('/elsewhere/logo.png');
  });

  it('picks the second of two folders for the relative path', () => {
    const roots = mergeRoots(['/w/first', '/w/second']);
    expect(relativeAssetPath(roots, '/w/second/img/logo.png')).toBe('img/logo.png');
  });
});

describe('resolveSymlinks', () => {
  it('returns the real path of a folder reached through a symlink, and leaves a missing path alone', () => {
    const base = mkdtempSync(join(tmpdir(), 'animoria-link-'));
    try {
      const real = join(base, 'real');
      const link = join(base, 'link');
      mkdirSync(real);
      symlinkSync(real, link, 'dir');

      expect(resolveSymlinks(link)).toBe(realpathSync(real));
      expect(
        owningRoot(mergeRoots([link], [resolveSymlinks(link)]), join(realpathSync(real), 'a.png')),
      ).toBeDefined();
      expect(resolveSymlinks(join(base, 'missing'))).toBe(join(base, 'missing'));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('rootForPath (host bridge)', () => {
  const roots = [
    { id: 'root-0', name: 'first', path: '/link/first', scannedPath: '/real/first' },
    { id: 'root-1', name: 'second', path: '/link/second', scannedPath: '/real/second' },
  ];

  it('attributes a canonical asset path to the folder opened through the symlink', () => {
    expect(rootForPath(roots, '/real/second/img/a.png')?.id).toBe('root-1');
    expect(rootForPath(roots, '/link/second/img/a.png')?.id).toBe('root-1');
  });

  it('falls back to the first root only when no folder owns the path', () => {
    expect(rootForPath(roots, '/elsewhere/a.png')?.id).toBe('root-0');
    expect(rootForPath([], '/elsewhere/a.png')).toBeNull();
  });

  it('works for sessions that carry no scannedPath', () => {
    expect(rootForPath([{ id: 'r', name: 'r', path: '/w/app' }], '/w/app/a.png')?.id).toBe('r');
  });
});
