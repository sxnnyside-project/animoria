import type { AnimoriaAsset } from '@animoria/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnimoriaTreeProvider } from '../../src/providers/AnimoriaTreeProvider.js';
import { resetTestWorkspace } from '../harness.js';

/**
 * A thumbnail request always ends in an answer.
 *
 * ## The regression
 * `setAssets()` cleared `_thumbnails` and `_thumbnailFailures` unconditionally, and
 * `applyAggregate` calls it on every index update and every explicit refresh. An asset
 * with neither a thumbnail nor a recorded failure renders the "still generating"
 * spinner, so:
 *
 * 1. **Run Governance Analysis** applies an aggregate and regenerates nothing →
 *    every asset in the tree span forever.
 * 2. **Refresh** cleared state that was still perfectly valid — a thumbnail is keyed by
 *    absolute path and describes bytes on disk, which a new analysis does not change.
 * 3. A thrown or cancelled generation batch settled *nothing*, so one failure left the
 *    whole gallery loading with no error anywhere.
 *
 * ## What these assert
 * The tree's three thumbnail states — rendered, unavailable, still generating — and
 * that the third is never where an asset comes to rest. `assetsAwaitingThumbnails()`
 * is the spinner, expressed as data: anything it still returns after a settled pass is
 * an asset the user is watching a spinner on.
 */

function asset(path: string): AnimoriaAsset {
  return {
    path,
    name: path.slice(path.lastIndexOf('/') + 1),
    stem: 'x',
    format: 'lottie',
    sizeBytes: 100,
    mtime: 1,
    status: 'parsed',
  } as AnimoriaAsset;
}

const A = asset('/workspace/assets/a.json');
const B = asset('/workspace/assets/b.json');

beforeEach(() => {
  resetTestWorkspace();
});

describe('thumbnails — a settled asset stays settled across an analysis', () => {
  it('keeps a rendered thumbnail when a new analysis arrives', () => {
    // The governance sequence: assets indexed, thumbnails generated, then an
    // aggregate applied with no generation pass behind it.
    const provider = new AnimoriaTreeProvider('/workspace');
    provider.setAssets([A, B]);
    provider.setThumbnail(A.path, '/workspace/.animoria/thumbnails/a.webp');
    provider.markThumbnailUnavailable(B.path);

    expect(provider.assetsAwaitingThumbnails()).toEqual([]);

    // "Run Governance Analysis" — applyAggregate → setAssets, nothing else.
    provider.setAssets([A, B]);

    expect(
      provider.assetsAwaitingThumbnails(),
      'a new analysis must not put settled assets back into a loading state'
    ).toEqual([]);
    expect(provider.getThumbnail(A.path)).toBe('/workspace/.animoria/thumbnails/a.webp');
  });

  it('reports assets that genuinely have no answer yet', () => {
    const provider = new AnimoriaTreeProvider('/workspace');
    provider.setAssets([A, B]);

    // Nothing has run: both are legitimately pending, and that is what the spinner
    // means. The bug was never that this state exists — it is that assets stayed here.
    expect(provider.assetsAwaitingThumbnails().map((entry) => entry.path)).toEqual([
      A.path,
      B.path,
    ]);

    provider.setThumbnail(A.path, '/thumb/a.webp');
    expect(provider.assetsAwaitingThumbnails().map((entry) => entry.path)).toEqual([B.path]);

    provider.markThumbnailUnavailable(B.path);
    expect(provider.assetsAwaitingThumbnails()).toEqual([]);
  });

  it('forgets thumbnails for assets that are gone', () => {
    // Retention must not become a leak: an asset removed from the workspace takes its
    // thumbnail state with it.
    const provider = new AnimoriaTreeProvider('/workspace');
    provider.setAssets([A, B]);
    provider.setThumbnail(A.path, '/thumb/a.webp');
    provider.markThumbnailUnavailable(B.path);

    provider.setAssets([A]);

    expect(provider.getThumbnail(A.path)).toBe('/thumb/a.webp');
    expect(provider.getThumbnail(B.path)).toBeUndefined();
    expect(provider.assetsAwaitingThumbnails()).toEqual([]);
  });

  it('settles an asset whose generation failed rather than leaving it pending', () => {
    // A failed render is a real outcome and the tree draws it as a format placeholder.
    // Leaving it pending draws a spinner instead, which claims work is still happening.
    const provider = new AnimoriaTreeProvider('/workspace');
    provider.setAssets([A]);
    provider.markThumbnailUnavailable(A.path);

    expect(provider.assetsAwaitingThumbnails()).toEqual([]);
    expect(provider.getThumbnail(A.path)).toBeUndefined();
  });

  it('lets a later success replace a recorded failure', () => {
    // A refresh after fixing a malformed asset must be able to show its thumbnail.
    const provider = new AnimoriaTreeProvider('/workspace');
    provider.setAssets([A]);
    provider.markThumbnailUnavailable(A.path);
    provider.setThumbnail(A.path, '/thumb/a.webp');

    expect(provider.getThumbnail(A.path)).toBe('/thumb/a.webp');
    expect(provider.assetsAwaitingThumbnails()).toEqual([]);
  });
});
