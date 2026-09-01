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

pub mod audit;
pub mod cleanup;
pub mod preview;
pub mod report;
pub mod server;

pub use server::DaemonServer;
