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
/// Record of an asset file moved to `.animoria/trash` with recovery metadata.
pub struct TrashItem {
    /// Identifier of the staged asset.
    pub asset_id: String,
    /// Original workspace-relative path of the asset before trashing.
    pub original_path: String,
    /// Staged path inside `.animoria/trash/`.
    pub trashed_path: String,
    /// Unix timestamp in milliseconds when the asset was moved to trash.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub trashed_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Structured proposal detailing assets to delete and code references to rewrite.
pub struct ResolutionPlan {
    /// Unique identifier for this resolution plan.
    pub plan_id: String,
    /// Unix timestamp in milliseconds when the plan was synthesized.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub created_at_ms: u64,
    /// Optional duplicate cluster ID if resolving duplicate assets.
    pub duplicate_group_id: Option<String>,
    /// Asset paths targeted for removal.
    pub target_assets_to_delete: Vec<String>,
    /// Source-file rewrites this plan *could* apply once its deletes run —
    /// each one a reviewable diff, never auto-applied. A host calls
    /// `applyReferenceRewrite` per proposal only after a human confirms it;
    /// executing the plan's deletes does not touch these files.
    #[serde(default)]
    pub proposed_reference_rewrites: Vec<ReferenceRewriteProposal>,
}

/// One proposed single-line source rewrite: the reference at `file_path`:`line_number`
/// currently reads `original_line` and would read `proposed_line` if the asset it
/// points at is replaced by the resolution plan's canonical asset. Deliberately just
/// a diff to review — computed by substituting the deleted asset's filename for the
/// canonical asset's inside the traced reference line, which preserves whatever quote
/// style and relative-path form the original reference already used.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Recommended source code import path substitution.
pub struct ReferenceRewriteProposal {
    /// Relative or absolute path to the referencing source file.
    pub file_path: String,
    /// 1-based line number where the reference occurs.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub line_number: u32,
    /// Existing source line content prior to rewrite.
    pub original_line: String,
    /// Suggested line content substituting canonical asset path.
    pub proposed_line: String,
}

/// One trashed asset inside a recorded [`SessionManifest`] — `.animoria/trash/sessions.json`'s per-item shape.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
/// Stored journal item tracking an asset staged during a cleanup session.
pub struct SessionItemStored {
    /// Original workspace path of the asset before trashing.
    pub original_path: String,
    /// Location of the staged file in `.animoria/trash/`.
    pub trash_path: String,
    /// File size in bytes recorded at cleanup time.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub size_bytes: u64,
}

/// A recorded `clean --apply`/`applyCleanupPlan`/`applyResolutionPlan` trash
/// session, as persisted to `.animoria/trash/sessions.json` and returned by
/// `listTrashSessions` — the source of truth `animoria restore` and every
/// host's restore UI read from.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
/// Complete undo journal entry recording a remediation session.
pub struct SessionManifest {
    /// Unique session identifier.
    pub id: String,
    /// Unix timestamp in milliseconds when the cleanup was executed.
    #[serde(rename = "timestamp")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "timestamp", type = "number"))]
    pub timestamp_ms: u64,
    /// Itemized list of assets moved to trash during this session.
    pub items: Vec<SessionItemStored>,
}
