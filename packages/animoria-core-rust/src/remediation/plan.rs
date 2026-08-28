use std::time::{SystemTime, UNIX_EPOCH};
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::remediation::ResolutionPlan;

pub fn create_duplicate_resolution_plan(
    duplicate_group: &DuplicateGroup,
) -> ResolutionPlan {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let target_assets_to_delete: Vec<String> = duplicate_group
        .asset_ids
        .iter()
        .filter(|id| id != &&duplicate_group.canonical_asset_id)
        .cloned()
        .collect();

    ResolutionPlan {
        plan_id: format!("plan-{}", duplicate_group.id),
        created_at_ms: now_ms,
        duplicate_group_id: Some(duplicate_group.id.clone()),
        target_assets_to_delete,
        references_to_rewrite: Vec::new(),
    }
}
