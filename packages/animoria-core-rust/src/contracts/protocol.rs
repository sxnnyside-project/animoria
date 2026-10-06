use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

use crate::contracts::analysis::WorkspaceAnalysis;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::usage::UsageReference;

pub const PROTOCOL_VERSION: &str = "1.0.0";
pub const PROTOCOL_VERSION_NUM: u32 = 1;

fn default_protocol_version() -> u32 {
    1
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
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Request,
    Response,
    Event,
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
pub struct ProtocolEnvelope {
    pub protocol: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub id: Option<String>,
    pub r#type: MessageType,
    pub name: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "Record<string, unknown>"))]
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct DaemonRequest {
    #[serde(default = "default_protocol_version")]
    pub protocol: u32,
    pub id: String,
    #[serde(alias = "type")]
    pub method: String,
    #[serde(default, alias = "payload")]
    #[cfg_attr(feature = "ts-bindings", ts(type = "Record<string, unknown>"))]
    pub params: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct DaemonErrorPayload {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct DaemonResponse {
    pub protocol: u32,
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional, type = "unknown"))]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub error: Option<DaemonErrorPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct DaemonEvent {
    pub protocol: u32,
    pub event: String,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub sequence: u64,
    #[cfg_attr(feature = "ts-bindings", ts(type = "Record<string, unknown>"))]
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct HelloResultPayload {
    pub engine: String,
    pub version: String,
    pub protocol_version: u32,
    pub supported_formats: Vec<String>,
    pub capabilities: Vec<String>,
    pub methods: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(
        export,
        export_to = "../../../packages/animoria-contracts/src/generated/"
    )
)]
pub struct DaemonScanResult {
    pub analysis: WorkspaceAnalysis,
    pub references: Vec<UsageReference>,
    pub duplicate_groups: Vec<DuplicateGroup>,
}
