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
/// Evidence of source code referencing a visual asset file.
pub struct UsageReference {
    /// Target asset identifier being referenced.
    pub asset_id: String,
    /// Absolute filesystem path to the referencing source file.
    pub file_path: String,
    /// Workspace-relative path to the referencing source file.
    pub relative_file_path: String,
    /// 1-based line number in the source file containing the reference.
    pub line_number: u32,
    /// Exact line text excerpt showing the reference context.
    pub line_content: String,
    /// Inferred syntax format (e.g. `import`, `url`, `tag`, `string`).
    pub syntax_type: String,
    /// Match confidence rating (`high`, `medium`, `low`).
    pub confidence: String,
}
