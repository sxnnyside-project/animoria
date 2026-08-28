use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct UsageReference {
    pub asset_id: String,
    pub file_path: String,
    pub relative_file_path: String,
    pub line_number: u32,
    pub line_content: String,
    pub syntax_type: String,
    pub confidence: String,
}
