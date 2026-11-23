use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// One framework integration snippet for an asset, as `generateSnippet`
/// returns it. Produced by `integration::snippets::generate_snippets_for_asset`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/",
        rename_all = "camelCase"
    )
)]
/// Generated component import snippet for consuming a visual asset in UI frameworks.
pub struct SnippetOption {
    /// Human-readable framework or component label.
    pub label: String,
    /// Syntax highlighting language identifier (e.g. `typescript`, `vue`).
    pub language: String,
    /// Template code snippet ready to paste into source code.
    pub code: String,
    /// Optional import statements required for this snippet.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub imports: Option<String>,
    /// Package installation command hint if dependencies are needed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub install_hint: Option<String>,
}
