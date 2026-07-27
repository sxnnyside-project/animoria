import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { AnimoriaAsset } from '../../types/asset.js';

const BATCH_SIZE = 4;

/**
 * Groups assets by exact file-content identity (MD5 of the raw bytes).
 *
 * ## Why this is a standalone, shared utility
 * Content hashing is the one piece of I/O-bound logic both
 * `GovernanceAnalyzer`'s always-on "duplicate assets" heuristic and the
 * Assist Duplicate Resolution workflow (`duplicate-group-detector.js`)
 * need to agree on. Two independent implementations of "are these files
 * the same" would be exactly the kind of duplicated governance logic
 * this codebase's architecture is built to avoid — so there is only one,
 * and everything that needs to answer "which assets are byte-identical"
 * calls it.
 *
 * MD5 is used for grouping only, not as a security primitive — content
 * identity for deduplication has no adversarial threat model, and MD5 is
 * fast and more than sufficient to distinguish unrelated animation
 * files.
 *
 * @param assets - Candidate assets to hash and group. Callers should
 *   pre-filter to `status === 'parsed'` — an asset that failed parsing
 *   has no reliable content to compare.
 * @returns A map from content hash to every asset sharing that hash.
 *   Groups of size 1 (no duplicate) are included — filtering those out
 *   is the caller's concern, not this function's, since "hash → assets"
 *   is a complete and reusable fact independent of what threshold of
 *   duplication a caller cares about.
 */
export async function computeContentHashGroups(
  assets: readonly AnimoriaAsset[]
): Promise<ReadonlyMap<string, AnimoriaAsset[]>> {
  const hashMap = new Map<string, AnimoriaAsset[]>();

  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (asset) => {
        const hash = await hashAssetContent(asset);
        const group = hashMap.get(hash) ?? [];
        group.push(asset);
        hashMap.set(hash, group);
      })
    );
  }

  return hashMap;
}

/** Computes the content hash for a single asset. Exposed for validation re-checks. */
export async function hashAssetContent(asset: AnimoriaAsset): Promise<string> {
  const content = await readFile(asset.path);
  return createHash('md5').update(content).digest('hex');
}
