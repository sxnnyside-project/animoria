use std::collections::HashMap;
use crate::contracts::asset::Asset;
use crate::contracts::duplicates::DuplicateGroup;

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
            // Sort bucket by shortest relative path or alphabetically to pick deterministic canonical
            let mut sorted = bucket;
            sorted.sort_by(|a, b| {
                a.relative_path.len().cmp(&b.relative_path.len())
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
