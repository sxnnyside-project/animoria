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
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct ResolutionPlan {
    pub plan_id: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub created_at_ms: u64,
    pub duplicate_group_id: Option<String>,
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
pub struct ReferenceRewriteProposal {
    pub file_path: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub line_number: u32,
    pub original_line: String,
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
pub struct SessionItemStored {
    pub original_path: String,
    pub trash_path: String,
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
pub struct SessionManifest {
    pub id: String,
    #[serde(rename = "timestamp")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "timestamp", type = "number"))]
    pub timestamp_ms: u64,
    pub items: Vec<SessionItemStored>,
}
