//! # Protocol v1 Stdio NDJSON Daemon
//!
//! Provides a persistent JSON-RPC/NDJSON daemon server over stdin/stdout for IDE consumers
//! (JetBrains plugin, VS Code extension, custom tools).
//!
//! ## Protocol Contract (Protocol v1)
//! - **Request**: `{"protocol": 1, "id": "req-1", "method": "scan", "params": { ... }}`
//! - **Response**: `{"protocol": 1, "id": "req-1", "result": { ... }, "error": null}`
//! - **Error**: `{"protocol": 1, "id": "req-1", "result": null, "error": {"code": "invalid-params", "message": "..."}}`
//! - **Version Guard**: Any request with `protocol != 1` is immediately rejected with `unsupported-version`.

pub(crate) mod audit;
pub(crate) mod cleanup;
pub(crate) mod preview;
pub(crate) mod report;
/// IPC daemon server implementation and stdio NDJSON framing loops.
pub mod server;

pub use audit::record_audit_event;
pub use cleanup::{CleanupPlan, CleanupProposal};
pub use preview::thumbnail_data_uri;
pub use server::DaemonServer;
