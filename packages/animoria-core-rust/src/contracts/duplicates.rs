use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct DuplicateGroup {
    pub id: String,
    pub content_hash: String,
    pub canonical_asset_id: String,
    pub asset_ids: Vec<String>,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub wasted_bytes: u64,
}
