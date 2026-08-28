use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct TrashItem {
    pub asset_id: String,
    pub original_path: String,
    pub trashed_path: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub trashed_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct ResolutionPlan {
    pub plan_id: String,
    pub created_at_ms: u64,
    pub duplicate_group_id: Option<String>,
    pub target_assets_to_delete: Vec<String>,
    pub references_to_rewrite: Vec<String>,
}
