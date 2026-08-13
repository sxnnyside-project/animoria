import type { AnimoriaAsset } from '../../types/asset.js';
import { computeContentHashGroups } from './content-hash.js';
import type { DuplicateCandidate, DuplicateGroup } from './types.js';

/**
 * Finds every group of byte-identical assets in a workspace.
 *
 * ## Reuses, never recomputes, reference counts
 * Determining *how many* source files reference an asset is already the
 * reactive indexer's job (`WorkspaceIndexer`, via `UsageScanner`) — this
 * function takes `referenceCounts` as an input rather than scanning
 * usage itself. That keeps duplicate detection cheap (it only needs to
 * read and hash asset files, which `computeContentHashGroups` already
 * does once) and keeps this module honestly scoped to the one thing it
 * actually discovers: content identity.
 *
 * @param assets - Every asset to consider. Only `status === 'parsed'`
 *   assets are hashed — an asset that failed parsing has no reliable
 *   content to compare and is silently excluded, matching how
 *   `GovernanceAnalyzer` already treats unparsed assets.
 * @param referenceCounts - Reference counts keyed by asset path, e.g.
 *   `WorkspaceIndexSnapshot.referenceCounts`. An asset absent from this
 *   map is treated as having zero references.
 * @returns Every group with two or more candidates, ordered
 *   deterministically: highest `potentialSavingsBytes` first (the
 *   groups worth a developer's attention first), tie-broken by group
 *   `id` for full determinism. Within a group, candidates are ordered
 *   by reference count descending, then by path length ascending
 *   (shorter, more "canonical-looking" paths first), then
 *   alphabetically — see `canonical-suggestion.js`, which relies on
 *   this exact ordering to pick its default suggestion as simply "the
 *   first candidate."
 */
export async function detectDuplicateGroups(
  assets: readonly AnimoriaAsset[],
  referenceCounts: ReadonlyMap<string, number>
): Promise<readonly DuplicateGroup[]> {
  const parsed = assets.filter((asset) => asset.status === 'parsed');
  const hashGroups = await computeContentHashGroups(parsed);

  const groups: DuplicateGroup[] = [];

  for (const [hash, groupAssets] of hashGroups) {
    if (groupAssets.length < 2) continue;

    const candidates = orderCandidates(
      groupAssets.map((asset) => ({
        asset,
        referenceCount: referenceCounts.get(asset.path) ?? 0,
      }))
    );

    const sizeBytes = candidates[0]!.asset.sizeBytes;
    groups.push({
      id: hash,
      // Byte equality, established by hashing the files themselves — not by their
      // names, which `no-duplicate-names` reports separately and for a different reason.
      matchKind: 'content-hash',
      contentHash: hash,
      candidates,
      sizeBytes,
      potentialSavingsBytes: (candidates.length - 1) * sizeBytes,
    });
  }

  return groups
    .slice()
    .sort((a, b) => b.potentialSavingsBytes - a.potentialSavingsBytes || a.id.localeCompare(b.id));
}

function orderCandidates(candidates: readonly DuplicateCandidate[]): readonly DuplicateCandidate[] {
  return candidates.slice().sort((a, b) => {
    if (a.referenceCount !== b.referenceCount) return b.referenceCount - a.referenceCount;
    if (a.asset.path.length !== b.asset.path.length)
      return a.asset.path.length - b.asset.path.length;
    return a.asset.path.localeCompare(b.asset.path);
  });
}
