import { createHash } from 'node:crypto';
import type { AnimoriaAsset } from '../types/asset.js';

/**
 * Derives the on-disk cache key (file stem) for an asset's thumbnail.
 *
 * The key incorporates the asset's path, size, and modification time — not
 * path alone — so a cached thumbnail is invalidated automatically when the
 * underlying file changes, without needing a separate invalidation pass.
 * This is a deliberate correctness fix over path-only keys: a stale
 * thumbnail silently surviving a content edit would erode trust in the
 * gallery, which is the one thing a thumbnail exists to build.
 *
 * @param asset - The asset to derive a cache key for.
 * @returns An 8-character hex fragment suitable for use in a filename.
 */
export function computeThumbnailCacheKey(asset: AnimoriaAsset): string {
  return createHash('sha1')
    .update(asset.path)
    .update(String(asset.sizeBytes))
    .update(String(asset.mtime))
    .digest('hex')
    .slice(0, 8);
}

/**
 * A stable, content-independent hash of an asset's full path — used to
 * scope a thumbnail's filename (and stale-file cleanup) to *this specific
 * asset*, not just its filename stem.
 *
 * ## Why this exists
 * `stem` (filename without extension) is not unique across a workspace —
 * `icon.json`, `loading.json`, and `success.json` recurring once per
 * feature folder is a completely ordinary real-world layout. Before this
 * existed, the thumbnail cache's stale-file cleanup matched purely on
 * `${stem}-`, so regenerating one asset's thumbnail would delete a
 * same-stem asset's current thumbnail file out from under it — the tree
 * item, hover card, and preview panel would all keep pointing at a path
 * that no longer existed, rendering as a broken/missing-file icon. This
 * bug was deterministic (not a race) and reproduced on every regeneration
 * for any workspace with two same-stem assets, which explains why
 * deleting the whole thumbnail cache and regenerating never fixed it —
 * the very next generation pass reproduced the collision identically.
 *
 * Unlike {@link computeThumbnailCacheKey} (which intentionally changes
 * when the file's content changes, to invalidate the cache), this hash is
 * path-only and therefore stable across content edits — exactly what
 * cleanup needs to recognize "this asset's own previous cache entry" as
 * distinct from "a different asset that happens to share a stem."
 */
export function computeThumbnailPathHash(asset: AnimoriaAsset): string {
  return createHash('sha1').update(asset.path).digest('hex').slice(0, 8);
}
