use std::collections::HashSet;
use std::path::Path;
use crate::contracts::asset::Asset;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::usage::UsageReference;
use super::policy::GovernancePolicy;

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
        let referenced_asset_ids: HashSet<String> = references
            .iter()
            .map(|r| r.asset_id.clone())
            .collect();

        Self {
            workspace_root,
            assets,
            references,
            duplicate_groups,
            policy,
            referenced_asset_ids,
        }
    }

    pub fn is_asset_referenced(&self, asset_id: &str) -> bool {
        self.referenced_asset_ids.contains(asset_id)
    }

    pub fn references_for_asset(&self, asset_id: &str) -> Vec<&UsageReference> {
        self.references
            .iter()
            .filter(|r| r.asset_id == asset_id)
            .collect()
    }
}
