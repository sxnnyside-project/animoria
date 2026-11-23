use super::policy::GovernancePolicy;
use crate::contracts::asset::Asset;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::usage::UsageReference;
use std::collections::HashSet;
use std::path::Path;

/// Shared immutable analysis context passed into governance rules for evaluation.
pub struct AnalysisContext<'a> {
    /// Absolute filesystem path to the workspace root directory.
    pub workspace_root: &'a Path,
    /// Slice of all visual assets discovered in the workspace.
    pub assets: &'a [Asset],
    /// Slice of all traced source code usage references.
    pub references: &'a [UsageReference],
    /// Slice of all identified duplicate asset clusters.
    pub duplicate_groups: &'a [DuplicateGroup],
    /// Active governance policy resolved for this workspace.
    pub policy: &'a GovernancePolicy,
    referenced_asset_ids: HashSet<String>,
}

impl<'a> AnalysisContext<'a> {
    /// Constructs an analysis context from assets, usage references, duplicate clusters, and policy.
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

    /// Resolves the governing policy applicable to a specific relative asset path.
    pub fn policy_for(&self, relative_path: &str) -> &GovernancePolicy {
        self.policy.policy_for_path(relative_path)
    }

    /// Determines whether the given asset identifier is referenced in workspace source code.
    pub fn is_asset_referenced(&self, asset_id_or_path: &str) -> bool {
        self.referenced_asset_ids.contains(asset_id_or_path)
    }

    /// Returns all source code references matched for the given asset identifier.
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
