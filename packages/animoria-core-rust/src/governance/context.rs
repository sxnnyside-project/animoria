use super::policy::GovernancePolicy;
use crate::contracts::asset::Asset;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::usage::UsageReference;
use std::collections::HashSet;
use std::path::Path;

pub struct AnalysisContext<'a> {
    pub workspace_root: &'a Path,
    pub assets: &'a [Asset],
    pub references: &'a [UsageReference],
    pub duplicate_groups: &'a [DuplicateGroup],
    pub policy: &'a GovernancePolicy,
    referenced_asset_ids: HashSet<String>,
}

impl<'a> AnalysisContext<'a> {
    pub fn new(
        workspace_root: &'a Path,
        assets: &'a [Asset],
        references: &'a [UsageReference],
        duplicate_groups: &'a [DuplicateGroup],
        policy: &'a GovernancePolicy,
    ) -> Self {
        let mut referenced_asset_ids = HashSet::new();
        for r in references {
            referenced_asset_ids.insert(r.asset_id.clone());
            for asset in assets {
                if asset.path == r.asset_id || asset.id == r.asset_id {
                    referenced_asset_ids.insert(asset.id.clone());
                    referenced_asset_ids.insert(asset.path.clone());
                }
            }
        }

        Self {
            workspace_root,
            assets,
            references,
            duplicate_groups,
            policy,
            referenced_asset_ids,
        }
    }

    pub fn is_asset_referenced(&self, asset_id_or_path: &str) -> bool {
        self.referenced_asset_ids.contains(asset_id_or_path)
    }

    pub fn references_for_asset(&self, asset_id_or_path: &str) -> Vec<&UsageReference> {
        self.references
            .iter()
            .filter(|r| {
                r.asset_id == asset_id_or_path
                    || self.assets.iter().any(|a| {
                        (a.id == asset_id_or_path || a.path == asset_id_or_path)
                            && (r.asset_id == a.path || r.asset_id == a.id)
                    })
            })
            .collect()
    }
}
