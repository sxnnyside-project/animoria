use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Cluster of duplicate assets sharing identical SHA-256 content hashes.
pub struct DuplicateGroup {
    /// Unique group identifier derived from the content hash.
    pub id: String,
    /// Common SHA-256 content hash of all assets in this cluster.
    pub content_hash: String,
    /// Asset ID chosen as the primary canonical representative.
    pub canonical_asset_id: String,
    /// List of all asset IDs belonging to this duplicate cluster.
    pub asset_ids: Vec<String>,
    /// Redundant disk storage in bytes consumed by duplicate copies.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub wasted_bytes: u64,
}
