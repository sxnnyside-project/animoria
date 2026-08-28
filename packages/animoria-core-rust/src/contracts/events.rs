use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
#[serde(rename_all = "kebab-case")]
pub enum AssetChangeKind {
    Created,
    Modified,
    Deleted,
    Moved,
    Renamed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct AssetChange {
    pub change_id: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub timestamp_ms: u64,
    pub asset_id: String,
    pub asset_path: String,
    pub kind: AssetChangeKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub previous_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub previous_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub new_hash: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
#[serde(rename_all = "kebab-case")]
pub enum AuditEventKind {
    ScanCompleted,
    RuleViolationDetected,
    AssetStagedToTrash,
    AssetRestoredFromTrash,
    DuplicateResolved,
    PolicyChanged,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../../packages/animoria-contracts/src/generated/")
)]
pub struct AuditEvent {
    pub event_id: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub timestamp_ms: u64,
    pub kind: AuditEventKind,
    pub actor: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "Record<string, unknown>"))]
    pub details: serde_json::Value,
}
