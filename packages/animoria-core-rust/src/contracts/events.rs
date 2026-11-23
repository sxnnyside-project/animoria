use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
#[serde(rename_all = "kebab-case")]
/// Nature of a filesystem change detected on a tracked visual asset.
pub enum AssetChangeKind {
    /// Asset file was newly created on disk.
    Created,
    /// Existing asset file contents or metadata were altered.
    Modified,
    /// Asset file was removed from the filesystem.
    Deleted,
    /// Asset file was relocated to a different directory.
    Moved,
    /// Asset file was renamed within the same directory.
    Renamed,
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
/// Event payload describing a localized filesystem alteration.
pub struct AssetChange {
    /// Unique event identifier.
    pub change_id: String,
    /// Unix timestamp in milliseconds when the change occurred.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub timestamp_ms: u64,
    /// Identifier of the affected asset.
    pub asset_id: String,
    /// Current filesystem path to the asset.
    pub asset_path: String,
    /// Category of filesystem modification.
    pub kind: AssetChangeKind,
    /// Prior path of the asset before move or rename.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub previous_path: Option<String>,
    /// Previous SHA-256 content hash before modification.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub previous_hash: Option<String>,
    /// Updated SHA-256 content hash after modification.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub new_hash: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
#[serde(rename_all = "kebab-case")]
/// Classification of recorded governance and remediation actions.
pub enum AuditEventKind {
    /// Workspace scanning cycle finished.
    ScanCompleted,
    /// Rule diagnostic finding was detected.
    RuleViolationDetected,
    /// Asset file was safely staged to `.animoria/trash`.
    AssetStagedToTrash,
    /// Previously trashed asset was restored.
    AssetRestoredFromTrash,
    /// Duplicate group was successfully consolidated.
    DuplicateResolved,
    /// Governance configuration file was updated.
    PolicyChanged,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
/// Journal entry logging a governance event or remediation execution.
pub struct AuditEvent {
    /// Unique identifier for this audit event.
    pub event_id: String,
    /// Unix timestamp in milliseconds when the action occurred.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub timestamp_ms: u64,
    /// Event category discriminator.
    pub kind: AuditEventKind,
    /// Agent or user initiating the recorded action.
    pub actor: String,
    /// Arbitrary structured metadata describing the action context.
    #[cfg_attr(feature = "ts-bindings", ts(type = "Record<string, unknown>"))]
    pub details: serde_json::Value,
}
