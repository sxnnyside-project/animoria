use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

use crate::contracts::analysis::WorkspaceAnalysis;
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::usage::UsageReference;

/// String literal defining the active Daemon NDJSON protocol version.
pub const PROTOCOL_VERSION: &str = "1.0.0";
/// Integer constant identifying Protocol v1 for daemon handshake validation.
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
/// Discriminator identifying protocol message framing (request, response, event).
pub enum MessageType {
    /// Inbound request expecting a correlated response.
    Request,
    /// Outbound response fulfilling a previous request.
    Response,
    /// Unsolicited asynchronous event broadcast.
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
/// Top-level framing envelope for messages exchanged over the NDJSON daemon pipe.
pub struct ProtocolEnvelope {
    /// Protocol specification version string.
    pub protocol: String,
    /// Optional correlation identifier.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub id: Option<String>,
    /// Message framing discriminator.
    pub r#type: MessageType,
    /// RPC method or event name.
    pub name: String,
    /// Arbitrary message payload object.
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
/// Structured request command sent to the Animoria background daemon.
pub struct DaemonRequest {
    /// Numeric protocol version header (must be 1).
    #[serde(default = "default_protocol_version")]
    pub protocol: u32,
    /// Client-generated correlation identifier.
    pub id: String,
    /// Target RPC method identifier.
    #[serde(alias = "type")]
    pub method: String,
    /// Method-specific parameter dictionary.
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
/// Detailed error payload returned when a daemon request cannot be fulfilled.
pub struct DaemonErrorPayload {
    /// Machine-readable error code string.
    pub code: String,
    /// Human-readable error message.
    pub message: String,
    /// Optional extended diagnostic explanation.
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
/// Structured response payload returned by the daemon upon request completion.
pub struct DaemonResponse {
    /// Numeric protocol version header.
    pub protocol: u32,
    /// Correlation identifier matching the inbound request.
    pub id: String,
    /// Result payload if the request was successful.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional, type = "unknown"))]
    pub result: Option<serde_json::Value>,
    /// Error payload if the request failed.
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
/// Asynchronous notification emitted by the daemon to subscribed clients.
pub struct DaemonEvent {
    /// Numeric protocol version header.
    pub protocol: u32,
    /// Event topic identifier.
    pub event: String,
    /// Monotonically increasing notification sequence counter.
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub sequence: u64,
    /// Event data dictionary.
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
/// Handshake acknowledgment payload detailing daemon engine capabilities.
pub struct HelloResultPayload {
    /// Native engine identifier string.
    pub engine: String,
    /// Engine build version string.
    pub version: String,
    /// Supported IPC protocol version number.
    pub protocol_version: u32,
    /// List of file extensions supported for asset governance.
    pub supported_formats: Vec<String>,
    /// Feature flags active in the daemon build.
    pub capabilities: Vec<String>,
    /// Available RPC method endpoints.
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
/// Response payload returned by daemon scan operations.
pub struct DaemonScanResult {
    /// Complete workspace asset analysis snapshot.
    pub analysis: WorkspaceAnalysis,
    /// Traced source code usage references.
    pub references: Vec<UsageReference>,
    /// Discovered duplicate asset clusters.
    pub duplicate_groups: Vec<DuplicateGroup>,
}
