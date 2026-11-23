//! Universal domain models, IPC protocol envelopes, and serialization contracts.

/// Workspace analysis, health scoring, and diagnostic types.
pub mod analysis;
/// Visual asset representations, metadata, dimensions, and formats.
pub mod asset;
/// Duplicate asset clusters and wasted storage statistics.
pub mod duplicates;
/// Real-time lifecycle events, audit logging, and file change notifications.
pub mod events;
/// Protocol v1 IPC daemon request, response, and error payloads.
pub mod protocol;
/// Safe remediation plans, rollback manifests, and rewrite proposals.
pub mod remediation;
/// Framework code snippet generation types.
pub mod snippet;
/// Code usage references and line anchors.
pub mod usage;

pub use analysis::*;
pub use asset::*;
pub use duplicates::*;
pub use events::*;
pub use protocol::*;
pub use remediation::*;
pub use snippet::*;
pub use usage::*;
