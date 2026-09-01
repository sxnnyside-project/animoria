use crate::contracts::asset::Asset;
use crate::contracts::duplicates::DuplicateGroup;
use std::collections::HashMap;

/// Groups assets by identical SHA-256 content hash and picks one canonical
/// copy per group.
///
/// Assets with no hash (see `hasher::hash_assets_in_parallel` — unreadable
/// files are left unhashed rather than failing the scan) are silently
/// excluded from grouping here, which is correct: a hash-less asset cannot
/// be proven identical to anything, so it should not be flagged as a
/// duplicate of one.
pub fn find_duplicate_groups(assets: &[Asset]) -> Vec<DuplicateGroup> {
    let mut hash_buckets: HashMap<String, Vec<&Asset>> = HashMap::new();

    for asset in assets {
        if let Some(ref hash) = asset.content_hash {
            hash_buckets.entry(hash.clone()).or_default().push(asset);
        }
    }

    let mut duplicate_groups = Vec::new();
    let mut group_idx = 1;

    for (hash, bucket) in hash_buckets {
        if bucket.len() > 1 {
            // Shortest relative path wins as canonical (ties broken
            // alphabetically) — a deliberate proxy for "closest to the
            // project root is more likely the original, a deeper copy is
            // more likely the accidental duplicate," and deterministic so
            // the same workspace always nominates the same canonical asset
            // across scans, which `no-duplicate-content` and the CLI's
            // `clean` both depend on for stable output.
            let mut sorted = bucket;
            sorted.sort_by(|a, b| {
                a.relative_path
                    .len()
                    .cmp(&b.relative_path.len())
                    .then_with(|| a.relative_path.cmp(&b.relative_path))
            });

            let canonical_asset_id = sorted[0].id.clone();
            let asset_ids: Vec<String> = sorted.iter().map(|a| a.id.clone()).collect();
            let single_size = sorted[0].size_bytes;
            let wasted_bytes = single_size * (sorted.len() as u64 - 1);

            duplicate_groups.push(DuplicateGroup {
                id: format!("dup-group-{}", group_idx),
                content_hash: hash,
                canonical_asset_id,
                asset_ids,
                wasted_bytes,
            });

            group_idx += 1;
        }
    }

    duplicate_groups.sort_by(|a, b| a.id.cmp(&b.id));
    duplicate_groups
}
